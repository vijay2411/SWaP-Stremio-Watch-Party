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
