import {assert} from "chai";
import * as dotenv from "dotenv";
import * as URL from "url";
import {IMessage, IVirtualDeviceConfiguration, IVirtualDeviceResponse, VirtualDevice} from "../src/VirtualDevice";
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

        it("Should work with proxy", async () => {
            process.env.HTTPS_PROXY = "http://my-proxy.com:8081";
            const sdk = newVirtualDevice();
            const results = await sdk.message("what time is it");
            assert.isDefined(results);
            process.env.HTTPS_PROXY = "";
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
            const token = process.env.VIRTUAL_DEVICE_TOKEN as string;
            const sdk = new VirtualDevice(token, "de-DE");
            const result = await sdk.message("wie spät ist es", true);
            console.log("Output: " + JSON.stringify(result));
            assert.isDefined(result.transcript);
        });
        // TODO: revert skips after finish some test with virtual device dev
        it.skip("Should return a transcript when message has specials characters", async () => {
            const sdk = newVirtualDevice();
            const results = await sdk.message("what is rock & roll", false, ["rock & roll", "rock & roll"]);
            assert.isDefined(results);
            assert.equal(results.message, "what is rock & roll");
        });

        it.skip("Should return a transcript when newConversation is active", async () => {
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

        it("Should add client and screen mode on message", (done) => {
            MessageMock.enable();
            const configuration: IVirtualDeviceConfiguration = {
                client: "monitoring",
                screenMode: "OFF",
                token: "myToken",
            };
            const sdk = new VirtualDevice(configuration);
            MessageMock.onCall((uri) => {
                assert.include(uri, "user_id=myToken");
                assert.include(uri, "screen_mode=OFF");
                assert.include(uri, "client=monitoring");
            });
            sdk.message("hi", true).then(() => {
                MessageMock.disable();
                done();
            });
        });

        it("Should add client and screen mode on batch message", (done) => {
            MessageMock.enable();
            const configuration: IVirtualDeviceConfiguration = {
                client: "monitoring",
                screenMode: "OFF",
                token: "myToken",
            };
            const sdk = new VirtualDevice(configuration);
            MessageMock.onCall((uri) => {
                assert.include(uri, "user_id=myToken");
                assert.include(uri, "screen_mode=OFF");
                assert.include(uri, "client=monitoring");
            });
            sdk.batchMessage([{text: "hi"}], true).then(() => {
                MessageMock.disable();
                done();
            });
        });

        it("Should add project id on message", (done) => {
            MessageMock.enable();
            const configuration: IVirtualDeviceConfiguration = {
                projectId: "dummyProjectId",
                token: "myToken",
            };
            const sdk = new VirtualDevice(configuration);
            MessageMock.onCall((uri) => {
                assert.include(uri, "project_id=dummyProjectId");
            });
            sdk.message("hi", true).then(() => {
                MessageMock.disable();
                done();
            });
        });

        it("Should add project id on batch message", (done) => {
            MessageMock.enable();
            const configuration: IVirtualDeviceConfiguration = {
                projectId: "dummyProjectId",
                token: "myToken",
            };
            const sdk = new VirtualDevice(configuration);
            MessageMock.onCall((uri) => {
                assert.include(uri, "project_id=dummyProjectId");
            });
            sdk.batchMessage([{text: "hi"}], true).then(() => {
                MessageMock.disable();
                done();
            });
        });

        it("Should add phoneNumber id on batch message", (done) => {
            MessageMock.enable();
            const configuration: IVirtualDeviceConfiguration = {
                another: "dfdf",
                another_one: "dfdf",
                phoneNumber: "myNumber",
                token: "myToken",
            };
            const sdk = new VirtualDevice(configuration);
            MessageMock.onCall((uri) => {
                assert.include(uri, "phone_number=myNumber");
            });
            sdk.batchMessage([{text: "hi"}], true).then(() => {
                MessageMock.disable();
                done();
            });
        });

        it("Should add additional parameters on message", (done) => {
            MessageMock.enable();
            const configuration: IVirtualDeviceConfiguration = {
                another: "value1",
                another_false_value: false,
                another_one: "value2",
                another_true_value: true,
                array_value: ["value1", "value2", "value3"],
                token: "myToken",
            };
            const sdk = new VirtualDevice(configuration);
            MessageMock.onCall((uri) => {
                assert.include(uri, "user_id=myToken");
                assert.include(uri, "another=value1");
                assert.include(uri, "another_one=value2");
                assert.include(uri, "another_true_value=true");
                assert.include(uri, "another_false_value=false");
                assert.include(uri, "array_value=value1&array_value=value2&array_value=value3");
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
            const token = process.env.VIRTUAL_DEVICE_TOKEN as string;
            const sdk = new VirtualDevice(token, "de-DE");
            const result = await sdk.message("phrases", false, ["phrases being passed"]);
            console.log("Output: " + JSON.stringify(result));
            assert.equal(result.transcript, "phrases%20being%20passed");
        });
    });

    describe("#batchMessage()", () => {
        it("Should return from several inputs, using v1", async () => {
            const sdk = newVirtualDevice();

            const response = await sdk.batchMessage(
                [{text: "what is the weather"}, {text:  "what time is it"}, {text: "tell test player to play"}],
            );
            const results = response.results;
            console.log("Output: " + JSON.stringify(results));
            assert.equal(results.length, 3);
            assert.equal(results[2].message, "tell test player to play");
            assert.include(results[2].streamURL as string, "https://feeds.soundcloud.com/stream/");
        });

        it("Should return from several inputs, using v2", async () => {
            // Setting the language code forces V2
            const sdk = new VirtualDevice(process.env.VIRTUAL_DEVICE_TOKEN as string, "en-US");

            const response = await sdk.batchMessage(
                [{text: "what is the weather"}, {text:  "what time is it"}, {text: "tell test player to play"}],
            );
            const results = response.results;
            console.log("Output: " + JSON.stringify(results));
            assert.equal(results.length, 3);
            assert.equal(results[2].message, "tell test player to play");
            assert.include(results[2].streamURL as string, "https://feeds.soundcloud.com/stream/");
        });

        it("Should return from batch with weird characters", async () => {
            // Setting the language code forces V2
            const token = process.env["VIRTUAL_DEVICE_TOKEN.DE-DE"] as string;
            const sdk = new VirtualDevice(token, "de-DE");

            const response = await sdk.batchMessage([{text: "wie spät ist es"}, {text: "Wie ist das Wetter"}]);
            const results = response.results;
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

        it("Should use a filter if added", async () => {
            MessageMock.enable();
            const sdk = new VirtualDevice("token");
            MessageMock.onCall((uri, body) => {
                assert.deepEqual(body, { messages: [{text: "what time is it"}] });
            });
            sdk.addFilter((request) => {
                request.messages[0].text = "what time is it";
            });
            await sdk.batchMessage([{text: "hi"}]);
            MessageMock.disable();
        });

        it("Should use multiple filters if added", async () => {
            MessageMock.enable();
            const sdk = new VirtualDevice("token");
            MessageMock.onCall((uri, body) => {
                assert.deepEqual(body, { messages: [{text: "what time is it"}, {text: "hi"}] });
            });
            sdk.addFilter((request) => {
                request.messages[0].text = "what time is it";
            });

            sdk.addFilter((request) => {
                request.messages.push({ text: "hi" });
            });

            await sdk.batchMessage([{text: "hello"}]);
            MessageMock.disable();
        });

        it("Should keep the same payload if filter function fails", async () => {
            MessageMock.enable();
            const sdk = new VirtualDevice("token");
            MessageMock.onCall((uri, body) => {
                assert.deepEqual(body, { messages: [{text: "hi"}] });
            });
            sdk.addFilter((request) => {
                throw new Error("We want the filter to fail");
            });
            await sdk.batchMessage([{text: "hi"}]);
            MessageMock.disable();
        });

        it("Should disable filters as expected", async () => {
            MessageMock.enable();
            const sdk = new VirtualDevice("token");
            MessageMock.onCall((uri, body) => {
                assert.deepEqual(body, { messages: [{text: "hi"}] });
            });
            sdk.addFilter((request) => {
                throw new Error("We want the filter to fail");
            });
            sdk.clearFilters();
            await sdk.batchMessage([{text: "hi"}]);
            MessageMock.disable();
        });

        it("Should add additional parameters on batch message", (done) => {
            MessageMock.enable();
            const configuration: IVirtualDeviceConfiguration = {
                another: "value1",
                another_false_value: false,
                another_one: "value2",
                another_true_value: true,
                array_value: ["value1", "value2", "value3"],
                token: "myToken",
            };
            const sdk = new VirtualDevice(configuration);
            MessageMock.onCall((uri) => {
                console.log(uri);
                assert.include(uri, "user_id=myToken");
                assert.include(uri, "another=value1");
                assert.include(uri, "another_one=value2");
                assert.include(uri, "another_true_value=true");
                assert.include(uri, "another_false_value=false");
                assert.include(uri, "array_value=value1&array_value=value2&array_value=value3");
            });
            sdk.batchMessage([{text: "hi"}], true).then(() => {
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
            const response = await sdk.batchMessage([{text: "homophone"}, {text:  "homophone"}]);
            const result = response.results;
            console.log("Output: " + JSON.stringify(result));
            assert.equal(result[0].transcript, "the test tools are good to test with");
            assert.equal((result[0].debug as any).rawTranscript, "the teds tools are good too tess with");
            assert.equal(result[1].transcript, "the test tools are good to test with");
            assert.equal((result[1].debug as any).rawTranscript, "the teds tools are good too tess with");
        });

        it("Should apply homophones on batch message call with non ASCI characters", async () => {
            const sdk = new VirtualDevice("DUMMY_TOKEN", "pt-BR");
            sdk.addHomophones("Oi Ter você", ["Oi tem você"]);
            const response = await sdk.batchMessage([{text: "olá"}]);
            const result = response.results;
            console.log("Output: " + JSON.stringify(result));
            assert.equal(result[0].transcript, "Oi Ter você pra mim");
            assert.equal((result[0].debug as any).rawTranscript, "Oi tem você pra mim");
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
            const configuration: IVirtualDeviceConfiguration = {
                asyncMode: true,
                locale: "de-DE",
                token: "DUMMY_TOKEN",
                voiceID: "DUMMY_VOICE",
            };
            const sdk = new VirtualDevice(configuration);

            const results = await sdk.batchMessage([{text: "wie spät ist es"}, {text: "Wie ist das Wetter"}]);
            assert.equal(results.conversation_id, "generated-uuid");
        });
    });

    describe("Async batch process with provided id", () => {
        before(() => {
            MessageMock.enable();
        });

        it("return conversation uuid", async () => {
            const configuration: IVirtualDeviceConfiguration = {
                asyncMode: true,
                conversationId: "my-own-uuid",
                locale: "de-DE",
                token: "DUMMY_TOKEN",
                voiceID: "DUMMY_VOICE",
            };
            const sdk = new VirtualDevice(configuration);

            const results = await sdk.batchMessage([{text: "wie spät ist es"}, {text: "Wie ist das Wetter"}]);
            assert.equal(results.conversation_id, sdk.configuration.conversationId);
        });
    });

    describe("get conversation uuid", () => {
        before(() => {
            MessageMock.enable();
        });

        it("Should return from several inputs, using conversation uuid", async () => {
            const sdk = new VirtualDevice("DUMMY_TOKEN", "de-DE", "DUMMY_VOICE", undefined, true);

            const response: IVirtualDeviceResponse = await sdk.getConversationResults("generated-uuid");
            const results = response.results;
            const status = response.status;

            console.log("Output: " + JSON.stringify(response));
            assert.equal(status, "COMPLETED");
            assert.equal(results.length, 2);
            assert.equal(results[1].message, "tell test player to play");
            assert.include(results[1].streamURL as string, "https://feeds.soundcloud.com/stream/");
        });

        it("Should retry 3 times on timeouts from the server", async () => {
            process.env.VDSDK_TIMEOUT = "50";
            process.env.VDSDK_MIN_RETRY_TIMEOUT = "50";
            process.env.VDSDK_MAX_RETRY_TIMEOUT = "60";

            const sdk = new VirtualDevice("DUMMY_TOKEN", "de-DE", "DUMMY_VOICE", undefined, true);

            let callNumbers = 0;
            MessageMock.onRequest(() => {
                callNumbers++;
            });

            try {
                await sdk.getConversationResults("delay");
                assert.equal(true, false);
            } catch (error) {
                assert.equal(true, true);
            }
            assert.equal(callNumbers, 3);
            process.env.VDSDK_TIMEOUT = "";
            process.env.VDSDK_MIN_RETRY_TIMEOUT = "";
            process.env.VDSDK_MAX_RETRY_TIMEOUT = "";
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

        it.skip("Should throw an error if conversation result brings back an error", async () => {
            const sdk = new VirtualDevice("DUMMY_TOKEN", "de-DE", "DUMMY_VOICE", undefined, true);
            const errorMessage =  "The locale es-US is invalid. For alexa, please pick a locale from here: " +
                "https://developer.amazon.com/docs/custom-skills/" +
                "develop-skills-in-multiple-languages.html#h2-code-changes";

            try {
                await sdk.getConversationResults("error-uuid");
                assert(false, "Should have trigger an exception");
            } catch (e) {
                assert.equal(e.error, errorMessage);
                assert.equal(e.error_category, "user");

            }
        });

        describe("stop conversation", () => {
            beforeEach(() => {
                MessageMock.enable();
            });

            afterEach(() => {
                MessageMock.disable();
            });

            it("send conversation id", async () => {
                const sdk = new VirtualDevice("DUMMY_TOKEN", "de-DE", "DUMMY_VOICE", undefined, true);

                MessageMock.onCall((uri: string, requestBody: any) => {
                    assert.equal(requestBody.uuid, "generated-uuid");
                });

                await sdk.stopConversation("generated-uuid");
            });

            it("send wrong conversation id, getting error", async () => {
                const sdk = new VirtualDevice("DUMMY_TOKEN", "de-DE", "DUMMY_VOICE", undefined, true);
                try {
                    await sdk.stopConversation("wrong-uuid");
                    assert.equal(true, false, "not gettting exception");
                } catch (error) {
                    assert.equal(true, true, "got exception");
                    assert.equal(error, "{\"error\":\"custom error\"}");
                }
            });
        });

    });

    describe("batchMessage with audio", async () => {
        before(() => {
            MessageMock.disable();
        });

        it("Should return response when using local audios", async () => {
            const sdk = new VirtualDevice(process.env.VIRTUAL_DEVICE_TOKEN as string, "en-US");

            const messages: IMessage[] = [
                {
                    audio: {
                        audioPath: "test/resources/open_guess_the_price_EN_US.raw",
                        channels: 1,
                        frameRate: 16000,
                        sampleWidth: 2,
                    },
                }, {
                    audio: {
                        audioPath: "test/resources/one_EN_US.raw",
                    },
                }, {
                    text: "charles",
                }, {
                    audio: {
                        audioPath: "test/resources/one_hundred_dollars_EN_US.raw",
                    },
                }, {
                    audio: {
                        audioPath: "test/resources/one_hundred_dollars_EN_US.raw",
                    },
                }, {
                    audio: {
                        audioPath: "test/resources/one_hundred_dollars_EN_US.raw",
                    },
                },
            ];
            const response = await sdk.batchMessage(messages);
            const results = response.results;
            assert.equal(results.length, 6);
            assert.equal(results[0].message, "[audio]");
            assert.include(results[0].transcript.toLowerCase(), "welcome to guess the price");
            assert.include(results[1].transcript.toLowerCase(), "great please tell us your name");
            assert.include(results[2].transcript.toLowerCase(), "okay let's start the game");
            assert.include(results[3].transcript.toLowerCase(), "you said 100 the actual price");
            assert.include(results[4].transcript.toLowerCase(), "you said 100 the actual price");
            assert.include(results[5].transcript.toLowerCase(), "game ended");
        });

        it("Should return response when using audios from urls", async () => {
            const sdk = new VirtualDevice(process.env.VIRTUAL_DEVICE_TOKEN as string, "en-US");

            const messages: IMessage[] = [
                {
                    audio: {
                        audioURL:
                            "https://s3.amazonaws.com/bespoken-encoder-test/public/open_guess_the_price_EN_US.raw",
                    },
                }, {
                    audio: {
                        audioURL: "https://s3.amazonaws.com/bespoken-encoder-test/public/one_EN_US.raw?query=value",
                    },
                }, {
                    text: "Charles",
                }, {
                    audio: {
                        audioURL: "https://s3.amazonaws.com/bespoken-encoder-test/public/one_hundred_dollars_EN_US.raw",
                    },
                }, {
                    audio: {
                        audioURL: "https://s3.amazonaws.com/bespoken-encoder-test/public/one_hundred_dollars_EN_US.raw",
                    },
                }, {
                    audio: {
                        audioURL: "https://s3.amazonaws.com/bespoken-encoder-test/public/one_hundred_dollars_EN_US.raw",
                    },
                },
            ];
            const response = await sdk.batchMessage(messages);
            const results = response.results;
            assert.equal(results.length, 6);
            assert.equal(results[0].message, "[audio]");
            assert.include(results[0].transcript.toLowerCase(), "welcome to guess the price");
            assert.include(results[1].transcript.toLowerCase(), "great please tell us your name");
            assert.include(results[2].transcript.toLowerCase(), "okay let's start the game");
            assert.include(results[3].transcript.toLowerCase(), "you said 100 the actual price was");
            assert.include(results[4].transcript.toLowerCase(), "you said 100 the actual price was");
            assert.include(results[5].transcript.toLowerCase(), "game ended");
        });

        it("Should return error when using audios from invalid urls", async () => {
            const sdk = new VirtualDevice(process.env.VIRTUAL_DEVICE_TOKEN as string, "en-US");

            const messages: IMessage[] = [
                {
                    audio: {
                        audioURL: "https://wrong",
                    },
                },
            ];

            const errorMessage = "ENOTFOUND";
            try {
                await sdk.batchMessage(messages);
                assert(false, "Should have trigger an exception");
            } catch (e) {
                assert.include(e, errorMessage);
            }
        });

        it("Should return error when using empty audios", async () => {
            const sdk = new VirtualDevice(process.env.VIRTUAL_DEVICE_TOKEN as string, "en-US");

            const messages: IMessage[] = [
                {
                    audio: {},
                },
            ];

            const errorMessage = "either audioPath or audioURL should be set.";
            try {
                await sdk.batchMessage(messages);
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
