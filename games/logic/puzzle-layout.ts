export const STAGE_W = 100;
export const STAGE_H = 156;
export const PIECE = 22;
export const ORIGIN_X = 14;
export const ORIGIN_Y = 2;
export const STRIDE = 24;
export const TRAY_Y = 82;
export const LOCK_DISTANCE = 9;

export function correctTopLeft(col: number, row: number) {
  return { x: ORIGIN_X + col * STRIDE, y: ORIGIN_Y + row * STRIDE };
}

export function trayTopLeft(index: number, random: () => number) {
  const col = index % 3;
  const row = Math.floor(index / 3);
  return {
    x: ORIGIN_X + col * STRIDE + (random() - 0.5) * 2,
    y: TRAY_Y + row * STRIDE + (random() - 0.5) * 2,
  };
}
