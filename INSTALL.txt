# Install SWaP

## Chrome extension (no Tampermonkey)

Download the extension ZIP and follow **[CHROME-EXTENSION.md](CHROME-EXTENSION.md)** to load its extracted folder. Store installation is upcoming; this release is installed through Chrome’s Developer mode. Use either the extension or the userscript, not both at once.

## Userscript / Tampermonkey

1. Install Tampermonkey from the browser store linked at **https://www.tampermonkey.net/**.
2. Open `chrome://extensions`, select **Tampermonkey → Details**, and enable **Allow User Scripts** (Chrome 138+). If your older browser shows a different control, follow [Tampermonkey’s official guide](https://www.tampermonkey.net/faq.php?locale=en&q=Q209). Allow the extension to run on `https://web.stremio.com/`.
3. Open **[the SWaP installation link](https://raw.githubusercontent.com/vijay2411/SWaP-Stremio-Watch-Party/main/SWaP.user.js)**. Tampermonkey should offer to install **SWaP — Stremio Watch Party**. Confirm **Install**.
4. Disable any old **Sidekick** or duplicate SWaP script. Reload every Stremio tab that was already open.
5. Use **https://web.stremio.com/** — not `web.streamio.com`. Log in to Stremio normally if needed. SWaP has no separate login.

If the installation link only shows code: open Tampermonkey’s dashboard → **Create a new script**, delete the template, paste the complete contents of `SWaP.user.js`, and save. Reload Stremio. Do not paste just a portion of the file. You do not need to clone this repository or run npm to install.

## Invite friends

Send this, replacing the room code:

> Install SWaP: https://github.com/vijay2411/SWaP-Stremio-Watch-Party/blob/main/INSTALL.md
>
> Open https://web.stremio.com/, open Watch together, enter your name and join with **YOUR ROOM CODE**. Choose the same movie/episode and matching edition. I’ll press Play room. Calls are optional.

The code admits anyone who has it. Share it privately and create a new room if it spreads beyond your intended group. Each friend needs their own Stremio/addon/content setup. SWaP does not send your configured addon URLs, Stremio login or movie stream to friends.

## Upgrading from Sidekick

Install the new SWaP script and disable the old one. Branding and userscript namespace changed, so your manager may treat it as a new script. SWaP 4.x rooms cannot connect to older versions. Update everyone and create a fresh room. Existing appearance/name/talk-key preferences are retained through the legacy local storage keys.

The main installation link follows current releases. Tampermonkey checks updates according to your settings; reload the Stremio tab after an update. Old tags are historical archives and should not be installed for normal use.

## Troubleshooting

- **No Watch together button:** ensure Tampermonkey and SWaP are enabled, Allow User Scripts/site access are enabled, the address is exactly `web.stremio.com`, and reload. Keep one script enabled.
- **Cannot join:** everyone must use SWaP 4.x and the same signaling settings; check the code and keep the host tab open. Corporate/hotel/mobile networks may need TURN. See [network details](README.md#what-serverless-means-here).
- **Movie isn’t playing:** each person must load a playable stream independently. Check title/duration warnings and press Sync now if the browser blocks autoplay. SWaP cannot make an unsupported stream playable.
- **No camera/mic:** use the browser’s site-permission controls, then try joining the call again. Audio only works without enabling your camera. Camera off releases SWaP’s video track, but another app/tab could still be using the device.
- **Echo:** try headphones or Microphone mode → Hold to talk. Browser echo cancellation cannot guarantee speaker isolation on every device.

Extension 4.1 and userscript 4.0/4.1 can share rooms. There is no SWaP Chrome Web Store listing yet. Unpacked extension updates are manual; see the [extension guide](CHROME-EXTENSION.md#update-or-remove).
