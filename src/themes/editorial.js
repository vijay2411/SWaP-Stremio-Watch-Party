export default {
  "id": "editorial",
  "label": "Editorial design",
  "palettes": {
    "dark": {
      "panel": "#252922",
      "page": "#1b2019",
      "surface": "#353b2d",
      "hover": "#454e3a",
      "text": "#f2eee4",
      "muted": "#c0c5b1",
      "accent": "#c4d1ac",
      "onAccent": "#293622",
      "danger": "#ffb2a3"
    },
    "light": {
      "panel": "#f2eee4",
      "page": "#faf7ed",
      "surface": "#e8e5da",
      "hover": "#d9d7ca",
      "text": "#272c28",
      "muted": "#65665b",
      "accent": "#435840",
      "onAccent": "#faf7ed",
      "danger": "#9b3f32"
    }
  },
  styles: `
$ {--corner:1px}
$ .brand{font:italic 28px Georgia,serif;letter-spacing:-1.6px}
$ header{border-bottom:3px double var(--border)}
$ #watching-card{padding-top:25px;padding-bottom:12px}
$ #movie-title,$ h1{font:36px/1.05 Georgia,serif;letter-spacing:-1.5px}
$ #sync-box{border-width:1px 0;border-radius:0;background:transparent}
$ .tile{border-radius:0;border:0}
$ #chat-head .label{font:italic 18px Georgia,serif;text-transform:none;letter-spacing:0;color:var(--text)}
$ .message p{font:13px/1.65 Georgia,serif}
$ #session-footer{border-top:3px double var(--border)}
`
};
