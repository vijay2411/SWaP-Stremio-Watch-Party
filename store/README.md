# SWaP store upload kit

Start with [CHROME-WEB-STORE.md](../CHROME-WEB-STORE.md) for every dashboard field. The installation ZIP and this listing kit are different uploads: only `SWaP-Chrome-4.2.5.zip` belongs in **Package**.

## Copy and paste

- `description.txt` → Store listing / Description
- `single-purpose.txt` → Privacy / Single purpose
- `host-permission.txt` → Privacy / Stremio site-access justification (if displayed)
- `remote-code.txt` → Optional explanation after selecting no remote code
- `reviewer-instructions.txt` → Access / Test instructions

## Upload images

| File | Destination | Format |
| --- | --- | --- |
| `assets/store-icon-128.png` | Store icon | 128 × 128 RGBA PNG; 96 px artwork with 16 px padding |
| `assets/01-create-or-join-1280x800.jpg` | Screenshot 1 | 1280 × 800 RGB JPEG |
| `assets/02-room-chat-1280x800.jpg` | Screenshot 2 | 1280 × 800 RGB JPEG |
| `assets/03-light-theme-1280x800.jpg` | Screenshot 3 | 1280 × 800 RGB JPEG |
| `assets/small-promo-440x280.jpg` | Small promo tile | 440 × 280 RGB JPEG |
| `assets/marquee-1400x560.jpg` | Optional marquee | 1400 × 560 RGB JPEG |

The screenshots use the actual shared SWaP app with a labeled demo player, generated test video and fictional conversation. The room was closed after capture. No camera/mic capture, private room codes, third-party movie artwork or personal browser screenshots are included. The originals are committed unchanged from browser capture, not composited into invented application states.

## Recreate artwork and screenshots

1. `npm run build`, then `npm run demo`.
2. Open `http://127.0.0.1:9000/store/promo.html`; capture JPEG at exact 440 × 280 and 1400 × 560 CSS-pixel viewports. Check the actual image dimensions after capture.
3. Open `http://127.0.0.1:9000/store/preview.html?local=1&synthetic=1` at 1280 × 800. It runs the shared app with demo-only media. The developer fixture buttons are hidden for presentation; production UI is unchanged.
4. Capture the Minimalism dark lobby with a fictional name. For chat, create/join through the UI in two tabs and exchange fictional messages. Keep Room & viewing options folded so no room code is photographed. Capture dark and Pixel art light examples.
5. End the room, close test tabs and restore viewport/preferences.
6. `python3 scripts/generate-icons.py` regenerates the package icons; copy `extension/icons/icon128.png` to `assets/store-icon-128.png` after any intentional logo change. Pillow is only needed for this optional artwork command, not normal extension builds.

The store HTML pages are development-only and excluded from the extension ZIP. Future screenshots must be reviewed again when the product UI changes.

Run `node scripts/build-store-kit.mjs` to bundle the reviewed listing text, guide and images into `dist/SWaP-Store-Kit-<version>.zip` with a SHA-256 checksum. This command packages existing captures; it does not regenerate browser screenshots.
