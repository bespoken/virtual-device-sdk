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
        it("success", async () => {
		const tests = [
			{input: "tell we study billionaires to play",
			comparison: "",
			expectedTranscript: undefined,
			expectedStreamURL: ""}];
		const silentEchoValidator = new SilentEchoValidator(token);
		const validatorResults = await silentEchoValidator.execute(tests);
		for (const validatorResult of validatorResults) {
			assert.isUndefined(validatorResult.error);
		}
        });
    });
});
