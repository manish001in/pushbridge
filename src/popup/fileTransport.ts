/**
 * Files reach the worker through runtime messages, which Chrome serializes as JSON
 * and limits to 64 MiB. Base64 keeps a 25 MB file well under that; a list of byte
 * numbers can take four times the file's size and go over.
 */
export function bytesToBase64(bytes: Uint8Array): string {
  const chunkSize = 0x8000;
  let binary = '';
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
  }
  return btoa(binary);
}

export function base64ToBytes(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

export async function serializeFile(file: File) {
  return {
    name: file.name,
    type: file.type,
    size: file.size,
    lastModified: file.lastModified,
    base64: bytesToBase64(new Uint8Array(await file.arrayBuffer())),
  };
}
