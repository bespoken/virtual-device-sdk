import {ISilentResult, SilentEcho} from "./SilentEcho";

export class SilentEchoValidator {
    private silentEcho: SilentEcho;

    constructor(token: string, baseURL = "https://silentecho.bespoken.io/process") {
        this.silentEcho = new SilentEcho(token);
        this.silentEcho.baseURL = baseURL;
    }

    public async execute(silentEchoTests: ISilentEchoTest[]): Promise<ISilentEchoValidatorResult[]> {
        const results: ISilentEchoValidatorResult[] = [];
        for (const test of silentEchoTests) {
            try {
                const actual: ISilentResult = await this.silentEcho.message(test.input);
                const result: ISilentEchoValidatorResult = {actual, test};
                const validator: Validator = new Validator(result, undefined);
                if (validator.result && validator.check()) {
                    validator.result.result = "success";
                } else {
                    validator.result.result = "failure";
                }
                results.push(validator.result);
            } catch (err) {
                const result: ISilentEchoValidatorResult = {test};
                const validator: Validator = new Validator(result, err);
                validator.result.result = "failure";
                results.push(validator.result);
            }
        }
        return Promise.resolve(results);
    }
}

export interface ISilentEchoTest {
    input: string;
    comparison: string;
    expectedTranscript?: string;
    expectedStreamURL?: string;
}

export interface ISilentEchoValidatorResult {
    actual?: ISilentResult;
    result?: "success" | "failure";
    test: ISilentEchoTest;
}

class Validator {
    public result: ISilentEchoValidatorResult;
    public error?: Error;

    public constructor(result: ISilentEchoValidatorResult, error?: Error) {
        this.result = result;
        this.error = error;
    }

    // check checks whether validation checks success or fails.
    public check(): boolean {
        if (this.error) {
            return false;
        }
        if (!this.result) {
            return false;
        }
        if (this.result.test.comparison !== "contains") {
            return false;
        }
        if (!this.result.test.expectedTranscript &&
            !this.result.test.expectedStreamURL) {
            return true;
        }
        if (this.result.actual &&
            this.result.actual.transcript &&
            this.result.test.expectedTranscript &&
            this.result.test.comparison === "contains" &&
            this.result.actual.transcript.includes(this.result.test.expectedTranscript)) {
            return true;
        }

        return !!(this.result.actual &&
            this.result.actual.streamURL &&
            this.result.test.expectedStreamURL &&
            this.result.test.comparison === "contains" &&
            this.result.actual.streamURL.includes(this.result.test.expectedStreamURL));
    }
}
