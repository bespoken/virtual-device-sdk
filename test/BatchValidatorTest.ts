import {assert} from "chai";
import * as dotenv from "dotenv";
import * as nock from "nock";
import * as Sinon from "sinon";

import {BatchValidator} from "../src/BatchValidator";
import {VirtualDevice} from "../src/VirtualDevice";
import {IVirtualDeviceTest,
    IVirtualDeviceValidatorResultItem,
    Validator,
    VirtualDeviceValidator,
    VirtualDeviceValidatorUnauthorizedMessage} from "../src/VirtualDeviceValidator";
import {MessageMock} from "./MessageMock";

describe.skip("BatchValidator", function() {
    this.timeout(60000);
    dotenv.config();

    beforeEach(() => {
        MessageMock.enableIfConfigured();
    });

    afterEach(() => {
        MessageMock.disable();
    });

    describe("#execute()", () => {
        let checkAuthStub: any;
        before(() => {
            checkAuthStub = Sinon.stub(VirtualDeviceValidator.prototype, "checkAuth")
                .returns(Promise.resolve("AUTHORIZED"));
        });
        after(() => {
            checkAuthStub.restore();
        });

        it("success", async () => {
            const sequences = [
                {
                    invocationName: "test player",
                    tests: [{
                        comparison: "contains",
                        expected: {
                            transcript: "Welcome to the Simple Audio Player",
                        },
                        input: "open test player",
                        sequence: 1,
                    },
                    {
                        comparison: "contains",
                        expected: {
                            streamURL: "https://feeds.soundcloud.com/stream/309340878-user-652822799-episode-010",
                        },
                        input: "tell test player to play",
                        sequence: 1,
                    }],
                },
            ];

            // Test to make sure the batch process endpoint is being called correctly - we intercept the requests
            // The asserts don't work quite properly - if they fail, the error shows up on validationResult.errorMessage
            MessageMock.onCall((uri, body) => {
                // Ignore the call to Alexa quit
                if (uri.includes("/process")) {
                    return;
                }

                assert.equal(body.messages.length, 2);
                assert.equal(body.messages[0].text, "open test player");
                assert.equal(body.messages[0].phrases.length, 1);
                assert.equal(body.messages[0].phrases[0], "Welcome to the Simple Audio Player");
                assert.equal(body.messages[1].text, "tell test player to play");
            });

            const virtualDeviceValidator = new BatchValidator();
            const validatorResult = await virtualDeviceValidator.execute(sequences);
            assert.equal(validatorResult.result, "success", `${JSON.stringify(validatorResult)}`);

            // This is where any errors comes back from the MessageMock tests
            assert.isUndefined(validatorResult.errorMessage, validatorResult.errorMessage);
            for (const test of validatorResult.tests) {
                assert.equal(test.result, "success", `${JSON.stringify(test)}`);
            }
        });

        it("success with multiple expected phrases", async () => {
            const sequences = [
                {
                    invocationName: "test player",
                    tests: [{
                        comparison: "contains",
                        expected: {
                            transcript: ["welcome to the simple audio player", "welcome"],
                        },
                        input: "open test player",
                        sequence: 1,
                    }],
                },
            ];

            // Test to make sure the batch process endpoint is being called correctly - we intercept the requests
            // The asserts don't work quite properly - if they fail, the error shows up on validationResult.errorMessage
            MessageMock.onCall((uri, body) => {
                // Ignore the call to Alexa quit
                if (uri.includes("/process")) {
                    return;
                }

                assert.equal(body.messages[0].text, "open test player");
                assert.equal(body.messages[0].phrases.length, 2);
                assert.equal(body.messages[0].phrases[0], "welcome to the simple audio player");
                assert.equal(body.messages[0].phrases[1], "welcome");
            });

            const virtualDeviceValidator = new BatchValidator();
            const validatorResult = await virtualDeviceValidator.execute(sequences);

            // This is where any errors comes back from the MessageMock tests
            assert.isUndefined(validatorResult.errorMessage, validatorResult.errorMessage);
        });

        it("failure", async () => {
            const sequences = [
                {
                    invocationName: "test player",
                    tests: [{
                        comparison: "contains",
                        expected: {
                            transcript: "wrong transcript",
                        },
                        input: "open test player",
                        sequence: 1,
                    }],
                },
            ];
            const virtualDeviceValidator = new BatchValidator();
            const validatorResult = await virtualDeviceValidator.execute(sequences);
            for (const test of validatorResult.tests) {
                assert.equal(test.result, "failure", `${JSON.stringify(test)}`);
                const error = (test.errors as any)[0];
                assert.equal(error.property, "transcript");
                assert.equal(error.expected, "wrong transcript");
                assert.include(error.actual, "simple audio player");
            }
        });

        it("has deep failure", async () => {
            const sequences = [
                {
                    invocationName: "test player",
                    tests: [{
                        comparison: "contains",
                        expected: {
                            card: {
                                mainTitle: "Wrong title",
                            },
                        },
                        input: "open test player",
                        sequence: 1,
                    }],
                },
            ];
            const virtualDeviceValidator = new BatchValidator();
            const validatorResult = await virtualDeviceValidator.execute(sequences);
            for (const test of validatorResult.tests) {
                assert.equal(test.result, "failure", `${JSON.stringify(test)}`);
                const error = (test.errors as any)[0];
                assert.equal(error.property, "card.mainTitle");
                assert.equal(error.expected, "Wrong title");
                assert.include(error.actual, "Title of the card");
            }
        });
    });

    describe("#execute() invocation permissions", () => {
        const sequences = [
            {
                invocationName: "test player",
                tests: [{
                    comparison: "contains",
                    expected: {
                        transcript: "welcome to the simple audio player",
                    },
                    input: "open test player",
                    sequence: 1,
                }],
            },
        ];
        let checkAuthStub: any;

        before(() => {
            checkAuthStub = Sinon.stub(VirtualDeviceValidator.prototype, "checkAuth")
                .throws("UNAUTHORIZED");
        });
        after(() => {
            checkAuthStub.restore();
        });

        it("handles #checkAuth() errors", async () => {
            const virtualDeviceValidator = new BatchValidator();
            try {
                await virtualDeviceValidator.execute(sequences);
                assert.fail("This should never be reached");
            } catch (err) {
                assert.equal(err, "UNAUTHORIZED");
            }
        });
    });

    describe("#execute() sequence processing failure", () => {
        const sequences = [
            {
                invocationName: "test player",
                tests: [{
                    comparison: "contains",
                    expectedStreamURL: undefined,
                    expectedTranscript: "welcome to the simple audio player",
                    input: "open test player",
                    sequence: 1,
                }],
            },
        ];
        let checkAuthStub: any;
        let seMessageStub: any;
        before(() => {
            MessageMock.enableIfConfigured();
            checkAuthStub = Sinon.stub(VirtualDeviceValidator.prototype, "checkAuth")
                .returns(Promise.resolve("AUTHORIZED"));
            seMessageStub = Sinon.stub(VirtualDevice.prototype, "batchMessage")
                .callsFake((message: any): Promise<any> => {
                    if (message.text.includes("Alexa") || message.text.includes("alexa quit")) {
                        return Promise.resolve();
                    }
                    return Promise.reject("something went wrong");
                });
        });
        after(() => {
            MessageMock.disable();
            seMessageStub.restore();
            checkAuthStub.restore();
        });
        it("handles virtual device errors", async () => {
            const virtualDeviceValidator = new BatchValidator();
            const validatorResult = await virtualDeviceValidator.execute(sequences);
            for (const test of validatorResult.tests) {
                assert.equal(test.result, "failure", `${JSON.stringify(test)}`);
                assert.equal(test.status, "done", `${JSON.stringify(test)}`);
            }
        });
    });

    describe("#checkAuth()", () => {
        beforeEach(() => {
            MessageMock.enable();
        });

        afterEach(() => {
            MessageMock.enable();
        });

        it("success", async () => {
            nock("https://source-api.bespoken.tools")
                .get("/v1/skillAuthorized")
                .query(true)
                .reply(200, "AUTHORIZED");
            const virtualDeviceValidator = new BatchValidator();
            const checkAuthResult = await virtualDeviceValidator.checkAuth("simple player");
            assert.equal(checkAuthResult, "AUTHORIZED");
        });

        it("handles replied errors", async () => {
            nock("https://source-api.bespoken.tools")
                .get("/v1/skillAuthorized")
                .query(true)
                .reply(401, "UNAUTHORIZED");
            const virtualDeviceValidator = new BatchValidator();
            try {
                await virtualDeviceValidator.checkAuth("simple player");
            } catch (err) {
                assert.equal(err,
                    VirtualDeviceValidatorUnauthorizedMessage("simple player"));
            }
        });
        it("handles request errors", async () => {
            nock("https://source-api.bespoken.tools")
                .get("/v1/skillAuthorized")
                .query(true)
                .replyWithError("UNKNOWN ERROR");
            const virtualDeviceValidator = new BatchValidator();
            try {
                await virtualDeviceValidator.checkAuth("simple player");
            } catch (err) {
                assert.equal(err, "UNKNOWN ERROR");
            }
        });
    });

    describe("Validator", () => {
        describe("#check()", () => {
            it("returns false if error is present", () => {
                const test: IVirtualDeviceTest = {
                    comparison: "contains",
                    input: "Hi",
                    sequence: 1,
                };
                const resultItem: IVirtualDeviceValidatorResultItem = {test};
                const validator = new Validator(resultItem, new Error("test error"));
                assert.isDefined(validator.check());
            });
            it("returns false if result item comparison is other than 'contains'", () => {
                const test: IVirtualDeviceTest = {
                    comparison: "includes",
                    input: "Hi",
                    sequence: 1,
                };
                const resultItem: IVirtualDeviceValidatorResultItem = {test};
                const validator = new Validator(resultItem, undefined);
                assert.isDefined(validator.check());
            });
        });
    });

    describe("#execute() sequence processing failure", () => {
        const sequences = [
            {
                invocationName: "test player",
                tests: [{
                    comparison: "contains",
                    expectedStreamURL: undefined,
                    expectedTranscript: "welcome to the simple audio player",
                    input: "open test player",
                    sequence: 1,
                }],
            },
        ];

        let seMessageStub: any;

        afterEach(() => {
            seMessageStub.restore();
        });

        it("handle error object with error property", async () => {
            seMessageStub = Sinon.stub(VirtualDevice.prototype, "batchMessage")
                .callsFake((message: string): Promise<any> => {
                    return Promise.reject({ error: "this is an error"});
                });

            const virtualDeviceValidator = new BatchValidator();
            const validatorResult = await virtualDeviceValidator.execute(sequences);
            for (const test of validatorResult.tests) {
                assert.equal(test.result, "failure", `${JSON.stringify(test)}`);
                assert.equal(test.status, "done", `${JSON.stringify(test)}`);
                const errors = (test.errors || []).map((error: any) => error.actual);
                assert.include(errors, "SystemError: this is an error");
            }
        });

        it("handle error object with error array property", async () => {
            seMessageStub = Sinon.stub(VirtualDevice.prototype, "batchMessage")
                .callsFake((message: string): Promise<any> => {
                    return Promise.reject({ error: ["error1", "error2"]});
                });

            const virtualDeviceValidator = new BatchValidator();
            const validatorResult = await virtualDeviceValidator.execute(sequences);
            for (const test of validatorResult.tests) {
                assert.equal(test.result, "failure", `${JSON.stringify(test)}`);
                assert.equal(test.status, "done", `${JSON.stringify(test)}`);
                const errors = (test.errors || []).map((error: any) => error.actual);
                assert.include(errors, "SystemError: error1, error2");
            }
        });

        it("handle error object with message property", async () => {
            seMessageStub = Sinon.stub(VirtualDevice.prototype, "batchMessage")
                .callsFake((message: string): Promise<any> => {
                    return Promise.reject({ message: "this is an error"});
                });

            const virtualDeviceValidator = new BatchValidator();
            const validatorResult = await virtualDeviceValidator.execute(sequences);
            for (const test of validatorResult.tests) {
                assert.equal(test.result, "failure", `${JSON.stringify(test)}`);
                assert.equal(test.status, "done", `${JSON.stringify(test)}`);
                const errors = (test.errors || []).map((error: any) => error.actual);
                assert.include(errors, "SystemError: this is an error");
            }
        });

        it("handle error object with results property", async () => {
            seMessageStub = Sinon.stub(VirtualDevice.prototype, "batchMessage")
                .callsFake((message: string): Promise<any> => {
                    return Promise.reject("{results: \"this is an error\"}");
                });

            const virtualDeviceValidator = new BatchValidator();
            const validatorResult = await virtualDeviceValidator.execute(sequences);
            for (const test of validatorResult.tests) {
                assert.equal(test.result, "failure", `${JSON.stringify(test)}`);
                assert.equal(test.status, "done", `${JSON.stringify(test)}`);
                const errors = (test.errors || []).map((error: any) => error.actual);
                assert.include(errors, 'SystemError: {results: "this is an error"}');
            }
        });
    });
});
