// Presentation-only inbox. Every visible preview gets its own five-second timer;
// queued arrivals are staggered two seconds apart without resetting expiry.
export const PREVIEW_MS = 5000;
export const PREVIEW_GAP_MS = 2000;
export const MAX_PENDING_PREVIEWS = 50;
export class ChatPreviews {
  constructor(container, openChat, { setTimer = (callback, ms) => setTimeout(callback, ms), clearTimer = id => clearTimeout(id), now = () => performance.now(), actionLabel = 'Open room chat', clearOnActivate = true } = {}) {
    Object.assign(this, { container, openChat, setTimer, clearTimer, now, actionLabel, clearOnActivate });
    this.pending = []; this.active = new Map(); this.next = null; this.lastShown = -Infinity;
  }
  add(message, { open = false, own = false } = {}) {
    if (open || own || message.history || this.active.has(message.id) || this.pending.some(m => m.id === message.id)) return;
    this.pending.push(message);
    // Excess flood traffic stays in room chat; never grow an unbounded queue.
    if (this.pending.length > MAX_PENDING_PREVIEWS) this.pending.shift();
    this.flush();
  }
  flush() {
    if (!this.pending.length || this.active.size >= 3 || this.next) return;
    const delay = Math.max(0, this.lastShown + PREVIEW_GAP_MS - this.now());
    if (delay) {
      const next = { timer: null }; this.next = next;
      next.timer = this.setTimer(() => {
        if (this.next !== next) return;
        this.next = null; this.flush();
      }, delay);
      return;
    }
    const message = this.pending.shift(), doc = this.container.ownerDocument;
    const button = doc.createElement('button'); button.className = 'chat-preview'; button.type = 'button'; button.title = `${message.name}: ${message.text}\n${this.actionLabel}`;
    const name = doc.createElement('b'); name.textContent = message.name;
    const text = doc.createElement('span'); text.textContent = message.text;
    button.append(name, text); button.onclick = () => { if (this.clearOnActivate) this.clear(); else dismiss(); this.openChat(message); };
    const entry = { button, timer: null }; this.active.set(message.id, entry); this.container.append(button);
    this.lastShown = this.now();
    const dismiss = () => {
      // Ignore stale callbacks after opening chat, leaving or starting a room.
      if (this.active.get(message.id) !== entry) return;
      this.clearTimer(entry.timer); button.remove(); this.active.delete(message.id); this.flush();
    };
    entry.timer = this.setTimer(dismiss, PREVIEW_MS);
    this.flush();
  }
  clear() {
    this.pending.length = 0;
    if (this.next) this.clearTimer(this.next.timer);
    this.next = null; this.lastShown = -Infinity;
    for (const { button, timer } of this.active.values()) { this.clearTimer(timer); button.remove(); }
    this.active.clear();
  }
}
