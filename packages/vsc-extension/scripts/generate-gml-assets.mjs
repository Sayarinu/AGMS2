import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "..");
const repoRoot = path.resolve(root, "..", "..");
const builtinsPath = path.join(repoRoot, "packages", "gml-skills", "data", "builtins.json");
const builtins = JSON.parse(await fs.readFile(builtinsPath, "utf8"));

const escapeRegex = value => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const joinRegex = values => values.map(escapeRegex).sort((left, right) => right.length - left.length).join("|");

const keywords = [
  "if",
  "else",
  "while",
  "for",
  "repeat",
  "with",
  "switch",
  "case",
  "break",
  "continue",
  "return",
  "exit",
  "do",
  "until",
  "enum",
  "try",
  "catch",
  "finally",
  "throw",
  "new",
  "delete",
  "not",
  "and",
  "or",
  "xor",
  "function",
  "constructor"
];

const declarations = ["var", "globalvar", "static"];
const directives = ["#region", "#endregion", "#macro"];

const grammar = {
  $schema: "https://raw.githubusercontent.com/martinring/tmlanguage/master/tmlanguage.json",
  name: "GML",
  scopeName: "source.gms2.gml",
  patterns: [
    { include: "#comments" },
    { include: "#strings" },
    { include: "#numbers" },
    { include: "#directives" },
    { include: "#declarations" },
    { include: "#keywords" },
    { include: "#constants" },
    { include: "#variables" },
    { include: "#functions" },
    { include: "#operators" }
  ],
  repository: {
    comments: {
      patterns: [
        { name: "comment.line.double-slash.gml", match: "//.*$" },
        {
          name: "comment.block.gml",
          begin: "/\\*",
          end: "\\*/"
        }
      ]
    },
    strings: {
      patterns: [
        {
          name: "string.quoted.double.gml",
          begin: "\"",
          end: "\"",
          patterns: [{ match: "\\\\.", name: "constant.character.escape.gml" }]
        },
        {
          name: "string.quoted.single.gml",
          begin: "'",
          end: "'",
          patterns: [{ match: "\\\\.", name: "constant.character.escape.gml" }]
        },
        {
          name: "string.interpolated.backtick.gml",
          begin: "`",
          end: "`"
        }
      ]
    },
    numbers: {
      patterns: [
        { name: "constant.numeric.hex.gml", match: "\\$[0-9A-Fa-f]+" },
        { name: "constant.numeric.gml", match: "\\b\\d+(?:\\.\\d+)?\\b" }
      ]
    },
    directives: {
      patterns: [
        {
          name: "keyword.control.directive.gml",
          match: `\\b(?:${joinRegex(directives)})\\b`
        }
      ]
    },
    declarations: {
      patterns: [
        {
          name: "storage.type.gml",
          match: `\\b(?:${joinRegex(declarations)})\\b`
        }
      ]
    },
    keywords: {
      patterns: [
        {
          name: "keyword.control.gml",
          match: `\\b(?:${joinRegex(keywords)})\\b`
        }
      ]
    },
    constants: {
      patterns: [
        {
          name: "constant.language.gml",
          match: `\\b(?:${joinRegex((builtins.constants ?? []).map(entry => entry.name))})\\b`
        }
      ]
    },
    variables: {
      patterns: [
        {
          name: "variable.language.gml",
          match: `\\b(?:${joinRegex((builtins.variables ?? []).map(entry => entry.name))})\\b`
        }
      ]
    },
    functions: {
      patterns: [
        {
          name: "support.function.gml",
          match: `\\b(?:${joinRegex((builtins.functions ?? []).map(entry => entry.name))})\\b(?=\\s*\\()`
        }
      ]
    },
    operators: {
      patterns: [
        {
          name: "keyword.operator.gml",
          match: "(?:\\+\\+|--|\\+=|-=|\\*=|/=|==|!=|<=|>=|&&|\\|\\||\\^\\^|<<|>>|div\\b|mod\\b|[+\\-*/%!=<>?:&|^])"
        }
      ]
    }
  }
};

const languageConfiguration = {
  comments: {
    lineComment: "//",
    blockComment: ["/*", "*/"]
  },
  brackets: [
    ["{", "}"],
    ["[", "]"],
    ["(", ")"]
  ],
  autoClosingPairs: [
    { open: "{", close: "}" },
    { open: "[", close: "]" },
    { open: "(", close: ")" },
    { open: "\"", close: "\"" },
    { open: "'", close: "'" },
    { open: "`", close: "`" },
    { open: "/*", close: "*/", notIn: ["string"] }
  ],
  surroundingPairs: [
    ["{", "}"],
    ["[", "]"],
    ["(", ")"],
    ["\"", "\""],
    ["'", "'"],
    ["`", "`"]
  ],
  indentationRules: {
    increaseIndentPattern: ".*\\{[^}\"']*$",
    decreaseIndentPattern: "^\\s*\\}"
  },
  wordPattern: "(-?\\d*\\.\\d\\w*)|([A-Za-z_][A-Za-z0-9_]*)"
};

await fs.mkdir(path.join(root, "syntaxes"), { recursive: true });
await fs.mkdir(path.join(root, "src", "generated"), { recursive: true });
await fs.writeFile(path.join(root, "syntaxes", "gml.tmLanguage.json"), `${JSON.stringify(grammar, null, 2)}\n`);
await fs.writeFile(path.join(root, "gml.language-configuration.json"), `${JSON.stringify(languageConfiguration, null, 2)}\n`);
await fs.writeFile(path.join(root, "src", "generated", "builtins.generated.json"), `${JSON.stringify(builtins, null, 2)}\n`);
