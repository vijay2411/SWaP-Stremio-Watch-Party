# Security & privacy review

Review date: 2026-09-23. Extension packaging review: 2026-09-24. Current supported version: **SWaP 4.1.0** (room protocol 4 unchanged). Older Sidekick tags are historical, unsupported snapshots and do not have the protections added here.

This is a first-party source/dependency review with targeted adversarial tests and local browser checks. It is not an independent penetration-test report, formal verification, or a guarantee that vulnerabilities cannot exist. No third-party service was attacked.

## Threat model

The intended audience is private groups of trusted friends. An outsider may know a public PeerJS ID, run a modified client, send malformed packets, attempt to impersonate an existing peer, or replay an observed authentication proof. A member of another room should not thereby gain access to this room’s messages, playback controls, camera or microphone.

Possession of a **room code grants membership**. There is no named-account identity verification, join approval, kick/ban list or protection against an invited member sharing the code. The host is trusted with chat history, playback authority, the roster and call admission capabilities. An invited participant can record or retransmit what they receive.

Browsers, Stremio and its origin, the userscript manager, installed extensions, the installed SWaP build/update source, and signaling infrastructure remain trusted. In particular, an actively malicious signaling service could relay authentication between real endpoints while substituting WebRTC endpoints. The admission exchange is not bound to DTLS certificate fingerprints and does not provide protection against that active man-in-the-middle attack. Use signaling infrastructure you trust; this release does not claim end-to-end identity verification independent of signaling.

## Findings and changes

| Finding | Previous behavior | SWaP 4.0 response |
| --- | --- | --- |
| Room invitation exposed in discovery ID | Sidekick encoded the room code directly in the PeerJS host ID and admitted a connection knowing that address. Signaling observers could obtain the invitation. | Domain-separated SHA-256 discovery ID; mutual HMAC-SHA-256 challenge-response before any roster, history or playback data. The code is not sent in signaling metadata or handshake messages. |
| Calls lacked a room capability | Incoming calls checked a roster Peer ID and protocol version. | Also require active call membership and a random 256-bit recipient token from the authenticated roster. Tokens rotate with room participation and are erased on leave. |
| Guest identity check was incomplete | Application handlers checked a member ID without checking the exact admitted connection. | Match the connection object held for that member before accepting any action. Chat authors come from the admitted connection. |
| Packet parsing and field bounds | JSON parsing happened inside PeerJS before application checks; some received fields were copied wholesale. | Raw transport; check type and byte length before JSON parsing; explicit chat-field projection, bounded identifiers and frame sizes. |
| Large join history | A welcome could contain the entire history in one frame. | Separate frames; replay recent history in order up to 100 messages / 128 KiB. |
| Development file exposure | Loopback demo could serve project files beyond the intended demo. | Explicit public-file allowlist, Host-header validation, GET/HEAD only and symlink-escape rejection. No change to production hosting is needed. |

### Admission details

Twelve cryptographically random symbols provide approximately 59 bits of invitation entropy. The browser generates codes without modulo bias. Codes are ephemeral shared secrets, not long-term 128-bit encryption keys; a discovery hash permits offline guessing if a code is weak or leaked. The normal UI only generates random codes. Keep them private and do not post room screenshots containing them.

The HMAC transcript includes the protocol, distinct host/guest roles, both peer IDs, two fresh nonces, the guest display name and call capability. Both endpoints must prove knowledge of the same code. A fresh challenge prevents replay of a previous proof on a new connection. WebCrypto supplies the cryptographic primitives, and imported HMAC keys are non-extractable. This application authentication augments WebRTC transport encryption; it is not a reviewed standalone cryptographic protocol or a PAKE.

Unauthenticated connections have a 10-second deadline, at most 16 pending admissions per host, and at most 2 KiB per handshake frame. Admitted guest frames are limited to 16 KiB, host frames to 64 KiB. Guests are limited to 30 application frames per second; the host’s aggregated room stream is not subject to that per-person limit. Outbound queued data is capped. These bounds reduce application-level abuse, but native WebRTC/signaling work happens before admission, so denial of service is still possible. This is not infrastructure for untrusted public rooms.

Call capabilities are shared with room members through authenticated data channels and accompany call offers in signaling metadata. They are admission tokens, not media encryption keys; the signaling operator can observe them. Current membership is also required, and local camera/mic capture is opt-in. Do not interpret a display name as verified identity.

## Data flow and device access

| Data | Destination / storage |
| --- | --- |
| Chat and names | Room host and room members; up to 100 messages in host memory, bounded recent history shared with new members. |
| Playback metadata | Room: title/episode ID, title/description, time/duration, readiness, source/release labels, and a room-salted fingerprint when available. |
| Camera/microphone | Other call participants only after local opt-in, directly or via TURN; browsers encrypt transport. |
| Connection metadata | Signaling/STUN providers and participating peers; direct WebRTC can reveal IP addresses. TURN relays encrypted packets. |
| Metadata lookup | Cinemeta receives a public IMDb title/type ID; request credentials and referrer are omitted. |
| Preferences | Same-origin localStorage: display name, theme, color mode, talk key. Legacy `sidekick-*` keys are retained. |
| Optional server/relay settings | Same-origin sessionStorage in that tab. Use short-lived relay credentials when possible. |
| Script/update download | GitHub receives normal download request metadata. Updates execute code in the Stremio page context, so trust/review the source. |

The script does not read Stremio account tokens or cookies. Raw stream URLs, addon configuration URLs, authorization headers and source authentication fields are not broadcast. Stream-route parsing is bounded; allowed display metadata is selected explicitly. URL/credential-looking labels are filtered, but heuristic redaction cannot recognize every secret a third-party addon might put into an ordinary title or filename. Do not put credentials in display names, chat or media labels.

Chat, notifications and remote names use text rendering, never remote HTML. There is no `eval`, remote script import, shell, remote desktop, screen capture, filesystem access or file-transfer feature in SWaP. The userscript matches only `https://web.stremio.com/*`, uses `@grant none` and does not run in frames. `@grant none` is not an isolation guarantee: the script still has page-context privileges, and malicious same-origin code/extensions can compromise data. Same-origin storage is not a secure vault.

Camera off stops and removes SWaP’s local video tracks; hangup stops microphone and camera tracks. Late permission/stream callbacks are guarded after leaving. Other tabs/apps can independently keep a device active. Audio mute/hold-to-talk keeps the microphone acquired while muting transmission; leaving the call releases it.

## Chrome extension boundary (4.1)

The Manifest V3 extension bundles code locally and injects only into top-level `https://web.stremio.com/*` pages in the ISOLATED world. It requests no extra Chrome API permissions and has no background worker, external messaging, remote code loading or web-accessible resources. Its popup sends only fixed status/open-panel messages; the receiver checks the extension ID, exact popup URL and message shape. No room/chat/call data is exposed through that channel. Unit tests cover rejected senders and commands, and package checks cover the manifest, executable bundle and ZIP allowlist.

Page scripts cannot ordinarily access isolated JavaScript variables, but the DOM and same-origin storage remain shared. The extension does not turn legacy localStorage/sessionStorage into a secure vault. Device access and room trust boundaries remain as described above. A malicious page can manipulate the player/UI; a mount marker prevents accidental duplicate instances, not intentional page interference.

## Credentials and publication hygiene

The publication includes only product source, tests, demo fixtures, documentation, locked dependencies and compiled userscripts, extension assets and an allowlisted release ZIP. Browser profiles, `.env` files, session/connection settings, local output/logs, local source archives and unrelated workspace projects are excluded. The CLI’s GitHub authentication is used to push; its token and local authentication files are not copied into the repository. Commit metadata uses the owner’s GitHub noreply address.

All 11 historical script files were scanned before import with **Gitleaks 8.30.1**, using the default rules, redacted output and inline allow-comments disabled: **no findings**. There are 10 distinct versions because the two v2.0.1 files are byte-identical. The final publication tree and complete Git history are also scanned before push. A separate pattern review checks private keys, common provider/GitHub tokens, JWTs, credential-bearing URLs, local home-directory paths and private contact strings. No personal credentials were detected in the publication payload; scanning cannot prove that every conceivable secret is absent.

PeerJS 1.5.5 bundles public shared TURN access values and a public signaling API label. These are upstream service defaults, not the repository owner’s personal API keys. Test values use `.example`/`.invalid`, obvious placeholders or synthetic data. Third-party library authors’ license notices are preserved.

`npm audit` reported **0 known vulnerabilities** across the pinned production/development dependency tree on the review date. This is a point-in-time database result, not a guarantee against unknown vulnerabilities.

## Verification and remaining limits

[TESTING.md](TESTING.md) records executed checks. Security tests include wrong-room keys targeting the correct address, refusal to share history before admission, replayed proofs, substituted connection objects, invalid/oversized frames, unauthorized calls, asynchronous shutdown and bounded multilingual history. Existing tests cover text-only previews, URL exclusion, camera-track release, permissions, sync, buffering and room lifecycle.

Local browser tests use actual WebRTC with synthetic media and a local signaling server. Separate rooms, admitted calls, chat and controls were exercised. This review did not independently audit browser/WebRTC/PeerJS internals, the production signaling/TURN operators, all Stremio addons, or every network/device. Cross-network reliability, mobile/narrow-window layouts, real hardware indicators, acoustic echo cancellation and large-room capacity need further real-world testing.

## Reporting a vulnerability

If this repository offers **Security → Report a vulnerability**, use that private channel. Otherwise open an issue requesting a private reporting channel, without exploit details, live room codes, account tokens or personal logs. Do not publish other people’s data in an issue. Reports should identify the affected version and provide a minimal reproduction using synthetic data.
