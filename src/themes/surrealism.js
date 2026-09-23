export default {
  "id": "surrealism",
  "label": "Surrealism",
  "palettes": {
    "dark": {
      "panel": "#202b42",
      "page": "#182237",
      "surface": "#314057",
      "hover": "#40516a",
      "text": "#fae5cd",
      "muted": "#bfccde",
      "accent": "#f2bb85",
      "onAccent": "#302b41",
      "danger": "#ffb2b4"
    },
    "light": {
      "panel": "#f0e3d5",
      "page": "#fff6e9",
      "surface": "#e2d5c7",
      "hover": "#d2c5ba",
      "text": "#343e58",
      "muted": "#535b71",
      "accent": "#78502d",
      "onAccent": "#fff6e9",
      "danger": "#9a363c"
    }
  },
  styles: `
$ .brand{font:italic 29px Georgia,serif;letter-spacing:-1.5px}
$ #watching-card{position:relative;isolation:isolate;overflow:hidden;padding-top:26px;padding-bottom:15px}
$ #watching-card:before{content:"";position:absolute;z-index:-1;right:-36px;top:14px;width:120px;height:120px;border-radius:50%;background:radial-gradient(circle at 30% 25%,var(--accent-soft),var(--surface) 65%,var(--panel));pointer-events:none}
$ #movie-title,$ h1{font-family:Georgia,serif;font-style:italic;font-size:30px;line-height:1.1;letter-spacing:-1px}
$ #sync-box{border-radius:4px 24px 24px 4px}
$ .tile{background:linear-gradient(145deg,var(--surface-hover),var(--tile));border-radius:18px 18px 7px 7px}
$ #chat-form{border-radius:22px}
`
};
