import { describe, expect, it } from "vitest";
import { parseGmsJson, stringifyGmsJson } from "../src/project/json.js";

describe("parseGmsJson", () => {
  it("accepts the trailing commas GameMaker writes", () => {
    expect(parseGmsJson('{"a":[1,2,],"b":{"c":true,},}')).toEqual({ a: [1, 2], b: { c: true } });
  });

  it("leaves commas inside strings alone", () => {
    expect(parseGmsJson('{"code":"a, } b, ]","quote":"say \\",}\\"",}')).toEqual({ code: "a, } b, ]", quote: 'say ",}"' });
  });

  it("still rejects invalid JSON", () => {
    expect(() => parseGmsJson("{ nope }")).toThrow();
  });
});

describe("stringifyGmsJson", () => {
  it("round-trips with two-space indentation and a final newline", () => {
    const text = stringifyGmsJson({ name: "obj_player", list: [1] });
    expect(text.endsWith("}\n")).toBe(true);
    expect(parseGmsJson(text)).toEqual({ name: "obj_player", list: [1] });
  });
});
