export default {
  "id": "bento",
  "label": "Bento grid",
  "palettes": {
    "dark": {
      "panel": "#20291e",
      "page": "#161f15",
      "surface": "#303d2b",
      "hover": "#415237",
      "text": "#eff5e5",
      "muted": "#b6c8a8",
      "accent": "#c6dfa7",
      "onAccent": "#293d1d",
      "danger": "#ffb2a1"
    },
    "light": {
      "panel": "#e6e9df",
      "page": "#f8faf3",
      "surface": "#f7f8f2",
      "hover": "#d7dfcb",
      "text": "#253124",
      "muted": "#57634e",
      "accent": "#374f31",
      "onAccent": "#f5f8ef",
      "danger": "#9b3e30"
    }
  },
  styles: `
$ .brand{font-size:26px;font-weight:750;letter-spacing:-1.5px}
$ #watching-card{margin:14px 14px 0;padding:17px;background:var(--tile);border-radius:17px}
$ #movie-title{font-size:27px;letter-spacing:-1px;font-weight:650}
$ #playback-section{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:8px;margin:9px 14px 0}
$ #sync-box,$ #playback-tools{margin:0;padding:12px;background:var(--surface);border:0;border-radius:14px;min-width:0}
$ #sync-box>.row{flex-direction:column;align-items:flex-start;gap:8px}
$ #playback-tools .row{gap:6px}
$ #playback-tools button{max-width:100%;font-size:10px}
$ #call-home{margin:10px 14px;background:var(--surface);border-radius:17px}
$ #call-home #call-section{padding:14px;border:0}
$ #chat-head{margin:0 14px;padding:13px 13px 8px;border-radius:17px 17px 0 0;background:var(--surface)}
$ #messages{margin:0 14px;padding:4px 13px 10px;background:var(--surface)}
$ #chat-form{margin:0 14px 12px;border-radius:0 0 17px 17px;border-top:0}
`
};
