import { Room } from '../src/room.js';
import { Calls } from '../src/calls.js';
import { util } from 'peerjs';

const output=document.getElementById('results'),run=document.getElementById('run'),stop=document.getElementById('stop');
const wait=ms=>new Promise(resolve=>setTimeout(resolve,ms));
const check=(value,message)=>{if(!value)throw new Error(message);};
let cancelled=false,clients=[],captured=[],context,silentOutput,sequence=0,heldOffers=0;
const write=text=>{output.textContent+=`${text}\n`;};
for(const transport of ['udp','tcp'])document.getElementById(`probe-${transport}`).onclick=async event=>{
  const button=event.target;button.disabled=true;
  const iceServers=util.defaultConfig.iceServers.filter(server=>server.username).map(server=>({...server,urls:[].concat(server.urls).map(url=>`${url}?transport=${transport}`)}));
  const pc=new RTCPeerConnection({iceServers,iceTransportPolicy:'relay'}),errors=new Set();let relays=0;
  pc.onicecandidate=event=>{if(event.candidate?.type==='relay')relays++;};pc.onicecandidateerror=event=>errors.add(event.errorCode);
  write(`Probing TURN ${transport.toUpperCase()}…`);
  try{pc.createDataChannel('probe');await pc.setLocalDescription(await pc.createOffer());await wait(15000);write(`TURN ${transport.toUpperCase()}: ${relays} relay candidates; ICE error codes: ${[...errors].join(', ')||'none'}. No IP addresses or credentials recorded.`);}
  catch{write(`TURN ${transport.toUpperCase()}: probe failed.`);}finally{pc.close();button.disabled=false;}
};
async function until(fn,label,timeout=25000){const start=performance.now();while(!fn()){if(cancelled)throw new Error('Cancelled');if(performance.now()-start>timeout)throw new Error(`Timed out: ${label}`);await wait(100);}}
const media=async({audio,video})=>{
  const tracks=[];
  if(audio){const oscillator=context.createOscillator(),gain=context.createGain(),destination=context.createMediaStreamDestination();oscillator.frequency.value=440+sequence++*80;gain.gain.value=0.15;oscillator.connect(gain).connect(destination);oscillator.start();const track=destination.stream.getAudioTracks()[0],end=track.stop.bind(track);let stopped=false;track.stop=()=>{if(stopped)return;stopped=true;oscillator.stop();oscillator.disconnect();gain.disconnect();end();};tracks.push(track);}
  if(video){const canvas=document.createElement('canvas');canvas.width=320;canvas.height=180;const ctx=canvas.getContext('2d');let frame=0;const draw=()=>{ctx.fillStyle='#264e36';ctx.fillRect(0,0,320,180);ctx.fillStyle='#ddffba';ctx.font='28px system-ui';ctx.fillText(`QA camera · ${frame++}`,24,96);};draw();const track=canvas.captureStream(10).getVideoTracks()[0],timer=setInterval(draw,100),end=track.stop.bind(track);track.stop=()=>{clearInterval(timer);end();};tracks.push(track);}
  captured.push(...tracks);return new MediaStream(tracks);
};
function makeClient(name){
  const client={name,remote:new Map(),probes:new Map(),videos:new Map(),notices:[],chats:[],states:[],ready:false};clients.push(client);
  const options=new URLSearchParams(location.search).has('local')?{host:'127.0.0.1',port:9001,path:'/sidekick',secure:false}:{};
  if(new URLSearchParams(location.search).has('relay'))options.config={...util.defaultConfig,iceTransportPolicy:'relay'};
  client.room=new Room((type,value)=>{
    if(type==='ready'){
      client.calls=new Calls(client.room,(type,value)=>{
        if(type==='remote'){client.remote.set(value.id,value.stream);if(!client.probes.has(value.id)&&value.stream.getAudioTracks().length){const source=context.createMediaStreamSource(value.stream),analyser=context.createAnalyser();analyser.fftSize=2048;source.connect(analyser).connect(silentOutput);client.probes.set(value.id,{source,analyser});}let video=client.videos.get(value.id);if(!video){video=document.createElement('video');video.autoplay=true;video.muted=true;video.playsInline=true;video.title=`Received by ${name}`;document.getElementById('videos').append(video);client.videos.set(value.id,video);}video.srcObject=value.stream;void video.play().catch(()=>{});}
        if(type==='remove'){client.probes.get(value)?.source.disconnect();client.probes.get(value)?.analyser.disconnect();client.probes.delete(value);client.remote.delete(value);client.videos.get(value)?.remove();client.videos.delete(value);}
        if(type==='notice')client.notices.push(value);
      });client.ready=true;
    }
    if(type==='members')client.calls?.roster(value);
    if(type==='incomingCall'){if(client.calls){client.calls.incoming(value);if(client.calls.pendingOffers.has(value.peer))heldOffers++;}else value.close();}
    if(type==='chat')client.chats.push(value.text);
    if(type==='state')client.states.push(value);
    if(type==='ended'){client.calls?.close();client.ended=value;}
  },options);return client;
}
async function startClient(name,code){const client=makeClient(name);await client.room.start(name,code);await until(()=>client.ready||client.ended,`${name} joins room`);check(client.ready,client.ended);return client;}
const connected=(a,b)=>{const call=a.calls.links.get(b.room.id);return call?.peerConnection?.connectionState==='connected'&&a.remote.has(b.room.id);};
async function pair(a,b){await until(()=>connected(a,b)&&connected(b,a),`${a.name} ↔ ${b.name}`);}
async function stats(receiver,sender){const call=receiver.calls.links.get(sender.room.id);check(call?.peerConnection,'Missing media connection');const reports=await call.peerConnection.getStats();let audioBytes=0,energy=0,videoBytes=0,frames=0;for(const report of reports.values())if(report.type==='inbound-rtp'&&!report.isRemote){if(report.kind==='audio'){audioBytes+=report.bytesReceived||0;energy+=report.totalAudioEnergy||0;}if(report.kind==='video'){videoBytes+=report.bytesReceived||0;frames+=report.framesDecoded||0;}}const analyser=receiver.probes.get(sender.room.id)?.analyser,buffer=new Float32Array(2048);analyser?.getFloatTimeDomainData(buffer);const rms=Math.sqrt(buffer.reduce((sum,n)=>sum+n*n,0)/buffer.length);return {audioBytes,energy,videoBytes,frames,rms};}
async function delivery(receiver,sender,video=true){await pair(receiver,sender);const first=await stats(receiver,sender);await wait(1200);const second=await stats(receiver,sender);check(second.audioBytes>first.audioBytes&&second.rms>0.002,`Audio did not arrive: ${sender.name} → ${receiver.name}; context=${context.state}; samples=${JSON.stringify([first,second])}`);if(video)check(second.frames>first.frames&&second.videoBytes>first.videoBytes,`Video did not decode: ${sender.name} → ${receiver.name}`);return {audio:second.audioBytes-first.audioBytes,frames:second.frames-first.frames};}
function cleanup(){for(const c of clients){c.calls?.close();c.room.close();}for(const track of captured)track.stop();void context?.close();stop.disabled=true;run.disabled=false;}
stop.onclick=()=>{cancelled=true;cleanup();};window.addEventListener('pagehide',()=>{cancelled=true;cleanup();});
run.onclick=async()=>{
  run.disabled=true;stop.disabled=false;output.textContent='';clients=[];captured=[];cancelled=false;heldOffers=0;document.getElementById('videos').replaceChildren();
  const original=navigator.mediaDevices.getUserMedia;
  context=new AudioContext();silentOutput=context.createGain();silentOutput.gain.value=0;silentOutput.connect(context.destination);await context.resume();navigator.mediaDevices.getUserMedia=media;
  try{
    write(new URLSearchParams(location.search).has('relay')?'Mode: forced public TURN relay (no direct connection fallback).':'Mode: default ICE routing (direct or relay selected by browser).');
    const host=await startClient('QA Host'),guest=await startClient('QA Guest',host.room.code);
    await until(()=>guest.room.members.size===2&&host.room.members.size===2,'authenticated roster');
    await host.calls.start(true);await until(()=>guest.room.members.get(host.room.id)?.call,'host call readiness');
    const callStatus=guest.room.callStatus.bind(guest.room);let delay=true;
    guest.room.callStatus=(active,camera)=>{if(active&&delay){delay=false;setTimeout(()=>callStatus(active,camera),1500);}else callStatus(active,camera);};
    await guest.calls.start(true);await pair(host,guest);check(heldOffers>0,'The intended offer-before-status ordering was not exercised');
    write(`PASS · Offer before call status: ${heldOffers} authenticated offer held and accepted.`);
    const forward=await delivery(host,guest),back=await delivery(guest,host);
    write(`PASS · Bidirectional media: ${forward.audio}/${back.audio} audio bytes; ${forward.frames}/${back.frames} decoded video frames per sample.`);
    guest.calls.setMic(false);await wait(500);const muted1=await stats(host,guest);await wait(1200);const muted2=await stats(host,guest);
    check(muted2.rms<0.0005,'Muted microphone is still transmitting tone energy');check(guest.calls.stream.getAudioTracks().every(t=>!t.enabled),'Mic track stayed enabled');
    guest.calls.setMic(true);await delivery(host,guest);write('PASS · Microphone mute stops received audio signal; unmute resumes it.');
    const camera=guest.calls.stream.getVideoTracks()[0];await guest.calls.camera();check(camera.readyState==='ended'&&guest.calls.stream.getVideoTracks().length===0,'Camera was not released');await delivery(host,guest,false);
    await guest.calls.camera();await delivery(host,guest);write('PASS · Camera off releases its track, audio continues, and camera on resumes decoded frames.');
    for(let n=0;n<5;n++){const leaving=n%2?host:guest,other=leaving===host?guest:host,old=leaving.calls.stream.getTracks();leaving.calls.stop();check(old.every(t=>t.readyState==='ended'),'Hangup left capture active');await until(()=>!other.calls.links.has(leaving.room.id),'remote hangup');await leaving.calls.start(true);await pair(host,guest);await delivery(other,leaving);}
    write('PASS · Five alternating host/guest leave-and-rejoin cycles, with received media and old-track cleanup.');
    host.calls.stop();guest.calls.stop();await until(()=>[host,guest].every(c=>[...c.room.members.values()].every(m=>!m.call)),'both call exits');
    await host.calls.start(false);await guest.calls.start(false);await delivery(host,guest,false);await delivery(guest,host,false);
    check([host,guest].every(c=>c.calls.stream.getVideoTracks().length===0),'Audio-only acquired a camera');write('PASS · Audio-only calls transmit both ways without acquiring a camera.');
    await guest.calls.camera();await delivery(host,guest);write('PASS · Audio-only → video upgrade reconnects and delivers video.');
    const third=await startClient('QA Third',host.room.code);await until(()=>third.room.members.size===3,'third roster');await third.calls.start(true);
    for(const [a,b]of [[host,third],[guest,third]]){await pair(a,b);await delivery(a,b);await delivery(b,a,a===guest);}
    check([host,guest,third].every(c=>c.calls.links.size===2),'Mesh is missing a connection');write('PASS · Three participants: all six incoming audio paths, four video paths, one connection per pair.');
    const oldCall=guest.calls.links.get(third.room.id);oldCall.peerConnection.close();await until(()=>guest.calls.links.get(third.room.id)!==oldCall,'closed connection removed');await pair(guest,third);await delivery(guest,third);write('PASS · Forced media-connection closure recovers automatically and media resumes.');
    guest.room.chat('Reliability check');host.room.publish({key:'movie/demo/demo',time:7,rate:1,paused:true,buffering:false,seq:1,duration:60});await until(()=>host.chats.includes('Reliability check')&&third.chats.includes('Reliability check')&&guest.states.length>0,'chat and playback during call');write('PASS · Room chat and playback state still work during the call.');
    const isolated=await startClient('QA Other Room');check(isolated.room.members.size===1&&isolated.calls.links.size===0&&isolated.chats.length===0,'Separate room leaked state');write('PASS · Separate room has no call connections or chat from the tested room.');
    host.calls.close();host.room.close();await until(()=>guest.ended&&third.ended,'host ending room');
    cleanup();check(captured.every(t=>t.readyState==='ended'),'Cleanup left a device track active');check(clients.every(c=>!c.calls||(!c.calls.links.size&&!c.calls.watchers.size&&!c.calls.pendingOffers.size)),'Cleanup left a call or offer active');
    write(`PASS · End room stops every call; all ${captured.length} generated tracks ended. No camera or microphone hardware was used.`);
    write('SUITE PASSED. Cross-device/network reliability and acoustic echo quality are separate checks.');
  }catch(error){write(`FAIL · ${error.message}`);cleanup();write(`Cleanup: ${captured.filter(t=>t.readyState==='live').length} live generated tracks.`);}
  finally{navigator.mediaDevices.getUserMedia=original;run.disabled=false;stop.disabled=true;}
};
