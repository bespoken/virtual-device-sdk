import {IVirtualDeviceResult} from "../src/VirtualDevice";

export function message(message: string): Promise<IVirtualDeviceResult> {
    if (message.includes("Hi")) {
        return Promise.resolve({
            card: null,
            message: "Hi",
            sessionTimeout: 0,
            streamURL: null,
            transcript: "welcome to the simple audio player",
            transcriptAudioURL: null,
        });
    }
    if (message.includes("hi")) {
        return Promise.resolve({
            card: null,
            debug: {rawJSON: {messageBody: ""}},
            message: "Hi",
            sessionTimeout: 0,
            streamURL: null,
            transcript: "",
            transcriptAudioURL: "",
        });
    }
    if (message.includes("nonsense")) {
        return Promise.reject("Invalid token for user_id");
    }
    if (message.includes("open")) {
        return Promise.resolve({
            card: null,
            message: "open",
            sessionTimeout: 0,
            streamURL: "",
            transcript: "welcome to the simple audio player to play some audio",
            transcriptAudioURL: "",
        });
    }
    if (message.includes("tell")) {
        return Promise.resolve({
            card: null,
            message: "tell",
            sessionTimeout: 0,
            streamURL: "https://feeds.soundcloud.com/stream/309340878-user-652822799" +
                "-episode-010-building-an-alexa-skill-with-flask-ask-with-john-wheeler.mp3",
            transcript: "",
            transcriptAudioURL: "",
        });
    }
    if (message.includes("pause")) {
        return Promise.resolve({
            card: null,
            message: "pause",
            sessionTimeout: 0,
            streamURL: "",
            transcript: "",
            transcriptAudioURL: "",
        });
    }
    if (message.includes("Alexa, exit")) {
        return Promise.resolve({
            card: null,
            message: "Alexa, exit",
            sessionTimeout: 0,
            streamURL: "",
            transcript: "",
            transcriptAudioURL: "",
        });
    }
    if (message.includes("alexa quit")) {
        return Promise.resolve({
            card: null,
            message: "alexa quit",
            sessionTimeout: 0,
            streamURL: "",
            transcript: "",
            transcriptAudioURL: "",
        });
    }
    return Promise.reject(`unexpected message: ${message}`);
};
