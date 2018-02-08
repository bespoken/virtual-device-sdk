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

    constructor(token: string, userID: string, baseURL?: string, sourceAPIBaseURL?: string) {
        baseURL = baseURL ? baseURL : "https://virtual-device.bespoken.io/process";
        this.virtualDeviceValidator = new VirtualDeviceValidator(token, userID, baseURL, sourceAPIBaseURL);
    }

    public tests(scriptContents: string): IVirtualDeviceTestSequence[] {
        // Throw away blank lines at beginning and end
        scriptContents = scriptContents.trim();

        const sequences: IVirtualDeviceTestSequence[] = [];
        let currentSequence: IVirtualDeviceTestSequence = {tests: [], invocationName: ""};
        let sequence: number = 1;
        let sequenceIndex: number = 1;
        let absoluteIndex: number = 0;
        const utterances = new YAMLParser(scriptContents).parse();
        let utteranceCount: number = 0;
        for (const utterance of utterances) {
            utteranceCount += 1;
            if (!utterance.isNull()) {
                absoluteIndex += 1;
                const input = utterance.name() as string;
                const test: IVirtualDeviceTest = {
                    absoluteIndex,
                    comparison: "contains",
                    expectedStreamURL: undefined,
                    expectedTranscript: undefined,
                    input,
                    sequence,
                    sequenceIndex,
                };

                // If the value for this is just a string, then check whether it is a URL
                if (utterance.isString()) {
                    if (utterance.isEmpty()) {
                        throw new Error("Line " + utterance.line + ": No right-hand value specified.");
                    }
                    // If this utterance is a URL, assume it is a stream check
                    if (urlRegExp.test(utterance.string())) {
                        test.expectedStreamURL = utterance.string();
                    } else {
                        test.expectedTranscript = utterance.string();
                    }
                } else if (utterance.value() === undefined) {
                    throw new Error("Line " + utterance.line + ": No properties added for object.");
                }

                currentSequence.tests.push(test);
                sequenceIndex += 1;
            }
            // If this a blank line, or the last utterance, we tie up this sequence
            if (utterance.isNull() || utteranceCount === utterances.length) {
                if (currentSequence.tests.length) {
                    sequence += 1;
                    const firstInput = (currentSequence.tests
                        && currentSequence.tests.length > 0
                        && currentSequence.tests[0]
                        && currentSequence.tests[0].input) || "";
                    currentSequence.invocationName = this.detectInvocationName(firstInput);
                    sequences.push({...currentSequence});
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
    public async executeDir(directoryPath: string): Promise<IVirtualDeviceValidatorResult[]> {
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
        const results = [];
        for (const filePath of items) {
            if (filePath.endsWith(".yml") || filePath.endsWith(".yaml")) {
                const fullPath = path.join(directoryPath, filePath);
                const result = await this.executeFile(fullPath);
                results.push(result);
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
}
