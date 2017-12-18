import * as https from "https";
import {IVirtualDeviceResult, VirtualDevice} from "./VirtualDevice";

export const VirtualDeviceScriptUnauthorizedError = new Error("Security token lacks sufficient " +
    "information. Please re-authenticate with Amazon here to update your security token.");

export const VirtualDeviceValidatorUnauthorizedMessage = (invocationName: string): string => {
    return "Security token lacks sufficient " +
        `permissions to invoke "${invocationName}" skill.<br><br>` +
        "To correct this, make sure in the " +
        `<a href="https://developer.amazon.com/edw/home.html#/" target="_blank">` +
        "Alexa developer console</a> that the skill is associated with your account.<br><br>" +
        "If you are still having issues, contact us " +
        `<a href="mailto:support@bespoken.io">support@bespoken.io</a>.`;
};

interface ISubscribers {
    [index: string]: any[];
    message: any[];
    result: any[];
    unauthorized: any[];
}

export class VirtualDeviceValidator {
    private virtualDevice: VirtualDevice;
    private subscribers: ISubscribers;
    private sourceAPIBaseURL: string;
    private userID: string;

    constructor(token: string, userID: string, baseURL?: string, sourceAPIBaseURL?: string) {
        this.virtualDevice = new VirtualDevice(token);
        this.virtualDevice.baseURL = baseURL ? baseURL : "https://virtual-device.bespoken.io/process";
        this.subscribers = {message: [], result: [], unauthorized: []};
        this.sourceAPIBaseURL = sourceAPIBaseURL ? sourceAPIBaseURL : "https://source-api.bespoken.tools";
        this.userID = userID;
    }

    public subscribe(event: string, cb: any) {
        if (event in this.subscribers) {
            this.subscribers[event].push(cb);
        }
    }

    public unsubscribe(event: string) {
        this.subscribers[event] = [];
    }

    public async execute(virtualDeviceTestSequences: IVirtualDeviceTestSequence[],
                         context?: any): Promise<any> {
        const result: IVirtualDeviceValidatorResult = {tests: []};
        const totalSequences: number = virtualDeviceTestSequences.length;
        let currentSequenceIndex: number = 0;
        for (const sequence of virtualDeviceTestSequences) {
            let checkAuthResult: string;
            try {
                checkAuthResult = await this.checkAuth(sequence.invocationName);
            } catch (err) {
                this.emit("unauthorized", VirtualDeviceScriptUnauthorizedError,
                    undefined, context);
                return Promise.reject(err);
            }
            if (checkAuthResult !== "AUTHORIZED") {
                this.emit("unauthorized", VirtualDeviceScriptUnauthorizedError,
                    undefined, context);
                return Promise.reject(VirtualDeviceScriptUnauthorizedError);
            }
            currentSequenceIndex += 1;
            if (currentSequenceIndex === 1) {
                await this.virtualDevice.resetSession();
            }
            for (const test of sequence.tests) {
                try {
                    const resultItem: IVirtualDeviceValidatorResultItem = {test};
                    resultItem.status = "running";
                    const validator: Validator = new Validator(resultItem, undefined);
                    this.emit("message", undefined, validator.resultItem, context);
                    const actual: IVirtualDeviceResult = await this.virtualDevice.message(test.input);
                    resultItem.actual = actual;
                    if (validator.resultItem && validator.check()) {
                        validator.resultItem.result = "success";
                    } else {
                        validator.resultItem.result = "failure";
                    }
                    validator.resultItem.status = "done";
                    result.tests.push(validator.resultItem);
                    this.emit("result", undefined, validator.resultItem, context);
                } catch (err) {
                    const resultItem: IVirtualDeviceValidatorResultItem = {test};
                    const validator: Validator = new Validator(resultItem, err);
                    validator.resultItem.result = "failure";
                    validator.resultItem.status = "done";
                    result.tests.push(validator.resultItem);
                    this.emit("result", undefined, validator.resultItem, context);
                }
            }
            if (totalSequences > currentSequenceIndex) {
                await this.virtualDevice.message("Alexa, exit");
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
    // by `this.userID`.
    public checkAuth(invocationName: string): Promise<any> {
        return new Promise((resolve, reject) => {
            let data = "";
            const params = `?invocation_name=${invocationName}` +
                `&user_id=${this.userID}`;
            const url = this.sourceAPIBaseURL + "/v1/skillAuthorized" + params;
            const req = https.get(url as any, (res) => {
                res.on("data", (chunk) => {
                    data += chunk;
                });
                res.on("end", () => {
                    if (res.statusCode === 200 && data === "AUTHORIZED") {
                        resolve(data);
                    } else {
                        reject(VirtualDeviceValidatorUnauthorizedMessage(invocationName));
                    }
                });
            });
            req.on("error", function(error: Error) {
                reject(error.message);
            });
            req.end();
        });
    }

    private emit(event: string, error: any, data: any, context?: any) {
        if (event in this.subscribers) {
            this.subscribers[event].forEach((subscriber) => {
                subscriber(error, data, context);
            });
        }
    }
}

export interface IVirtualDeviceTest {
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

export interface IVirtualDeviceTestSequence {
    invocationName: string;
    tests: IVirtualDeviceTest[];
}

export interface IVirtualDeviceValidatorResultItem {
    actual?: IVirtualDeviceResult;
    result?: "success" | "failure";
    status?: "scheduled" | "running" | "done";
    test: IVirtualDeviceTest;
}

export interface IVirtualDeviceValidatorResult {
    result?: "success" | "failure";
    tests: IVirtualDeviceValidatorResultItem[];
}

export class Validator {
    public resultItem: IVirtualDeviceValidatorResultItem;
    public error?: Error;

    public constructor(resultItem: IVirtualDeviceValidatorResultItem, error?: Error) {
        this.resultItem = resultItem;
        this.error = error;
    }

    // check checks whether validation checks success or fails.
    public check(): boolean {
        if (this.error) {
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
