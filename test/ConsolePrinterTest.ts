import {assert} from "chai";
import * as chalk from "chalk";
import {ConsolePrinter} from "../src/ConsolePrinter";
import {IVirtualDeviceValidatorResult} from "../src/VirtualDeviceValidator";

describe("ConsolePrinter", function() {
    beforeEach(() => {
        (chalk as any).enabled = false;
    });

    afterEach(() => {
        (chalk as any).enabled = true;
    });

    it("Prints simple results", function() {
        const result = {
            result: "failure",
            tests: [
                {
                    actual: {
                        card: null,
                        debug: {},
                        message: "open test skill",
                        sessionTimeout: 12.709280015945435,
                        streamURL: null,
                        transcript: "this is your test skill i can do lots of things",
                        transcriptAudioURL: null,
                    },
                    errors: [],
                    result: "success",
                    status: "done",
                    test: {
                        absoluteIndex: 1,
                        comparison: "contains",
                        expected: {
                            transcript: "your test skill i can do lots of things",
                        },
                        input: "open test skill",
                        sequence: 1,
                        sequenceIndex: 1,
                    },
                },
                {
                    actual: {
                        card: null,
                        debug: {},
                        message: "now do something",
                        sessionTimeout: 12.709280015945435,
                        streamURL: null,
                        transcript: "i did not do it",
                        transcriptAudioURL: null,
                    },
                    errors: [{
                        actual: "i did not do it",
                        expected: "i did it",
                        property: "transcript",
                    }],
                    result: "failure",
                    status: "done",
                    test: {
                        absoluteIndex: 2,
                        comparison: "contains",
                        expected: {
                            transcript: "i did it",
                        },
                        input: "now do something",
                        sequence: 1,
                        sequenceIndex: 2,
                    },
                },

            ],
        };

        const printer = new ConsolePrinter();
        const output = printer.printResult("Launch", result as IVirtualDeviceValidatorResult);
        console.log(output);
        assert.isDefined(output);
        const lines = output.split("\n");
        // Can't get this test to work right because of weirdness that chalk does
        assert.equal(lines[2].length, 120);
        assert.equal(lines[4], "      Actual:   i did not do it");
        assert.equal(lines[5], "      Expected: i did it");
        assert.equal((printer as any).totalTests, 1);
        assert.equal((printer as any).totalSequences, 1);
        assert.equal((printer as any).totalInteractions, 2);
        assert.equal((printer as any).successfulTests, 0);
        assert.equal((printer as any).successfulSequences, 0);
        assert.equal((printer as any).successfulInteractions, 1);
    });

    it("Prints results by file", function() {
        const results = {
            "TestFile1.yml": {
            result: "failure",
            tests: [
                {
                    actual: {
                        card: null,
                        message: "open test skill",
                        sessionTimeout: 12.709280015945435,
                        streamURL: null,
                        transcript: "this is your test skill i can do lots of things",
                        transcriptAudioURL: null,
                    },
                    errors: [],
                    result: "success",
                    status: "done",
                    test: {
                        absoluteIndex: 1,
                        comparison: "contains",
                        expected: {
                            transcript: "your test skill i can do lots of things",
                        },
                        input: "open test skill",
                        sequence: 1,
                        sequenceIndex: 1,
                    },
                },
                {
                    actual: {
                        card: null,
                        message: "now do something",
                        sessionTimeout: 12.709280015945435,
                        streamURL: null,
                        transcript: "i did not do it",
                    },
                    errors: [{
                        actual: "i did not do it",
                        expected: "i did it",
                        property: "transcript",
                    }],
                    result: "failure",
                    status: "done",
                    test: {
                        absoluteIndex: 2,
                        comparison: "contains",
                        expected: {
                            transcript: "i did it",
                        },
                        input: "now do something",
                        sequence: 1,
                        sequenceIndex: 2,
                    },
                },
                {
                    actual: {
                        card: null,
                        message: "open test skill again",
                        sessionTimeout: 12.709280015945435,
                        streamURL: null,
                        transcript: "this is your test skill i can do lots of things",
                        transcriptAudioURL: null,
                    },
                    errors: [],
                    result: "success",
                    status: "done",
                    test: {
                        absoluteIndex: 3,
                        comparison: "contains",
                        expected: {
                            transcript: "your test skill i can do lots of things",
                        },
                        input: "open test skill",
                        sequence: 2,
                        sequenceIndex: 1,
                    },
                },

            ],
        } as IVirtualDeviceValidatorResult,
            "testFile2.yml": {
            result: "success",
            tests: [
                {
                    actual: {
                        card: null,
                        message: "open test skill",
                        sessionTimeout: 12.709280015945435,
                        streamURL: null,
                        transcript: "this is your test skill i can do lots of things",
                        transcriptAudioURL: null,
                    },
                    errors: [],
                    result: "success",
                    status: "done",
                    test: {
                        absoluteIndex: 1,
                        comparison: "contains",
                        expected: {
                            transcript: "your test skill i can do lots of things",
                        },
                        input: "open test skill",
                        sequence: 1,
                        sequenceIndex: 1,
                    },
                },
                {
                    actual: {
                        card: null,
                        message: "now do something",
                        sessionTimeout: 12.709280015945435,
                        streamURL: null,
                        transcript: "i did not do it",
                    },
                    errors: [{
                        actual: "i did not do it",
                        expected: "i did it",
                        property: "transcript",
                    }],
                    result: "success",
                    status: "done",
                    test: {
                        absoluteIndex: 2,
                        comparison: "contains",
                        expected: {
                            transcript: "i did it",
                        },
                        input: "now do something",
                        sequence: 1,
                        sequenceIndex: 2,
                    },
                },

            ],
        } as IVirtualDeviceValidatorResult,
        };

        const printer = new ConsolePrinter();
        const output = printer.printResultsByFile(results);
        console.log(output);
        assert.isDefined(output);
        assert.equal((printer as any).totalTests, 2);
        assert.equal((printer as any).totalSequences, 3);
        assert.equal((printer as any).totalInteractions, 5);
        assert.equal((printer as any).successfulTests, 1);
        assert.equal((printer as any).successfulSequences, 2);
        assert.equal((printer as any).successfulInteractions, 4);
    });
});
