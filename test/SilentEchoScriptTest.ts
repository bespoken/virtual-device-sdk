import {assert} from "chai";
import * as chai from "chai";
import * as dotenv from "dotenv";
import * as Sinon from "sinon";
import * as sinonChai from "sinon-chai";
import {ISilentResult, SilentEcho} from "../src/SilentEcho";
import {ISilentEchoScriptCallback,
    SilentEchoScript,
    SilentEchoScriptSyntaxError} from "../src/SilentEchoScript";
import {ISilentEchoValidatorResultItem} from "../src/SilentEchoValidator";
import * as fixtures from "./fixtures";

chai.use(sinonChai);
const expect = chai.expect;

describe("SilentEchoScript", function() {
    this.timeout(120000);
    const BASE_URL = "https://silentecho.bespoken.io/process";

    let token: string;
    let messageStub: any;
    before(() => {
        dotenv.config();
        if (process.env.TEST_TOKEN) {
            token = process.env.TEST_TOKEN as string;
        } else {
            assert.fail("No TEST_TOKEN defined");
        }
        if (process.env.ENABLE_MESSAGES_MOCK) {
            const messageMock = (message: string, debug: boolean = false): Promise<ISilentResult> => {
                return fixtures.message(message);
            };
            messageStub = Sinon.stub(SilentEcho.prototype, "message").callsFake(messageMock);
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
            "Hi": "welcome to the simple audio player"
            "open test player": "welcome to the simple audio player"
            "tell test player to play": "https://feeds.soundcloud.com/stream/"
	        `;
            const expected = [
                {
                    tests: [{
                        absoluteIndex: 1,
                        comparison: "contains",
                        expectedStreamURL: undefined,
                        expectedTranscript: "welcome to the simple audio player",
                        input: "Hi",
                        sequence: 1,
                        sequenceIndex: 1,
                    },
                    {
                        absoluteIndex: 2,
                        comparison: "contains",
                        expectedStreamURL: undefined,
                        expectedTranscript: "welcome to the simple audio player",
                        input: "open test player",
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
            const silentEchoScript = new SilentEchoScript(token, BASE_URL);
            assert.deepEqual(silentEchoScript.tests(scripContents), expected);
        });
    });
    describe("#execute()", () => {
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
            const silentEchoScript = new SilentEchoScript(token, BASE_URL);
            for (const test of tests) {
                const validatorResult = await silentEchoScript.execute(test);
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
            const silentEchoScript = new SilentEchoScript(token, BASE_URL);
            const validatorResult = await silentEchoScript.execute(scripContents);
            assert.equal(validatorResult.result, "success", `${JSON.stringify(validatorResult)}`);
            for (const test of validatorResult.tests) {
                assert.equal(test.result, "success", `${JSON.stringify(test)}`);
            }

            let absoluteIndex: number = 0;
            const assertSequenceInfo = (sequence: number, testsQuantity: number) => {
                const sequenceTests = validatorResult.tests.filter((resultItem) => {
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
            const silentEchoScript = new SilentEchoScript(token, BASE_URL);
            const messageCallback: ISilentEchoScriptCallback = (
                resultItem: ISilentEchoValidatorResultItem) => {
                    assert.equal(resultItem.status, "running");
                };
            const messageCallbackSpy = Sinon.spy(messageCallback);
            const resultCallback: ISilentEchoScriptCallback = (
                resultItem: ISilentEchoValidatorResultItem) => {
                    assert.equal(resultItem.status, "done");
                };
            const resultCallbackSpy = Sinon.spy(resultCallback);
            silentEchoScript.on("message", messageCallbackSpy);
            silentEchoScript.on("result", resultCallbackSpy);
            for (const test of tests) {
                const validatorResult = await silentEchoScript.execute(test);
                assert.equal(validatorResult.result, "success", `${JSON.stringify(validatorResult)}`);
                for (const t of validatorResult.tests) {
                    assert.equal(t.result, "success", `${JSON.stringify(t)}`);
                }
            }
            expect(messageCallbackSpy).to.have.been.callCount(6);
            expect(resultCallbackSpy).to.have.been.callCount(6);
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
    describe("#prettifyAsHTML()", () => {
        it("success", async () => {
            const scripContents = `
            "open test player": "welcome to the simple audio player"
            "tell test player to play": "https://feeds.soundcloud.com/stream/"
	        `;
            const silentEchoScript = new SilentEchoScript(token, BASE_URL);
            const validatorResult = await silentEchoScript.execute(scripContents);
            // tslint:disable:max-line-length
            const expected = `
            <div>
                <p style="font-weight:500;font-size:28px;font-family:'Roboto','Helvetica','Arial',sans-serif;">
                    Validation Script Results<img src='/images/Spinner.svg' height=34>
                </p>
                <div style="margin:0 0 -18px;" class="output">
                    <p style="font-weight:bold;"class="heading">Output:</p>
                </div>
                <div class="overall">
                    <p style="margin:0 0 -6px;font-weight:bold;" class="heading">Overall:</p>
                    <p class="content" style="color:rgb(76,175,80);">2 tests, 2 succeeded, 0 failed</p>
                </div>
                <div class="time">
                    <p style="margin:0 0 -6px;font-weight:bold;" class="heading">Time:</p>
                    <p class="content"></p>
                </div>
                    <div style="margin-bottom:16px;" class="sequence">
                        <p style="margin:0 0 2px;font-weight:bold;" class="heading">Sequence: 1</p>
                        <table style="border-collapse:collapse;">
                            <thead>
                                <tr>
                                    <th style="border:1px solid black;padding:5px;">Result</th>
                                    <th style="border:1px solid black;padding:5px;">Input</th>
                                    <th style="border:1px solid black;padding:5px;">Expected</th>
                                    <th style="border:1px solid black;padding:5px;">Actual</th>
                                </tr>
                            </thead>
                            <tbody>
                        <tr style="color:rgb(76,175,80);">
                            <td style="border:1px solid black;padding:5px;text-align:center;">&#10004;</td>
                            <td style="border:1px solid black;padding:5px;">open test player</td>
                            <td style="border:1px solid black;padding:5px;">welcome to the simple audio player</td>
                            <td style="border:1px solid black;padding:5px;">welcome to the simple audio player say play to play some audio</td>
                        </tr>
                        <tr style="color:rgb(76,175,80);">
                            <td style="border:1px solid black;padding:5px;text-align:center;">&#10004;</td>
                            <td style="border:1px solid black;padding:5px;">tell test player to play</td>
                            <td style="border:1px solid black;padding:5px;">https://feeds.soundcloud.com/stream/</td>
                            <td style="border:1px solid black;padding:5px;">https://feeds.soundcloud.com/stream/309340878-user-652822799-episode-010-building-an-alexa-skill-with-flask-ask-with-john-wheeler.mp3</td>
                        </tr></tbody>
                        </table>
                    </div>
            </div>`;
            // tslint:enable:max-line-length
            assert.equal(silentEchoScript.prettifyAsHTML(validatorResult, false), expected);
        });
    });
    describe("#prettifyAsPartialHTML()", () => {
        it("success", async () => {
            const scripContents = `
            "open test player": "welcome to the simple audio player"
            "tell test player to play": "https://feeds.soundcloud.com/stream/"
	        `;
            const silentEchoScript = new SilentEchoScript(token, BASE_URL);
            // tslint:disable:max-line-length
            const expected = `
            <div>
                <p style="font-weight:500;font-size:28px;font-family:'Roboto','Helvetica','Arial',sans-serif;">
                    Validation Script Results
                </p>
                <div style="margin:0 0 -18px;" class="output">
                    <p style="font-weight:bold;"class="heading">Output:</p>
                </div>
                <div class="overall">
                    <p style="margin:0 0 -6px;font-weight:bold;" class="heading">Overall:</p>
                    <p class="content" style="color:rgb(76,175,80);">2 tests, 0 succeeded, 0 failed</p>
                </div>
                <div class="time">
                    <p style="margin:0 0 -6px;font-weight:bold;" class="heading">Time:</p>
                    <p class="content"></p>
                </div>
                    <div style="margin-bottom:16px;" class="sequence">
                        <p style="margin:0 0 2px;font-weight:bold;" class="heading">Sequence: 1</p>
                        <table style="border-collapse:collapse;">
                            <thead>
                                <tr>
                                    <th style="border:1px solid black;padding:5px;">Result</th>
                                    <th style="border:1px solid black;padding:5px;">Input</th>
                                    <th style="border:1px solid black;padding:5px;">Expected</th>
                                    <th style="border:1px solid black;padding:5px;">Actual</th>
                                </tr>
                            </thead>
                            <tbody>
                        <tr>
                            <td style="border:1px solid black;padding:5px;text-align:center;"><img src='/images/Schedule.svg' height=18></td>
                            <td style="border:1px solid black;padding:5px;">open test player</td>
                            <td style="border:1px solid black;padding:5px;">welcome to the simple audio player</td>
                            <td style="border:1px solid black;padding:5px;"></td>
                        </tr>
                        <tr>
                            <td style="border:1px solid black;padding:5px;text-align:center;"><img src='/images/Schedule.svg' height=18></td>
                            <td style="border:1px solid black;padding:5px;">tell test player to play</td>
                            <td style="border:1px solid black;padding:5px;">https://feeds.soundcloud.com/stream/</td>
                            <td style="border:1px solid black;padding:5px;"></td>
                        </tr></tbody>
                        </table>
                    </div>
            </div>`;
            // tslint:enable:max-line-length
            assert.equal(silentEchoScript.prettifyAsPartialHTML(scripContents, [], false), expected);
        });
    });
});
