import {assert} from "chai";
import * as dotenv from "dotenv";
import * as Sinon from "sinon";
import * as fixtures from "./fixtures";
import {ISilentResult, SilentEcho} from "../src/SilentEcho";
import {SilentEchoScript, SilentEchoScriptSyntaxError} from "../src/SilentEchoScript";

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
                       comparison: "contains",
                       expectedStreamURL: undefined,
                       expectedTranscript: "welcome to the simple audio player",
                       input: "Hi",
                   },
                   {
                       comparison: "contains",
                       expectedStreamURL: undefined,
                       expectedTranscript: "welcome to the simple audio player",
                       input: "open test player",
                   },
                   {
                       comparison: "contains",
                       expectedStreamURL: "https://feeds.soundcloud.com/stream/",
                       expectedTranscript: undefined,
                       input: "tell test player to play",
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
            const validatorResults = await silentEchoScript.execute(scripContents);
            for (const validatorResult of validatorResults) {
                assert.equal(validatorResult.result, "success", `${JSON.stringify(validatorResult)}`);
            }
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
