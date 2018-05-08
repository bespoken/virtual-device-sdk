import * as chalk from "chalk";
import * as path from "path";
import {
    IVirtualDeviceValidatorResult, IVirtualDeviceValidatorResultItem, ValidatorError,
} from "./VirtualDeviceValidator";

// Configured to force a max line length of 120
const TEST_NAME_LENGTH = 20;
const TEST_ACTUAL_LENGTH = 37;
const TEST_EXPECTED_LENGTH = 37;
const TAB = "  ";
export class ConsolePrinter {
    private static rpad(s: string | string [] | null | undefined, padString: string, length: number) {
        if (!s) {
            s = "";
        }

        if (Array.isArray(s)) {
            s = s.toString();
        }

        while (s.length < length) {
            s = s + padString;
        }
        return s.substring(0, length);
    }

    private static concat(buffer: string, line: string, error: boolean): string {
        let color = chalk.default.green;
        if (error) {
            color = chalk.default.red;
        }
        buffer += color(line) + "\n";
        return buffer;
    }

    private totalTests = 0;
    private totalSequences = 0;
    private totalInteractions = 0;
    private successfulTests = 0;
    private successfulSequences = 0;
    private successfulInteractions = 0;

    public printResultsByFile(resultsByFile: {[id: string]: IVirtualDeviceValidatorResult}): string {
        let output = "";
        let firstFile = true;
        for (const file of Object.keys(resultsByFile)) {
            const result = resultsByFile[file];
            const shortFile = path.basename(file);
            if (firstFile) {
                firstFile = false;
            } else {
                output += "\n";
            }
            output += this.printResult(shortFile, result, false);
        }

        output = this.printSummary(output);
        return output;
    }

    public printResult(name: string, result: IVirtualDeviceValidatorResult, summarize: boolean = true): string {
        this.totalTests++;

        let out = chalk.default.green;
        if (result.result !== "success") {
            out = chalk.default.red;
        } else {
            this.successfulTests++;
        }

        let line = name + "\n";
        let output = out(line);
        let firstSequence = true;
        for (const testResult of result.tests) {
            this.totalInteractions++;

            // Print out the sequence name on its own line
            if (testResult.test.sequenceIndex === 1) {
                this.totalSequences++;
                const sequenceHasError = this.sequenceHasError(testResult.test.sequence, result.tests);
                if (!sequenceHasError) {
                    this.successfulSequences++;
                }

                // Add a newline before each sequence, after the first one
                if (firstSequence) {
                    firstSequence = false;
                } else {
                    output += "\n";
                }
                const sequenceLine = TAB + "Sequence " + testResult.test.sequence + ": " + testResult.test.input;
                output = ConsolePrinter.concat(output,
                    sequenceLine,
                    sequenceHasError);
            }

            line = TAB + TAB;
            if (testResult.result !== "success") {
                const error = (testResult.errors as ValidatorError[])[0];
                line += ConsolePrinter.rpad(testResult.test.input, " ", TEST_NAME_LENGTH)
                    + "  " + error.property;

                // When there are errors, we put the actual and expected on their own lines
                const actualLine = TAB + TAB + TAB + "Actual:   " + error.actual;
                const expectedLine = TAB + TAB + TAB + "Expected: " + error.expected;
                output = ConsolePrinter.concat(output, line, true);
                output = ConsolePrinter.concat(output, actualLine, true);
                output = ConsolePrinter.concat(output, expectedLine, true);
            } else {
                this.successfulInteractions++;
                const actual = testResult.actual ? testResult.actual.transcript : "";
                const expected = testResult.test.expected ? testResult.test.expected.transcript : "";
                line += ConsolePrinter.rpad(testResult.test.input, " ", TEST_NAME_LENGTH)
                    + "  Actual: " + ConsolePrinter.rpad(actual, " ", TEST_ACTUAL_LENGTH)
                    + "  Expected: " + ConsolePrinter.rpad(expected, " ", TEST_EXPECTED_LENGTH);
                output = ConsolePrinter.concat(output, line, false);
            }
        }

        if (summarize) {
            output = this.printSummary(output);
        }
        return output;
    }

    public printSummary(output: string) {
        // Output summary info
        const summaryPadding = 3;
        output += "\n";
        const hasErrors = (this.totalTests !== this.successfulTests);
        output = ConsolePrinter.concat(output, "Summary:", hasErrors);
        output = ConsolePrinter.concat(output, "Files:        "
            + ConsolePrinter.rpad(this.totalTests + "", " ", summaryPadding)
            + " Successful: " + ConsolePrinter.rpad(this.successfulTests + "", " ", summaryPadding)
            + " Failed: " + (this.totalTests - this.successfulTests), hasErrors);
        output = ConsolePrinter.concat(output,
            "Sequences:    " + ConsolePrinter.rpad(this.totalSequences + "", " ", summaryPadding)
            + " Successful: " + ConsolePrinter.rpad(this.successfulSequences + "", " ", summaryPadding)
            + " Failed: " + (this.totalSequences - this.successfulSequences), hasErrors);
        output = ConsolePrinter.concat(output,
            "Interactions: " + ConsolePrinter.rpad(this.totalInteractions + "", " ", summaryPadding)
            + " Successful: " + ConsolePrinter.rpad(this.successfulInteractions + "", " ", summaryPadding)
            + " Failed: " + (this.totalInteractions - this.successfulInteractions), hasErrors);
        return output;
    }

    private sequenceHasError(sequence: number, testResults: IVirtualDeviceValidatorResultItem []) {
        for (const testResult of testResults) {
            if (testResult.test.sequence === sequence && testResult.result !== "success") {
                return true;
            }
        }
        return false;
    }
}
