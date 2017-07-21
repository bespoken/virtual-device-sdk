import {assert} from "chai";
import * as dotenv from "dotenv";
import {SilentEchoScript} from "../src/SilentEchoScript";

describe("SilentEchoScript", function() {
    this.timeout(20000);
    const BASE_URL = "https://silentecho-dev.bespoken.io/process";

    let token: string;
    before(() => {
        dotenv.config();
        if (process.env.TEST_TOKEN) {
            token = process.env.TEST_TOKEN as string;
        } else {
            assert.fail("No TEST_TOKEN defined");
        }
    });
    describe("#tests()", () => {
        it("success", async () => {
            const scripContents = `
            "open test player": "welcome to the simple audio player"
	        "tell test player to play": "https://feeds.soundcloud.com/stream/309340878-user-652822799-episode-010"
	        `;
            const expected = [
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
            const silentEchoScript = new SilentEchoScript(token, BASE_URL);
            assert.deepEqual(silentEchoScript.tests(scripContents), expected);
        });
    });
    describe("#execute()", () => {
        it("success", async () => {
            const scripContents = `
	        "open test player": "welcome to the simple audio player"
	        "tell test player to play": "https://feeds.soundcloud.com/stream/309340878-user-652822799-episode-010"
	        `;
            const silentEchoScript = new SilentEchoScript(token, BASE_URL);
            const validatorResults = await silentEchoScript.execute(scripContents);
            for (const validatorResult of validatorResults) {
                assert.equal(validatorResult.result, "success", `${JSON.stringify(validatorResult)}`);
            }
        });
    });
});
