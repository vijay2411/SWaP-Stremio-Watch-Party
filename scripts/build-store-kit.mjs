import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { makeZip } from './zip.mjs';
const { version } = JSON.parse(await readFile('package.json', 'utf8'));
const names = [
  'CHROME-WEB-STORE.md', 'PRIVACY.md', 'TESTING.md', 'store/README.md',
  ...['description', 'single-purpose', 'host-permission', 'remote-code', 'reviewer-instructions'].map(name => `store/${name}.txt`),
  ...['store-icon-128.png', '01-create-or-join-1280x800.jpg', '02-room-chat-1280x800.jpg', '03-light-theme-1280x800.jpg', 'small-promo-440x280.jpg', 'marquee-1400x560.jpg'].map(name => `store/assets/${name}`),
];
const zip = makeZip(await Promise.all(names.map(async name => ({ name, data: await readFile(name) }))));
const filename = `SWaP-Store-Kit-${version}.zip`;
await mkdir('dist', { recursive: true });
await writeFile(`dist/${filename}`, zip);
await writeFile(`dist/${filename}.sha256`, `${createHash('sha256').update(zip).digest('hex')}  ${filename}\n`);
console.log(`Built dist/${filename}; listing assets only, not an installable extension.`);
