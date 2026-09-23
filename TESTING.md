# SWaP 4.1 extension verification

Executed 2026-09-24. Room protocol 4 and the shared watch-party logic are unchanged; the new work adds extension/userscript adapters and packaging.

## Automated checks

- `npm test`: **109 passed, 0 failed** (the existing 103 plus six extension/ZIP tests).
- `npm run test:package`: **4 passed, 0 failed** against the generated release files.
- `npm run build`: generates both distributions successfully. Two consecutive extension builds produced identical ZIP SHA-256 values on the installed toolchain.
- `unzip -t`: all 12 allowlisted ZIP files pass. Package checks independently inflate entries, verify CRC/size/contents, check the central-directory boundary, and require `manifest.json` at the archive root.
- Manifest checks require one top-level Stremio match, ISOLATED world, version agreement, packaged icons of the declared dimensions, and no extra Chrome API permissions/background/external messaging/web-accessible resources.
- Toolbar tests reject wrong extension IDs, page senders, extra message fields and unknown commands. Popup tests exercise a supported Stremio tab, an unavailable content script, duplicate installs, active rooms and fixed open-panel messaging using the tab ID without URL/history access.
- Production bundle checks exclude demo signaling overrides, userscript headers, source maps, `eval`/`new Function` and popup remote script imports/inline handlers. PeerJS contains a standard `127.0.0.1` SDP origin string; this is not the demo signaling override.
- Gitleaks 8.30.1, redacted output and inline allow-comments disabled: no findings in the publication tree plus unpacked ZIP payload or the preceding 11-commit history. All 11 previous tagged userscripts still match `versions.json`.

## Live extension checks

Pending. Native browser automation lost access to the installation window before a successful load of the extension folder could be verified. No claim of successful installation, toolbar operation or live Stremio playback is made from this attempt.

Before treating this as a store-ready release, install the actual `dist/chrome-extension/` build and check:

1. Chrome accepts the manifest and shows version 4.1.0 with no extension errors.
2. Disable the old userscript, reload Stremio, and verify one Watch together button. The toolbar opens the sidebar; an unrelated tab only offers Open Stremio.
3. Create/join a room in separate tabs; verify chat, compact replies, themes and folded defaults. An additional separate room must receive none of that room's messages/controls.
4. With a playable matching stream on each end, verify play/pause/seek, mismatch warnings and a buffering hold that releases by 20 seconds.
5. Deliberately join calls with permission; verify received audio/video, camera-off release, hold-to-talk and cleanup on leave/end. Repeat across different networks/devices.

The earlier local demo checks below test the shared app in the page context. They do not prove Chrome extension isolation, popup wiring, native device indicators or public signaling/TURN reliability. Demo page synthetic-media overrides do not affect an isolated extension content script; never assume they suppress real hardware capture there.

---

# SWaP 4.0 verification

Executed 2026-09-23. The checks below describe what was actually run, not a claim that every browser/network is covered.

## Automated checks

`npm test`: **103 passed, 0 failed**.

Coverage includes:
- Same-room mutual authentication; incorrect room key against the correct discovery address; no roster/history before admission; replay rejection; stale/forged connection rejection; shutdown during WebCrypto work.
- Invalid/binary/oversized/multibyte frame rejection; per-guest traffic limiting without disconnecting a busy aggregated host channel; bounded multilingual history replay.
- Call capability/current membership/active-call checks; capability and key cleanup.
- Matching title/duration controls; buffering waits, stale peers, timeout/recovery, autoplay rejection, no feedback loops, end-of-file and mismatched/live streams.
- Camera track release and permission races; hold-to-talk; chat auto-scroll; queued notification lifetimes/cadence; compact reply drafts, Enter/composition and failed sends.
- All 11 theme palettes in both modes, storage failures and layout target selection.

`npm run build`: passed. The distributable is bundled and demo-only behavior is compiled out. The checksum manifest links archived scripts to their original bytes.

The loopback HTTP check returned 200 for the demo and 403 for project files, `.env`, traversal attempts and a forged Host header. A clean `npm ci` and rebuild reproduced the distributable checksum.

`npm audit --json`: zero known vulnerabilities at the time of this review.

Gitleaks 8.30.1 scans: all historical scripts, final publication tree, and complete Git history are checked before publication, with redacted reports kept outside the repository. See SECURITY.md for scope and caveats.

## Browser checks

Chrome, local Stremio-shaped demo, loopback signaling, real WebRTC, explicit synthetic camera/microphone fixtures:

- Host creation and guest join succeed with the new admission exchange.
- Chat round-trip succeeds; an HTML-like payload remains literal text.
- Both participants receive the other’s synthetic video. Guest camera off shows **Camera off**, reduces its active synthetic cameras to zero and retains the microphone.
- Playback starts and guest buffering shows **Waiting for [guest] · 20s remaining**. Recovery allows playback to proceed.
- A separately created room remains at one member, receives zero messages from the first room and keeps its movie at 0 seconds.
- Twelve consecutive fixture messages arrive. Quick reply sends from the same folded bar; measured bar height is **46px**, width approximately **494px**, with the full sidebar hidden.
- Room options, Stream details and Everyone’s playback remain folded by default.
- End room requires confirmation; confirming returns the guest to the lobby and stops its call.
- No warnings/errors were recorded in the two participating tabs during these checks.

## Limits

These checks do not constitute an independent penetration test. The new build has not been exercised on installed Tampermonkey across every Stremio layout, restrictive cross-network NAT/TURN combinations, real camera LEDs, physical speaker echo, large calls, mobile or native video fullscreen. The local demo uses public ICE defaults even with local signaling. A responsive viewport override in older QA did not actually change the viewport, so it is not counted as mobile verification.

To repeat locally:

```sh
npm ci
npm test
npm run build
npm run demo
```

Open `http://127.0.0.1:9000/demo/stremio-layout.html?local=1&synthetic=1` in multiple tabs. Create two separate rooms and join another tab to one room; verify that only the intended room receives its chat/playback/calls. Synthetic fixtures are demo-only. Leave rooms and close test tabs when finished.
