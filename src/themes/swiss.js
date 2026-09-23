export default {
  "id": "swiss",
  "label": "Swiss design",
  "palettes": {
    "dark": {
      "panel": "#202421",
      "page": "#161b18",
      "surface": "#333b34",
      "hover": "#444e44",
      "text": "#efeee5",
      "muted": "#bcc3b6",
      "accent": "#ffac9b",
      "onAccent": "#421c14",
      "danger": "#ffac9b"
    },
    "light": {
      "panel": "#efece4",
      "page": "#f8f6ef",
      "surface": "#dedfd4",
      "hover": "#cdd2c3",
      "text": "#232722",
      "muted": "#596154",
      "accent": "#af3023",
      "onAccent": "#fff5ec",
      "danger": "#af3023"
    }
  },
  styles: `
$ {--body-font:"Helvetica Neue",Helvetica,sans-serif;--corner:0px}
$ .brand{font-size:28px;font-weight:800;letter-spacing:-1.8px}
$ header{border-bottom:4px solid var(--accent)}
$ #movie-title,$ h1{font-weight:750;letter-spacing:-1.3px}
$ #watching-card{border-left:3px solid var(--accent);margin:18px 18px 4px;padding:1px 0 1px 12px}
$ #sync-box{border-width:2px 0 1px;border-radius:0;background:transparent}
$ .tile{border-radius:0;border-top:3px solid var(--accent)}
$ #chat-head{border-top:2px solid var(--text)}
$ #chat-form{border-width:0 0 2px;border-color:var(--text);border-radius:0;background:transparent}
`
};
