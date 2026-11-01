import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import zlib from "node:zlib";
import { buildLineMask, floodFill, isPaperPixel, type Rgb } from "./flood-fill";

const RED: Rgb = { r: 226, g: 75, b: 87 };
const GREEN: Rgb = { r: 31, g: 157, b: 98 };
const BLUE: Rgb = { r: 61, g: 185, b: 255 };

test("paper tolerance keeps near-white pixels and rejects dark lines", () => {
  assert.equal(isPaperPixel(255, 255, 255), true);
  assert.equal(isPaperPixel(230, 230, 230), true);
  assert.equal(isPaperPixel(200, 200, 200), false);
  assert.equal(isPaperPixel(200, 200, 200, 80), true);
  assert.equal(isPaperPixel(40, 40, 40), false);
  assert.equal(isPaperPixel(0, 0, 0), false);
});

test("flood fill stays inside a closed region and skips the line", () => {
  const width = 8;
  const height = 6;
  const original = blank(width, height, 255);
  for (let x = 0; x < width; x += 1) {
    setPixel(original, width, x, 2, 0, 0, 0);
  }
  // Light anti-aliased edge just inside the top region.
  setPixel(original, width, 3, 1, 210, 210, 210);
  const pixels = new Uint8ClampedArray(original);
  const mask = buildLineMask(original, width, height, 80, 0, 0);
  const changed = floodFill(pixels, original, mask, width, height, 3, 1, RED, 80);

  assert.equal(changed, width * 2);
  assert.deepEqual(read(pixels, width, 3, 1), [226, 75, 87, 255]);
  assert.deepEqual(read(pixels, width, 0, 2), [0, 0, 0, 255]);
  assert.deepEqual(read(pixels, width, 3, 4), [255, 255, 255, 255]);
  // Tapping ink may nudge into the nearest pocket, but the ink pixel itself stays.
  floodFill(pixels, original, mask, width, height, 1, 2, BLUE, 80);
  assert.deepEqual(read(pixels, width, 1, 2), [0, 0, 0, 255]);
});

test("a second fill recolors the same region without crossing the line", () => {
  const width = 7;
  const height = 5;
  const original = blank(width, height, 250);
  for (let y = 0; y < height; y += 1) setPixel(original, width, 3, y, 10, 10, 10);
  const pixels = new Uint8ClampedArray(original);
  const mask = buildLineMask(original, width, height, 80, 0, 0);
  floodFill(pixels, original, mask, width, height, 1, 2, RED, 80);
  const changed = floodFill(pixels, original, mask, width, height, 1, 2, GREEN, 80);
  assert.ok(changed > 0);
  assert.deepEqual(read(pixels, width, 1, 2), [31, 157, 98, 255]);
  assert.deepEqual(read(pixels, width, 5, 2), [250, 250, 250, 255]);
  assert.deepEqual(read(pixels, width, 3, 2), [10, 10, 10, 255]);
});

test("line dilation closes a one pixel gap", () => {
  const width = 7;
  const height = 5;
  const original = blank(width, height, 255);
  for (let y = 0; y < height; y += 1) {
    if (y === 2) continue;
    setPixel(original, width, 3, y, 0, 0, 0);
  }
  const openMask = buildLineMask(original, width, height, 80, 0, 0);
  const openPixels = new Uint8ClampedArray(original);
  floodFill(openPixels, original, openMask, width, height, 1, 2, RED, 80);
  assert.deepEqual(read(openPixels, width, 5, 2).slice(0, 3), [226, 75, 87]);

  const closedMask = buildLineMask(original, width, height, 80, 1, 0);
  const closedPixels = new Uint8ClampedArray(original);
  floodFill(closedPixels, original, closedMask, width, height, 1, 2, BLUE, 80);
  assert.deepEqual(read(closedPixels, width, 5, 2).slice(0, 3), [255, 255, 255]);
  assert.deepEqual(read(closedPixels, width, 1, 2).slice(0, 3), [61, 185, 255]);
});

test("frogs page fills each closed region and leaves the ink", () => {
  const { width, height, pixels: original } = decodePng("public/coloring/frogs.png");
  const mask = buildLineMask(original, width, height);
  const painted = new Uint8ClampedArray(original);

  const line = findInk(original, mask, width);
  floodFill(painted, original, mask, width, height, line.x, line.y, RED);
  // Ink taps may nudge into a nearby pocket, but the ink pixel itself is never painted.
  assert.ok(read(painted, width, line.x, line.y)[0] < 80);

  const left = fillAt(painted, original, mask, width, height, 450, 520, RED);
  const rightBefore = read(painted, width, 946, 591).slice(0, 3).join(",");
  const skyBefore = read(painted, width, 1200, 80).slice(0, 3).join(",");
  const eyeBefore = read(painted, width, 641, 481).slice(0, 3).join(",");
  assert.ok(left > 20000 && left < 90000, `left body ${left}`);
  assert.equal(rightBefore, read(original, width, 946, 591).slice(0, 3).join(","));
  assert.equal(skyBefore, read(original, width, 1200, 80).slice(0, 3).join(","));
  assert.equal(eyeBefore, read(original, width, 641, 481).slice(0, 3).join(","));
  assert.deepEqual(read(painted, width, 450, 520).slice(0, 3), [226, 75, 87]);

  const right = fillAt(painted, original, mask, width, height, 946, 591, GREEN);
  assert.ok(right > 40000 && right < 160000, `right body ${right}`);
  assert.deepEqual(read(painted, width, 450, 520).slice(0, 3), [226, 75, 87]);
  assert.deepEqual(read(painted, width, 946, 591).slice(0, 3), [31, 157, 98]);

  const bow = fillAt(painted, original, mask, width, height, 978, 312, BLUE);
  assert.ok(bow > 500 && bow < 20000, `bow ${bow}`);
  assert.deepEqual(read(painted, width, 946, 591).slice(0, 3), [31, 157, 98]);

  const eye = fillAt(painted, original, mask, width, height, 641, 481, { r: 255, g: 209, b: 102 });
  assert.ok(eye > 50 && eye < 8000, `eye ${eye}`);
  assert.deepEqual(read(painted, width, 450, 520).slice(0, 3), [226, 75, 87]);

  const flower = fillAt(painted, original, mask, width, height, 176, 932, { r: 240, g: 114, b: 182 });
  assert.ok(flower > 1000 && flower < 20000, `flower ${flower}`);

  const tree = fillAt(painted, original, mask, width, height, 175, 302, { r: 31, g: 157, b: 98 });
  assert.ok(tree > 20000 && tree < 120000, `tree ${tree}`);
  assert.deepEqual(read(painted, width, 450, 520).slice(0, 3), [226, 75, 87]);

  const leaf = fillAt(painted, original, mask, width, height, 1305, 700, { r: 142, g: 211, b: 106 });
  assert.ok(leaf > 500 && leaf < 20000, `leaf ${leaf}`);
  assert.notEqual(read(painted, width, 175, 302).slice(0, 3).join(","), "142,211,106");

  const water = fillAt(painted, original, mask, width, height, 1072, 918, { r: 61, g: 185, b: 255 });
  assert.ok(water > 80000 && water < 180000, `water ${water}`);
  assert.notEqual(read(painted, width, 1200, 80).slice(0, 3).join(","), "61,185,255");

  const sky = fillAt(painted, original, mask, width, height, 1200, 80, { r: 142, g: 203, b: 255 });
  assert.ok(sky > 100000 && sky < 450000, `sky ${sky}`);
  assert.deepEqual(read(painted, width, 450, 520).slice(0, 3), [226, 75, 87]);
  assert.deepEqual(read(painted, width, 946, 591).slice(0, 3), [31, 157, 98]);
  assert.deepEqual(read(painted, width, 1072, 918).slice(0, 3), [61, 185, 255]);
  assert.ok(read(painted, width, line.x, line.y)[0] < 80);

  const restored = new Uint8ClampedArray(original);
  fillAt(restored, original, mask, width, height, 450, 520, RED);
  fillAt(restored, original, mask, width, height, 450, 520, BLUE);
  assert.deepEqual(read(restored, width, 450, 520).slice(0, 3), [61, 185, 255]);
  const undone = new Uint8ClampedArray(original);
  fillAt(undone, original, mask, width, height, 450, 520, RED);
  assert.deepEqual(read(undone, width, 450, 520).slice(0, 3), [226, 75, 87]);
});

function fillAt(
  pixels: Uint8ClampedArray,
  original: Uint8ClampedArray,
  mask: Uint8Array,
  width: number,
  height: number,
  x: number,
  y: number,
  color: Rgb,
) {
  return floodFill(pixels, original, mask, width, height, x, y, color);
}

function blank(width: number, height: number, value: number) {
  const data = new Uint8ClampedArray(width * height * 4);
  for (let index = 0; index < data.length; index += 4) {
    data[index] = value;
    data[index + 1] = value;
    data[index + 2] = value;
    data[index + 3] = 255;
  }
  return data;
}

function setPixel(data: Uint8ClampedArray, width: number, x: number, y: number, r: number, g: number, b: number) {
  const offset = (y * width + x) * 4;
  data[offset] = r;
  data[offset + 1] = g;
  data[offset + 2] = b;
  data[offset + 3] = 255;
}

function read(data: Uint8ClampedArray, width: number, x: number, y: number) {
  const offset = (y * width + x) * 4;
  return [data[offset], data[offset + 1], data[offset + 2], data[offset + 3]];
}

function findInk(original: Uint8ClampedArray, mask: Uint8Array, width: number) {
  for (let index = 0; index < mask.length; index += 1) {
    if (!mask[index]) continue;
    const offset = index * 4;
    if (original[offset] < 40 && original[offset + 1] < 40 && original[offset + 2] < 40) {
      return { x: index % width, y: Math.floor(index / width) };
    }
  }
  throw new Error("No ink pixel found");
}

function decodePng(path: string) {
  const buf = fs.readFileSync(path);
  let offset = 8;
  const chunks: { type: string; data: Buffer }[] = [];
  while (offset < buf.length) {
    const length = buf.readUInt32BE(offset);
    offset += 4;
    const type = buf.toString("ascii", offset, offset + 4);
    offset += 4;
    const data = buf.subarray(offset, offset + length);
    offset += length + 4;
    chunks.push({ type, data });
    if (type === "IEND") break;
  }
  const ihdr = chunks.find((chunk) => chunk.type === "IHDR")?.data;
  if (!ihdr) throw new Error("Missing IHDR");
  const width = ihdr.readUInt32BE(0);
  const height = ihdr.readUInt32BE(4);
  const colorType = ihdr[9];
  const channels = colorType === 6 ? 4 : colorType === 2 ? 3 : 0;
  if (!channels || ihdr[8] !== 8) throw new Error("Unsupported PNG");
  const raw = zlib.inflateSync(Buffer.concat(chunks.filter((chunk) => chunk.type === "IDAT").map((chunk) => chunk.data)));
  const stride = width * channels;
  const pixels = new Uint8ClampedArray(width * height * 4);
  let cursor = 0;
  let previous = Buffer.alloc(stride);
  for (let y = 0; y < height; y += 1) {
    const filter = raw[cursor];
    cursor += 1;
    const row = Buffer.from(raw.subarray(cursor, cursor + stride));
    cursor += stride;
    const recon = Buffer.alloc(stride);
    for (let x = 0; x < stride; x += 1) {
      const left = x >= channels ? recon[x - channels] : 0;
      const up = previous[x];
      const upLeft = x >= channels ? previous[x - channels] : 0;
      let value = row[x];
      if (filter === 1) value = (value + left) & 255;
      else if (filter === 2) value = (value + up) & 255;
      else if (filter === 3) value = (value + Math.floor((left + up) / 2)) & 255;
      else if (filter === 4) {
        const paeth = left + up - upLeft;
        const distanceLeft = Math.abs(paeth - left);
        const distanceUp = Math.abs(paeth - up);
        const distanceUpLeft = Math.abs(paeth - upLeft);
        const predictor = distanceLeft <= distanceUp && distanceLeft <= distanceUpLeft ? left : distanceUp <= distanceUpLeft ? up : upLeft;
        value = (value + predictor) & 255;
      }
      recon[x] = value;
    }
    previous = recon;
    for (let x = 0; x < width; x += 1) {
      const source = x * channels;
      const target = (y * width + x) * 4;
      pixels[target] = recon[source];
      pixels[target + 1] = recon[source + 1];
      pixels[target + 2] = recon[source + 2];
      pixels[target + 3] = channels === 4 ? recon[source + 3] : 255;
    }
  }
  return { width, height, pixels };
}
