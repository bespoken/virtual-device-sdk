import {assert} from "chai";
import * as dotenv from "dotenv";
import {SilentEcho} from "../src/SilentEcho";

describe("SilentEcho", function() {
    this.timeout(20000);
    before(() => {
        dotenv.config();
    });

    describe("#message()", () => {
        it("Should return a transcript", async () => {
            const sdk = new SilentEcho(process.env.TEST_TOKEN as string);
            const result = await sdk.message("Hi");
            console.log("Output: " + JSON.stringify(result));
            assert.isDefined(result.transcript);
            assert.isDefined(result.transcript_audio_url);
            assert.isTrue(result.transcript_audio_url.startsWith("https://storage.googleapis.com/raw_audio/"));
            assert.isNull(result.stream_url);
        });

        it("Should have stream URL", async () => {
            const sdk = new SilentEcho(process.env.TEST_TOKEN as string);
            const result = await sdk.message("tell we study billionaires to play");
            console.log(result.stream_url);
            assert.isDefined(result.stream_url);
            assert.isTrue(result.stream_url &&
                result.stream_url.startsWith("https://dts.podtrac.com/redirect.mp3/rss.art19.com/episodes"));
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
