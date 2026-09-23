import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import { inflateRawSync } from 'node:zlib';
import { EXTENSION_FILES } from '../scripts/build-extension.mjs';
import { crc32 } from '../scripts/zip.mjs';
const folder=new URL('../dist/chrome-extension/',import.meta.url);
const pkg=JSON.parse(await readFile(new URL('../package.json',import.meta.url),'utf8'));
const manifest=JSON.parse(await readFile(new URL('manifest.json',folder),'utf8'));

test('production manifest confines automatic injection to top-level Stremio pages',()=>{
 assert.equal(manifest.manifest_version,3);assert.equal(manifest.version,pkg.version);assert.ok(manifest.description.length<=132);
 assert.equal(manifest.content_scripts.length,1);const c=manifest.content_scripts[0];
 assert.deepEqual(c.matches,['https://web.stremio.com/*']);assert.equal(c.world,'ISOLATED');assert.equal(c.all_frames,false);assert.equal(c.match_about_blank,false);assert.equal(c.run_at,'document_idle');
 for(const key of ['permissions','optional_permissions','host_permissions','optional_host_permissions','externally_connectable','web_accessible_resources','background','update_url','key'])assert.equal(manifest[key],undefined,key);
 assert.equal(manifest.content_security_policy.extension_pages,"script-src 'self'; object-src 'none'; base-uri 'none';");
});
test('all manifest files exist; icons are PNGs of the declared sizes',async()=>{
 for(const name of [manifest.action.default_popup,...manifest.content_scripts[0].js,...Object.values(manifest.action.default_icon)])assert.ok((await readFile(new URL(name,folder))).length);
 for(const [size,name] of Object.entries(manifest.icons)){
  const b=await readFile(new URL(name,folder));assert.equal(b.subarray(0,8).toString('hex'),'89504e470d0a1a0a');assert.equal(b.readUInt32BE(16),Number(size));assert.equal(b.readUInt32BE(20),Number(size));
 }
});
test('extension bundles the app without userscript headers, demo fixtures or remote code loading',async()=>{
 const content=await readFile(new URL('content.js',folder),'utf8'),popup=await readFile(new URL('popup.html',folder),'utf8');
 assert.ok(content.includes('SWaP'));assert.ok(content.includes('swap:status'));
 for(const pattern of [/==UserScript==/,/synthetic=1/,/Synthetic camera/,/port:9001/,/new Function\s*\(/,/\beval\s*\(/,/sourceMappingURL/])assert.equal(pattern.test(content),false,`Unexpected bundle marker ${pattern}`);
 assert.doesNotMatch(popup,/<script[^>]*>\s*[^<\s]/i);assert.doesNotMatch(popup,/\son\w+=/i);assert.doesNotMatch(popup,/<script[^>]+src=["']https?:/i);
});
test('ZIP has manifest at root, exact allowlisted files and byte-correct contents',async()=>{
 const zip=await readFile(new URL(`../dist/SWaP-Chrome-${pkg.version}.zip`,import.meta.url)),names=[];let at=0;
 while(zip.readUInt32LE(at)===0x04034b50){
  assert.equal(zip.readUInt16LE(at+8),8);const packed=zip.readUInt32LE(at+18),length=zip.readUInt16LE(at+26),extra=zip.readUInt16LE(at+28);
  const name=zip.subarray(at+30,at+30+length).toString(),start=at+30+length+extra,data=inflateRawSync(zip.subarray(start,start+packed));names.push(name);
  assert.equal(data.length,zip.readUInt32LE(at+22));assert.equal(crc32(data),zip.readUInt32LE(at+14));assert.deepEqual(data,await readFile(new URL(name,folder)));at=start+packed;
 }
 assert.deepEqual(names.sort(),[...EXTENSION_FILES].sort());assert.ok(names.includes('manifest.json'));assert.equal(zip.readUInt32LE(at),0x02014b50);
 assert.equal(zip.readUInt32LE(zip.length-22),0x06054b50);assert.equal(zip.readUInt16LE(zip.length-12),names.length);
 const onDisk=[];for(const item of await readdir(folder,{withFileTypes:true})){if(item.isDirectory())for(const file of await readdir(new URL(item.name+'/',folder)))onDisk.push(item.name+'/'+file);else onDisk.push(item.name);}assert.deepEqual(onDisk.sort(),names.sort());
});
