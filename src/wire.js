const encoder = new TextEncoder();
export const MAX_FRAME_BYTES = 64 * 1024;
export function encodeFrame(message, limit = MAX_FRAME_BYTES) {
  const raw = JSON.stringify(message);
  if (raw.length > limit || encoder.encode(raw).byteLength > limit) throw new Error('Message too large');
  return raw;
}
export function decodeFrame(raw, limit = MAX_FRAME_BYTES) {
  // Raw PeerJS serialization lets us reject oversized/binary input BEFORE JSON parsing.
  if (typeof raw !== 'string' || raw.length > limit || encoder.encode(raw).byteLength > limit) throw new Error('Invalid frame');
  const message = JSON.parse(raw);
  if (!message || typeof message !== 'object' || Array.isArray(message) || typeof message.t !== 'string' || message.t.length > 24) throw new Error('Invalid message');
  return message;
}
