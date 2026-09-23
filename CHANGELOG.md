# SWaP 4.1.0

- Adds a Manifest V3 Chrome extension with a toolbar button and narrowly scoped Stremio content script. No Tampermonkey dependency for extension installs.
- Keeps room, player, calls, chat and modular themes in one shared app; the userscript remains available. Room protocol 4 is unchanged and compatible with SWaP 4.0.
- Packages all executable code locally, with no extra Chrome API permissions. The toolbar exposes only status and open-panel actions to its own popup.
- Adds original PNG icons, deterministic allowlisted ZIP/checksum builds, extension boundary/package tests, a privacy notice and installation/store-preparation instructions.
- Preserves preferences and prevents a second SWaP/Sidekick copy mounting over the same player. Disable the old userscript and reload when switching to the extension.

This preview is available for unpacked Chrome installation. Live extension verification is pending; Chrome Web Store publication is still upcoming.

# SWaP 4.0.0

Sidekick is now **SWaP — Stremio Watch Party**. All previous playback, chat, compact reply, call and theme features are retained.

- New protocol version: mutual HMAC-SHA-256 room-code authentication before admission, with unique challenges. The discovery ID is a domain-separated hash of the code; it no longer contains the code itself.
- Calls require current active room membership and the recipient’s ephemeral room capability.
- Guest actions must arrive on the exact admitted data connection. Frames are size-checked before JSON parsing; handshake concurrency, deadlines and per-guest traffic are bounded.
- Join history is replayed in separate bounded frames; received chat fields are explicitly copied and identifiers bounded.
- Closing a room clears ephemeral keys/capabilities and pending connections.
- Development server serves an explicit allowlist, checks Host headers and refuses symlink escapes.
- New name, installation/update URLs, README, security review and reproducible version history.

All participants must update. SWaP 4.0 cannot join older Sidekick rooms. Historical releases are preserved byte-for-byte as successive commits of `SWaP.user.js`; see VERSIONS.md.
