import {assert} from "chai";
import * as dotenv from "dotenv";
import * as nock from "nock";
import * as Sinon from "sinon";
import {ISilentResult, SilentEcho} from "../src/SilentEcho";
import {SilentEchoValidator} from "../src/SilentEchoValidator";
import * as fixtures from "./fixtures";

describe("SilentEchoValidator", function() {
    this.timeout(60000);
    const BASE_URL = "https://silentecho.bespoken.io/process";
    const SOURCE_API_BASE_URL = process.env.SOURCE_API_BASE_URL;

    let token: string;
    const userID: string = "abc";
    let messageStub: any;
    const messageMock = (message: string, debug: boolean = false): Promise<ISilentResult> => {
        return fixtures.message(message);
    };

    before(() => {
        dotenv.config();
        if (process.env.TEST_TOKEN) {
            token = process.env.TEST_TOKEN as string;
        } else {
            assert.fail("No TEST_TOKEN defined");
        }
        if (process.env.ENABLE_MESSAGES_MOCK) {

            messageStub = Sinon.stub(SilentEcho.prototype, "message").callsFake(messageMock);
        }
    });

    after(() => {
        if (process.env.ENABLE_MESSAGES_MOCK) {
            messageStub.restore();
        }
    });

    describe("#execute()", () => {
        let checkAuthStub: any;
        before(() => {
            checkAuthStub = Sinon.stub(SilentEchoValidator.prototype, "checkAuth")
                .returns(Promise.resolve("AUTHORIZED"));
        });
        after(() => {
            checkAuthStub.restore();
        });
        it("success", async () => {
            const sequences = [
                {
                    tests: [{
                        comparison: "contains",
                        expectedStreamURL: undefined,
                        expectedTranscript: "welcome to the simple audio player",
                        input: "open test player",
                        sequence: 1,
                    },
                    {
                        comparison: "contains",
                        expectedStreamURL: "https://feeds.soundcloud.com/stream/309340878-user-652822799-episode-010",
                        expectedTranscript: undefined,
                        input: "tell test player to play",
                        sequence: 1,
                    }],
                },
            ];
            const silentEchoValidator = new SilentEchoValidator(token, userID, BASE_URL);
            const validatorResult = await silentEchoValidator.execute(sequences, "");
            assert.equal(validatorResult.result, "success", `${JSON.stringify(validatorResult)}`);
            for (const test of validatorResult.tests) {
                assert.equal(test.result, "success", `${JSON.stringify(test)}`);
            }
        });

        it("failure", async () => {
            const sequences = [
                {
                    tests: [{
                        comparison: "contains",
                        expectedStreamURL: undefined,
                        expectedTranscript: "wrong transcript",
                        input: "tell test player to play",
                        sequence: 1,
                    }],
                },
            ];
            const silentEchoValidator = new SilentEchoValidator(token, userID, BASE_URL);
            const validatorResult = await silentEchoValidator.execute(sequences, "");
            for (const test of validatorResult.tests) {
                assert.equal(test.result, "failure", `${JSON.stringify(test)}`);
            }
        });
    });

    describe("#execute() invocation permissions", () => {
        const sequences = [
            {
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
        before(() => {
            checkAuthStub = Sinon.stub(SilentEchoValidator.prototype, "checkAuth")
                .returns(Promise.reject("UNAUTHORIZED"));
        });
        after(() => {
            checkAuthStub.restore();
        });
        it("handles #checkAuth() errors", async () => {
            const silentEchoValidator = new SilentEchoValidator(token, userID, BASE_URL);
            try {
                await silentEchoValidator.execute(sequences, "");
            } catch (err) {
                assert.equal(err, "UNAUTHORIZED");
            }
        });
    });

    describe("#execute() sequence processing failure", () => {
        const sequences = [
            {
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
            if (process.env.ENABLE_MESSAGES_MOCK) {
                messageStub.restore();
            }
            checkAuthStub = Sinon.stub(SilentEchoValidator.prototype, "checkAuth")
                .returns(Promise.resolve("AUTHORIZED"));
            seMessageStub = Sinon.stub(SilentEcho.prototype, "message")
                .callsFake((message: string): Promise<any> => {
                    if (message.includes("Alexa")) {
                        return Promise.resolve();
                    }
                    return Promise.reject("something went wrong");
                });
        });
        after(() => {
            seMessageStub.restore();
            if (process.env.ENABLE_MESSAGES_MOCK) {
                messageStub = Sinon.stub(SilentEcho.prototype, "message").callsFake(messageMock);
            }
            checkAuthStub.restore();
        });
        it("handles silent echo errors", async () => {
            const silentEchoValidator = new SilentEchoValidator(token, userID, BASE_URL);
            const validatorResult = await silentEchoValidator.execute(sequences, "");
            for (const test of validatorResult.tests) {
                assert.equal(test.result, "failure", `${JSON.stringify(test)}`);
                assert.equal(test.status, "done", `${JSON.stringify(test)}`);
            }
        });
    });

    describe("#checkAuth()", () => {
        let nockScope: any;
        before(() => {
            nockScope = nock("https://source-api.bespoken.tools")
                .get("/v1/skillAuthorized?invocation_name=simple%20player" +
                    `&user_id=${userID}&token=${token}`)
                .reply(200, "AUTHORIZED");
        });
        after(() => {
            nockScope.done();
            nock.cleanAll();
        });
        it("success", async () => {
            const silentEchoValidator = new SilentEchoValidator(token, userID,
                BASE_URL, SOURCE_API_BASE_URL);
            const checkAuthResult = await silentEchoValidator.checkAuth("simple player");
            assert.equal(checkAuthResult, "AUTHORIZED");
        });
    });
});
