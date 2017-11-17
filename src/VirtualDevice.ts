import {IncomingMessage} from "http";
import * as https from "https";

export class VirtualDevice {
    public baseURL: string;
    public constructor(public token: string) {
        this.baseURL = "https://virtual-device.bespoken.io/process";
    }

    public normalizeMessage(message: string): string {
        if (message.trim().toLowerCase() === "no") {
            return "alexa no";
        }
        return message;

    }

    public message(message: string, debug?: boolean): Promise<IVirtualDeviceResult> {
        message = this.normalizeMessage(message);

        let url = this.baseURL + "?message=" + message + "&user_id=" + this.token;

        if (debug) {
            url += "&debug=true";
        }

        const promise = new Promise<IVirtualDeviceResult>((resolve, reject) => {
            const callback = (response: IncomingMessage) => {
                let data = "";

                response.on("data", (chunk) => {
                    data += chunk;
                });

                response.on("end", () => {
                    if (response.statusCode === 200) {
                        const result: IVirtualDeviceResult = JSON.parse(data);
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

        return promise;
    }
}

export interface IVirtualDeviceResult {
    card: ICard | null;
    debug?: {
        rawJSON: any;
    };
    sessionTimeout: number;
    streamURL: string | null;
    transcript: string;
    transcriptAudioURL: string | null;
}

export interface ICard {
    imageURL: string | null;
    mainTitle: string | null;
    subTitle: string | null;
    textField: string;
    type: string;
}
