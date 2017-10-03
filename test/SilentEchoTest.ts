import {assert} from "chai";
import * as dotenv from "dotenv";
import * as Sinon from "sinon";
import {ISilentResult, SilentEcho} from "../src/SilentEcho";
import * as fixtures from "./fixtures";

describe("SilentEcho", function() {
    this.timeout(60000);
    const BASE_URL = "https://silentecho.bespoken.io/process";
    let messageStub: any;

    before(() => {
        dotenv.config();
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

    describe("#message()", () => {
        it("Should return a transcript", async () => {
            const sdk = new SilentEcho(process.env.TEST_TOKEN as string);
            sdk.baseURL = BASE_URL;
            const result = await sdk.message("Hi");
            console.log("Output: " + JSON.stringify(result));
            assert.isDefined(result.transcript);
            assert.isDefined(result.transcriptAudioURL);
            assert.isNull(result.transcriptAudioURL);
        });

        it("Should have stream URL", async () => {
            const sdk = new SilentEcho(process.env.TEST_TOKEN as string);
            sdk.baseURL = BASE_URL;
            const result = await sdk.message("tell test player to play");
            console.log("Output: " + JSON.stringify(result));
            assert.isDefined(result.streamURL);
            assert.isTrue((result.streamURL as any).startsWith(
                "https://feeds.soundcloud.com/stream/309340878-user-652822799-episode-010"));
        });

        it("Should have debug info", async () => {
            const sdk = new SilentEcho(process.env.TEST_TOKEN as string);
            sdk.baseURL = BASE_URL;
            const result = await sdk.message("hi", true);
            console.log("Output: " + JSON.stringify(result));
            assert.isDefined(result.debug);
            assert.isDefined((result.debug as any).rawJSON.messageBody);
        });
    });
});
