# Silent Echo SDK
Use the Silent Echo SDK to build UIs and bots that interact with Alexa via text.

Check out our first example project to use it - [SilentEchoBot](https://github.com/bespoken/silent-echo-bot)!  
Add SilentEcho to your Slack - [try it here](https://silentechobot.bespoken.io/slack_auth)!

# Installation
Add the Silent Echo SDK to your project:  
```
npm install silent-echo-sdk --save
```
# Sending a Message
Here is a simple example in Javascript:
```javascript
const echoSDK = require("silent-echo-sdk");
const silentEcho = new echoSDK.SilentEcho("<ASK_US_HOW_TO_GET_YOUR_TOKEN>");
silentEcho.message(message).then((result) => {
    console.log("Reply Transcript: " + result.transcript);
    console.log("Reply Audio: " + result.transcript_audio_url);
});
```

Here is the full result payload:
```
export interface ISilentResult {
    transcript: string;
    transcript_audio_url: string;
    stream_url: string;
}
```

# What's Next
More bots. Lots of 'em.
