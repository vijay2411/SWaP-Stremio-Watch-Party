import test from 'node:test';
import assert from 'node:assert/strict';
import { Room } from '../src/room.js';
import { Calls } from '../src/calls.js';
import { VERSION } from '../src/protocol.js';
import { roomCredentials, randomToken, RoomHandshake } from '../src/room-auth.js';
import { decodeFrame, encodeFrame, MAX_FRAME_BYTES } from '../src/wire.js';
import { Connection, roomPair, settle } from './helpers/room-fixture.js';

test('discovery ID does not expose the code; two rooms derive different admission keys', async()=>{
 const a=await roomCredentials('AAAAAAAAAAAA'),b=await roomCredentials('BBBBBBBBBBBB');
 assert.ok(!a.hostId.includes('AAAAAAAAAAAA')); assert.notEqual(a.hostId,b.hostId); assert.equal(a.key.extractable,false);
 assert.equal((await roomCredentials('AAAAAAAAAAAA')).hostId,a.hostId);
});
test('same-code friends authenticate both endpoints and exchange chat', async()=>{
 const received=[];const p=await roomPair({guestEmit:(t,m)=>{if(t==='chat')received.push(m);}});
 try { assert.equal(p.guest.active,true);assert.equal(p.host.members.size,2);p.guest.chat('<img src=x onerror=alert(1)>');await settle();assert.equal(received[0].name,'Guest');assert.equal(received[0].text,'<img src=x onerror=alert(1)>'); }
 finally { p.close(); }
});
test('wrong-room key cannot authenticate even when targeting the correct discovery ID',async()=>{
 const p=await roomPair({guestCode:'BBBBBBBBBBBB'});
 try {assert.equal(p.guest.active,false);assert.equal(p.host.members.size,1);assert.equal(p.down.frames.some(x=>['welcome','history','roster','state'].includes(JSON.parse(x).t)),false);}
 finally {p.close();}
});
test('an unauthenticated connection cannot read history, change playback or inject chat',async()=>{
 const events=[],r=new Room((...e)=>events.push(e)),c=new Connection('attacker');
 Object.assign(r,{host:true,active:true,authKey:(await roomCredentials('AAAAAAAAAAAA')).key,hostId:'host'});
 r.history=[{text:'private'}];r.bind(c,true);c.open=true;c.emit('open');c.emit('data',encodeFrame({t:'chat',text:'injected'}));await settle();
 assert.equal(c.closedCount,1);assert.equal(r.members.size,0);assert.equal(c.frames.length,0);assert.equal(events.length,0);r.close();
});
test('captured guest proof fails on a fresh connection challenge',async()=>{
 const p=await roomPair();
 try {
  const hello=JSON.parse(p.up.frames.find(x=>JSON.parse(x).t==='authHello')), proof=JSON.parse(p.up.frames.find(x=>JSON.parse(x).t==='authProof'));
  let accepted=false,rejected=false;const a=new RoomHandshake({incoming:true,key:p.host.authKey,hostId:p.host.id,guestId:p.guest.id,send(){},accept(){accepted=true;},reject(){rejected=true;}});
  await a.receive(hello);await a.receive(proof);assert.equal(accepted,false);assert.equal(rejected,true);
 }finally{p.close();}
});
test('a second connection claiming an existing member ID cannot issue commands',async()=>{
 const p=await roomPair();
 try {p.host.fromGuest({peer:p.guest.id},{t:'chat',text:'forged'});assert.equal(p.host.history.length,0);}
 finally{p.close();}
});
test('closing during an asynchronous proof never admits a late member',async()=>{
 const creds=await roomCredentials('AAAAAAAAAAAA');let accepted=0,sent=0;
 const auth=new RoomHandshake({incoming:true,key:creds.key,hostId:creds.hostId,guestId:'guest',send(){sent++;},accept(){accepted++;},reject(){}});
 const work=auth.receive({t:'authHello',v:VERSION,nonce:randomToken(),name:'Guest',callToken:randomToken()});auth.close();await work;assert.equal(sent,0);assert.equal(accepted,0);
});
test('oversized, malformed, binary and multi-byte frames are rejected before application handling',()=>{
 for(const value of ['null','[]','{broken','{}',new Uint8Array(10),' '.repeat(MAX_FRAME_BYTES+1),JSON.stringify({t:'chat',text:'😀'.repeat(20000)})])assert.throws(()=>decodeFrame(value));
 assert.throws(()=>encodeFrame({t:'chat',text:'x'.repeat(MAX_FRAME_BYTES)}));assert.equal(decodeFrame(encodeFrame({t:'ping',nonce:1})).nonce,1);
});
test('malformed wire traffic closes only its authenticated connection',async()=>{
 const p=await roomPair();try{p.down.emit('data','{broken');assert.equal(p.down.closedCount,1);assert.equal(p.host.closed,false);assert.equal(p.host.members.size,1);}finally{p.close();}
});
test('calls require an active member and the recipient’s current room capability',()=>{
 const room={id:'host',closed:false,callToken:randomToken(),members:new Map([['friend',{call:true}],['inactive',{call:false}]]),peer:{disconnected:false},callStatus(){}};
 const calls=new Calls(room,()=>{});calls.stream={getTracks:()=>[]};let accepted=0;calls.bind=()=>accepted++;
 const make=(peer,token)=>({peer,metadata:{v:VERSION,token},closed:false,answered:false,close(){this.closed=true;},answer(){this.answered=true;}});
 try {
  for(const c of [make('outsider',room.callToken),make('friend',randomToken()),make('friend',undefined),make('inactive',room.callToken)]){calls.incoming(c);assert.equal(c.closed,true);assert.equal(c.answered,false);}
  const c=make('friend',room.callToken);calls.incoming(c);assert.equal(c.answered,true);assert.equal(accepted,1);
  room.closed=true;const late=make('friend',room.callToken);calls.incoming(late);assert.equal(late.closed,true);
 }finally{calls.close();}
});
test('room leave erases ephemeral admission keys, history and call capabilities',async()=>{
 const p=await roomPair();p.close();assert.equal(p.host.authKey,null);assert.equal(p.guest.callToken,'');assert.equal(p.host.bound.size,0);assert.equal(p.host.history.length,0);
});
test('large multilingual join history stays inside the outbound queue budget',()=>{
 const r=new Room(()=>{});r.history=Array.from({length:100},(_,i)=>({id:String(i),author:'host',name:'Host',text:'映'.repeat(1000),time:i}));
 const frames=[],c={open:true,send:raw=>frames.push(raw),close(){throw Error('unexpected close');}};r.replayHistory(c);
 assert.ok(frames.length>0&&frames.length<100);assert.ok(frames.reduce((n,s)=>n+Buffer.byteLength(s),0)<=128*1024);assert.equal(JSON.parse(frames.at(-1)).message.id,'99');r.close();
});
