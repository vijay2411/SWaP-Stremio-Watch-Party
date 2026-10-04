# SWaP 4.2.6 folded-bar dragging verification

Executed 2026-10-04.

- **139 automated tests and 4 package checks passed.** Eight new cases cover click/drag separation, accidental activation, screen-edge bounds, preview placement, composer growth, viewport resize, cancelled drags, excluded input/right-click/other-pointer events, optional storage, keyboard movement and reset.
- In the browser, dragging from both Watch together and Reply moved the folded bar without opening either control. Subsequent ordinary clicks worked; a quick reply from the moved bar reached the other room participant.
- Dragging to the upper-left clamped the bar to (12,12). Opening the reply composer kept it inside the viewport. At a 390 px viewport, the composer measured 366 px wide with 12 px margins; the viewport override was restored afterward.
- A burst of 12 incoming messages remained in the chat. During the queue, compact previews sat below the bar near the top edge and moved above it when the bar was dragged toward the bottom-right, leaving an 8 px gap.
- Fullscreen entry/exit kept the bar visible; Alt + Up moved it 16 px. The lobby bar restored the exact tested position (965.72,602) after refresh. Home cleared its inline positioning and restored the default center.
- The temporary room was ended; no camera or microphone hardware was activated. These checks used the shared application in a local Stremio-shaped fixture, not the installed extension on a live stream.

The drag behavior is shared by both packages. Room/call logic and Chrome permissions are unchanged. The failed relay test and pending real-world voice checks documented for 4.2.5 below remain unresolved; this UI patch does not clear the store-publication hold.

---

# SWaP 4.2.5 call reliability verification

Executed 2026-10-04. This is a call reliability patch, not approval to submit to the Chrome Web Store.

## Automated checks

- **131 tests, zero failures; 4 extension package checks passed.** Fifteen new regressions exercise media-offer/roster ordering, bounded pending calls, missing consent, outsiders/wrong tokens/protocol, token revalidation, incoming-PC setup timing, stream-before-ICE timeout, temporary/prolonged disconnect, unopened-call cleanup, audio-only upgrade, stale call events, retries and matching-warning cleanup.
- Security checks still reject unauthorized members and incorrect room capabilities. Pending offers are not answered until the admitted member is marked active, and are closed after eight seconds, local hangup or member departure.
- Gitleaks 8.30.1 found no secrets in the source export and unpacked extension (redacted scan). The production dependency audit reported zero known vulnerabilities. All 19 userscript hashes match the version manifest, preserving all 18 prior tags.
- Userscript and extension were rebuilt from shared source. Room protocol 4 and Chrome permissions are unchanged. Both friends should update to 4.2.5 so both ends include the fixes.

## Real WebRTC browser checks

The new development fixture uses the production Room/Calls classes in separate PeerJS instances, with generated video frames and non-silent audio tones. Tests ran with loopback signaling and public PeerJS signaling. They use one device/browser; they do not simulate separate physical networks. Remote audio is measured through a silent Web Audio analyser, with RTP byte counts and decoded video frames also checked. The test tone is never connected audibly to speakers.

Passed:

- Deliberately delay a guest's active-call announcement by 1.5 seconds: the media offer arrives first, waits, and connects without the old 18-second warning.
- Two-way received audio signal and increasing decoded video frames. Muting produces a near-zero received signal; unmuting restores it.
- Camera off ends/removes its local video track while audio continues; camera on restores received video.
- Five alternating host/guest hangup/rejoin cycles per suite run, verifying received media and that old captured tracks ended.
- Audio-only in both directions without a video track; adding a camera reconnects and delivers video.
- Three-person call: all six incoming audio paths, four video paths with one participant remaining audio-only, and one media connection per pair.
- Forced closure of a media peer connection recovers automatically and received audio/video resume.
- Chat and playback-state transport remain functional during the call. A separately created room receives none of the tested room's chat or calls.
- Ending the host room closes the other participants' calls; all 20 generated tracks per completed suite run end and no call/pending-offer/watch entries remain.

Two additional browser tabs exercised the actual shared-app and extension-adapter interfaces: video/audio-only join, Hold to talk selection and button release, camera-off labels on the other tab, audio-only-to-video upgrade, Sound off, Hide/Show during an active call, leave/rejoin and confirmed room end. Both tabs reported zero active synthetic cameras/microphones afterward. This adapter fixture is not a live installed-extension test.

## Failed relay check — publication remains on hold

With public default TURN routing forced (`iceTransportPolicy: relay`), the guest could not establish the room connection. Separate 15-second UDP and TCP probes of the bundled PeerJS TURN endpoints each returned **zero relay candidates and ICE error 701**. This is evidence that the fallback did not work from this test environment; it does not distinguish a service outage, DNS/network filtering or browser/environment restrictions, and does not prove a global outage.

Default-route success cannot establish arbitrary-network reliability. No relay provider or private credentials were added. Before store submission:

1. Install/reload 4.2.5 on both ends and test a real Stremio call between different devices/networks, including audio-only, camera off/on and repeated rejoin.
2. With headphones, verify speech in both directions, mute/hold-to-talk and leaving. Acoustic echo suppression, physical camera LEDs and hardware-device quality were not measured in these synthetic tests.
3. Verify an authorized working TURN path for restrictive networks. Re-run the relay test with that service; do not treat the current public fallback as verified.

The current patch has not been re-tested on the installed extension with real camera/microphone hardware. Earlier hardware tests below apply to their recorded older versions. Store submission has not occurred.

Repeatable instructions are in [DEVELOPING.md](DEVELOPING.md#repeatable-call-reliability-checks).

---

# SWaP 4.2.4 store preparation checks

Executed 2026-10-04.

- **116 tests and 4 package checks passed.** The extension ZIP contains only its allowlisted runtime files; store/demo HTML and artwork are not included.
- Three browser screenshots show the current shared application at 1280 × 800: Minimalism dark lobby, an actual two-tab room/chat exchange, and Pixel art light. Participants/messages are fictional. No camera/microphone was opened. The room and temporary tabs were closed afterward.
- Validated all three screenshot JPEGs as RGB 1280 × 800; small promo as RGB 440 × 280; marquee as RGB 1400 × 560; store icon as RGBA 128 × 128 with artwork bounds (16, 16)–(112, 112). The listing icon is identical to the packaged 128 px icon.
- The 16/32/48 px toolbar assets, shared application source, extension access and room protocol are unchanged from 4.2.3. The privacy notice clarifies existing behavior.

The store kit and reviewer instructions do not claim completed Google review. A clean-profile reviewer walkthrough with playable Stremio content, cross-network calls, and the earlier documented real-stream/device checks remain to be completed before broad public rollout.

---

# SWaP 4.2.3 icon verification

Executed 2026-10-04 in the local browser fixture.

- The shared header/launcher SVG uses the toolbar PNG generator’s 128 px geometry: rounded badge, filled camera, side lens and play triangle.
- All **22 theme palettes** (11 themes × light/dark) kept the same geometry, rendered without unwanted outline strokes, and kept contrasting camera/play colors.
- Visually checked the Pixel art header and folded launcher. The header fits a 320 px viewport; the folded launcher uses the identical logo shape.
- **116 tests and 4 extension package checks passed.** Both distributions were rebuilt. Chrome permissions, room protocol and toolbar PNG assets are unchanged.

This visual check used the local shared-app fixture, not an installed extension on a live Stremio page.

---

# SWaP 4.2.2 Join-button verification

Executed 2026-10-04 in the local Stremio-shaped browser fixture.

- Reproduced the reported Pixel art “Joi / n” split using the opt-in `?local=1&synthetic=1&hostcss=1` fixture. It applies inherited page typography and `word-break: break-all` to the shadow host. Before the fix, the button was 68 px tall beside a 47 px room-code field; afterward both were 47 px tall.
- **66 browser layout checks passed:** all 11 themes in light and dark mode at 1280, 390 and 320 px viewport widths, with the inherited wrapping stress enabled. Join stayed on one line, the row did not overflow, and the input retained usable width.
- Clicking Join connected a second fixture tab to a local WebRTC room and displayed “In sync · room paused”. The test room was ended afterward; no camera or microphone was started.
- **116 tests and 4 extension package checks passed.** Both distributions were rebuilt from the shared CSS, with unchanged Chrome permissions.

These are local browser fixture checks. This patch has not been visually rechecked on the installed extension in a real Stremio tab. Earlier live tests and their limitations are recorded below.

---

# SWaP 4.2.1 follow-up verification

Executed 2026-10-04 using the Stremio-shaped browser fixture, real local WebRTC and synthetic media. This follow-up found and fixed a fullscreen layout bug; the released 4.2.0 tag remains unchanged.

- **116 tests and 4 package checks passed.** New regression checks select the common fullscreen player shell and restore it on exit even when resize fires before fullscreenchange.
- Before the fix, a 1512 px fullscreen viewport gave the movie 1142 px beside the sidebar, but the pause control extended to 1492 px and controls/subtitles were obscured. After the fix, all player layers stay inside the same 1142 px viewing area. Existing player DOM children are not moved.
- A synthetic call’s folded strip reserves 112 px at the top of fullscreen while preserving the bottom controls. Leaving the call restores the full 1512 × 949 movie area. Exiting fullscreen restores the normal common shell: in a 1280 px viewport the movie is 910 px wide and the rightmost control ends at 890 px, clear of the sidebar.
- A guest with a 2:00 duration against the host’s 1:00 duration sees the edition warning and remains paused while the host plays. Restoring the matching duration resumes synchronization. Different release labels produce the expected warning without falsely claiming file identity.
- Two guests sent 12 messages each while the host was folded. All **24 messages** arrived from both senders; all 24 previews appeared and expired. Measured intervals were **2.000–2.006 seconds**, lifetimes **5.000–5.006 seconds**, with at most **3** simultaneous previews.
- The full buffering timeout displayed the guest’s name, waited, then resumed with “Continuing without …”. The 20-second policy measured **20.999 seconds** between rendered wait/continue states because player status is checked once per second. It is not a hard real-time 20-second deadline.
- Host/guest rooms were ended, all synthetic camera/microphone counters reached zero, temporary tabs were closed and the viewport override was reset. No real hardware capture was used in this follow-up.

The fullscreen patch was exercised in the local player-container fixture; it has not been re-tested on an installed extension with a real Stremio stream. Earlier installed-extension checks are recorded below. Native video-element/OS fullscreen, different networks/devices, physical LEDs, acoustic echo and large-call capacity remain outside this follow-up’s verification.

---

# SWaP 4.2.0 verification

Final checks executed 2026-10-04. This is a userscript and unpacked Chrome extension preview; Chrome Web Store publication is separate.

- `npm test`: **114 passed, 0 failed**. Extension checks cover authorized status/show/hide commands, rejected senders/extra fields, status-data projection, per-tab visibility across reloads, restore, blocked storage, duplicate installs, active-room wording and failed messaging.
- `npm run build` and `npm run test:package`: passed, with **4 package checks**. No added permissions; extension-only visibility storage/messaging is absent from the userscript bundle.
- In the local shared-app browser demo, the collapsed launcher, 494 px horizontal reply bar and 440 px notification area are centered on the content viewport. The reply bar remains 46 px tall; a 390 px viewport override fits it horizontally. The viewport override was restored afterward.
- Two demo tabs exchanged a centered quick reply. A burst of 12 received fixture messages displayed compact previews above the centered bar.
- The extension-adapter browser fixture verified lobby Hide/Show and reload persistence, a connected room receiving all 12 guest messages while hidden, no visible hidden previews, and preservation of the reply draft. Showing restored the sidebar with the complete chat; a hidden guest stayed hidden after the host ended the room and could then restore the lobby.
- With synthetic devices, hiding an active call removed all SWaP UI and released reserved player space: at a 520 × 852 viewport the movie changed from a 383 px docked height (704 px under the folded call strip) to the full 852 px. The synthetic call remained active while hidden; Leave call released both tracks. All local fixture rooms/calls were ended and their tabs closed.
- The installed extension was updated to **4.2.0** in desktop Chrome and reloaded on real Stremio Web. Its centered launcher was visible. The actual toolbar Hide/Show worked from the lobby, hid both launcher and sidebar, stayed hidden after a tab reload, and restored the sidebar.
- In a temporary live room, the popup showed the active-room warning; Hide kept the room connected and Show restored its controls. No real camera or microphone was activated during these 4.2 checks. The temporary live room was ended and Stremio was left with the centered launcher folded.

- `npm audit`: **0 known vulnerabilities** on 2026-10-04. Gitleaks 8.30.1 found no secrets in the publication tree (including unpacked release files) or preceding 15-commit history, with redacted output and inline allow-comments disabled. All 13 prior tagged userscripts match their recorded hashes.

Earlier 4.1.1 tests below cover public-signaling multi-tab playback/chat and a real hardware call. The 4.2 checks target visibility/layout; they do not repeat every older feature or prove different-network reliability, physical camera LEDs, acoustic echo suppression, native video fullscreen or large-call capacity.

---

# SWaP 4.1.1 extension verification

Executed 2026-09-24. The installed Manifest V3 extension was tested on real Stremio Web in desktop Chrome. Initial checks used 4.1.0; the chat retry fix, room isolation and hardware-call checks used 4.1.1 after reloading the extension and participating tabs. Room protocol 4 is unchanged.

## Automated checks

- `npm test`: **110 passed, 0 failed**. The new regression checks that successful retries from either composer clear the stale send error while preserving an unrelated call-audio notice.
- `npm run test:package`: **4 passed, 0 failed** against the generated release files.
- `npm run build`: generates the userscript and extension successfully. Repeated extension builds produce identical ZIP SHA-256 values on the installed toolchain.
- All 12 allowlisted ZIP files pass integrity checks. Package tests independently inflate entries, verify CRC/size/contents, check the central-directory boundary, and require `manifest.json` at the archive root.
- Manifest checks require one top-level Stremio match, ISOLATED world, version agreement, packaged icons of the declared dimensions, and no extra Chrome API permissions/background/external messaging/web-accessible resources.
- Toolbar tests reject wrong extension IDs, page senders, extra message fields and unknown commands. Popup tests exercise a supported Stremio tab, an unavailable content script, duplicate installs, active rooms and fixed open-panel messaging using the tab ID without URL/history access.
- Production bundle checks exclude demo signaling overrides, userscript headers, source maps, `eval`/`new Function` and popup remote script imports/inline handlers. PeerJS contains a standard `127.0.0.1` SDP origin string; this is not the demo signaling override.
- Gitleaks 8.30.1 with redacted output and inline allow-comments disabled: **no findings** in the publication tree, unpacked ZIP or preceding 12-commit history. All 12 previous tagged userscripts and the current script match `versions.json`. A separate private-identifier/path scan also found no matches. No browser data, room codes, private stream URLs or camera screenshots are included in the publication.

## Live installed-extension checks

Two tabs in the same Chrome profile, a playable matching stream, public default signaling and actual WebRTC:

- Chrome shows the installed extension as 4.1.1 after the update, with Stremio-only site access and no extension error button observed.
- One SWaP interface appears on Stremio. The toolbar opens its sidebar; an unrelated tab offers Open Stremio instead.
- Room-code join succeeds. Bidirectional chat arrives, and HTML-like chat remains literal text.
- Rapid sends trigger the existing 500 ms per-sender rate limit and preserve the unsent draft. In 4.1.0 the sidebar warning stayed visible after a successful retry. In 4.1.1, the same reproduction clears that warning and delivers the retry.
- Host play/pause controls synchronize both players. A guest cannot control playback in host-only mode. Changing the active room to shared control enables guest playback control and propagates guest play to the host; host-only mode can be restored.
- A loading guest displays a named buffering wait with a 20-second countdown and recovers to a synchronized paused state. The full timeout was not timed in this browser session; automated tests cover timeout/recovery.
- Matching title, duration and source labels display, with the explicit qualification that file identity is unavailable. Stream details include the movie description link without exposing the private stream URL in the SWaP UI.
- Compact notifications appear while folded; quick reply sends from the horizontal bottom bar. Opening the sidebar reserves movie space, and folding it lets the movie expand. Minimalism light/dark modes are readable.
- Room options, Stream details and Everyone's playback are folded in a new room. End room requires confirmation; cancel retains the room and confirming returns the guest to the lobby.
- Two separately created rooms retain separate chat and playback state; a message in the second room does not appear in the first.
- With explicit user permission, both test tabs join a real camera/microphone call. A received remote video is visible, and participant pinning enlarges its tile.
- Camera off replaces the corresponding local and remote video with **Camera off**. Both cameras were switched off. Muted/hold-to-talk microphones remain acquired by design; this is distinct from leaving a call.
- The hold-to-talk mode and configured key are available. Its on-screen hold button was clicked and released; keyboard release/focus-loss behavior is covered by automated tests.
- Echo cancellation and noise suppression report enabled. Their acoustic effectiveness was not measured; both test microphones were muted to avoid same-device feedback.
- Folding an active call shows the compact top call strip with reserved movie space and the bottom reply bar.
- Leaving each call removes its Chrome camera/microphone recording indicator. The temporary guest tab is closed, test rooms are ended, and the original player is left paused with its prior display name restored.

## Remaining verification

These checks do not prove arbitrary-network connectivity or unlimited room capacity. Repeat on different devices/networks, including restrictive NAT/TURN configurations and larger calls. Physical camera LED release, received audio quality, acoustic echo suppression, mobile/narrow-window layouts and native video fullscreen still need real-world verification.

The installed-extension session did not time a full 20-second buffering timeout or a sequence of queued notifications at two-second intervals, nor induce every title/duration mismatch. Those behaviors have automated coverage; the earlier demo checks below provide additional browser evidence. This session is not an independent penetration test.

Demo page synthetic-media overrides do not affect an isolated extension content script; never assume they suppress real hardware capture there.

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
