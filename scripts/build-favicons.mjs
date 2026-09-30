import sharp from 'sharp';
import { writeFile } from 'node:fs/promises';

// Mechanical icon exports from the same transparent logo used in the header.
const source = 'public/brand/trovun-logo-no-background.png';
const logo = await sharp(source).trim().toBuffer();
const png = (size) =>
  sharp(logo).resize(size, size, { fit: 'contain', background: '#00000000' }).png().toBuffer();
for (const [path, size] of [
  ['public/brand/trovun-favicon.png', 96],
  ['public/brand/trovun-icon-192.png', 192],
  ['public/brand/trovun-icon-512.png', 512],
  ['public/brand/trovun-apple-touch-icon.png', 180],
])
  await writeFile(path, await png(size));

// ICO directory wrapping PNG frames, supported by modern browsers and Windows.
const sizes = [16, 32, 48];
const frames = await Promise.all(sizes.map(png));
const header = Buffer.alloc(6 + 16 * sizes.length);
header.writeUInt16LE(1, 2);
header.writeUInt16LE(sizes.length, 4);
let offset = header.length;
frames.forEach((frame, index) => {
  const entry = 6 + index * 16;
  header[entry] = sizes[index];
  header[entry + 1] = sizes[index];
  header.writeUInt16LE(1, entry + 4);
  header.writeUInt16LE(32, entry + 6);
  header.writeUInt32LE(frame.length, entry + 8);
  header.writeUInt32LE(offset, entry + 12);
  offset += frame.length;
});
await writeFile('public/favicon.ico', Buffer.concat([header, ...frames]));
console.log('Exported Trovun favicons, touch icon and app icons.');
