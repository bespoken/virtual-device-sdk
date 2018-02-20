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
    VirtualDeviceValidator,
} from "../src/VirtualDeviceValidator";
import * as fixtures from "./fixtures";

chai.use(sinonChai);
const expect = chai.expect;

// We put the MessageMock in its own class
// This may be enabled all tests, or just for some, so we need some extra safety and logic around it
class MessageMock {
    public static enable() {
        if (MessageMock.sandbox) {
            return;
        }

        const messageMock = (message: string, debug: boolean = false): Promise<IVirtualDeviceResult> => {
            return fixtures.message(message);
        };

        MessageMock.sandbox = Sinon.sandbox.create();
        MessageMock.sandbox.stub(VirtualDevice.prototype, "message").callsFake(messageMock);
    }

    public static disable() {
        if (!MessageMock.sandbox) {
            return;
        }
        MessageMock.sandbox.restore();
        MessageMock.sandbox = undefined;
    }

    private static sandbox: any;
}

describe("VirtualDeviceScript", function() {
    this.timeout(120000);
    const BASE_URL = "https://virtual-device.bespoken.io/process";
    const SOURCE_API_BASE_URL = process.env.SOURCE_API_BASE_URL;

    let token: string;
    const userID: string = "abc";
    before(() => {
        dotenv.config();
        if (process.env.TEST_TOKEN) {
            token = process.env.TEST_TOKEN as string;
        } else {
            assert.fail("No TEST_TOKEN defined");
        }

        if (process.env.ENABLE_MESSAGES_MOCK) {
            MessageMock.enable();
        }
    });

    after(() => {
        if (process.env.ENABLE_MESSAGES_MOCK) {
            MessageMock.disable();
        }
    });

    describe("#tests()", () => {
        it("success", async () => {
            const scripContents = `
"open test player": 
  transcript: "welcome to the simple audio player"
  card:
    title: Title of the card
    imageURL: https://bespoken.io/wp-content/
"Hi": 
  - "welcome to the simple audio player"
  - hi
"tell test player to play": 
  streamURL: "https://feeds.soundcloud.com/stream/"
	        `;
            const expected = [
                {
                    invocationName: "test player",
                    tests: [{
                        absoluteIndex: 1,
                        comparison: "contains",
                        expected: {
                            card: {
                                imageURL: "https://bespoken.io/wp-content/",
                                title: "Title of the card",
                            },
                            transcript: "welcome to the simple audio player",
                        },
                        input: "open test player",
                        sequence: 1,
                        sequenceIndex: 1,
                    },
                    {
                        absoluteIndex: 2,
                        comparison: "contains",
                        expected: {
                            transcript: ["welcome to the simple audio player", "hi"],
                        },
                        input: "Hi",
                        sequence: 1,
                        sequenceIndex: 2,
                    },
                    {
                        absoluteIndex: 3,
                        comparison: "contains",
                        expected: {
                            streamURL: "https://feeds.soundcloud.com/stream/",
                        },
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
                            expected: {
                                transcript: "welcome to the simple audio player",
                            },
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
                            expected: {
                                transcript: "welcome to the simple audio player",
                            },
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
                            expected : {
                                transcript: "welcome to the simple audio player",
                            },
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
                            expected: {
                                transcript: "welcome to the simple audio player",
                            },
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
                            expected: { transcript: "welcome to the simple audio player" },
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
            const tests = [`
"open test player":
  transcript: "welcome to the simple audio player"
  card:
    imageURL: "https://bespoken.io/wp-content/uploads/Bespoken-Logo-Web-White-e1500590667994.png"
    subTitle: "Simple Player Unit Test"
    mainTitle: "Title of the card"
    textField: "Text content for a standard card"
    type: "BodyTemplate2"
"tell test player to play": 
  streamURL: "https://feeds.soundcloud.com/stream/"  
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

        it("card failure", async () => {
            const test = `
"open test player":
  transcript: "welcome to the simple audio player"
  card:
    title: Title of the card
    imageURL: https://incorrect.url/
`;
            const virtualDeviceScript = new VirtualDeviceScript(token, userID, BASE_URL);
            const validatorResult = await virtualDeviceScript.execute(test);
            assert.equal(validatorResult.result, "failure", `${JSON.stringify(validatorResult)}`);
        });

        it("success sequence", async () => {
            const scripContents = `
"alexa Hi": "*"
"open test player": "welcome to the simple audio player"

"alexa Hi": "*"

"alexa Hi": "*"
"open test player": "welcome to the simple audio player"
"tell test player to play": "https://feeds.soundcloud.com/stream/"
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
            assertSequenceInfo(1, 2);
            assertSequenceInfo(2, 1);
            assertSequenceInfo(3, 3);
        });
    });

    describe("#executeDir()", () => {
        let sandbox: any;
        before(() => {
            sandbox = Sinon.sandbox.create();
            sandbox.stub(VirtualDeviceValidator.prototype, "checkAuth")
                .returns(Promise.resolve("AUTHORIZED"));
            MessageMock.enable();
        });
        after(() => {
            sandbox.restore();
            MessageMock.disable();
        });

        it("executes a directory", async () => {
            const script = new VirtualDeviceScript(process.env.TEST_TOKEN as string, "USER_ID");
            const results = await script.executeDir("test/scriptDir");
            // Should run two files - it ignores the one that does not end in YML
            assert.equal(Object.keys(results).length, 3);
            for (const key of Object.keys(results)) {
                if (key.includes("Test1") || key.includes("Test3")) {
                    assert.equal(results[key].result, "success");
                }

                if (key.includes("Test2")) {
                    assert.equal(results[key].result, "failure");
                }
            }
        });

        it("fails on missing directory", async () => {
            const script = new VirtualDeviceScript(process.env.TEST_TOKEN as string, "USER_ID");
            try {
                await script.executeDir("test/nonExistentDir");
                assert.fail("This should never be reached");
            } catch (e) {
                assert.include(e, "Directory to execute does not exist: ");
                assert.include(e, "/nonExistentDir");
            }
        });

        it("fails on not a directory", async () => {
            const script = new VirtualDeviceScript(process.env.TEST_TOKEN as string, "USER_ID");
            try {
                await script.executeDir("test/scriptDir/IgnoreMe.xml");
                assert.fail("This should never be reached");
            } catch (e) {
                assert.include(e, "Not a directory: ");
                assert.include(e, "/scriptDir/IgnoreMe.xml");
            }
        });
    });

    describe("#executeFile()", () => {
        let sandbox: any;
        before(() => {
            sandbox = Sinon.sandbox.create();
            sandbox.stub(VirtualDeviceValidator.prototype, "checkAuth")
                .returns(Promise.resolve("AUTHORIZED"));
            MessageMock.enable();
        });
        after(() => {
            sandbox.restore();
            MessageMock.disable();
        });

        it("is successful", async () => {
            const script = new VirtualDeviceScript(process.env.TEST_TOKEN as string, "USER_ID");
            const result = await script.executeFile("test/scriptDir/Test1.test.yml");
            // Should run two files - it ignores the one that does not end in YML
            assert.equal(result.result, "success");
        });

        it("fails on missing file", async () => {
            const script = new VirtualDeviceScript(process.env.TEST_TOKEN as string, "USER_ID");
            try {
                await script.executeFile("test/scriptDir/NonExistent.test.yml");
                assert.fail("This point should never be reached");
            } catch (e) {
                assert.include(e, "File to execute does not exist:");
                assert.include(e, "/scriptDir/NonExistent.test.yml");
            }
        });
    });

    describe("#on()", () => {
        let checkAuthStub: any;
        before(() => {
            checkAuthStub = Sinon.stub(VirtualDeviceValidator.prototype, "checkAuth")
                .returns(Promise.resolve("AUTHORIZED"));
            // For these tests, we always use the mock
            MessageMock.enable();
        });

        after(() => {
            checkAuthStub.restore();
            MessageMock.disable();
        });

        it("success ", async () => {
            const tests = [
                `"alexa Hi": "*"`,
                `"alexa Hi": ""
                `,
                `
"alexa Hi": ""`,
                `
"alexa Hi": "*"
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
