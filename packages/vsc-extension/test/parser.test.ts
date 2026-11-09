import { describe, expect, it } from "vitest";
import { extractDeclaredIdentifiers, extractFunctionDefinitions, findCallContext, stripCommentsAndStrings } from "../src/language/parser.js";

describe("stripCommentsAndStrings", () => {
  it("blanks comments and strings but keeps offsets and newlines", () => {
    const source = 'a = "x // y"; // note\n/* block\n */ b = \'q\';';
    const stripped = stripCommentsAndStrings(source);
    expect(stripped).toHaveLength(source.length);
    expect(stripped.split("\n")).toHaveLength(3);
    expect(stripped).not.toMatch(/note|block|x|q/);
    expect(stripped).toContain("a = ");
    expect(stripped).toContain(" b = ");
  });

  it("handles escaped quotes and template strings", () => {
    const source = 's = "a\\"b"; t = `c ${d}`; e = 1;';
    const stripped = stripCommentsAndStrings(source);
    expect(stripped).not.toMatch(/["`]/);
    expect(stripped.indexOf("e = 1;")).toBe(source.indexOf("e = 1;"));
  });
});

describe("extractFunctionDefinitions", () => {
  it("finds named functions with their parameters, ignoring defaults and comments", () => {
    const source = "// function fake() {}\nfunction move(dx, dy = 0) {\n}\nfunction reset() {}";
    expect(extractFunctionDefinitions(source)).toEqual([
      { name: "move", params: ["dx", "dy"], index: source.indexOf("function move") },
      { name: "reset", params: [], index: source.indexOf("function reset") }
    ]);
  });
});

describe("extractDeclaredIdentifiers", () => {
  it("collects var, static and globalvar names plus functions and their parameters", () => {
    const names = extractDeclaredIdentifiers("var a = 1, b;\nstatic count = 0;\nglobalvar g;\nfunction f(p) { var inner; }");
    expect([...names].sort()).toEqual(["a", "b", "count", "f", "g", "inner", "p"]);
  });
});

describe("findCallContext", () => {
  it("returns the innermost open call and the active parameter", () => {
    expect(findCallContext("draw_text(x, y, ")).toEqual({ functionName: "draw_text", activeParameter: 2 });
    expect(findCallContext("draw_text(x, max(a, b), ")).toEqual({ functionName: "draw_text", activeParameter: 2 });
    expect(findCallContext("draw_text(x, max(a, ")).toEqual({ functionName: "max", activeParameter: 1 });
  });

  it("returns null outside a call", () => {
    expect(findCallContext("x = 1;")).toBeNull();
    expect(findCallContext("x = (1 + ")).toBeNull();
  });
});
