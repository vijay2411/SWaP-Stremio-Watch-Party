export default {
  "id": "scrapbook",
  "label": "Scrapbook",
  "palettes": {
    "dark": {
      "panel": "#292820",
      "page": "#211f19",
      "surface": "#37392b",
      "hover": "#474939",
      "text": "#f3e9d0",
      "muted": "#c3b9a0",
      "accent": "#b6c998",
      "onAccent": "#22321e",
      "danger": "#ffb7a3"
    },
    "light": {
      "panel": "#e9dfc7",
      "page": "#fff8e8",
      "surface": "#f8f0dc",
      "hover": "#e0d5ba",
      "text": "#322c23",
      "muted": "#685c48",
      "accent": "#305a44",
      "onAccent": "#fff9e9",
      "danger": "#9e392e"
    }
  },
  styles: `
$ #panel,$ #compact{background-image:repeating-linear-gradient(0deg,transparent 0 23px,var(--line) 23px 24px)}
$ .brand{font:italic 26px Georgia,serif;letter-spacing:-1px}
$ #watching-card{position:relative;margin:19px 18px 4px;padding:16px 14px;background:var(--page);box-shadow:2px 3px 0 var(--line);border-radius:2px;isolation:isolate}
$ #watching-card:before{content:"";position:absolute;top:-8px;left:35%;width:70px;height:17px;transform:rotate(4deg);background:var(--accent-line);pointer-events:none}
$ #movie-title,$ h1{font-family:Georgia,serif;font-style:italic}
$ #sync-box{border-style:dashed;border-radius:2px}
$ .tile{border:4px solid var(--page);border-bottom-width:9px;border-radius:2px;box-shadow:1px 2px 4px var(--shadow)}
$ .message{border-bottom:1px dashed var(--line)}
`
};
