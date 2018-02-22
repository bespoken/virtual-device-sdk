import {assert} from "chai";
import * as dotenv from "dotenv";
import {VirtualDevice} from "../src/VirtualDevice";
import {MessageMock} from "./MessageMock";

describe("VirtualDevice", function() {
    this.timeout(60000);
    const BASE_URL = "https://virtual-device.bespoken.io";

    before(() => {
        dotenv.config();
        MessageMock.enableIfConfigured();
    });

    after(() => {
        MessageMock.disable();
    });

    describe("#message()", () => {
        it("Should return a transcript", async () => {
            const sdk = new VirtualDevice(process.env.TEST_TOKEN as string);
            sdk.baseURL = BASE_URL;
            const results = await sdk.message("hi");
            assert.isDefined(results);
        });

        it("Should have stream URL", async () => {
            const sdk = new VirtualDevice(process.env.TEST_TOKEN as string);
            sdk.baseURL = BASE_URL;
            const result = await sdk.message("tell test player to play");
            console.log("Output: " + JSON.stringify(result));
            assert.isDefined(result.streamURL);
            assert.isTrue((result.streamURL as any).startsWith(
                "https://feeds.soundcloud.com/stream/309340878-user-652822799-episode-010"));
        });

        it("Should have debug info", async () => {
            const sdk = new VirtualDevice(process.env.TEST_TOKEN as string);
            sdk.baseURL = BASE_URL;
            const result = await sdk.message("hi", true);
            console.log("Output: " + JSON.stringify(result));
            assert.isDefined(result.debug);
            assert.isDefined((result.debug as any).rawJSON.messageBody);
        });
    });

    describe("#batchMessage()", () => {
        it("Should return a transcript", async () => {
            const sdk = new VirtualDevice(process.env.TEST_TOKEN as string);
            sdk.baseURL = BASE_URL;
            const results = await sdk.batchMessage(["hi", "what time is it", "tell test player to play"]);
            console.log("Output: " + JSON.stringify(results));
            assert.equal(results.length, 3);
            assert.equal(results[2].message, "tell test player to play");
            assert.include(results[2].streamURL as string, "https://feeds.soundcloud.com/stream/");
        });
    });

    describe("#normalizeMessage()", () => {
        before(() => {
            // Always use mocks for this test
            MessageMock.enable();
        });

        after(() => {
            MessageMock.disable();
        });

        it("Should transform no to 'alexa no'", async () => {
            const sdk = new VirtualDevice(process.env.TEST_TOKEN as string);
            assert.equal(sdk.normalizeMessage("No"), "alexa no");
        });
    });

    describe("#normalizeTranscript()", () => {
        before(() => {
            // Always use mocks for this test
            MessageMock.enable();
        });

        after(() => {
            MessageMock.disable();
        });

        it("lowercase transcript", async () => {
            const sdk = new VirtualDevice(process.env.TEST_TOKEN as string);
            const result = await sdk.message("normalize", true);
            assert.equal(result.transcript, "this should be lowercase");
        });
    });
});
