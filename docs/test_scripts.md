# Using the Virtual Device Test Scripts
## Background
The Virtual Device Test Scripts are meant to make it easy for anyone to write automated tests for Alexa (and Google Assistant, soon).

They use a simple YAML syntax for allowing anyone to write complex (but still readable) end-to-end tests.

## Installation
### Prerequisites
* [npm](https://www.npmjs.com/get-npm)

### Install
```
npm install virtual-device-sdk -g
```

To test to see if it is installed correctly, then try typing:
```
bvd
```

You should see output like this:
```
Bespoken Virtual Device test runner installed!
```
That means it was installed successfully!

## Configuration
### Virtual Device Token
First, you need to get a token. See [here for instructions](token_guide.md).  

### Environment Variables
Create a file ".env" where you run the scripts.

This is where you will keep the token.

By default, the token will be stored as:
```
VIRTUAL_DEVICE_TOKEN=<MY_TOKEN_VALUE>
```

If the tests use more than one token, they will be selected based on the locality appended at the end:
```
VIRTUAL_DEVICE_TOKEN.DE-DE=<DE_DE_TOKEN_VALUE>
VIRTUAL_DEVICE_TOKEN.EN-GB=<EN_GB_TOKEN_VALUE>
VIRTUAL_DEVICE_TOKEN.EN-US=<EN_US_TOKEN_VALUE>
```

### Find/Replace Values
Additionally, find/replace values can be specified in the .env file.

They will look like this:
```
token.INVOCATION_NAME=invoke me
```

This will cause any instances of the value INVOCATION_NAME to be replaced by Invoke Me in the test scripts.

So a script that looks like this:
```
"open INVOCATION_NAME and say hello": "*"
```

Will be turned into this:
```
"open invoke me and say hello": "*"
```

This is a useful feature for tests that are run against multiple instances of the same skill, where there are slight variations in the input or output.


## Test Structure
### Configuration
The first line in a test can optional be the config. It should look like this:  
```
config:
  voiceID: <The Polly Voice ID to use for TTS>
```

### Test Sequences
Each set of lines represents a sequence of tests, as part of one conversation.

A blank line represents a new sequence

### Tests
A test contains an input and an expected output.

The input is on the left-hand side, and the expected output is on the right-hand side.

The expected output can be:
* A simple string test
* A list
* An object test

#### String tests
A string test does a comparison on the expected output. It has the following rules:  
1\) It is a "contains" test - that is, if the actual result contains the expected, that is a pass.
  
So, a test like this:   
```
"hi": "hello"
```

Will pass when the actual result is "hello there".  
It will not pass if the result is "hell".

2\) It supports wildcards with a *
A test like this:
```
"hi": "hello * welcome back"
```
Will pass when the actual result is "hello john welcome back" or "hello frank welcome back".  
It will not pass if the result is "hellowelcome back".

#### List tests
A list test is a set of string tests, but allows for multiple valid responses. 

A list is specified on a newline, with a two-space indent, and starts with "-".

This is useful for skills that vary their response to the same input. For example:
```
"hi":
  - hi there
  - welcome
  - howdy
```

If our skill alternates between responding to hi with "hi there", "welcome", and "howdy",
this will ensure that it will pass no matter what is returned.  

Wildcards and partial matches are supported with lists, same as with string tests.

#### Object tests
An object test allows for testing more than just the transcript. Here is a sample:
```
"hi":
  transcript: hi there
  streamURL: https://mystream.com/stream.mp3
  card:
    imageURL: The image URL
    mainTitle: The main title
    subTitle: The sub title
    textField: The text field
    type: The type of the card
```
The values for the card are based on what AVS returns, so they vary in their names from the Alexa Custom Skills JSON. 
Their values are fairly simple to map between skills and AVS though.

Additionally, the imageURL always returns the large image URL.
