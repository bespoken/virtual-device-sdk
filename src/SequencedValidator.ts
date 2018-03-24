import {
    IVirtualDeviceTestSequence, IVirtualDeviceValidatorResult, IVirtualDeviceValidatorResultItem, Validator,
    VirtualDeviceValidator,
} from "./VirtualDeviceValidator";

export class SequencedValidator extends VirtualDeviceValidator {
    protected async executeSequence(sequence: IVirtualDeviceTestSequence,
                                    result: IVirtualDeviceValidatorResult,
                                    context?: any): Promise<void> {
        const virtualDevice = this.virtualDevice(sequence);

        // Reset the session before each sequence
        await virtualDevice.resetSession(sequence.locale);

        for (const test of sequence.tests) {
            try {
                const resultItem: IVirtualDeviceValidatorResultItem = {test};
                resultItem.status = "running";
                const validator: Validator = new Validator(resultItem, undefined);
                this.emit("message", undefined, validator.resultItem, context);
                resultItem.actual = await virtualDevice.message(test.input);
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
                const resultItem: IVirtualDeviceValidatorResultItem = {test};
                const validator: Validator = new Validator(resultItem, err);
                validator.resultItem.result = "failure";
                validator.resultItem.status = "done";
                result.tests.push(validator.resultItem);
                this.emit("result", undefined, validator.resultItem, context);
            }
        }
    }

}
