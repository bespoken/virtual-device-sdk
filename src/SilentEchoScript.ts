import {
    ISilentEchoTest,
    ISilentEchoValidatorResult,
    SilentEchoValidator,
} from "./SilentEchoValidator";

const URLRegexp = /^https?:\/\//i;

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
                const matches = line.match(/\"?([^"]*)\"?\:\s?\"?([^"]*)\"?/);
                if (!matches || !matches.length) {
                    return tests;
                }
                const test: ISilentEchoTest = {
                    comparison: "contains",
                    expectedStreamURL: undefined,
                    expectedTranscript: undefined,
                    input: matches[1],
                };
                const output = matches[2];
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
}
