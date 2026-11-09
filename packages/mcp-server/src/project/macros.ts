export interface MacroDefinition {
  name: string;
  value: string;
  config: string | null;
  file: string;
  line: number;
}

const macroLine = /^\s*#macro\s+(?:([A-Za-z_][A-Za-z0-9_]*):)?([A-Za-z_][A-Za-z0-9_]*)\s+(.*?)\s*$/;

/** Finds `#macro NAME value` and `#macro Config:NAME value` lines in GML source. */
export function parseMacros(source: string, file: string): MacroDefinition[] {
  const macros: MacroDefinition[] = [];
  source.split(/\r?\n/).forEach((text, index) => {
    const match = macroLine.exec(text);
    if (match?.[2] !== undefined && match[3] !== undefined) {
      macros.push({ name: match[2], value: match[3], config: match[1] ?? null, file, line: index + 1 });
    }
  });
  return macros;
}

export function formatMacro(name: string, value: string): string {
  return `#macro ${name} ${value}`;
}
