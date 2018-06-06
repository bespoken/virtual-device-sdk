import {IMessage} from "./VirtualDevice";

import {
    IVirtualDeviceTestSequence,
    IVirtualDeviceValidatorResult,
    IVirtualDeviceValidatorResultItem,
    Validator,
    ValidatorError,
    VirtualDeviceValidator,
} from "./VirtualDeviceValidator";

export class BatchValidator extends VirtualDeviceValidator {
    protected async executeSequence(sequence: IVirtualDeviceTestSequence,
                                    result: IVirtualDeviceValidatorResult,
                                    context?: any): Promise<void> {
        const virtualDevice = this.virtualDevice(sequence);
        // Reset the session before each sequence
        await virtualDevice.waitForSessionToEnd();

        const messages = [];
        // Do one pass on the sequence to turn the tests into messages to send to the virtual device
        // Each message has the input and the expected response phrases
        for (const test of sequence.tests) {
            const message: IMessage = {
                text: test.input,
            };

            if (test.expected && test.expected.transcript) {
                if (Array.isArray(test.expected.transcript)) {
                    message.phrases = test.expected.transcript;
                } else {
                    message.phrases = [];
                    message.phrases.push(test.expected.transcript as string);
                }
            }
            messages.push(message);
        }

        let results;
        try {
            results = await virtualDevice.batchMessage(messages);
        } catch (e) {
            result.result = "failure";
            result.errorMessage = e.toString();
            const test = sequence.tests[0];
            const resultItem: IVirtualDeviceValidatorResultItem = {test};
            resultItem.result = "failure";
            resultItem.status = "done";
            resultItem.errors = [new ValidatorError(test.input, undefined, undefined, `SystemError: ${e.message}`)];
            result.tests = [resultItem];
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
