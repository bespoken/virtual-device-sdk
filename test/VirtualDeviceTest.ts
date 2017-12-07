import {assert} from "chai";
import * as dotenv from "dotenv";
import * as nock from "nock";
import * as Sinon from "sinon";
import {IVirtualDeviceResult, VirtualDevice} from "../src/VirtualDevice";
import * as fixtures from "./fixtures";

describe("VirtualDevice", function() {
    this.timeout(60000);
    const BASE_URL = "https://virtual-device.bespoken.io/process";
    let messageStub: any;
    const messageMock = (message: string, debug: boolean = false): Promise<IVirtualDeviceResult> => {
        return fixtures.message(message);
    };

    before(() => {
        dotenv.config();
        if (process.env.ENABLE_MESSAGES_MOCK) {
            messageStub = Sinon.stub(VirtualDevice.prototype, "message").callsFake(messageMock);
        }
    });

    after(() => {
        if (process.env.ENABLE_MESSAGES_MOCK) {
            messageStub.restore();
        }
    });

    describe("#message()", () => {
        it("Should return a transcript", async () => {
            const sdk = new VirtualDevice(process.env.TEST_TOKEN as string);
            sdk.baseURL = BASE_URL;
            const result = await sdk.message("Hi");
            console.log("Output: " + JSON.stringify(result));
            assert.isDefined(result.transcript);
            assert.isDefined(result.transcriptAudioURL);
            assert.isNull(result.transcriptAudioURL);
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
    describe("#normalizeMessage()", () => {
        it("Should transform no to 'alexa no'", async () => {
            const sdk = new VirtualDevice(process.env.TEST_TOKEN as string);
            assert.equal(sdk.normalizeMessage("No"), "alexa no");
        });
    });
    describe("#normalizeTranscript()", () => {
        let nockScope: any;
        before(() => {
            if (process.env.ENABLE_MESSAGES_MOCK) {
                messageStub.restore();
            }
        });
        after(() => {
            if (process.env.ENABLE_MESSAGES_MOCK) {
                messageStub = Sinon.stub(VirtualDevice.prototype, "message").callsFake(messageMock);
            }
        });
        it("lowercase transcript", async () => {
            nockScope = nock("https://virtual-device.bespoken.io")
                .get(/process.*/)
                .reply(200, {transcript: "Test Normalize Transcript"});
            const sdk = new VirtualDevice(process.env.TEST_TOKEN as string);
            sdk.baseURL = BASE_URL;
            const result = await sdk.message("", true);
            assert.equal(result.transcript, "test normalize transcript");
        });
    });
});
