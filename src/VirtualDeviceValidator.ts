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
                         context?: any): Promise<IVirtualDeviceValidatorResult> {
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
                    resultItem.actual = await this.virtualDevice.message(test.input);
                    const errors = validator.check();
                    validator.resultItem.errors = errors;
                    if (validator.resultItem && errors.length === 0) {
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

    // sequenceIndex is the index number of this test within the sequence.
    sequenceIndex?: number;

    // absoluteIndex is the index number of this test within the all sequences.
    absoluteIndex?: number;

    input: string;
    comparison: string;
    expected?: {
        card?: any,
        streamURL?: string | string[],
        transcript?: string | string[],
    };
}

export interface IVirtualDeviceTestSequence {
    invocationName: string;
    tests: IVirtualDeviceTest[];
}

export interface IVirtualDeviceValidatorResultItem {
    actual?: IVirtualDeviceResult;
    errors?: ValidatorError[];
    result?: "success" | "failure";
    status?: "scheduled" | "running" | "done";
    test: IVirtualDeviceTest;
}

export class ValidatorError {
    public static asArray(message: string): ValidatorError[] {
        return [new ValidatorError(message)];
    }

    public static propertyError(property: string,
                                expected: undefined | string | string [],
                                actual: null | string): ValidatorError {
        return new ValidatorError(undefined, property, expected, actual);
    }

    public constructor(public message?: string,
                       public property?: string,
                       public expected?: undefined | string | string [],
                       public actual?: null | string) {}
}

export interface IVirtualDeviceValidatorResult {
    result?: "success" | "failure";
    tests: IVirtualDeviceValidatorResultItem[];
}

export class Validator {
    private static checkString(property: string,
                               value: string | null,
                               expected: undefined | string | string []): ValidatorError | undefined {
        if (!expected) {
            return undefined;
        }

        if (!value) {
            return ValidatorError.propertyError(property, expected, value);
        }

        if (Array.isArray(expected)) {
            const expectedArray = expected;
            for (const expectedValue of expectedArray) {
                if (expectedValue.trim() === "*" || expectedValue.trim() === "") {
                    return undefined;
                }

                if (value.includes(expectedValue)) {
                    return undefined;
                }
            }
            return ValidatorError.propertyError(property, expected, value);
        } else {
            if (expected.trim() === "*" || expected.trim() === "") {
                return undefined;
            }
            const matches = (value.includes(expected as string));
            if (matches) {
                return undefined;
            } else {
                return ValidatorError.propertyError(property, expected, value);
            }
        }
    }

    private static checkObject(parentProperty: string, value?: any, expected?: any): ValidatorError | undefined {
        if (!expected) {
            return undefined;
        }

        if (!value) {
            return ValidatorError.propertyError(parentProperty, expected, value);
        }

        for (const property of Object.keys(expected)) {
            const expectedPropertyValue = expected[property];
            const actualPropertyValue = value[property];
            let fullProperty = property;
            if (parentProperty) {
                fullProperty = parentProperty + "." + property;
            }
            if (typeof expectedPropertyValue === "string") {
                const error = Validator.checkString(fullProperty, actualPropertyValue, expectedPropertyValue);
                if (error) {
                    return error;
                }
            } else {
                const error = Validator.checkObject(fullProperty, actualPropertyValue, expectedPropertyValue);
                if (error) {
                    return error;
                }
            }

        }
        return undefined;
    }

    public resultItem: IVirtualDeviceValidatorResultItem;
    public error?: Error;

    public constructor(resultItem: IVirtualDeviceValidatorResultItem, error?: Error) {
        this.resultItem = resultItem;
        this.error = error;
    }

    // check checks whether validation checks success or fails.
    public check(): ValidatorError[] {
        if (this.error) {
            return ValidatorError.asArray(this.error.message);
        }

        if (this.resultItem.test.comparison !== "contains") {
            return ValidatorError.asArray("Invalid test comparison: " + this.resultItem.test.comparison);
        }

        if (!this.resultItem.actual) {
            return ValidatorError.asArray("Invalid test result - no result");
        }

        if (!this.resultItem.test.expected) {
            return [];
        }

        // Checks the transcript, stream and card - all must pass to be good!
        const transcriptError = Validator.checkString("transcript",
            this.resultItem.actual.transcript,
            this.resultItem.test.expected.transcript);
        const streamError = Validator.checkString("streamURL",
            this.resultItem.actual.streamURL,
            this.resultItem.test.expected.streamURL);
        const cardError = Validator.checkObject("card",
            this.resultItem.actual.card,
            this.resultItem.test.expected.card);

        const errors: ValidatorError[] = [];
        if (transcriptError) {
            errors.push(transcriptError);
        }
        if (streamError) {
            errors.push(streamError);
        }
        if (cardError) {
            errors.push(cardError);
        }
        return errors;
    }
}
