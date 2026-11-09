import type { AssetType, GmsResourceRef } from "./types.js";

type KnownAssetType = Exclude<AssetType, "unknown">;

/** The top-level project folder GameMaker keeps each asset type in. */
const assetFolders: Record<KnownAssetType, string> = {
  sprite: "sprites",
  object: "objects",
  room: "rooms",
  script: "scripts",
  font: "fonts",
  sound: "sounds",
  tileset: "tilesets",
  sequence: "sequences",
  shader: "shaders",
  timeline: "timelines",
  path: "paths",
  note: "notes",
  extension: "extensions",
  animationCurve: "animcurves",
  particleSystem: "particles"
};

const knownTypes = Object.keys(assetFolders) as KnownAssetType[];

const typeAliases = new Map<string, KnownAssetType>(
  knownTypes.flatMap(type => [
    [type.toLowerCase(), type],
    [`${type.toLowerCase()}s`, type],
    [assetFolders[type], type]
  ])
);

export function inferAssetType(relativePath: string): AssetType {
  const [folder] = relativePath.split("/");
  return knownTypes.find(type => assetFolders[type] === folder) ?? "unknown";
}

/** Accepts singular, plural or folder names in any case, e.g. "object", "Objects", "animcurves". */
export function normalizeAssetType(input: string): KnownAssetType {
  const type = typeAliases.get(input.trim().toLowerCase());
  if (!type) {
    throw new Error(`Unknown asset type "${input}". Expected one of: ${knownTypes.join(", ")}.`);
  }
  return type;
}

export function assetResourceRef(type: KnownAssetType, name: string): GmsResourceRef {
  const folder = assetFolders[type];
  return { name, path: `${folder}/${name}/${name}.yy` };
}

export function assetDirectory(type: KnownAssetType): string {
  return assetFolders[type];
}

export function readResourceName(value: unknown): string | null {
  if (!value || typeof value !== "object") {
    return null;
  }
  const name = (value as { name?: unknown }).name;
  return typeof name === "string" ? name : null;
}

export function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
