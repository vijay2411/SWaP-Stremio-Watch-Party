import Peer from 'peerjs';
import { RoomHandshake, roomCredentials, randomToken, validToken } from './room-auth.js';
import { encodeFrame, decodeFrame } from './wire.js';
import { VERSION, makeCode, normalizeCode, cleanName, validState, validPolicy, validReport, validCommand, policyValues } from './protocol.js';

export class Room {
  constructor(emit, options = {}) {
    this.emit = emit; this.options = options;
    this.pending = new Set(); this.bound = new Set(); this.links = new Map(); this.members = new Map(); this.history = [];
    this.policy = { controls: 'host', wait: true }; this.reports = new Map();
    this.active = false; this.closed = false; this.rtt = 0; this.lastHostSeen = performance.now();
  }
  async start(name, joinCode) {
    this.name = cleanName(name); this.host = !joinCode;
    this.code = this.host ? makeCode() : normalizeCode(joinCode);
    if (!this.code) throw new Error('Enter the 12-character room code.');
    const credentials = await roomCredentials(this.code);
    if (this.closed) return;
    this.hostId = credentials.hostId; this.authKey = credentials.key; this.callToken = randomToken();
    this.peer = new Peer(this.host ? this.hostId : `swap-${crypto.randomUUID()}`, { debug: 0, ...this.options });
    this.timeout = setTimeout(() => this.fail('Couldn’t connect. Check the code and ask the host to keep their room open. Your network may need a TURN relay in Connection settings.'), 20000);
    this.peer.on('open', id => {
      if (this.closed) return;
      this.id = id;
      if (!this.active) {
        if (this.host) {
          this.members.set(id, { id, name: this.name, host: true, call: false, callToken: this.callToken });
          this.ready(); this.roster();
        } else if (!this.upstream) {
          this.upstream = this.peer.connect(this.hostId, { reliable: true, serialization: 'raw', metadata: { v: VERSION } });
          this.bind(this.upstream, false);
        }
      }
      this.emit('network', 'Connected');
    });
    this.peer.on('connection', conn => {
      if (!this.host || this.closed || conn.metadata?.v !== VERSION || conn.serialization !== 'raw' || !validPeerId(conn.peer) || this.links.has(conn.peer) || this.pending.size >= 16) { conn.close(); return; }
      this.bind(conn, true);
    });
    this.peer.on('call', call => this.emit('incomingCall', call));
    this.peer.on('close', () => { if (!this.closed) this.fail('The connection service closed this session. Create or join a room again.'); });
    this.peer.on('disconnected', () => {
      if (this.closed) return;
      this.emit('network', 'Reconnecting signaling…');
      clearTimeout(this.reconnect);
      this.reconnect = setTimeout(() => { if (!this.closed && !this.peer.destroyed && this.peer.disconnected) this.peer.reconnect(); }, 2500);
    });
    this.peer.on('error', err => {
      if (this.closed) return;
      if (!this.active) this.fail(err.type === 'unavailable-id' ? 'That room code is taken. Try creating a new room.' : err.type === 'peer-unavailable' ? 'Room not found. Check the code and make sure everyone uses SWaP v4. Older rooms are separate.' : 'Connection failed. Try again, or check Connection settings.');
      else this.emit('network', 'Connection interrupted. Existing peers may still be connected.');
    });
    this.heartbeat = setInterval(() => {
      if (this.closed || !this.active || this.host) return;
      if (performance.now() - this.lastHostSeen > 16000) { this.fail('The host is no longer reachable. Rejoin when they are back.'); return; }
      this.ping = performance.now(); this.send(this.upstream, { t: 'ping', nonce: this.ping });
    }, 4000);
  }
  ready() { clearTimeout(this.timeout); this.active = true; this.emit('ready', this); }
  bind(conn, incoming) {
    let count = 0, windowStart = performance.now(), authenticated = false, ended = false;
    this.bound.add(conn); if (incoming) this.pending.add(conn);
    const expiry = setTimeout(() => { conn.close(); cleanup(); }, 10000);
    const auth = new RoomHandshake({
      incoming, key: this.authKey, hostId: this.hostId, guestId: incoming ? conn.peer : this.id,
      name: this.name, callToken: this.callToken,
      send: msg => this.send(conn, msg), reject: () => { conn.close(); cleanup(); },
      accept: identity => {
        if (ended || this.closed || !conn.open) return;
        if (incoming && this.links.has(conn.peer)) { conn.close(); cleanup(); return; }
        authenticated = true; clearTimeout(expiry); this.pending.delete(conn);
        if (incoming) {
          this.links.set(conn.peer, conn);
          this.members.set(conn.peer, { id: conn.peer, ...identity, host: false, call: false, joinedAt: performance.now() });
          this.send(conn, { t: 'welcome', v: VERSION, policy: this.policy });
          // Separate frames keep a full history within WebRTC's message size limit.
          this.replayHistory(conn);
          this.roster();
          if (this.state) this.send(conn, { t: 'state', state: this.state });
        }
      }
    });
    conn.on('open', () => { if (this.closed || ended) { conn.close(); return; } auth.start(); });
    conn.on('data', raw => {
      if (this.closed || ended) return;
      if (performance.now() - windowStart > 1000) { count = 0; windowStart = performance.now(); }
      // A host aggregates the group. Only guests receive a per-person traffic limit.
      if (incoming && ++count > 30) { conn.close(); cleanup(); return; }
      let msg;
      try { msg = decodeFrame(raw, !authenticated ? 2048 : incoming ? 16384 : undefined); }
      catch { conn.close(); cleanup(); return; }
      if (!authenticated) { void auth.receive(msg); return; }
      if (incoming) this.fromGuest(conn, msg);
      else if (this.upstream === conn) this.fromHost(msg);
    });
    const cleanup = () => {
      if (ended) return; ended = true;
      clearTimeout(expiry); this.pending.delete(conn); this.bound.delete(conn); auth.close();
      if (this.closed) return;
      if (incoming && this.links.get(conn.peer) === conn) {
        this.links.delete(conn.peer); this.members.delete(conn.peer); this.reports.delete(conn.peer); this.roster();
      } else if (!incoming) this.fail(authenticated ? 'The host left or the connection was lost. You can join another room below.' : 'Couldn’t verify this room. Check the code and use SWaP v4 on every device.');
    };
    conn.on('close', cleanup);
    conn.on('error', () => { conn.close(); cleanup(); });
  }
  send(conn, msg) {
    if (!conn?.open) return false;
    // A slow recipient must not accumulate an unbounded data-channel queue.
    if (conn.dataChannel?.bufferedAmount > 256 * 1024) { conn.close(); return false; }
    try { conn.send(encodeFrame(msg)); return true; } catch { conn.close(); return false; }
  }
  broadcast(msg) { for (const conn of this.links.values()) this.send(conn, msg); }
  replayHistory(conn) {
    const recent = []; let bytes = 0;
    for (const message of this.history.slice().reverse()) {
      bytes += new TextEncoder().encode(encodeFrame({ t: 'history', message })).byteLength;
      if (bytes > 128 * 1024) break;
      recent.push(message);
    }
    for (const message of recent.reverse()) if (!this.send(conn, { t: 'history', message })) break;
  }
  roster() {
    const members = [...this.members.values()];
    this.broadcast({ t: 'roster', members }); this.emit('members', members);
  }
  fromGuest(conn, msg) {
    if (this.closed || !this.members.has(conn.peer) || this.links.get(conn.peer) !== conn) return;
    if (msg.t === 'chat' && typeof msg.text === 'string') this.acceptChat(conn.peer, msg.text);
    if (msg.t === 'callStatus' && typeof msg.active === 'boolean') { Object.assign(this.members.get(conn.peer), { call: msg.active, camera: msg.active && msg.camera === true }); this.roster(); }
    if (msg.t === 'ping' && Number.isFinite(msg.nonce)) this.send(conn, { t: 'pong', nonce: msg.nonce });
    if (msg.t === 'sync' && this.state) this.send(conn, { t: 'state', state: this.state });
    if (msg.t === 'report' && validReport(msg.report)) this.reports.set(conn.peer, { ...msg.report, at: performance.now() });
    if (msg.t === 'command' && this.policy.controls === 'everyone' && validCommand(msg.command) && msg.command.key === this.state?.key) {
      const report = this.reports.get(conn.peer);
      if (report && performance.now() - report.at <= 6000 && report.key === this.state.key && report.status !== 'mismatch' && report.duration > 0 && this.state.duration > 0 && Math.abs(report.duration - this.state.duration) <= 3) this.emit('command', msg.command);
    }
  }
  fromHost(msg) {
    this.lastHostSeen = performance.now();
    if (msg.t === 'welcome' && !this.active && msg.v === VERSION) {
      if (validPolicy(msg.policy)) this.policy = policyValues(msg.policy);
      this.ready();
      this.emit('policy', this.policy);
    }
    if (!this.active) return;
    if (msg.t === 'policy' && validPolicy(msg.policy)) { this.policy = policyValues(msg.policy); this.emit('policy', this.policy); }
    if (msg.t === 'roster' && Array.isArray(msg.members)) {
      const members = msg.members.filter(m => m && validPeerId(m.id) && typeof m.name === 'string' && validToken(m.callToken)).map(m => ({ id: m.id, name: cleanName(m.name), host: m.id === this.hostId, call: m.call === true, camera: m.camera === true, callToken: m.callToken }));
      this.members = new Map(members.map(m => [m.id, m])); this.emit('members', members);
    }
    if (msg.t === 'chat' || msg.t === 'history') this.receiveChat(msg.message, msg.t === 'history');
    if (msg.t === 'state' && validState(msg.state)) this.emit('state', msg.state);
    if (msg.t === 'playbackRoster' && Array.isArray(msg.reports)) {
      this.playback = msg.reports.filter(r => r && typeof r.id === 'string' && r.id.length < 100 && validReport(r) && typeof r.stale === 'boolean');
      this.emit('playbackRoster', this.playback);
    }
    if (msg.t === 'pong' && msg.nonce === this.ping) this.rtt = Math.min(2000, performance.now() - msg.nonce);
  }
  acceptChat(id, value) {
    const text = value.trim().slice(0, 1000); if (!text) return;
    const message = { id: crypto.randomUUID(), author: id, name: this.members.get(id).name, text, time: Date.now() };
    this.history.push(message); if (this.history.length > 100) this.history.shift();
    this.broadcast({ t: 'chat', message }); this.emit('chat', message);
  }
  receiveChat(m, history = false) {
    if (m && typeof m.id === 'string' && m.id.length <= 100 && validPeerId(m.author) && typeof m.name === 'string' && typeof m.text === 'string' && Number.isFinite(m.time)) this.emit('chat', { id: m.id, author: m.author, name: cleanName(m.name), text: m.text.slice(0, 1000), time: m.time, history });
  }
  chat(text) {
    if (!this.active || this.closed) return false;
    if (performance.now() - (this.lastChat || -1000) < 500) return false;
    this.lastChat = performance.now();
    if (this.host) { this.acceptChat(this.id, text); return true; }
    return this.send(this.upstream, { t: 'chat', text });
  }
  publish(state) { if (this.host && this.active) { this.state = state; this.broadcast({ t: 'state', state }); } }
  publishReports(local, now = performance.now()) {
    if (!this.host || !this.active) return;
    const reports = [{ id: this.id, ...local, stale: false }];
    for (const [id] of this.members) if (id !== this.id) {
      const r = this.reports.get(id);
      reports.push(r ? { id, key: r.key, status: r.status, duration: r.duration, time: r.time || 0, ready: !!r.ready, media: r.media || {}, stale: now - r.at > 6000 } : { id, key: '', status: 'absent', duration: 0, time: 0, ready: false, media: {}, stale: now - (this.members.get(id)?.joinedAt ?? now) > 6000 });
    }
    this.playback = reports; this.broadcast({ t: 'playbackRoster', reports }); this.emit('playbackRoster', reports);
  }
  setPolicy(policy) {
    if (!this.host || !validPolicy(policy)) return;
    this.policy = policyValues(policy);
    this.broadcast({ t: 'policy', policy: this.policy }); this.emit('policy', this.policy);
  }
  command(command) {
    if (!this.active || !validCommand(command)) return false;
    if (this.host) { this.emit('command', command); return true; }
    return this.policy.controls === 'everyone' && this.send(this.upstream, { t: 'command', command });
  }
  report(report) { if (!this.host && this.active && validReport(report)) this.send(this.upstream, { t: 'report', report }); }
  callStatus(active, camera = false) {
    if (!this.active || this.closed) return;
    if (this.host) { Object.assign(this.members.get(this.id), { call: active, camera: active && camera }); this.roster(); }
    else this.send(this.upstream, { t: 'callStatus', active, camera });
  }
  fail(message) { this.close(); this.emit('ended', message); }
  close() {
    if (this.closed) return;
    this.closed = true; this.active = false;
    clearTimeout(this.timeout); clearTimeout(this.reconnect); clearInterval(this.heartbeat);
    for (const conn of this.bound) conn.close(); this.bound.clear(); this.pending.clear();
    this.peer?.destroy(); this.links.clear(); this.members.clear(); this.reports.clear(); this.history = [];
    this.authKey = null; this.callToken = ''; this.code = ''; this.state = null; this.playback = [];
  }
}

const validPeerId = id => typeof id === 'string' && /^[A-Za-z0-9_-]{1,99}$/.test(id);
