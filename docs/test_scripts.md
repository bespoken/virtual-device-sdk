# Using the Virtual Device Test Scripts
## Background
The Virtual Device Test Scripts are meant to make it easy for anyone to write automated tests for Alexa (and Google Assistant, soon).

They use a simple YAML syntax for allowing anyone to write complex (but still readable) end-to-end tests.
 
* [Installation](#installation)
* [Configuration](#configuration)
* [Test Structure](#test-file-structure)
  * [Test-Specific Configuration](#test-specific-configuration)
  * [Test Sequences](#test-sequences)
  * [Comments](#comments)
* [Test Syntax](#test-syntax)
  * [String Comparisons](#string-comparisons)
  * [List Comparisons](#list-comparisons)
  * [Object Comparisons](#object-comparisons)
* [Running Tests](#running-tests)
* [Best Practices](#best-practices)

## Installation
### Prerequisites
* [npm](https://www.npmjs.com/get-npm)

### Install
```bash
npm install virtual-device-sdk -g
```

To test to see if it is installed correctly, then try typing:
```bash
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
VIRTUAL_DEVICE_TOKEN_DE_DE=<DE_DE_TOKEN_VALUE>
VIRTUAL_DEVICE_TOKEN_EN_GB=<EN_GB_TOKEN_VALUE>
VIRTUAL_DEVICE_TOKEN_EN_US=<EN_US_TOKEN_VALUE>
```

### Find/Replace Values
Additionally, find/replace values can be specified in the .env file.

They will look like this:
```
replace.INVOCATION_NAME=invoke me
```

This will cause any instances of the value INVOCATION_NAME to be replaced by Invoke Me in the test scripts.

So a script that looks like this:
```yaml
"open INVOCATION_NAME and say hello": "*"
```

Will be turned into this:
```yaml
"open invoke me and say hello": "*"
```

This is a useful feature for tests that are run against multiple instances of the same skill, where there are slight variations in the input or output.


## Test File Structure
Tests go into files with a suffix ".yml". One or many tests can be contained in each test.

### Test-Specific Configuration
The test file can optionally have a config section, which contains setup data about the test. It looks like this:  
```yaml
config:
  voiceID: <The Polly Voice ID to use for TTS>
  locale: <en-US, en-GB, de-DE, etc.>
```

This is a place to put things that vary between sets of tests - such as the voice to use for Speech-To-Text or the locale.

The list of available voices is [found here](https://docs.aws.amazon.com/polly/latest/dg/voicelist.html).

### Test Sequences
Each set of lines represents a sequence of tests, which represent a conversation with Alexa.
As long as the tests are part of one sequence, the skill will stay in-session.

A blank line represents a new sequence (and therefore, a new session). Here is an example test file:
```yaml
config:
  voiceID: Matthew
  locale: en-US
  
# Sequence 01. Test scenario: launch and play music
"open test player": "say play to listen to some music"
"play":
  streamURL: "https://stream.com/music.mp3"

# Sequence 02. Test scenario: straight to play intent
tell test player to play:
  streamURL: "https://stream.com/music.mp3"
```

This test file has two test sequences, with two tests in the first sequence, and one test in the second sequence.

### Comments
Comments can be inserted in tests by putting a `#` at the start of the line, as seen in the example above.

## Test Syntax
A test contains an input and an expected output.

The input is on the left-hand side, and the expected output is on the right-hand side.

The expected output can be:
* A simple string test
* A list
* An object test

### String comparisons
A string comparison compares the actual to the expected output. It has the following rules:  
1\) It is a "contains" test - that is, if the actual result contains the expected, that is a pass.
  
So, a test like this:   
```yaml
"hi": "hello"
```

Will pass when the actual result is "hello there".  
It will not pass if the result is "hell".

2\) It supports wildcards with a *
A test like this:
```yaml
"hi": "hello * welcome back"
```
Will pass when the actual result is "hello john welcome back" or "hello frank welcome back".  
It will not pass if the result is "hellowelcome back".

### List comparisons
A list comparison is a set of string tests, but allows for multiple valid responses. 

A list is specified on a newline, with a two-space indent, and starts with "-".

This is useful for skills that vary their response to the same input. For example:
```yaml
"hi":
  - hi there
  - welcome
  - howdy
```

If our skill alternates between responding to hi with "hi there", "welcome", and "howdy",
this will ensure that it will pass no matter what is returned.  

Wildcards and partial matches are supported with lists, same as with string tests.

### Object comparisons
An object comparisons allows for testing more than just the transcript. Here is a sample:
```yaml
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

## Running Tests
Once you have created your tests, you can run a particular file by entering:
```bash
bvd my-test-file.yml
```

To run a directory containing many tests, provide the directory path instead:
```bash
bvd test-directory
```

That command will run all yml files that are contained within that directory.

## Best Practices
We recommend:
* Organizing sets of test files by locale - so one top-level directory per locale (en-US, de-DE, etc.)
* Organizing test files by intent - so each intent has its own set of tests
* Commenting tests to explain what they do
* Putting tests under some sort of version control (whether it be Github or Dropbox)

