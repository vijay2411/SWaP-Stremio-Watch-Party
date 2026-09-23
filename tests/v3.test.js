import test from 'node:test';
import assert from 'node:assert/strict';
import { deflateSync } from 'node:zlib';
import { displayText, decodeStream, streamInfo, compareMedia, MediaCatalog } from '../src/media.js';
import { validMedia, validPolicy, validReport, validState, mediaKey, policyValues } from '../src/protocol.js';
import { Room } from '../src/room.js';
import { PlayerSync, BufferGate } from '../src/player.js';
const key='movie/tt123/tt123', route='#/player/stream/addon/meta/movie/tt123/tt123';
const base={key,duration:600,time:10,rate:1,paused:false,buffering:false,seq:1};
const flush=()=>new Promise(r=>setImmediate(r));
class Video extends EventTarget {
 constructor(){super();Object.assign(this,{paused:true,currentTime:10,duration:600,readyState:4,playbackRate:1,clientWidth:800,clientHeight:450,seekable:{length:1,start:()=>0,end:()=>600}});}
 play(){this.paused=false;this.dispatchEvent(new Event('play'));return Promise.resolve();}
 pause(){if(!this.paused){this.paused=true;this.dispatchEvent(new Event('pause'));}}
}
function setup(){let now=1000;const v=new Video(),events=[],r=new Room((...e)=>events.push(e));Object.assign(r,{host:true,id:'h',name:'Host',active:true});r.members.set('h',{id:'h',name:'Host',host:true});r.members.set('g',{id:'g',name:'Guest',joinedAt:1000});const location={hash:route};const p=new PlayerSync(r,()=>{}, {timer:false,now:()=>now,location,document:{querySelectorAll:()=>[v]},catalog:{read:()=>({title:'Test Movie'}),close(){}}});return {r,p,v,events,location,advance:n=>now+=n,now:()=>now,close:()=>{p.close();r.close();}};}

test('compressed Stremio streams decode, malformed and excessive payloads fail closed',async()=>{
 const stream={name:'Provider 1080p',behaviorHints:{filename:'Movie.2025.1080p.mkv'},url:'https://private.example/secret'};
 assert.deepEqual(await decodeStream(encodeURIComponent(deflateSync(JSON.stringify(stream)).toString('base64'))),stream);
 assert.deepEqual(await decodeStream(encodeURIComponent(JSON.stringify(stream))),stream);
 assert.equal(await decodeStream('not-a-stream'),null);
 assert.equal(await decodeStream(deflateSync(JSON.stringify({title:'x'.repeat(100000)})).toString('base64')),null);
});
test('stream identity does not reveal URLs, headers, account tokens or raw torrent hashes',async()=>{
 const stream={name:'Provider 1080p',title:'Release\nhttps://private.example/TOKEN\napi_key=SECRET',url:'https://SECRET',headers:{Authorization:'Bearer SECRET'},infoHash:'a'.repeat(40),fileIdx:0};
 const a=await streamInfo(stream,'room-a'),b=await streamInfo(stream,'room-b');
 assert.equal(a.source,'Provider 1080p');assert.equal(a.release,'Release');assert.equal(a.fingerprint.length,64);assert.notEqual(a.fingerprint,b.fingerprint);
 assert.equal(validMedia(a),true);assert.doesNotMatch(JSON.stringify(a),/SECRET|TOKEN|aaaaaa|https:/);
 assert.equal(displayText('hello\u202e world'),'hello world');
 assert.equal((await streamInfo({...stream,fileIdx:undefined},'a')).fingerprint,'');
});
test('duration is sufficient to allow synchronization when source metadata is unavailable',()=>{
 assert.match(compareMedia(base,{...base,duration:603}).text,/Title and duration match/);
 assert.equal(compareMedia(base,{...base,duration:603}).kind,'unknown');
 const mismatch=compareMedia(base,{...base,duration:640});assert.equal(mismatch.kind,'mismatch');assert.match(mismatch.text,/10:40, host 10:00 \(0:40 longer\)/);
 assert.equal(compareMedia(base,{...base,key:'series/tt123/tt123:1:2'}).kind,'mismatch');
 assert.equal(compareMedia({...base,media:{source:'A'}},{...base,media:{source:'B'}}).kind,'warning');
 const media={fingerprint:'a'.repeat(64),fingerprintKind:'torrent'};
 assert.match(compareMedia({...base,media},{...base,media}).text,/Same reported torrent file/);
});
test('optional metadata failing or finishing after navigation cannot break or overwrite the new title',async()=>{
 let resolve;const c=new MediaCatalog('r',{navigator:{},fetch:()=>new Promise(r=>resolve=r)});
 c.read(route);await flush();await flush();
 c.read('#/player/stream/addon/meta/movie/custom/custom');
 resolve({ok:true,json:async()=>({meta:{id:'tt123',name:'Old title'}})});await flush();
 assert.equal(c.read('#/player/stream/addon/meta/movie/custom/custom').title,'custom');c.close();
 const broken=new MediaCatalog('r',{navigator:{},fetch:async()=>{throw Error('offline');}});broken.read(route);await flush();await flush();assert.equal(broken.read(route).title,'tt123');broken.close();
});
test('protocol rejects invalid wait modes, unsafe media fields, oversized statuses and malformed reports',()=>{
 assert.equal(validPolicy({controls:'host',wait:true,waitLimit:0,startTogether:true}),true);
 for(const p of [{waitLimit:-1},{waitLimit:999999},{startTogether:'yes'}])assert.equal(validPolicy({controls:'host',wait:true,...p}),false);
 assert.equal(validMedia({url:'https://private'}),false);assert.equal(validMedia({title:'x'.repeat(201)}),false);
 assert.equal(validState({...base,roomStatus:'x'.repeat(4001)}),false);
 assert.equal(validReport({key,status:'ready',duration:1,ready:'yes'}),false);
});
test('Play starts immediately without Ready, even before a new guest reports',async()=>{
 const f=setup();assert.deepEqual(f.r.policy,{controls:'host',wait:true});
 f.p.control({key,action:'play'});await flush();assert.equal(f.v.paused,false);assert.equal(f.r.state.startWaiting,false);
 f.r.reports.set('g',{key,status:'ready',ready:false,duration:600,at:f.now()});f.p.tick();assert.equal(f.r.state.buffering,false);
 f.location.hash='#/player/stream/addon/meta/movie/tt456/tt456';f.p.tick();assert.equal(f.v.paused,true);
 f.p.control({key:'movie/tt456/tt456',action:'play'});await flush();assert.equal(f.v.paused,false);f.close();
});
test('manual pauses during buffering survive Continue without waiting',async()=>{
 const f=setup();f.p.control({key,action:'play'});await flush();
 f.r.reports.set('g',{key,status:'loading',duration:600,at:f.now()});f.p.tick();assert.equal(f.v.paused,true);
 f.p.control({key,action:'pause'});f.p.continueWithoutWaiting();await flush();assert.equal(f.v.paused,true);f.close();
});
test('the room resumes after exactly 20 seconds of fresh buffering reports',async()=>{
 const f=setup();f.p.control({key,action:'play'});await flush();
 const r={key,status:'loading',duration:600,at:f.now()};f.r.reports.set('g',r);f.p.tick();assert.equal(f.v.paused,true);assert.match(f.r.state.roomStatus,/Guest · 20s remaining/);
 f.advance(19999);r.at=f.now();f.p.tick();assert.equal(f.v.paused,true);
 f.advance(1);r.at=f.now();f.p.tick();await flush();assert.equal(f.v.paused,false);assert.equal(f.r.state.buffering,false);assert.match(f.r.state.roomStatus,/Continuing without Guest/);f.close();
});
test('turning off the buffering wait resumes immediately and drops obsolete readiness options',async()=>{
 const f=setup();f.p.control({key,action:'play'});await flush();
 f.r.reports.set('g',{key,status:'loading',duration:600,at:f.now()});f.p.tick();assert.equal(f.v.paused,true);
 f.r.setPolicy({controls:'everyone',wait:false});f.p.tick();await flush();assert.equal(f.v.paused,false);
 assert.deepEqual(policyValues({controls:'host',wait:true,startTogether:true,waitLimit:60}),{controls:'host',wait:true});f.close();
});
test('bounded buffering gives a countdown, stable recovery and no repeated holds after timeout',()=>{
 const gate=new BufferGate(),reports=new Map([['g',{key,status:'loading',at:0}]]);
 assert.equal(gate.update(reports,key,true,0,30000,2000).remaining,30);
 reports.get('g').at=29000;assert.equal(gate.update(reports,key,true,29000,30000,2000).remaining,1);
 reports.get('g').at=30000;assert.deepEqual(gate.update(reports,key,true,30000,30000,2000).skipped,['g']);
 reports.get('g').status='ready';gate.update(reports,key,true,30001,30000,2000);
 reports.get('g').status='loading';reports.get('g').at=34000;assert.equal(gate.update(reports,key,true,34000,30000,2000).waiting.length,0);
 reports.get('g').status='ready';gate.update(reports,key,true,34001,30000,2000);reports.get('g').at=44001;gate.update(reports,key,true,44001,30000,2000);
 reports.get('g').status='loading';assert.deepEqual(gate.update(reports,key,true,44002,30000,2000).waiting,['g']);
});
test('recovered buffering peers release after two stable seconds; failed or stale peers never hold',()=>{
 const gate=new BufferGate(),r={key,status:'loading',at:0},reports=new Map([['g',r]]);
 gate.update(reports,key,true,0,20000,2000);r.status='ready';r.at=1000;
 assert.equal(gate.update(reports,key,true,1000,20000,2000).waiting.length,1);
 assert.equal(gate.update(reports,key,true,3000,20000,2000).waiting.length,0);
 r.status='loading';r.at=4000;gate.update(reports,key,true,4000,20000,2000);
 assert.equal(gate.update(reports,key,true,11000,20000,2000).waiting.length,0);
 r.status='error';r.at=11000;assert.equal(gate.update(reports,key,true,11000,20000,2000).waiting.length,0);
});
test('all peers receive named wait state and validated per-person duration reports',()=>{
 const f=setup();f.r.reports.set('g',{key,status:'loading',ready:true,duration:600,time:7,at:f.now(),media:{source:'Provider'}});f.p.tick();
 assert.match(f.r.state.roomStatus,/Guest/);const guest=f.r.playback.find(p=>p.id==='g');assert.equal(guest.time,7);assert.equal(guest.stale,false);assert.equal(guest.media.source,'Provider');
 const events=[],receiver=new Room((...e)=>events.push(e));receiver.active=true;receiver.fromHost({t:'playbackRoster',reports:[guest,{...guest,media:{url:'https://private'}}]});assert.equal(receiver.playback.length,1);receiver.close();f.close();
});
test('stale reports do not hold playback while missing reports stay visible in the roster',async()=>{
 const f=setup();f.p.control({key,action:'play'});await flush();
 f.advance(7000);f.r.reports.set('g',{key,status:'loading',duration:600,at:1000});f.p.tick();await flush();
 assert.equal(f.v.paused,false);assert.equal(f.r.playback.find(x=>x.id==='g').stale,true);f.close();
});
test('opening another title is reported as mismatch even when the durations are equal',()=>{
 const f=setup();f.r.reports.set('g',{key:'movie/tt999/tt999',duration:600,time:0,status:'loading',at:f.now()});f.p.tick();assert.equal(f.r.state.buffering,false);f.close();
});

test('friends joining a paused room do not create an initial readiness gate',async()=>{
 const f=setup();f.r.members.delete('g');f.p.tick();assert.equal(f.v.paused,true);
 f.r.members.set('g',{id:'g',name:'Guest',joinedAt:f.now()});f.p.control({key,action:'play'});await flush();
 assert.equal(f.v.paused,false);assert.equal(f.r.state.startWaiting,false);f.close();
});

test('a stale report does not reset the buffer timeout when that connection comes back',()=>{
 const g=new BufferGate(),r={key,status:'loading',at:0},reports=new Map([['g',r]]);
 g.update(reports,key,true,0,15000,2000);assert.equal(g.update(reports,key,true,7000,15000,2000).waiting.length,0);
 r.at=16000;assert.deepEqual(g.update(reports,key,true,16000,15000,2000).skipped,['g']);
});
test('malformed fingerprint values cannot throw out of message validation',()=>{
 for(const fingerprint of [{toString:'bad'},[],42,null])assert.equal(validMedia({fingerprint}),false);
 assert.equal(mediaKey(route+'?forceTranscoding=true'),key);
});

test('a still-buffering guest is not labeled in sync after the host stops waiting',()=>{
 const f=setup();f.r.host=false;f.v.readyState=2;let result;f.p.status=(...s)=>result=s;f.p.receive(base);
 assert.equal(result[1],'waiting');assert.match(result[0],/Your stream is buffering/);f.close();
});

test('a guest with a different duration cannot control playback even when Everyone is enabled',()=>{
 const events=[],r=new Room((...e)=>events.push(e));Object.assign(r,{host:true,active:true,state:base});r.policy.controls='everyone';r.members.set('g',{id:'g',name:'Guest'});
 const conn={peer:'g'},command={key,action:'seek',value:20}; r.links.set(conn.peer, conn);
 for(const report of [{key,status:'ready',duration:660,at:performance.now()},{key,status:'ready',duration:600,at:performance.now()-7000}]){r.reports.set('g',report);r.fromGuest(conn,{t:'command',command});assert.equal(events.length,0);}
 r.reports.set('g',{key,status:'ready',duration:600,at:performance.now()});r.fromGuest(conn,{t:'command',command});assert.equal(events[0][0],'command');r.close();
});

test('title metadata arriving after the video route still updates the movie card data',async()=>{
 const nav={mediaSession:{metadata:null}},c=new MediaCatalog('r',{navigator:nav,remote:false});
 c.read(route);await flush();assert.equal(c.read(route).title,'tt123');
 nav.mediaSession.metadata={title:'Movie title loaded later'};assert.equal(c.read(route).title,'Movie title loaded later');c.close();
});

test('successful optional public metadata enriches a title without sharing request credentials',async()=>{
 let request;const c=new MediaCatalog('r',{navigator:{},fetch:async function(url,options){assert.equal(this,globalThis);request={url,options};return {ok:true,json:async()=>({meta:{id:'tt123',name:'Verified title',releaseInfo:'2025',description:'A short description.'}})};}});
 c.read(route);await flush();await flush();const data=c.read(route);assert.equal(data.title,'Verified title (2025)');assert.equal(data.description,'A short description.');assert.equal(request.options.credentials,'omit');assert.equal(request.options.referrerPolicy,'no-referrer');assert.equal(request.url,'https://v3-cinemeta.strem.io/meta/movie/tt123.json');c.close();
});

test('three-person room waits for both buffering friends and resumes only after both recover',async()=>{
 const f=setup();f.r.members.set('g2',{id:'g2',name:'Second friend'});
 f.p.control({key,action:'play'});await flush();
 const first={key,status:'loading',duration:600,at:f.now()},second={...first};
 f.r.reports.set('g',first);f.r.reports.set('g2',second);f.p.tick();
 assert.equal(f.v.paused,true);assert.match(f.r.state.roomStatus,/Guest, Second friend/);
 first.status='ready';f.p.tick();f.advance(2000);first.at=second.at=f.now();f.p.tick();
 assert.equal(f.v.paused,true);assert.match(f.r.state.roomStatus,/Waiting for Second friend/);
 second.status='ready';f.p.tick();f.advance(2000);first.at=second.at=f.now();f.p.tick();await flush();
 assert.equal(f.v.paused,false);assert.equal(f.r.state.buffering,false);f.close();
});
test('a disconnected buffering participant stops holding the room on the next tick',async()=>{
 const f=setup();f.p.control({key,action:'play'});await flush();
 f.r.reports.set('g',{key,status:'loading',duration:600,at:f.now()});f.p.tick();assert.equal(f.v.paused,true);
 f.r.reports.delete('g');f.r.members.delete('g');f.p.tick();await flush();
 assert.equal(f.v.paused,false);assert.equal(f.r.playback.length,1);f.close();
});
test('disabling guest waits never overrides the host own buffering or stream failure',async()=>{
 const f=setup();f.r.policy.wait=false;f.p.control({key,action:'play'});await flush();
 f.v.readyState=2;f.p.tick();assert.equal(f.v.paused,true);assert.equal(f.r.state.buffering,true);assert.match(f.r.state.roomStatus,/Host.*stream loading/);
 f.p.continueWithoutWaiting();assert.equal(f.v.paused,true);
 f.v.readyState=4;f.v.error={code:3};f.p.tick();assert.equal(f.v.paused,true);assert.match(f.r.state.roomStatus,/stream failed/);
 f.v.error=null;f.p.tick();await flush();assert.equal(f.v.paused,false);f.close();
});
test('a duration mismatch pauses a guest and restoring a matching stream resumes automatically',async()=>{
 const f=setup();f.r.host=false;f.p.receive(base);await flush();assert.equal(f.v.paused,false);
 f.v.duration=660;f.p.receive({...base,seq:2});assert.equal(f.v.paused,true);assert.equal(f.p.snapshot().status,'mismatch');
 f.v.duration=600;f.p.receive({...base,seq:3});await flush();assert.equal(f.v.paused,false);assert.equal(f.p.snapshot().status,'ready');f.close();
});
test('small drift adjusts playback rate, large drift seeks, and pausing restores the host rate',async()=>{
 const f=setup();f.r.host=false;f.v.currentTime=9.5;f.p.receive(base);await flush();
 assert.equal(f.v.currentTime,9.5);assert.ok(f.v.playbackRate>1);
 f.p.receive({...base,time:40,seq:2});assert.equal(f.v.currentTime,40);
 f.p.receive({...base,time:40,paused:true,seq:3});assert.equal(f.v.paused,true);assert.equal(f.v.playbackRate,1);f.close();
});
test('changing titles clears an old buffering hold without auto-playing the new title',async()=>{
 const f=setup();f.p.control({key,action:'play'});await flush();
 f.r.reports.set('g',{key,status:'loading',duration:600,at:f.now()});f.p.tick();assert.equal(f.r.state.buffering,true);
 f.location.hash='#/player/stream/addon/meta/movie/tt456/tt456';f.p.tick();
 assert.equal(f.r.state.buffering,false);assert.equal(f.r.state.paused,true);assert.equal(f.v.paused,true);f.close();
});
