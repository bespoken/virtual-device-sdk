import {ISilentResult} from "../src/SilentEcho";

export function message(message: string): Promise<ISilentResult> {
    if (message.includes("Hi")) {
        return Promise.resolve({
            card: null,
            sessionTimeout: 0,
            streamURL: null,
            transcript: "welcome to the simple audio player",
            transcriptAudioURL: "https://storage.googleapis.com/raw_audio/",
        });
    }
    if (message.includes("hi")) {
        return Promise.resolve({
            card: null,
            debug: {rawJSON: {messageBody: ""}},
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
            sessionTimeout: 0,
            streamURL: "",
            transcript: "welcome to the simple audio player",
            transcriptAudioURL: "",
        });
    }
    if (message.includes("tell")) {
        return Promise.resolve({
            card: null,
            sessionTimeout: 0,
            streamURL: "https://feeds.soundcloud.com/stream/309340878-user-652822799-episode-010",
            transcript: "",
            transcriptAudioURL: "",
        });
    }
    if (message.includes("pause")) {
        return Promise.resolve({
            card: null,
            sessionTimeout: 0,
            streamURL: "",
            transcript: "",
            transcriptAudioURL: "",
        });
    }
    return Promise.reject(`unexpected message: ${message}`);
};
