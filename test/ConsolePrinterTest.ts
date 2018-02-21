import {assert} from "chai";
import * as chalk from "chalk";
import {ConsolePrinter} from "../src/ConsolePrinter";
import {IVirtualDeviceValidatorResult} from "../src/VirtualDeviceValidator";

describe("ConsolePrinter", function() {
    beforeEach(() => {
        (chalk as any).enabled = false;
    });

    beforeEach(() => {
        (chalk as any).enabled = true;
    });

    it("Prints simple results", function() {
        const result = {
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
        assert.isDefined(output);
        const lines = output.split("\n");
        // Can't get this test to work right because of weirdness that chalk does
        assert.equal(lines[2].length, 120);
        assert.equal(lines[4], "      Actual:   i did not do it");
        assert.equal(lines[5], "      Expected: i did it");
    });
});
