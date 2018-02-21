import * as fs from "fs";
import * as path from "path";
import {PrettyPrinter} from "./PrettyPrinter";

import {
    IVirtualDeviceTest,
    IVirtualDeviceTestSequence,
    IVirtualDeviceValidatorResult,
    IVirtualDeviceValidatorResultItem,
    VirtualDeviceValidator,
} from "./VirtualDeviceValidator";
import {YAMLParser} from "./YAMLParser";

// InvocationNameRegexp matches a skill's invocation name.
const invocationNameRegexp = /(open|launch|tell|ask)(.*)$/;
const urlRegExp = /^https?:\/\//i;

export type IVirtualDeviceScriptCallback = (
    error: Error,
    resultItem: IVirtualDeviceValidatorResultItem,
    context?: any) => void;

export class VirtualDeviceScript {
    private virtualDeviceValidator: VirtualDeviceValidator;
    private tokens: {[id: string]: string} = {};

    constructor(token?: string, userID?: string, baseURL?: string, sourceAPIBaseURL?: string) {
        baseURL = baseURL ? baseURL : "https://virtual-device.bespoken.io";
        this.virtualDeviceValidator = new VirtualDeviceValidator(token, userID, baseURL, sourceAPIBaseURL);
    }

    /**
     * Set tokens that will be replaced in the script
     * @param {string} token The token will be searched for with angle brackets on either side (NAME -> <NAME>)
     * @param {string} value
     */
    public findReplace(token: string, value: string) {
        this.tokens[token] = value;
    }

    public tests(scriptContents: string): IVirtualDeviceTestSequence[] {
        // Throw away blank lines at beginning and end
        scriptContents = scriptContents.trim();
        scriptContents = this.tokenize(scriptContents);

        const sequences: IVirtualDeviceTestSequence[] = [];
        let currentSequence: IVirtualDeviceTestSequence = {tests: [], invocationName: ""};
        let sequence: number = 1;
        let sequenceIndex: number = 1;
        let absoluteIndex: number = 0;
        const utteranceTests = new YAMLParser(scriptContents).parse();
        let utteranceCount: number = 0;
        let config: any = {};
        // Takes results from parsing YAML and turns it into tests
        for (const utteranceTest of utteranceTests) {
            utteranceCount += 1;

            // The first test may not be a test - may be the config
            if (utteranceCount === 1 && utteranceTest.name() === "config") {
                config = utteranceTest.object();
                continue;
            }

            // Null means a blank line and a new sequence is starting
            // Otherwise, it is considered a test
            if (!utteranceTest.isNull()) {
                absoluteIndex += 1;
                const input = utteranceTest.name() as string;
                const test: IVirtualDeviceTest = {
                    absoluteIndex,
                    comparison: "contains",
                    expected: {},
                    input,
                    sequence,
                    sequenceIndex,
                };

                const expected: any = test.expected;
                if (utteranceTest.isString()) {
                    // If the value is a string, must be a transcript or URL
                    if (utteranceTest.isEmpty()) {
                        throw new Error("Line " + utteranceTest.line + ": No right-hand value specified.");
                    }

                    if (urlRegExp.test(utteranceTest.string())) {
                        expected.streamURL = utteranceTest.string();
                    } else {
                        expected.transcript = utteranceTest.string();
                    }
                } else if (utteranceTest.isArray()) {
                    // If the value is an array, it is possible transcript values
                    expected.transcript = utteranceTest.stringArray();
                } else if (utteranceTest.isObject()) {
                    // If the value is an object, we just set that to be expected
                    test.expected = utteranceTest.object();
                } else if (utteranceTest.value() === undefined) {
                    throw new Error("Line " + utteranceTest.line + ": No properties added for object.");
                }

                currentSequence.tests.push(test);
                sequenceIndex += 1;
            }

            // If this a blank line, or the last utterance, we tie up this sequence
            if (utteranceTest.isNull() || utteranceCount === utteranceTests.length) {
                if (currentSequence.tests.length) {
                    sequence += 1;
                    const firstInput = (currentSequence.tests
                        && currentSequence.tests.length > 0
                        && currentSequence.tests[0]
                        && currentSequence.tests[0].input) || "";
                    currentSequence.invocationName = this.detectInvocationName(firstInput);
                    if (config.voiceID) {
                        currentSequence.voiceID = config.voiceID;
                    }

                    if (config.locale) {
                        currentSequence.locale = config.locale;
                    }
                    sequences.push({...currentSequence});

                    // Setup a new sequence
                    currentSequence = {tests: [], invocationName: ""};
                    sequenceIndex = 1;
                }
            }
        }
        return sequences;
    }

    /**
     * Executes a directory of tests
     * It will load any files that end with "yml" or "yaml" in the directory and execute them
     * @param {string} directoryPath
     */
    public async executeDir(directoryPath: string): Promise<{[id: string]: IVirtualDeviceValidatorResult}> {
        directoryPath = path.resolve(directoryPath);
        let stats;
        try {
            stats = fs.statSync(directoryPath);
        } catch (e) {
            return Promise.reject("Directory to execute does not exist: " + directoryPath);
        }

        if (!stats.isDirectory()) {
            return Promise.reject("Not a directory: " + directoryPath);
        }

        const items = fs.readdirSync(directoryPath);
        const results: {[id: string]: IVirtualDeviceValidatorResult} = {};
        for (const filePath of items) {
            if (filePath.endsWith(".yml") || filePath.endsWith(".yaml")) {
                const fullPath = path.join(directoryPath, filePath);
                const result = await this.executeFile(fullPath);
                results[fullPath] = result;
            }
        }
        return results;
    }

    public executeFile(filePath: string): Promise<IVirtualDeviceValidatorResult> {
        filePath = path.resolve(filePath);
        try {
            fs.statSync(filePath);
        } catch (e) {
            return Promise.reject("File to execute does not exist: " + filePath);
        }

        const fileContents = fs.readFileSync(filePath, "UTF-8");
        return this.execute(fileContents);
    }

    public execute(scriptContents: string, context?: any): Promise<IVirtualDeviceValidatorResult> {
        return this.virtualDeviceValidator.execute(this.tests(scriptContents), context);
    }

    // validate validates given script contents syntax
    // returns either a syntax error or undefined if ok.
    public validate(scriptContents: string): undefined | Error {
        try {
            this.tests(scriptContents);
            return undefined;
        } catch (err) {
            return err;
        }
    }

    // prettifyAsPartialHTML prettyfies given validator result items into HTML.
    public prettifyAsPartialHTML(scriptContents: string,
                                 partialResultItems: IVirtualDeviceValidatorResultItem[],
                                 includeTimeContent?: boolean): string {
        includeTimeContent = (typeof includeTimeContent !== "undefined") ? includeTimeContent : true;

        const virtualDeviceTestSequences: IVirtualDeviceTestSequence[] = this.tests(scriptContents);
        const printer = new PrettyPrinter();
        return printer.prettifyAsPartialHTML(virtualDeviceTestSequences, partialResultItems, includeTimeContent);
    }

    // prettifyAsHTML prettyfies given validator result into HTML.
    public prettifyAsHTML(result: IVirtualDeviceValidatorResult, includeTimeContent?: boolean): string {
        const printer = new PrettyPrinter();
        return printer.prettifyAsHTML(result, includeTimeContent);
    }

    public on(event: string, cb: IVirtualDeviceScriptCallback) {
        this.virtualDeviceValidator.subscribe(event, cb);
    }

    public off(event: string) {
        this.virtualDeviceValidator.unsubscribe(event);
    }

    public checkAuth(scriptContents: string): Promise<any> {
        const sequences: IVirtualDeviceTestSequence[] = this.tests(scriptContents);
        const promises = [];
        for (const sequence of sequences) {
            const promise = this.virtualDeviceValidator.checkAuth(sequence.invocationName);
            promises.push(promise);
        }
        return Promise.all(promises).then(() => "AUTHORIZED");
    }

    private detectInvocationName(input: string): string {
        const matches: RegExpMatchArray | null = input.toLowerCase().match(
            invocationNameRegexp);
        if (!matches || matches.length !== 3) {
            return "";
        }
        return matches[2].trim();
    }

    private tokenize(script: string): string {
        for (const token of Object.keys(this.tokens)) {
            const fullToken = token;
            const value = this.tokens[token];
            script = script.split(fullToken).join(value);
        }
        return script;
    }
}
