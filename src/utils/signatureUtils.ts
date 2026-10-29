export interface BoundingBox {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
  width: number;
  height: number;
}

/** Bounding box of the drawn (non-transparent) pixels in an RGBA buffer, or null if nothing is drawn. */
export function computeBoundingBox(
  rgba: Uint8ClampedArray | Uint8Array,
  width: number,
  height: number,
  padding = 10
): BoundingBox | null {
  let minX = width;
  let minY = height;
  let maxX = 0;
  let maxY = 0;
  let drawn = 0;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4;
      if (rgba[i + 3] > 30 && (rgba[i] < 240 || rgba[i + 1] < 240 || rgba[i + 2] < 240)) {
        drawn++;
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }

  if (drawn < 20) return null;

  minX = Math.max(0, minX - padding);
  minY = Math.max(0, minY - padding);
  maxX = Math.min(width - 1, maxX + padding);
  maxY = Math.min(height - 1, maxY + padding);

  return { minX, minY, maxX, maxY, width: maxX - minX + 1, height: maxY - minY + 1 };
}
