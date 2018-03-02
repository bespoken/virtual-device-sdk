import {
    IVirtualDeviceTestSequence,
    IVirtualDeviceValidatorResult, IVirtualDeviceValidatorResultItem, Validator,
    VirtualDeviceValidator,
} from "./VirtualDeviceValidator";

export class BatchValidator extends VirtualDeviceValidator {
    protected async executeSequence(sequence: IVirtualDeviceTestSequence,
                                    result: IVirtualDeviceValidatorResult,
                                    context?: any): Promise<void> {
        const virtualDevice = this.virtualDevice(sequence);
        // Reset the session before each sequence
        await virtualDevice.resetSession();

        const messages = [];
        // Do one pass on the sequence
        for (const test of sequence.tests) {
            messages.push(test.input);
        }

        let results;
        try {
            results = await virtualDevice.batchMessage(messages);
        } catch (e) {
            result.result = "failure";
            result.errorMessage = e.toString();
            return;
        }

        // Do another pass, to match the replies from the virtual device to the tests
        for (let i = 0; i < sequence.tests.length; i++ ) {
            const test = sequence.tests[i];

            const resultItem: IVirtualDeviceValidatorResultItem = {test};
            resultItem.actual = results[i];
            const validator: Validator = new Validator(resultItem, undefined);
            const errors = validator.check();

            resultItem.errors = errors;
            if (errors.length === 0) {
                resultItem.result = "success";
            } else {
                resultItem.result = "failure";
            }
            validator.resultItem.status = "done";
            result.tests.push(resultItem);

            // Send a notification for each result:
            this.emit("result", undefined, validator.resultItem, context);
        }
    }
}
