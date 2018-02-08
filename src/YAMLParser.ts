// import * as fs from "fs";
export class YAMLParser {
    private static TAB: string = "\t";
    private static NEWLINE: string = "\n";
    private static TWO_SPACES: string = "  ";

    private static countAtStart(line: string, value: string) {
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
    // public static fromFile(yamlFile: string): any {
    //     const contents = fs.readFileSync(yamlFile, "UTF-8");
    //     return new YAMLParser(contents).parse();
    // }

    public constructor(public yamlContents: string) {}

    public parse(): Value[] {
        const lines = this.yamlContents.split(YAMLParser.NEWLINE);

        const context = new YAMLContext();
        context.push(new Value(0, 0, undefined, []));
        for (const line of lines) {
            context.lineNumber++;
            this.parseLine(line, context);
        }

        return context.root().array();
    }

    private parseLine(line: string, context: YAMLContext) {
        let tabs = YAMLParser.countAtStart(line, YAMLParser.TAB);
        if (tabs === 0) {
            tabs = YAMLParser.countAtStart(line, YAMLParser.TWO_SPACES);
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
            context.push(new Value(context.lineNumber, tabs, undefined, null));
        } else if (cleanLine.endsWith(":")) {
            // If the line ends with a colon, means this property will hold an object
            const name = cleanLine.substring(0, cleanLine.length - 1);
            context.push(new Value(context.lineNumber, tabs, name));
        } else if (cleanLine.startsWith("- ")) {
            // We just discovered this is an array, potentially!
            // If the object is not already an array, make it one
            context.top().value([]);
            const arrayValue = cleanLine.substring(2).trim();
            context.top().array().push(new Value(context.lineNumber, tabs, undefined, arrayValue));
        } else {
            // If the line does not end with a colon, means this is a self-contained key-value
            const name = cleanLine.split(":")[0].trim();
            const value = cleanLine.split(":")[1].trim();

            context.push(new Value(context.lineNumber, tabs, name, value));
        }

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
        this.tabs = tabs;
        if (tabs >= this.stack.length) {
            return;
        }
        this.stack = this.stack.slice(0, tabs + 1);
    }

    public push(value: Value): void  {
        console.log("PUSH " + value.toString());
        if (this.stack.length > 0) {
            // If nothing is set yet, make it an object
            if (this.top().isArray()) {
                this.top().array().push(value);
            } else {
                if (!this.top().value()) {
                    this.top().value({});
                }

                this.top().object()[value.name() as string] = value;
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
    public static cleanString(s?: string): string | undefined {
        if (!s) {
            return undefined;
        }

        if (s.startsWith("'") || s.startsWith("\"")) {
            s = s.substring(1);
        }

        if (s.endsWith("'") || s.endsWith("\"")) {
            s = s.substring(0, s.length - 1);
        }
        return s;
    }

    public constructor(public line: number, public tabs: number, private _name?: string, private _value?: any) {}

    public name(): string | undefined {
        return Value.cleanString(this._name);
    }

    public isArray(): boolean {
        return Array.isArray(this._value);
    }

    public isNull(): boolean {
        return this._value === null;
    }

    public isString(): boolean {
        return (typeof this._value) === "string";
    }

    public object(): any {
        return this._value as any;
    }

    public array(): Value[] {
        return this._value as Value[];
    }

    public string(): string {
        return Value.cleanString(this._value) as string;
    }

    public toString(): string {
        return "Name: " + this._name + " Value: " + this._value;
    }

    public value(v?: any): any {
        if (!v) {
            return this._value;
        }

        // Do not set the value twice
        if (this._value) {
            return this._value;
        }

        this._value = v;
        return this._value;
    }
}
