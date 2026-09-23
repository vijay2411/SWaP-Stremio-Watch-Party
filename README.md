# SWaP — Stremio Watch Party

**Same movie. Same moment. Your people.**

Watch together on [Stremio Web](https://web.stremio.com/) with one room code, synchronized playback, group chat, and optional audio/video calls. Free to use, with no SWaP account and no backend for you to deploy.

**[Install userscript](https://raw.githubusercontent.com/vijay2411/SWaP-Stremio-Watch-Party/main/SWaP.user.js)** · **[Install Chrome extension](CHROME-EXTENSION.md)** · [Installation guide](INSTALL.md) · [Security & privacy](SECURITY.md) · [Version history](VERSIONS.md)

SWaP 4.1 is available as an **unpacked Chrome extension preview** or a **userscript for desktop browsers** through Tampermonkey. Automated checks and live Chrome/Stremio room, chat and playback checks pass (see [TESTING.md](TESTING.md) for scope). There is no SWaP Chrome Web Store release yet. This is an independent community project, not an official Stremio extension.

## Get watching

For Chrome without Tampermonkey, follow the **[extension installation guide](CHROME-EXTENSION.md)**. For the userscript:

1. Install [Tampermonkey](https://www.tampermonkey.net/) using its official browser-store link. In current Chrome, open its extension details and enable **Allow User Scripts**. See [Tampermonkey’s instructions](https://www.tampermonkey.net/faq.php?locale=en&q=Q209).
2. Open **[Install SWaP](https://raw.githubusercontent.com/vijay2411/SWaP-Stremio-Watch-Party/main/SWaP.user.js)** and confirm installation. If you used Sidekick, disable its old script first; keep only one copy enabled.
3. Reload **https://web.stremio.com/**. Open **Watch together**, enter a name, and create a room.
4. Send your friends the installation link and your room code privately. Everyone installs SWaP 4.x, opens their own matching stream, and joins with that code.
5. The host presses **Play room**. Calls are optional; camera/microphone capture starts only after choosing **Join video call** or **Audio only**.

Everyone needs their own Stremio setup and access to the content. SWaP synchronizes players; it does not redistribute movies or share your Stremio login/addons. The host must keep the tab and room open.

> Upgrading: SWaP 4.x uses a new authenticated room protocol. It cannot join Sidekick v2/v3 rooms. Update everyone, then create a fresh room. Extension 4.1 and userscript 4.0/4.1 are compatible; keep only one installation active per page. Historical versions are archived for reference, not recommended for use.

## What’s included

- **Playback:** host control by default, or allow everyone to control playback before/during the room. Optional automatic waits for buffering friends, up to 20 seconds; the host can continue early. Failed, stale and mismatched streams do not hold the group indefinitely.
- **Stream checks:** title/episode, duration, playback time, source/release labels and mismatch warnings. Matching duration is a useful fallback, not proof of an identical file. File hashes, when available, are shared only as room-salted fingerprints. Raw stream URLs and headers are excluded.
- **Chat:** automatic scroll with a way back to the latest message; compact five-second notifications while minimized. Queued notifications arrive two seconds apart, at most three visible. Reply horizontally inside the folded Watch together bar.
- **Calls:** opt-in camera/audio, pin a participant, camera-off placeholders, real camera-track release, echo/noise-processing requests and hold-to-talk with a chosen A–Z key. Headphones or hold-to-talk help when speakers feed the movie back into the microphone.
- **Layout:** a sidebar that reserves space for the movie; narrow windows use a bottom dock. Minimizing restores the viewing area, with a reserved top strip when a call is active. Room options, stream details and everyone’s playback start folded.
- **Appearance:** Minimalism dark by default; 11 modular themes, each in light/dark mode, with a single sun/moon button. Themes include Scrapbook, Surrealism, Y2K, Pixel art, Glassmorphism, Bento grid, Editorial, Swiss, Maximalism and Wabi sabi. Choices affect only your view.
- **Safer room handling:** mutual code-based admission, bounded messages, connection-bound chat authors, room-specific call admission and confirmation before ending a room.

## What “serverless” means here

More precisely: **no SWaP application backend to deploy**. Servers still participate:

| Component | What it does |
| --- | --- |
| PeerJS signaling | Introduces browsers and exchanges WebRTC connection metadata. SWaP uses PeerJS’s public service by default. |
| STUN / TURN | Finds routes between browsers; a TURN relay carries encrypted traffic when a direct path is unavailable. |
| Your room host | Coordinates playback and forwards chat in memory. New members receive recent chat history. |
| Each call participant | Sends camera/mic media directly to the other call participants, or through TURN. |
| Cinemeta | Optional best-effort title/description lookup using a public IMDb ID. Credentials and referrer are omitted. |
| GitHub | Distributes the userscript and updates. It is not the live room server. |

[PeerJS documents the signaling dependency](https://peerjs.com/client/getting-started), and [WebRTC documents when TURN is needed](https://webrtc.org/getting-started/turn-server). The bundled PeerJS defaults include Google STUN and shared PeerJS TURN endpoints. Their public access values come from the upstream library; they are not the repository owner’s personal credentials.

No paid account is required by SWaP. Public services can change availability, quotas or terms; this is not a guarantee of unlimited free infrastructure. Optional custom signaling/TURN settings are available under Connection settings. Use a server you trust and relay credentials you are authorized to use; settings remain in that tab’s session storage.

There is no user-facing participant limit, but there are finite message/resource limits. Calls use a mesh: each of N people sends to N−1 others. CPU, upload bandwidth, relays and host capacity limit practical room size. Start with a small group. Large all-camera rooms would require a different architecture and funded infrastructure.

## Security and privacy

A room code is an invitation secret. Keep it private. SWaP 4.0 separates it from the public discovery ID and verifies possession at both ends before sharing room data. Incoming calls also require current membership, an active call status and the recipient’s current room token.

SWaP has no remote-desktop, shell, file-sharing or arbitrary-code-execution feature. Chat is rendered as text. This is **not a guarantee against all vulnerabilities**: invited members can record content or share the code, direct connections may reveal IP addresses, and browser/page/extension compromise is outside room isolation. The signaling service remains a trusted dependency; this protocol does not defeat an actively malicious signaling server relaying the authentication exchange.

The host sees/forwards chat and keeps up to 100 messages in memory, subject to a bounded join replay. Nothing is written to a SWaP chat database. Display name, theme, mode and talk key are saved locally; optional connection settings are in session storage. Other code running on the same Stremio origin can access that storage. SWaP adds no analytics.

Read the [privacy notice](PRIVACY.md) and [security review](SECURITY.md) for findings, fixes, credential-scan scope and remaining limitations. This is a code review with targeted tests, not an independent penetration-test certification.

## Development

Node.js 20+:

```sh
npm ci
npm test
npm run build
npm run test:package
npm run demo
```

The build writes the installable **`SWaP.user.js`** at the repository root and `dist/SWaP.user.js`; libraries and CSS are bundled, with no runtime CDN script imports. `package-lock.json` pins dependencies. `dist/` and demo bundles are generated locally and ignored by Git. The same build also writes `dist/chrome-extension/` and a versioned extension ZIP/checksum; see [CHROME-EXTENSION.md](CHROME-EXTENSION.md).

Open **http://127.0.0.1:9000/demo/stremio-layout.html?local=1&synthetic=1** in multiple tabs for local signaling and synthetic camera/mic tracks. Remove `synthetic=1` to test real devices deliberately. The loopback demo serves an explicit file allowlist. Local signaling still retains public ICE defaults, so STUN/TURN discovery can contact those providers. Demo-only overrides and fixtures are absent from both production distributions. The demo exercises the shared app in the page context; it does not replace testing Chrome’s isolated extension on Stremio.

Edit `src/`, then rebuild. Themes live in `src/themes/`; [theme editing instructions](src/themes/README.md) explain how to add/remove one without touching room logic. Internal legacy storage keys and the mount marker remain for preference/upgrade compatibility.

See [TESTING.md](TESTING.md) for verification and [CHANGELOG.md](CHANGELOG.md) for release changes. Older compiled releases are successive commits of the same `SWaP.user.js` file, with version tags and a [checksum manifest](versions.json). Import commits are made now, not backdated release claims.

## Upcoming

- Chrome Web Store publication for simpler installation and automatic extension updates.
- Further cross-network/device testing, especially restrictive networks and larger calls.
- Room admission/moderation controls if needed for groups beyond trusted friends.

## Credits and license

Inspired by [Sagar Chaulagain’s Stremio Watch Together](https://github.com/sagarchaulagai/stremio-watch-together/). SWaP, formerly Sidekick, is a separate implementation built with [PeerJS](https://peerjs.com/) and native WebRTC. MIT licensed; bundled third-party notices are retained in the userscript and [THIRD-PARTY-NOTICES.txt](THIRD-PARTY-NOTICES.txt).
