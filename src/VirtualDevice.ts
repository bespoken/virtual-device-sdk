import { IncomingMessage } from "http";
import * as https from "https";
import * as URL from "url";

export class VirtualDevice {
    public baseURL: string;
    public constructor(public token: string, public locale?: string, public voiceID?: string) {
        this.baseURL = process.env.VIRTUAL_DEVICE_BASE_URL
            ? process.env.VIRTUAL_DEVICE_BASE_URL
            : "https://virtual-device.bespoken.io";

    }

    public normalizeMessage(message: string): string {
        // If there is just one word, prefix it with alexa
        if (message.trim().split(" ").length === 1) {
            message = "alexa " + message;
        }

        return message;

    }

    public message(message: string, debug?: boolean, phrases?: string[]): Promise<IVirtualDeviceResult> {
        message = this.normalizeMessage(message);

        let url = this.baseURL + "/process"
            + "?message=" + message
            + "&user_id=" + this.token;

        if (phrases) {
            for (const phrase of phrases) {
                url += "&phrases=" + phrase;
            }
        }

        if (debug) {
            url += "&debug=true";
        }

        if (this.locale) {
            url += "&language_code=" + this.locale;
        }

        if (this.voiceID) {
            url += "&voice_id=" + this.voiceID;
        }

        url = encodeURI(url);
        return new Promise<IVirtualDeviceResult>((resolve, reject) => {
            const callback = (response: IncomingMessage) => {
                let data = "";

                response.on("data", (chunk) => {
                    data += chunk;
                });

                response.on("end", () => {
                    if (response.statusCode === 200) {
                        const result: IVirtualDeviceResult = JSON.parse(data);
                        result.transcript = this.normalizeTranscript(result.transcript);
                        result.message = message;
                        resolve(result);
                    } else {
                        reject(data);
                    }
                });
            };

            const request = https.get(url as any, callback);
            request.on("error", function(error: string) {
                reject(error);
            });

            request.end();
        });
    }

    public batchMessage(messages: IMessage[], debug?: boolean): Promise<IVirtualDeviceResult[]> {
        for (const message of messages) {
            message.text = this.normalizeMessage(message.text);
        }

        let path = "/batch_process?user_id=" + this.token;

        if (debug) {
            path += "&debug=true";
        }

        if (this.locale) {
            path += "&language_code=" + this.locale;
        }

        if (this.voiceID) {
            path += "&voice_id=" + this.voiceID;
        }

        const url = URL.parse(this.baseURL);
        return new Promise<IVirtualDeviceResult[]>((resolve, reject) => {
            const callback = (response: IncomingMessage) => {
                let data = "";

                response.on("data", (chunk) => {
                    data += chunk;
                });

                response.on("end", () => {
                    if (response.statusCode === 200) {
                        resolve(this.handleBatchResponse(data as string));
                    } else {
                        reject(data);
                    }
                });
            };

            const input = {
                messages,
            };
            const inputString = JSON.stringify(input);
            const requestOptions = {
                headers: {
                    "Content-Length": new Buffer(inputString).length,
                    "Content-Type": "application/json",
                },
                host: url.hostname,
                method: "POST",
                path,
                port: 443,
            };

            const request = https.request(requestOptions, callback);
            request.on("error", function(error: string) {
                reject(error);
            });

            request.write(inputString);
            request.end();
        });
    }

    public async waitForSessionToEnd() {
        const ms: number = process.env.SESSION_IDLE_MS
            ? parseInt(process.env.SESSION_IDLE_MS, 10)
            : 8000;
        return new Promise((resolve) => setTimeout(resolve, ms));
    }

    private handleBatchResponse(data: string): IVirtualDeviceResult[] {
        const json = JSON.parse(data);
        const results = [];
        for (const result of json.results) {
            result.transcript = this.normalizeTranscript(result.transcript);
            results.push(result);
        }
        return results;
    }

    private normalizeTranscript(transcript: string | null): string | null {
        if (!transcript) {
            return null;
        }
        return transcript.toLowerCase();
    }
}

export interface IVirtualDeviceResult {
    card: ICard | null;
    debug?: {
        rawJSON: any;
    };
    sessionTimeout: number;
    streamURL: string | null;
    transcript: string | null;
    // message is the message used for this result.
    message: string;
}

export interface ICard {
    imageURL: string | null;
    mainTitle: string | null;
    subTitle: string | null;
    textField: string | null;
    type: string;
}

export interface IMessage {
    text: string;
    phrases?: string[];
}
