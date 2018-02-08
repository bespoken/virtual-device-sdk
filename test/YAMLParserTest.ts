import {assert} from "chai";
import {YAMLParser} from "../src/YAMLParser";

describe("YAMLParser", function() {
    describe("#parse()", () => {
        it("Parses simple key value", async () => {
            const content = "name: value";
            const parser = new YAMLParser(content);
            const result = parser.parse();
            assert.equal(result.length, 1);
            assert.equal(result[0].name, "name");
            assert.equal(result[0].value, "value");
        });

        it("Parses simple key value with single-quotes", async () => {
            const content = "'name': 'value'";
            const parser = new YAMLParser(content);
            const result = parser.parse();
            assert.equal(result.length, 1);
            assert.equal(result[0].name, "name");
            assert.equal(result[0].value, "value");
        });

        it("Parses simple key value with double-quotes", async () => {
            const content = "\"name\":  \"value\"";
            const parser = new YAMLParser(content);
            const result = parser.parse();
            assert.equal(result.length, 1);
            assert.equal(result[0].name, "name");
            assert.equal(result[0].value, "value");
        });

        it("Parses multi-line", async () => {
            const content = "name: value\n" +
                "name2: value2\n" +
                "name3: value3\n";
            const parser = new YAMLParser(content);
            const result = parser.parse();
            assert.equal(result.length, 4);
            assert.equal(result[0].name, "name");
            assert.equal(result[0].value, "value");
        });

        it("Parses an object", async () => {
            const content = "name:\n" +
                "   p1: value1\n" +
                "   p2: value2";
            const parser = new YAMLParser(content);
            const result = parser.parse();
            assert.equal(result.length, 1);
            assert.equal(result[0].name, "name");
            assert.equal(result[0].value.p1, "value1");
        });

        it("Parses two objects with a blank line in between", async () => {
            const content = "o1:\n" +
                "   p1: value1\n" +
                "   p2: value2\n" +
                "\n" +
                "o2:\n" +
                "   p3: value3\n" +
                "   p4: value4";
            const parser = new YAMLParser(content);
            const result = parser.parse();
            assert.equal(result.length, 3);
            assert.equal(result[0].value.p1, "value1");
            assert.equal(result[1], null);
            assert.equal(result[2].value.p3, "value3");
        });

        it("Parses two objects with a blank line in between", async () => {
            const content = "o1:\n" +
                "  p1: value1\n" +
                "  p2: value2\n" +
                "\n" +
                "o2:\n" +
                "  p3: value3\n" +
                "  p4: value4";
            const parser = new YAMLParser(content);
            const result = parser.parse();
            assert.equal(result.length, 3);
            assert.equal(result[0].value.p1, "value1");
            assert.equal(result[1], null);
            assert.equal(result[2].value.p3, "value3");
        });

        it("Parses multi-level objects", async () => {
            const content = "o1:\n" +
                "  p1: value1\n" +
                "  p2: value2\n" +
                "  o2:\n" +
                "     p3: value3\n" +
                "     p4: value4\n" +
                "o3: value4";
            const parser = new YAMLParser(content);
            const result = parser.parse();
            assert.equal(result.length, 2);
            assert.equal(result[0].value.p1, "value1");
            assert.equal(result[0].name, "o1");
            assert.equal(result[0].value.p1, "value1");
            assert.equal(result[0].value.o2.p3, "value3");
            assert.equal(result[0].value.o2.p3, "value3");
            assert.equal(result[0].value.o2.p4, "value4");
            assert.equal(result[1].value, "value4");
        });

        it("Parses two objects with an array", async () => {
            const content = "o1:\n" +
                "   - Test\n" +
                "   - Test2\n" +
                "\n" +
                "o2:\n" +
                "   p3: value3\n" +
                "   p4: value4";
            const parser = new YAMLParser(content);
            const result = parser.parse();
            assert.equal(result.length, 3);
            assert.equal(result[0].name, "o1");
            assert.equal(result[0].value[0], "Test");
            assert.equal(result[0].value[1], "Test2");
            assert.equal(result[1], null);
            assert.equal(result[2].name, "o2");
            assert.equal(result[2].value.p3, "value3");
        });

    });
});
