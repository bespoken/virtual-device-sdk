[![CircleCI](https://circleci.com/gh/bespoken/silent-echo-sdk.svg?style=svg)](https://circleci.com/gh/bespoken/silent-echo-sdk)
[![codecov](https://codecov.io/gh/bespoken/silent-echo-sdk/branch/master/graph/badge.svg)](https://codecov.io/gh/bespoken/silent-echo-sdk)
[![npm](https://img.shields.io/npm/v/silent-echo-sdk.svg)](https://www.npmjs.com/package/silent-echo-sdk)

# Silent Echo SDK
Use the Silent Echo SDK to build UIs and bots that interact with Alexa via text.

Check out our first example project to use it - [SilentEchoBot](https://github.com/bespoken/silent-echo-bot)!  
Add SilentEcho to your Slack - [try it here](https://silentechobot.bespoken.io/slack_auth).

The SDK can be used via [NodeJS](#nodejs-sdk) or [HTTP](#http-sdk).

# NodeJS SDK
## Installation
Add the Silent Echo SDK to your project:  
```bash
npm install silent-echo-sdk --save
```
Get your token:  
[https://silentecho.bespoken.io/link_account?token=true](https://silentecho.bespoken.io/link_account?token=true)

Save the token that is generated - you will use it in the step below.

## Sending a Message
Here is a simple example in Javascript:
```javascript
const echoSDK = require("silent-echo-sdk");
const silentEcho = new echoSDK.SilentEcho("<PUT_YOUR_TOKEN_HERE>");
silentEcho.message(message).then((result) => {
    console.log("Reply Transcript: " + result.transcript);
    console.log("Reply Audio: " + result.transcript_audio_url);
});
```

## Result Payload
Here is the full result payload:
```
export interface ISilentResult {
    card: ICard | null;
    debug?: {
        raw_json: any;
    };
    session_timeout: number;
    stream_url: string | null;
    transcript: string;
    transcript_audio_url: string;
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
The SilentEcho service can also be called directly via HTTP.

## Pre-Requisites
Get a SilentEcho Token:  
[https://silentecho.bespoken.io/link_account?token=true](https://silentecho.bespoken.io/link_account?token=true)

Save the token - you will use it when call the HTTP interface.

## Requests
The Base URL is:  
https://silentecho.bespoken.io

* /process
  * Method: GET
  * Parameters:
    * user_id: string - SilentEcho token
    * message: string - The message to send to Echo
    * debug: string [Optional] - If set, returns debug output
  * Response:
    * Status: 200 (If successful)
    * Payload: JSON conforming to [this description](#result-payload)

## Example
HTTP Request:
```
https://silentecho.bespoken.io/process
    ?user_id=<TOKEN>
    &message=hello there
```

HTTP Response:
```
{
    "card": null,
    "session_timeout": 0,
    "stream_url": null,
    "transcript": "hi",
    "transcript_audio_url": "https://storage.googleapis.com/raw_audio/7898e6fb-2d3d-4039-9b4a-00641fa1c249.mp3"
}
```

# What's Next
* Keep the session open longer for deep skill interactions
* More bots. Lots of 'em.
