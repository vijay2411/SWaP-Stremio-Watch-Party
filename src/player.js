import { mediaKey, targetTime, validState, validCommand } from './protocol.js';
import { MediaCatalog, compareMedia } from './media.js';

// A recovered stream must stay ready briefly before releasing the room. A
// timed-out peer needs a longer recovery before another automatic wait episode.
export class BufferGate {
  constructor() { this.waits = new Map(); }
  update(reports, key, enabled, now = performance.now(), limit = 20000, recovery = 0) {
    const waiting = [], skipped = []; let remaining = Infinity;
    for (const id of this.waits.keys()) if (!reports.has(id)) this.waits.delete(id);
    for (const [id, r] of reports) {
      if (!enabled || r.key !== key || !['loading','seeking','ready'].includes(r.status)) { this.waits.delete(id); continue; }
      let w = this.waits.get(id);
      if (now - r.at > 6000) { if (w) w.readySince = undefined; continue; }
      if (r.status === 'ready') {
        if (!w) continue;
        w.readySince ??= now;
        const stable = w.skipped ? Math.max(recovery, 10000) : recovery;
        if (now - w.readySince >= stable) { this.waits.delete(id); continue; }
      } else {
        if (!w || w.key !== key) { w = { key, since: now }; this.waits.set(id, w); }
        w.readySince = undefined;
      }
      if (limit && now - w.since >= limit) w.skipped = true;
      if (w.skipped) { if (r.status !== 'ready') skipped.push(id); }
      else { waiting.push(id); if (limit) remaining = Math.min(remaining, Math.max(0, Math.ceil((limit - (now - w.since)) / 1000))); }
    }
    return { waiting, skipped, remaining: Number.isFinite(remaining) ? remaining : 0 };
  }
  skip() { for (const w of this.waits.values()) w.skipped = true; }
}

export class PlayerSync {
  constructor(room, status, env = {}) {
    this.room = room; this.status = status; this.seq = 0; this.remote = null;
    this.doc = env.document || document; this.location = env.location || location;
    this.now = env.now || (() => performance.now()); this.gate = new BufferGate();
    this.catalog = env.catalog || new MediaCatalog(room.code || '', { remote: !env.document });
    this.currentKey = '';
    this.expected = {}; this.desiredPaused = true; this.baseRate = 1;
    this.events = ['play', 'pause', 'seeking', 'seeked', 'ratechange', 'waiting', 'playing', 'canplay', 'loadedmetadata', 'emptied', 'ended', 'error'];
    this.changed = e => this.onMedia(e);
    if (env.timer !== false) this.timer = setInterval(() => this.tick(), 1000);
    this.tick();
  }
  find() {
    const next = [...this.doc.querySelectorAll('video')].filter(v => !v.srcObject)
      .sort((a, b) => b.clientWidth * b.clientHeight - a.clientWidth * a.clientHeight)[0] || null;
    if (next === this.video) return;
    this.detach(); this.video = next; this.expected = {}; this.blocked = false; this.playPending = false;
    if (next) {
      this.baseRate = next.playbackRate; this.desiredPaused = next.paused;
      this.events.forEach(e => next.addEventListener(e, this.changed));
    }
  }
  detach() {
    if (this.video) { this.events.forEach(e => this.video.removeEventListener(e, this.changed)); this.video.playbackRate = this.baseRate || 1; }
  }
  key() { return mediaKey(this.location.hash); }
  onMedia(e) {
    const v = this.video; if (!v || this.closed) return;
    const action = { play: 'play', pause: 'pause', seeked: 'seek', ratechange: 'rate' }[e.type];
    if (action === 'pause' && v.ended && !this.room.host) return;
    if (action) {
      const value = action === 'seek' ? v.currentTime : action === 'rate' ? v.playbackRate : action === 'pause';
      const expected = this.expected[action];
      if (expected !== undefined && (typeof value === 'boolean' ? value === expected : Math.abs(value - expected) < (action === 'seek' ? .6 : .001))) { delete this.expected[action]; return; }
      delete this.expected[action];
      if (action === 'play') this.blocked = false;
      const c = { action, value, key: this.key() };
      if (this.room.host) this.control(c);
      else { this.room.command(c); this.report(); }
    } else if (e.type === 'ended' && this.room.host) { this.desiredPaused = true; this.tick(); }
    else if (!this.room.host) this.report();
  }
  control(c) {
    if (!this.room.host || !validCommand(c) || c.key !== this.key() || !this.video) return;
    if (c.action === 'play') { this.desiredPaused = false; this.blocked = false; }
    if (c.action === 'pause') this.desiredPaused = true;
    if (c.action === 'rate') this.baseRate = c.value;
    if (c.action === 'seek' && Number.isFinite(this.video.duration)) this.seek(Math.min(c.value, Math.max(0, this.video.duration - .05)));
    this.tick();
  }
  toggle() {
    const paused = this.room.host ? this.desiredPaused : this.remote?.paused;
    this.room.command({ action: paused ? 'play' : 'pause', key: this.key() });
  }
  seek(time) { if (Math.abs(this.video.currentTime - time) < .05) return; this.expected.seek = time; try { this.video.currentTime = time; } catch { delete this.expected.seek; } }
  rate(rate) { if (Math.abs(this.video.playbackRate - rate) < .001) return; this.expected.rate = rate; this.video.playbackRate = rate; }
  pause() { if (!this.video || this.video.paused) return; this.expected.pause = true; this.video.pause(); }
  play(force = false) {
    const v = this.video;
    if (!v || !v.paused || this.playPending || (this.blocked && !force)) return;
    this.expected.play = false; this.playPending = true;
    Promise.resolve(v.play()).then(() => { if (this.video === v && !this.closed) this.blocked = false; }).catch(e => {
      if (this.video !== v || this.closed) return;
      delete this.expected.play;
      if (e.name === 'NotAllowedError') { this.blocked = true; this.status('Tap Sync now to allow playback.', 'blocked'); }
      else if (e.name !== 'AbortError') this.status('Your stream could not play. Try another stream.', 'waiting');
    }).finally(() => { if (this.video === v) this.playPending = false; });
  }
  snapshot() {
    const v = this.video, s = this.remote, key = this.key(), duration = Number.isFinite(v?.duration) ? v.duration : 0;
    let status = !v || !key ? 'absent' : v.error ? 'error' : this.blocked ? 'blocked' : v.ended ? 'ended' : v.seeking ? 'seeking' : v.readyState < 3 || this.unseekable ? 'loading' : 'ready';
    const media = this.catalog.read(this.location.hash);
    if (v && v.readyState >= 1 && v.duration === Infinity) status = 'mismatch';
    if (!this.room.host && s?.key && key && (key !== s.key || (duration && s.duration && Math.abs(duration - s.duration) > 3))) status = 'mismatch';
    return { key, status, duration, time: Number.isFinite(v?.currentTime) ? v.currentTime : 0, ready: status === 'ready', media };
  }
  report() { if (!this.room.host) this.room.report(this.snapshot()); }
  receive(state) {
    if (!validState(state) || (this.remote && state.seq <= this.remote.seq)) return;
    this.remote = state; this.received = this.now(); this.apply(); this.report();
  }
  apply(force = false) {
    if (this.room.host) { if (force) { this.blocked = false; this.tick(); } return; }
    const v = this.video, s = this.remote;
    this.unseekable = false;
    if (!v) return this.status('Open a video in Stremio to sync.', 'waiting');
    if (!s || this.now() - this.received > 6000) { this.pause(); return this.status('Playback paused: waiting for the host connection…', 'waiting'); }
    if (!s.key || !this.key() || s.key !== this.key()) { this.pause(); return this.status('Open the same movie or episode as the host.', 'mismatch', s.key); }
    if (v.error) { this.pause(); return this.status('Your stream failed. Select another stream of this title.', 'waiting'); }
    if (v.readyState < 1) { this.pause(); return this.status('Your video is loading…', 'waiting'); }
    if (!Number.isFinite(v.duration)) { this.pause(); return this.status('Live streams cannot be synchronized. Choose an on-demand stream.', 'mismatch'); }
    if (s.duration && Math.abs(s.duration - v.duration) > 3) { this.pause(); return this.status(compareMedia(s, this.snapshot()).text, 'mismatch', s.key); }
    this.baseRate = s.rate;
    const target = Math.min(Math.max(0, v.duration - .05), targetTime(s, this.now() - this.received, this.room.rtt));
    if (s.paused || s.buffering) this.pause();
    const seekable = [...Array(v.seekable.length)].some((_, i) => target >= v.seekable.start(i) && target <= v.seekable.end(i));
    if (!seekable) { this.unseekable = true; this.pause(); return this.status('Waiting for your stream to become seekable…', 'waiting'); }
    const drift = target - v.currentTime;
    if (!v.seeking && (force || Math.abs(drift) > 1.25 || ((s.paused || s.buffering) && Math.abs(drift) > .2))) this.seek(target);
    this.rate(!s.paused && !s.buffering && Math.abs(drift) > .2 && Math.abs(drift) <= 1.25 ? Math.min(4, Math.max(.25, s.rate * (drift > 0 ? 1.035 : .965))) : s.rate);
    if (force) this.blocked = false;
    if (!s.paused && !s.buffering) this.play(force);
    const selfLoading = v.readyState < 3 || v.seeking;
    this.status(this.blocked ? 'Tap Sync now to allow playback.' : s.buffering ? s.roomStatus || 'Room paused while a stream buffers…' : selfLoading ? 'Your stream is buffering. You will catch up when it recovers.' : s.paused ? 'In sync · room paused' : 'In sync · watching together', this.blocked ? 'blocked' : s.buffering || selfLoading ? 'waiting' : 'synced');
  }
  tick() {
    if (this.closed) return;
    this.find();
    const key = this.video ? this.key() : '';
    if (key !== this.currentKey) {
      if (this.currentKey) this.desiredPaused = true;
      this.currentKey = key; this.gate = new BufferGate();
    }
    if (!this.room.host) { this.apply(); this.report(); return; }
    const v = this.video, local = this.snapshot(), now = this.now();
    // Recompute mismatches at the authority, including after the host changes titles.
    const reports = new Map([...this.room.reports].map(([id, r]) => [id, { ...r, status: r.key !== key || (r.duration && local.duration && Math.abs(r.duration - local.duration) > 3) ? 'mismatch' : r.status }]));
    const { waiting, skipped, remaining } = this.gate.update(reports, key, this.room.policy.wait, now, 20000, 2000);
    this.waitingGuests = waiting.length > 0;
    const ownBuffer = !!v && ['loading','seeking','error','blocked','mismatch'].includes(local.status);
    const buffering = ownBuffer || waiting.length > 0;
    if (v) { this.rate(this.baseRate); if (this.desiredPaused || buffering || !key) this.pause(); else this.play(); }
    const names = ids => ids.map(id => id === this.room.id ? this.room.name || 'the host' : this.room.members.get(id)?.name || 'a friend').join(', ');
    const roomStatus = waiting.length ? `Waiting for ${names(waiting)} · ${remaining}s remaining` : ownBuffer ? `Waiting for ${names([this.room.id])} · ${local.status === 'error' ? 'stream failed' : local.status === 'blocked' ? 'allow playback' : 'stream loading'}` : skipped.length ? `Continuing without ${names(skipped)}. They will catch up.` : '';
    this.room.publish({ time: local.time, paused: !v || this.desiredPaused, buffering, rate: this.baseRate, key, duration: local.duration, seq: ++this.seq, media: local.media, roomStatus: roomStatus.slice(0, 4000), startWaiting: false });
    this.room.publishReports(local, now);
    this.status(!key ? 'Open a video. Your friends can join now.' : this.blocked ? 'Tap Sync now to allow playback.' : roomStatus || (this.desiredPaused ? 'Room paused. Press Play room when ready.' : 'In sync · watching together'), !key || buffering ? 'waiting' : 'synced');
  }
  continueWithoutWaiting() {
    this.gate.skip(); this.tick();
  }
  close() { this.closed = true; clearInterval(this.timer); this.catalog.close(); this.detach(); }
}
