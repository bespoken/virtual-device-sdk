import {assert} from "chai";
import * as dotenv from "dotenv";
import {VirtualDevice} from "../src/VirtualDevice";
import {MessageMock} from "./MessageMock";

dotenv.config();

describe("VirtualDevice", function() {
    this.timeout(60000);

    before(() => {
        MessageMock.enableIfConfigured();
    });

    after(() => {
        MessageMock.disable();
    });

    describe("#message()", () => {
        it("Should return a transcript", async () => {
            const sdk = newVirtualDevice();
            const results = await sdk.message("what time is it");
            assert.isDefined(results);
        });

        it("Should have stream URL", async () => {
            const sdk = newVirtualDevice();
            const result = await sdk.message("tell test player to play");
            console.log("Output: " + JSON.stringify(result));
            assert.isDefined(result.streamURL);
            assert.isTrue((result.streamURL as any).startsWith(
                "https://feeds.soundcloud.com/stream/309340878-user-652822799-episode-010"));
        });

        it("Should have debug info", async () => {
            const sdk = newVirtualDevice();
            const result = await sdk.message("what is the weather", true);
            console.log("Output: " + JSON.stringify(result));
            assert.isDefined(result.transcript);
            assert.isDefined((result.debug as any).rawJSON.messageBody);
        });

        it("Should handle weird characters", async () => {
            const token = process.env["VIRTUAL_DEVICE_TOKEN.DE-DE"] as string;
            const sdk = new VirtualDevice(token, "de-DE");
            const result = await sdk.message("wie spät ist es", true);
            console.log("Output: " + JSON.stringify(result));
            assert.isDefined(result.transcript);
        });
    });

    describe("#message() with phrases", () => {
        before(() => {
            MessageMock.enable();
        });

        it("Should handle phrases correctly", async () => {
            const token = process.env["VIRTUAL_DEVICE_TOKEN.DE-DE"] as string;
            const sdk = new VirtualDevice(token, "de-DE");
            const result = await sdk.message("phrases", false, "phrases being passed");
            console.log("Output: " + JSON.stringify(result));
            assert.equal(result.transcript, "phrases being passed");
        });
    });

    describe("#batchMessage()", () => {
        it("Should return from several inputs, using v1", async () => {
            const sdk = newVirtualDevice();

            const results = await sdk.batchMessage(
                [{text: "what is the weather"}, {text:  "what time is it"}, {text: "tell test player to play"}],
            );
            console.log("Output: " + JSON.stringify(results));
            assert.equal(results.length, 3);
            assert.equal(results[2].message, "tell test player to play");
            assert.include(results[2].streamURL as string, "https://feeds.soundcloud.com/stream/");
        });

        it("Should return from several inputs, using v2", async () => {
            // Setting the language code forces V2
            const sdk = new VirtualDevice(process.env.VIRTUAL_DEVICE_TOKEN as string, "en-US");

            const results = await sdk.batchMessage(
                [{text: "what is the weather"}, {text:  "what time is it"}, {text: "tell test player to play"}],
            );
            console.log("Output: " + JSON.stringify(results));
            assert.equal(results.length, 3);
            assert.equal(results[2].message, "tell test player to play");
            assert.include(results[2].streamURL as string, "https://feeds.soundcloud.com/stream/");
        });

        it("Should return from batch with weird characters", async () => {
            // Setting the language code forces V2
            const token = process.env["VIRTUAL_DEVICE_TOKEN.DE-DE"] as string;
            const sdk = new VirtualDevice(token, "de-DE");

            const results = await sdk.batchMessage([{text: "wie spät ist es"}, {text: "Wie ist das Wetter"}]);
            console.log("Output: " + JSON.stringify(results));
            assert.equal(results.length, 2);
            assert.isNotNull(results[1].transcript);
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
            const sdk = newVirtualDevice();
            assert.equal(sdk.normalizeMessage("No"), "alexa No");
        });

        it("Should transform hello to 'alexa hello'", async () => {
            const sdk = newVirtualDevice();
            assert.equal(sdk.normalizeMessage("hello"), "alexa hello");
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
            const sdk = newVirtualDevice();
            const result = await sdk.message("normalize", true);
            assert.equal(result.transcript, "this should be lowercase");
        });
    });
});

function newVirtualDevice() {
    return new VirtualDevice(process.env.VIRTUAL_DEVICE_TOKEN as string);
}
