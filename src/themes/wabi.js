export default {
  "id": "wabi",
  "label": "Wabi sabi",
  "palettes": {
    "dark": {
      "panel": "#2b2d25",
      "page": "#20231c",
      "surface": "#3b3f31",
      "hover": "#4b5241",
      "text": "#eee9d9",
      "muted": "#c0c4b0",
      "accent": "#bfccaa",
      "onAccent": "#2a3724",
      "danger": "#edb29b"
    },
    "light": {
      "panel": "#e1ded3",
      "page": "#f1efe3",
      "surface": "#d5d8cb",
      "hover": "#c5cbb9",
      "text": "#393e34",
      "muted": "#555d4d",
      "accent": "#4d6040",
      "onAccent": "#faf7e9",
      "danger": "#943f2c"
    }
  },
  styles: `
$ .brand{font:27px Georgia,serif;letter-spacing:-1.5px}
$ #panel,$ #compact{background-image:radial-gradient(var(--line) .7px,transparent .7px);background-size:4px 5px}
$ #watching-card{padding-top:28px;padding-bottom:14px}
$ #movie-title,$ h1{font:32px/1.1 Georgia,serif;letter-spacing:-1.2px}
$ #sync-box{border-width:1px 0 0;border-radius:0;background:transparent}
$ #sync-now{border:0;background:transparent}
$ .tile{border-radius:12px 17px 5px 8px}
$ .tile:nth-child(2n){border-radius:5px 16px 12px 7px}
$ .call-controls button{border-width:0 0 1px;background:transparent}
$ .message p{font:13px/1.6 Georgia,serif}
$ #chat-form{border-width:0 0 1px;border-radius:0;background:transparent}
`
};
