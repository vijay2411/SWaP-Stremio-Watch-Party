import { mediaKey } from './protocol.js';

// Stream routes can contain account tokens. Only these display fields and
// room-salted identifiers leave this module; URLs/headers are never forwarded.
export function displayText(value, max = 180) {
  if (typeof value !== 'string') return '';
  return value.split(/\r?\n/).filter(line => !/(?:https?:|magnet:|www\.|bearer\s|api[_ -]?key|access[_ -]?token|password|authorization|[a-z0-9_-]{40,})/i.test(line))
    .join(' · ').replace(/[\x00-\x1f\x7f\u202a-\u202e\u2066-\u2069]/g, '').trim().slice(0, max);
}
export function clockTime(seconds) {
  if (!Number.isFinite(seconds) || seconds < 0) return '—';
  const n = Math.floor(seconds), h = Math.floor(n / 3600), m = Math.floor(n / 60) % 60, s = n % 60;
  return h ? `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}` : `${m}:${String(s).padStart(2, '0')}`;
}
export async function decodeStream(segment) {
  if (typeof segment !== 'string' || segment.length > 48000) return null;
  try {
    const raw = decodeURIComponent(segment);
    if (raw.startsWith('{')) return JSON.parse(raw);
    // Stremio core encodes player streams as base64(zlib(JSON)).
    const binary = atob(raw.replace(/-/g, '+').replace(/_/g, '/'));
    const reader = new Blob([Uint8Array.from(binary, c => c.charCodeAt(0))]).stream().pipeThrough(new DecompressionStream('deflate')).getReader();
    const chunks = []; let size = 0;
    try { for (;;) { const { value, done } = await reader.read(); if (done) break; size += value.length; if (size > 64000) throw new Error('Too large'); chunks.push(value); } }
    finally { await reader.cancel().catch(() => {}); }
    const bytes = new Uint8Array(size); let at = 0; for (const c of chunks) { bytes.set(c, at); at += c.length; }
    return JSON.parse(new TextDecoder().decode(bytes));
  } catch { return null; }
}
export async function streamInfo(stream, salt) {
  if (!stream || typeof stream !== 'object' || Array.isArray(stream)) return { source: '', release: '', fingerprint: '', fingerprintKind: '' };
  const source = displayText(stream.name, 80), release = displayText(stream.behaviorHints?.filename || stream.title || stream.description);
  let identity = '', fingerprintKind = '';
  if (/^[a-f0-9]{40,64}$/i.test(stream.infoHash || '') && Number.isSafeInteger(stream.fileIdx) && stream.fileIdx >= 0) {
    identity = `${stream.infoHash.toLowerCase()}/${stream.fileIdx}`; fingerprintKind = 'torrent';
  } else if (/^[a-f0-9]{16}$/i.test(stream.behaviorHints?.videoHash || '') && Number.isSafeInteger(stream.behaviorHints?.videoSize) && stream.behaviorHints.videoSize > 0) {
    identity = `${stream.behaviorHints.videoHash.toLowerCase()}/${stream.behaviorHints.videoSize}`; fingerprintKind = 'reported';
  }
  const fingerprint = identity ? Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(`${salt}|${fingerprintKind}|${identity}`))), n => n.toString(16).padStart(2, '0')).join('') : '';
  return { source, release, fingerprint, fingerprintKind };
}
export function compareMedia(host, local) {
  if (!host?.key || !local?.key) return { kind: 'unknown', text: 'Choose a stream to compare playback.' };
  if (host.key !== local.key) return { kind: 'mismatch', text: 'Different movie or episode. Open the host’s title.' };
  if (host.duration && local.duration && Math.abs(host.duration - local.duration) > 3) return { kind: 'mismatch', text: `Possible different edition: yours ${clockTime(local.duration)}, host ${clockTime(host.duration)} (${clockTime(Math.abs(host.duration - local.duration))} ${local.duration > host.duration ? 'longer' : 'shorter'}). Choose a matching edition.` };
  const h = host.media || {}, l = local.media || {};
  if (h.fingerprint && l.fingerprint && h.fingerprintKind === l.fingerprintKind) return h.fingerprint === l.fingerprint
    ? { kind: 'match', text: h.fingerprintKind === 'torrent' ? 'Same reported torrent file.' : 'Same reported file hash and size; content is not independently verified.' }
    : { kind: 'warning', text: 'Different reported files. They may be different encodes of the same edition; check the scene.' };
  if (h.release && l.release && h.release !== l.release) return { kind: 'warning', text: 'Different release labels. Check that both show the same edition and scene.' };
  if (h.source && l.source && h.source !== l.source) return { kind: 'warning', text: 'Different stream sources. Matching movie lengths do not guarantee the same cut.' };
  if (h.source && l.source) return { kind: 'match', text: 'Title, duration and source labels match. File identity is unavailable.' };
  return { kind: 'unknown', text: host.duration && local.duration ? 'Title and duration match. Stream identity is unavailable.' : 'Waiting for video duration and stream details.' };
}

export class MediaCatalog {
  constructor(salt, { navigator: nav = globalThis.navigator, fetch: fetcher = globalThis.fetch, document: doc = globalThis.document, remote = true } = {}) {
    this.salt = salt; this.nav = nav; this.doc = doc; this.fetcher = fetcher ? (...args) => fetcher.call(globalThis, ...args) : null; this.remote = remote; this.generation = 0; this.data = {};
  }
  read(hash) {
    const key = mediaKey(hash);
    if (hash !== this.hash) {
      this.hash = hash; this.controller?.abort(); this.generation++; this.resolvedTitle = false;
      this.data = { title: '', episode: '', source: '', release: '', fingerprint: '', fingerprintKind: '', description: '' };
      if (key) this.load(hash, key, this.generation);
    }
    if (key && !this.resolvedTitle) {
      const title = displayText(this.doc?.querySelector?.('[class*="nav-bar-layer"] [class*="title"]')?.textContent) || displayText(this.nav?.mediaSession?.metadata?.title);
      if (title) this.data.title = title;
    }
    return { ...this.data };
  }
  async load(hash, key, generation) {
    const [type, id, videoId] = key.split('/'), current = () => generation === this.generation;
    const episode = videoId.match(/:(\d+):(\d+)$/);
    this.data.episode = episode ? `Season ${episode[1]} · Episode ${episode[2]}` : '';
    this.data.title = displayText(this.nav?.mediaSession?.metadata?.title) || id;
    const stream = await decodeStream(hash.replace(/^#\/?/, '').split('/')[1]);
    const info = await streamInfo(stream, this.salt).catch(() => ({}));
    if (!current()) return; Object.assign(this.data, info);
    // Public title lookup only; never contact configured addon URLs or stream URLs.
    if (!this.remote || !/^(movie|series)$/.test(type) || !/^tt\d+$/.test(id) || !this.fetcher) return;
    const controller = this.controller = new AbortController(), timeout = setTimeout(() => controller.abort(), 8000);
    try {
      const response = await this.fetcher(`https://v3-cinemeta.strem.io/meta/${type}/${id}.json`, { signal: controller.signal, credentials: 'omit', referrerPolicy: 'no-referrer' });
      if (!response.ok) return;
      const { meta } = await response.json();
      if (!current() || !meta || meta.id !== id) return;
      this.data.title = displayText(meta.name) || this.data.title; this.resolvedTitle = !!displayText(meta.name);
      this.data.description = displayText(meta.description, 320);
      const year = displayText(meta.releaseInfo, 20); if (year) this.data.title = `${this.data.title} (${year})`.slice(0, 200);
    } catch { /* Metadata is optional; playback never depends on it. */ }
    finally { clearTimeout(timeout); }
  }
  close() { this.generation++; this.controller?.abort(); }
}
