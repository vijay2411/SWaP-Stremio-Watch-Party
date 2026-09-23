import test from 'node:test';
import assert from 'node:assert/strict';
import { roomPair, settle } from './helpers/room-fixture.js';

test('busy group traffic forwarded by the authenticated host does not trigger the per-person limit', async () => {
 let chats=0; const p=await roomPair({guestEmit:t=>{if(t==='chat')chats++;}});
 try {
  assert.equal(p.guest.active,true);
  for(let i=0;i<100;i++)p.host.send(p.down,{t:'chat',message:{id:String(i),author:'friend-'+i,name:'Friend',text:'Hello',time:Date.now()}});
  await settle(); assert.equal(chats,100); assert.equal(p.down.closedCount,0);
 } finally {p.close();}
});
test('individual authenticated guests remain rate limited',async()=>{
 const p=await roomPair();
 try {for(let i=0;i<31;i++)p.guest.send(p.up,{t:'ping',nonce:i});await settle();assert.equal(p.down.closedCount,1);}
 finally {p.close();}
});
