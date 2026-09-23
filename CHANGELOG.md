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
