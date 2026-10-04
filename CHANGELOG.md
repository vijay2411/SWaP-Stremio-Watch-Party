# SWaP 4.2.4

- Prepares a Chrome Web Store submission kit: field-by-field guidance, listing text, reviewer instructions, privacy-category mapping, three actual-UI demo screenshots and promotional graphics. Store submission remains a separate publisher action.
- Gives the 128 px store/package icon 96 px artwork with 16 px transparent padding. Toolbar icon sizes and the in-page logo remain unchanged.
- Clarifies room-authentication and optional relay-credential handling in the privacy notice. No runtime behavior, Chrome permissions or room protocol changes.

# SWaP 4.2.3

- Matches the expanded header and folded Watch together icons to the extension toolbar’s rounded camera/play logo. Theme colors adapt while the silhouette stays the same.
- Includes the branding fix in both the userscript and extension; playback behavior and permissions are unchanged.

# SWaP 4.2.2

- Keeps the Join label on one line when page text-wrapping styles reach the panel. The room-code field takes the remaining row width, so the button cannot be squeezed into a tall, broken label.
- Applies the shared CSS fix to all themes in the userscript and Chrome extension. Room protocol and Chrome permissions are unchanged.

# SWaP 4.2.1

- Fixes player-container fullscreen: the movie, subtitles and controls share the available viewing area beside the sidebar or below the call strip. Controls no longer end up behind the sidebar/video layer.
- Restores the common player shell when exiting fullscreen, including browsers that dispatch resize before fullscreenchange. Only SWaP’s own overlay moves; the player’s DOM children stay in place.
- Adds fullscreen regression coverage and demo-only UI timing diagnostics for notification cadence and buffering waits. Both distributions include the fix; room protocol and Chrome permissions are unchanged.

# SWaP 4.2.0

- Centers the folded Watch together bar, horizontal quick reply and message previews at the bottom of the screen in both distributions, leaving the bottom-right Stremio controls clear.
- Adds **Hide SWaP / Show SWaP** to the Chrome extension menu. Hiding is per tab and survives reloads when storage is available; it restores the movie's full layout and suppresses previews while keeping the room/call connected.
- Preserves chat drafts and messages while hidden. Showing SWaP restores the sidebar. The popup explains that hiding does not leave a room or stop a call.
- Keeps the userscript launcher available. No new Chrome permissions, background worker or network commands; the toolbar channel still accepts only its own popup and projects boolean status.
- Room protocol 4 is unchanged. Chrome Web Store publication remains a later step.

# SWaP 4.1.1

- Fixes a stale sidebar error after a rejected chat send: a successful retry now clears that send warning while preserving unrelated notices, such as blocked call audio. This applies to both the sidebar and compact reply.
- Verifies the installed 4.1 extension on Stremio Web: toolbar opening, matching stream details, public-signaling guest admission, bidirectional chat, synchronized play/pause, host/shared control changes, compact replies, light/dark sidebar layout and end-room confirmation.
- Verifies separate-room chat/playback isolation, an opt-in two-tab hardware video call, participant pinning, camera-off placeholders and call cleanup: Chrome's capture indicators disappear after leaving both calls.
- Updates the installation and verification documents. Room protocol 4 is unchanged. Cross-network reliability, physical camera LEDs and acoustic echo cancellation still need real-world verification.

# SWaP 4.1.0

- Adds a Manifest V3 Chrome extension with a toolbar button and narrowly scoped Stremio content script. No Tampermonkey dependency for extension installs.
- Keeps room, player, calls, chat and modular themes in one shared app; the userscript remains available. Room protocol 4 is unchanged and compatible with SWaP 4.0.
- Packages all executable code locally, with no extra Chrome API permissions. The toolbar exposes only status and open-panel actions to its own popup.
- Adds original PNG icons, deterministic allowlisted ZIP/checksum builds, extension boundary/package tests, a privacy notice and installation/store-preparation instructions.
- Preserves preferences and prevents a second SWaP/Sidekick copy mounting over the same player. Disable the old userscript and reload when switching to the extension.

This preview added unpacked Chrome installation. Live extension verification was pending at release and is recorded in 4.1.1 above; Chrome Web Store publication is still upcoming.

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
