import {
    IVirtualDeviceTestSequence, IVirtualDeviceValidatorResult,
    IVirtualDeviceValidatorResultItem, Validator,
} from "./VirtualDeviceValidator";

export class PrettyPrinter {
    public prettifyAsPartialHTML(virtualDeviceTestSequences: IVirtualDeviceTestSequence[],
                                 partialResultItems: IVirtualDeviceValidatorResultItem[],
                                 includeTimeContent?: boolean): string {
        includeTimeContent = (typeof includeTimeContent !== "undefined") ? includeTimeContent : true;

        const result: IVirtualDeviceValidatorResult = {tests: []};
        for (const sequence of virtualDeviceTestSequences) {
            for (const test of sequence.tests) {
                const resultItem: IVirtualDeviceValidatorResultItem = {test};
                resultItem.status = "scheduled";
                const validator: Validator = new Validator(resultItem, undefined);
                result.tests.push(validator.resultItem);
            }
        }
        for (const partialResultItem of partialResultItems) {
            for (const i in result.tests) {
                if (result.tests[i]) {
                    const resultItem = result.tests[i];
                    if (resultItem.test.absoluteIndex === partialResultItem.test.absoluteIndex) {
                        result.tests[i] = partialResultItem;
                        break;
                    }
                }
            }
        }
        return this.prettifyAsHTML(result, includeTimeContent);
    }

    // prettifyAsHTML prettyfies given validator result into HTML.
    public prettifyAsHTML(result: IVirtualDeviceValidatorResult, includeTimeContent?: boolean): string {
        includeTimeContent = (typeof includeTimeContent !== "undefined") ? includeTimeContent : true;
        const colorRed = "rgb(244,67,54)";
        const colorGreen = "rgb(76,175,80)";
        const totalTests = result.tests;
        const succeededTests = result.tests.filter((test: any) => test.result === "success");
        const failedTests = result.tests.filter((test: any) => test.result === "failure");
        const overallContent = `${totalTests.length} tests, ${succeededTests.length} succeeded` +
            `, ${failedTests.length} failed`;
        const nowDate = new Date();
        const nowUTC = `${nowDate.getUTCMonth() + 1}/${nowDate.getUTCDate()}/${nowDate.getUTCFullYear()} ` +
            `${nowDate.getUTCHours()}:${nowDate.getUTCMinutes()}:${nowDate.getUTCSeconds()} UTC`;
        const sequences: {[key: string]: any; } = {};
        for (const test of result.tests) {
            const key = test.test.sequence;
            if (sequences.hasOwnProperty(key)) {
                sequences[key].push(test);
            } else {
                sequences[key] = [test];
            }
        }
        const sequencesHTML = [];
        const tdAndThStyleProps = "border:1px solid black;padding:5px;";
        const tdAndThStyles = `style="${tdAndThStyleProps}"`;
        const tdStyles = tdAndThStyles;
        const thStyles = tdAndThStyles;
        const trStyles = (r: string): string => {
            let color: string = "";
            if (r === "success") {
                color = colorGreen;
            } else if (r === "failure") {
                color = colorRed;
            }
            return ` style="color:${color};"`;
        };
        const overallContentStyles = (): string => {
            let color: string = "";
            if (failedTests.length > 0) {
                color = colorRed;
            } else {
                color = colorGreen;
            }
            return `style="color:${color};"`;
        };
        const statusIcon = (test: any): any => {
            if (test.status === "running") {
                return "<img src='/assets/Spinner.svg' height=24>";
            } else if (test.status === "scheduled") {
                return "<img src='/assets/Schedule.svg' height=18>";
            } else if (test.status === "done" && test.result
                && test.result === "success") {
                return "&#10004;";
            } else if (test.status === "done" && test.result
                && test.result !== "success") {
                return "&#10008;";
            }
        };
        for (const key in sequences) {
            if (sequences.hasOwnProperty(key)) {
                const tests = sequences[key];
                const testsHTML = [];
                for (const test of tests) {
                    const icon = statusIcon(test);
                    const html = `
                        <tr${(test.result && trStyles(test.result)) || ""}>
                            <td style="${tdAndThStyleProps}text-align:center;">${icon ? icon : ""}</td>
                            <td ${tdStyles}>${test.test.input}</td>
                            <td ${tdStyles}>${test.test.expectedStreamURL
                        ? test.test.expectedStreamURL
                        : test.test.expectedTranscript || ""}</td>
                            <td ${tdStyles}>${test.actual && test.actual.streamURL
                        ? test.actual.streamURL
                        : (test.actual && test.actual.transcript) || ""}</td>
                        </tr>`;
                    testsHTML.push(html);
                }
                const html = `
                    <div style="margin-bottom:16px;" class="sequence">
                        <p style="margin:0 0 2px;font-weight:bold;" class="heading">Sequence: ${key}</p>
                        <table style="border-collapse:collapse;">
                            <thead>
                                <tr>
                                    <th ${thStyles}>Result</th>
                                    <th ${thStyles}>Input</th>
                                    <th ${thStyles}>Expected</th>
                                    <th ${thStyles}>Actual</th>
                                </tr>
                            </thead>
                            <tbody>${testsHTML.join("")}</tbody>
                        </table>
                    </div>`;
                sequencesHTML.push(html);
            }
        }
        const showHeadingSpinner = (totalTests.length !== succeededTests.length + failedTests.length);
        const headingSpinner = (showHeadingSpinner
            ? "<img src='/assets/Spinner.svg' height=34>" : "");
        return `
            <div>
                <p style="font-weight:500;font-size:28px;font-family:'Roboto','Helvetica','Arial',sans-serif;">
                    Validation Script Results${headingSpinner}
                </p>
                <div style="margin:0 0 -18px;" class="output">
                    <p style="font-weight:bold;"class="heading">Output:</p>
                </div>
                <div class="overall">
                    <p style="margin:0 0 -6px;font-weight:bold;" class="heading">Overall:</p>
                    <p class="content" ${overallContentStyles()}>${overallContent}</p>
                </div>
                <div class="time">
                    <p style="margin:0 0 -6px;font-weight:bold;" class="heading">Time:</p>
                    <p class="content">${includeTimeContent && nowUTC || ""}</p>
                </div>${sequencesHTML.join("")}
            </div>`;
    }
}
