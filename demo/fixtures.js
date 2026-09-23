// Explicit, demo-only fake devices. No camera or microphone hardware is used.
if (new URLSearchParams(location.search).has('synthetic')) {
  const captured = [];
  const initial = location.hash.split('/');
  let alternateSource = false;
  const setSource = () => { initial[2] = encodeURIComponent(JSON.stringify({name: alternateSource ? 'Alternate provider · 1080p' : 'Demo provider · 1080p', behaviorHints:{filename:alternateSource ? 'SWaP.Demo.Alternate.1080p.mkv' : 'SWaP.Demo.Original.1080p.mkv'},url:'https://private.invalid/DO-NOT-SHARE'})); location.hash = initial.join('/'); };
  setSource();
  if ('mediaSession' in navigator) navigator.mediaSession.metadata = new MediaMetadata({title:'SWaP Demo Movie',album:'Demo edition'});

  navigator.mediaDevices.getUserMedia = async ({audio, video}) => {
    const tracks = [];
    if (video) {
      const canvas = document.createElement('canvas'); canvas.width = 320; canvas.height = 180;
      const ctx = canvas.getContext('2d'); let frame = 0;
      const draw = () => { ctx.fillStyle = '#384c40'; ctx.fillRect(0,0,320,180); ctx.fillStyle = '#d5f88a'; ctx.font = '22px sans-serif'; ctx.fillText('Synthetic camera', 55,85); ctx.fillText(String(frame++),145,125); };
      draw(); const track = canvas.captureStream(10).getVideoTracks()[0]; const timer=setInterval(draw,100);
      const stop=track.stop.bind(track);track.stop=()=>{clearInterval(timer);stop();}; tracks.push(track);
    }
    if (audio) {
      const context = new AudioContext(), oscillator = context.createOscillator(), gain=context.createGain(), dest=context.createMediaStreamDestination();
      gain.gain.value=0;oscillator.connect(gain).connect(dest);oscillator.start();
      const track=dest.stream.getAudioTracks()[0], stop=track.stop.bind(track);
      track.stop=()=>{oscillator.stop();context.close();stop();};tracks.push(track);
    }
    captured.push(...tracks); return new MediaStream(tracks);
  };
  const tools=document.createElement('div');tools.id='demo-tools';tools.style.cssText='position:fixed;left:12px;bottom:70px;z-index:2001;background:#171a20;padding:8px;display:flex;gap:6px;flex-wrap:wrap;max-width:330px;font-size:11px';
  tools.innerHTML='<span>Demo fixtures · synthetic devices</span><button id="demo-seek">Seek to 20s</button><button id="demo-buffer">Simulate buffering</button><button id="demo-fullscreen">Fullscreen player</button><button id="demo-messages">Send 12 test messages</button><button id="demo-duration">Different duration</button><button id="demo-source">Different source</button><button id="demo-meta">Public metadata test</button>';
  document.body.append(tools);const movie=document.getElementById('movie');
  document.getElementById('demo-meta').onclick=()=>{initial[6]='tt0133093';initial[7]='tt0133093';setSource();};
  let changedDuration=false; const actualDuration=()=>Object.getOwnPropertyDescriptor(HTMLMediaElement.prototype,'duration').get.call(movie);
  document.getElementById('demo-duration').onclick=e=>{changedDuration=!changedDuration;if(changedDuration)Object.defineProperty(movie,'duration',{configurable:true,get:()=>actualDuration()+60});else delete movie.duration;movie.dispatchEvent(new Event('loadedmetadata'));e.target.textContent=changedDuration?'Restore duration':'Different duration';};
  document.getElementById('demo-source').onclick=e=>{alternateSource=!alternateSource;setSource();e.target.textContent=alternateSource?'Restore source':'Different source';};
  document.getElementById('demo-seek').onclick=()=>{movie.currentTime=20;};
  let buffering=false;
  document.getElementById('demo-buffer').onclick=e=>{buffering=!buffering; if(buffering)Object.defineProperty(movie,'readyState',{configurable:true,get:()=>2});else delete movie.readyState;movie.dispatchEvent(new Event(buffering?'waiting':'canplay'));e.target.textContent=buffering?'Recover stream':'Simulate buffering';};
  document.getElementById('demo-fullscreen').onclick=async()=>{try{await document.getElementById('demo-player').requestFullscreen();}catch{diagnostics.textContent='Fullscreen was not granted by the browser.';}};
  const diagnostics=document.createElement('output');diagnostics.id='demo-diagnostics';tools.append(diagnostics);
  setInterval(()=>{diagnostics.textContent=`Movie ${movie.currentTime.toFixed(1)}s · ${movie.paused?'paused':'playing'} · cameras ${captured.filter(t=>t.kind==='video'&&t.readyState==='live').length} · mics ${captured.filter(t=>t.kind==='audio'&&t.readyState==='live').length}`;},500);
  document.getElementById('demo-messages').onclick=()=>{
    let n=0;const timer=setInterval(()=>{ const root=document.getElementById('sidekick-root').shadowRoot, input=root.getElementById('chat-input');input.value=`QA message ${++n}: checking newest-message visibility.\nSecond line to exercise wrapping and scrolling.`;root.getElementById('chat-form').requestSubmit();if(n===12)clearInterval(timer);},650);
  };
}
