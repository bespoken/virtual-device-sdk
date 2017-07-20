import {ISilentResult, SilentEcho} from "./SilentEcho";

export class SilentEchoValidator {
	private silentEcho: SilentEcho; 
	constructor(token: string) {
		this.silentEcho = new SilentEcho(token);
	}
	public async execute(silentEchoTests: SilentEchoTest[]): Promise<SilentEchoValidatorResult[]> {
		const results: SilentEchoValidatorResult[] = [];
		for (const test of silentEchoTests) {
			try {
				const actual: ISilentResult = await this.silentEcho.message(test.input)
				const result: SilentEchoValidatorResult = {actual, test};
				const validator: Validator = new Validator(result, undefined);
				if (validator.result && validator.check()) {
					validator.result.result = "success";
				} else {
					validator.result.result = "failure";
				}
				results.push(validator.result);
			} catch (err) {
				const result: SilentEchoValidatorResult = {test};
				const validator: Validator = new Validator(result, err);
				validator.result.result = "failure";
				results.push(validator.result);
			}
		}
		return Promise.resolve(results);
	}
}

export interface SilentEchoTest {
	input: string;
	comparison: string;
	expectedTranscript?: string;
	expectedStreamURL?: string;
}

export interface SilentEchoValidatorResult {
	actual?: ISilentResult;
	result?: "success" | "failure";
	test: SilentEchoTest;
}

class Validator {
	public result: SilentEchoValidatorResult;
	public error?: Error;

	public constructor(result: SilentEchoValidatorResult, error?: Error) {
		this.result = result;
		this.error = error;
	}

	// check checks whether validation checks success or fails.
	public check(): boolean {
		if (this.error) return false;
		if (!this.result) return false;
		if (this.result.test.comparison !== "contains") return false;
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
		if (this.result.actual &&
			this.result.actual.stream_url &&
			this.result.test.expectedStreamURL &&
			this.result.test.comparison === "contains" &&
			this.result.actual.stream_url.includes(this.result.test.expectedStreamURL)) {
			return true;
		}
		return false;
	}
}
