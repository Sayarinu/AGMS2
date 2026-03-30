import builtinsData from "../generated/builtins.generated.json";
import type { BuiltinFunction, BuiltinValue } from "../types.js";

const data = builtinsData as {
  functions: BuiltinFunction[];
  variables: BuiltinValue[];
  constants: BuiltinValue[];
};

export const builtinFunctions = data.functions;
export const builtinVariables = data.variables;
export const builtinConstants = data.constants;

export const builtinFunctionMap = new Map(builtinFunctions.map(entry => [entry.name, entry]));
export const builtinVariableMap = new Map(builtinVariables.map(entry => [entry.name, entry]));
export const builtinConstantMap = new Map(builtinConstants.map(entry => [entry.name, entry]));

export const builtinNames = new Set<string>([
  ...builtinFunctions.map(entry => entry.name),
  ...builtinVariables.map(entry => entry.name),
  ...builtinConstants.map(entry => entry.name),
  "self",
  "other",
  "global",
  "id",
  "x",
  "y",
  "true",
  "false",
  "undefined",
  "pointer_null",
  "noone",
  "all"
]);
