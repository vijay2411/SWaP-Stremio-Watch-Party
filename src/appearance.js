import { THEMES, normalizeTheme, writeTheme, writeMode } from './themes.js';

// Personal appearance only. Never touches or broadcasts room, playback or media state.
export function initAppearance(host, root, icon) {
  const $ = id => root.getElementById(id);
  const applyTheme = (value, save = false) => {
    const id = normalizeTheme(value);
    host.dataset.theme = id;
    $('theme-lobby').value = $('theme-room').value = id;
    $('appearance-summary').textContent = `Appearance · ${THEMES.find(t => t.id === id).label}`;
    const saved = !save || writeTheme(id);
    root.querySelectorAll('.theme-hint').forEach(el => {
      el.textContent = saved ? 'Only changes your view.' : 'Applied for this visit. Your browser could not save this preference.';
    });
  };
  const applyMode = (mode, save = false) => {
    host.dataset.mode = mode;
    const label = mode === 'dark' ? 'Switch to light mode' : 'Switch to dark mode';
    $('color-mode').innerHTML = icon(mode === 'dark' ? 'sun' : 'moon');
    $('color-mode').setAttribute('aria-label', label); $('color-mode').title = label;
    if (save && !writeMode(mode)) root.querySelectorAll('.theme-hint').forEach(el => {
      el.textContent = 'Applied for this visit. Your browser could not save this preference.';
    });
  };
  applyTheme(host.dataset.theme); applyMode(host.dataset.mode);
  $('color-mode').onclick = () => applyMode(host.dataset.mode === 'dark' ? 'light' : 'dark', true);
  $('theme-lobby').onchange = $('theme-room').onchange = e => applyTheme(e.target.value, true);
}
