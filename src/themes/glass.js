export default {
  "id": "glass",
  "label": "Glassmorphism",
  "palettes": {
    "dark": {
      "panel": "#253940",
      "page": "#1c3036",
      "surface": "#344b52",
      "hover": "#426269",
      "text": "#f1f8f5",
      "muted": "#c8ddd8",
      "accent": "#cef0dc",
      "onAccent": "#203d36",
      "danger": "#ffc0b4"
    },
    "light": {
      "panel": "#e6f0ec",
      "page": "#f6fbf9",
      "surface": "#d5e5de",
      "hover": "#c3d8ce",
      "text": "#263f38",
      "muted": "#4e685d",
      "accent": "#2d634e",
      "onAccent": "#f1fff8",
      "danger": "#9f362a"
    }
  },
  styles: `
$ .brand{font-size:24px;font-weight:400;letter-spacing:-1px}
$ #panel,$ #compact{background:linear-gradient(145deg,var(--surface),var(--panel));box-shadow:inset 0 1px var(--border),0 18px 65px var(--shadow)}
$ #movie-title{font-weight:400;letter-spacing:-1px}
$ #sync-box,$ .tile{background:linear-gradient(145deg,var(--surface-hover),var(--surface));box-shadow:inset 0 1px var(--border);border:1px solid var(--border)}
$ .tile{border-radius:13px}
@supports (backdrop-filter:blur(20px)){$ #panel,$ #compact{background:var(--glass-panel);backdrop-filter:blur(24px);-webkit-backdrop-filter:blur(24px)}}
@media (prefers-reduced-transparency:reduce){$ #panel,$ #compact{background:var(--panel);backdrop-filter:none;-webkit-backdrop-filter:none}}
`
};
