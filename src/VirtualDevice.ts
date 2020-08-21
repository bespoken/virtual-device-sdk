import * as fs from "fs";
import { IncomingMessage } from "http";
import * as http from "http";
import * as https from "https";
import * as HttpsProxyAgent from "https-proxy-agent";
import * as pathModule from "path";
import * as URL from "url";
import { retry } from "./util";

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
    [key: string]: any;
}

interface IKeyValue {
    [key: string]: any;
}

const VirtualDeviceParameterMapper: IKeyValue = {
    asyncMode: "async_mode",
    conversationId: "conversation_id",
    locale: "language_code",
    locationLat: "location_lat",
    locationLong: "location_long",
    phoneNumber: "phone_number",
    projectId: "project_id",
    screenMode: "screen_mode",
    skipSTT: "skip_stt",
    stt: "stt",
    token: "user_id",
    voiceID: "voice_id",
};

export class VirtualDevice {
    public baseURL: string;
    public homophones: {[id: string]: string[]} = {};
    public configuration: IVirtualDeviceConfiguration;
    private filters: Array<(data: any) => void>= [];
    private proxy?: string;
    private agent?: HttpsProxyAgent.HttpsProxyAgent;
    private TIMEOUTMS = process.env.VDSDK_TIMEOUT ? Number.parseInt(process.env.VDSDK_TIMEOUT) : 2000;
    private MIN_RETRY_TIMEOUTMS = process.env.VDSDK_MIN_RETRY_TIMEOUT ?
        Number.parseInt(process.env.VDSDK_MIN_RETRY_TIMEOUT) : 2000;
    private MAX_RETRY_TIMEOUTMS = process.env.VDSDK_MAX_RETRY_TIMEOUT ?
        Number.parseInt(process.env.VDSDK_MAX_RETRY_TIMEOUT) : 5000;

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

        this.proxy = process.env.HTTPS_PROXY;
        this.agent = this.proxy ? new HttpsProxyAgent.HttpsProxyAgent(this.proxy) : undefined;

        if (arg0 === Object(arg0)) {
            this.configuration = arg0 as IVirtualDeviceConfiguration;
        } else {
            this.configuration = {
                token: arg0,
                locale,
                voiceID,
                skipSTT,
                asyncMode,
                stt,
                locationLat,
                locationLong,
                conversationId,
                screenMode,
                client,
                projectId,
            } as IVirtualDeviceConfiguration;
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

    public addFilter(filter: (data: any) => void) {
        this.filters.push(filter);
    }

    public clearFilters() {
        this.filters = [];
    }

    public message(message: string, debug?: boolean,
                   phrases?: string[], newConversation?: boolean): Promise<IVirtualDeviceResult> {
        const encodedMessage = encodeURIComponent(message);

        let url = this.baseURL + "/process?";
        if (encodedMessage) {
            url += "&message=" + encodedMessage;
        }

        if (phrases) {
            for (const phrase of phrases) {
                url += "&phrases=" + encodeURIComponent(phrase);
            }
        }

        if (debug) {
            url += "&debug=true";
        }
        for (const key of Object.keys(this.configuration)) {
            const parameterValue = this.configuration[key];
            if (parameterValue === undefined) {
                continue;
            }
            const parameterName = VirtualDeviceParameterMapper[key] || key;
            if (Array.isArray(parameterValue)) {
                for (const element of parameterValue) {
                    url += "&" + parameterName + "=" + element;
                }
            } else {
                url += `&${parameterName}=${parameterValue}`;
            }
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

            const requestOptions: http.RequestOptions = URL.parse(url);

            if (this.agent) {
                requestOptions.agent = this.agent || false;
            }

            const request = this.httpInterface(urlParsed).get(requestOptions as any, callback);
            request.on("error", function(error: string) {
                reject(error);
            });

            request.end();
        });
    }

    public async batchMessage(messages: IMessage[], debug?: boolean): Promise<IVirtualDeviceResult[] | any> {
        let path = "/batch_process?";
        for (const key of Object.keys(this.configuration)) {
            const parameterValue = this.configuration[key];
            if (parameterValue === undefined) {
                continue;
            }
            const parameterName = VirtualDeviceParameterMapper[key] || key;
            if (Array.isArray(parameterValue)) {
                for (const element of parameterValue) {
                    path += "&" + parameterName + "=" + element;
                }
            } else {
                path += `&${parameterName}=${parameterValue}`;
            }
        }

        if (debug) {
            path += "&debug=true";
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
                        if (this.configuration.asyncMode) {
                            resolve(this.handleAsynchResponse(data as string));
                        } else {
                            try {
                                const result = this.handleBatchResponse(data as string);
                                resolve(result);
                            } catch (error) {
                                reject(data);
                            }
                        }
                    } else {
                        reject(data);
                    }
                });
            };

            const input = {
                messages: procesedMessages,
            };

            const filteredInput = this.filters.reduce((accInput, filter) => {
                try {
                    filter(accInput);
                } catch (error) {
                    console.error("WARNING: Error while modifying the request\n", error,
                        "\n Ignoring the error and keeping the batch message the same");
                }
                return accInput;
            }, input);

            const inputString = JSON.stringify(filteredInput);
            const requestOptions: http.RequestOptions = {
                headers: {
                    "Content-Length": Buffer.from(inputString).length,
                    "Content-Type": "application/json",
                },
                host: url.hostname,
                method: "POST",
                path: encodeURI(path),
                port: this.httpInterfacePort(url),
            };

            if (this.agent) {
                requestOptions.agent = this.agent || false;
            }

            const request = this.httpInterface(url).request(requestOptions, callback);
            request.on("error", function(error: string) {
                reject(error);
            });

            request.write(inputString);
            request.end();
        });
    }

    public async getConversationResults(uuid: string): Promise<IVirtualDeviceResponse | any> {
        if (!this.configuration.asyncMode) {
            throw Error("Conversation Results only available in async mode");
        }

        const path = "/conversation?uuid=" + uuid;

        const url = URL.parse(this.baseURL);

        const responsePromise = () => {
            return new Promise<IVirtualDeviceResponse | any>((resolve, reject) => {
                const callback = (response: IncomingMessage) => {
                    let data = "";

                    response.on("data", (chunk) => {
                        data += chunk;
                    });

                    response.on("end", () => {
                        if (response.statusCode === 200) {
                            try {
                                const result = this.handleBatchResponse(data as string);
                                resolve(result);
                            } catch (error) {
                                reject(data);
                            }
                        } else {
                            reject(data);
                        }
                    });
                };

                const requestOptions: http.RequestOptions = {
                    headers: {
                        "Content-Type": "application/json",
                    },
                    host: url.hostname,
                    method: "GET",
                    path,
                    port: this.httpInterfacePort(url),
                };

                if (this.agent) {
                    requestOptions.agent = this.agent || false;
                }

                const request = this.httpInterface(url).request(requestOptions, callback);
                request.on("socket", (socket: any) => {
                    socket.setTimeout(this.TIMEOUTMS);
                    socket.on("timeout", () => {
                        request.abort();
                    });
                });
                request.on("error", function(error: string) {
                    reject(error);
                });

                request.end();
            });
        };

        return await retry(async () => {
            return await responsePromise();
          }, {
            maxTimeout: this.MAX_RETRY_TIMEOUTMS,
            minTimeout: this.MIN_RETRY_TIMEOUTMS,
            retries: 2,
          });
    }

    public stopConversation(uuid: string): Promise<IVirtualDeviceResult[] | any> {
        if (!this.configuration.asyncMode) {
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
            const requestOptions: http.RequestOptions = {
                headers: {
                    "Content-Length": Buffer.from(inputString).length,
                    "Content-Type": "application/json",
                },
                host: url.hostname,
                method: "POST",
                path,
                port: this.httpInterfacePort(url),
            };

            if (this.agent) {
                requestOptions.agent = this.agent || false;
            }

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

    private handleBatchResponse(data: string): IVirtualDeviceResponse {
        const json = JSON.parse(data);
        let results: IVirtualDeviceResult[];
        if (!json || !json.results) {
            results = [];
        } else {
            results = json.results;
        }

        for (const result of results) {
            result.status = json.status;
            this.applyHomophones(result);
        }

        return {
            ...json,
            results,
        } as  IVirtualDeviceResponse;
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
                result.transcript = result.transcript.split(new RegExp("\\b" + homophone + "\\b", "i")).join(word);
            }
        }
    }

    private async processMessages(messages: IMessage[]): Promise<IMessageEndpoint[]> {
        const mesageProcessor = new MessageProcesor(messages);
        return await mesageProcessor.process();
    }
}

class MessageProcesor {
    private proxy?: string;
    private agent?: HttpsProxyAgent.HttpsProxyAgent;
    public constructor( public messages: IMessage[]) {
        this.proxy = process.env.HTTPS_PROXY;
        if (!!this.proxy) {
            this.agent = new HttpsProxyAgent.HttpsProxyAgent(this.proxy);
        }
    }

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
            settings: message.settings,
            text: message.text,
            url: message.url,
        } as IMessageEndpoint;
    }

    private getLocalFile(path: string) {
        const fileContents = fs.readFileSync(path);
        return Buffer.from(fileContents).toString("base64");
    }

    private fetchFile(url: string): Promise<string> {
        return new Promise((resolve, reject) => {
            const data: Buffer[] = [];
            const requestOptions: http.RequestOptions = URL.parse(url);

            if (this.agent) {
                requestOptions.agent = this.agent || false;
            }

            const req = https.get(requestOptions, (res) => {
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
        let extname = pathModule.extname(path);
        // The extname may include a ? if this is a URL - we want to remove that section
        if (extname.indexOf("?") !== -1) {
            extname = extname.split("?")[0];
        }

        if (extname && extname.length > 0) {
            return extname.substr(1);
        }
        return "";
    }
}
export interface IConversationResult {
    conversation_id: string;
}

export interface IVirtualDeviceResponse {
    results: IVirtualDeviceResult[];
    status: string;
    error: string;
    errorCode: number;
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
    error_category?: string;
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
    url?: string;
    audio?: IAudio;
    settings?: { [id: string]: any };
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
    url?: string;
}
