import {assert} from "chai";
import * as dotenv from "dotenv";
import * as Sinon from "sinon";
import * as fixtures from "./fixtures";
import {ISilentResult, SilentEcho} from "../src/SilentEcho";
import {SilentEchoValidator} from "../src/SilentEchoValidator";

describe("SilentEchoValidator", function() {
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

    describe("#execute()", () => {
        it("success", async () => {
            const tests = [
                {
                    comparison: "contains",
                    expectedStreamURL: undefined,
                    expectedTranscript: "welcome to the simple audio player",
                    input: "open test player",
                },
                {
                    comparison: "contains",
                    expectedStreamURL: "https://feeds.soundcloud.com/stream/309340878-user-652822799-episode-010",
                    expectedTranscript: undefined,
                    input: "tell test player to play",
                },
            ];
            const silentEchoValidator = new SilentEchoValidator(token, BASE_URL);
            const validatorResults = await silentEchoValidator.execute(tests);
            for (const validatorResult of validatorResults) {
                assert.equal(validatorResult.result, "success", `${JSON.stringify(validatorResult)}`);
            }
        });

        it("failure", async () => {
            const tests = [
                {
                    comparison: "contains",
                    expectedStreamURL: undefined,
                    expectedTranscript: "wrong transcript",
                    input: "tell test player to play",
                },
            ];
            const silentEchoValidator = new SilentEchoValidator(token, BASE_URL);
            const validatorResults = await silentEchoValidator.execute(tests);
            for (const validatorResult of validatorResults) {
                assert.equal(validatorResult.result, "failure", `${JSON.stringify(validatorResult)}`);
            }
        });
    });
});
