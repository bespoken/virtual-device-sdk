import {ISilentResult, SilentEcho} from "./SilentEcho";

export const SilentEchoScriptUnauthorizedError = new Error("Security token lacks sufficient " +
    "information. Please re-authenticate with Amazon here to update your security token.");

interface ISubscribers {
    [index: string]: any[];
    message: any[];
    result: any[];
    unauthorized: any[];
}

export class SilentEchoValidator {
    private silentEcho: SilentEcho;
    private subscribers: ISubscribers;

    constructor(token: string, baseURL?: string) {
        this.silentEcho = new SilentEcho(token);
        this.silentEcho.baseURL = baseURL ? baseURL : "https://silentecho.bespoken.io/process";
        this.subscribers = {message: [], result: [], unauthorized: []};
    }

    public subscribe(event: string, cb: any) {
        if (event in this.subscribers) {
            this.subscribers[event].push(cb);
        }
    }

    public async execute(silentEchoTestSequences: ISilentEchoTestSequence[],
                         invocationName: string): Promise<any> {
        const result: ISilentEchoValidatorResult = {tests: []};
        const totalSequences: number = silentEchoTestSequences.length;
        let currentSequenceIndex: number = 0;
        for (const sequence of silentEchoTestSequences) {
            if (!this.checkAuth(invocationName)) {
                this.emit("unauthorized", SilentEchoScriptUnauthorizedError);
                return Promise.reject(SilentEchoScriptUnauthorizedError);
            }
            currentSequenceIndex += 1;
            if (currentSequenceIndex === 1) {
                await this.silentEcho.message("Alexa, exit");
            }
            for (const test of sequence.tests) {
                try {
                    const resultItem: ISilentEchoValidatorResultItem = {test};
                    resultItem.status = "running";
                    const validator: Validator = new Validator(resultItem, undefined);
                    this.emit("message", validator.resultItem);
                    const actual: ISilentResult = await this.silentEcho.message(test.input);
                    resultItem.actual = actual;
                    if (validator.resultItem && validator.check()) {
                        validator.resultItem.result = "success";
                    } else {
                        validator.resultItem.result = "failure";
                    }
                    validator.resultItem.status = "done";
                    result.tests.push(validator.resultItem);
                    this.emit("result", validator.resultItem);
                } catch (err) {
                    const resultItem: ISilentEchoValidatorResultItem = {test};
                    const validator: Validator = new Validator(resultItem, err);
                    validator.resultItem.result = "failure";
                    validator.resultItem.status = "done";
                    result.tests.push(validator.resultItem);
                    this.emit("result", validator.resultItem);
                }
            }
            if (totalSequences > currentSequenceIndex) {
                await this.silentEcho.message("Alexa, exit");
            }
        }
        const failures = result.tests.filter((test) => test.result === "failure");
        if (failures && failures.length > 0) {
            result.result = "failure";
        } else {
            result.result = "success";
        }
        return Promise.resolve(result);
    }

    // checkAuth checks whether given invocation name can be invoked
    // by `this.silentEcho.token`.
    public checkAuth(invocationName: string): boolean {
        return true;
    }

    private emit(event: string, data: any) {
        if (event in this.subscribers) {
            this.subscribers[event].forEach((subscriber) => {
                subscriber(data);
            });
        }
    }
}

export interface ISilentEchoTest {
    // sequence is the sequence number which this test belongs to.
    sequence: number;

    // sequenceIndex is the index number of this test whitin the sequence.
    sequenceIndex?: number;

    // absoluteIndex is the index number of this test within the all sequences.
    absoluteIndex?: number;

    input: string;
    comparison: string;
    expectedTranscript?: string;
    expectedStreamURL?: string;
}

export interface ISilentEchoTestSequence {
    tests: ISilentEchoTest[];
}

export interface ISilentEchoValidatorResultItem {
    actual?: ISilentResult;
    result?: "success" | "failure";
    status?: "scheduled" | "running" | "done";
    test: ISilentEchoTest;
}

export interface ISilentEchoValidatorResult {
    result?: "success" | "failure";
    tests: ISilentEchoValidatorResultItem[];
}

export class Validator {
    public resultItem: ISilentEchoValidatorResultItem;
    public error?: Error;

    public constructor(resultItem: ISilentEchoValidatorResultItem, error?: Error) {
        this.resultItem = resultItem;
        this.error = error;
    }

    // check checks whether validation checks success or fails.
    public check(): boolean {
        if (this.error) {
            return false;
        }
        if (!this.resultItem) {
            return false;
        }
        if (this.resultItem.test.comparison !== "contains") {
            return false;
        }
        if (!this.resultItem.test.expectedTranscript &&
            !this.resultItem.test.expectedStreamURL) {
            return true;
        }
        if (this.resultItem.test.expectedTranscript === "*"
            || this.resultItem.test.expectedStreamURL === "*"
            || this.resultItem.test.expectedTranscript === ""
            || this.resultItem.test.expectedStreamURL === "") {
            return true;
        }
        if (this.resultItem.actual &&
            this.resultItem.actual.transcript &&
            this.resultItem.test.expectedTranscript &&
            this.resultItem.test.comparison === "contains" &&
            this.resultItem.actual.transcript.includes(this.resultItem.test.expectedTranscript)) {
            return true;
        }

        return !!(this.resultItem.actual &&
            this.resultItem.actual.streamURL &&
            this.resultItem.test.expectedStreamURL &&
            this.resultItem.test.comparison === "contains" &&
            this.resultItem.actual.streamURL.includes(this.resultItem.test.expectedStreamURL));
    }
}
