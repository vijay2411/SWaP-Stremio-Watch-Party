import test from 'node:test';
import assert from 'node:assert/strict';
import { makeCode, normalizeCode, formatCode, targetTime, validState, mediaKey, detailUrl, parseOptions } from '../src/protocol.js';
import { Room } from '../src/room.js';
const state = { time: 30, paused: false, buffering: false, rate: 1, seq: 1, key: 'movie/tt123/tt123' };
test('room codes round-trip with case, spaces, and separators', () => {
  const codes = new Set();
  for (let i = 0; i < 1000; i++) { const c = makeCode(); codes.add(c); assert.equal(normalizeCode(formatCode(c).toLowerCase()), c); }
  assert.equal(codes.size, 1000);
  for (const s of ['hello', 'AAAAAAAAAAA0', 'AAAA-AAAA-AAAA<script>', '']) assert.equal(normalizeCode(s), null);
});
test('clock-independent target compensates for RTT, pauses and buffering', () => {
  assert.equal(targetTime(state, 1000, 200), 31.1);
  assert.equal(targetTime({ ...state, paused: true }, 1000, 200), 30);
  assert.equal(targetTime({ ...state, buffering: true }, 1000, 200), 30);
  assert.equal(targetTime({ ...state, rate: 2 }, 1000, 0), 32);
  assert.equal(targetTime(state, 999999), 40);
});
test('reject malformed playback updates', () => {
  assert.ok(validState(state));
  for (const patch of [{ time: NaN }, { time: -1 }, { time: Infinity }, { rate: 9 }, { paused: 'yes' }, { buffering: null }, { key: 'a'.repeat(600) }, { seq: 1.2 }]) assert.equal(validState({ ...state, ...patch }), false);
});
test('Stremio routes reveal only media identifiers, never credentials or stream URLs', () => {
  const hash = '#/player/' + encodeURIComponent(JSON.stringify({ url: 'https://secret.example/TOKEN/movie.mp4' })) + '/' + encodeURIComponent('https://addons.example/APIKEY/manifest.json') + '/meta/series/tt123/tt123%3A2%3A3';
  assert.equal(mediaKey(hash), 'series/tt123/tt123:2:3');
  assert.equal(detailUrl(mediaKey(hash)), 'https://web.stremio.com/#/detail/series/tt123/tt123%3A2%3A3');
  for (const h of ['#/discover', '#/player/secret-stream', '#/player/x/y/z/movie/%E0%/x', '#/player/x/y/z/movie/https%3A%2F%2Fprivate/x']) assert.equal(mediaKey(h), '');
  assert.equal(detailUrl('javascript:alert(1)'), null);
});
test('advanced settings are allowlisted and validated', () => {
  assert.deepEqual(parseOptions(''), {});
  assert.deepEqual(parseOptions('{"config":{"iceServers":[{"urls":"turn:relay.example:3478","username":"u","credential":"p"}]}}').config.iceServers[0].urls, ['turn:relay.example:3478']);
  for (const s of ['[]', 'null', '{"debug":3}', '{"secure":"false"}', '{"host":"https://foo"}', '{"port":0}', '{"config":{"iceServers":[{"urls":"https://bad"}]}}']) assert.throws(() => parseOptions(s));
});
test('host rejects guest playback and stamps chat identity from its connection', () => {
  const events = [], room = new Room((...e) => events.push(e));
  room.members.set('guest-1', { id: 'guest-1', name: 'Actual guest' });
  const conn = { peer: 'guest-1' }; room.links.set(conn.peer, conn);
  room.fromGuest(conn, { t: 'state', state }); assert.equal(room.state, undefined);
  room.fromGuest(conn, { t: 'chat', text: '<img onerror=alert(1)>', name: 'Host', author: 'host' });
  const m = events[0][1]; assert.equal(m.name, 'Actual guest'); assert.equal(m.author, 'guest-1'); assert.equal(m.text, '<img onerror=alert(1)>');
  for (let i = 0; i < 150; i++) room.acceptChat('guest-1', 'x'.repeat(2000));
  assert.equal(room.history.length, 100); assert.equal(room.history[0].text.length, 1000);
});
test('room cleanup is idempotent and closes transport', () => {
  const room = new Room(() => {}); let destroyed = 0; room.peer = { destroy: () => destroyed++ };
  room.close(); room.close(); assert.equal(destroyed, 1); assert.equal(room.active, false);
});
