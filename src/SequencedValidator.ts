import {
    IVirtualDeviceTestSequence,
    IVirtualDeviceValidatorResult,
    IVirtualDeviceValidatorResultItem,
    Validator,
    ValidatorError,
    VirtualDeviceValidator,
} from "./VirtualDeviceValidator";

export class SequencedValidator extends VirtualDeviceValidator {
    protected async executeSequence(
        sequence: IVirtualDeviceTestSequence,
        result: IVirtualDeviceValidatorResult,
        context?: any): Promise<void> {
        const virtualDevice = this.virtualDevice(sequence);

        // Reset the session before each sequence
        await virtualDevice.waitForSessionToEnd();

        for (const test of sequence.tests) {
            try {
                const resultItem: IVirtualDeviceValidatorResultItem = { test };
                resultItem.status = "running";
                const validator: Validator = new Validator(resultItem, undefined);
                this.emit("message", undefined, validator.resultItem, context);

                let phrases: string[] = [];
                if (test.expected && test.expected.transcript) {
                    if (Array.isArray(test.expected.transcript)) {
                        phrases = test.expected.transcript as string[];
                    } else if (test.expected.transcript) {
                        phrases.push(test.expected.transcript);
                    }
                }

                resultItem.actual = await virtualDevice.message(test.input, false, phrases, test.sequenceIndex === 1);
                const errors = validator.check();
                validator.resultItem.errors = errors;
                if (validator.resultItem && errors.length === 0) {
                    validator.resultItem.result = "success";
                } else {
                    validator.resultItem.result = "failure";
                }
                validator.resultItem.status = "done";
                result.tests.push(validator.resultItem);
                this.emit("result", undefined, validator.resultItem, context);
            } catch (err) {
                const resultItem: IVirtualDeviceValidatorResultItem = { test };
                const validator: Validator = new Validator(resultItem, err);
                validator.resultItem.result = "failure";
                validator.resultItem.status = "done";
                const error = new ValidatorError(test.input, undefined, undefined, `SystemError: ${err.message}`);
                validator.resultItem.errors = [error];
                result.tests.push(validator.resultItem);
                this.emit("result", undefined, validator.resultItem, context);
            }
        }
    }

}
