import {assert} from "chai";
import * as dotenv from "dotenv";
import * as URL from "url";
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
            const result = await sdk.message("open test player and play");
            console.log("Output: " + JSON.stringify(result));
            assert.isDefined(result.streamURL);
            assert.isTrue((result.streamURL as any).startsWith(
                "https://feeds.soundcloud.com/stream/309340878-user-652822799-episode-010"));
        });

        xit("Should have debug info", async () => {
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

        it("Should return a transcript when message has specials characters", async () => {
            const sdk = newVirtualDevice();
            const results = await sdk.message("what is rock & roll", false, ["rock & roll", "rock & roll"]);
            assert.isDefined(results);
            assert.equal(results.message, "what is rock & roll");
        });

        it("Should return a transcript when newConversation is active", async () => {
            const sdk = newVirtualDevice();
            const results = await sdk.message("what is rock & roll", undefined, undefined, true);
            assert.isDefined(results);
        });

        it("Should add stt and location paramenters", (done) => {
            MessageMock.enable();
            const sdk = new VirtualDevice("token", "de-DE", undefined, undefined, undefined, "google", "10", "11");
            MessageMock.onCall((uri) => {
                assert.include(uri, "stt=google");
                assert.include(uri, "location_lat=10");
                assert.include(uri, "location_long=11");
            });
            sdk.message("hi", true).then(() => {
                MessageMock.disable();
                done();
            });
        });
    });

    describe("#message() with phrases", () => {
        before(() => {
            MessageMock.enable();
        });

        it("Should handle phrases correctly", async () => {
            const token = process.env["VIRTUAL_DEVICE_TOKEN.DE-DE"] as string;
            const sdk = new VirtualDevice(token, "de-DE");
            const result = await sdk.message("phrases", false, ["phrases being passed"]);
            console.log("Output: " + JSON.stringify(result));
            assert.equal(result.transcript, "phrases%20being%20passed");
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

        it("Should add stt and location paramenters", (done) => {
            MessageMock.enable();
            const sdk = new VirtualDevice("token", "de-DE", undefined, undefined, undefined, "google", "10", "11");
            MessageMock.onCall((uri) => {
                assert.include(uri, "stt=google");
                assert.include(uri, "location_lat=10");
                assert.include(uri, "location_long=11");
            });
            sdk.batchMessage([{text: "hi"}]).then(() => {
                MessageMock.disable();
                done();
            });

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
    });

    describe("homophone tests", () => {
        before(() => {
            MessageMock.enable();
        });

        it("Should apply homophones on message call", async () => {
            const sdk = new VirtualDevice("DUMMY_TOKEN", "de-DE");
            sdk.addHomophones("test", ["tess", "teds"]);
            sdk.addHomophones("to", ["too"]);
            sdk.addHomophones("are_really_good", ["are good"]);
            sdk.addHomophones("a lot with", ["with"]);
            const result = await sdk.message("homophone", false, ["phrases being passed"]);
            console.log("Output: " + JSON.stringify(result));
            assert.equal(result.transcript, "the test tools are really good to test a lot with");
            assert.equal((result.debug as any).rawTranscript, "the teds tools are good too tess with");
        });

        it("Should apply homophones on batch message call", async () => {
            const sdk = new VirtualDevice("DUMMY_TOKEN", "de-DE");
            sdk.addHomophones("test", ["tess", "teds"]);
            sdk.addHomophones("to", ["too"]);
            const result = await sdk.batchMessage([{text: "homophone"}, {text:  "homophone"}]);
            console.log("Output: " + JSON.stringify(result));
            assert.equal(result[0].transcript, "the test tools are good to test with");
            assert.equal((result[0].debug as any).rawTranscript, "the teds tools are good too tess with");
            assert.equal(result[1].transcript, "the test tools are good to test with");
            assert.equal((result[1].debug as any).rawTranscript, "the teds tools are good too tess with");
        });
    });

    describe("httpInterface and httpInterfacePort", () => {
        it("return valid interface and port", async () => {
            const sdk = new VirtualDevice("DUMMY_TOKEN", "de-DE", "DUMMY_VOICE");

            let url = URL.parse("http://localhost:3000");
            let port = sdk.httpInterfacePort(url);
            let httpInterface = sdk.httpInterface(url);
            assert.equal(port, 3000);
            assert.isDefined(httpInterface.METHODS);

            url = URL.parse("https://virtual-device.bespoken.io");
            port = sdk.httpInterfacePort(url);
            assert.equal(port, 443);
            httpInterface = sdk.httpInterface(url);
            assert.isUndefined(httpInterface.METHODS);

            url = URL.parse("http://virtual-device.bespoken.io");
            port = sdk.httpInterfacePort(url);
            assert.equal(port, 80);
        });
    });

    describe("Async batch process", () => {
        before(() => {
            MessageMock.enable();
        });

        it("return conversation uuid", async () => {
            const sdk = new VirtualDevice("DUMMY_TOKEN", "de-DE", "DUMMY_VOICE", undefined, true);

            const results = await sdk.batchMessage([{text: "wie spät ist es"}, {text: "Wie ist das Wetter"}]);
            assert.equal(results.conversation_id, "generated-uuid");
        });
    });

    describe("get conversation uuid", () => {
        before(() => {
            MessageMock.enable();
        });

        it("Should return from several inputs, using conversation uuid", async () => {
            const sdk = new VirtualDevice("DUMMY_TOKEN", "de-DE", "DUMMY_VOICE", undefined, true);

            const results = await sdk.getConversationResults("generated-uuid");

            console.log("Output: " + JSON.stringify(results));
            assert.equal(results.length, 2);
            assert.equal(results[1].message, "tell test player to play");
            assert.include(results[1].streamURL as string, "https://feeds.soundcloud.com/stream/");
        });

        it("Should throw exception if not using async mode", async () => {
            const sdk = new VirtualDevice("DUMMY_TOKEN", "de-DE", "DUMMY_VOICE", undefined);

            try {
                await sdk.getConversationResults("generated-uuid");
                assert(false, "Should have trigger an exception");
            } catch (e) {
                assert.equal(e.message, "Conversation Results only available in async mode");
            }
        });

        it("Should throw an error if conversation result brings back an error", async () => {
            const sdk = new VirtualDevice("DUMMY_TOKEN", "de-DE", "DUMMY_VOICE", undefined, true);
            const errorMessage =  "The locale es-US is invalid. For alexa, please pick a locale from here: " +
                "https://developer.amazon.com/docs/custom-skills/" +
                "develop-skills-in-multiple-languages.html#h2-code-changes";

            try {
                await sdk.getConversationResults("error-uuid");
                assert(false, "Should have trigger an exception");
            } catch (e) {
                assert.equal(e.message, errorMessage);
            }
        });

    });
});

function newVirtualDevice() {
    return new VirtualDevice(process.env.VIRTUAL_DEVICE_TOKEN as string);
}
