export class ChatScroll {
  constructor(area, content, jump, outer) {
    Object.assign(this, { area, content, jump, outer }); this.follow = true;
    this.scrolled = () => {
      if (this.pending || !area.clientHeight) return;
      this.follow = area.scrollHeight - area.scrollTop - area.clientHeight < 50 && outer.scrollHeight - outer.scrollTop - outer.clientHeight < 50;
      if (this.follow) jump.hidden = true;
    };
    area.addEventListener('scroll', this.scrolled);
    outer.addEventListener('scroll', this.scrolled);
    jump.onclick = () => this.bottom();
    this.observer = new ResizeObserver(() => { if (this.follow) this.schedule(); });
    this.observer.observe(area); this.observer.observe(content);
  }
  added(own = false) {
    if (this.follow || own) this.bottom(); else this.jump.hidden = false;
  }
  bottom() { this.follow = true; this.jump.hidden = true; this.schedule(); }
  schedule() {
    if (this.pending) return; this.pending = true;
    requestAnimationFrame(() => {
      if (this.follow && this.area.clientHeight && this.content.querySelector('.message')) {
        this.area.scrollTop = this.area.scrollHeight;
        // The session itself may scroll on shorter displays.
        this.outer.scrollTop = this.outer.scrollHeight;
      }
      requestAnimationFrame(() => { this.pending = false; });
    });
  }
  reset() { this.follow = true; this.jump.hidden = true; }
}
