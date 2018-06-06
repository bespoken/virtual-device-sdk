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

export abstract class VirtualDeviceValidator {
    private sourceAPIBaseURL: string;
    private subscribers: ISubscribers;
    private _locale?: string;
    private userID?: string;
    private _voiceID?: string;

    constructor(protected token?: string, userID?: string) {
        this.subscribers = {message: [], result: [], unauthorized: []};
        this.sourceAPIBaseURL = process.env.SOURCE_API_BASE_URL
            ? process.env.SOURCE_API_BASE_URL
            : "https://source-api.bespoken.tools";
        this.userID = userID;
    }

    public async execute(virtualDeviceTestSequences: IVirtualDeviceTestSequence[],
                         context?: any): Promise<IVirtualDeviceValidatorResult> {
        const result: IVirtualDeviceValidatorResult = {tests: []};
        for (const sequence of virtualDeviceTestSequences) {
            // Check the authorization
            try {
                await this.checkAuth(sequence.invocationName);
            } catch (err) {
                this.emit("unauthorized", VirtualDeviceScriptUnauthorizedError, undefined, context);
                throw err;
            }

            await this.executeSequence(sequence, result, context);
        }

        const failures = result.tests.filter((test) => test.result === "failure");
        if (failures && failures.length > 0) {
            result.result = "failure";
        } else {
            result.result = "success";
        }
        return Promise.resolve(result);
    }

    public locale(locale: string) {
        this._locale = locale;
    }

    public subscribe(event: string, cb: any) {
        if (event in this.subscribers) {
            this.subscribers[event].push(cb);
        }
    }

    public unsubscribe(event: string) {
        this.subscribers[event] = [];
    }

    public voiceID(voiceID: string) {
        this._voiceID = voiceID;
    }

    // checkAuth checks whether given invocation name can be invoked
    // by `this.userID`.
    public checkAuth(invocationName: string): Promise<any> {
        // Bypass this check if user ID is not set
        if (!this.userID) {
            return Promise.resolve("AUTHORIZED");
        }

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

    protected emit(event: string, error: any, data: any, context?: any) {
        if (event in this.subscribers) {
            this.subscribers[event].forEach((subscriber) => {
                subscriber(error, data, context);
            });
        }
    }

    protected abstract async executeSequence(sequence: IVirtualDeviceTestSequence,
                                             result: IVirtualDeviceValidatorResult,
                                             context?: any): Promise<void>;

    // Creates a Virtual Device based on the test sequence
    protected virtualDevice(sequence: IVirtualDeviceTestSequence): VirtualDevice {
        // Lookup token by locale
        let token = this.token ? this.token : process.env.VIRTUAL_DEVICE_TOKEN;
        let tokenName;
        if (sequence.locale) {
            tokenName = "VIRTUAL_DEVICE_TOKEN_" + sequence.locale.toUpperCase().replace("-", "_");
            if (process.env[tokenName]) {
                token = process.env[tokenName];
            }
        }

        if (!token) {
            if  (tokenName) {
                throw new Error("No environment variable specified for VIRTUAL_DEVICE_TOKEN or " + tokenName);
            } else {
                throw new Error("No environment variable specified for VIRTUAL_DEVICE_TOKEN");
            }
        }

        const locale = this._locale ? this._locale : sequence.locale;
        const voiceID = this._voiceID ? this._voiceID : sequence.voiceID;
        return new VirtualDevice(token,
            locale,
            voiceID);
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
    locale?: string;
    tests: IVirtualDeviceTest[];
    voiceID?: string;
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
    errorMessage?: string;
    result?: "success" | "failure";
    tests: IVirtualDeviceValidatorResultItem[];
}

export class Validator {
    private static checkString(property: string,
                               value: string | null,
                               expected: undefined | string | string [],
                               caseSensitive: boolean = true): ValidatorError | undefined {
        if (!expected) {
            return undefined;
        }

        if (!value) {
            return ValidatorError.propertyError(property, expected, value);
        }

        if (!caseSensitive) {
            value = value.toLowerCase();
        }

        if (Array.isArray(expected)) {
            for (let expectedValue of expected) {
                if (!caseSensitive) {
                    expectedValue = expectedValue.toLowerCase();
                }
                if (Validator.toRegex(expectedValue).test(value)) {
                    return undefined;
                }
            }
            return ValidatorError.propertyError(property, expected, value);
        } else {
            if (!caseSensitive) {
                expected = expected.toLowerCase();
            }
            const matches = Validator.toRegex(expected).test(value);
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

        console.log("CheckObject" + parentProperty);

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

    private static toRegex(expectedValue: string) {
        // Turn * into .* on regex
        let regex = expectedValue.trim().split("*").join(".*");
        // Escape special values that we do NOT want to treat as a wildcard
        regex = regex.split("+").join("\\+");
        regex = regex.split("^").join("\\^");
        regex = regex.split("$").join("\\$");
        regex = regex.split("?").join("\\?");
        return new RegExp(regex);
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
            this.resultItem.test.expected.transcript,
            false);
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
