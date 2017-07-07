import * as Bluebird from "bluebird";

import {ISilentResult, SilentEcho} from "./SilentEcho";

export class SilentEchoValidator {
	private silentEcho: SilentEcho; 
	constructor(token: string) {
		this.silentEcho = new SilentEcho(token);
	}
	public async execute(silentEchoTests: SilentEchoTest[]): Promise<any> {
		const promises: Bluebird<any>[] = [];
		for (const test of silentEchoTests) {
			const promise = this.silentEcho.message(test.input)
				.then((result: ISilentResult): MessageResult => ({result, test}))
				.catch((error): MessageResult => ({error, test}));
			promises.push(Bluebird.resolve(promise));
		}
		const validatorResults: ValidatorResult[] = [];
		await Bluebird.all(promises.map((p) => p.reflect()))
    			.each((inspection: Bluebird.Inspection<any>) => {
				if (inspection.isFulfilled()) {
					const mResult: MessageResult = inspection.value();
					console.log("message result: ", mResult);
					const vResult: ValidatorResult = {test: mResult.test};
					if (mResult.result && mResult.result.transcript === mResult.test.expectedTranscript) {
						vResult.result = "success";
						validatorResults.push(vResult);
					} else {
						vResult.result = "failure";
						vResult.error = `expected: ${mResult.test.expectedTranscript}, ` +
							`actual: ${mResult.result && mResult.result.transcript}`;
						validatorResults.push(vResult);
					}
				} else {
					const mResult: MessageResult = inspection.reason();
					const vResult: ValidatorResult = {
						error: mResult.error && mResult.error.message,
						result: "failure",
						test: mResult.test,
					};
					validatorResults.push(vResult);
				}
			});
		return Promise.resolve(validatorResults);
	}
}

export interface SilentEchoTest {
	input: string;
	comparison: string;
	expectedTranscript: string | undefined;
	expectedStreamURL: string;
}

export interface MessageResult {
	error?: Error;
	result?: ISilentResult;
	test: SilentEchoTest;
}

export interface ValidatorResult {
	error?: string;
	result?: "success" | "failure";
	test: SilentEchoTest;
}
