import {assert} from "chai";
import * as dotenv from "dotenv";
import * as Sinon from "sinon";
import {ISilentResult, SilentEcho} from "../src/SilentEcho";
import {SilentEchoScript, SilentEchoScriptSyntaxError} from "../src/SilentEchoScript";
import * as fixtures from "./fixtures";

describe("SilentEchoScript", function() {
    this.timeout(20000);
    const BASE_URL = "https://silentecho-dev.bespoken.io/process";

    let token: string;
    let messageStub: any;
    before(() => {
        dotenv.config();
        if (process.env.TEST_TOKEN) {
            token = process.env.TEST_TOKEN as string;
        } else {
            assert.fail("No TEST_TOKEN defined");
        }
        const messageMock = (message: string, debug: boolean = false): Promise<ISilentResult> => {
            return fixtures.message(message);
        };
        messageStub = Sinon.stub(SilentEcho.prototype, "message").callsFake(messageMock);
    });
    after(() => {
        messageStub.restore();
    });
    describe("#tests()", () => {
        it("success", async () => {
            const scripContents = `
            "Hi": "welcome to the simple audio player"
            "open test player": "welcome to the simple audio player"
            "tell test player to play": "https://feeds.soundcloud.com/stream/"
	        `;
            const expected = [
                {
                    tests: [{
                        comparison: "contains",
                        expectedStreamURL: undefined,
                        expectedTranscript: "welcome to the simple audio player",
                        input: "Hi",
                        sequence: 1,
                    },
                    {
                        comparison: "contains",
                        expectedStreamURL: undefined,
                        expectedTranscript: "welcome to the simple audio player",
                        input: "open test player",
                        sequence: 1,
                    },
                    {
                        comparison: "contains",
                        expectedStreamURL: "https://feeds.soundcloud.com/stream/",
                        expectedTranscript: undefined,
                        input: "tell test player to play",
                        sequence: 1,
                    }],
                },
            ];
            const silentEchoScript = new SilentEchoScript(token, BASE_URL);
            assert.deepEqual(silentEchoScript.tests(scripContents), expected);
        });
    });
    describe("#execute()", () => {
        it("success", async () => {
            const scripContents = `
            "Hi": "welcome to the simple audio player"
            "open test player": "welcome to the simple audio player"
            "tell test player to play": "https://feeds.soundcloud.com/stream/"
	        `;
            const silentEchoScript = new SilentEchoScript(token, BASE_URL);
            const validatorResult = await silentEchoScript.execute(scripContents);
            assert.equal(validatorResult.result, "success", `${JSON.stringify(validatorResult)}`);
            for (const test of validatorResult.tests) {
                assert.equal(test.result, "success", `${JSON.stringify(test)}`);
            }
        });

        it("success sequence", async () => {
            const scripContents = `
            "Hi": "welcome to the simple audio player"
            "open test player": "welcome to the simple audio player"
            "tell test player to play": "https://feeds.soundcloud.com/stream/"

            "Hi": "welcome to the simple audio player"

            "Hi": "welcome to the simple audio player"
            "open test player": "welcome to the simple audio player"
	        `;
            const silentEchoScript = new SilentEchoScript(token, BASE_URL);
            const validatorResult = await silentEchoScript.execute(scripContents);
            assert.equal(validatorResult.result, "success", `${JSON.stringify(validatorResult)}`);
            for (const test of validatorResult.tests) {
                assert.equal(test.result, "success", `${JSON.stringify(test)}`);
            }
            const firstSequenceTests = validatorResult.tests.filter((resultItem) => resultItem.test.sequence === 1);
            assert.equal(firstSequenceTests.length, 3, `${firstSequenceTests}`);
            const secondSequenceTests = validatorResult.tests.filter((resultItem) => resultItem.test.sequence === 2);
            assert.equal(secondSequenceTests.length, 1, `${secondSequenceTests}`);
            const thirdSequenceTests = validatorResult.tests.filter((resultItem) => resultItem.test.sequence === 3);
            assert.equal(thirdSequenceTests.length, 2, `${thirdSequenceTests}`);
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
                const silentEchoScript = new SilentEchoScript(token, BASE_URL);
                assert.equal(silentEchoScript.validate(test.scriptContents), test.expected);
            }
        });
        it("returns syntax error", async () => {
            const tests = [
                {expected: SilentEchoScriptSyntaxError,
                scriptContents: `wrong contents`,
                },
                {expected: SilentEchoScriptSyntaxError,
                scriptContents: `open test player`,
                },
                {expected: SilentEchoScriptSyntaxError,
                scriptContents: `"open test player":`,
                },
                {expected: SilentEchoScriptSyntaxError,
                scriptContents: `"open test player": welcome to the simple audio player`,
                },
                {expected: SilentEchoScriptSyntaxError,
                scriptContents: `"open test player": "welcome to the simple audio player`,
                },
                {expected: SilentEchoScriptSyntaxError,
                scriptContents: `
                    "open test player": "welcome to the simple audio player"
                    "tell test player to play"
                `,
                },
                {
                expected: SilentEchoScriptSyntaxError,
                scriptContents: `
                    "open test player": "welcome to the simple audio player"
                    "tell test player to play": https://feeds.soundcloud.com/stream/"
                `,
                },
                ];
            for (const test of tests) {
                const silentEchoScript = new SilentEchoScript(token, BASE_URL);
                assert.equal(silentEchoScript.validate(test.scriptContents),
                    test.expected, `test: ${JSON.stringify(test)}`);
            }
        });
    });
});
