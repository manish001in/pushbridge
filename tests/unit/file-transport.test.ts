import { base64ToBytes, bytesToBase64 } from '../../src/popup/fileTransport';

describe('moving files to the worker', () => {
  test('every byte value survives', () => {
    const bytes = Uint8Array.from({ length: 256 }, (_, i) => i);
    expect(base64ToBytes(bytesToBase64(bytes))).toEqual(bytes);
  });

  test('a file larger than one encoding chunk survives', () => {
    const bytes = new Uint8Array(0x8000 * 3 + 7).map((_, i) => (i * 31) % 256);
    expect(base64ToBytes(bytesToBase64(bytes))).toEqual(bytes);
  });

  test('an empty file survives', () => {
    expect(base64ToBytes(bytesToBase64(new Uint8Array()))).toHaveLength(0);
  });

  test('a 25 MB file fits in a 64 MiB message', () => {
    const encodedSize = Math.ceil((25 * 1024 * 1024) / 3) * 4;
    expect(encodedSize).toBeLessThan(64 * 1024 * 1024);
  });
});
