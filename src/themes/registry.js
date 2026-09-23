import minimalism from './minimalism.js';
import scrapbook from './scrapbook.js';
import surrealism from './surrealism.js';
import y2k from './y2k.js';
import pixel from './pixel.js';
import glass from './glass.js';
import bento from './bento.js';
import editorial from './editorial.js';
import swiss from './swiss.js';
import maximalism from './maximalism.js';
import wabi from './wabi.js';

// Add/remove an import and its entry here. Nothing in the room/player/call logic
// needs to change. Minimalism is the required fallback theme.
export const THEMES = Object.freeze([minimalism, scrapbook, surrealism, y2k, pixel, glass, bento, editorial, swiss, maximalism, wabi]);
export function themeStyles(themes = THEMES) {
  return themes.map(theme => {
    const selector = `:host([data-theme="${theme.id}"])`;
    const colors = Object.entries(theme.palettes).map(([mode, p]) => {
      const dark = mode === 'dark';
      const tokens = {
        'page': p.page, 'panel': p.panel, 'surface': p.surface, 'surface-hover': p.hover,
        'tile': p.surface, 'text': p.text, 'text-strong': p.text, 'muted': p.muted, 'subtle': p.muted,
        'accent': p.accent, 'accent-hover': p.accent, 'accent-text': p.accent, 'accent-focus': p.accent,
        'accent-soft': p.accent + '22', 'accent-wash': p.accent + '0a', 'accent-line': p.accent + '55',
        'on-accent': p.onAccent, 'danger': p.danger, 'warning': p.danger,
        'warning-line': p.danger + '55', 'warning-bg': p.danger + '0d',
        'line': dark ? '#ffffff1a' : '#18231824', 'border': dark ? '#ffffff36' : '#18231845',
        'field-border': dark ? '#ffffff36' : '#18231845',
        'pin-bg': p.panel, 'video-label': '#121816e6', 'video-text': '#f6f8f2',
        'shadow': dark ? '#0006' : '#18231820', 'scrim': '#0009', 'glass-panel': p.panel + 'ed'
      };
      return `:host([data-theme="${theme.id}"][data-mode="${mode}"]){color-scheme:${mode};${Object.entries(tokens).map(([k,v]) => `--${k}:${v}`).join(';')}}`;
    }).join('\n');
    return colors + '\n' + theme.styles.replaceAll('$', selector);
  }).join('\n');
}
