# Editing SWaP themes

Each theme lives in its own `.js` file here. It contains an ID, a display label, two palettes (`dark` and `light`), and scoped CSS in `styles`. Users install the single bundled userscript; source modularity does not add remote imports or downloads.

## Change a theme

1. Open its module, such as `minimalism.js`.
2. Change either palette or its CSS. Palette colors use six-digit hex, because the registry derives translucent variants by appending alpha values.
3. Begin **every CSS selector** with `$`. The registry replaces `$` with that theme’s Shadow DOM host selector. Use CSS variables for colors so both modes work. Keep styles confined to SWaP; do not add global Stremio selectors or media/network behavior.
4. Run `npm test` and `npm run build` from the project root. Check the actual lobby, room and compact strip in both modes using `npm run demo`.
5. Install the rebuilt `dist/SWaP.user.js` in Tampermonkey and reload Stremio. Build does not update installed copies automatically.

Prefer typography, spacing, borders and decorative pseudo-elements for theme art. Preserve the common controls, labels, disclosure behavior and DOM IDs. Check long movie names, warnings, camera-off placeholders, pins, keyboard focus and narrow panels. Avoid fonts or images fetched from third parties.

## Add or remove a theme

To add one, copy an existing module, give it a unique stable ID and label, then add its import and array entry in `registry.js`. To remove one, remove those two entries; its file can remain unused or be deleted. The picker is generated from the registry, and unused modules are not bundled.

Keep Minimalism as the required fallback. If a previously saved theme is no longer registered, the next launch falls back to Minimalism. Light/dark preference remains independent. No room, player or call changes are needed.

## Shared files

- `registry.js`: theme catalog, palette-to-token mapping and scoped CSS generation.
- `../themes.js`: defaults, normalization and guarded local persistence.
- `../appearance.js`: picker and sun/moon button wiring. It has no room, player or call imports.
- `../themes.css`: shared appearance controls, transitions and reduced-motion support.
- `../style.css`: common layout and component structure.
- `../main.js`: mounts styles and appearance controls once; switching changes host attributes, without rebuilding room/call/chat elements.

Storage keys are `sidekick-theme` and `sidekick-color-mode`. Defaults are Minimalism and dark. Preferences belong to the local browser origin and are never broadcast to the room. Blocked storage falls back safely and allows changes for the current visit.

## Validation and browser compatibility

`tests/themes.test.js` checks fallback behavior, independent persistence, scoped CSS and selected text/background contrast pairs across both modes. These are useful guardrails, not a full accessibility certification; gradients, transparency and interaction states still need visual inspection.

The shadow stylesheet has the `stylus` class so Dark Reader does not recolor these explicit palettes. Its current [stylesheet handling](https://github.com/darkreader/darkreader/blob/main/src/inject/dynamic-theme/style-manager.ts) skips that class. This is a best-effort compatibility hook, not a guaranteed public API. It does not change the extension’s settings or disable Dark Reader on the surrounding Stremio page.

Legacy `sidekick-*` storage keys and internal DOM markers are retained for compatibility; they are not network identifiers.
