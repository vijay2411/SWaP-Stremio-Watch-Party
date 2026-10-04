import test from 'node:test';
import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import { Calls } from '../src/calls.js';
import { VERSION } from '../src/protocol.js';

class PC extends EventTarget {
  connectionState = 'new';
  state(value) { this.connectionState=value; this.dispatchEvent(new Event('connectionstatechange')); }
}
class Offer extends EventEmitter {
  constructor(peer='friend', token='a'.repeat(64)) { super(); Object.assign(this,{peer,metadata:{v:VERSION,token},open:false,closed:0,answered:0}); }
  answer() { this.answered++; this.open=true; this.peerConnection=new PC(); }
  close() { this.closed++; if(this.open){this.open=false;this.emit('close');} }
}
const stream=()=>({getTracks:()=>[]});
function setup(t,active=false) {
  t.mock.timers.enable({apis:['setTimeout','setInterval']});
  const events=[],member={id:'friend',name:'Friend',call:active,callToken:'b'.repeat(64)};
  const room={id:'host',closed:false,callToken:'a'.repeat(64),members:new Map([['friend',member]]),peer:{disconnected:false},callStatus(){}};
  const calls=new Calls(room,(...args)=>events.push(args));calls.stream=stream();calls.members=[member];
  t.after(()=>calls.close());return {calls,room,events,member};
}
test('offer preceding authenticated call status is held, then answered exactly once',t=>{
  const f=setup(t),offer=new Offer();f.calls.incoming(offer);
  assert.equal(offer.answered,0);assert.equal(offer.closed,0);
  t.mock.timers.tick(1200);f.member.call=true;f.calls.roster([f.member]);
  assert.equal(offer.answered,1);assert.equal(f.calls.pendingOffers.size,0);
  f.calls.roster([f.member]);assert.equal(offer.answered,1);
  offer.emit('stream',stream());offer.peerConnection.state('connected');
  t.mock.timers.tick(20000);assert.equal(offer.closed,0);assert.equal(f.events.some(e=>e[0]==='notice'),false);
});
test('inactive member is never answered without consent; queued offers expire and remain bounded',t=>{
  const f=setup(t),first=new Offer(),duplicate=new Offer();
  f.calls.incoming(first);f.calls.incoming(duplicate);assert.equal(duplicate.closed,1);assert.equal(f.calls.pendingOffers.size,1);
  t.mock.timers.tick(8000);assert.equal(first.closed,1);assert.equal(first.answered,0);assert.equal(f.calls.pendingOffers.size,0);
  f.member.call=true;f.calls.roster([f.member]);assert.equal(first.answered,0);
});
test('room exit, member removal and local hangup discard queued offers',t=>{
  const f=setup(t);const one=new Offer();f.calls.incoming(one);f.room.members.clear();f.calls.roster([]);
  assert.equal(one.closed,1);assert.equal(f.calls.pendingOffers.size,0);
  f.room.members.set('friend',f.member);const two=new Offer();f.calls.incoming(two);f.calls.stop();
  assert.equal(two.closed,1);assert.equal(two.answered,0);t.mock.timers.tick(10000);assert.equal(two.closed,1);
});
test('queued offers revalidate the current room token before answering',t=>{
  const f=setup(t),offer=new Offer();f.calls.incoming(offer);f.room.callToken='c'.repeat(64);f.member.call=true;f.calls.roster([f.member]);
  assert.equal(offer.closed,1);assert.equal(offer.answered,0);
});
test('outsiders, wrong tokens and protocol mismatches never enter the pending queue',t=>{
  const f=setup(t),version=new Offer();version.metadata.v=VERSION-1;
  for(const offer of [new Offer('outsider'),new Offer('friend','x'),version]) {f.calls.incoming(offer);assert.equal(offer.closed,1);assert.equal(offer.answered,0);}
  assert.equal(f.calls.pendingOffers.size,0);
});
test('incoming connection failure is observed after answer creates its peer connection',t=>{
  const f=setup(t,true),offer=new Offer();f.calls.incoming(offer);offer.peerConnection.state('failed');
  assert.equal(f.calls.links.size,0);assert.equal(offer.closed,1);assert.match(f.events.at(-1)[1],/lost its media connection/);
});
test('a stream callback before ICE success does not suppress the setup timeout',t=>{
  const f=setup(t,true),offer=new Offer();f.calls.incoming(offer);offer.emit('stream',stream());
  t.mock.timers.tick(18000);assert.equal(offer.closed,1);assert.equal(f.calls.links.size,0);assert.match(f.events.at(-1)[1],/establish a media connection/);
  assert.doesNotMatch(f.events.at(-1)[1],/TURN/);
});
test('connected call still needs a remote stream; both event orders complete setup',t=>{
  const f=setup(t,true),offer=new Offer();f.calls.incoming(offer);offer.peerConnection.state('connected');
  t.mock.timers.tick(5000);offer.emit('stream',stream());t.mock.timers.tick(20000);assert.equal(offer.closed,0);
});
test('temporary disconnect recovers, prolonged disconnect is replaced',t=>{
  const f=setup(t,true),offer=new Offer();f.calls.incoming(offer);offer.emit('stream',stream());offer.peerConnection.state('connected');
  offer.peerConnection.state('disconnected');t.mock.timers.tick(7000);offer.peerConnection.state('connected');t.mock.timers.tick(9000);assert.equal(offer.closed,0);
  offer.peerConnection.state('disconnected');t.mock.timers.tick(8000);assert.equal(offer.closed,1);assert.equal(f.calls.links.size,0);
});
test('hanging up before an outgoing offer opens releases its slot even without PeerJS close event',t=>{
  const f=setup(t,true),offer=new Offer();f.calls.bind(offer);f.calls.stop();
  assert.equal(f.calls.links.size,0);assert.equal(f.calls.watchers.size,0);t.mock.timers.tick(25000);assert.equal(f.events.some(e=>e[0]==='notice'),false);
});
test('audio-only camera upgrade releases unopened call without leaving a stale timeout',async t=>{
  const f=setup(t,true),offer=new Offer();f.calls.bind(offer);await f.calls.replaceVideo({kind:'video'});
  assert.equal(f.calls.links.size,0);assert.equal(f.calls.watchers.size,0);t.mock.timers.tick(20000);assert.equal(f.events.some(e=>e[0]==='notice'),false);
});
test('late close and error from an old call cannot remove or warn about its replacement',t=>{
  const f=setup(t,true),old=new Offer(),next=new Offer();f.calls.incoming(old);f.calls.drop(old);f.calls.incoming(next);
  old.emit('close');old.emit('error',new Error('late failure'));old.peerConnection.state('failed');
  assert.equal(f.calls.links.get('friend'),next);assert.equal(next.closed,0);assert.equal(f.events.some(e=>e[0]==='notice'),false);
});
test('retries preserve media capture and clear only the matching failure notice on recovery',t=>{
  const f=setup(t,true);f.room.id='aaa';let attempts=0,last;
  f.room.peer.call=()=>{attempts++;return last=new Offer();};f.calls.reconcile();const capture=f.calls.stream;
  t.mock.timers.tick(18000);assert.equal(f.calls.stream,capture);assert.equal(f.calls.links.size,0);
  const message=f.events.find(e=>e[0]==='notice')[1];assert.match(message,/wasn’t answered/);
  t.mock.timers.tick(5000);assert.equal(attempts,2);last.open=true;last.peerConnection=new PC();last.emit('stream',stream());last.peerConnection.state('connected');
  assert.ok(f.events.some(e=>e[0]==='clearNotice'&&e[1]===message));
});
test('synchronous signaling error does not discard microphone or poison future attempts',t=>{
  const f=setup(t,true);f.room.id='aaa';const capture=f.calls.stream;f.room.peer.call=()=>{throw new Error('signaling offline');};
  assert.doesNotThrow(()=>f.calls.reconcile());assert.equal(f.calls.stream,capture);assert.equal(f.calls.links.size,0);
  f.room.peer.call=()=>new Offer();t.mock.timers.tick(5000);assert.equal(f.calls.links.size,1);
});
test('a departed caller does not leave a stale connection warning behind',t=>{
  const f=setup(t,true);f.calls.failed('friend','was interrupted');const message=f.events.at(-1)[1];
  f.room.members.clear();f.calls.roster([]);assert.equal(f.calls.failures.size,0);assert.deepEqual(f.events.at(-1),['clearNotice',message]);
});
