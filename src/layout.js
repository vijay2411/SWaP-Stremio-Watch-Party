// Reserve space on the player container so its controls resize with the movie.
// A temporary attribute + stylesheet avoids overwriting Stremio's inline styles.
export function chooseStage(video, { body, fullscreenElement, host, width, height }) {
  const candidates = [];
  for (let p = video.parentElement; p && p !== body; p = p.parentElement) {
    if (p === fullscreenElement || p.contains(host)) break;
    // Stremio's video, subtitle, navigation and playback controls are sibling
    // layers under this shell. Resizing the video layer alone splits them apart.
    if ([...p.classList].some(name => name.includes('player-container'))) return p;
    const r = p.getBoundingClientRect();
    if (!['MAIN', 'HTML'].includes(p.tagName) && !p.querySelector('h1, nav') && r.width >= width * .7 && r.height >= height * .7) candidates.push(p);
  }
  return candidates[0] || video;
}
export function viewSpace(active, open, call, width, height) {
  const strip = !!(active && !open && call), sidebar = !!(open && width >= 800), drawer = !!(open && !sidebar);
  return { strip, sidebar, drawer, top: strip ? (width < 600 ? 148 : 112) : 0, right: sidebar ? 370 : 0, bottom: drawer ? Math.min(480, Math.round(height * .55)) : 0 };
}
export class WatchLayout {
  constructor(host, root) {
    this.host = host; this.root = root;
    this.style = document.createElement('style'); document.head.append(this.style);
    this.refresh = () => this.update();
    window.addEventListener('resize', this.refresh);
    document.addEventListener('fullscreenchange', this.refresh);
    this.timer = setInterval(this.refresh, 1000);
  }
  set(active, open, call) { Object.assign(this, { active, open, call }); this.update(); }
  update() {
    const { strip, sidebar, drawer, top, right, bottom } = viewSpace(this.active, this.open, this.call, innerWidth, innerHeight);
    this.host.dataset.layout = sidebar ? 'sidebar' : drawer ? 'drawer' : strip ? 'strip' : 'closed';
    this.host.style.setProperty('--dock-height', `${bottom}px`);
    this.host.style.setProperty('--call-strip-height', `${top}px`);
    this.root.getElementById('compact').hidden = !strip;
    const section = this.root.getElementById('call-section');
    const destination = strip ? this.root.getElementById('compact-content') : this.root.getElementById('call-home');
    if (section.parentNode !== destination) destination.append(section);
    const video = [...document.querySelectorAll('video')].filter(v => !v.srcObject).sort((a,b) => b.clientWidth*b.clientHeight-a.clientWidth*a.clientHeight)[0];
    let target = null;
    if ((sidebar || drawer || strip) && video) {
      target = this.video === video && this.target?.isConnected && this.target.contains(video) && this.fullscreen === document.fullscreenElement ? this.target :
        chooseStage(video, { body: document.body, fullscreenElement: document.fullscreenElement, host: this.host, width: innerWidth, height: innerHeight });
    }
    this.video = video; this.fullscreen = document.fullscreenElement;
    if (this.target !== target) { this.target?.removeAttribute('data-sidekick-stage'); this.target = target; target?.setAttribute('data-sidekick-stage', ''); }
    // Reserve a strip instead of assuming every movie has letterboxing.
    this.style.textContent = target ? `[data-sidekick-stage]{position:fixed!important;inset:${top}px ${right}px ${bottom}px 0!important;width:calc(100vw - ${right}px)!important;height:calc(100dvh - ${top + bottom}px)!important;--dynamic-viewport-width:calc(100vw - ${right}px);--dynamic-viewport-height:calc(100dvh - ${top + bottom}px);max-width:none!important;max-height:none!important;margin:0!important;object-fit:contain!important;background:#08090c!important;z-index:1000!important;border:0!important;border-radius:0!important}[data-sidekick-stage] video{width:100%!important;height:100%!important;max-width:none!important;max-height:none!important;object-fit:contain!important;margin:0!important;border:0!important;border-radius:0!important}` : '';
  }
  reset() { this.set(false, this.open, false); }
}
