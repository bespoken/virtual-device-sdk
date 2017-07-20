import {assert} from "chai";
import * as dotenv from "dotenv";
import {SilentEcho} from "../src/SilentEcho";

describe("SilentEcho", function() {
    this.timeout(20000);
    const BASE_URL = "https://silentecho-dev.bespoken.io/process";

    before(() => {
        dotenv.config();
    });

    describe("#message()", () => {
        it("Should return a transcript", async () => {
            const sdk = new SilentEcho(process.env.TEST_TOKEN as string);
            sdk.baseURL = BASE_URL;
            const result = await sdk.message("Hi");
            console.log("Output: " + JSON.stringify(result));
            assert.isDefined(result.transcript);
            assert.isDefined(result.transcriptAudioURL);
            assert.isTrue(result.transcriptAudioURL.startsWith("https://storage.googleapis.com/raw_audio/"));
            assert.isNull(result.streamURL);
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

        it("Should handle error", async () => {
            const sdk = new SilentEcho("nonsense");
            try {
                await sdk.message("Hi");
                assert.fail("This should have thrown an exception");
            } catch (e) {
                assert.equal(e, "Invalid token for user_id");
            }
        });
    });
});
