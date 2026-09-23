import test from 'node:test';
import { EventEmitter } from 'node:events';
import assert from 'node:assert/strict';
import { Room } from '../src/room.js';
import { PlayerSync, BufferGate } from '../src/player.js';
import { Calls, configureAudio } from '../src/calls.js';
import { validCommand, validPolicy, validReport } from '../src/protocol.js';

const key = 'movie/demo/demo';
const state = {key, time: 10, rate:1, paused:false, buffering:false, seq:1, duration:60};
class Video extends EventTarget {
  constructor() { super(); Object.assign(this, {clientWidth:800,clientHeight:450,currentTime:10,paused:true,playbackRate:1,readyState:4,duration:60,seeking:false,seekable:{length:1,start:()=>0,end:()=>60}}); }
  pause() { if (this.paused) return; this.paused=true; this.dispatchEvent(new Event('pause')); }
  play() { this.paused=false; this.dispatchEvent(new Event('play')); return Promise.resolve(); }
}
function setup(host) {
  let time = 1000; const video = new Video(), events=[];
  const room = new Room((t,v) => {events.push([t,v]); if(t==='command') player.control(v);});
  Object.assign(room,{host, active:true, id:'host',rtt:0});
  const player = new PlayerSync(room, (...s)=>events.push(['status',s]), {document:{querySelectorAll:()=>[video]},location:{hash:'#/player/stream/addon/meta/movie/demo/demo'},now:()=>time,timer:false});
  return {video, room, player, events, advance:n=>time+=n};
}
const settled = () => new Promise(resolve=>setImmediate(resolve));

test('only the host changes policy; guest commands require current permission and matching title',()=>{
  const events=[], room=new Room((...e)=>events.push(e)); room.host=true;room.active=true;room.state=state;
  room.members.set('g',{id:'g',name:'Friend'});room.reports.set('g',{key,status:'ready',duration:60,at:performance.now()});
  const conn={peer:'g'}, command={key,action:'seek',value:20}; room.links.set(conn.peer, conn);
  room.fromGuest(conn,{t:'command',command});assert.equal(events.length,0);
  room.setPolicy({controls:'everyone',wait:true}); events.length=0;
  room.fromGuest(conn,{t:'command',command});assert.deepEqual(events[0],['command',command]);
  events.length=0;
  for (const c of [{...command,key:'movie/other/other'},{...command,value:NaN},{...command,action:'evil'}]) room.fromGuest(conn,{t:'command',command:c});
  assert.equal(events.length,0);
  room.setPolicy({controls:'host',wait:true});events.length=0;
  room.fromGuest(conn,{t:'command',command});assert.equal(events.length,0);
  room.host=false;room.setPolicy({controls:'everyone',wait:false});assert.equal(room.policy.controls,'host');
});
test('protocol validates permissions, reports and commands',()=>{
  assert.equal(validPolicy({controls:'everyone',wait:true}),true);assert.equal(validPolicy({controls:'everyone',wait:'yes'}),false);
  assert.equal(validReport({key,status:'loading',duration:60}),true);assert.equal(validReport({key,status:'ready',duration:Infinity}),false);
  for(const c of [{key,action:'rate',value:0},{key,action:'seek',value:-1},{key:'',action:'play'}]) assert.equal(validCommand(c),false);
});
test('buffer gate caps waits, skips until recovery, ignores stale/mismatched/error peers',()=>{
  const g=new BufferGate(), reports=new Map([['g',{key,status:'loading',duration:60,at:0}]]);
  assert.deepEqual(g.update(reports,key,true,0).waiting,['g']);
  reports.get('g').at=21000;assert.deepEqual(g.update(reports,key,true,21000).skipped,['g']);
  reports.get('g').at=25000;assert.deepEqual(g.update(reports,key,true,25000).skipped,['g']);
  reports.get('g').status='ready';g.update(reports,key,true,25001);
  reports.get('g').at=35001;g.update(reports,key,true,35001);
  reports.get('g').status='loading';assert.deepEqual(g.update(reports,key,true,35002).waiting,['g']);
  g.skip();assert.deepEqual(g.update(reports,key,true,35003).skipped,['g']);
  assert.equal(g.update(reports,key,true,42000).waiting.length,0);
  reports.get('g').at=42000;assert.equal(g.update(reports,'movie/other/other',true,42000).waiting.length,0);
  reports.get('g').status='error';assert.equal(g.update(reports,key,true,42000).waiting.length,0);
});
test('guest buffering pauses the host, recovery resumes, manual pause is preserved',async()=>{
  const {player,room,video,advance}=setup(true);
  player.control({key,action:'play'});await settled();assert.equal(video.paused,false);
  room.reports.set('g',{key,status:'loading',at:1000,duration:60});player.tick();assert.equal(video.paused,true);assert.equal(room.state.paused,false);assert.equal(room.state.buffering,true);
  room.reports.get('g').status='ready';player.tick();advance(2000);player.tick();await settled();assert.equal(video.paused,false);
  room.reports.get('g').status='loading';player.tick();player.control({key,action:'pause'});
  room.reports.get('g').status='ready';player.tick();assert.equal(video.paused,true);assert.equal(room.state.paused,true);
  player.close();room.close();
});
test('continue without waiting and policy changes release the buffer hold',async()=>{
  const {player,room,video}=setup(true);room.reports.set('g',{key,status:'loading',at:1000,duration:60});
  player.control({key,action:'play'});assert.equal(video.paused,true);
  player.continueWithoutWaiting();await settled();assert.equal(video.paused,false);
  room.policy.wait=false;player.tick();assert.equal(room.state.buffering,false);player.close();room.close();
});
test('guest synchronization emits no playback commands; stale host pauses the movie',async()=>{
  const {player,room,video,advance}=setup(false);let commands=0;room.command=()=>commands++;
  player.receive(state);await settled();assert.equal(video.paused,false);assert.equal(commands,0);
  player.receive({...state,paused:true,time:30,seq:2});assert.equal(video.paused,true);assert.equal(video.currentTime,30);
  video.dispatchEvent(new Event('seeked'));assert.equal(commands,0);
  player.receive({...state,seq:3,time:30});await settled();advance(7000);player.tick();assert.equal(video.paused,true);assert.equal(commands,0);player.close();room.close();
});
test('mismatched title, duration and live streams pause safely; out-of-order state ignored',async()=>{
  const {player,room,video}=setup(false);player.receive(state);await settled();
  player.receive({...state,seq:2,key:'movie/other/other'});assert.equal(video.paused,true);
  player.receive({...state,seq:1});assert.equal(player.remote.seq,2);
  player.receive({...state,seq:3,duration:100});assert.equal(video.paused,true);
  video.duration=Infinity;player.receive({...state,seq:4});assert.equal(video.paused,true);player.close();room.close();
});
test('autoplay denial is surfaced and an explicit sync retries successfully',async()=>{
  const {player,room,video,events}=setup(false);video.play=()=>Promise.reject(Object.assign(new Error(),{name:'NotAllowedError'}));
  player.receive(state);await settled();assert.equal(player.blocked,true);assert.ok(events.some(e=>e[0]==='status' && e[1][1]==='blocked'));
  video.play=Video.prototype.play;player.apply(true);await settled();assert.equal(video.paused,false);assert.equal(player.blocked,false);player.close();room.close();
});
function track(kind) { return {kind,enabled:true,readyState:'live',stop(){this.readyState='ended';},addEventListener(){}}; }
function stream(tracks) { return { getTracks:()=>[...tracks],getVideoTracks:()=>tracks.filter(t=>t.kind==='video'),getAudioTracks:()=>tracks.filter(t=>t.kind==='audio'),removeTrack(t){tracks.splice(tracks.indexOf(t),1);},addTrack(t){tracks.push(t);} }; }
function callFixture() {const events=[],room={id:'h',closed:false,callStatus:(...v)=>events.push(['status',v]),peer:{disconnected:false}};const calls=new Calls(room,(...e)=>events.push(e));return {calls,room,events};}
test('camera off ends and removes the hardware track, preserving microphone and sender for camera on',async()=>{
  const {calls,events}=callFixture(), v=track('video'),a=track('audio'),replaced=[];
  calls.stream=stream([a,v]);const sender={track:v,replaceTrack:async t=>{sender.track=t;replaced.push(t);}};
  calls.links.set('g',{peer:'g',peerConnection:{getSenders:()=>[sender]},close(){}});
  await calls.camera();assert.equal(v.readyState,'ended');assert.equal(a.readyState,'live');assert.equal(calls.stream.getVideoTracks().length,0);assert.deepEqual(replaced,[null]);assert.ok(events.some(e=>e[0]==='camera' && e[1]===false));
  const next=track('video');await calls.replaceVideo(next);assert.equal(sender.track,next);calls.close();
});
test('camera permission resolving after hangup stops the newly acquired track',async()=>{
  const {calls}=callFixture();calls.stream=stream([track('audio')]);let finish;
  const descriptor=Object.getOwnPropertyDescriptor(globalThis,'navigator');
  Object.defineProperty(globalThis,'navigator',{configurable:true,value:{mediaDevices:{getUserMedia:()=>new Promise(resolve=>finish=resolve)}}});
  try {const pending=calls.camera();calls.stop();const v=track('video');finish(stream([v]));await pending;assert.equal(v.readyState,'ended');assert.equal(calls.stream,null);}
  finally {calls.close();if(descriptor)Object.defineProperty(globalThis,'navigator',descriptor);else delete globalThis.navigator;}
});
test('audio requests broad echo cancellation when supported and reports actual settings',async()=>{
  let constraints;const audio={getCapabilities:()=>({echoCancellation:[true,false,'all']}),applyConstraints:async c=>constraints=c,getSettings:()=>({echoCancellation:'all',noiseSuppression:false})};
  const result=await configureAudio(audio);assert.deepEqual(constraints.echoCancellation,{exact:'all'});assert.equal(constraints.noiseSuppression,true);assert.match(result,/Echo cancellation: on/);assert.match(result,/Noise suppression: unavailable/);
  const unknown=await configureAudio({getCapabilities:()=>({}),applyConstraints:async()=>{throw new Error();},getSettings:()=>({})});assert.match(unknown,/not reported/);
});
test('hold-to-talk mutes the outgoing microphone track on release',()=>{
  const {calls}=callFixture(), a=track('audio');calls.stream=stream([a]);calls.setMic(false);assert.equal(a.enabled,false);calls.setMic(true);assert.equal(a.enabled,true);calls.setMic(false);assert.equal(a.enabled,false);calls.close();assert.equal(a.readyState,'ended');
});
test('guest buffering reports include pre-metadata loading and an unseekable target',()=>{
  const {player,room,video}=setup(false);const reports=[];room.report=r=>reports.push(r);
  video.readyState=0;video.duration=NaN;player.report();assert.equal(reports.at(-1).status,'loading');
  video.readyState=4;video.duration=60;video.seekable={length:0};player.receive(state);assert.equal(reports.at(-1).status,'loading');assert.equal(video.paused,true);
  player.close();room.close();
});
test('a guest reaching the end does not issue a room-wide pause',()=>{
  const {player,room,video}=setup(false);let commands=0;room.command=()=>commands++;
  video.ended=true;video.dispatchEvent(new Event('pause'));assert.equal(commands,0);player.close();room.close();
});
test('unsupported audio diagnostic methods do not abandon active capture',async()=>{
  const result=await configureAudio({getCapabilities(){throw new Error('unsupported');},async applyConstraints(){},getSettings(){throw new Error('unsupported');}});
  assert.match(result,/not reported/);
});
test('a call setup failure releases all acquired devices and re-enables retry',async()=>{
  const {calls,events}=callFixture(), a=track('audio'),v=track('video'),capture=stream([a,v]);
  a.addEventListener=()=>{throw new Error('device disappeared');};
  const descriptor=Object.getOwnPropertyDescriptor(globalThis,'navigator');
  Object.defineProperty(globalThis,'navigator',{configurable:true,value:{mediaDevices:{getUserMedia:async()=>capture}}});
  try {await calls.start(true);assert.equal(a.readyState,'ended');assert.equal(v.readyState,'ended');assert.equal(calls.stream,null);assert.equal(calls.pending,false);assert.ok(events.some(e=>e[0]==='busy'&&e[1]===false));}
  finally {calls.close();if(descriptor)Object.defineProperty(globalThis,'navigator',descriptor);else delete globalThis.navigator;}
});
test('a failure enabling camera releases the new camera and keeps the microphone',async()=>{
  const {calls}=callFixture(),a=track('audio'),v=track('video');calls.stream=stream([a]);calls.replaceVideo=async()=>{throw new Error('sender closed');};
  const descriptor=Object.getOwnPropertyDescriptor(globalThis,'navigator');
  Object.defineProperty(globalThis,'navigator',{configurable:true,value:{mediaDevices:{getUserMedia:async()=>stream([v])}}});
  try {await calls.camera();assert.equal(v.readyState,'ended');assert.equal(a.readyState,'live');assert.equal(calls.stream.getVideoTracks().length,0);}
  finally {calls.close();if(descriptor)Object.defineProperty(globalThis,'navigator',descriptor);else delete globalThis.navigator;}
});

test('a late remote stream cannot restart call media after leaving',()=>{
  const {calls,events}=callFixture();calls.stream=stream([track('audio')]);
  const call=new EventEmitter();call.peer='g';call.close=()=>call.emit('close');calls.bind(call);calls.stop();
  const remote=track('audio');call.emit('stream',stream([remote]));assert.equal(remote.readyState,'ended');assert.equal(events.some(e=>e[0]==='remote'),false);calls.close();
});
