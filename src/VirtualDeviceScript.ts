import * as fs from "fs";
import * as path from "path";
import {
    IVirtualDeviceTest,
    IVirtualDeviceTestSequence,
    IVirtualDeviceValidatorResult,
    IVirtualDeviceValidatorResultItem,
    Validator,
    VirtualDeviceValidator,
} from "./VirtualDeviceValidator";

const URLRegexp = /^https?:\/\//i;

// ScriptContentRegexp matches two strings within quotes:
// "match #1": "match #2"
const ScriptContentRegexp = /\"([^"]*)\"\:\s?\"([^"]*)\"/;

// InvocationNameRegexp matches a skill's invocation name.
const InvocationNameRegexp = /(open|launch|tell|ask)(.*)$/;

export const VirtualDeviceScriptSyntaxError = new Error("Invalid script syntax, please " +
    "provide a script with the following sctructure, each block is a sequence:" + `
    "<Input>": "<ExpectedOutput>"
    "<Input>": "<ExpectedOutput>"

    "<Input>": "<ExpectedOutput>"`);

export type IVirtualDeviceScriptCallback = (
    error: Error,
    resultItem: IVirtualDeviceValidatorResultItem,
    context?: any) => void;

export class VirtualDeviceScript {
    private virtualDeviceValidator: VirtualDeviceValidator;

    constructor(token: string, userID: string, baseURL?: string, sourceAPIBaseURL?: string) {
        baseURL = baseURL ? baseURL : "https://virtual-device.bespoken.io/process";
        this.virtualDeviceValidator = new VirtualDeviceValidator(token, userID, baseURL, sourceAPIBaseURL);
    }

    public tests(scriptContents: string): IVirtualDeviceTestSequence[] {
        const sequences: IVirtualDeviceTestSequence[] = [];
        let currentSequence: IVirtualDeviceTestSequence = {tests: [], invocationName: ""};
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
                matches = line.match(ScriptContentRegexp);
                input = matches && matches[1];
                output = matches && matches[2];
                if (!matches || !input) {
                    throw VirtualDeviceScriptSyntaxError;
                }
                const test: IVirtualDeviceTest = {
                    absoluteIndex,
                    comparison: "contains",
                    expectedStreamURL: undefined,
                    expectedTranscript: undefined,
                    input,
                    sequence,
                    sequenceIndex,
                };
                if (output && URLRegexp.test(output)) {
                    test.expectedStreamURL = output;
                } else {
                    test.expectedTranscript = output || undefined;
                }
                currentSequence.tests.push(test);
                sequenceIndex += 1;
            }
            if (line === "" || currentLineIndex === lines.length) {
                if (currentSequence.tests.length) {
                    sequence += 1;
                    const firstInput = (currentSequence.tests
                        && currentSequence.tests.length > 0
                        && currentSequence.tests[0]
                        && currentSequence.tests[0].input) || "";
                    currentSequence.invocationName = this.detectInvocationName(
                        firstInput);
                    sequences.push({...currentSequence});
                    currentSequence = {tests: [], invocationName: ""};
                    sequenceIndex = 1;
                }
            }
        }
        return sequences;
    }

    /**
     * Executes a directory of tests
     * It will load any files that end with "yml" or "yaml" in the directory and execute them
     * @param {string} directoryPath
     */
    public async executeDir(directoryPath: string): Promise<IVirtualDeviceValidatorResult[]> {
        directoryPath = path.resolve(directoryPath);
        let stats;
        try {
            stats = fs.statSync(directoryPath);
        } catch (e) {
            return Promise.reject("Directory to execute does not exist: " + directoryPath);
        }

        if (!stats.isDirectory()) {
            return Promise.reject("Not a directory: " + directoryPath);
        }

        const items = fs.readdirSync(directoryPath);
        const results = [];
        for (const filePath of items) {
            if (filePath.endsWith(".yml") || filePath.endsWith(".yaml")) {
                const fullPath = path.join(directoryPath, filePath);
                const result = await this.executeFile(fullPath);
                results.push(result);
            }
        }
        return results;
    }

    public executeFile(filePath: string): Promise<IVirtualDeviceValidatorResult> {
        filePath = path.resolve(filePath);
        try {
            fs.statSync(filePath);
        } catch (e) {
            return Promise.reject("File to execute does not exist: " + filePath);
        }

        const fileContents = fs.readFileSync(filePath, "UTF-8");
        return this.execute(fileContents);
    }

    public execute(scriptContents: string, context?: any): Promise<IVirtualDeviceValidatorResult> {
        return this.virtualDeviceValidator.execute(this.tests(scriptContents), context);
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

    // prettifyAsPartialHTML prettyfies given validator result items into HTML.
    public prettifyAsPartialHTML(scriptContents: string,
                                 partialResultItems: IVirtualDeviceValidatorResultItem[],
                                 includeTimeContent?: boolean): string {
        includeTimeContent = (typeof includeTimeContent !== "undefined") ? includeTimeContent : true;

        const virtualDeviceTestSequences: IVirtualDeviceTestSequence[] = this.tests(scriptContents);
        const result: IVirtualDeviceValidatorResult = {tests: []};
        for (const sequence of virtualDeviceTestSequences) {
            for (const test of sequence.tests) {
                const resultItem: IVirtualDeviceValidatorResultItem = {test};
                resultItem.status = "scheduled";
                const validator: Validator = new Validator(resultItem, undefined);
                result.tests.push(validator.resultItem);
            }
        }
        for (const partialResultItem of partialResultItems) {
            for (const i in result.tests) {
                if (result.tests[i]) {
                    const resultItem = result.tests[i];
                    if (resultItem.test.absoluteIndex === partialResultItem.test.absoluteIndex) {
                        result.tests[i] = partialResultItem;
                        break;
                    }
                }
            }
        }
        return this.prettifyAsHTML(result, includeTimeContent);
    }

    // prettifyAsHTML prettyfies given validator result into HTML.
    public prettifyAsHTML(result: IVirtualDeviceValidatorResult, includeTimeContent?: boolean): string {
        includeTimeContent = (typeof includeTimeContent !== "undefined") ? includeTimeContent : true;
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
        const tdAndThStyleProps = "border:1px solid black;padding:5px;";
        const tdAndThStyles = `style="${tdAndThStyleProps}"`;
        const tdStyles = tdAndThStyles;
        const thStyles = tdAndThStyles;
        const trStyles = (r: string): string => {
            let color: string = "";
            if (r === "success") {
                color = colorGreen;
            } else if (r === "failure") {
                color = colorRed;
            }
            return ` style="color:${color};"`;
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
        const statusIcon = (test: any): any => {
            if (test.status === "running") {
                return "<img src='/assets/Spinner.svg' height=24>";
            } else if (test.status === "scheduled") {
                return "<img src='/assets/Schedule.svg' height=18>";
            } else if (test.status === "done" && test.result
                && test.result === "success") {
                return "&#10004;";
            } else if (test.status === "done" && test.result
                && test.result !== "success") {
                return "&#10008;";
            }
        };
        for (const key in sequences) {
            if (sequences.hasOwnProperty(key)) {
                const tests = sequences[key];
                const testsHTML = [];
                for (const test of tests) {
                    const icon = statusIcon(test);
                    const html = `
                        <tr${(test.result && trStyles(test.result)) || ""}>
                            <td style="${tdAndThStyleProps}text-align:center;">${icon ? icon : ""}</td>
                            <td ${tdStyles}>${test.test.input}</td>
                            <td ${tdStyles}>${test.test.expectedStreamURL
                                ? test.test.expectedStreamURL
                                : test.test.expectedTranscript || ""}</td>
                            <td ${tdStyles}>${test.actual && test.actual.streamURL
                                ? test.actual.streamURL
                                : (test.actual && test.actual.transcript) || ""}</td>
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
        const showHeadingSpinner = (totalTests.length !== succeededTests.length + failedTests.length);
        const headingSpinner = (showHeadingSpinner
            ? "<img src='/assets/Spinner.svg' height=34>" : "");
        return `
            <div>
                <p style="font-weight:500;font-size:28px;font-family:'Roboto','Helvetica','Arial',sans-serif;">
                    Validation Script Results${headingSpinner}
                </p>
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

    public on(event: string, cb: IVirtualDeviceScriptCallback) {
        this.virtualDeviceValidator.subscribe(event, cb);
    }

    public off(event: string) {
        this.virtualDeviceValidator.unsubscribe(event);
    }

    public checkAuth(scriptContents: string): Promise<any> {
        const sequences: IVirtualDeviceTestSequence[] = this.tests(scriptContents);
        const promises = [];
        for (const sequence of sequences) {
            const promise = this.virtualDeviceValidator.checkAuth(sequence.invocationName);
            promises.push(promise);
        }
        return Promise.all(promises).then(() => "AUTHORIZED");
    }

    private detectInvocationName(input: string): string {
        const matches: RegExpMatchArray | null = input.toLowerCase().match(
            InvocationNameRegexp);
        if (!matches || matches.length !== 3) {
            return "";
        }
        return matches[2].trim();
    }
}
