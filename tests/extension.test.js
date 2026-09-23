import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFile } from 'node:fs/promises';
import { registerToolbar } from '../extension/toolbar.js';
import { crc32, makeZip } from '../scripts/zip.mjs';

function channel(app) {
 const runtime={id:'swap-test',getURL:path=>'chrome-extension://swap-test/'+path,onMessage:{addListener(fn){this.listener=fn;},removeListener(fn){assert.equal(this.listener,fn);this.listener=null;}}};
 const dispose=registerToolbar(runtime,app), sender={id:runtime.id,url:runtime.getURL('popup.html')};
 return {runtime,sender,dispose,call:(message,from=sender)=>{let result;runtime.onMessage.listener(message,from,r=>result=r);return result;}};
}
test('toolbar allows only its own popup and fixed status/show messages',()=>{
 let shown=0;const c=channel({show:()=>shown++,status:()=>({inRoom:true,open:false})});
 assert.deepEqual(c.call({type:'swap:status'}),{status:'ready',inRoom:true,open:false});assert.equal(shown,0);
 c.call({type:'swap:show'});assert.equal(shown,1);
 for(const message of [null,[],{type:'eval'},{type:'swap:show',url:'https://private.invalid'},{type:'swap:status',roomCode:'anything'}])assert.equal(c.call(message),undefined);
 for(const from of [{id:'other',url:c.sender.url},{id:'swap-test',url:'https://web.stremio.com/'},{id:'swap-test'},{}])assert.equal(c.call({type:'swap:show'},from),undefined);
 assert.equal(shown,1);c.dispose();assert.equal(c.runtime.onMessage.listener,null);
});
test('duplicate installs are reported without opening the old application',()=>{
 const c=channel(null);assert.deepEqual(c.call({type:'swap:status'}),{status:'duplicate'});assert.deepEqual(c.call({type:'swap:show'}),{status:'duplicate'});c.dispose();
});
const popupSource=await readFile(new URL('../extension/popup.js',import.meta.url),'utf8');
async function popup({result={status:'ready',inRoom:false},fail=false,tab={id:12}}={}){
 const els=Object.fromEntries(['status','show','stremio','version'].map(id=>[id,{hidden:id==='show',disabled:false,textContent:'',addEventListener(t,f){this[t]=f;}}]));
 const sent=[];let closed=false;
 const context=vm.createContext({document:{getElementById:id=>els[id]},chrome:{runtime:{getManifest:()=>({version:'4.1.0'})},tabs:{query:async()=>[tab],sendMessage:async(id,message)=>{sent.push({id,message:JSON.parse(JSON.stringify(message))});if(fail)throw new Error('No receiver');return result;}}},window:{close(){closed=true;}}});
 vm.runInContext(popupSource,context);await new Promise(resolve=>setImmediate(resolve));
 return {els,sent,closed:()=>closed};
}
test('popup opens the current Stremio panel without reading tab URLs or room data',async()=>{
 const p=await popup();assert.equal(p.els.show.hidden,false);assert.equal(p.els.stremio.hidden,true);
 await p.els.show.click();assert.deepEqual(p.sent,[{id:12,message:{type:'swap:status'}},{id:12,message:{type:'swap:show'}}]);assert.equal(p.closed(),true);
});
test('popup gives reload/open guidance on unsupported tabs or missing content scripts',async()=>{
 for(const options of [{fail:true},{tab:{}},{result:{status:'unknown'}}]){const p=await popup(options);assert.equal(p.els.show.hidden,true);assert.equal(p.els.stremio.hidden,false);assert.match(p.els.status.textContent,/Reload the tab/);}
});
test('popup explains duplicate installs and distinguishes active rooms',async()=>{
 const duplicate=await popup({result:{status:'duplicate'}});assert.match(duplicate.els.status.textContent,/Disable the old userscript/);assert.equal(duplicate.els.show.hidden,true);
 const active=await popup({result:{status:'ready',inRoom:true}});assert.match(active.els.status.textContent,/room is running/);
});
test('ZIP is deterministic, uses standard CRC32 and rejects unsafe archive paths',()=>{
 assert.equal(crc32(Buffer.from('123456789')),0xcbf43926);
 const files=[{name:'manifest.json',data:'{}'},{name:'icons/test.png',data:Buffer.from([0,1,2])}];
 assert.deepEqual(makeZip(files),makeZip(files.slice().reverse()));
 for(const name of ['../private','/absolute','nested/../private','nested//file','bad\\file'])assert.throws(()=>makeZip([{name,data:'secret'}]));
});
