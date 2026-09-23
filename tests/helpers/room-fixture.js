import { EventEmitter } from 'node:events';
import { Room } from '../../src/room.js';
import { roomCredentials, randomToken } from '../../src/room-auth.js';

export class Connection extends EventEmitter {
  constructor(peer) { super(); this.peer = peer; this.open = false; this.frames = []; this.closedCount = 0; }
  send(raw) { this.frames.push(raw); queueMicrotask(() => { if (this.other?.open) this.other.emit('data', raw); }); }
  close() { if (this.ended) return; this.ended = true; this.open = false; this.closedCount++; this.emit('close'); this.other?.close(); }
}
export const settle = () => new Promise(resolve => setTimeout(resolve, 10));
export async function roomPair({ hostCode = 'AAAAAAAAAAAA', guestCode = hostCode, guestId = 'guest', hostEmit = () => {}, guestEmit = () => {} } = {}) {
  const host = new Room(hostEmit), guest = new Room(guestEmit);
  const hostAuth = await roomCredentials(hostCode), guestAuth = await roomCredentials(guestCode);
  Object.assign(host, { host: true, active: true, id: hostAuth.hostId, hostId: hostAuth.hostId, authKey: hostAuth.key, name: 'Host', callToken: randomToken() });
  Object.assign(guest, { host: false, id: guestId, hostId: host.id, authKey: guestAuth.key, name: 'Guest', callToken: randomToken() });
  host.members.set(host.id, { id: host.id, name: 'Host', host: true, call: false, callToken: host.callToken });
  const down = new Connection(guestId), up = new Connection(host.id); down.other = up; up.other = down; guest.upstream = up;
  host.bind(down, true); guest.bind(up, false); down.open = up.open = true; down.emit('open'); up.emit('open');
  for (let n = 0; n < 100 && !guest.active && !guest.closed; n++) await settle();
  return { host, guest, down, up, close() { host.close(); guest.close(); } };
}
