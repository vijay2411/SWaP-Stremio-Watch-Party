import { build } from 'esbuild';
import { mkdir, readFile, writeFile, rm } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { createHash } from 'node:crypto';
import { makeZip } from './zip.mjs';

export const EXTENSION_FILES = [
  'manifest.json', 'content.js', 'popup.html', 'popup.js', 'popup.css',
  'icons/icon16.png', 'icons/icon32.png', 'icons/icon48.png', 'icons/icon128.png',
  'LICENSE.txt', 'THIRD-PARTY-NOTICES.txt', 'PRIVACY.md'
];
export async function buildExtension() {
  const { version } = JSON.parse(await readFile('package.json', 'utf8'));
  const manifest = JSON.parse(await readFile('extension/manifest.json', 'utf8'));
  if (manifest.version !== version) throw new Error('Update extension/manifest.json to match package.json');
  const out = 'dist/chrome-extension';
  await rm(out, { recursive: true, force: true });
  await mkdir(`${out}/icons`, { recursive: true });
  await build({ entryPoints: ['extension/content.js'], outfile: `${out}/content.js`, bundle: true, format: 'iife', target: ['chrome120'], loader: { '.css': 'text' }, legalComments: 'eof', minify: true, define: { __DEMO__: 'false' } });
  for (const name of EXTENSION_FILES) {
    if (name === 'content.js') continue;
    const source = name === 'LICENSE.txt' ? 'LICENSE' : ['THIRD-PARTY-NOTICES.txt', 'PRIVACY.md'].includes(name) ? name : `extension/${name}`;
    await mkdir(dirname(`${out}/${name}`), { recursive: true });
    let data = await readFile(source);
    if (name === 'THIRD-PARTY-NOTICES.txt') data = Buffer.from(data.toString().replaceAll('SWaP.user.js', 'content.js'));
    await writeFile(`${out}/${name}`, data);
  }
  const files = await Promise.all(EXTENSION_FILES.map(async name => ({ name, data: await readFile(`${out}/${name}`) })));
  const zip = makeZip(files), filename = `SWaP-Chrome-${version}.zip`;
  await writeFile(`dist/${filename}`, zip);
  await writeFile(`dist/${filename}.sha256`, `${createHash('sha256').update(zip).digest('hex')}  ${filename}\n`);
  console.log(`Built ${out} and dist/${filename} (${zip.length} bytes).`);
}
if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) await buildExtension();
