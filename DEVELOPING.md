# SWaP developer guide

[README](README.md) covers installation for viewers. This guide covers the source, local development and the boundaries behind the product.

## Build and run

Use Node.js 20+ and npm. From the repository root:

```sh
npm ci
npm test
npm run build
npm run test:package
npm run demo
```

Open `http://127.0.0.1:9000/demo/stremio-layout.html?local=1&synthetic=1` in multiple tabs. Create a host room, join from another tab, and create a separate room to check isolation. The fixture provides playable sample media and synthetic camera/microphone tracks; no Stremio account is needed for this demo.

- `local=1` selects the loopback signaling server on port 9001. Public ICE defaults can still contact STUN/TURN services; this is not an offline test.
- `synthetic=1` enables demo media fixtures. Remove it only when deliberately testing real devices.
- The demo runs the shared app in the page context. Its fixtures do **not** override camera/microphone APIs in Chrome's isolated extension context. Live extension tests can activate real hardware and need deliberate device permission.
- The development server binds to loopback, validates the Host header and serves an explicit file allowlist. It is not a production room backend.

Close test calls/rooms when finished. See [TESTING.md](TESTING.md) for executed checks and remaining gaps.

## Build outputs

| Output | Purpose |
| --- | --- |
| `SWaP.user.js`, `dist/SWaP.user.js` | Bundled installable userscript. |
| `dist/chrome-extension/` | Complete folder for Chrome's **Load unpacked**. |
| `dist/SWaP-Chrome-<version>.zip` and `.zip.sha256` | Extension distribution/upload package and checksum. |
| `demo/swap.js`, `demo/swap.js.map` | Local demo bundle and source map. |

Edit source files, then rebuild; don't hand-edit the generated userscript. `dist/`, dependency folders and demo bundles are ignored by Git. `npm run build:extension` builds only the extension. Builds do not update an installed copy automatically: reload the installed extension and its Stremio tabs after replacing files.

esbuild bundles JavaScript, CSS and PeerJS locally. Production builds remove demo-only behavior and have no runtime CDN script imports. The ZIP has a fixed allowlist, root-level manifest and fixed timestamps; unchanged inputs produce identical bytes on the same Node/zlib toolchain. See [extension packaging](CHROME-EXTENSION.md#build-from-source).

## Source map

| Files | Responsibility |
| --- | --- |
| `src/main.js` | Mounts UI, connects controllers, handles room/call lifecycle. |
| `src/userscript.js`, `extension/content.js` | Userscript and extension entry points for the shared app. |
| `src/room.js` | PeerJS connections, membership, host forwarding, policies and history. |
| `src/room-auth.js`, `src/wire.js`, `src/protocol.js` | Admission proofs, frame bounds/encoding, validated protocol fields. |
| `src/player.js`, `src/media.js` | Player sync, buffering policy, media metadata and comparison. |
| `src/calls.js`, `src/hold-to-talk.js` | Device tracks, call admission, media connections and talk controls. |
| `src/chat-scroll.js`, `src/chat-previews.js`, `src/quick-reply.js` | Chat scrolling, preview queue and shared reply draft. |
| `src/layout.js`, `src/layout.css`, `src/style.css` | Reserved player space, sidebar/call strip and common styles. |
| `src/appearance.js`, `src/themes.js`, `src/themes/` | Appearance controls, persistence and modular themes. |
| `extension/toolbar.js`, `extension/popup.*` | Narrow status/open-panel messaging and toolbar UI. |
| `scripts/`, `tests/`, `demo/` | Build/dev tooling, checks and browser fixtures. |

Themes are separate modules containing light/dark palettes and scoped CSS. They should never change room or media logic. Keep Minimalism as the fallback, and follow the [theme authoring guide](src/themes/README.md).

## Connections and cost

SWaP has no developer-operated application backend to deploy, but servers still participate:

| Component | Role |
| --- | --- |
| PeerJS signaling | Introduces browsers and exchanges connection metadata. Public PeerJS service is the default. |
| STUN / TURN | Discovers routes; TURN relays encrypted WebRTC traffic when direct connections cannot be established. Bundled defaults include Google STUN and shared PeerJS TURN endpoints. |
| Host tab | Coordinates playback and forwards chat through data channels; keeps bounded recent history in memory. |
| Call participants | Exchange media using a mesh: each of N participants sends to N−1 others, directly or through TURN. |
| Cinemeta | Best-effort title/description lookup from a public IMDb/type ID, omitting credentials and referrer. |
| GitHub | Distributes release files and userscript updates; it does not run the live room. |

There is no SWaP fee or configured UI participant cap. Bandwidth, CPU, host resources, public service availability and relay quotas limit real rooms. Large all-camera calls need a different architecture, such as an SFU, and funded infrastructure; they are not an existing promise.

Optional **Connection settings** accept validated PeerJS JSON before joining. All participants using a custom signaling server must use matching server settings. Use trusted signaling infrastructure and authorized, preferably short-lived relay credentials. Settings are stored in same-origin sessionStorage for that tab; this is not a secret vault. The shared upstream TURN values are public library defaults, not the repository owner's personal keys.

For the underlying mechanisms, see [PeerJS's connection guide](https://peerjs.com/client/getting-started) and [WebRTC's TURN guide](https://webrtc.org/getting-started/turn-server). For accepted configuration and validation, inspect `parseOptions` in `src/protocol.js`.

## Security boundaries

Read [SECURITY.md](SECURITY.md) before changing network, metadata or device code. Key properties to preserve:

- Random room codes are invitation secrets. Discovery IDs are derived separately; both endpoints prove code possession before roster, chat/history or playback data is shared.
- Current membership, active-call status and recipient call capabilities gate media offers. Authorization is tied to the admitted connection, not just a claimed name or ID.
- Frames and queues are bounded; fields are validated and projected explicitly. Render remote names/messages as text, never HTML.
- Share selected playback metadata, not raw stream/addon URLs, authorization headers or account tokens. Label sanitization is heuristic and must not be treated as perfect secret detection.
- Capture is opt-in. Camera off stops/removes video tracks; hangup stops both camera and microphone tracks. Guard asynchronous permission callbacks after leaving.
- Room shutdown clears keys, capabilities, timers, history and connections. UI minimization must not masquerade as capture shutdown.

WebRTC encrypts transport, but the signaling service remains trusted: the room authentication transcript is not bound to DTLS certificate fingerprints. It does not defend against an actively malicious signaling service relaying proofs while substituting endpoints. Invited members can share their code or record media; display names are not verified identities.

The extension uses a top-level, isolated content script on Stremio Web only, with no additional Chrome API permissions, background worker, external messaging or remote runtime code. Its toolbar accepts exact, internal status/open commands. The userscript runs in the page context with `@grant none`. Both share Stremio's DOM and same-origin preference storage; neither protects against a compromised page/browser. Legacy `sidekick-*` keys and the mount marker remain for compatibility.

## Make and verify changes

1. Keep app logic shared between the userscript and extension. Maintain the small adapter boundary.
2. Run meaningful tests for affected behavior, then `npm test`, `npm run build` and `npm run test:package` for a release.
3. Exercise affected flows in the demo, then the installed extension on Stremio where isolation, autoplay, real devices or layout matter. Never count a synthetic fixture as a physical device test.
4. Record what was actually tested in [TESTING.md](TESTING.md). Different-network calls, acoustic echo, physical LEDs and capacity need direct evidence.
5. Keep browser profiles, credentials, live room codes, private playback URLs, camera screenshots and personal logs out of commits and release files.

Tests cover admission/replay rejection, frame/resource bounds, call membership, buffering and drift, stream comparison, track cleanup, hold-to-talk, chat queues/replies, themes and package/popup boundaries. They are guardrails, not an independent security certification.

## Release maintenance

- Keep `package.json`, its lockfile root version and `extension/manifest.json` in agreement. Rebuild the userscript and extension.
- Update installation links, changelog, verification notes and `versions.json` checksums. Archive releases with successive commits/tags of the same `SWaP.user.js`; never rewrite historical tags.
- Check ZIP contents against the allowlist and scan publication files, unpacked assets and Git history for secrets. Check dependency advisories and preserve third-party notices.
- Upload the ZIP/checksum, userscript and notices to the matching GitHub release. Verify downloaded assets match the local build.
- Chrome Web Store publication is a separate registration, listing and review process; generating a valid ZIP is not store approval. See [store next steps](CHROME-EXTENSION.md#chrome-web-store-next-steps).

[Privacy notice](PRIVACY.md) · [Security review](SECURITY.md) · [Version history](VERSIONS.md) · [MIT license](LICENSE)
