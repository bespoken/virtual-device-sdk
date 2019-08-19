import * as fs from "fs";
import { IncomingMessage } from "http";
import * as http from "http";
import * as https from "https";
import * as pathModule from "path";
import * as URL from "url";

export interface IVirtualDeviceConfiguration {
    token: string;
    locale?: string;
    voiceID?: string;
    skipSTT?: boolean;
    asyncMode?: boolean;
    stt?: string;
    locationLat?: string;
    locationLong?: string;
    conversationId?: string;
    screenMode?: string;
    client?: string;
    projectId?: string;
    phoneNumber?: string;
}

export class VirtualDevice {
    public baseURL: string;
    public token: string;
    public homophones: {[id: string]: string[]} = {};
    public phoneNumber?: string;

    public constructor( public arg0: string | IVirtualDeviceConfiguration,
                        public locale?: string,
                        public voiceID?: string,
                        public skipSTT?: boolean,
                        public asyncMode?: boolean,
                        public stt?: string,
                        public locationLat?: string,
                        public locationLong?: string,
                        public conversationId?: string,
                        public screenMode?: string,
                        public client?: string,
                        public projectId?: string,
                        ) {
        this.baseURL = process.env.VIRTUAL_DEVICE_BASE_URL
            ? process.env.VIRTUAL_DEVICE_BASE_URL
            : "https://virtual-device.bespoken.io";

        if (arg0 === Object(arg0)) {
            const configuration = arg0 as IVirtualDeviceConfiguration;
            this.token = configuration.token;
            this.locale = configuration.locale;
            this.voiceID = configuration.voiceID;
            this.skipSTT = configuration.skipSTT;
            this.asyncMode = configuration.asyncMode;
            this.stt = configuration.stt;
            this.locationLat = configuration.locationLat;
            this.locationLong = configuration.locationLong;
            this.conversationId = configuration.conversationId;
            this.screenMode = configuration.screenMode;
            this.client = configuration.client;
            this.projectId = configuration.projectId;
            this.phoneNumber = configuration.phoneNumber;
        } else {
            this.token = arg0 as string;
        }
    }

    public addHomophones(word: string, homophones: string[]) {
        homophones = homophones.map((s) => s.trim());
        this.homophones[word] = homophones;
    }

    public httpInterface(url: any): any {
        if (url.protocol === "https:") {
            return https;
        } else {
            return http;
        }
    }

    public httpInterfacePort(url: any): any {
        if (url.port) {
            return url.port;
        }
        if (url.protocol === "https:") {
            return 443;
        } else {
            return 80;
        }
    }

    public message(message: string, debug?: boolean,
                   phrases?: string[], newConversation?: boolean): Promise<IVirtualDeviceResult> {
        const encodedMessage = encodeURIComponent(message);
        let url = this.baseURL + "/process"
            + "?message=" + encodedMessage
            + "&user_id=" + this.token;

        if (phrases) {
            for (const phrase of phrases) {
                url += "&phrases=" + encodeURIComponent(phrase);
            }
        }

        if (debug) {
            url += "&debug=true";
        }

        if (newConversation) {
            url += "&new_conversation=true";
        }

        if (this.locale) {
            url += "&language_code=" + this.locale;
        }

        if (this.voiceID) {
            url += "&voice_id=" + this.voiceID;
        }

        if (this.skipSTT) {
            url += "&skip_stt=true";
        }

        if (this.stt) {
            url += "&stt=" + this.stt;
        }

        if (this.locationLat) {
            url += "&location_lat=" + this.locationLat;
        }

        if (this.locationLong) {
            url += "&location_long=" + this.locationLong;
        }

        if (this.screenMode) {
            url += "&screen_mode=" + this.screenMode;
        }

        if (this.client) {
            url += "&client=" + this.client;
        }

        if (this.projectId) {
            url += "&project_id=" + this.projectId;
        }

        url = encodeURI(url);
        const urlParsed = URL.parse(this.baseURL);
        return new Promise<IVirtualDeviceResult>((resolve, reject) => {
            const callback = (response: IncomingMessage) => {
                let data = "";

                response.on("data", (chunk) => {
                    data += chunk;
                });

                response.on("end", () => {
                    if (response.statusCode === 200) {
                        const result: IVirtualDeviceResult = JSON.parse(data);
                        result.message = message;
                        this.applyHomophones(result);
                        resolve(result);
                    } else {
                        reject(data);
                    }
                });
            };

            const request = this.httpInterface(urlParsed).get(url as any, callback);
            request.on("error", function(error: string) {
                reject(error);
            });

            request.end();
        });
    }

    public async batchMessage(messages: IMessage[], debug?: boolean): Promise<IVirtualDeviceResult[] | any> {
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

        if (this.skipSTT) {
            path += "&skip_stt=true";
        }

        if (this.asyncMode) {
            path += "&async_mode=true";
        }

        if (this.stt) {
            path += "&stt=" + this.stt;
        }

        if (this.locationLat) {
            path += "&location_lat=" + this.locationLat;
        }

        if (this.locationLong) {
            path += "&location_long=" + this.locationLong;
        }

        if (this.conversationId) {
            path += "&conversation_id=" + this.conversationId;
        }

        if (this.screenMode) {
            path += "&screen_mode=" + this.screenMode;
        }

        if (this.client) {
            path += "&client=" + this.client;
        }

        if (this.projectId) {
            path += "&project_id=" + this.projectId;
        }

        if (this.phoneNumber) {
            path += "&phone_number=" + this.phoneNumber;
        }

        let procesedMessages: IMessageEndpoint[];
        try {
            procesedMessages = await this.processMessages(messages);
        } catch (error) {
            return Promise.reject(error);
        }

        const url = URL.parse(this.baseURL);

        return new Promise<IVirtualDeviceResult[] | any>((resolve, reject) => {
            const callback = (response: IncomingMessage) => {
                let data = "";

                response.on("data", (chunk) => {
                    data += chunk;
                });

                response.on("end", () => {
                    if (response.statusCode === 200) {
                        if (this.asyncMode) {
                            resolve(this.handleAsynchResponse(data as string));
                        } else {
                            resolve(this.handleBatchResponse(data as string));
                        }
                    } else {
                        reject(data);
                    }
                });
            };

            const input = {
                messages: procesedMessages,
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
                port: this.httpInterfacePort(url),
            };

            const request = this.httpInterface(url).request(requestOptions, callback);
            request.on("error", function(error: string) {
                reject(error);
            });

            request.write(inputString);
            request.end();
        });
    }

    public getConversationResults(uuid: string): Promise<IVirtualDeviceResult[] | any> {
        if (!this.asyncMode) {
            throw Error("Conversation Results only available in async mode");
        }

        const path = "/conversation?uuid=" + uuid;

        const url = URL.parse(this.baseURL);

        return new Promise<IVirtualDeviceResult[] | any>((resolve, reject) => {
            const callback = (response: IncomingMessage) => {
                let data = "";

                response.on("data", (chunk) => {
                    data += chunk;
                });

                response.on("end", () => {
                    if (response.statusCode === 200) {
                        const result = this.handleBatchResponse(data as string);
                        if ((result as IVirtualDeviceError).error) {
                            reject(new Error((result as IVirtualDeviceError).error));
                            return;
                        }

                        resolve(result);
                    } else {
                        reject(data);
                    }
                });
            };

            const requestOptions = {
                headers: {
                    "Content-Type": "application/json",
                },
                host: url.hostname,
                method: "GET",
                path,
                port: this.httpInterfacePort(url),
            };

            const request = this.httpInterface(url).request(requestOptions, callback);
            request.on("error", function(error: string) {
                reject(error);
            });

            request.end();
        });
    }

    public stopConversation(uuid: string): Promise<IVirtualDeviceResult[] | any> {
        if (!this.asyncMode) {
            throw Error("Conversation stop only available in async mode");
        }

        const path = "/conversation_stop";

        const url = URL.parse(this.baseURL);

        return new Promise<IVirtualDeviceResult[] | any>((resolve, reject) => {
            const callback = (response: IncomingMessage) => {
                let data = "";

                response.on("data", (chunk) => {
                    data += chunk;
                });

                response.on("end", () => {
                    if (response.statusCode === 200) {
                        resolve();
                    } else {
                        reject(data);
                    }
                });
            };

            const input = {
                uuid,
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
                port: this.httpInterfacePort(url),
            };

            const request = this.httpInterface(url).request(requestOptions, callback);
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

    private handleBatchResponse(data: string): IVirtualDeviceResult[] | IVirtualDeviceError {
        const json = JSON.parse(data);

        if (json && json.error) {
            return json as IVirtualDeviceError;
        }

        if (!json || !json.results) {
            return [];
        }
        for (const result of json.results) {
            result.status = json.status;
            this.applyHomophones(result);
        }
        return json.results;
    }

    private handleAsynchResponse(data: string): IConversationResult {
        return JSON.parse(data);
    }

    private applyHomophones(result: IVirtualDeviceResult) {
        if (!result.debug) {
            result.debug = {};
        }

        if (!result.transcript) {
            return;
        }

        const keys = Object.keys(this.homophones);
        result.debug.rawTranscript = result.transcript;

        for (const key of keys) {
            // Replace underscore with space - because we use environment variables to set these at times,
            //  underscores are needed
            const word = key.split("_").join(" ");

            const homophones = this.homophones[key];
            for (const homophone of homophones) {
                // Replace each of the homophones
                result.transcript = result.transcript.split(new RegExp("\\b" + homophone + "\\b")).join(word);
            }
        }
    }

    private async processMessages(messages: IMessage[]): Promise<IMessageEndpoint[]> {
        const mesageProcessor = new MessageProcesor(messages);
        return await mesageProcessor.process();
    }
}

class MessageProcesor {
    public constructor( public messages: IMessage[]) {}

    public process(): Promise<IMessageEndpoint[]> {
        return Promise.all(this.messages.map((message) => this.processMessage(message)));
    }

    private async processMessage(message: IMessage): Promise<IMessageEndpoint> {
        let fileContent: string | undefined;
        let extension: string | undefined;

        const frameRate: number | undefined =  message.audio ? message.audio.frameRate : undefined;
        const channels: number | undefined =  message.audio ? message.audio.channels : undefined;
        const sampleWidth: number | undefined =  message.audio ? message.audio.sampleWidth : undefined;

        let filePath: string;

        if (message.audio) {
            if (message.audio.audioPath || message.audio.audioURL) {
                if (message.audio.audioPath) {
                    filePath = message.audio.audioPath;
                    fileContent = this.getLocalFile(message.audio.audioPath);
                } else if (message.audio.audioURL) {
                    filePath = message.audio.audioURL;
                    fileContent = await this.fetchFile(message.audio.audioURL);
                } else {
                    filePath = "";
                    fileContent = "";
                }

                // get extension
                extension =  this.getExtension(filePath);

            } else {
                throw new Error("either audioPath or audioURL should be set.");
            }
        }

        return {
            audio: fileContent,
            channels,
            format: extension,
            frame_rate: frameRate,
            phrases: message.phrases,
            sample_width: sampleWidth,
            text: message.text,
        } as IMessageEndpoint;
    }

    private getLocalFile(path: string) {
        const fileContents = fs.readFileSync(path);
        return Buffer.from(fileContents).toString("base64");
    }

    private fetchFile(url: string): Promise<string> {
        return new Promise((resolve, reject) => {
            const data: Buffer[] = [];
            const req = https.get(url as any, (res) => {
                res.on("data", (chunk: Buffer) => {
                    data.push(chunk);
                });
                res.on("end", () => {
                    if (res.statusCode === 200) {
                        const buffer = Buffer.concat(data);
                        resolve(buffer.toString("base64"));
                    } else {
                        reject();
                    }
                });
            });
            req.on("error", function(error: Error) {
                reject(error.message);
            });
            req.end();
        });
    }

    private getExtension(path: string) {
        const extname = pathModule.extname(path);
        if (extname && extname.length > 0) {
            return extname.substr(1);
        }
        return "";
    }
}
export interface IConversationResult {
    conversation_id: string;
}

export interface IVirtualDeviceResult {
    card: ICard | null;
    debug: {
        rawTranscript?: string;
        rawJSON?: any;
    };
    sessionTimeout: number;
    streamURL: string | null;
    transcript: string | null;
    // message is the message used for this result.
    message: string;
    status?: string | null;
}

export interface IVirtualDeviceError {
    error: string;
}

export interface ICard {
    imageURL: string | null;
    mainTitle: string | null;
    subTitle: string | null;
    textField: string | null;
    type: string;
}

export interface IMessage {
    text?: string;
    phrases?: string[];
    audio?: IAudio;
}

export interface IAudio {
    audioURL?: string;
    audioPath?: string;
    frameRate?: number;
    channels?: number;
    sampleWidth?: number;
}

interface IMessageEndpoint {
    text?: string;
    phrases?: string[];
    audio?: string;
    format?: string;
    frame_rate?: number;
    channels?: number;
    sample_width?: number;
}
