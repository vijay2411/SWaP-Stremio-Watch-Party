import css from './style.css';
import themeCss from './themes.css';
import { THEMES, themeStyles, readTheme, readMode } from './themes.js';
import { initAppearance } from './appearance.js';
import { Room } from './room.js';
import { PlayerSync } from './player.js';
import { Calls } from './calls.js';
import { HoldToTalk, DEFAULT_TALK_KEY } from './hold-to-talk.js';
import { clockTime, compareMedia } from './media.js';
import { ChatScroll } from './chat-scroll.js';
import { ChatPreviews } from './chat-previews.js';
import { QuickReply } from './quick-reply.js';
import quickReplyCss from './quick-reply.css';
import previewCss from './chat-previews.css';
import { WatchLayout } from './layout.js';
import layoutCss from './layout.css';
import { formatCode, normalizeCode, parseOptions, detailUrl } from './protocol.js';

// Both distributions share one app and one mount marker. Never start two rooms
// over the same player if an older userscript or extension is still enabled.
export function mountSwap() {
  if (document.getElementById('sidekick-root')) return null;
  return mount();
}
function mount() {
  const paths = {
    together: '<rect x="2" y="4" width="14" height="13" rx="4"/><path d="m16 8 6-3v11l-6-3M6 21h8M10 17v4"/>',
    chat: '<path d="M21 11.5a8.4 8.4 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.4 8.4 0 0 1-3.8-.9L3 21l1.9-5.7a8.4 8.4 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.4 8.4 0 0 1 3.8-.9h.5a8.5 8.5 0 0 1 8 8z"/>',
    video: '<rect x="2" y="5" width="14" height="14" rx="3"/><path d="m16 9 6-4v14l-6-4"/>',
    sync: '<path d="M20 7a9 9 0 0 0-15-2L2 8m0-5v5h5M4 17a9 9 0 0 0 15 2l3-3m0 5v-5h-5"/>',
    mic: '<rect x="9" y="2" width="6" height="13" rx="3"/><path d="M5 10v2a7 7 0 0 0 14 0v-2M12 19v3m-4 0h8"/>',
    arrow: '<path d="M5 12h14m-5-5 5 5-5 5"/>',
    close: '<path d="m6 6 12 12M6 18 18 6"/>',
    sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1.5 1.5m11 11L19 19M5 19l1.5-1.5m11-11L19 5"/>',
    moon: '<path d="M20 14a8 8 0 0 1-10-10 8.5 8.5 0 1 0 10 10Z"/>',
    send: '<path d="m22 2-7 20-4-9-9-4 20-7ZM22 2 11 13"/>'
  };
  const icon = name => `<svg viewBox="0 0 24 24" aria-hidden="true">${paths[name]}</svg>`;
  const host = document.createElement('div'); host.id = 'sidekick-root';
  host.style.cssText = 'position:fixed;z-index:2147483647;inset:0;pointer-events:none;';
  host.dataset.theme = readTheme(); host.dataset.mode = readMode();
  const themeOptions = THEMES.map(t => `<option value="${t.id}">${t.label}</option>`).join('');
  const root = host.attachShadow({ mode: 'open' });
  // Mark this as an authored user stylesheet: Dark Reader excludes .stylus styles,
  // preserving personal themes without disabling its styling of Stremio itself.
  root.innerHTML = `<style class="sidekick-style stylus">${css}${themeCss}${themeStyles()}${layoutCss}${previewCss}${quickReplyCss}#panel,#launcher{pointer-events:auto}</style>
    <div id="folded-actions"><button id="launcher" aria-expanded="false" aria-controls="panel">${icon('together')} Watch together</button><button id="quick-toggle" aria-label="Quick reply" aria-controls="quick-reply" aria-expanded="false" title="Reply without opening the sidebar" hidden>${icon('chat')} Reply</button><section id="quick-reply" aria-label="Quick reply to room" hidden><p id="quick-context" hidden></p><form id="quick-form"><input id="quick-input" aria-label="Quick reply message" aria-describedby="quick-context" placeholder="Message your room…" maxlength="1000" autocomplete="off"><button id="quick-send" class="primary" aria-label="Send quick reply">${icon('send')}</button></form><p id="quick-status" role="status" aria-live="polite" hidden></p><button id="quick-close" class="icon" aria-label="Close quick reply">${icon('close')}</button></section></div>
    <section id="panel" aria-label="SWaP — Stremio Watch Party" hidden>
      <header class="row between"><div class="row brand">${icon('together')} SWaP <span class="pill">STREMIO WATCH PARTY</span></div><div id="header-actions" class="row"><button class="icon" id="color-mode" aria-label="Switch to light mode" title="Switch to light mode">${icon('sun')}</button><button class="icon" id="minimize" aria-label="Minimize panel">${icon('close')}</button></div></header>
      <div id="notice" role="status" aria-live="polite" hidden></div>
      <div id="lobby" class="scroll">
        <div class="eyebrow label"><span class="dot"></span> Good company. Great movies.</div>
        <h1>Your people.<br>The same moment.</h1>
        <p class="intro">A little room for your movie nights.<br>Press play together, talk through the credits.</p>
        <div class="feature-strip"><span>${icon('sync')} In sync</span><span>${icon('chat')} Group chat</span><span>${icon('video')} Free calls</span></div>
        <details id="lobby-appearance"><summary id="appearance-summary">Appearance · Minimalism</summary><label for="theme-lobby">Theme</label><select id="theme-lobby">${themeOptions}</select><p class="theme-hint">Only changes your view.</p></details><div class="field"><label for="name">What should we call you?</label><input id="name" autocomplete="nickname" maxlength="28" placeholder="Your name"></div>
        <details class="room-options"><summary>Room preferences</summary><label for="create-controls">Playback control</label><select id="create-controls"><option value="host">Only the host</option><option value="everyone">Everyone in the room</option></select><label class="check"><input id="create-wait" type="checkbox" checked> Wait for buffering friends (up to 20 seconds)</label></details><button id="create" class="primary full">Create a room ${icon('arrow')}</button>
        <button id="cancel" class="quiet full" hidden>Cancel connection</button><div class="divider">or join your friends</div>
        <form id="join-form"><label for="code-input">Room code</label><div class="row"><input id="code-input" autocomplete="off" spellcheck="false" maxlength="32" placeholder="XXXX-XXXX-XXXX" required><button id="join">Join</button></div></form>
        <details id="settings"><summary>Connection settings</summary><p>Usually, you can leave this empty. If you use a custom signaling server, everyone needs the same server settings. A TURN relay can help on restrictive networks.</p><label for="options">Optional PeerJS settings (JSON)</label><textarea id="options" spellcheck="false" placeholder='{"host":"your-server.example","port":443,"secure":true}'></textarea><button id="settings-save">Save for this tab</button><p>Server settings and relay credentials stay in this tab’s session storage. Leave blank to use the free public service.</p></details>
      </div>
      <div id="footnote"><span>No account. No subscription.</span><span>Made for movie nights ↗</span></div>
      <div id="session" hidden>
        <details id="party-settings"><summary>Room & viewing options</summary><div id="room-head"><div class="row between"><div><div class="label">Your room · invite your people</div><div id="room-code"></div></div><button id="copy">Copy code</button></div><div class="row between room-info"><span><span class="dot"></span><span id="count">1 person here</span></span><span id="network">Connected</span></div></div>

        <div id="theme-preference"><label for="theme-room">Theme</label><select id="theme-room">${themeOptions}</select><p class="theme-hint">Only changes your view.</p></div><details id="room-preferences"><summary>Room preferences · host only</summary><label for="controls-mode">Playback control</label><select id="controls-mode"><option value="host">Only the host</option><option value="everyone">Everyone in the room</option></select><label class="check"><input id="wait-mode" type="checkbox" checked> Wait for buffering friends (up to 20 seconds)</label></details>
        </details>
        <section id="watching-card" aria-label="Watching now"><div class="label">Watching now</div><h2 id="movie-title">Choose a movie or episode</h2><p id="movie-episode" class="small muted"></p><p id="movie-clock" class="small"></p><a id="movie-link" hidden target="_blank" rel="noopener noreferrer">Open this title in Stremio ↗</a><p id="match-status" class="small"></p></section>
        <div id="playback-section"><div id="sync-box"><div class="row"><span id="sync-status" role="status"></span><button id="sync-now">Sync now</button></div><a id="open-title" hidden target="_blank" rel="noopener noreferrer">Open host’s title in Stremio ↗</a></div>
        <div id="playback-tools"><span id="control-note" class="small muted"></span><div class="row"><button id="room-play">Play room</button><button id="skip-wait" hidden>Continue without waiting</button></div></div>
        </div><div id="movie-disclosures"><details id="movie-details"><summary>Stream details</summary><p id="host-stream"></p><p id="your-stream"></p><p id="movie-description"></p><p class="muted">Release labels are reported by the source; matching durations do not prove identical content.</p></details><details id="readiness"><summary>Everyone’s playback</summary><div id="people" aria-label="People in this room"></div></details></div>
        <div id="call-home"><div id="call-section"><div class="row between"><span class="label">Better face to face</span><span id="call-label" class="muted small">Camera off</span></div><p id="call-intro">Join when you’re ready. Your mic and camera stay off until then.</p><div id="tiles" hidden></div><div id="call-join" class="row"><button id="call-start">${icon('video')} Join video call</button><button id="audio-start">${icon('mic')} Audio only</button></div><div id="call-controls" class="call-controls" hidden><button id="mic" aria-pressed="true">Mic on</button><button id="camera" aria-pressed="true">Camera on</button><button id="sound" aria-pressed="true">Sound on</button><button id="hangup" class="danger">Leave call</button></div><div id="audio-options" hidden><label for="mic-mode">Microphone mode</label><select id="mic-mode"><option value="open">Open mic</option><option value="push">Hold to talk</option></select><div id="talk-shortcut" hidden><label for="talk-key">Hold-to-talk key</label><select id="talk-key"><option value="">Button only</option>${Array.from('ABCDEFGHIJKLMNOPQRSTUVWXYZ', letter => `<option value="${letter}">${letter}</option>`).join('')}</select><p id="talk-hint" class="small muted">Works in this tab, except while typing.</p></div><button id="push-talk" hidden aria-pressed="false">Hold to talk</button><p id="audio-status" class="small muted" role="status"></p><p class="small muted">Hearing the movie twice? Use headphones or Hold to talk.</p></div></div>
        </div><div id="chat-head" class="row between"><span class="label">Room chat</span><span class="muted small">Say it here.</span></div>
        <div id="messages" role="log" tabindex="0" aria-label="Room messages" aria-live="polite"><div id="message-list"><div id="empty-chat">${icon('chat')}The best part is who you watch with.<br>Say hello to your people.</div></div></div><button id="new-messages" hidden>New messages ↓</button>
        <form id="chat-form"><input id="chat-input" aria-label="Message your room" placeholder="Message your room…" maxlength="1000" autocomplete="off"><button id="send" class="primary" aria-label="Send message">${icon('send')}</button></form>
        <div id="session-footer" class="row between"><span>Just this room. No saved chat.</span><button id="leave" class="quiet danger">Leave room</button></div>
      </div>
    </section>
    <section id="compact" aria-label="Compact call strip" hidden><div id="compact-content"></div><button id="expand">Chat & room</button></section>
    <div id="chat-float"><div id="chat-previews" role="log" aria-label="New room messages" aria-live="polite" aria-relevant="additions"></div></div>
    <dialog id="end-dialog" aria-labelledby="end-title"><h2 id="end-title">End this room for everyone?</h2><p>Your friends will disconnect and the call will end.</p><div class="row"><button id="keep-room" autofocus>Keep watching</button><button id="confirm-end" class="danger">End room for everyone</button></div></dialog>`;
  document.body.append(host);
  const $ = id => root.getElementById(id);
  const hide = (id, hidden) => { $(id).hidden = hidden; };
  initAppearance(host, root, icon);
  let room, player, calls, noticeTimer, sound = true, soundBlocked = false;
  const holdToTalk = new HoldToTalk(active => {
    if ($('mic-mode').value === 'push') calls?.setMic(active);
    $('push-talk').setAttribute('aria-pressed', String(active));
    $('push-talk').textContent = active ? 'Talking…' : holdToTalk?.key ? `Hold ${holdToTalk.key} to talk` : 'Hold to talk';
  }, { blocked: () => $('end-dialog').open });
  const showTalkKey = () => {
    $('talk-key').value = holdToTalk.key;
    $('push-talk').textContent = holdToTalk.key ? `Hold ${holdToTalk.key} to talk` : 'Hold to talk';
    if (holdToTalk.key) $('push-talk').setAttribute('aria-keyshortcuts', holdToTalk.key); else $('push-talk').removeAttribute('aria-keyshortcuts');
    $('talk-hint').textContent = holdToTalk.key ? `Hold ${holdToTalk.key} while this tab is focused. Disabled while typing; release to mute.` : 'Press and hold the on-screen button to speak.';
  };
  try { holdToTalk.setKey(localStorage.getItem('sidekick-talk-key') ?? DEFAULT_TALK_KEY); } catch { /* Optional preference. */ }
  showTalkKey();
  $('talk-key').onchange = () => { holdToTalk.setKey($('talk-key').value); showTalkKey(); try { localStorage.setItem('sidekick-talk-key', holdToTalk.key); } catch { /* Optional preference. */ } };
  const seen = new Set();
  const chatScroll = new ChatScroll($('messages'), $('message-list'), $('new-messages'), $('session'));
  const layout = new WatchLayout(host, root);
  const updateLayout = () => {
    layout.set(!!room?.active, !$('panel').hidden, !!calls?.stream);
    hide('folded-actions', !$('panel').hidden);
    quickReply.setAvailable(!!room?.active && $('panel').hidden);
  };
  const notice = (message, expected) => { if (expected && $('notice').textContent !== expected) return; clearTimeout(noticeTimer); $('notice').textContent = message; hide('notice', !message); };
  try { $('name').value = localStorage.getItem('sidekick-name') || ''; $('options').value = sessionStorage.getItem('sidekick-options') || ''; } catch { /* Storage is optional. */ }
  const panel = open => {
    hide('panel', !open); $('launcher').setAttribute('aria-expanded', String(open));
    if (open) { previews.clear(); chatScroll.bottom(); } else $('launcher').focus();
    updateLayout();
  };
  const quickReply = new QuickReply(root, text => !!room?.chat(text), notice);
  const previews = new ChatPreviews($('chat-previews'), message => quickReply.open(message), { actionLabel: 'Reply to room', clearOnActivate: false });
  $('launcher').onclick = () => panel($('panel').hidden);
  $('expand').onclick = () => panel(true);
  $('minimize').onclick = () => panel(false);
  root.addEventListener('keydown', e => { e.stopPropagation(); if (e.key === 'Escape' && !e.isComposing && !$('end-dialog').open) { e.preventDefault(); if (quickReply.isOpen) quickReply.close(true); else panel(false); } });
  root.addEventListener('keyup', e => e.stopPropagation());
  // Keep the overlay visible when Stremio puts its player container in fullscreen.
  document.addEventListener('fullscreenchange', () => {
    const parent = document.fullscreenElement;
    (parent && !['VIDEO', 'IFRAME'].includes(parent.tagName) ? parent : document.body).append(host);
  });
  $('settings-save').onclick = () => {
    try { parseOptions($('options').value); sessionStorage.setItem('sidekick-options', $('options').value); notice('Connection settings saved for this tab.'); $('settings').open = false; }
    catch (e) { notice(e.message); }
  };
  function busy(value) { hide('cancel', !value); $('create').disabled = value; $('join').disabled = value; $('create').textContent = value ? 'Connecting…' : 'Create a room →'; }
  function begin(code) {
    if (room) return;
    if (code && !normalizeCode(code)) { notice('Enter all 12 characters of the room code.'); $('code-input').focus(); return; }
    if (!$('name').value.trim()) { notice('Add your name so your friends know it’s you.'); $('name').focus(); return; }
    let options;
    try {
      options = parseOptions($('options').value);
      // This compile-time-only override is absent from the distributed userscript.
      if (__DEMO__ && new URLSearchParams(location.search).has('local')) options = { host: '127.0.0.1', port: 9001, path: '/sidekick', secure: false };
    } catch (e) { notice(e.message); return; }
    notice(''); busy(true); seen.clear();
    try { localStorage.setItem('sidekick-name', $('name').value.trim()); } catch { /* Optional. */ }
    const next = new Room((type, value) => { if (room === next) onRoom(type, value); }, options);
    room = next;
    if (!code) next.policy = { controls: $('create-controls').value, wait: $('create-wait').checked };
    try { next.start($('name').value, code).catch(e => { if (room === next) { reset(); notice(e.message); } }); } catch (e) { reset(); notice(e.message); }
  }
  $('create').onclick = () => begin();
  $('cancel').onclick = () => { reset(); notice('Connection cancelled.'); };
  $('join-form').onsubmit = e => { e.preventDefault(); begin($('code-input').value); };
  function onRoom(type, value) {
    if (type === 'ready') {
      layout.reset(); chatScroll.reset(); previews.clear(); quickReply.reset(); $('end-dialog').close();
    busy(false); hide('lobby', true); hide('footnote', true); hide('session', false); notice('');
      $('room-code').textContent = formatCode(room.code); $('leave').textContent = room.host ? 'End room' : 'Leave room';
      hide('room-preferences', !room.host);
      $('party-settings').open = false; $('movie-details').open = false; $('readiness').open = false; renderPolicy();
      const nextCalls = new Calls(room, (type, value) => { if (calls === nextCalls) onCall(type, value); });
      calls = nextCalls;
      player = new PlayerSync(room, (text, state, key) => {
        $('sync-status').textContent = text; $('sync-box').dataset.state = state;
        $('room-play').textContent = (room.host ? player?.desiredPaused ?? true : player?.remote?.paused ?? true) ? 'Play room' : 'Pause room';
        hide('skip-wait', !room.host || !player?.waitingGuests);
        renderPlayback();
        const url = key && detailUrl(key); hide('open-title', !url); if (url) $('open-title').href = url;
      });
      updateLayout(); $('chat-input').focus();
    }
    if (type === 'network') $('network').textContent = value;
    if (type === 'members') {
      $('count').textContent = `${value.length} ${value.length === 1 ? 'person' : 'people'} here`;
      renderPlayback();
      calls?.roster(value);
      if (pinned && !value.some(m => m.id === pinned && m.call)) pinned = null;
      refreshTiles();
    }
    if (type === 'playbackRoster') renderPlayback();
    if (type === 'policy') { renderPolicy(); player?.tick(); }
    if (type === 'command') player?.control(value);
    if (type === 'chat') addMessage(value);
    if (type === 'state') player?.receive(value);
    if (type === 'incomingCall') { if (calls) calls.incoming(value); else value.close(); }
    if (type === 'ended') { reset(); notice(value); panel(true); }
  }
  function renderPolicy() {
    $('controls-mode').value = room.policy.controls; $('wait-mode').checked = room.policy.wait;
    const allowed = room.host || room.policy.controls === 'everyone';
    $('room-play').disabled = !allowed;
    $('control-note').textContent = room.policy.controls === 'everyone' ? 'Everyone can play, pause and seek.' : 'The host controls playback.';
  }
  $('controls-mode').onchange = $('wait-mode').onchange = () => room?.setPolicy({ controls: $('controls-mode').value, wait: $('wait-mode').checked });
  $('room-play').onclick = () => player?.toggle();
  $('skip-wait').onclick = () => player?.continueWithoutWaiting();
  function renderPlayback() {
    if (!room?.active || !player) return;
    const state = room.host ? room.state : player.remote, local = player.snapshot(), media = state?.media || {};
    const title = media.title || (state?.key ? state.key.split('/')[1] : 'Choose a movie or episode');
    $('movie-title').textContent = title;
    $('movie-episode').textContent = media.episode || '';
    $('movie-clock').textContent = `Host ${clockTime(state?.time)} / ${clockTime(state?.duration || NaN)}${room.host ? '' : ` · You ${clockTime(local.time)} / ${clockTime(local.duration || NaN)}`}`;
    const url = state?.key && detailUrl(state.key); hide('movie-link', !url); if (url) $('movie-link').href = url;
    const streamLine = m => `${m.source || 'Source not reported'} · ${m.release || 'Release / edition not reported'}`;
    $('host-stream').textContent = `Host: ${streamLine(media)}`;
    $('your-stream').textContent = room.host ? '' : `You: ${streamLine(local.media)}`;
    $('movie-description').textContent = media.description || 'Description unavailable. Open the title in Stremio for more details.';
    const comparison = compareMedia(state, local);
    $('room-play').disabled = !room.host && (room.policy.controls !== 'everyone' || comparison.kind === 'mismatch' || !local.duration || !state?.duration);
    $('match-status').textContent = room.host ? '' : comparison.text;
    hide('match-status', room.host);
    $('match-status').dataset.kind = room.host ? 'unknown' : comparison.kind;
    const reports = new Map((room.playback || []).map(r => [r.id, r]));
    reports.set(room.id, { id: room.id, ...local, stale: false });
    const labels = {ready:'Ready',loading:'Buffering',seeking:'Seeking',blocked:'Tap Sync now to allow playback',error:'Stream failed — choose another',mismatch:'Different title or edition',absent:'Choosing a stream',ended:'Video ended'};
    $('people').replaceChildren(...[...room.members.values()].map(m => {
      const r = reports.get(m.id), el = document.createElement('div'); el.className = 'playback-person';
      const name = document.createElement('b'); name.textContent = `${m.name}${m.id === room.id ? ' (you)' : ''}${m.host ? ' · host' : ''}`;
      const status = document.createElement('span');
      const comparison = r ? compareMedia(state, r) : null;
      const mismatch = comparison?.kind === 'mismatch';
      status.textContent = !r ? 'Connecting playback…' : r.stale ? 'Connection stale — not holding room' : mismatch ? comparison.text.replace('yours ', `${m.name}’s `) : labels[r.status] || 'Checking playback';
      if (!r?.stale && !mismatch && comparison?.kind === 'warning') status.textContent += ` · ${comparison.text}`;
      el.dataset.state = mismatch ? 'mismatch' : r?.stale ? 'stale' : r?.status || 'absent';
      const time = document.createElement('small'); time.textContent = r?.duration ? `${clockTime(r.time)} / ${clockTime(r.duration)}` : 'Duration not available';
      el.append(name, status, time); return el;
    }));
  }
  $('movie-link').onclick = e => { if (location.hostname === 'web.stremio.com') { e.preventDefault(); location.hash = new URL($('movie-link').href).hash; } };
  function addMessage(m) {
    if (seen.has(m.id)) return; seen.add(m.id); if (seen.size > 300) seen.delete(seen.values().next().value);
    hide('empty-chat', true);
    const area = $('message-list');
    const el = document.createElement('div'); el.className = `message ${m.author === room.id ? 'mine' : ''}`;
    const meta = document.createElement('div'); meta.className = 'meta';
    const name = document.createElement('b'); name.textContent = m.author === room.id ? 'You' : m.name;
    const time = document.createElement('time'); time.textContent = new Date(m.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const text = document.createElement('p'); text.textContent = m.text;
    meta.append(name, time); el.append(meta, text); area.append(el);
    while (area.querySelectorAll('.message').length > 100) area.querySelector('.message').remove();
    chatScroll.added(m.author === room.id);
    previews.add(m, { open: !$('panel').hidden, own: m.author === room.id });
  }
  $('copy').onclick = async () => {
    try { await navigator.clipboard.writeText(formatCode(room.code)); $('copy').textContent = 'Copied!'; setTimeout(() => { $('copy').textContent = 'Copy code'; }, 1800); }
    catch { notice(`Copy this room code: ${formatCode(room.code)}`); const selection = window.getSelection(); const range = document.createRange(); range.selectNodeContents($('room-code')); selection.removeAllRanges(); selection.addRange(range); }
  };
  $('sync-now').onclick = () => { player?.apply(true); };
  $('open-title').onclick = e => {
    // Navigate within the SPA so the room stays alive. Never open a remote stream URL.
    if (location.hostname === 'web.stremio.com') { e.preventDefault(); location.hash = new URL($('open-title').href).hash; }
  };
  const tiles = new Map(); let pinned = null;
  function tile(id, stream, self = false) {
    if (tiles.get(id)?.querySelector('video').srcObject === stream) return;
    tiles.get(id)?.remove();
    const el = document.createElement('div'); el.className = `tile ${self ? 'self' : ''}`;
    const initial = document.createElement('div'); initial.className = 'initial'; initial.textContent = 'Camera off';
    initial.hidden = stream.getVideoTracks().length > 0;
    const video = document.createElement('video'); video.autoplay = true; video.playsInline = true; video.muted = self || !sound; video.srcObject = stream;
    const label = document.createElement('span'); label.textContent = self ? 'You' : room.members.get(id)?.name || 'Friend';
    const pin = document.createElement('button'); pin.className = 'pin'; pin.textContent = 'Pin'; pin.setAttribute('aria-label', `Pin ${self ? 'your video' : room.members.get(id)?.name || 'friend'}`); pin.onclick = () => { pinned = pinned === id ? null : id; refreshTiles(); $('tiles').scrollTop = 0; $('tiles').scrollLeft = 0; };
    el.append(initial, video, label, pin); $('tiles').append(el); tiles.set(id, el); refreshTiles();
    video.addEventListener('loadeddata', refreshTiles);
    stream.getVideoTracks().forEach(t => { t.addEventListener('mute', refreshTiles); t.addEventListener('unmute', refreshTiles); });
    video.play().catch(error => {
      if (error.name !== 'NotAllowedError' || !room?.active) return;
      soundBlocked = true; $('sound').textContent = 'Enable sound';
      notice('Tap “Enable sound” to hear your friends.');
    });
  }
  function refreshTiles() {
    for (const [id, el] of tiles) {
      const camera = id === room?.id ? !!calls?.stream?.getVideoTracks().some(t => t.readyState === 'live') : room?.members.get(id)?.camera === true;
      const video = el.querySelector('video'), frameReady = camera && video.readyState >= 2;
      el.querySelector('.initial').textContent = camera ? 'Connecting video…' : 'Camera off';
      el.querySelector('.initial').hidden = frameReady; video.hidden = !camera;
      el.classList.toggle('pinned', pinned === id); const pin = el.querySelector('.pin'); pin.textContent = pinned === id ? 'Unpin' : 'Pin'; pin.setAttribute('aria-pressed', String(pinned === id));
    }
  }
  function onCall(type, value) {
    if (type === 'audioSettings') $('audio-status').textContent = value;
    if (type === 'cameraBusy') $('camera').disabled = value;
    if (type === 'camera') { $('camera').textContent = value ? 'Camera on' : 'Camera off'; $('camera').setAttribute('aria-pressed', String(value)); refreshTiles(); }

    if (type === 'notice') notice(value);
    if (type === 'busy') { $('call-start').disabled = false; $('audio-start').disabled = false; }
    if (type === 'local') {
      const active = !!value; holdToTalk.setEnabled(false); hide('talk-shortcut', true); hide('audio-options', !active); hide('call-join', active); hide('call-controls', !active); hide('tiles', !active); hide('call-intro', active);
      $('call-label').textContent = active ? 'You’re in the call' : 'Camera off';
      if (active) {
        $('party-settings').open = false;
        $('mic-mode').value = 'open'; calls?.setMic(true); hide('push-talk', true); $('mic').disabled = false;
        tile(room.id, value, true); sound = true; soundBlocked = false;
        $('mic').textContent = 'Mic on'; $('mic').setAttribute('aria-pressed', 'true');
        const camera = value.getVideoTracks().length > 0;
        $('camera').textContent = camera ? 'Camera on' : 'Camera off'; $('camera').disabled = false; $('camera').setAttribute('aria-pressed', String(camera));
        $('sound').textContent = 'Sound on'; $('sound').setAttribute('aria-pressed', 'true');
      } else { $('tiles').replaceChildren(); tiles.clear(); pinned = null; }
      updateLayout();
    }
    if (type === 'remote') tile(value.id, value.stream);
    if (type === 'remove') { tiles.get(value)?.remove(); tiles.delete(value); refreshTiles(); }
  }
  const startCall = video => { if (!calls) return; $('call-start').disabled = true; $('audio-start').disabled = true; calls.start(video); };
  $('call-start').onclick = () => startCall(true); $('audio-start').onclick = () => startCall(false);
  $('mic').onclick = () => { const on = calls.toggle('audio'); $('mic').textContent = on ? 'Mic on' : 'Mic off'; $('mic').setAttribute('aria-pressed', String(on)); };
  $('mic-mode').onchange = () => {
    const push = $('mic-mode').value === 'push'; holdToTalk.setEnabled(push); calls?.setMic(!push);
    $('mic').disabled = push; $('mic').textContent = push ? 'Hold to talk' : 'Mic on'; $('mic').setAttribute('aria-pressed', String(!push));
    hide('push-talk', !push); hide('talk-shortcut', !push); showTalkKey();
  };
  $('push-talk').onpointerdown = e => { if (e.button !== 0) return; $('push-talk').setPointerCapture(e.pointerId); holdToTalk.hold('pointer', true); };
  $('push-talk').onpointerup = $('push-talk').onpointercancel = $('push-talk').onlostpointercapture = () => holdToTalk.hold('pointer', false);
  $('push-talk').onkeydown = e => { if ([' ', 'Enter'].includes(e.key)) { e.preventDefault(); holdToTalk.hold('button', true); } };
  $('push-talk').onkeyup = e => { if ([' ', 'Enter'].includes(e.key)) { e.preventDefault(); holdToTalk.hold('button', false); } };
  $('push-talk').onblur = () => { holdToTalk.hold('button', false); holdToTalk.hold('pointer', false); };
  $('camera').onclick = () => calls?.camera();
  $('sound').onclick = () => {
    sound = soundBlocked ? true : !sound; soundBlocked = false; notice(''); $('sound').textContent = sound ? 'Sound on' : 'Sound off'; $('sound').setAttribute('aria-pressed', String(sound));
    for (const [id, el] of tiles) if (id !== room.id) { const video = el.querySelector('video'); video.muted = !sound; video.play().catch(error => { if (error.name === 'NotAllowedError') { soundBlocked = true; $('sound').textContent = 'Enable sound'; notice('Your browser is blocking call audio. Allow sound for this site, then tap Enable sound.'); } }); }
  };
  $('hangup').onclick = () => calls?.stop();
  function reset() {
    player?.close(); calls?.close(); room?.close(); player = calls = room = null;
    layout.reset(); chatScroll.reset(); previews.clear(); quickReply.reset(); $('end-dialog').close();
    busy(false); hide('lobby', false); hide('footnote', false); hide('session', true); $('people').replaceChildren();
    $('messages').querySelectorAll('.message').forEach(e => e.remove()); hide('empty-chat', false); seen.clear(); $('chat-input').value = '';
    $('call-start').disabled = false; $('audio-start').disabled = false;
  }
  const leave = () => { reset(); notice('You left the room. Your camera and microphone are off.'); };
  $('leave').onclick = () => { if (room?.host) { holdToTalk.release(); $('end-dialog').showModal(); $('keep-room').focus(); } else leave(); };
  $('keep-room').onclick = () => { $('end-dialog').close(); $('leave').focus(); };
  $('confirm-end').onclick = leave;
  window.addEventListener('pagehide', reset);
  if (__DEMO__) panel(true);
  return Object.freeze({
    show: () => panel(true),
    status: () => ({ inRoom: !!room?.active, open: !$('panel').hidden })
  });
}
