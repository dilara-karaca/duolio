/**
 * How far a pixel may sit from white, per channel, and still count as paper.
 * Tight enough that soft anti-aliased line edges become walls, not bridges.
 */
export const FILL_TOLERANCE = 36;

/** Expands line pixels so gaps in the ink cannot leak into the next region. */
export const LINE_DILATION = 3;

/**
 * After dilation, horizontal paper corridors this many pixels wide (or narrower)
 * between ink walls are sealed. Closes tall hairline leaks (e.g. ground↔tree)
 * without slicing wavy regions like lakes.
 */
export const CORRIDOR_SEAL = 12;

/** When a tap lands on a dilated wall, walk at most this far to usable paper. */
export const SEED_SEARCH_RADIUS = 24;

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
  corridorSeal = CORRIDOR_SEAL,
) {
  const count = width * height;
  const ink = new Uint8Array(count);
  for (let index = 0; index < count; index += 1) {
    const offset = index * 4;
    if (!isPaperPixel(original[offset], original[offset + 1], original[offset + 2], tolerance)) {
      ink[index] = 1;
    }
  }

  let mask: Uint8Array;
  if (dilation <= 0) {
    mask = ink;
  } else {
    mask = new Uint8Array(count);
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
  }

  if (corridorSeal > 0) mask = sealThinCorridors(mask, width, height, corridorSeal);
  return restoreNonBridgePaper(mask, ink, original, width, height, tolerance);
}

/** Seal short horizontal paper runs between ink walls (hairline vertical leaks). */
export function sealThinCorridors(mask: Uint8Array, width: number, height: number, maxWidth: number) {
  if (maxWidth <= 0) return mask;
  const sealed = new Uint8Array(mask);

  for (let y = 0; y < height; y += 1) {
    let x = 0;
    while (x < width) {
      while (x < width && sealed[y * width + x]) x += 1;
      const start = x;
      while (x < width && !sealed[y * width + x]) x += 1;
      const end = x;
      const len = end - start;
      if (len > 0 && len <= maxWidth && start > 0 && end < width) {
        if (mask[y * width + start - 1] && mask[y * width + end]) {
          for (let i = start; i < end; i += 1) sealed[y * width + i] = 1;
        }
      }
    }
  }

  return sealed;
}

/**
 * Re-open dilated/sealed paper that does not bridge two separate fillable regions.
 * Keeps leak plugs, but restores thin branches, spray, and fringe so they stay colorable.
 */
export function restoreNonBridgePaper(
  mask: Uint8Array,
  ink: Uint8Array,
  original: Uint8ClampedArray,
  width: number,
  height: number,
  tolerance = FILL_TOLERANCE,
) {
  const count = width * height;
  const freeId = new Int32Array(count);
  freeId.fill(-1);

  let nextId = 0;
  const queue = new Int32Array(count);
  for (let start = 0; start < count; start += 1) {
    if (mask[start] || freeId[start] >= 0) continue;
    const offset = start * 4;
    if (!isPaperPixel(original[offset], original[offset + 1], original[offset + 2], tolerance)) continue;

    const id = nextId;
    nextId += 1;
    let head = 0;
    let tail = 0;
    queue[tail++] = start;
    freeId[start] = id;

    while (head < tail) {
      const index = queue[head++];
      const x = index % width;
      const y = (index / width) | 0;
      const neighbors = [index - 1, index + 1, index - width, index + width];
      const bounds = [x > 0, x + 1 < width, y > 0, y + 1 < height];
      for (let n = 0; n < 4; n += 1) {
        if (!bounds[n]) continue;
        const next = neighbors[n];
        if (mask[next] || freeId[next] >= 0) continue;
        const nextOffset = next * 4;
        if (!isPaperPixel(original[nextOffset], original[nextOffset + 1], original[nextOffset + 2], tolerance)) {
          continue;
        }
        freeId[next] = id;
        queue[tail++] = next;
      }
    }
  }

  const restored = new Uint8Array(mask);
  const seen = new Uint8Array(count);

  for (let start = 0; start < count; start += 1) {
    if (!mask[start] || ink[start] || seen[start]) continue;
    const offset = start * 4;
    if (!isPaperPixel(original[offset], original[offset + 1], original[offset + 2], tolerance)) continue;

    let head = 0;
    let tail = 0;
    queue[tail++] = start;
    seen[start] = 1;
    const component: number[] = [];
    const touches = new Set<number>();

    while (head < tail) {
      const index = queue[head++];
      component.push(index);
      const x = index % width;
      const y = (index / width) | 0;
      const neighbors = [index - 1, index + 1, index - width, index + width];
      const bounds = [x > 0, x + 1 < width, y > 0, y + 1 < height];
      for (let n = 0; n < 4; n += 1) {
        if (!bounds[n]) continue;
        const next = neighbors[n];
        if (ink[next]) continue;
        const nextOffset = next * 4;
        if (!isPaperPixel(original[nextOffset], original[nextOffset + 1], original[nextOffset + 2], tolerance)) {
          continue;
        }
        if (!mask[next]) {
          if (freeId[next] >= 0) touches.add(freeId[next]);
          continue;
        }
        if (seen[next]) continue;
        seen[next] = 1;
        queue[tail++] = next;
      }
    }

    // Bridge between two fillable regions must stay sealed.
    if (touches.size >= 2) continue;
    for (const index of component) restored[index] = 0;
  }

  // True ink stays unfillable even after restore.
  for (let index = 0; index < count; index += 1) {
    if (ink[index]) restored[index] = 1;
  }
  return restored;
}

export function pixelFromUnit(unit: number, size: number) {
  if (!Number.isFinite(unit) || size <= 0) return 0;
  const pixel = Math.floor(unit * size);
  if (pixel < 0) return 0;
  if (pixel >= size) return size - 1;
  return pixel;
}

/**
 * Prefer the tapped pixel. If it sits on a dilated wall / soft edge, BFS outward
 * without crossing real ink, so the seed cannot jump into a neighboring region.
 */
export function findPaperSeed(
  original: Uint8ClampedArray,
  lineMask: Uint8Array,
  width: number,
  height: number,
  startX: number,
  startY: number,
  tolerance = FILL_TOLERANCE,
  maxRadius = SEED_SEARCH_RADIUS,
) {
  const softTolerance = Math.max(tolerance * 2, 96);

  const inBounds = (x: number, y: number) => x >= 0 && y >= 0 && x < width && y < height;

  const isUsablePaper = (x: number, y: number) => {
    const index = y * width + x;
    if (lineMask[index]) return false;
    const offset = index * 4;
    return isPaperPixel(original[offset], original[offset + 1], original[offset + 2], tolerance);
  };

  const canWalk = (x: number, y: number) => {
    if (!inBounds(x, y)) return false;
    const offset = (y * width + x) * 4;
    // Walk through paper and soft anti-alias / dilation halos, never solid ink.
    return isPaperPixel(original[offset], original[offset + 1], original[offset + 2], softTolerance);
  };

  if (!inBounds(startX, startY)) return null;
  if (isUsablePaper(startX, startY)) return { x: startX, y: startY };

  // Soft halo / sealed fringe: walk without crossing real ink.
  if (canWalk(startX, startY)) {
    const visited = new Uint8Array(width * height);
    const queueX = [startX];
    const queueY = [startY];
    visited[startY * width + startX] = 1;
    let head = 0;

    while (head < queueX.length) {
      const x = queueX[head];
      const y = queueY[head];
      head += 1;

      if (isUsablePaper(x, y)) return { x, y };

      const neighbors = [
        [x - 1, y],
        [x + 1, y],
        [x, y - 1],
        [x, y + 1],
      ];
      for (const [nx, ny] of neighbors) {
        if (!canWalk(nx, ny)) continue;
        const index = ny * width + nx;
        if (visited[index]) continue;
        const dist = Math.abs(nx - startX) + Math.abs(ny - startY);
        if (dist > maxRadius) continue;
        visited[index] = 1;
        queueX.push(nx);
        queueY.push(ny);
      }
    }
  }

  // Real ink taps: only nudge a short distance to the nearest open paper pocket.
  const inkNudge = Math.min(10, maxRadius);
  let best: { x: number; y: number } | null = null;
  let bestDist = Infinity;
  for (let dy = -inkNudge; dy <= inkNudge; dy += 1) {
    for (let dx = -inkNudge; dx <= inkNudge; dx += 1) {
      const dist = Math.abs(dx) + Math.abs(dy);
      if (dist === 0 || dist > inkNudge || dist >= bestDist) continue;
      const x = startX + dx;
      const y = startY + dy;
      if (!isUsablePaper(x, y)) continue;
      best = { x, y };
      bestDist = dist;
    }
  }
  return best;
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
  const seed = findPaperSeed(original, lineMask, width, height, startX, startY, tolerance);
  if (!seed) return 0;
  startX = seed.x;
  startY = seed.y;

  const start = startY * width + startX;
  const origin = start * 4;
  const sr = original[origin];
  const sg = original[origin + 1];
  const sb = original[origin + 2];

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
