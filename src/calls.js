import { validToken } from './room-auth.js';
import { VERSION } from './protocol.js';
export async function configureAudio(track) {
  if (!track) return 'No microphone track.';
  let caps = {}, settings = {};
  try { caps = track.getCapabilities?.() || {}; } catch { /* Some devices do not expose capabilities. */ }
  try {
    await track.applyConstraints({ echoCancellation: caps.echoCancellation?.includes('all') ? { exact: 'all' } : true, noiseSuppression: true, autoGainControl: true, channelCount: { ideal: 1 } });
  } catch { /* Keep the already acquired audio; report its actual settings below. */ }
  try { settings = track.getSettings?.() || {}; } catch { /* Do not abandon an acquired stream over diagnostics. */ }
  const state = v => v === undefined ? 'not reported' : v === false ? 'unavailable' : 'on';
  return `Echo cancellation: ${state(settings.echoCancellation)} · Noise suppression: ${state(settings.noiseSuppression)}`;
}
export class Calls {
  constructor(room, emit) {
    this.room = room; this.emit = emit; this.links = new Map(); this.members = []; this.generation = 0;
    this.pendingOffers = new Map(); this.watchers = new Map(); this.failures = new Map();
    this.retry = setInterval(() => this.reconcile(), 5000);
  }
  async start(video = true) {
    if (this.pending || this.stream) return;
    const generation = ++this.generation; this.pending = true; let acquired;
    try {
      const stream = acquired = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true }, video: video ? { width: { ideal: 320 }, height: { ideal: 180 }, frameRate: { ideal: 15, max: 20 } } : false });
      if (generation !== this.generation || this.room.closed) { stream.getTracks().forEach(t => t.stop()); return; }
      this.stream = stream;
      const audioSettings = await configureAudio(stream.getAudioTracks()[0]);
      if (generation !== this.generation || this.room.closed) { stream.getTracks().forEach(t => t.stop()); return; }
      this.emit('audioSettings', audioSettings);
      stream.getTracks().forEach(t => t.addEventListener('ended', () => { if (this.stream === stream) { this.stop(); this.emit('notice', 'A device was disconnected. Join the call again.'); } }));
      this.emit('local', stream); this.room.callStatus(true, stream.getVideoTracks().length > 0); this.reconcile();
    } catch (error) {
      acquired?.getTracks().forEach(t => t.stop());
      if (generation !== this.generation) return;
      if (acquired && this.stream === acquired) { this.stop(); this.emit('busy', false); }
      this.emit('notice', error.name === 'NotAllowedError' ? 'Camera or microphone permission was denied. Allow access in browser settings, then try again.' : 'Couldn’t open your camera or microphone. Check the device, or try Audio only.');
    } finally { if (generation === this.generation) { this.pending = false; this.emit('busy', false); } }
  }
  roster(members) {
    this.members = members;
    for (const [id, message] of this.failures) if (!members.some(m => m.id === id && m.call)) {
      this.failures.delete(id); this.emit('clearNotice', message);
    }
    for (const [id, call] of this.links) if (!members.some(m => m.id === id && m.call)) this.drop(call);
    for (const [id, pending] of this.pendingOffers) {
      if (!members.some(m => m.id === id)) this.discardPending(id);
      else if (this.room.members.get(id)?.call) { this.discardPending(id, false); this.incoming(pending.call); }
    }
    this.reconcile();
  }
  reconcile() {
    if (!this.stream || this.room.closed || this.room.peer.disconnected) return;
    for (const m of this.members) {
      // Exactly one initiator per pair prevents duplicate calls and offer glare.
      if (m.call && validToken(m.callToken) && m.id !== this.room.id && this.room.id < m.id && !this.links.has(m.id)) {
        try {
          const call = this.room.peer.call(m.id, this.stream, { metadata: { v: VERSION, token: m.callToken } });
          if (call) this.bind(call);
        } catch { this.failed(m.id, 'couldn’t start'); }
      }
    }
  }
  incoming(call) {
    if (!this.stream || this.room.closed || !this.room.members.has(call.peer) || !validToken(this.room.callToken) || call.metadata?.token !== this.room.callToken || call.metadata?.v !== VERSION || this.links.has(call.peer) || this.pendingOffers.has(call.peer)) { call.close(); return; }
    if (!this.room.members.get(call.peer).call) {
      // Signaling offers and the authenticated room roster travel independently.
      // Wait briefly for call consent; never answer solely because a token matches.
      const timer = setTimeout(() => this.discardPending(call.peer), 8000);
      this.pendingOffers.set(call.peer, { call, timer }); return;
    }
    this.bind(call);
    try { call.answer(this.stream); this.watchers.get(call)?.watch(); }
    catch { this.drop(call); this.failed(call.peer, 'couldn’t start'); }
  }
  discardPending(id, close = true) {
    const pending = this.pendingOffers.get(id); if (!pending) return;
    clearTimeout(pending.timer); this.pendingOffers.delete(id);
    if (close) pending.call.close();
  }
  failed(id, reason) {
    const name = this.room.members?.get(id)?.name || 'your friend';
    const message = `The call with ${name} ${reason}. Retrying automatically; if it keeps failing, both leave and rejoin the call.`;
    this.failures.set(id, message); this.emit('notice', message);
  }
  drop(call) {
    const watcher = this.watchers.get(call);
    if (watcher) watcher.dispose();
    else { if (this.links.get(call.peer) === call) { this.links.delete(call.peer); this.emit('remove', call.peer); } call.close(); }
  }
  bind(call) {
    this.links.set(call.peer, call);
    let ended = false, pc, disconnectTimer, remote, connected = false;
    const timeout = setTimeout(() => {
      if (this.links.get(call.peer) !== call) return;
      const reason = call.open === false ? 'wasn’t answered in time' : 'couldn’t establish a media connection';
      dispose(); this.failed(call.peer, reason);
    }, 18000);
    const cleanup = () => {
      if (ended) return; ended = true;
      clearTimeout(timeout); clearTimeout(disconnectTimer);
      pc?.removeEventListener('connectionstatechange', changed);
      pc?.removeEventListener('iceconnectionstatechange', changed);
      this.watchers.delete(call);
      if (this.links.get(call.peer) === call) { this.links.delete(call.peer); this.emit('remove', call.peer); }
    };
    // Delete our ownership first: PeerJS close can synchronously emit events.
    const dispose = () => { cleanup(); call.close(); };
    const ready = () => {
      if (!connected || !remote || ended) return;
      clearTimeout(timeout);
      const message = this.failures.get(call.peer);
      if (message) { this.failures.delete(call.peer); this.emit('clearNotice', message); }
    };
    const changed = () => {
      if (ended || this.links.get(call.peer) !== call) return;
      const state = pc?.connectionState || pc?.iceConnectionState;
      connected = state === 'connected' || state === 'completed';
      if (connected) { clearTimeout(disconnectTimer); disconnectTimer = null; ready(); }
      if (state === 'failed' || state === 'closed') {
        dispose(); this.failed(call.peer, 'lost its media connection');
      } else if (state === 'disconnected' && !disconnectTimer) {
        // A brief network change can recover without restarting a healthy call.
        disconnectTimer = setTimeout(() => { dispose(); this.failed(call.peer, 'stayed disconnected'); }, 8000);
      }
    };
    const watch = () => {
      if (ended || pc || !call.peerConnection) return;
      pc = call.peerConnection;
      pc.addEventListener('connectionstatechange', changed);
      pc.addEventListener('iceconnectionstatechange', changed); changed();
    };
    this.watchers.set(call, { dispose, watch });
    call.on('stream', stream => {
      if (ended || !this.stream || this.room.closed || this.links.get(call.peer) !== call) { stream.getTracks().forEach(t => t.stop()); call.close(); return; }
      remote = stream; watch(); ready(); this.emit('remote', { id: call.peer, stream });
    });
    call.on('close', cleanup);
    call.on('error', () => { if (ended) return; dispose(); this.failed(call.peer, 'was interrupted'); });
    watch();
  }
  toggle(kind) {
    const tracks = this.stream?.getTracks().filter(t => t.kind === kind) || [];
    if (!tracks.length) return false;
    const enabled = !tracks[0].enabled; tracks.forEach(t => { t.enabled = enabled; }); return enabled;
  }
  setMic(enabled) { for (const t of this.stream?.getAudioTracks() || []) t.enabled = enabled; }
  async camera() {
    if (!this.stream || this.cameraPending) return;
    const old = this.stream.getVideoTracks();
    if (old.length) {
      this.cameraPending = true; this.emit('cameraBusy', true);
      // Release the device, rather than merely transmitting black frames.
      for (const track of old) { this.stream.removeTrack(track); track.stop(); }
      this.room.callStatus(true, false); this.emit('camera', false);
      try { await this.replaceVideo(null); } finally { this.cameraPending = false; this.emit('cameraBusy', false); }
      if (!this.stream) return;
      return;
    }
    const generation = this.generation; this.cameraPending = true; this.emit('cameraBusy', true); let capture;
    try {
      capture = await navigator.mediaDevices.getUserMedia({ audio: false, video: { width: { ideal: 320 }, height: { ideal: 180 }, frameRate: { ideal: 15, max: 20 } } });
      if (!this.stream || generation !== this.generation) { capture.getTracks().forEach(t => t.stop()); return; }
      const track = capture.getVideoTracks()[0]; this.stream.addTrack(track);
      track.addEventListener('ended', () => { if (this.stream?.getVideoTracks().includes(track)) this.camera(); });
      await this.replaceVideo(track);
      if (!this.stream || generation !== this.generation) return;
      this.room.callStatus(true, true); this.emit('camera', true);
    } catch {
      for (const t of capture?.getTracks() || []) { if (this.stream?.getTracks().includes(t)) this.stream.removeTrack(t); t.stop(); }
      if (generation === this.generation) { this.room.callStatus(!!this.stream, false); this.emit('camera', false); this.emit('notice', 'Couldn’t open the camera. Allow camera access or choose another device.'); }
    }
    finally { this.cameraPending = false; this.emit('cameraBusy', false); }
  }
  async replaceVideo(track) {
    await Promise.all([...this.links.values()].map(async call => {
      const sender = call.videoSender || call.peerConnection?.getSenders().find(s => s.track?.kind === 'video');
      if (sender) {
        call.videoSender = sender;
        try { await sender.replaceTrack(track); return; } catch { /* Reconnect if the codec cannot accept this track. */ }
      }
      if (track) this.drop(call);
    }));
    this.reconcile();
  }
  stop() {
    this.generation++; this.pending = false;
    const stream = this.stream; this.stream = null; stream?.getTracks().forEach(t => t.stop());
    for (const id of this.pendingOffers.keys()) this.discardPending(id);
    for (const call of this.links.values()) this.drop(call);
    for (const message of this.failures.values()) this.emit('clearNotice', message);
    this.failures.clear(); this.room.callStatus(false); this.emit('local', null);
  }
  close() { clearInterval(this.retry); this.stop(); }
}
