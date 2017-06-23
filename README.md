# Silent Echo SDK
Use the Silent Echo SDK to build UIs and bots that interact with Alexa via text.

# Installation
Add the Silent Echo SDK to your project:  
```
npm install silent-echo-sdk --save
```
# Sending a Message
const silentEcho = new SilentEcho("<ASK_US_HOW_TO_GET_YOUR_TOKEN>");
silentEcho.message(message).then((result: ISilentResult) => {
    console.log("SentMessageToSilentEcho");
    console.log("Reply: " + result.transcript);
});

More info to come!
