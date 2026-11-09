/**
 * Parses GameMaker `.yy`/`.yyp` JSON. GameMaker writes trailing commas, so those are
 * dropped first; commas inside string values are left alone.
 */
export function parseGmsJson<T>(input: string): T {
  return JSON.parse(stripTrailingCommas(input)) as T;
}

export function stringifyGmsJson(input: unknown): string {
  return `${JSON.stringify(input, null, 2)}\n`;
}

function stripTrailingCommas(input: string): string {
  let output = "";
  let inString = false;

  for (let index = 0; index < input.length; index += 1) {
    const current = input[index];

    if (inString) {
      output += current;
      if (current === "\\") {
        output += input[index + 1] ?? "";
        index += 1;
      } else if (current === "\"") {
        inString = false;
      }
      continue;
    }

    if (current === "\"") {
      inString = true;
    } else if (current === ",") {
      let lookahead = index + 1;
      while (lookahead < input.length && /\s/.test(input[lookahead] ?? "")) {
        lookahead += 1;
      }
      const next = input[lookahead];
      if (next === "}" || next === "]") {
        continue;
      }
    }
    output += current;
  }

  return output;
}
