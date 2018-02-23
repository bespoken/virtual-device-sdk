import {assert} from "chai";
import * as dotenv from "dotenv";
import * as Sinon from "sinon";
import {VirtualDeviceScript} from "../src/VirtualDeviceScript";
import {IVirtualDeviceValidatorResultItem, VirtualDeviceValidator} from "../src/VirtualDeviceValidator";
import {MessageMock} from "./MessageMock";

describe("PrettyPrinter", function() {
    this.timeout(120000);

    before(() => {
        dotenv.config();
        MessageMock.enable();
    });

    after(() => {
        MessageMock.disable();
    });

    describe("#prettifyAsHTML()", () => {
        let checkAuthStub: any;
        before(() => {
            checkAuthStub = Sinon.stub(VirtualDeviceValidator.prototype, "checkAuth")
                .returns(Promise.resolve("AUTHORIZED"));
        });
        after(() => {
            checkAuthStub.restore();
        });
        it("success", async () => {
            const scripContents = `
"open test player": "welcome to the simple audio player"
"tell test player to play": "https://feeds.soundcloud.com/stream/"
	        `;
            const virtualDeviceScript = new VirtualDeviceScript();
            const validatorResult = await virtualDeviceScript.execute(scripContents);
            // tslint:disable:max-line-length
            const expected = `
            <div>
                <p style="font-weight:500;font-size:28px;font-family:'Roboto','Helvetica','Arial',sans-serif;">
                    Validation Script Results
                </p>
                <div style="margin:0 0 -18px;" class="output">
                    <p style="font-weight:bold;"class="heading">Output:</p>
                </div>
                <div class="overall">
                    <p style="margin:0 0 -6px;font-weight:bold;" class="heading">Overall:</p>
                    <p class="content" style="color:rgb(76,175,80);">2 tests, 2 succeeded, 0 failed</p>
                </div>
                <div class="time">
                    <p style="margin:0 0 -6px;font-weight:bold;" class="heading">Time:</p>
                    <p class="content"></p>
                </div>
                    <div style="margin-bottom:16px;" class="sequence">
                        <p style="margin:0 0 2px;font-weight:bold;" class="heading">Sequence: 1</p>
                        <table style="border-collapse:collapse;">
                            <thead>
                                <tr>
                                    <th style="border:1px solid black;padding:5px;">Result</th>
                                    <th style="border:1px solid black;padding:5px;">Input</th>
                                    <th style="border:1px solid black;padding:5px;">Expected</th>
                                    <th style="border:1px solid black;padding:5px;">Actual</th>
                                </tr>
                            </thead>
                            <tbody>
                        <tr style="color:rgb(76,175,80);">
                            <td style="border:1px solid black;padding:5px;text-align:center;">&#10004;</td>
                            <td style="border:1px solid black;padding:5px;">open test player</td>
                            <td style="border:1px solid black;padding:5px;">welcome to the simple audio player</td>
                            <td style="border:1px solid black;padding:5px;">welcome to the simple audio player to play some audio</td>
                        </tr>
                        <tr style="color:rgb(76,175,80);">
                            <td style="border:1px solid black;padding:5px;text-align:center;">&#10004;</td>
                            <td style="border:1px solid black;padding:5px;">tell test player to play</td>
                            <td style="border:1px solid black;padding:5px;">https://feeds.soundcloud.com/stream/</td>
                            <td style="border:1px solid black;padding:5px;">https://feeds.soundcloud.com/stream/309340878-user-652822799-episode-010-building-an-alexa-skill-with-flask-ask-with-john-wheeler.mp3</td>
                        </tr></tbody>
                        </table>
                    </div>
            </div>`;
            // tslint:enable:max-line-length
            assert.equal(virtualDeviceScript.prettifyAsHTML(validatorResult, false), expected);
        });
    });
    describe("#prettifyAsPartialHTML()", () => {
        it("renders correctly scheduled result items", async () => {
            const scripContents = `
"open test player": "welcome to the simple audio player"
"tell test player to play": "https://feeds.soundcloud.com/stream/"
	        `;
            const virtualDeviceScript = new VirtualDeviceScript();
            // tslint:disable:max-line-length
            const expected = `
            <div>
                <p style="font-weight:500;font-size:28px;font-family:'Roboto','Helvetica','Arial',sans-serif;">
                    Validation Script Results<img src='/assets/Spinner.svg' height=34>
                </p>
                <div style="margin:0 0 -18px;" class="output">
                    <p style="font-weight:bold;"class="heading">Output:</p>
                </div>
                <div class="overall">
                    <p style="margin:0 0 -6px;font-weight:bold;" class="heading">Overall:</p>
                    <p class="content" style="color:rgb(76,175,80);">2 tests, 0 succeeded, 0 failed</p>
                </div>
                <div class="time">
                    <p style="margin:0 0 -6px;font-weight:bold;" class="heading">Time:</p>
                    <p class="content"></p>
                </div>
                    <div style="margin-bottom:16px;" class="sequence">
                        <p style="margin:0 0 2px;font-weight:bold;" class="heading">Sequence: 1</p>
                        <table style="border-collapse:collapse;">
                            <thead>
                                <tr>
                                    <th style="border:1px solid black;padding:5px;">Result</th>
                                    <th style="border:1px solid black;padding:5px;">Input</th>
                                    <th style="border:1px solid black;padding:5px;">Expected</th>
                                    <th style="border:1px solid black;padding:5px;">Actual</th>
                                </tr>
                            </thead>
                            <tbody>
                        <tr>
                            <td style="border:1px solid black;padding:5px;text-align:center;"><img src='/assets/Schedule.svg' height=18></td>
                            <td style="border:1px solid black;padding:5px;">open test player</td>
                            <td style="border:1px solid black;padding:5px;">welcome to the simple audio player</td>
                            <td style="border:1px solid black;padding:5px;"></td>
                        </tr>
                        <tr>
                            <td style="border:1px solid black;padding:5px;text-align:center;"><img src='/assets/Schedule.svg' height=18></td>
                            <td style="border:1px solid black;padding:5px;">tell test player to play</td>
                            <td style="border:1px solid black;padding:5px;">https://feeds.soundcloud.com/stream/</td>
                            <td style="border:1px solid black;padding:5px;"></td>
                        </tr></tbody>
                        </table>
                    </div>
            </div>`;
            // tslint:enable:max-line-length
            assert.equal(virtualDeviceScript.prettifyAsPartialHTML(scripContents, [], false), expected);
        });

        it("renders correctly running result items", async () => {
            const scripContents = `
"open test player": "welcome to the simple audio player"
"tell test player to play": "https://feeds.soundcloud.com/stream/"
	        `;
            const virtualDeviceScript = new VirtualDeviceScript();
            // tslint:disable:max-line-length
            const expected = `
            <div>
                <p style="font-weight:500;font-size:28px;font-family:'Roboto','Helvetica','Arial',sans-serif;">
                    Validation Script Results<img src='/assets/Spinner.svg' height=34>
                </p>
                <div style="margin:0 0 -18px;" class="output">
                    <p style="font-weight:bold;"class="heading">Output:</p>
                </div>
                <div class="overall">
                    <p style="margin:0 0 -6px;font-weight:bold;" class="heading">Overall:</p>
                    <p class="content" style="color:rgb(76,175,80);">2 tests, 0 succeeded, 0 failed</p>
                </div>
                <div class="time">
                    <p style="margin:0 0 -6px;font-weight:bold;" class="heading">Time:</p>
                    <p class="content"></p>
                </div>
                    <div style="margin-bottom:16px;" class="sequence">
                        <p style="margin:0 0 2px;font-weight:bold;" class="heading">Sequence: 1</p>
                        <table style="border-collapse:collapse;">
                            <thead>
                                <tr>
                                    <th style="border:1px solid black;padding:5px;">Result</th>
                                    <th style="border:1px solid black;padding:5px;">Input</th>
                                    <th style="border:1px solid black;padding:5px;">Expected</th>
                                    <th style="border:1px solid black;padding:5px;">Actual</th>
                                </tr>
                            </thead>
                            <tbody>
                        <tr>
                            <td style="border:1px solid black;padding:5px;text-align:center;"><img src='/assets/Spinner.svg' height=24></td>
                            <td style="border:1px solid black;padding:5px;">open test player</td>
                            <td style="border:1px solid black;padding:5px;">welcome to the simple audio player</td>
                            <td style="border:1px solid black;padding:5px;"></td>
                        </tr>
                        <tr>
                            <td style="border:1px solid black;padding:5px;text-align:center;"><img src='/assets/Schedule.svg' height=18></td>
                            <td style="border:1px solid black;padding:5px;">tell test player to play</td>
                            <td style="border:1px solid black;padding:5px;">https://feeds.soundcloud.com/stream/</td>
                            <td style="border:1px solid black;padding:5px;"></td>
                        </tr></tbody>
                        </table>
                    </div>
            </div>`;
            // tslint:enable:max-line-length
            const resultItem: IVirtualDeviceValidatorResultItem = {
                status: "running",
                test: {
                    absoluteIndex: 1,
                    comparison: "contains",
                    expected: {
                        transcript: "welcome to the simple audio player",
                    },
                    input: "open test player",
                    sequence: 1,
                    sequenceIndex: 1,
                },
            };
            const resultItems = [resultItem];
            assert.equal(virtualDeviceScript.prettifyAsPartialHTML(scripContents, resultItems, false), expected);
        });

        it("renders correctly done result items", async () => {
            const scripContents = `
"open test player": "welcome to the simple audio player"
"tell test player to play": "https://feeds.soundcloud.com/stream/"
	        `;
            const virtualDeviceScript = new VirtualDeviceScript();
            // tslint:disable:max-line-length
            const expected = `
            <div>
                <p style="font-weight:500;font-size:28px;font-family:'Roboto','Helvetica','Arial',sans-serif;">
                    Validation Script Results<img src='/assets/Spinner.svg' height=34>
                </p>
                <div style="margin:0 0 -18px;" class="output">
                    <p style="font-weight:bold;"class="heading">Output:</p>
                </div>
                <div class="overall">
                    <p style="margin:0 0 -6px;font-weight:bold;" class="heading">Overall:</p>
                    <p class="content" style="color:rgb(76,175,80);">2 tests, 1 succeeded, 0 failed</p>
                </div>
                <div class="time">
                    <p style="margin:0 0 -6px;font-weight:bold;" class="heading">Time:</p>
                    <p class="content"></p>
                </div>
                    <div style="margin-bottom:16px;" class="sequence">
                        <p style="margin:0 0 2px;font-weight:bold;" class="heading">Sequence: 1</p>
                        <table style="border-collapse:collapse;">
                            <thead>
                                <tr>
                                    <th style="border:1px solid black;padding:5px;">Result</th>
                                    <th style="border:1px solid black;padding:5px;">Input</th>
                                    <th style="border:1px solid black;padding:5px;">Expected</th>
                                    <th style="border:1px solid black;padding:5px;">Actual</th>
                                </tr>
                            </thead>
                            <tbody>
                        <tr style="color:rgb(76,175,80);">
                            <td style="border:1px solid black;padding:5px;text-align:center;">&#10004;</td>
                            <td style="border:1px solid black;padding:5px;">open test player</td>
                            <td style="border:1px solid black;padding:5px;">welcome to the simple audio player</td>
                            <td style="border:1px solid black;padding:5px;"></td>
                        </tr>
                        <tr>
                            <td style="border:1px solid black;padding:5px;text-align:center;"><img src='/assets/Schedule.svg' height=18></td>
                            <td style="border:1px solid black;padding:5px;">tell test player to play</td>
                            <td style="border:1px solid black;padding:5px;">https://feeds.soundcloud.com/stream/</td>
                            <td style="border:1px solid black;padding:5px;"></td>
                        </tr></tbody>
                        </table>
                    </div>
            </div>`;
            // tslint:enable:max-line-length
            const resultItem: IVirtualDeviceValidatorResultItem = {
                result: "success",
                status: "done",
                test: {
                    absoluteIndex: 1,
                    comparison: "contains",
                    expected: {
                        transcript: "welcome to the simple audio player",
                    },
                    input: "open test player",
                    sequence: 1,
                    sequenceIndex: 1,
                },
            };
            const resultItems = [resultItem];
            assert.equal(virtualDeviceScript.prettifyAsPartialHTML(scripContents, resultItems, false), expected);
        });
        it("renders correctly failed result items", async () => {
            const scripContents = `
"open test player": "welcome to the simple audio player"
"tell test player to play": "https://feeds.soundcloud.com/stream/"
	        `;
            const virtualDeviceScript = new VirtualDeviceScript();
            // tslint:disable:max-line-length
            const expected = `
            <div>
                <p style="font-weight:500;font-size:28px;font-family:'Roboto','Helvetica','Arial',sans-serif;">
                    Validation Script Results<img src='/assets/Spinner.svg' height=34>
                </p>
                <div style="margin:0 0 -18px;" class="output">
                    <p style="font-weight:bold;"class="heading">Output:</p>
                </div>
                <div class="overall">
                    <p style="margin:0 0 -6px;font-weight:bold;" class="heading">Overall:</p>
                    <p class="content" style="color:rgb(244,67,54);">2 tests, 0 succeeded, 1 failed</p>
                </div>
                <div class="time">
                    <p style="margin:0 0 -6px;font-weight:bold;" class="heading">Time:</p>
                    <p class="content"></p>
                </div>
                    <div style="margin-bottom:16px;" class="sequence">
                        <p style="margin:0 0 2px;font-weight:bold;" class="heading">Sequence: 1</p>
                        <table style="border-collapse:collapse;">
                            <thead>
                                <tr>
                                    <th style="border:1px solid black;padding:5px;">Result</th>
                                    <th style="border:1px solid black;padding:5px;">Input</th>
                                    <th style="border:1px solid black;padding:5px;">Expected</th>
                                    <th style="border:1px solid black;padding:5px;">Actual</th>
                                </tr>
                            </thead>
                            <tbody>
                        <tr style="color:rgb(244,67,54);">
                            <td style="border:1px solid black;padding:5px;text-align:center;">&#10008;</td>
                            <td style="border:1px solid black;padding:5px;">open test player</td>
                            <td style="border:1px solid black;padding:5px;">welcome to the simple audio player</td>
                            <td style="border:1px solid black;padding:5px;"></td>
                        </tr>
                        <tr>
                            <td style="border:1px solid black;padding:5px;text-align:center;"><img src='/assets/Schedule.svg' height=18></td>
                            <td style="border:1px solid black;padding:5px;">tell test player to play</td>
                            <td style="border:1px solid black;padding:5px;">https://feeds.soundcloud.com/stream/</td>
                            <td style="border:1px solid black;padding:5px;"></td>
                        </tr></tbody>
                        </table>
                    </div>
            </div>`;
            // tslint:enable:max-line-length
            const resultItem: IVirtualDeviceValidatorResultItem = {
                result: "failure",
                status: "done",
                test: {
                    absoluteIndex: 1,
                    comparison: "contains",
                    expected: {
                        transcript: "welcome to the simple audio player",
                    },
                    input: "open test player",
                    sequence: 1,
                    sequenceIndex: 1,
                },
            };
            const resultItems = [resultItem];
            assert.equal(virtualDeviceScript.prettifyAsPartialHTML(scripContents, resultItems, false), expected);
        });
    });
});
