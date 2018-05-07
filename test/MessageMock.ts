// We put the MessageMock in its own class
// This may be enabled all tests, or just for some, so we need some extra safety and logic around it
import * as nock from "nock";
import * as qs from "querystring";
import * as URL from "url";
import {IVirtualDeviceResult} from "../src/VirtualDevice";

export class MessageMock {
    public static enableIfConfigured() {
        if (process.env.ENABLE_MESSAGES_MOCK) {
            MessageMock.enable();
        }
    }

    public static enable() {
        if (!nock.isActive()) {
            nock.activate();
        }

        const baseURL = process.env.VIRTUAL_DEVICE_BASE_URL
            ? process.env.VIRTUAL_DEVICE_BASE_URL
            : "https://virtual-device.bespoken.io";
        // Mock for batch process call
        nock(baseURL)
            .persist()
            .post("/batch_process")
            .query(true)
            .reply(200, function(uri: string, requestBody: any) {
                if (MessageMock.onCallCallback) {
                    MessageMock.onCallCallback(uri, requestBody);
                }
                return processBatchMessages(requestBody);
            });

        // Mock for process call
        nock(baseURL)
            .persist()
            .get("/process")
            .query(true)
            .reply(200, function(uri: string, requestBody: any) {
                if (MessageMock.onCallCallback) {
                    MessageMock.onCallCallback(uri, requestBody);
                }

                const url = URL.parse(uri);
                const params: any = qs.parse(url.query as string);
                return processMessage(params.message, params.phrases);
            });
    }

    /**
     * Add an interceptor to the nock callback for additional testing
     * @param {(uri: string, requestBody: any) => void} callback
     */
    public static onCall(callback?: (uri: string, requestBody: any) => void) {
        MessageMock.onCallCallback = callback;
    }

    public static disable() {
        MessageMock.onCallCallback = undefined;
        // Turn off Nock and remove all interceptors
        nock.cleanAll();
        nock.restore();
    }

    private static onCallCallback?: (uri: string, requestBody: any) => void;

}

function processMessage(message: string, phrases?: string): IVirtualDeviceResult {
    // if (message.includes("nonsense")) {
    //     return Promise.reject("Invalid token for user_id");
    // }

    return messageHandler(message, phrases);
}

function processBatchMessages(payload: any): any {
    const messages = payload.messages;
    const results: IVirtualDeviceResult[] = [];
    for (const message of messages) {
        results.push(messageHandler(message.text));
    }
    return { results };
}

function messageHandler(message: string, phrases?: string): IVirtualDeviceResult {
    if (message.includes("Hi")) {
        return {
            card: null,
            message: "Hi",
            sessionTimeout: 0,
            streamURL: null,
            transcript: "welcome to the simple audio player",
        };
    } else if (message.includes("hi")) {
        return {
            card: {
                imageURL: "https://bespoken.io/wp-content/uploads/Bespoken-Logo-Web-White-e1500590667994.png",
                mainTitle: "Title of the card",
                subTitle: "Simple Player Unit Test",
                textField: "Text content for a standard card",
                type: "BodyTemplate2",
            },
            debug: {rawJSON: {messageBody: ""}},
            message: "Hi",
            sessionTimeout: 0,
            streamURL: null,
            transcript: "",
        };
    } else if (message.includes("what time")) {
        return {
            card: null,
            debug: {rawJSON: {messageBody: ""}},
            message,
            sessionTimeout: 0,
            streamURL: null,
            transcript: "the time is 12:40 pm",
        };
    } else if (message.includes("wie spät ist es")) {
        return {
            card: null,
            debug: {rawJSON: {messageBody: ""}},
            message,
            sessionTimeout: 0,
            streamURL: null,
            transcript: "es ist Mittag",
        };
    } else if (message.includes("phrases")) {
        return {
            card: null,
            debug: {rawJSON: {messageBody: ""}},
            message,
            sessionTimeout: 0,
            streamURL: null,
            transcript: phrases as string,
        };
    } else if (message.includes("what is the weather")) {
        return {
            card: null,
            debug: {rawJSON: {messageBody: ""}},
            message,
            sessionTimeout: 0,
            streamURL: null,
            transcript: "the weather is nice",
        };
    } else if (message.includes("Wie ist das Wetter")) {
        return {
            card: null,
            debug: {rawJSON: {messageBody: ""}},
            message,
            sessionTimeout: 0,
            streamURL: null,
            transcript: "das Wetter ist schön",
        };
    } else if (message.includes("special characters")) {
        return {
            card: {
                imageURL: "https://bespoken.io/wp-content/uploads/Bespoken-Logo-Web-White-e1500590667994.png",
                mainTitle: "Title of the card",
                subTitle: "Simple Player Unit Test",
                textField: "Text content for a standard card",
                type: "BodyTemplate2",
            },
            message,
            sessionTimeout: 0,
            streamURL: "",
            transcript: "welcome ^ to $ weird wildcard + characters?",
        };
    }else if (message.includes("open")) {
        return {
            card: {
                imageURL: "https://bespoken.io/wp-content/uploads/Bespoken-Logo-Web-White-e1500590667994.png",
                mainTitle: "Title of the card",
                subTitle: "Simple Player Unit Test",
                textField: "Text content for a standard card",
                type: "BodyTemplate2",
            },
            message,
            sessionTimeout: 0,
            streamURL: "",
            transcript: "welcome to the simple audio player to play some audio",
        };
    } else if (message.includes("tell")) {
        return {
            card: null,
            message,
            sessionTimeout: 0,
            streamURL: "https://feeds.soundcloud.com/stream/309340878-user-652822799" +
            "-episode-010-building-an-alexa-skill-with-flask-ask-with-john-wheeler.mp3",
            transcript: "",
        };
    } else if (message.includes("pause")) {
        return {
            card: null,
            message,
            sessionTimeout: 0,
            streamURL: "",
            transcript: "",
        };
    } else if (message.includes("Alexa, exit")) {
        return {
            card: null,
            message,
            sessionTimeout: 0,
            streamURL: "",
            transcript: "",
        };
    } else if (message.includes("alexa stopp")) {
        return {
            card: null,
            message,
            sessionTimeout: 0,
            streamURL: "",
            transcript: "",
        };
    } else if (message.includes("alexa quit")) {
        return {
            card: null,
            message,
            sessionTimeout: 0,
            streamURL: "",
            transcript: "",
        };
    } else if (message.includes("normalize")) {
        return {
            card: null,
            message,
            sessionTimeout: 0,
            streamURL: "",
            transcript: "This Should Be Lowercase",
        };
    } else if (message.includes("hallo welt")) {
        return {
            card: null,
            message,
            sessionTimeout: 0,
            streamURL: "",
            transcript: "hallo welt",
        };
    }

    throw new Error("No match for message: " + message + " in mock.");
}
