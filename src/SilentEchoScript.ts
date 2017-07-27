import {
    ISilentEchoTest,
    ISilentEchoTestSequence,
    ISilentEchoValidatorResult,
    SilentEchoValidator,
} from "./SilentEchoValidator";

const URLRegexp = /^https?:\/\//i;

// ScripContentRegexp matches two strings within quotes:
// "match #1": "match #2"
const ScripContentRegexp = /\"([^"]*)\"\:\s?\"([^"]*)\"/;

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
        const lines = scriptContents.split("\n");
        for (let line of lines) {
            line = line.trim();
            if (line !== "") {
                let matches: RegExpMatchArray | null = [];
                let input: string | null = "";
                let output: string | null = "";
                try {
                    matches = line.match(ScripContentRegexp);
                    input = matches && matches[1];
                    output = matches && matches[2];
                } catch (err) {
                    throw SilentEchoScriptSyntaxError;
                }
                if (!matches || !input || !output) {
                    throw SilentEchoScriptSyntaxError;
                }
                const test: ISilentEchoTest = {
                    comparison: "contains",
                    expectedStreamURL: undefined,
                    expectedTranscript: undefined,
                    input,
                    sequence,
                };
                if (URLRegexp.test(output)) {
                    test.expectedStreamURL = output;
                } else {
                    test.expectedTranscript = output;
                }
                currentSequence.tests.push(test);
            } else {
                if (currentSequence.tests.length) {
                    sequence += 1;
                    sequences.push({...currentSequence});
                    currentSequence = {tests: []};
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
}
