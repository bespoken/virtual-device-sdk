import {assert} from "chai";
import * as dotenv from "dotenv";
import * as Sinon from "sinon";
import {SequencedValidator} from "../src/SequencedValidator";
import {VirtualDevice} from "../src/VirtualDevice";
import { VirtualDeviceValidator } from "../src/VirtualDeviceValidator";
import {MessageMock} from "./MessageMock";

describe("SequencedValidator", function() {
    this.timeout(60000);
    dotenv.config();

    before(() => {
        MessageMock.enableIfConfigured();
    });

    after(() => {
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
            const virtualDeviceValidator = new SequencedValidator();
            const validatorResult = await virtualDeviceValidator.execute(sequences);
            assert.equal(validatorResult.result, "success", `${JSON.stringify(validatorResult)}`);
            for (const test of validatorResult.tests) {
                assert.equal(test.result, "success", `${JSON.stringify(test)}`);
            }
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
            const virtualDeviceValidator = new SequencedValidator();
            const validatorResult = await virtualDeviceValidator.execute(sequences);
            for (const test of validatorResult.tests) {
                assert.equal(test.result, "failure", `${JSON.stringify(test)}`);
                const error = (test.errors as any)[0];
                assert.equal(error.property, "transcript");
                assert.equal(error.expected, "wrong transcript");
                assert.include(error.actual, "simple audio player");
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
            seMessageStub = Sinon.stub(VirtualDevice.prototype, "message")
                .callsFake((message: string): Promise<any> => {
                    if (message.includes("alexa") || message.includes("quit")) {
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
            const virtualDeviceValidator = new SequencedValidator();
            const validatorResult = await virtualDeviceValidator.execute(sequences);
            for (const test of validatorResult.tests) {
                assert.equal(test.result, "failure", `${JSON.stringify(test)}`);
                assert.equal(test.status, "done", `${JSON.stringify(test)}`);
            }
        });
    });
});
