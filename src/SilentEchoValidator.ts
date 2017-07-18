import * as Bluebird from "bluebird";

import {ISilentResult, SilentEcho} from "./SilentEcho";

export class SilentEchoValidator {
	private silentEcho: SilentEcho; 
	constructor(token: string) {
		this.silentEcho = new SilentEcho(token);
	}
	public async execute(silentEchoTests: SilentEchoTest[]): Promise<SilentEchoValidatorResult[]> {
		const promises: Bluebird<any>[] = [];
		for (const test of silentEchoTests) {
			const promise = this.silentEcho.message(test.input)
				.then((actual: ISilentResult): Validator => {
					const result: SilentEchoValidatorResult = {actual, test};
					return new Validator(result, );
				})
				.catch((error): Validator => {
					const result: SilentEchoValidatorResult = {test};
					return new Validator(result, error);
				});
			promises.push(Bluebird.resolve(promise));
		}
		const results: SilentEchoValidatorResult[] = [];
		await Bluebird.all(promises.map((p) => p.reflect()))
    			.each((inspection: Bluebird.Inspection<any>) => {
				if (inspection.isFulfilled()) {
					const validator: Validator = inspection.value();
					if (validator.result && validator.check()) {
						validator.result.result = "success";
					}
					results.push(validator.result);
				} else {
					const validator: Validator = inspection.reason();
					validator.result.result = "failure";
					results.push(validator.result);
				}
			});
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
		if (this.result.actual &&
			this.result.actual.transcript &&
			this.result.test.expectedTranscript &&
			this.result.test.comparison === "contains" &&
			!this.result.actual.transcript.includes(this.result.test.expectedTranscript)) {
			return false;
		}
		if (this.result.actual &&
			this.result.actual.stream_url &&
			this.result.test.expectedStreamURL &&
			this.result.test.comparison === "contains" &&
			!this.result.actual.stream_url.includes(this.result.test.expectedStreamURL)) {
			return false;
		}
		return true;
	}
}
