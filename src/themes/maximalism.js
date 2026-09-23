export default {
  "id": "maximalism",
  "label": "Maximalism",
  "palettes": {
    "dark": {
      "panel": "#302147",
      "page": "#231635",
      "surface": "#463555",
      "hover": "#58476a",
      "text": "#fff0c0",
      "muted": "#e0cbbf",
      "accent": "#eed777",
      "onAccent": "#302147",
      "danger": "#ffb4a0"
    },
    "light": {
      "panel": "#eadb67",
      "page": "#fff4cb",
      "surface": "#ffedac",
      "hover": "#e8cc77",
      "text": "#283316",
      "muted": "#515727",
      "accent": "#36215d",
      "onAccent": "#fff0cf",
      "danger": "#942d20"
    }
  },
  styles: `
$ header{background:var(--accent);color:var(--on-accent);border-bottom:3px solid var(--text)}
$ .brand{font:bold italic 28px Georgia,serif;letter-spacing:-1.5px}
$ header .brand svg,$ header .pill,$ header .icon{color:var(--on-accent);border-color:currentColor}
$ #watching-card{position:relative;isolation:isolate;margin:16px 18px 7px;padding:18px 13px;border:2px solid var(--accent);box-shadow:4px 4px var(--accent);background:repeating-linear-gradient(45deg,var(--surface),var(--surface) 8px,var(--panel) 8px,var(--panel) 9px)}
$ #movie-title,$ h1{font-family:"Arial Black",sans-serif;font-weight:900;letter-spacing:-1.1px;text-transform:uppercase}
$ #sync-box{border:2px solid var(--accent);border-radius:1px;background:var(--surface)}
$ .tile{border:2px solid var(--accent);border-radius:2px;background:radial-gradient(var(--accent-line) 1px,transparent 1px),var(--tile);background-size:8px 8px}
$ .tile:nth-child(2n){background:repeating-linear-gradient(90deg,var(--surface),var(--surface) 10px,var(--tile) 10px,var(--tile) 20px)}
$ #chat-head{background:var(--accent)}
$ #chat-head .label,$ #chat-head .muted{color:var(--on-accent)}
`
};
