# SWaP — Stremio Watch Party

**Your friends. One room code. Movie night.**

Bring the Netflix-party experience to [Stremio Web](https://web.stremio.com/): watch in sync, chat, and hop on a video call.
Create a room, share the code, and press play together. Free, with no SWaP account or server setup.

## Install

Choose **one method**. Everyone in the room needs SWaP.

### Tampermonkey

1. Install [Tampermonkey](https://www.tampermonkey.net/) for your browser. On Chrome, enable **Allow User Scripts** in its extension settings ([help](https://www.tampermonkey.net/faq.php?locale=en&q=Q209)).
2. Open **[Install SWaP](https://raw.githubusercontent.com/vijay2411/SWaP-Stremio-Watch-Party/main/SWaP.user.js)** and click **Install**.
3. Reload [Stremio Web](https://web.stremio.com/). Look for **Watch together** at the bottom right.

### Chrome extension

1. **[Download the extension ZIP](https://github.com/vijay2411/SWaP-Stremio-Watch-Party/releases/download/v4.1.1/SWaP-Chrome-4.1.1.zip)** and extract it to a folder you'll keep.
2. Open `chrome://extensions` → enable **Developer mode** → **Load unpacked** → select the extracted folder containing `manifest.json`.
3. Reload Stremio Web. Click **Watch together**, or pin SWaP to Chrome's toolbar.

The extension is a preview; a Chrome Web Store install is upcoming. Disable old Sidekick/SWaP copies before starting. [Installation help](INSTALL.md) · [Extension help](CHROME-EXTENSION.md)

## Start your watch party

1. **Open your movie.** Everyone loads the same movie/episode and matching edition in their own Stremio Web player.
2. **Host:** open **Watch together**, enter a name, and select **Create a room**.
3. **Invite:** expand **Room & viewing options** → **Copy code**. Share it privately; friends enter their name and code, then click **Join**.
4. **Press play:** check the stream warnings, then the host selects **Play room**. Keep the host's tab open.

### A few controls to know

- **Playback:** host control is the default. In **Room preferences**, allow everyone to control playback and choose whether to wait for buffering friends. Waiting is on by default, for up to 20 seconds.
- **Stream checks:** **Watching now** shows the title and timing. Expand **Stream details** or **Everyone's playback** for more; check warnings before starting.
- **Chat:** minimize the sidebar to give the movie more space. New messages appear briefly; **Reply** lets you answer from the bottom bar.
- **Calls:** choose **Join video call** or **Audio only**. Pin a friend, toggle your camera/mic, or choose **Hold to talk** and a shortcut key.
- **Appearance:** choose from 11 themes and switch light/dark mode with the sun/moon button. Minimalism dark is the default; your choice affects only you.

### Enable, pause or switch off

- **Open/hide:** click **Watch together** or **Minimize panel**. Minimizing keeps your room and call active.
- **Leave:** **Leave call** stops your camera/mic while keeping you in the room. **Leave room** disconnects you; the host's **End room** asks for confirmation and disconnects everyone.
- **Disable/re-enable:** toggle SWaP in Tampermonkey's dashboard or on `chrome://extensions`, then reload Stremio. Leave the room first; disabling alone may leave the already loaded page running until reload.

[Full usage guide](USAGE.md) · [Troubleshooting](INSTALL.md#troubleshooting)

## More details & FAQ

<details>
<summary><strong>Does SWaP provide the movie or share my Stremio account?</strong></summary>

No. Each person needs their own playable stream and Stremio setup. SWaP coordinates playback; it does not broadcast the movie, share your login or install your addons for friends. Matching title, edition and duration helps avoid drift; a matching duration alone does not prove the files are identical.

</details>

<details>
<summary><strong>Is everything free? How many friends can join?</strong></summary>

SWaP has no subscription, paid tier or per-room fee. Internet/data and any content services you use are separate. There's no fixed participant cap in the interface, but bandwidth, device performance and public connection services limit practical room size. Start with a small group; unlimited free video calls at any size are not guaranteed.

</details>

<details>
<summary><strong>What happens if someone buffers or the host leaves?</strong></summary>

With buffering waits enabled, the room waits up to 20 seconds for loading friends and shows who is buffering when available. The host can choose **Continue without waiting**. Reloading, closing or leaving the host's room ends the party; create a new room to reconnect. There is no automatic host handover.

</details>

<details>
<summary><strong>Who can see my chat, activity and camera?</strong></summary>

Your room receives your display name, chat and playback details. Calls start only when you join one and allow device access. The host keeps recent chat in memory, including history for new arrivals; SWaP has no developer-operated chat database or analytics. Preferences stay in your browser. Connection providers see connection metadata, and direct calls may reveal IP addresses. [Privacy details](PRIVACY.md)

</details>

<details>
<summary><strong>Can people in another room get in? Is it safe?</strong></summary>

SWaP checks the room code before sharing room data and restricts calls to admitted participants. A different room's code does not grant access to yours. **Anyone with your code can join**, so share it only with trusted friends. Members can record or reshare what they receive. These protections are tested, but aren't a guarantee against every vulnerability; your browser, Stremio and the signaling provider remain trusted. [Security review](SECURITY.md)

</details>

<details>
<summary><strong>Why can the microphone indicator stay on when I'm muted?</strong></summary>

Mute and **Hold to talk** stop microphone transmission but keep the device ready. **Camera off** stops SWaP's camera track; **Leave call** releases both devices. Other tabs/apps can still use them. Echo/noise processing is requested from the browser; headphones or hold-to-talk help when movie audio feeds back into your microphone.

</details>

<details>
<summary><strong>What's underneath—and is it really serverless?</strong></summary>

SWaP uses JavaScript, **PeerJS** and the browser's **WebRTC**. The host coordinates playback/chat; call participants exchange audio/video directly where possible. Public signaling and STUN/TURN services connect browsers or relay encrypted traffic. Cinemeta supplies optional movie descriptions; GitHub distributes SWaP.

You don't deploy a server, but it still depends on servers. Public services can change their availability or limits; custom connection settings are optional. [Developer guide](DEVELOPING.md)

</details>

<details>
<summary><strong>How do I update?</strong></summary>

Tampermonkey checks for userscript updates according to its settings; reload Stremio afterward. For the unpacked extension, replace the files in its existing folder with the new release, click **Reload** on its Chrome extension card, then reload Stremio. End your room before updating. [Update instructions](CHROME-EXTENSION.md#update-or-remove)

</details>

## Requirements & compatibility

- **Desktop Stremio Web:** `https://web.stremio.com/`, with a playable stream for each person. SWaP does not run in Stremio's desktop/TV apps or external players.
- **Browser:** Chrome 120+ for the extension. The userscript needs a compatible Tampermonkey browser with WebRTC/Web Crypto; desktop Chrome is the live-tested setup. Other browsers/mobile are not fully verified.
- **Calls:** camera/microphone permissions as needed; headphones recommended. Restrictive networks may need a TURN relay.
- **Versions:** extension 4.1 and userscript 4.0/4.1 can share rooms. Old Sidekick v2/v3 cannot join; update everyone and create a new room. Use only one SWaP installation per page.

## Guides & project status

- [Usage guide](USAGE.md) · [Install & troubleshooting](INSTALL.md) · [Chrome extension guide](CHROME-EXTENSION.md)
- [Privacy](PRIVACY.md) · [Security review](SECURITY.md) · [Testing & known limits](TESTING.md)
- [Developer guide](DEVELOPING.md) · [Theme editing](src/themes/README.md) · [Changelog](CHANGELOG.md) · [Version history](VERSIONS.md)
- **Available:** [v4.1.1](https://github.com/vijay2411/SWaP-Stremio-Watch-Party/releases/tag/v4.1.1), as a userscript and unpacked Chrome extension preview. Live Chrome checks and 114 automated/package checks passed; see the test report for scope.
- **Next:** Chrome Web Store installation and automatic extension updates; more testing across networks/devices and larger calls.
- **Under consideration:** room admission and moderation controls. No release dates promised.

## License & credits

[MIT license](LICENSE). Inspired by [Sagar Chaulagain's Stremio Watch Together](https://github.com/sagarchaulagai/stremio-watch-together/); built with PeerJS and WebRTC. [Third-party notices](THIRD-PARTY-NOTICES.txt).

SWaP is an independent community project, formerly Sidekick. It is not affiliated with Stremio or Netflix.
