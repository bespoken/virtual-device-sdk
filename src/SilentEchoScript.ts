import {
    ISilentEchoTest,
    ISilentEchoTestSequence,
    ISilentEchoValidatorResult,
    SilentEchoValidator,
} from "./SilentEchoValidator";

const URLRegexp = /^https?:\/\//i;

// ScriptContentRegexp matches two strings within quotes:
// "match #1": "match #2"
const ScriptContentRegexp = /\"([^"]*)\"\:\s?\"([^"]*)\"/;

export const SilentEchoScriptSyntaxError = new Error("Invalid script syntax, please " +
    "provide a script with the following sctructure, each block is a sequence:" + `
    "<Input>": "<ExpectedOutput>"
    "<Input>": "<ExpectedOutput>"

    "<Input>": "<ExpectedOutput>"`);

export class SilentEchoScript {
    private silentEchoValidator: SilentEchoValidator;

    constructor(token: string, baseURL = "https://silentecho.bespoken.io/process") {
        this.silentEchoValidator = new SilentEchoValidator(token, baseURL);
    }

    public tests(scriptContents: string): ISilentEchoTestSequence[] {
        const sequences: ISilentEchoTestSequence[] = [];
        let currentSequence: ISilentEchoTestSequence = {tests: []};
        let sequence: number = 1;
        let sequenceIndex: number = 1;
        let absoluteIndex: number = 0;
        const lines = scriptContents.split("\n");
        let currentLineIndex: number = 0;
        for (let line of lines) {
            currentLineIndex += 1;
            line = line.trim();
            if (line !== "") {
                absoluteIndex += 1;
                let matches: RegExpMatchArray | null = [];
                let input: string | null = "";
                let output: string | null = "";
                try {
                    matches = line.match(ScriptContentRegexp);
                    input = matches && matches[1];
                    output = matches && matches[2];
                } catch (err) {
                    throw SilentEchoScriptSyntaxError;
                }
                if (!matches || !input || !output) {
                    throw SilentEchoScriptSyntaxError;
                }
                const test: ISilentEchoTest = {
                    absoluteIndex,
                    comparison: "contains",
                    expectedStreamURL: undefined,
                    expectedTranscript: undefined,
                    input,
                    sequence,
                    sequenceIndex,
                };
                if (URLRegexp.test(output)) {
                    test.expectedStreamURL = output;
                } else {
                    test.expectedTranscript = output;
                }
                currentSequence.tests.push(test);
                sequenceIndex += 1;
            }
            if (line === "" || currentLineIndex === lines.length) {
                if (currentSequence.tests.length) {
                    sequence += 1;
                    sequences.push({...currentSequence});
                    currentSequence = {tests: []};
                    sequenceIndex = 1;
                }
            }
        }
        return sequences;
    }

    public execute(scriptContents: string): Promise<ISilentEchoValidatorResult> {
        return this.silentEchoValidator.execute(this.tests(scriptContents));
    }

    // validate validates given script contents syntax
    // returns either a syntax error or undefined if ok.
    public validate(scriptContents: string): undefined | Error {
        try {
            this.tests(scriptContents);
            return undefined;
        } catch (err) {
            return err;
        }
    }

    public prettifyAsHTML(result: ISilentEchoValidatorResult, includeTimeContent: boolean = true): string {
        const colorRed = "rgb(244,67,54)";
        const colorGreen = "rgb(76,175,80)";
        const totalTests = result.tests;
        const succeededTests = result.tests.filter((test: any) => test.result === "success");
        const failedTests = result.tests.filter((test: any) => test.result === "failure");
        const overallContent = `${totalTests.length} tests, ${succeededTests.length} succeeded` +
            `, ${failedTests.length} failed`;
        const nowDate = new Date();
        const nowUTC = `${nowDate.getUTCMonth() + 1}/${nowDate.getUTCDate()}/${nowDate.getUTCFullYear()} ` +
            `${nowDate.getUTCHours()}:${nowDate.getUTCMinutes()}:${nowDate.getUTCSeconds()} UTC`;
        const sequences: {[key: string]: any; } = {};
        for (const test of result.tests) {
            const key = test.test.sequence;
            if (sequences.hasOwnProperty(key)) {
                sequences[key].push(test);
            } else {
                sequences[key] = [test];
            }
        }
        const sequencesHTML = [];
        const tdAndThStyles = `style="border:1px solid black;padding:5px;"`;
        const tdStyles = tdAndThStyles;
        const thStyles = tdAndThStyles;
        const trStyles = (r: string): string => {
            let color: string = "";
            if (r === "success") {
                color = colorGreen;
            } else if (r === "failure") {
                color = colorRed;
            }
            return `style="color:${color};"`;
        };
        const overallContentStyles = (): string => {
            let color: string = "";
            if (failedTests.length > 0) {
                color = colorRed;
            } else {
                color = colorGreen;
            }
            return `style="color:${color};"`;
        };
        for (const key in sequences) {
            if (sequences.hasOwnProperty(key)) {
                const tests = sequences[key];
                const testsHTML = [];
                for (const test of tests) {
                    const html = `
                        <tr ${trStyles(test.result)}>
                            <td ${tdStyles}>${test.result === "success"
                                ? "&#10004;"
                                : "&#10008;"}</td>
                            <td ${tdStyles}>${test.test.input}</td>
                            <td ${tdStyles}>${test.test.expectedStreamURL
                                ? test.test.expectedStreamURL
                                : test.test.expectedTranscript || ""}</td>
                            <td ${tdStyles}>${test.actual.streamURL
                                ? test.actual.streamURL
                                : test.actual.transcript || ""}</td>
                        </tr>`;
                    testsHTML.push(html);
                }
                const html = `
                    <div style="margin-bottom:16px;" class="sequence">
                        <p style="margin:0 0 2px;font-weight:bold;" class="heading">Sequence: ${key}</p>
                        <table style="border-collapse:collapse;">
                            <thead>
                                <tr>
                                    <th ${thStyles}>Result</th>
                                    <th ${thStyles}>Input</th>
                                    <th ${thStyles}>Expected</th>
                                    <th ${thStyles}>Actual</th>
                                </tr>
                            </thead>
                            <tbody>${testsHTML.join("")}</tbody>
                        </table>
                    </div>`;
                sequencesHTML.push(html);
                }
        }
        return `
            <div>
                <div style="margin:0 0 -18px;" class="output">
                    <p style="font-weight:bold;"class="heading">Output:</p>
                </div>
                <div class="overall">
                    <p style="margin:0 0 -6px;font-weight:bold;" class="heading">Overall:</p>
                    <p class="content" ${overallContentStyles()}>${overallContent}</p>
                </div>
                <div class="time">
                    <p style="margin:0 0 -6px;font-weight:bold;" class="heading">Time:</p>
                    <p class="content">${includeTimeContent && nowUTC || ""}</p>
                </div>${sequencesHTML.join("")}
            </div>`;
    }
}
