export default {
  "id": "minimalism",
  "label": "Minimalism",
  "palettes": {
    "dark": {
      "panel": "#161918",
      "page": "#111512",
      "surface": "#252c27",
      "hover": "#343e36",
      "text": "#edf0eb",
      "muted": "#aab5ac",
      "accent": "#bcd4ae",
      "onAccent": "#21321d",
      "danger": "#ffb0a0"
    },
    "light": {
      "panel": "#f4f6ef",
      "page": "#fbfcf8",
      "surface": "#e5ebe0",
      "hover": "#d8e1d2",
      "text": "#283025",
      "muted": "#596451",
      "accent": "#405d35",
      "onAccent": "#f8fcf3",
      "danger": "#9c3528"
    }
  },
  styles: `
$ #panel{box-shadow:0 20px 70px var(--scrim)}
$ .brand{font-size:22px;font-weight:500;letter-spacing:-1px}
$ #watching-card{padding-top:24px;padding-bottom:5px}
$ #movie-title{font-size:26px;font-weight:400;letter-spacing:-1px;line-height:1.15}
$ #sync-box{border-color:transparent;background:transparent;padding:8px 0}
$ #sync-now{background:transparent;border-color:transparent;color:var(--muted)}
$ #call-controls button{background:transparent}
$ .tile{border:0;border-radius:7px}
$ #chat-form{border-color:transparent}
`
};
