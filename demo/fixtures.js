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
  const tools=document.createElement('div');tools.id='demo-tools';tools.style.cssText='position:fixed;left:12px;bottom:70px;z-index:2147483647;background:#171a20;padding:8px;display:flex;gap:6px;flex-wrap:wrap;max-width:330px;font-size:11px';
  tools.innerHTML='<span>Demo fixtures · synthetic devices</span><button id="demo-seek">Seek to 20s</button><button id="demo-buffer">Simulate buffering</button><button id="demo-fullscreen">Fullscreen player</button><button id="demo-messages">Send 12 test messages</button><button id="demo-duration">Different duration</button><button id="demo-source">Different source</button><button id="demo-meta">Public metadata test</button>';
  document.body.append(tools);const movie=document.getElementById('movie');
  // Keep fixture buttons above the narrow app drawer so a test click cannot
  // accidentally hit the app's call controls underneath them.
  document.addEventListener('DOMContentLoaded',()=>document.body.append(tools),{once:true});
  const controls=document.querySelector('.control-bar-layer-fixture');
  if(controls){
    const exit=document.createElement('button');exit.textContent='Exit fullscreen';exit.hidden=true;controls.append(exit);
    exit.onclick=()=>document.exitFullscreen();
    document.addEventListener('fullscreenchange',()=>{exit.hidden=!document.fullscreenElement;});
  }
  document.getElementById('demo-meta').onclick=()=>{initial[6]='tt0133093';initial[7]='tt0133093';setSource();};
  let changedDuration=false; const actualDuration=()=>Object.getOwnPropertyDescriptor(HTMLMediaElement.prototype,'duration').get.call(movie);
  document.getElementById('demo-duration').onclick=e=>{changedDuration=!changedDuration;if(changedDuration)Object.defineProperty(movie,'duration',{configurable:true,get:()=>actualDuration()+60});else delete movie.duration;movie.dispatchEvent(new Event('loadedmetadata'));e.target.textContent=changedDuration?'Restore duration':'Different duration';};
  document.getElementById('demo-source').onclick=e=>{alternateSource=!alternateSource;setSource();e.target.textContent=alternateSource?'Restore source':'Different source';};
  document.getElementById('demo-seek').onclick=()=>{movie.currentTime=20;};
  let buffering=false;
  document.getElementById('demo-buffer').onclick=e=>{buffering=!buffering; if(buffering)Object.defineProperty(movie,'readyState',{configurable:true,get:()=>2});else delete movie.readyState;movie.dispatchEvent(new Event(buffering?'waiting':'canplay'));e.target.textContent=buffering?'Recover stream':'Simulate buffering';};
  document.getElementById('demo-fullscreen').onclick=async()=>{try{await document.getElementById('demo-player').requestFullscreen();}catch{diagnostics.textContent='Fullscreen was not granted by the browser.';}};
  const diagnostics=document.createElement('output');diagnostics.id='demo-diagnostics';tools.append(diagnostics);
  // Observe rendered UI timings without reaching into room/controller state.
  const record=document.createElement('button');record.textContent='Capture UI timings';tools.append(record);
  const timings=document.createElement('output');timings.id='demo-timings';tools.append(timings);
  let timingObservers=[];
  record.onclick=()=>{
    timingObservers.forEach(observer=>observer.disconnect());
    const root=document.getElementById('sidekick-root')?.shadowRoot;
    if(!root)return;
    let shown=0,removed=0,lastShown=null,waitStart=null,waitMs=null,maxActive=0;
    const starts=new WeakMap(),gaps=[],lifetimes=[];
    const range=values=>values.length?`${(Math.min(...values)/1000).toFixed(3)}–${(Math.max(...values)/1000).toFixed(3)}s`:'—';
    const render=()=>{timings.textContent=`Previews ${shown} shown / ${removed} removed · max ${maxActive} active · gaps ${range(gaps)} · lifetimes ${range(lifetimes)} · buffer wait ${waitMs===null?'—':(waitMs/1000).toFixed(3)+'s'}`;};
    const previews=root.getElementById('chat-previews');
    const previewObserver=new MutationObserver(records=>{
      const now=performance.now();
      for(const record of records){
        for(const el of record.addedNodes)if(el.matches?.('.chat-preview')){shown++;starts.set(el,now);if(lastShown!==null)gaps.push(now-lastShown);lastShown=now;}
        for(const el of record.removedNodes)if(starts.has(el)){removed++;lifetimes.push(now-starts.get(el));starts.delete(el);}
      }
      maxActive=Math.max(maxActive,previews.children.length);
      gaps.splice(0,Math.max(0,gaps.length-100));lifetimes.splice(0,Math.max(0,lifetimes.length-100));render();
    });
    previewObserver.observe(previews,{childList:true});
    const status=root.getElementById('sync-status');
    const statusObserver=new MutationObserver(()=>{
      if(/Waiting for .+ · \d+s remaining/.test(status.textContent)&&waitStart===null)waitStart=performance.now();
      if(status.textContent.startsWith('Continuing without ')&&waitStart!==null&&waitMs===null)waitMs=performance.now()-waitStart;
      render();
    });
    statusObserver.observe(status,{childList:true,characterData:true,subtree:true});
    timingObservers=[previewObserver,statusObserver];render();
  };
  setInterval(()=>{diagnostics.textContent=`Movie ${movie.currentTime.toFixed(1)}s · ${movie.paused?'paused':'playing'} · cameras ${captured.filter(t=>t.kind==='video'&&t.readyState==='live').length} · mics ${captured.filter(t=>t.kind==='audio'&&t.readyState==='live').length}`;},500);
  document.getElementById('demo-messages').onclick=()=>{
    let n=0;const timer=setInterval(()=>{ const root=document.getElementById('sidekick-root').shadowRoot, input=root.getElementById('chat-input');input.value=`QA message ${++n}: checking newest-message visibility.\nSecond line to exercise wrapping and scrolling.`;root.getElementById('chat-form').requestSubmit();if(n===12)clearInterval(timer);},650);
  };
}
