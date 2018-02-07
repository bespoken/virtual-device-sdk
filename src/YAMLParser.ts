// import * as fs from "fs";
export class YAMLParser {
    private static TAB: string = "\t";
    private static NEWLINE: string = "\n";
    private static TWO_SPACES: string = "  ";

    // public static fromFile(yamlFile: string): any {
    //     const contents = fs.readFileSync(yamlFile, "UTF-8");
    //     return new YAMLParser(contents).parse();
    // }

    public constructor(public yamlContents: string) {}

    public parse(): any[] {
        const lines = this.yamlContents.split(YAMLParser.NEWLINE);

        const context = new YAMLContext();
        context.push(new Value(0, undefined, []));
        for (const line of lines) {
            context.lineNumber++;
            this.parseLine(line, context);
        }

        return context.root().toObject();
    }

    private parseLine(line: string, context: YAMLContext) {
        let tabs = this.countAtStart(line, YAMLParser.TAB);
        if (tabs === 0) {
            tabs = this.countAtStart(line, YAMLParser.TWO_SPACES);
        }

        // Not allowed to indent by more than one tab per line
        if (tabs - context.tabs > 1) {
            throw new Error("INVALID - Line " + context.lineNumber + ": previous line is "
                + context.tabs + ". This line is: " + tabs
                + ". Cannot increase indent by more than one tab");
        }

        context.popTo(tabs);

        // If we have increased the tabs, means this is either an array or a object
        const cleanLine = line.trim();

        if (cleanLine.length === 0) {
            // If the length is zero, means this is an empty line and we set as null
            context.push(new Value(tabs, undefined, null));
        } else if (cleanLine.endsWith(":")) {
            // If the line ends with a colon, means this property will hold an object
            const name = cleanLine.substring(0, cleanLine.length - 1);
            context.push(new Value(tabs, name));
        } else if (cleanLine.startsWith("- ")) {
            // We just discovered this is an array, potentially!
            if (!context.top().isArray()) {
                context.top().value = [];
            }
            const arrayValue = cleanLine.substring(2).trim();
            context.top().array().push(new Value(tabs, undefined, arrayValue));
        } else {
            // If the line does not end with a colon, means this is a self-contained key-value
            const name = cleanLine.split(":")[0].trim();
            const value = cleanLine.split(":")[1].trim();

            context.push(new Value(tabs, name, value));
        }

    }

    private countAtStart(line: string, value: string) {
        let count = 0;
        while (true) {
            if (line.startsWith(value)) {
                count++;
                line = line.slice(value.length);
            } else {
                break;
            }
        }
        return count;
    }
}

export class YAMLContext {
    public lineNumber = 0;
    public tabs = 0;
    public stack: any[] = [];

    public top(): Value {
        return this.stack[this.stack.length - 1];
    }

    public root(): Value {
        return this.stack[0];
    }

    public popTo(tabs: number): void {
        if (tabs >= this.stack.length) {
            return;
        }
        this.stack = this.stack.slice(0, tabs + 1);
    }

    public push(value: Value): void  {
        console.log("PUSH " + value.toString());
        if (this.stack.length > 0) {
            if (this.top().isArray()) {
                this.top().array().push(value);
            } else {
                this.top().object()[value.name as string] = value;
            }
        }
        this.stack.push(value);
    }
}

/**
 * Holder for every unique item in our YAML file
 * A value can be a string, an array, an object or null (for an empty line)
 * We parse the file and create a bunch of entries, then
 */
export class Value {
    public constructor(public tabs: number, public name?: string, public value?: any) {
        if (this.value === undefined) {
            this.value = {};
        }
    }

    public isDefined(): boolean {
        return this.value !== undefined;
    }

    public isArray(): boolean {
        return Array.isArray(this.value);
    }

    public isNull(): boolean {
        return this.value === null;
    }

    public isString(): boolean {
        return (typeof this.value) === "string";
    }

    public object(): any {
        return this.value as any;
    }

    public array(): Value[] {
        return this.value as any[];
    }

    public toString(): string {
        return "Name: " + this.name + " Value: " + this.value;
    }

    public toObject(): any {
        let o: any;
        if (!this.isDefined()) {
            throw new Error("This should not happen - undefined object: " + this.toString());
        }

        let cleanName = this.name as string;
        if (this.name !== undefined) {
            cleanName = this.cleanString(cleanName);
        }

        if (this.isArray()) {
            // If this is an array, we turn each value inside it into a key-value pair object
            o = [];
            for (const v of this.array()) {
                if (v.isNull()) {
                    o.push(null);
                } else if (v.name) {
                    // Create an object on the fly, if this has a name
                    const arrayObject: any = {};
                    arrayObject[this.cleanString(v.name as string)] = v.toObject();
                    o.push(arrayObject);
                } else {
                    // If there is no name, just add it - should be a string
                    o.push(v.toObject());
                }
            }
        } else if (this.isString()) {
            o = this.cleanString(this.value);

        } else if (this.isNull()) {
            o = null;
        } else {
            o = {};
            for (const k of Object.keys(this.object())) {
                o[k] = this.object()[k].toObject();
            }
        }
        return o;
    }

    public cleanString(s: string) {
        if (s.startsWith("'") || s.startsWith("\"")) {
            s = s.substring(1);
        }

        if (s.endsWith("'") || s.endsWith("\"")) {
            s = s.substring(0, s.length - 1);
        }
        return s;
    }
}
