export default {
  "id": "y2k",
  "label": "Y2K aesthetics",
  "palettes": {
    "dark": {
      "panel": "#26263e",
      "page": "#1b1b30",
      "surface": "#393955",
      "hover": "#494967",
      "text": "#f6edff",
      "muted": "#c6bedb",
      "accent": "#f0a7d8",
      "onAccent": "#442339",
      "danger": "#ffb5c2"
    },
    "light": {
      "panel": "#cdd9ec",
      "page": "#edf2fc",
      "surface": "#e6edfa",
      "hover": "#c0cee5",
      "text": "#26325b",
      "muted": "#465578",
      "accent": "#873069",
      "onAccent": "#fff5fc",
      "danger": "#992c41"
    }
  },
  styles: `
$ header{background:linear-gradient(180deg,var(--page),var(--surface-hover) 48%,var(--page) 54%,var(--surface));border-bottom:2px solid var(--border)}
$ .brand{font:italic 800 24px "Arial Black",sans-serif;letter-spacing:-1.6px}
$ #movie-title,$ h1{font-family:"Arial Black",sans-serif;font-style:italic;font-weight:800;letter-spacing:-1px}
$ .primary,$ #room-play{box-shadow:inset 0 2px 0 var(--border),0 2px 4px var(--shadow);border-radius:24px}
$ #sync-box{border-radius:20px;background:linear-gradient(145deg,var(--surface),var(--panel))}
$ .tile{border:2px solid var(--border);background:linear-gradient(145deg,var(--page),var(--tile));box-shadow:0 2px 4px var(--shadow);border-radius:14px}
$ #chat-form{border-radius:22px}
`
};
