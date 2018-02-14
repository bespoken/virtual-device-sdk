import {assert} from "chai";
import {IVirtualDeviceValidatorResult} from "../src";
import {ConsolePrinter} from "../src/ConsolePrinter";

describe("ConsolePrinter", function() {
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
                            transcript: "your test skill i",
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
        console.log(output);
        assert.isDefined(output);
    });
});
