[![CircleCI](https://circleci.com/gh/bespoken/virtual-device-sdk.svg?style=svg)](https://circleci.com/gh/bespoken/virtual-device-sdk)
[![codecov](https://codecov.io/gh/bespoken/virtual-device-sdk/branch/master/graph/badge.svg)](https://codecov.io/gh/bespoken/virtual-device-sdk)
[![npm](https://img.shields.io/npm/v/virtual-device-sdk.svg)](https://www.npmjs.com/package/virtual-device-sdk)

# Virtual Device SDK
Use the Virtual Device SDK to test Alexa without using our voice.

The SDK can be used via [NodeJS](#nodejs-sdk) or [HTTP](#http-sdk).

You can also write simple test scripts if you are not a programmer - [learn about them here](docs/test_scripts.md).

# NodeJS SDK
## Installation
1. Add the Virtual Device SDK to your project:
    ```bash
    npm install virtual-device-sdk --save
    ```
2. Get your token: Follow the instructions [here](/docs/setup.md).

## Sending a Message
Here is a simple example in Javascript:
```javascript
const vdSDK = require("virtual-device-sdk");
const locale = "en-US";
const voiceId = "Joey"
const virtualDevice = new vdSDK.VirtualDevice("<PUT_YOUR_TOKEN_HERE>", locale, voiceId);
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

To use it, first get your token: Follow the instructions [here](/docs/setup.md).

## Requests
The Base URL is:  
https://virtual-device.bespoken.io

### **Process**

  Takes a single message and returns the AVS response in text form.
* **URL**

  /process

* **Method:**
  
  `GET` 
  
*  **URL Params**

   **Required:**
 
   `message=[string]`: the message that we want to send to Alexa
   
   `user_id=[string]`: "validation token" obtained from Bespoken Dashboard (http://apps.bespoken.io/dashboard)
   
   
   **Optional:**
 
   `language_code=[string]`: one of Alexa's supported locales (e.g. en-US, de-DE, etc.). Default value: "en-US". Taken from https://developer.amazon.com/docs/custom-skills/develop-skills-in-multiple-languages.html#h2-code-changes
   
   `voice_id=[string]`: one of Amazon Polly's supported voices (e.g. Joey, Vicki, Hans, etc.). Default value: "Joey". MUST correspond with the language_code. Taken from: https://docs.aws.amazon.com/polly/latest/dg/voicelist.html

	`phrases=[string]`: a word or phrase used as a hint so that the speech recognition is more likely to recognize them as part of the alexa response. You can use this multiple times in the query string to send more than one.

* **Success Response:**
  

  * **Code:** 200 <br />
    **Content:** 
	```json
	 {
            "streamURL": "string",
            "sessionTimeout": 0,
            "transcriptAudioURL": "string",
            "message": "string",
            "transcript": "string",
            "card": {
                "subTitle": "string",
                "mainTitle": "string",
                "textField": "string",
                "type": "string",
                "imageURL": "string"
            }
        }
	```
   
 
* **Error Response:**

  * **Code:** 400 BAD REQUEST <br />
    **Content:** `"message is required"`

  * **Code:** 400 BAD REQUEST <br />
    **Content:** `"user_id is required"`

  * **Code:** 400 BAD REQUEST <br />
    **Content:** `"Invalid user_id"`

  * **Code:** 500 INTERNAL SERVER ERROR <br />
    **Content:** `{error: 'error message in case of an exception'}`
 

* **Sample Call:**
```
curl "http://virtual-device.bespoken.io/process?message="what time is it"&user_id=<your user id>&voice_id=Joey&language_code=en-US" ; 
```

* **Notes:**

  * Not sending the language_code or voice_id will default **both** to en-US and Joey. 
  

### **Batch process**

Receives multiple messages and expected phrases in an object array. The goal of this endpoint to handle a complete interaction with Alexa. By sending all messages to the endpoint, it is able to sequence them faster, avoiding session timeouts.

* **URL**

  /batch_process

* **Method:**
  
 `POST` 
  
*  **URL Params**

   **Required:**
 
      `user_id=[string]`: "validation token" obtained from Bespoken Dashboard (http://apps.bespoken.io/dashboard)

   **Optional:**
 
   `language_code=[string]`: one of Alexa's supported locales (e.g. en-US, de-DE, etc.). Default value: "en-US". Taken from https://developer.amazon.com/docs/custom-skills/develop-skills-in-multiple-languages.html#h2-code-changes
   
   `voice_id=[string]`: one of Amazon Polly's supported voices (e.g. Joey, Vicki, Hans, etc.). Default value: "Joey". MUST correspond with the language_code. Taken from: https://docs.aws.amazon.com/polly/latest/dg/voicelist.html

* **Data Params**

   **Required:**
 
    `messages=[array]`: object array where each object's "text" field is a required property that represents the message sent to Alexa and each "phrases" property is an optional array of strings representing words or phrases used as hint for the speech recognition library to recognize them better.

    ```json
    {
      "messages": [
        {"text":"string", "phrases":["string"]}
      ]
    }
    ```

* **Success Response:**
  

  * **Code:** 200 <br />
    **Content:** 
	```javascript
	{
	    "results": [
		    {
		       "streamURL": "string",
		       "sessionTimeout": 0,
		       "transcriptAudioURL": "string",
		       "message": "string",
		       "transcript": "string",
		       "card": {
		           "subTitle": "string",
		           "mainTitle": "string",
		           "textField": "string",
		           "type": "string",
		           "imageURL": "string"
			       }
		      }
	   ]
	}
	```
 
* **Error Response:**
	* **Code:** 400 BAD REQUEST <br />
    **Content:** `"Invalid message"`

  * **Code:** 400 BAD REQUEST <br />
    **Content:** `"Invalid user_id"`

  * **Code:** 500 INTERNAL SERVER ERROR <br />
    **Content:** `{error: 'error message in case of an exception'}`

* **Sample Call:**

    ```javascript
    const userId = <your user id>;
    const voiceId = "Joey";
    const languageCode = "en-US":

    $.post(`https://virtual-device.bespoken.io/batch_process?user_id=${userId}&voice_id=${voiceId}&language_code=${languageCode}`,  
    {  
        "messages": [
            {"text":"open guess the price", "phrases":["how many persons"]},
            {"text":"one"} 
        ]
    },  
    function(data, status){  
        console.log("Got: " + data.results.length + " responses!");  
    });
    ```

* **Notes:**

  * Not sending the language_code or voice_id will default **both** to en-US and Joey. 
  


# What's Next
* Keep the session open longer for deep skill interactions
* Support for additional languages, platforms and locales - as well as a new Premium tier
