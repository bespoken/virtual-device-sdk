[![CircleCI](https://circleci.com/gh/bespoken/virtual-device-sdk.svg?style=svg)](https://circleci.com/gh/bespoken/virtual-device-sdk)
[![codecov](https://codecov.io/gh/bespoken/virtual-device-sdk/branch/master/graph/badge.svg)](https://codecov.io/gh/bespoken/virtual-device-sdk)
[![npm](https://img.shields.io/npm/v/virtual-device-sdk.svg)](https://www.npmjs.com/package/virtual-device-sdk)

# Virtual Device SDK
Use the Virtual Device SDK to test Alexa without using our voice.

The SDK can be used via [NodeJS](#nodejs-sdk) or [HTTP](#http-sdk).

# NodeJS SDK
## Installation
Add the Virtual Device SDK to your project:
```bash
npm install virtual-device-sdk --save
```

Get your token:
* Sign into the [Bespoken Dashboard](https://apps.bespoken.io/dashboard)
* Create a source
* Select the Validation tab and follow the instructions there


Save the token that is generated - you will use it in the step below.

## Sending a Message
Here is a simple example in Javascript:
```javascript
const vdSDK = require("virtual-device-sdk");
const virtualDevice = new vdSDK.VirtualDevice("<PUT_YOUR_TOKEN_HERE>");
virtualDevice.message(message).then((result) => {
    console.log("Reply Transcript: " + result.transcript);
    console.log("Reply Audio: " + result.transcript_audio_url);
});
```

## Result Payload
Here is the full result payload:
```
export interface IVirtualDeviceResult {
    card: ICard | null;
    debug?: {
        rawJSON: any;
    };
    sessionTimeout: number;
    streamURL: string | null;
    transcript: string;
    transcriptAudioURL: string;
}

export interface ICard {
    imageURL: string | null;
    mainTitle: string | null;
    subTitle: string | null;
    textField: string;
    type: string;
}
```

# HTTP SDK
The VirtualDevice service can also be called directly via HTTP.

## Pre-Requisites
Get a Virtual Device Token:
[https://virtual-device.bespoken.io/link_account?token=true](https://virtual-device.bespoken.io/link_account?token=true)

Save the token - you will use it when call the HTTP interface.

## Requests
The Base URL is:  
https://virtual-device.bespoken.io

* /process
  * Method: GET
  * Parameters:
    * user_id: string - VirtualDevice token
    * message: string - The message to send to VirtualDevice
    * debug: string [Optional] - If set, returns debug output
  * Response:
    * Status: 200 (If successful)
    * Payload: JSON conforming to [this description](#result-payload)

## Example
HTTP Request:
```
https://virtual-device.bespoken.io/process
    ?user_id=<TOKEN>
    &message=hello there
```

HTTP Response:
```
{
    "card": null,
    "sessionTimeout": 0,
    "streamURL": null,
    "transcript": "hi",
    "transcriptAudioURL": "https://storage.googleapis.com/raw_audio/7898e6fb-2d3d-4039-9b4a-00641fa1c249.mp3"
}
```

# What's Next
* Keep the session open longer for deep skill interactions
* Support for additional languages, platforms and locales - as well as a new Premium tier
