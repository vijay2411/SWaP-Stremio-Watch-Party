export const VERSION = 4;
const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
export function makeCode() {
  // Rejection sampling avoids modulo bias. 12 symbols provide ~59 bits of entropy.
  let result = '';
  while (result.length < 12) {
    for (const n of crypto.getRandomValues(new Uint8Array(20))) {
      if (n < Math.floor(256 / ALPHABET.length) * ALPHABET.length) result += ALPHABET[n % ALPHABET.length];
      if (result.length === 12) break;
    }
  }
  return result;
}
export function normalizeCode(value) {
  const code = String(value).toUpperCase().replace(/[\s-]/g, '');
  return /^[A-HJ-NP-Z2-9]{12}$/.test(code) ? code : null;
}
export const formatCode = code => code.match(/.{1,4}/g)?.join('-') || '';
export const cleanName = name => typeof name === 'string' ? name.replace(/[\x00-\x1F\x7F]/g, '').trim().slice(0, 28) || 'Friend' : 'Friend';
export const validState = s => !!s && Number.isFinite(s.time) && s.time >= 0 && s.time < 1e7 &&
  typeof s.paused === 'boolean' && typeof s.buffering === 'boolean' && Number.isFinite(s.rate) && s.rate >= .25 && s.rate <= 4 &&
  typeof s.key === 'string' && s.key.length <= 512 && Number.isSafeInteger(s.seq) && s.seq >= 0 &&
  (s.duration === undefined || validDuration(s.duration)) &&
  (s.media === undefined || validMedia(s.media)) &&
  (s.roomStatus === undefined || (typeof s.roomStatus === 'string' && s.roomStatus.length <= 4000)) &&
  (s.startWaiting === undefined || typeof s.startWaiting === 'boolean');
export const validDuration = n => Number.isFinite(n) && n >= 0 && n < 1e7;
export const validMedia = m => !!m && typeof m === 'object' && !Array.isArray(m) &&
  Object.keys(m).every(k => ['title','episode','source','release','fingerprint','fingerprintKind','description'].includes(k)) &&
  ['title','episode','source','release','description'].every(k => m[k] === undefined || (typeof m[k] === 'string' && m[k].length <= (k === 'description' ? 320 : 200))) &&
  (m.fingerprint === undefined || m.fingerprint === '' || (typeof m.fingerprint === 'string' && /^[a-f0-9]{64}$/.test(m.fingerprint))) &&
  (m.fingerprintKind === undefined || ['', 'torrent', 'reported'].includes(m.fingerprintKind));
export const validPolicy = p => !!p && ['host', 'everyone'].includes(p.controls) && typeof p.wait === 'boolean' &&
  (p.waitLimit === undefined || [0, 15, 30, 60].includes(p.waitLimit)) &&
  (p.startTogether === undefined || typeof p.startTogether === 'boolean');
// Read legacy v3 policy fields for compatibility, but only expose the two current options.
export const policyValues = p => ({ controls: p.controls, wait: p.wait });
export const validReport = r => !!r && typeof r.key === 'string' && r.key.length <= 512 &&
  ['ready', 'loading', 'seeking', 'blocked', 'error', 'mismatch', 'absent', 'ended'].includes(r.status) &&
  validDuration(r.duration) && (r.time === undefined || validDuration(r.time)) &&
  (r.ready === undefined || typeof r.ready === 'boolean') && (r.media === undefined || validMedia(r.media));
export const validCommand = c => !!c && typeof c.key === 'string' && c.key.length > 0 && c.key.length <= 512 &&
  (['play', 'pause'].includes(c.action) || (c.action === 'seek' && Number.isFinite(c.value) && c.value >= 0 && c.value < 1e7) ||
   (c.action === 'rate' && Number.isFinite(c.value) && c.value >= .25 && c.value <= 4));
export function targetTime(state, elapsedMs, rttMs = 0) {
  return state.time + (state.paused || state.buffering ? 0 : Math.min(10, Math.max(0, elapsedMs + rttMs / 2) / 1000) * state.rate);
}
export function mediaKey(hash) {
  // Stremio player routes include an encoded stream URL. Never send that URL,
  // since it can contain private debrid credentials. Only share type + video ID.
  const parts = hash.split('?')[0].replace(/^#\/?/, '').split('/');
  if (parts[0] !== 'player' || parts.length < 3) return '';
  try {
    const type = decodeURIComponent(parts[4] || '');
    const id = decodeURIComponent(parts[5] || '');
    const videoId = decodeURIComponent(parts[6] || parts[5] || '');
    return /^[a-zA-Z0-9_-]{1,40}$/.test(type) && [id, videoId].every(v => /^[a-zA-Z0-9:._-]{1,160}$/.test(v)) ? `${type}/${id}/${videoId}` : '';
  } catch { return ''; }
}
export function detailUrl(key) {
  const [type, id, videoId, extra] = String(key).split('/');
  if (extra || !/^[a-zA-Z0-9_-]{1,40}$/.test(type) || ![id, videoId].every(v => /^[a-zA-Z0-9:._-]{1,160}$/.test(v))) return null;
  return `https://web.stremio.com/#/detail/${encodeURIComponent(type)}/${encodeURIComponent(id)}/${encodeURIComponent(videoId)}`;
}
export function parseOptions(raw) {
  if (!raw.trim()) return {};
  const input = JSON.parse(raw), out = {};
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw new Error('Use a JSON object.');
  for (const key of Object.keys(input)) if (!['host', 'port', 'path', 'secure', 'config'].includes(key)) throw new Error(`Unknown setting: ${key}`);
  if (input.host !== undefined) {
    if (typeof input.host !== 'string' || !/^[a-zA-Z0-9.-]+$/.test(input.host)) throw new Error('Host must be a hostname without https://.');
    out.host = input.host;
  }
  if (input.port !== undefined) {
    if (!Number.isInteger(input.port) || input.port < 1 || input.port > 65535) throw new Error('Invalid server port.');
    out.port = input.port;
  }
  if (input.path !== undefined) {
    if (typeof input.path !== 'string' || !/^\/[\w/-]*$/.test(input.path)) throw new Error('Invalid server path.');
    out.path = input.path;
  }
  if (input.secure !== undefined) {
    if (typeof input.secure !== 'boolean') throw new Error('secure must be true or false.');
    out.secure = input.secure;
  }
  if (input.config !== undefined) {
    const servers = input.config?.iceServers;
    if (!Array.isArray(servers) || servers.length > 12) throw new Error('config.iceServers must be an array of up to 12 servers.');
    out.config = { iceServers: servers.map(s => {
      const urls = Array.isArray(s.urls) ? s.urls : [s.urls];
      if (!urls.length || urls.some(u => typeof u !== 'string' || !/^(stun|stuns|turn|turns):[^\s]+$/.test(u))) throw new Error('Use stun:, stuns:, turn: or turns: URLs.');
      const entry = { urls };
      for (const k of ['username', 'credential']) if (s[k] !== undefined) {
        if (typeof s[k] !== 'string' || s[k].length > 1024) throw new Error(`Invalid ${k}.`);
        entry[k] = s[k];
      }
      return entry;
    }) };
  }
  return out;
}
