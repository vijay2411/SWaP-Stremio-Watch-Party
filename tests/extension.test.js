import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFile } from 'node:fs/promises';
import { registerToolbar } from '../extension/toolbar.js';
import { mountExtension } from '../extension/app.js';
import { crc32, makeZip } from '../scripts/zip.mjs';

function runtimeFixture() {
 const runtime={id:'swap-test',getURL:path=>'chrome-extension://swap-test/'+path,onMessage:{addListener(fn){this.listener=fn;},removeListener(fn){assert.equal(this.listener,fn);this.listener=null;}}};
 const sender={id:runtime.id,url:runtime.getURL('popup.html')};
 return {runtime,sender,call:(message,from=sender)=>{let result;runtime.onMessage.listener(message,from,r=>result=r);return result;}};
}
function channel(app) {
 const fixture=runtimeFixture();
 return {...fixture,dispose:registerToolbar(fixture.runtime,app)};
}
test('toolbar allows only its own popup and fixed status/show/hide messages',()=>{
 let shown=0,hidden=0;const c=channel({show:()=>shown++,hide:()=>hidden++,status:()=>({inRoom:true,open:false,hidden:false,roomCode:'must-not-leak'})});
 assert.deepEqual(c.call({type:'swap:status'}),{status:'ready',inRoom:true,open:false,hidden:false});assert.equal(shown,0);
 c.call({type:'swap:show'});c.call({type:'swap:hide'});assert.equal(shown,1);assert.equal(hidden,1);
 for(const message of [null,[],{type:'eval'},{type:'swap:show',url:'https://private.invalid'},{type:'swap:hide',script:'arbitrary'},{type:'swap:status',roomCode:'anything'}])assert.equal(c.call(message),undefined);
 for(const from of [{id:'other',url:c.sender.url},{id:'swap-test',url:'https://web.stremio.com/'},{id:'swap-test'},{}])for(const type of ['swap:show','swap:hide'])assert.equal(c.call({type},from),undefined);
 assert.equal(shown,1);assert.equal(hidden,1);c.dispose();assert.equal(c.runtime.onMessage.listener,null);
});
test('duplicate installs cannot be opened or hidden through this extension',()=>{
 const c=channel(null);for(const type of ['swap:status','swap:show','swap:hide'])assert.deepEqual(c.call({type}),{status:'duplicate'});c.dispose();
});
function extension(storage) {
 const c=runtimeFixture();let app;
 c.dispose=mountExtension(c.runtime,options=>{
   app={hidden:options.hidden,inRoom:true,show(){this.hidden=false;},hide(){this.hidden=true;},status(){return {hidden:this.hidden,inRoom:this.inRoom,open:!this.hidden};}};
   return app;
 },storage);
 return {...c,app};
}
function memoryStorage() {
 const entries=new Map();return {getItem:key=>entries.get(key)??null,setItem:(key,value)=>entries.set(key,value),removeItem:key=>entries.delete(key)};
}
test('extension hide survives tab reload; show restores visibility without ending its room',()=>{
 const store=memoryStorage(),first=extension(()=>store);assert.equal(first.app.hidden,false);
 first.call({type:'swap:hide'});assert.equal(first.app.hidden,true);assert.equal(first.app.inRoom,true);first.dispose();
 const reloaded=extension(()=>store);assert.equal(reloaded.app.hidden,true);
 reloaded.call({type:'swap:show'});assert.equal(reloaded.app.hidden,false);assert.equal(reloaded.app.inRoom,true);reloaded.dispose();
 const restored=extension(()=>store);assert.equal(restored.app.hidden,false);restored.dispose();
});
test('extension visibility is scoped to each tab and tolerates blocked storage',()=>{
 const storageA=memoryStorage(),storageB=memoryStorage();
 const a=extension(()=>storageA), b=extension(()=>storageB);
 a.call({type:'swap:hide'});assert.equal(a.app.hidden,true);assert.equal(b.app.hidden,false);a.dispose();b.dispose();
 for(const storage of [()=>{throw new Error('Storage blocked');},()=>({getItem(){throw Error();},setItem(){throw Error();},removeItem(){throw Error();}})]){
   const c=extension(storage);assert.equal(c.app.hidden,false);assert.equal(c.call({type:'swap:hide'}).hidden,true);assert.equal(c.call({type:'swap:show'}).hidden,false);c.dispose();
 }
});
const popupSource=await readFile(new URL('../extension/popup.js',import.meta.url),'utf8');
async function popup({result={status:'ready',inRoom:false,hidden:false},fail=false,tab={id:12}}={}){
 const els=Object.fromEntries(['status','show','hide','visibility-hint','stremio','version'].map(id=>[id,{hidden:['show','hide','visibility-hint'].includes(id),disabled:false,textContent:'',addEventListener(t,f){this[t]=f;}}]));
 const sent=[];let closed=false,failAction=false;
 const context=vm.createContext({document:{getElementById:id=>els[id]},chrome:{runtime:{getManifest:()=>({version:'4.2.0'})},tabs:{query:async()=>[tab],sendMessage:async(id,message)=>{
   sent.push({id,message:JSON.parse(JSON.stringify(message))});if(fail||failAction)throw new Error('No receiver');
   if(result.status==='ready'&&message.type!=='swap:status')result={...result,hidden:message.type==='swap:hide'};
   return result;
 }}},window:{close(){closed=true;}}});
 vm.runInContext(popupSource,context);await new Promise(resolve=>setImmediate(resolve));
 return {els,sent,closed:()=>closed,failAction:()=>failAction=true};
}
test('popup opens the current Stremio panel without reading tab URLs or room data',async()=>{
 const p=await popup();assert.equal(p.els.show.hidden,false);assert.equal(p.els.stremio.hidden,true);
 await p.els.show.click();assert.deepEqual(p.sent,[{id:12,message:{type:'swap:status'}},{id:12,message:{type:'swap:show'}}]);assert.equal(p.closed(),true);
});
test('popup hides the current tab and offers Show SWaP immediately afterward',async()=>{
 const p=await popup();assert.equal(p.els.hide.hidden,false);
 await p.els.hide.click();assert.match(p.els.status.textContent,/hidden on this tab/);assert.equal(p.els.hide.hidden,true);assert.equal(p.els.show.hidden,false);assert.match(p.els.show.textContent,/Show SWaP/);assert.equal(p.closed(),false);
 await p.els.show.click();assert.equal(p.closed(),true);assert.deepEqual(p.sent.map(s=>s.message.type),['swap:status','swap:hide','swap:show']);
});
test('popup explains that hiding keeps the room and call connected',async()=>{
 const p=await popup({result:{status:'ready',inRoom:true,hidden:false}});
 assert.match(p.els['visibility-hint'].textContent,/keeps your room and call connected/);
 await p.els.hide.click();assert.match(p.els.status.textContent,/room and any call are still running/);
});
test('popup gives reload/open guidance on unsupported tabs or missing content scripts',async()=>{
 for(const options of [{fail:true},{tab:{}},{result:{status:'unknown'}}]){const p=await popup(options);assert.equal(p.els.show.hidden,true);assert.equal(p.els.hide.hidden,true);assert.equal(p.els.stremio.hidden,false);assert.match(p.els.status.textContent,/Reload the tab/);}
 const closed=await popup();closed.failAction();await closed.els.hide.click();assert.match(closed.els.status.textContent,/Reload the tab/);assert.equal(closed.els.hide.hidden,true);assert.equal(closed.closed(),false);
});
test('popup explains duplicate installs and distinguishes active and hidden rooms',async()=>{
 const duplicate=await popup({result:{status:'duplicate'}});assert.match(duplicate.els.status.textContent,/Disable the old userscript/);assert.equal(duplicate.els.show.hidden,true);assert.equal(duplicate.els.hide.hidden,true);
 const active=await popup({result:{status:'ready',inRoom:true}});assert.match(active.els.status.textContent,/room is running/);
 const hidden=await popup({result:{status:'ready',inRoom:false,hidden:true}});assert.match(hidden.els.show.textContent,/Show SWaP/);assert.equal(hidden.els.hide.hidden,true);
});
test('ZIP is deterministic, uses standard CRC32 and rejects unsafe archive paths',()=>{
 assert.equal(crc32(Buffer.from('123456789')),0xcbf43926);
 const files=[{name:'manifest.json',data:'{}'},{name:'icons/test.png',data:Buffer.from([0,1,2])}];
 assert.deepEqual(makeZip(files),makeZip(files.slice().reverse()));
 for(const name of ['../private','/absolute','nested/../private','nested//file','bad\\file'])assert.throws(()=>makeZip([{name,data:'secret'}]));
});
