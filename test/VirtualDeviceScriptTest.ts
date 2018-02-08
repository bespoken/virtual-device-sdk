import {assert} from "chai";
import * as chai from "chai";
import * as dotenv from "dotenv";
import * as nock from "nock";
import * as Sinon from "sinon";
import * as sinonChai from "sinon-chai";
import {IVirtualDeviceResult, VirtualDevice} from "../src/VirtualDevice";
import {IVirtualDeviceScriptCallback,
    VirtualDeviceScript} from "../src/VirtualDeviceScript";
import {IVirtualDeviceValidatorResultItem,
    VirtualDeviceScriptUnauthorizedError,
    VirtualDeviceValidator} from "../src/VirtualDeviceValidator";
import * as fixtures from "./fixtures";

chai.use(sinonChai);
const expect = chai.expect;

describe("VirtualDeviceScript", function() {
    this.timeout(120000);
    const BASE_URL = "https://virtual-device.bespoken.io/process";
    const SOURCE_API_BASE_URL = process.env.SOURCE_API_BASE_URL;

    let token: string;
    const userID: string = "abc";
    let messageStub: any;
    before(() => {
        dotenv.config();
        if (process.env.TEST_TOKEN) {
            token = process.env.TEST_TOKEN as string;
        } else {
            assert.fail("No TEST_TOKEN defined");
        }
        if (process.env.ENABLE_MESSAGES_MOCK) {
            const messageMock = (message: string, debug: boolean = false): Promise<IVirtualDeviceResult> => {
                return fixtures.message(message);
            };
            messageStub = Sinon.stub(VirtualDevice.prototype, "message").callsFake(messageMock);
        }
    });

    after(() => {
        if (process.env.ENABLE_MESSAGES_MOCK) {
            messageStub.restore();
        }
    });

    describe("#tests()", () => {
        it("success", async () => {
            const scripContents = `
"open test player": "welcome to the simple audio player"
"Hi": "welcome to the simple audio player"
"tell test player to play": "https://feeds.soundcloud.com/stream/"
	        `;
            const expected = [
                {
                    invocationName: "test player",
                    tests: [{
                        absoluteIndex: 1,
                        comparison: "contains",
                        expectedStreamURL: undefined,
                        expectedTranscript: "welcome to the simple audio player",
                        input: "open test player",
                        sequence: 1,
                        sequenceIndex: 1,
                    },
                    {
                        absoluteIndex: 2,
                        comparison: "contains",
                        expectedStreamURL: undefined,
                        expectedTranscript: "welcome to the simple audio player",
                        input: "Hi",
                        sequence: 1,
                        sequenceIndex: 2,
                    },
                    {
                        absoluteIndex: 3,
                        comparison: "contains",
                        expectedStreamURL: "https://feeds.soundcloud.com/stream/",
                        expectedTranscript: undefined,
                        input: "tell test player to play",
                        sequence: 1,
                        sequenceIndex: 3,
                    }],
                },
            ];
            const virtualDeviceScript = new VirtualDeviceScript(token, userID, BASE_URL);
            assert.deepEqual(virtualDeviceScript.tests(scripContents), expected);
        });
        describe("#invocationName", () => {
            it("success", async () => {
                const scripContents = `
"open test player": "welcome to the simple audio player"

"Open test player": "welcome to the simple audio player"

"Launch test player": "welcome to the simple audio player"

"Tell test player": "welcome to the simple audio player"

"ask test player": "welcome to the simple audio player"
	            `;
                const expected = [
                    {
                        invocationName: "test player",
                        tests: [{
                            absoluteIndex: 1,
                            comparison: "contains",
                            expectedStreamURL: undefined,
                            expectedTranscript: "welcome to the simple audio player",
                            input: "open test player",
                            sequence: 1,
                            sequenceIndex: 1,
                        }],
                    },
                    {
                        invocationName: "test player",
                        tests: [{
                            absoluteIndex: 2,
                            comparison: "contains",
                            expectedStreamURL: undefined,
                            expectedTranscript: "welcome to the simple audio player",
                            input: "Open test player",
                            sequence: 2,
                            sequenceIndex: 1,
                        }],
                    },
                    {
                        invocationName: "test player",
                        tests: [{
                            absoluteIndex: 3,
                            comparison: "contains",
                            expectedStreamURL: undefined,
                            expectedTranscript: "welcome to the simple audio player",
                            input: "Launch test player",
                            sequence: 3,
                            sequenceIndex: 1,
                        }],
                    },
                    {
                        invocationName: "test player",
                        tests: [{
                            absoluteIndex: 4,
                            comparison: "contains",
                            expectedStreamURL: undefined,
                            expectedTranscript: "welcome to the simple audio player",
                            input: "Tell test player",
                            sequence: 4,
                            sequenceIndex: 1,
                        }],
                    },
                    {
                        invocationName: "test player",
                        tests: [{
                            absoluteIndex: 5,
                            comparison: "contains",
                            expectedStreamURL: undefined,
                            expectedTranscript: "welcome to the simple audio player",
                            input: "ask test player",
                            sequence: 5,
                            sequenceIndex: 1,
                        }],
                    },
                ];
                const virtualDeviceScript = new VirtualDeviceScript(token, userID, BASE_URL);
                assert.deepEqual(virtualDeviceScript.tests(scripContents), expected);
            });
        });
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
            const tests = [
                `"Hi": "*"`,
                `"Hi": ""
                `,
                `
"Hi": ""`,
                `
"Hi": "*"
"open test player": "welcome to the simple audio player"
"tell test player to play": "https://feeds.soundcloud.com/stream/"
                `,
            ];
            const virtualDeviceScript = new VirtualDeviceScript(token, userID, BASE_URL);
            for (const test of tests) {
                const validatorResult = await virtualDeviceScript.execute(test);
                assert.equal(validatorResult.result, "success", `${JSON.stringify(validatorResult)}`);
                for (const t of validatorResult.tests) {
                    assert.equal(t.result, "success", `${JSON.stringify(t)}`);
                }
            }
        });

        it("success sequence", async () => {
            const scripContents = `
"Hi": "*"
"open test player": "welcome to the simple audio player"
"tell test player to play": "https://feeds.soundcloud.com/stream/"

"Hi": "*"

"Hi": "*"
"open test player": "welcome to the simple audio player"
	        `;
            const virtualDeviceScript = new VirtualDeviceScript(token, userID, BASE_URL);
            const validatorResult = await virtualDeviceScript.execute(scripContents);
            assert.equal(validatorResult.result, "success", `${JSON.stringify(validatorResult)}`);
            for (const test of validatorResult.tests) {
                assert.equal(test.result, "success", `${JSON.stringify(test)}`);
            }

            let absoluteIndex: number = 0;
            const assertSequenceInfo = (sequence: number, testsQuantity: number) => {
                const sequenceTests = validatorResult.tests
                    .filter((resultItem: IVirtualDeviceValidatorResultItem) => {
                        return resultItem.test.sequence === sequence;
                    });
                const msg = "unexpected sequence tests quantity, " +
                `expected: ${testsQuantity}, got: ${sequenceTests.length}`;
                assert.equal(sequenceTests.length, testsQuantity, msg);

                let i: number = 0;
                sequenceTests.sort((a: any, b: any) => a.test.sequenceIndex - b.test.sequenceIndex);
                for (const resultItem of sequenceTests) {
                    i += 1;
                    absoluteIndex += 1;
                    const sequenceMsg = "unexpected sequence index, " +
                    `expected ${i}, got: ${resultItem.test.sequenceIndex}`;
                    const absoluteMsg = "unexpected absolute index, " +
                    `expected ${absoluteIndex}, got: ${resultItem.test.absoluteIndex}`;
                    assert.equal(resultItem.test.sequenceIndex, i, sequenceMsg);
                    assert.equal(resultItem.test.absoluteIndex, absoluteIndex, absoluteMsg);
                }
            };
            assertSequenceInfo(1, 3);
            assertSequenceInfo(2, 1);
            assertSequenceInfo(3, 2);
        });
    });

    describe("#on()", () => {
        let checkAuthStub: any;
        before(() => {
            checkAuthStub = Sinon.stub(VirtualDeviceValidator.prototype, "checkAuth")
                .returns(Promise.resolve("AUTHORIZED"));
        });

        after(() => {
            checkAuthStub.restore();
        });

        it("success ", async () => {
            const tests = [
                `"Hi": "*"`,
                `"Hi": ""
                `,
                `
"Hi": ""`,
                `
"Hi": "*"
"open test player": "welcome to the simple audio player"
"tell test player to play": "https://feeds.soundcloud.com/stream/"
                `,
            ];
            const virtualDeviceScript = new VirtualDeviceScript(token, userID, BASE_URL);
            const messageCallback: IVirtualDeviceScriptCallback = (
                error: Error,
                resultItem: IVirtualDeviceValidatorResultItem,
                context?: any) => {
                    assert.equal(resultItem.status, "running");
                };
            const messageCallbackSpy = Sinon.spy(messageCallback);
            const resultCallback: IVirtualDeviceScriptCallback = (
                error: Error,
                resultItem: IVirtualDeviceValidatorResultItem,
                context?: any) => {
                    assert.equal(resultItem.status, "done");
                };
            const resultCallbackSpy = Sinon.spy(resultCallback);
            virtualDeviceScript.on("message", messageCallbackSpy);
            virtualDeviceScript.on("result", resultCallbackSpy);
            for (const test of tests) {
                const validatorResult = await virtualDeviceScript.execute(test);
                assert.equal(validatorResult.result, "success", `${JSON.stringify(validatorResult)}`);
                for (const t of validatorResult.tests) {
                    assert.equal(t.result, "success", `${JSON.stringify(t)}`);
                }
            }
            expect(messageCallbackSpy).to.have.been.callCount(6);
            expect(resultCallbackSpy).to.have.been.callCount(6);
        });
    });

    describe("#on() unauthorized event", () => {
        let checkAuthStub: any;

        before(() => {
            checkAuthStub = Sinon.stub(VirtualDeviceValidator.prototype, "checkAuth")
                .returns(Promise.resolve("UNAUTHORIZED"));
        });

        after(() => {
            checkAuthStub.restore();
        });

        it("returns unauthorized error", async () => {
            const virtualDeviceScript = new VirtualDeviceScript(token, userID, BASE_URL);
            const unauthorizedCallback: any = (error: Error,
                resultItem: IVirtualDeviceValidatorResultItem, context?: any) => {
                    assert.equal(error, VirtualDeviceScriptUnauthorizedError);
            };
            const unauthorizedCallbackSpy = Sinon.spy(unauthorizedCallback);
            virtualDeviceScript.on("unauthorized", unauthorizedCallbackSpy);
            try {
                await virtualDeviceScript.execute(`"Hi": "*"`);
            } catch (err) {
                assert.equal(err, VirtualDeviceScriptUnauthorizedError);
            }
            expect(unauthorizedCallbackSpy).to.have.been.callCount(1);
        });
    });

    describe("#validate()", () => {
        it("returns undefined", async () => {
            const tests = [
                {
                expected: undefined,
                scriptContents: `
"open test player": "welcome to the simple audio player"
"tell test player to play": "https://feeds.soundcloud.com/stream/"
                `,
                }];
            for (const test of tests) {
                const virtualDeviceScript = new VirtualDeviceScript(token, userID, BASE_URL);
                assert.equal(virtualDeviceScript.validate(test.scriptContents), test.expected);
            }
        });

        it("returns syntax error", async () => {
            const tests = [
                {expected: "Line 1: No right-hand value specified.",
                scriptContents: `wrong contents`,
                },
                {expected: "Line 1: No right-hand value specified.",
                scriptContents: `open test player`,
                },
                {expected: "Line 1: No properties added for object.",
                scriptContents: `"open test player":`,
                },
                {expected: undefined,
                scriptContents: `"open test player": welcome to the simple audio player`,
                },
                {expected: undefined,
                scriptContents: `"open test player": "welcome to the simple audio player`,
                },
                {expected: "Line 2: No right-hand value specified.",
                scriptContents: `
"open test player": "welcome to the simple audio player"
"tell test player to play"
                `,
                },
                {
                expected: undefined,
                scriptContents: `
"open test player": "welcome to the simple audio player"
"tell test player to play": https://feeds.soundcloud.com/stream/"
                `,
                },
                ];
            for (const test of tests) {
                const virtualDeviceScript = new VirtualDeviceScript(token, userID, BASE_URL);
                const output = virtualDeviceScript.validate(test.scriptContents);
                if (test.expected) {
                    assert.equal((output as Error).message, test.expected, `test: ${JSON.stringify(test)}`);
                } else {
                    assert.isUndefined(output, `test: ${JSON.stringify(test)}`);
                }

            }
        });
    });

    describe("#checkAuth()", () => {
        let sevCheckAuthSpy: any;
        let nockScope: any;

        before(() => {
            nockScope = nock("https://source-api.bespoken.tools")
                .get("/v1/skillAuthorized?invocation_name=test%20player" +
                    `&user_id=${userID}`)
                .reply(200, "AUTHORIZED");
            sevCheckAuthSpy = Sinon.spy(VirtualDeviceScript.prototype, "checkAuth");
        });

        after(() => {
            nockScope.done();
            nock.cleanAll();
            sevCheckAuthSpy.reset();
            sevCheckAuthSpy.restore();
        });

        it("success", async () => {
            const scripContents = `"open test player": "*"`;
            const virtualDeviceScript = new VirtualDeviceScript(token, userID, BASE_URL, SOURCE_API_BASE_URL);
            const checkAuthResult = await virtualDeviceScript.checkAuth(scripContents);
            assert.deepEqual(checkAuthResult, "AUTHORIZED");
            expect(sevCheckAuthSpy).to.have.been.callCount(1);
        });
    });

    describe("#off()", () => {
        let checkAuthStub: any;

        before(() => {
            checkAuthStub = Sinon.stub(VirtualDeviceValidator.prototype, "checkAuth")
                .returns(Promise.resolve("AUTHORIZED"));
        });

        after(() => {
            checkAuthStub.restore();
        });

        it("success", async () => {
            const scripContents = `"open test player": "*"`;
            const virtualDeviceScript = new VirtualDeviceScript(token, userID, BASE_URL,
                SOURCE_API_BASE_URL);
            const events = ["message", "result", "unauthorized"];
            const spies = [];
            for (const e of events) {
                const cb: IVirtualDeviceScriptCallback = (
                    error: Error,
                    resultItem: IVirtualDeviceValidatorResultItem,
                    context?: any) => undefined;
                const callbackSpy = Sinon.spy(cb);
                spies.push(callbackSpy);
                virtualDeviceScript.on(e, callbackSpy);
                virtualDeviceScript.off(e);
            }
            const validatorResult = await virtualDeviceScript.execute(scripContents);
            assert.equal(validatorResult.result, "success");
            for (const spy of spies) {
                expect(spy).to.have.been.callCount(0);
            }
        });
    });
});
