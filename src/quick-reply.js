const SEND_ERROR = 'Message not sent. Wait a moment and try again.';

// One draft shared by the sidebar and folded composer. No playback/call changes.
export class QuickReply {
  constructor(root, send, sidebarNotice) {
    const $ = id => root.getElementById(id);
    Object.assign(this, { send, sidebarNotice, available: false, composing: new Set() });
    this.box = $('quick-reply'); this.toggle = $('quick-toggle'); this.context = $('quick-context'); this.status = $('quick-status');
    this.input = $('quick-input'); this.sidebar = $('chat-input');
    for (const input of [this.input, this.sidebar]) {
      input.addEventListener('input', () => { this.setDraft(input.value); this.feedback(''); });
      input.addEventListener('compositionstart', () => this.composing.add(input));
      input.addEventListener('compositionend', () => this.composing.delete(input));
      input.addEventListener('blur', () => this.composing.delete(input));
      input.addEventListener('keydown', e => {
        if (e.key === 'Enter' && (e.isComposing || e.keyCode === 229 || this.composing.has(input) || e.repeat)) e.preventDefault();
      });
    }
    $('quick-form').onsubmit = e => { e.preventDefault(); if (this.available && this.isOpen) this.submit(this.input); };
    $('chat-form').onsubmit = e => { e.preventDefault(); this.submit(this.sidebar); };
    this.toggle.onclick = () => this.isOpen ? this.close(true) : this.open();
    $('quick-close').onclick = () => this.close(true);
  }
  get isOpen() { return !this.box.hidden; }
  setAvailable(available) {
    this.available = available; this.toggle.hidden = !available || this.isOpen;
    if (!available) this.close();
  }
  setDraft(value) {
    for (const input of [this.input, this.sidebar]) if (input.value !== value) input.value = value;
  }
  feedback(text, error = false) {
    this.status.textContent = error ? 'Not sent' : text; this.status.hidden = !text; this.status.dataset.error = String(error);
    this.status.title = text; this.status.setAttribute('aria-label', text); this.input.setAttribute('aria-invalid', String(error));
  }
  open(message) {
    if (!this.available) return;
    if (message) { this.context.textContent = `${message.name}: ${message.text}`; this.context.hidden = false; this.box.title = this.context.textContent; this.feedback(''); }
    this.box.hidden = false; this.toggle.hidden = true; this.toggle.setAttribute('aria-expanded', 'true'); this.input.focus();
  }
  close(focus = false) {
    this.box.hidden = true; this.toggle.hidden = !this.available; this.toggle.setAttribute('aria-expanded', 'false');
    this.context.textContent = ''; this.context.hidden = true; this.box.title = ''; this.feedback('');
    if (focus && this.available) this.toggle.focus();
  }
  submit(input) {
    if (this.composing.has(input)) return;
    const draft = input.value, text = draft.trim();
    if (!text) return;
    let sent = false;
    try { sent = this.send(text); } catch { /* Preserve the draft if transport fails. */ }
    if (sent) {
      this.sidebarNotice('', SEND_ERROR);
      this.setDraft(''); this.context.textContent = ''; this.context.hidden = true; this.box.title = '';
      if (input === this.input) this.feedback('Sent');
    } else {
      this.setDraft(draft);
      const error = SEND_ERROR;
      if (input === this.input) this.feedback(error, true); else this.sidebarNotice(error);
    }
    input.focus();
  }
  reset() { this.close(); this.setDraft(''); this.composing.clear(); this.setAvailable(false); }
}
