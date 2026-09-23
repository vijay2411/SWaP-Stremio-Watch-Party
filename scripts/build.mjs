import { build } from 'esbuild';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
await mkdir('dist', { recursive: true });
const { version } = JSON.parse(await readFile('package.json', 'utf8'));
const banner = `// ==UserScript==
// @name         SWaP — Stremio Watch Party
// @namespace    https://github.com/vijay2411/SWaP-Stremio-Watch-Party
// @version      ${version}
// @description  One room code. Synchronized playback, group chat, and opt-in video calls. No account or Firebase setup.
// @match        https://web.stremio.com/*
// @homepageURL  https://github.com/vijay2411/SWaP-Stremio-Watch-Party
// @supportURL   https://github.com/vijay2411/SWaP-Stremio-Watch-Party/issues
// @downloadURL  https://raw.githubusercontent.com/vijay2411/SWaP-Stremio-Watch-Party/main/SWaP.user.js
// @updateURL    https://raw.githubusercontent.com/vijay2411/SWaP-Stremio-Watch-Party/main/SWaP.user.js
// @grant        none
// @run-at       document-idle
// @noframes
// @license      MIT
// ==/UserScript==`;
const options = { entryPoints: ['src/userscript.js'], bundle: true, format: 'iife', target: ['chrome110', 'firefox115', 'safari16.4'], loader: { '.css': 'text' }, legalComments: 'eof' };
await build({ ...options, outfile: 'dist/SWaP.user.js', banner: { js: banner }, define: { __DEMO__: 'false' }, minify: true });
await build({ ...options, outfile: 'demo/swap.js', define: { __DEMO__: 'true' }, sourcemap: true });
const peerLicense = await readFile('node_modules/peerjs/LICENSE', 'utf8');
await writeFile('dist/THIRD-PARTY-NOTICES.txt', `PeerJS 1.5.5\n${peerLicense}\nOther bundled license notices are included at the end of SWaP.user.js.\n`);
await writeFile('SWaP.user.js', await readFile('dist/SWaP.user.js'));
console.log('Built dist/SWaP.user.js and the local demo.');

const { buildExtension } = await import('./build-extension.mjs');
await buildExtension();
