import test from 'node:test';
import assert from 'node:assert/strict';
import { computeBoundingBox } from './signatureUtils';

test('computeBoundingBox finds the drawn area', () => {
  const width = 100;
  const height = 100;
  const rgba = new Uint8Array(width * height * 4);

  for (let y = 40; y < 50; y++) {
    for (let x = 40; x < 50; x++) {
      const i = (y * width + x) * 4;
      rgba[i] = rgba[i + 1] = rgba[i + 2] = 10;
      rgba[i + 3] = 255;
    }
  }

  const box = computeBoundingBox(rgba, width, height, 5);
  assert.ok(box);
  assert.deepEqual([box.minX, box.minY, box.maxX, box.maxY], [35, 35, 54, 54]);
  assert.equal(computeBoundingBox(new Uint8Array(width * height * 4), width, height), null);
});
