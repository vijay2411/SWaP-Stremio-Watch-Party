import { deflateRawSync } from 'node:zlib';

export function crc32(bytes) {
  let crc = 0xffffffff;
  for (const byte of bytes) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit++) crc = (crc >>> 1) ^ ((crc & 1) ? 0xedb88320 : 0);
  }
  return (crc ^ 0xffffffff) >>> 0;
}
// Deterministic, ordinary ZIP: fixed dates, UTF-8 names, deflate, no ZIP64.
// The caller supplies an explicit allowlist, never a recursive workspace archive.
export function makeZip(files) {
  const local = [], central = []; let offset = 0;
  for (const { name, data } of [...files].sort((a, b) => a.name.localeCompare(b.name, 'en'))) {
    if (!/^[a-zA-Z0-9_.\/-]+$/.test(name) || name.startsWith('/') || name.split('/').some(p => !p || p === '..' || p === '.')) throw new Error('Unsafe archive path');
    const filename = Buffer.from(name), raw = Buffer.from(data), compressed = deflateRawSync(raw, { level: 9 }), crc = crc32(raw);
    const head = Buffer.alloc(30);
    head.writeUInt32LE(0x04034b50); head.writeUInt16LE(20, 4); head.writeUInt16LE(0x800, 6); head.writeUInt16LE(8, 8); head.writeUInt16LE(33, 12);
    head.writeUInt32LE(crc, 14); head.writeUInt32LE(compressed.length, 18); head.writeUInt32LE(raw.length, 22); head.writeUInt16LE(filename.length, 26);
    local.push(head, filename, compressed);
    const entry = Buffer.alloc(46);
    entry.writeUInt32LE(0x02014b50); entry.writeUInt16LE(20, 4); entry.writeUInt16LE(20, 6); entry.writeUInt16LE(0x800, 8); entry.writeUInt16LE(8, 10); entry.writeUInt16LE(33, 14);
    entry.writeUInt32LE(crc, 16); entry.writeUInt32LE(compressed.length, 20); entry.writeUInt32LE(raw.length, 24); entry.writeUInt16LE(filename.length, 28); entry.writeUInt32LE(offset, 42);
    central.push(entry, filename); offset += head.length + filename.length + compressed.length;
  }
  const directory = Buffer.concat(central), end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50); end.writeUInt16LE(files.length, 8); end.writeUInt16LE(files.length, 10); end.writeUInt32LE(directory.length, 12); end.writeUInt32LE(offset, 16);
  return Buffer.concat([...local, directory, end]);
}
