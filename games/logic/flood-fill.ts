/**
 * How far a pixel may sit from white, per channel, and still count as paper.
 * Light anti-aliased edges stay inside the region. Darker line pixels are walls.
 */
export const FILL_TOLERANCE = 80;

/** Expands line pixels so a 1px break in the ink cannot leak into the next region. */
export const LINE_DILATION = 1;

export interface Rgb {
  r: number;
  g: number;
  b: number;
}

export function isPaperPixel(r: number, g: number, b: number, tolerance = FILL_TOLERANCE) {
  return 255 - r <= tolerance && 255 - g <= tolerance && 255 - b <= tolerance;
}

export function channelDistance(r1: number, g1: number, b1: number, r2: number, g2: number, b2: number) {
  return Math.max(Math.abs(r1 - r2), Math.abs(g1 - g2), Math.abs(b1 - b2));
}

export function buildLineMask(
  original: Uint8ClampedArray,
  width: number,
  height: number,
  tolerance = FILL_TOLERANCE,
  dilation = LINE_DILATION,
) {
  const count = width * height;
  const ink = new Uint8Array(count);
  for (let index = 0; index < count; index += 1) {
    const offset = index * 4;
    if (!isPaperPixel(original[offset], original[offset + 1], original[offset + 2], tolerance)) {
      ink[index] = 1;
    }
  }
  if (dilation <= 0) return ink;

  const mask = new Uint8Array(count);
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      if (!ink[y * width + x]) continue;
      const y0 = Math.max(0, y - dilation);
      const y1 = Math.min(height - 1, y + dilation);
      const x0 = Math.max(0, x - dilation);
      const x1 = Math.min(width - 1, x + dilation);
      for (let yy = y0; yy <= y1; yy += 1) {
        const row = yy * width;
        for (let xx = x0; xx <= x1; xx += 1) mask[row + xx] = 1;
      }
    }
  }
  return mask;
}

export function pixelFromUnit(unit: number, size: number) {
  if (!Number.isFinite(unit) || size <= 0) return 0;
  const pixel = Math.floor(unit * size);
  if (pixel < 0) return 0;
  if (pixel >= size) return size - 1;
  return pixel;
}

/**
 * Iterative scanline flood fill. Fills the connected paper region that contains
 * the start pixel. Comparison uses the original drawing plus `tolerance`, so
 * repainting a region does not leak through colors already on the canvas.
 * Line pixels are never written.
 */
export function floodFill(
  pixels: Uint8ClampedArray,
  original: Uint8ClampedArray,
  lineMask: Uint8Array,
  width: number,
  height: number,
  startX: number,
  startY: number,
  color: Rgb,
  tolerance = FILL_TOLERANCE,
) {
  if (startX < 0 || startY < 0 || startX >= width || startY >= height) return 0;
  const start = startY * width + startX;
  if (lineMask[start]) return 0;

  const origin = start * 4;
  const sr = original[origin];
  const sg = original[origin + 1];
  const sb = original[origin + 2];
  if (!isPaperPixel(sr, sg, sb, tolerance)) return 0;

  const visited = new Uint8Array(width * height);
  const stackX: number[] = [startX];
  const stackY: number[] = [startY];
  let changed = 0;

  const canFill = (x: number, y: number) => {
    const index = y * width + x;
    if (visited[index] || lineMask[index]) return false;
    const offset = index * 4;
    const r = original[offset];
    const g = original[offset + 1];
    const b = original[offset + 2];
    if (!isPaperPixel(r, g, b, tolerance)) return false;
    return channelDistance(r, g, b, sr, sg, sb) <= tolerance;
  };

  while (stackX.length > 0) {
    const y = stackY.pop() as number;
    let x = stackX.pop() as number;
    while (x > 0 && canFill(x - 1, y)) x -= 1;

    let above = false;
    let below = false;
    for (; x < width && canFill(x, y); x += 1) {
      const index = y * width + x;
      visited[index] = 1;
      const offset = index * 4;
      if (pixels[offset] !== color.r || pixels[offset + 1] !== color.g || pixels[offset + 2] !== color.b) {
        pixels[offset] = color.r;
        pixels[offset + 1] = color.g;
        pixels[offset + 2] = color.b;
        pixels[offset + 3] = 255;
        changed += 1;
      }

      if (y > 0) {
        if (canFill(x, y - 1)) {
          if (!above) {
            stackX.push(x);
            stackY.push(y - 1);
            above = true;
          }
        } else above = false;
      }
      if (y < height - 1) {
        if (canFill(x, y + 1)) {
          if (!below) {
            stackX.push(x);
            stackY.push(y + 1);
            below = true;
          }
        } else below = false;
      }
    }
  }

  return changed;
}
