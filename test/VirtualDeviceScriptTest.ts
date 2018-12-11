import {assert} from "chai";
import * as chai from "chai";
import * as dotenv from "dotenv";
import * as nock from "nock";
import * as Sinon from "sinon";
import * as sinonChai from "sinon-chai";
import {IVirtualDeviceScriptCallback,
    VirtualDeviceScript} from "../src/VirtualDeviceScript";
import {IVirtualDeviceValidatorResultItem,
    VirtualDeviceScriptUnauthorizedError,
    VirtualDeviceValidator,
} from "../src/VirtualDeviceValidator";
import {MessageMock} from "./MessageMock";

chai.use(sinonChai);
const expect = chai.expect;
dotenv.config();

describe("VirtualDeviceScript", function() {
    this.timeout(120000);

    before(() => {
        MessageMock.enableIfConfigured();
    });

    after(() => {
        MessageMock.disable();
    });

    describe("#tests()", () => {
        it("success", async () => {
            const scripContents = `
"open test player": 
  transcript: "Welcome to the Simple Audio Player"
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
                            transcript: "Welcome to the Simple Audio Player",
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
            const virtualDeviceScript = new VirtualDeviceScript();
            assert.deepEqual(virtualDeviceScript.tests(scripContents), expected);
        });

        describe("#invocationName", () => {
            it("success", async () => {
                const scriptContents = `
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
                const virtualDeviceScript = new VirtualDeviceScript();
                assert.deepEqual(virtualDeviceScript.tests(scriptContents), expected);
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
  transcript: "welcome to the si*le audio* player"
  card:
    imageURL: "https://bespoken.io/wp-content/uploads/Bespoken-Logo-Web-White-e1500590667994.png"
    subTitle: "Simple Player * Test"
    mainTitle: "Title of the card"
    textField: "Text content for a standard card"
    type: "BodyTemplate2"
"tell test player to play": 
  streamURL: "https://feeds.soundcloud.com/stream/"  
                `,
            ];
            const virtualDeviceScript = new VirtualDeviceScript();
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
            const virtualDeviceScript = new VirtualDeviceScript();
            const validatorResult = await virtualDeviceScript.execute(test);
            assert.equal(validatorResult.result, "failure", `${JSON.stringify(validatorResult)}`);
        });

        it("success sequence", async () => {
            const scripContents = `
"what is the weather": "*"
"open test player": "welcome to the simple audio player"

"what time is it": "*"

"what is the weather": "*"
"open test player": "welcome to the simple audio player"
"tell test player to play": "https://feeds.soundcloud.com/stream/"
	        `;
            const virtualDeviceScript = new VirtualDeviceScript();
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
    describe("#execute() in batch", () => {
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
  transcript: "welcome to the si*le audio* player"
  card:
    imageURL: "https://bespoken.io/wp-content/uploads/Bespoken-Logo-Web-White-e1500590667994.png"
    subTitle: "Simple Player * Test"
    mainTitle: "Title of the card"
    textField: "Text content for a standard card"
    type: "BodyTemplate2"
"tell test player to play": 
  streamURL: "https://feeds.soundcloud.com/stream/" 
"what time is it": "*"  
                `,
            ];
            const virtualDeviceScript = new VirtualDeviceScript(process.env.VIRTUAL_DEVICE_TOKEN, undefined, true);
            for (const test of tests) {
                const validatorResult = await virtualDeviceScript.execute(test);
                assert.equal(validatorResult.result, "success", `${JSON.stringify(validatorResult)}`);
                for (const t of validatorResult.tests) {
                    assert.equal(t.result, "success", `${JSON.stringify(t)}`);
                }
            }
        });
    });

    describe("#execute() with configuration",  () => {
        it("Uses explicit voice and language code", async () => {
            const scriptContents = `
"config":
  "voiceID": "Matthew"
  "locale": "en-US"
  
"what time is it": "*"
	        `;
            const virtualDeviceScript = new VirtualDeviceScript();
            const result = await virtualDeviceScript.execute(scriptContents);
            assert.isDefined(result);
            assert.equal(result.result, "success");
        });

        it("Uses explicit voice and language code, UK", async () => {
            const scriptContents = `
"config":
  "voiceID": "Brian"
  "locale": "en-GB"
  
"what time is it": "*"
	        `;
            const virtualDeviceScript = new VirtualDeviceScript();
            const result = await virtualDeviceScript.execute(scriptContents);
            assert.isDefined(result);
            assert.equal(result.result, "success");
        });

        it("Uses explicit voice and language code, Germany", async () => {
            const scriptContents = `
"config":
  "voiceID": "Hans"
  "locale": "de-DE"
  
"wie spät ist es": "*"
	        `;
            const virtualDeviceScript = new VirtualDeviceScript();
            const result = await virtualDeviceScript.execute(scriptContents);
            assert.isDefined(result);
            assert.equal(result.result, "success");
        });
    });

    describe("#execute() with programmatic configuration",  () => {
        beforeEach(() => {
            MessageMock.enable();
        });

        afterEach(() => {
            MessageMock.disable();
        });

        it("succeeds with special characters", async () => {
            const tests = [`
"open special characters":
  transcript: "welcome ^ to $ weird * + characters?"
                `,
            ];
            const virtualDeviceScript = new VirtualDeviceScript(process.env.VIRTUAL_DEVICE_TOKEN, undefined, true);
            for (const test of tests) {
                const validatorResult = await virtualDeviceScript.execute(test);
                assert.equal(validatorResult.result, "success", `${JSON.stringify(validatorResult)}`);
                for (const t of validatorResult.tests) {
                    assert.equal(t.result, "success", `${JSON.stringify(t)}`);
                }
            }
        });

        it("Uses explicit voice and language code programmatically", function(done) {
            MessageMock.onCall((url) => {
                assert.include(url, "language_code=en-GB");
                assert.include(url, "voice_id=Matthew");
                done();
            });

            const scriptContents = `"what time is it": "*"`;
            const virtualDeviceScript = new VirtualDeviceScript("TEST", undefined, true);
            virtualDeviceScript.locale("en-GB");
            virtualDeviceScript.voiceID("Matthew");
            virtualDeviceScript.execute(scriptContents);
        });

        it("Uses explicit voice and language code programmatically, non-batch", function(done) {
            MessageMock.onCall((url) => {
                assert.include(url, "/process?");
                assert.include(url, "language_code=en-GB");
                assert.include(url, "voice_id=Matthew");
                done();
            });

            const scriptContents = `"what time is it": "*"`;
            const virtualDeviceScript = new VirtualDeviceScript("TEST", undefined, false);
            virtualDeviceScript.locale("en-GB");
            virtualDeviceScript.voiceID("Matthew");
            virtualDeviceScript.execute(scriptContents);
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

    describe("test homophones", () => {
        beforeEach(() => {
            MessageMock.enable();
        });

        afterEach(() => {
            MessageMock.disable();
        });

        it("tests homophones replaced", async () => {
            process.env["homophones.test"] = "tess, teds";
            process.env["homophones.to"] = "too";
            const tests = [`
"homophone":
  transcript: "the test tools are good to test with"
                `,
            ];
            const virtualDeviceScript = new VirtualDeviceScript(process.env.VIRTUAL_DEVICE_TOKEN, undefined, true);
            for (const test of tests) {
                const validatorResult = await virtualDeviceScript.execute(test);
                assert.equal(validatorResult.result, "success", `${JSON.stringify(validatorResult)}`);
                for (const t of validatorResult.tests) {
                    assert.equal(t.result, "success", `${JSON.stringify(t)}`);
                }
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
            const virtualDeviceScript = new VirtualDeviceScript();
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
                .throws("UNAUTHORIZED");
        });

        after(() => {
            checkAuthStub.restore();
        });

        it("returns unauthorized error", async () => {
            const virtualDeviceScript = new VirtualDeviceScript();
            const unauthorizedCallback: any = (error: Error,
                resultItem: IVirtualDeviceValidatorResultItem, context?: any) => {
                    assert.equal(error, VirtualDeviceScriptUnauthorizedError);
            };
            const unauthorizedCallbackSpy = Sinon.spy(unauthorizedCallback);
            virtualDeviceScript.on("unauthorized", unauthorizedCallbackSpy);
            try {
                await virtualDeviceScript.execute(`"Hi": "*"`);
            } catch (err) {
                assert.equal(err, "UNAUTHORIZED");
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
                const virtualDeviceScript = new VirtualDeviceScript();
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
                const virtualDeviceScript = new VirtualDeviceScript();
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
                .get("/v1/skillAuthorized")
                .query(true)
                .reply(200, "AUTHORIZED");
            sevCheckAuthSpy = Sinon.spy(VirtualDeviceScript.prototype, "checkAuth");
            MessageMock.enable();
        });

        after(() => {
            nockScope.done();
            nock.cleanAll();
            sevCheckAuthSpy.reset();
            sevCheckAuthSpy.restore();
            MessageMock.disable();
        });

        it("success", async () => {
            const scriptContents = `"open test player": "*"`;
            const virtualDeviceScript = new VirtualDeviceScript(process.env.VIRTUAL_DEVICE_TOKEN, "ABC");
            const checkAuthResult = await virtualDeviceScript.checkAuth(scriptContents);
            assert.deepEqual(checkAuthResult, "AUTHORIZED");
            expect(sevCheckAuthSpy).to.have.been.callCount(1);
        });
    });

    describe("#off()", () => {
        let checkAuthStub: any;

        before(() => {
            checkAuthStub = Sinon.stub(VirtualDeviceValidator.prototype, "checkAuth")
                .returns(Promise.resolve("AUTHORIZED"));
            MessageMock.enable();
        });

        after(() => {
            checkAuthStub.restore();
            MessageMock.disable();
        });

        it("success", async () => {
            const scripContents = `"open test player": "*"`;
            const virtualDeviceScript = new VirtualDeviceScript(process.env.VIRTUAL_DEVICE_TOKEN, "USER_ID");
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
