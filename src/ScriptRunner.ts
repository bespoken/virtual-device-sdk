import * as dotenv from "dotenv";
import * as fs from "fs";
import * as Path from "path";
import {ConsolePrinter} from "./ConsolePrinter";
import {VirtualDeviceScript} from "./VirtualDeviceScript";

dotenv.config();

const TestRunner = {
    checkEnvironment: (name: string) => {
        if (!process.env[name]) {
            throw new Error(name + " environment variable must be set");
        }
    },
    run: (path?: string) => {
        TestRunner.checkEnvironment("BESPOKEN_USER_ID");
        TestRunner.checkEnvironment("INVOCATION_NAME");
        TestRunner.checkEnvironment("VIRTUAL_DEVICE_TOKEN");

        const script = new VirtualDeviceScript(process.env.VIRTUAL_DEVICE_TOKEN as string,
            process.env.BESPOKEN_USER_ID as string);
        script.findReplace("INVOCATION_NAME", process.env.INVOCATION_NAME as string);

        script.on("result", (error, resultItem) => {
            console.log("ResultItem: " + JSON.stringify(resultItem, null, 2));
        });

        const printer = new ConsolePrinter();

        // We may or may not have an argument passed
        // If we do, it is either a file or directory
        // If it is a directory, we run all the tests in it
        // If it is a file, we run that one test
        let directory = ".";
        let file: string | undefined;
        if (path) {
            if (!fs.existsSync(path)) {
                throw new Error(Path.resolve(path) + " does not exist");
            }

            if (fs.statSync(path).isDirectory()) {
                directory = path;
            } else {
                file = path;
            }
        }

        if (file) {
            console.log("Running Test:" + file);
            script.executeFile(file).then((result) => {
                console.log("Result: " + JSON.stringify(result, null, 2));
                console.log(printer.printResult(file as string, result));
            });
        } else {
            console.log("Running Tests from: " + Path.resolve(directory));
            script.executeDir(directory).then((results) => {
                console.log("Result: " + JSON.stringify(results, null, 2));
                console.log(printer.printResultsByFile(results));
            });
        }
    },
};

process.on("unhandledRejection", (error) => {
    console.log("unhandledRejection", error);
});

const file = process.argv.length > 2 ? process.argv[2] : undefined;
TestRunner.run(file);
