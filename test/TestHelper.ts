import {VirtualDevice} from "../src/VirtualDevice";

export class TestHelper {
    public static virtualDevice(): VirtualDevice {
        const sdk = new VirtualDevice(process.env.TEST_TOKEN as string);
        sdk.baseURL = process.env.VIRTUAL_DEVICE_BASE_URL
            ? process.env.VIRTUAL_DEVICE_BASE_URL
            : "https://virtual-device.bespoken.io";
        return sdk;
    }
}
