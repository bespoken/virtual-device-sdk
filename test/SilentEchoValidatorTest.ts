import {assert} from "chai";
import * as dotenv from "dotenv";
import {SilentEchoValidator} from "../src/SilentEchoValidator";

describe("SilentEchoValidator", function() {
    this.timeout(20000);
    let token: string;
    before(() => {
        dotenv.config();
        if (process.env.TEST_TOKEN) {
            token = process.env.TEST_TOKEN as string;
        } else {
            assert.fail("No TEST_TOKEN defined");
        }
    });
    describe("#execute()", () => {
        it.skip("success", async () => {
		const tests = [
			{input: "Alexa open we study billionaires",
			comparison: "contains",
			expectedTranscript: "we study billionaires in this " +
			"is the investors podcast our show is all about " +
			"studying and most important books and ideas that " +
			"billionaires say influenced them the most thanks " +
			"for joining us to navigate to show you can say play " +
			"Scan titles or about the show",
			expectedStreamURL: undefined},
			{input: "Alexa tell we study billionaires to play",
			comparison: "contains",
			expectedTranscript: undefined,
			expectedStreamURL: "https://dts.podtrac.com/redirect.mp3/rss.art19.com/episodes"},
		];
		const silentEchoValidator = new SilentEchoValidator(token);
		const validatorResults = await silentEchoValidator.execute(tests);
		for (const validatorResult of validatorResults) {
			assert.equal(validatorResult.result, "success", `${JSON.stringify(validatorResult)}`);
		}
        });
	it.skip("failure", async () => {
		const tests = [
			{input: "Alexa open we study billionaires",
			comparison: "contains",
			expectedTranscript: "wrong transcript",
			expectedStreamURL: undefined},
		];
		const silentEchoValidator = new SilentEchoValidator(token);
		const validatorResults = await silentEchoValidator.execute(tests);
		for (const validatorResult of validatorResults) {
			assert.equal(validatorResult.result, "failure", `${JSON.stringify(validatorResult)}`);
		}
	});
    });
});
