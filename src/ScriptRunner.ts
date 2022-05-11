#!/usr/bin/env node

import * as dotenv from "dotenv";
import * as fs from "fs";
import * as Path from "path";
import {ConsolePrinter} from "./ConsolePrinter";
import {VirtualDeviceScript} from "./VirtualDeviceScript";

dotenv.config();

const TestRunner = {
    addTokens: (script: VirtualDeviceScript) => {
        for (const key of Object.keys(process.env)) {
            if (key.startsWith("token.") || key.startsWith("replace.")) {
                const value = process.env[key] as string;
                const token = key.substr(key.indexOf(".") + 1);
                console.log("Replacing token: " + token + " with: " + value);
                script.findReplace(token, value);
            }
        }
    },
    run: (path?: string) => {
        const script = new VirtualDeviceScript(process.env.VIRTUAL_DEVICE_TOKEN as string,
            process.env.BESPOKEN_USER_ID as string, (process.env.BATCH_MODE !== undefined));
        TestRunner.addTokens(script);

        script.on("result", (error, resultItem) => {
            console.log("ResultItem: " + JSON.stringify(resultItem, null, 2));
        });

        const printer = new ConsolePrinter();

        // We may or may not have an argument passed
        // If we do, it is either a file or directory
        // If it is a directory, we run all the tests in it
        // If it is a file, we run that one test
        let directory = ".";
        let fileTest: string | undefined;
        if (path) {
            if (!fs.existsSync(path)) {
                throw new Error(Path.resolve(path) + " does not exist");
            }

            if (fs.statSync(path).isDirectory()) {
                directory = path;
            } else {
                fileTest = path;
            }
        }

        if (fileTest) {
            console.log("Running Test:" + fileTest);
            script.executeFile(fileTest).then((result) => {
                console.log(printer.printResult(fileTest as string, result));
                if (result.result !== "success") {
                    process.exit(1);
                }
            });
        } else {
            console.log("Running Tests from: " + Path.resolve(directory));
            script.executeDir(directory).then((results) => {
                console.log(printer.printResultsByFile(results));
                for (const resultFile of Object.keys(results)) {
                    const result = results[resultFile];
                    if (result.result !== "success") {
                        process.exit(1);
                    }
                }
            });
        }
    },
};

process.on("unhandledRejection", (error) => {
    console.log("unhandledRejection", error);
});

if (process.argv.length < 3) {
    console.log("");
    console.log("Bespoken Virtual Device test runner installed!");
    console.log("");
    process.exit(0);
}

const file = process.argv.length > 2 ? process.argv[2] : undefined;
TestRunner.run(file);
