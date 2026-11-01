export const COLORING_PALETTE = [
  { id: "black", hex: "#1a1a1a" },
  { id: "darkGray", hex: "#5c5c5c" },
  { id: "gray", hex: "#9a9a9a" },
  { id: "white", hex: "#ffffff" },
  { id: "red", hex: "#e24b57" },
  { id: "burgundy", hex: "#8e1d3a" },
  { id: "orange", hex: "#ff9f43" },
  { id: "lightOrange", hex: "#ffb15a" },
  { id: "yellow", hex: "#ffd166" },
  { id: "gold", hex: "#e0a800" },
  { id: "lightGreen", hex: "#8ed36a" },
  { id: "green", hex: "#1f9d62" },
  { id: "darkGreen", hex: "#1b6b34" },
  { id: "lightBlue", hex: "#8ecbff" },
  { id: "blue", hex: "#3db9ff" },
  { id: "darkBlue", hex: "#1d4e9f" },
  { id: "lightPurple", hex: "#c9b6ff" },
  { id: "purple", hex: "#7c5cfc" },
  { id: "darkPurple", hex: "#5b2d9b" },
  { id: "pink", hex: "#f072b6" },
  { id: "lightPink", hex: "#ffc2dd" },
  { id: "brown", hex: "#8a5a32" },
  { id: "lightBrown", hex: "#c49262" },
  { id: "beige", hex: "#f0ddb8" },
  { id: "skin", hex: "#f3c3a0" },
  { id: "lightTeal", hex: "#9ae7df" },
  { id: "teal", hex: "#1ec4b6" },
  { id: "navy", hex: "#1b2a6b" },
] as const;

export type PaletteId = (typeof COLORING_PALETTE)[number]["id"];

const HEXES = new Set<string>(COLORING_PALETTE.map((swatch) => swatch.hex));

export function isPaletteHex(color: string) {
  return typeof color === "string" && HEXES.has(color.toLowerCase());
}

export function hexToRgb(hex: string) {
  const value = hex.replace("#", "");
  return {
    r: Number.parseInt(value.slice(0, 2), 16),
    g: Number.parseInt(value.slice(2, 4), 16),
    b: Number.parseInt(value.slice(4, 6), 16),
  };
}
