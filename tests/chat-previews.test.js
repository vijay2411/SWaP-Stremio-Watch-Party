import test from 'node:test';
import assert from 'node:assert/strict';
import { ChatPreviews, MAX_PENDING_PREVIEWS } from '../src/chat-previews.js';
import { Room } from '../src/room.js';
import { VERSION } from '../src/protocol.js';

function fixture(options = {}) {
  let now = 0, sequence = 0, opened = 0;
  const timers = new Map(), displayed = [], removed = [], activated = [];
  const element = () => ({ children: [], append(...children) { this.children.push(...children); }, remove() { removed.push({ button: this, at: now }); container.children = container.children.filter(c => c !== this); } });
  const container = element(); container.ownerDocument = { createElement: element };
  const append = container.append.bind(container);
  container.append = button => { displayed.push({ name: button.children[0].textContent, text: button.children[1].textContent, at: now }); append(button); };
  const previews = new ChatPreviews(container, message => { opened++; activated.push(message); }, {
    now: () => now, setTimer: (callback, ms) => { const id = ++sequence; timers.set(id, { callback, at: now + ms }); return id; }, clearTimer: id => timers.delete(id), ...options
  });
  const advance = target => {
    while (true) { const next = [...timers].sort((a,b) => a[1].at - b[1].at).find(([,t]) => t.at <= target); if (!next) break;
      const [id,timer] = next; timers.delete(id); now = timer.at; timer.callback();
    } now = target;
  };
  return { previews, container, timers, displayed, removed, activated, advance, opened: () => opened };
}
const message = (id, author = 'Alice') => ({ id: String(id), name: author, text: `Message ${id}` });

test('replying to one preview retains other queued messages and their arrival cadence', () => {
  const f=fixture({clearOnActivate:false,actionLabel:'Reply to room'});
  for(let i=0;i<4;i++)f.previews.add(message(i));f.advance(1000);
  assert.equal(f.container.children[0].title,'Alice: Message 0\nReply to room');f.container.children[0].onclick();
  assert.deepEqual(f.activated,[message(0)]);assert.equal(f.container.children.length,0);
  f.advance(6000);assert.deepEqual(f.displayed.map(m=>m.at),[0,2000,4000,6000]);assert.equal(f.container.children.length,3);
  f.advance(11000);assert.equal(f.container.children.length,0);
});

test('queued messages arrive every two seconds and each stays visible for five', () => {
  const f = fixture(); for (let i=0;i<8;i++) f.previews.add(message(i, i%2 ? 'Bob' : 'Alice'));
  assert.equal(f.container.children.length,1); f.advance(1999); assert.equal(f.displayed.length,1);
  f.advance(2000); assert.equal(f.container.children.length,2);
  f.advance(4000); assert.equal(f.container.children.length,3);
  f.advance(4999); assert.equal(f.removed.length,0);
  f.advance(5000); assert.equal(f.container.children.length,2);
  f.advance(14000); assert.deepEqual(f.displayed.map(m=>m.at),[0,2000,4000,6000,8000,10000,12000,14000]);
  assert.deepEqual(f.displayed.map(m=>m.name),['Alice','Bob','Alice','Bob','Alice','Bob','Alice','Bob']);
  assert.deepEqual(f.displayed.map(m=>m.text),Array.from({length:8},(_,i)=>`Message ${i}`));
  f.advance(18999); assert.equal(f.container.children.length,1);
  f.advance(19000); assert.equal(f.container.children.length,0);
  assert.deepEqual(f.removed.map(m=>m.at),[5000,7000,9000,11000,13000,15000,17000,19000]);
});
test('later arrivals and expiry do not reset the two-second queue clock', () => {
  const f=fixture(); f.previews.add(message(1)); f.advance(1000); f.previews.add(message(2)); f.advance(2000); f.previews.add(message(3)); f.previews.add(message(4));
  f.advance(5000); assert.equal(f.container.children.length,2); assert.equal(f.displayed.length,3);
  f.advance(6000); assert.equal(f.displayed[3].at,6000); assert.equal(f.container.children.length,3);
  f.advance(7000); assert.equal(f.container.children.length,2); f.advance(9000); assert.equal(f.container.children.length,1);
  f.advance(11000); assert.equal(f.container.children.length,0);
});
test('a new message after a quiet interval appears immediately', () => {
  const f=fixture(); f.previews.add(message(1)); f.advance(12000); f.previews.add(message(2));
  assert.equal(f.displayed[1].at,12000); f.advance(13000); f.previews.add(message(3));
  f.advance(13999); assert.equal(f.displayed.length,2); f.advance(14000); assert.equal(f.displayed[2].at,14000);
});
test('own messages, open chat, join history and repeated deliveries never create previews', () => {
  const f=fixture(); f.previews.add(message(1),{own:true}); f.previews.add(message(2),{open:true}); f.previews.add({...message(3),history:true});
  assert.equal(f.displayed.length,0); for(let i=0;i<5;i++)f.previews.add(message(i));
  f.previews.add(message(0));f.previews.add(message(4));f.advance(10000);assert.equal(f.displayed.length,5);
});
test('opening chat or leaving clears active and queued previews, including stale timers', () => {
  const f=fixture(); for(let i=0;i<5;i++)f.previews.add(message(i));
  const stale=[...f.timers.values()].map(t=>t.callback); f.container.children[0].onclick();
  assert.equal(f.opened(),1);assert.equal(f.container.children.length,0);assert.equal(f.timers.size,0);
  f.previews.add(message(0));stale.forEach(fn=>fn());assert.equal(f.container.children.length,1);
  f.previews.clear();f.advance(30000);assert.equal(f.container.children.length,0);assert.equal(f.displayed.length,2);
});
test('a flood stays bounded while queued previews retain the two-second cadence', () => {
  const f=fixture();for(let i=0;i<1000;i++)f.previews.add(message(i));
  assert.equal(f.container.children.length,1);assert.equal(f.previews.pending.length,MAX_PENDING_PREVIEWS);
  f.advance(2000);assert.equal(f.displayed[1].text,'Message 950');f.previews.clear();assert.equal(f.timers.size,0);
});
test('preview content is assigned as text, preserving markup literally', () => {
  const f=fixture();f.previews.add({id:'html',name:'<b>Alice</b>',text:'<img src=x onerror=alert(1)>\nHello'});
  assert.equal(f.container.children[0].children[0].textContent,'<b>Alice</b>');
  assert.equal(f.container.children[0].children[1].textContent,'<img src=x onerror=alert(1)>\nHello');
});
test('room identifies welcome history locally and treats subsequent messages as live', () => {
  const received=[];const room=new Room((type,value)=>{if(type==='chat')received.push(value)});
  const m={id:'past',author:'friend',name:'Friend',text:'Earlier',time:Date.now()};
  room.fromHost({t:'welcome',v:VERSION});room.fromHost({t:'history',message:m});room.fromHost({t:'chat',message:{...m,id:'new',history:true}});
  assert.deepEqual(received.map(m=>m.history),[true,false]);room.close();
});
test('default timers are invoked as platform functions, not methods on the preview controller', () => {
  const originalSet=globalThis.setTimeout,originalClear=globalThis.clearTimeout;
  let scheduled=false,cleared=false;
  try {
    globalThis.setTimeout=function(){assert.equal(this,undefined);scheduled=true;return 7;};
    globalThis.clearTimeout=function(id){assert.equal(this,undefined);assert.equal(id,7);cleared=true;};
    const f=fixture();const previews=new ChatPreviews(f.container,()=>{});
    previews.add(message('native'));previews.clear();assert.ok(scheduled&&cleared);
  } finally { globalThis.setTimeout=originalSet;globalThis.clearTimeout=originalClear; }
});
