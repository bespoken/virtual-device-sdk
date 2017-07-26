import {
    ISilentEchoTest,
    ISilentEchoValidatorResult,
    SilentEchoValidator,
} from "./SilentEchoValidator";

const URLRegexp = /^https?:\/\//i;

// ScripContentRegexp matches two strings within quotes:
// "match #1": "match #2"
const ScripContentRegexp = /\"([^"]*)\"\:\s?\"([^"]*)\"/;

export const SilentEchoScriptSyntaxError = new Error("Invalid script syntax, please " +
    "provide a script with the following sctructure:" + `
    "<Input>": "<ExpectedOutput>"
    "<Input>": "<ExpectedOutput>"
    "<Input>": "<ExpectedOutput>"`);

export class SilentEchoScript {
    private silentEchoValidator: SilentEchoValidator;

    constructor(token: string, baseURL = "https://silentecho.bespoken.io/process") {
        this.silentEchoValidator = new SilentEchoValidator(token, baseURL);
    }

    public tests(scriptContents: string): ISilentEchoTest[] {
        const tests: ISilentEchoTest[] = [];
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
                    return tests;
                }
                if (!matches || !input || !output) {
                    return tests;
                }
                const test: ISilentEchoTest = {
                    comparison: "contains",
                    expectedStreamURL: undefined,
                    expectedTranscript: undefined,
                    input,
                };
                if (URLRegexp.test(output)) {
                    test.expectedStreamURL = output;
                } else {
                    test.expectedTranscript = output;
                }
                tests.push(test);
            }
        }
        return tests;
    }

    public execute(scriptContents: string): Promise<ISilentEchoValidatorResult[]> {
        return this.silentEchoValidator.execute(this.tests(scriptContents));
    }

    // validate validates given script contents syntax
    // returns either a syntax error or undefined if ok.
    public validate(scriptContents: string): Error | undefined {
        const lines = scriptContents.trim().split("\n");
        const tests = this.tests(scriptContents);
        if (lines.length !== tests.length) {
            return SilentEchoScriptSyntaxError;
        }
        return undefined;
    }
}
