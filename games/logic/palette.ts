/** Compact crayon-box set shown when a coloring page opens. */
export const CLASSIC_PALETTE = [
  { id: "black", hex: "#1a1a1a" },
  { id: "gray", hex: "#9a9a9a" },
  { id: "white", hex: "#ffffff" },
  { id: "red", hex: "#e24b57" },
  { id: "orange", hex: "#ff9f43" },
  { id: "yellow", hex: "#ffd166" },
  { id: "green", hex: "#1f9d62" },
  { id: "blue", hex: "#3db9ff" },
  { id: "purple", hex: "#7c5cfc" },
  { id: "pink", hex: "#f072b6" },
  { id: "brown", hex: "#8a5a32" },
  { id: "skin", hex: "#f3c3a0" },
] as const;

/** Extra shades unlocked with “more colors”. */
export const MORE_PALETTE = [
  { id: "darkGray", hex: "#5c5c5c" },
  { id: "burgundy", hex: "#8e1d3a" },
  { id: "crimson", hex: "#c1121f" },
  { id: "coral", hex: "#ff6b6b" },
  { id: "lightOrange", hex: "#ffb15a" },
  { id: "peach", hex: "#ffc9a3" },
  { id: "gold", hex: "#e0a800" },
  { id: "mustard", hex: "#d4a017" },
  { id: "lightGreen", hex: "#8ed36a" },
  { id: "lime", hex: "#b5e048" },
  { id: "darkGreen", hex: "#1b6b34" },
  { id: "olive", hex: "#6b8e23" },
  { id: "mint", hex: "#98e6c4" },
  { id: "lightTeal", hex: "#9ae7df" },
  { id: "teal", hex: "#1ec4b6" },
  { id: "seafoam", hex: "#3dbea0" },
  { id: "cyan", hex: "#22d3ee" },
  { id: "lightBlue", hex: "#8ecbff" },
  { id: "sky", hex: "#5eb3f6" },
  { id: "darkBlue", hex: "#1d4e9f" },
  { id: "navy", hex: "#1b2a6b" },
  { id: "indigo", hex: "#4f46e5" },
  { id: "lightPurple", hex: "#c9b6ff" },
  { id: "lavender", hex: "#a78bfa" },
  { id: "darkPurple", hex: "#5b2d9b" },
  { id: "magenta", hex: "#d946ef" },
  { id: "lightPink", hex: "#ffc2dd" },
  { id: "rose", hex: "#fb7185" },
  { id: "lightBrown", hex: "#c49262" },
  { id: "chocolate", hex: "#5c3317" },
  { id: "beige", hex: "#f0ddb8" },
  { id: "sand", hex: "#e8d5a3" },
  { id: "maroon", hex: "#7a1f2b" },
  { id: "slate", hex: "#64748b" },
] as const;

export const COLORING_PALETTE = [...CLASSIC_PALETTE, ...MORE_PALETTE] as const;

export type PaletteId = (typeof COLORING_PALETTE)[number]["id"];
export type ClassicPaletteId = (typeof CLASSIC_PALETTE)[number]["id"];

const HEXES = new Set<string>(COLORING_PALETTE.map((swatch) => swatch.hex));
const CLASSIC_IDS = new Set<string>(CLASSIC_PALETTE.map((swatch) => swatch.id));

export function isPaletteHex(color: string) {
  return typeof color === "string" && HEXES.has(color.toLowerCase());
}

export function isClassicPaletteId(id: string): id is ClassicPaletteId {
  return CLASSIC_IDS.has(id);
}

export function hexToRgb(hex: string) {
  const value = hex.replace("#", "");
  return {
    r: Number.parseInt(value.slice(0, 2), 16),
    g: Number.parseInt(value.slice(2, 4), 16),
    b: Number.parseInt(value.slice(4, 6), 16),
  };
}
