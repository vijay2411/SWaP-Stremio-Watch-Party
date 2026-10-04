const STORAGE_KEY = 'swap-folded-position';
const MARGIN = 12, GAP = 8, DRAG_THRESHOLD = 6;
const clamp = (value, low, high) => Math.max(low, Math.min(value, Math.max(low, high)));

// Only the folded controls move. Room, playback and call layout are independent.
export class FoldedPosition {
  constructor(bar, previews, { win = window, doc = document } = {}) {
    Object.assign(this, { bar, previews, win, doc });
    try {
      this.storage = win.sessionStorage;
      const value = JSON.parse(this.storage.getItem(STORAGE_KEY));
      if (value && Number.isFinite(value.x) && Number.isFinite(value.y)) this.position = { x: clamp(value.x, 0, 1), y: clamp(value.y, 0, 1) };
    } catch { /* Position is optional when storage is blocked or malformed. */ }
    this.down = e => {
      const handle = e.target.closest?.('#launcher, #quick-toggle');
      if (!handle || e.button !== 0 || e.isPrimary === false) return;
      this.suppressClick = false;
      const rect = bar.getBoundingClientRect();
      this.drag = { id: e.pointerId, handle, x: e.clientX, y: e.clientY, left: rect.left, top: rect.top, moved: false };
      e.stopPropagation();
    };
    this.move = e => {
      const drag = this.drag; if (!drag || drag.id !== e.pointerId) return;
      const dx = e.clientX - drag.x, dy = e.clientY - drag.y;
      if (!drag.moved && Math.hypot(dx, dy) < DRAG_THRESHOLD) return;
      if (!drag.moved) {
        drag.moved = true; bar.dataset.dragging = 'true';
        try { drag.handle.setPointerCapture(e.pointerId); } catch { /* Window listeners still finish the drag. */ }
      }
      e.preventDefault(); e.stopPropagation();
      this.place(drag.left + dx, drag.top + dy);
    };
    this.up = e => { if (this.drag?.id === e.pointerId) this.finish(e.type === 'pointerup'); };
    this.blur = () => this.finish(false);
    this.click = e => {
      if (this.suppressClick && e.detail !== 0) { this.suppressClick = false; e.preventDefault(); e.stopImmediatePropagation(); }
    };
    this.key = e => {
      if (!e.target.matches?.('#launcher, #quick-toggle')) return;
      const steps = { ArrowLeft: [-16, 0], ArrowRight: [16, 0], ArrowUp: [0, -16], ArrowDown: [0, 16] };
      if (e.key === 'Home' && !e.altKey && !e.ctrlKey && !e.metaKey) {
        this.finish(false); this.position = null; this.save(); this.refresh();
      } else if (e.altKey && !e.ctrlKey && !e.metaKey && steps[e.key]) {
        const rect = bar.getBoundingClientRect(), [dx, dy] = steps[e.key];
        this.place(rect.left + dx, rect.top + dy); this.save();
      } else return;
      e.preventDefault(); e.stopPropagation();
    };
    this.refresh = () => { if (!this.frame) this.frame = win.requestAnimationFrame(() => { this.frame = null; this.update(); }); };
    bar.addEventListener('pointerdown', this.down);
    bar.addEventListener('click', this.click, true);
    bar.addEventListener('keydown', this.key);
    bar.addEventListener('lostpointercapture', this.up);
    win.addEventListener('pointermove', this.move, { passive: false });
    win.addEventListener('pointerup', this.up);
    win.addEventListener('pointercancel', this.up);
    win.addEventListener('blur', this.blur);
    win.addEventListener('resize', this.refresh);
    win.visualViewport?.addEventListener('resize', this.refresh);
    win.visualViewport?.addEventListener('scroll', this.refresh);
    doc.addEventListener('fullscreenchange', this.refresh);
    if (win.ResizeObserver) {
      this.observer = new win.ResizeObserver(this.refresh);
      this.observer.observe(bar); this.observer.observe(previews);
    }
    this.refresh();
  }
  viewport() {
    const v = this.win.visualViewport;
    return { left: v?.offsetLeft || 0, top: v?.offsetTop || 0, width: v?.width || this.win.innerWidth, height: v?.height || this.win.innerHeight };
  }
  place(left, top) {
    const v = this.viewport(), r = this.bar.getBoundingClientRect();
    left = clamp(left, v.left + MARGIN, v.left + v.width - r.width - MARGIN);
    top = clamp(top, v.top + MARGIN, v.top + v.height - r.height - MARGIN);
    this.position = { x: (left + r.width / 2 - v.left) / v.width, y: (top + r.height / 2 - v.top) / v.height };
    this.update();
  }
  update() {
    const bar = this.bar;
    if (bar.hidden || !bar.getBoundingClientRect().width) { this.finish(false); return; }
    const v = this.viewport(), size = bar.getBoundingClientRect();
    if (this.position) {
      Object.assign(bar.style, {
        left: `${clamp(v.left + this.position.x * v.width - size.width / 2, v.left + MARGIN, v.left + v.width - size.width - MARGIN)}px`,
        top: `${clamp(v.top + this.position.y * v.height - size.height / 2, v.top + MARGIN, v.top + v.height - size.height - MARGIN)}px`,
        bottom: 'auto', transform: 'none'
      });
    } else for (const key of ['left', 'top', 'bottom', 'transform']) bar.style.removeProperty(key);
    const r = bar.getBoundingClientRect(), width = this.previews.getBoundingClientRect().width;
    const above = r.top - v.top - MARGIN - GAP, below = v.top + v.height - r.bottom - MARGIN - GAP;
    const putAbove = above >= Math.min(120, v.height / 2) || above >= below;
    Object.assign(this.previews.style, {
      left: `${clamp(r.left + r.width / 2 - width / 2, v.left + MARGIN, v.left + v.width - width - MARGIN)}px`,
      top: `${putAbove ? r.top - GAP : r.bottom + GAP}px`, bottom: 'auto',
      transform: putAbove ? 'translateY(-100%)' : 'none', maxHeight: `${Math.max(0, putAbove ? above : below)}px`
    });
  }
  finish(clickFollows) {
    const drag = this.drag; if (!drag) return;
    this.drag = null; delete this.bar.dataset.dragging;
    if (drag.moved) { this.suppressClick = clickFollows; this.save(); }
    try { if (drag.handle.hasPointerCapture(drag.id)) drag.handle.releasePointerCapture(drag.id); } catch { /* Detached during hide/fullscreen. */ }
  }
  save() {
    try { if (this.position) this.storage?.setItem(STORAGE_KEY, JSON.stringify(this.position)); else this.storage?.removeItem(STORAGE_KEY); } catch { /* Dragging still works without storage. */ }
  }
}
