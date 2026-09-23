export default {
  "id": "pixel",
  "label": "Pixel art",
  "palettes": {
    "dark": {
      "panel": "#151d2d",
      "page": "#101624",
      "surface": "#263448",
      "hover": "#354860",
      "text": "#eeeacd",
      "muted": "#b8c8b6",
      "accent": "#a4d36c",
      "onAccent": "#182526",
      "danger": "#ffab89"
    },
    "light": {
      "panel": "#e0e6cd",
      "page": "#f5f6e9",
      "surface": "#cbd6b3",
      "hover": "#b9c89f",
      "text": "#243121",
      "muted": "#4e5e42",
      "accent": "#375b28",
      "onAccent": "#f8ffe9",
      "danger": "#963824"
    }
  },
  styles: `
$ {--body-font:"Courier New",monospace;--corner:0px}
$ .brand{font:bold 21px "Courier New",monospace;letter-spacing:-1.4px;text-transform:uppercase;text-shadow:2px 2px var(--surface-hover)}
$ #movie-title,$ h1{font-family:"Courier New",monospace;font-weight:700;text-transform:uppercase;letter-spacing:-1px}
$ #panel,$ #compact,$ dialog{border-radius:0;box-shadow:4px 4px var(--page)}
$ button:not(.icon),$ input,$ select,$ textarea{border-width:2px;box-shadow:2px 2px var(--page)}
$ #watching-card{background-image:linear-gradient(90deg,var(--line) 1px,transparent 1px),linear-gradient(var(--line) 1px,transparent 1px);background-size:12px 12px}
$ #sync-box{border-style:dashed;border-radius:0}
$ .tile{border:2px solid var(--border);border-radius:0;background:repeating-linear-gradient(0deg,var(--panel),var(--panel) 3px,var(--tile) 3px,var(--tile) 4px)}
$ .label,$ #movie-disclosures summary{letter-spacing:0;font-size:10px}
$ .feature-strip{gap:10px}
`
};
