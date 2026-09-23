import { VERSION, cleanName } from './protocol.js';

const encoder = new TextEncoder();
const hex = bytes => Array.from(bytes, n => n.toString(16).padStart(2, '0')).join('');
export const validToken = value => typeof value === 'string' && /^[a-f0-9]{64}$/.test(value);
export const randomToken = () => hex(crypto.getRandomValues(new Uint8Array(32)));

// The discovery address is deliberately separate from the admission secret.
// WebCrypto supplies SHA-256/HMAC; the room code never goes into signaling metadata.
export async function roomCredentials(code) {
  const address = await crypto.subtle.digest('SHA-256', encoder.encode(`SWaP/${VERSION}/address/${code}`));
  const key = await crypto.subtle.importKey('raw', encoder.encode(`SWaP/${VERSION}/admission/${code}`), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign', 'verify']);
  return { hostId: `swap-v${VERSION}-${hex(new Uint8Array(address))}`, key };
}

export class RoomHandshake {
  constructor({ incoming, key, hostId, guestId, name, callToken, send, accept, reject }) {
    Object.assign(this, { incoming, key, hostId, guestId, name, callToken, send, accept, reject });
    this.phase = incoming ? 'hello' : 'challenge';
  }
  start() {
    if (this.incoming) return;
    this.guestNonce = randomToken();
    this.name = cleanName(this.name);
    this.send({ t: 'authHello', v: VERSION, nonce: this.guestNonce, name: this.name, callToken: this.callToken });
  }
  transcript(role) {
    return encoder.encode(JSON.stringify(['SWaP', VERSION, role, this.hostId, this.guestId, this.guestNonce, this.hostNonce, this.name, this.callToken]));
  }
  async sign(role) { return hex(new Uint8Array(await crypto.subtle.sign('HMAC', this.key, this.transcript(role)))); }
  async verify(role, proof) {
    return validToken(proof) && crypto.subtle.verify('HMAC', this.key, Uint8Array.from(proof.match(/../g), byte => parseInt(byte, 16)), this.transcript(role));
  }
  async receive(msg) {
    try {
      if (this.incoming && this.phase === 'hello' && msg.t === 'authHello' && msg.v === VERSION && validToken(msg.nonce) && validToken(msg.callToken) && typeof msg.name === 'string' && msg.name.length <= 28) {
        this.phase = 'working'; this.guestNonce = msg.nonce; this.hostNonce = randomToken(); this.name = cleanName(msg.name); this.callToken = msg.callToken;
        const proof = await this.sign('host');
        if (this.phase === 'closed') return;
        this.phase = 'proof'; this.send({ t: 'authChallenge', nonce: this.hostNonce, proof }); return;
      }
      if (!this.incoming && this.phase === 'challenge' && msg.t === 'authChallenge' && validToken(msg.nonce)) {
        this.phase = 'working'; this.hostNonce = msg.nonce;
        if (!await this.verify('host', msg.proof)) { this.close(); return; }
        const proof = await this.sign('guest');
        if (this.phase === 'closed') return;
        this.phase = 'done'; this.send({ t: 'authProof', proof }); this.accept(); return;
      }
      if (this.incoming && this.phase === 'proof' && msg.t === 'authProof') {
        this.phase = 'working';
        if (!await this.verify('guest', msg.proof)) { this.close(); return; }
        if (this.phase === 'closed') return;
        this.phase = 'done'; this.accept({ name: this.name, callToken: this.callToken }); return;
      }
      this.close();
    } catch { this.close(); }
  }
  close() { if (this.phase === 'closed') return; this.phase = 'closed'; this.key = null; this.reject(); }
}
