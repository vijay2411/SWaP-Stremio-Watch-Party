export const DEFAULT_TALK_KEY = 'V';
export const validTalkKey = key => key === '' || (typeof key === 'string' && /^[A-Z]$/.test(key));
export function typingTarget(event) {
  return (event.composedPath?.() || [event.target]).some(el => el && (
    ['INPUT', 'TEXTAREA', 'SELECT'].includes(el.tagName) || el.isContentEditable ||
    ['textbox', 'searchbox', 'combobox'].includes(el.getAttribute?.('role'))
  ));
}

// Own keyboard and button holds together, so releasing either cannot leave a
// stale microphone state. Capture sees keyup even inside our isolated UI.
export class HoldToTalk {
  constructor(emit, { win = window, doc = document, blocked = () => false } = {}) {
    Object.assign(this, { emit, win, doc, blocked });
    this.key = DEFAULT_TALK_KEY; this.enabled = false; this.sources = new Set();
    this.down = e => {
      if (!this.enabled || !this.key) return;
      if (e.ctrlKey || e.metaKey || e.altKey || e.isComposing || e.keyCode === 229 || e.getModifierState?.('AltGraph')) { this.release(); return; }
      if (typingTarget(e) || this.doc.hidden || this.blocked()) { this.release(); return; }
      if (String(e.key).toUpperCase() !== this.key) return;
      // A key held while changing tabs must not unmute on automatic repeats.
      if (e.repeat && !this.heldCode) return;
      e.preventDefault(); e.stopImmediatePropagation();
      this.heldCode = e.code || this.key; this.hold('shortcut', true);
    };
    this.up = e => {
      if (!this.heldCode || (e.code || String(e.key).toUpperCase()) !== this.heldCode) return;
      e.preventDefault(); e.stopImmediatePropagation();
      this.heldCode = null; this.hold('shortcut', false);
    };
    this.release = () => { this.heldCode = null; this.sources.clear(); this.emit(false); };
    this.visibility = () => { if (doc.hidden) this.release(); };
    this.focus = e => { if (typingTarget(e)) this.release(); };
    win.addEventListener('keydown', this.down, true); win.addEventListener('keyup', this.up, true);
    win.addEventListener('blur', this.release); win.addEventListener('pagehide', this.release);
    doc.addEventListener('visibilitychange', this.visibility); doc.addEventListener('focusin', this.focus, true);
  }
  setKey(key) { if (!validTalkKey(key)) return false; this.release(); this.key = key; return true; }
  setEnabled(enabled) { this.release(); this.enabled = enabled; }
  hold(source, active) {
    if (!this.enabled) return;
    if (active && !this.doc.hidden && !this.blocked()) this.sources.add(source); else this.sources.delete(source);
    this.emit(this.sources.size > 0);
  }
  close() {
    this.setEnabled(false);
    this.win.removeEventListener('keydown', this.down, true); this.win.removeEventListener('keyup', this.up, true);
    this.win.removeEventListener('blur', this.release); this.win.removeEventListener('pagehide', this.release);
    this.doc.removeEventListener('visibilitychange', this.visibility); this.doc.removeEventListener('focusin', this.focus, true);
  }
}
