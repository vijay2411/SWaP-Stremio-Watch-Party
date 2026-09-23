# SWaP for Chrome

SWaP 4.1 preview packages the same watch-party app as a Manifest V3 extension. Tampermonkey is not needed for this installation. Chrome 120 or newer is required. This is an independent community project; it is not affiliated with Stremio and has not been published to the Chrome Web Store.

Automated checks and live Chrome/Stremio room, chat and playback checks pass. See [TESTING.md](TESTING.md) for the exact scope and remaining device/network checks.

## Install the unpacked extension

1. Download **[SWaP-Chrome-4.1.1.zip](https://github.com/vijay2411/SWaP-Stremio-Watch-Party/releases/download/v4.1.1/SWaP-Chrome-4.1.1.zip)** from the release assets. Do not download GitHub’s generic “Source code” ZIP for these steps.
2. Extract it into a folder you will keep, such as `Documents/SWaP-Chrome`. The folder must contain `manifest.json` directly.
3. In the Chrome profile you use for Stremio, open `chrome://extensions` and turn on **Developer mode**.
4. Click **Load unpacked** and select the extracted folder. The extension card should say **SWaP — Stremio Watch Party 4.1.1**.
5. If you have a Sidekick/SWaP userscript, disable that script in Tampermonkey. Keep only one SWaP installation active on each page.
6. Open or reload **https://web.stremio.com/**. Click **Watch together** in the bottom corner. You can also open Chrome’s Extensions menu → **SWaP** → **Open watch party**. Pin SWaP if you want its toolbar button visible.

Create or join a room as usual. Each person loads their own matching stream. Extension 4.1 and userscript 4.0/4.1 use the same room protocol; older Sidekick v2/v3 cannot join. Calls remain opt-in.

Chrome loads the files from your extracted folder, so keep that folder in place. Unpacked installations update manually; they do not auto-update from GitHub. There is no need to use Chrome’s **Pack extension** button or create a `.crx` file.

## Update or remove

End your room first. Extract a newer release into the same folder, replacing the old files. On `chrome://extensions`, click SWaP’s **Reload** button, then reload Stremio and create/join a fresh room. If you move the installation to a different folder, remove the old extension card before loading the new one.

To uninstall, select **Remove** on SWaP’s extension card. This does not erase preferences stored on Stremio’s origin; [PRIVACY.md](PRIVACY.md) explains how to clear just SWaP’s saved settings.

## Troubleshooting

- **Manifest file missing:** select the folder containing `manifest.json`, not its parent, the ZIP itself, or the repository’s `extension/` source directory.
- **Toolbar says reload:** reload Stremio after installing/updating. The app only runs at `https://web.stremio.com/`, in a normal top-level tab.
- **Another copy detected:** disable the old Sidekick/SWaP userscript or duplicate extension, then reload every Stremio tab. The shared mount marker prevents two apps controlling one player.
- **No button:** check SWaP is enabled and Chrome allows it on Stremio. Managed browsers may prohibit unpacked extensions; follow your administrator’s policy.
- **Room or call problems:** see the [general installation guide](INSTALL.md#troubleshooting). Loading an extension does not remove network/NAT, codec or content-access limitations.

## Build from source

With Node.js 20+:

```sh
npm ci
npm test
npm run build
npm run test:package
```

Outputs:

- `dist/chrome-extension/`: load this folder with **Load unpacked**.
- `dist/SWaP-Chrome-4.1.1.zip`: distribution/upload ZIP, with `manifest.json` at its root.
- `dist/SWaP-Chrome-4.1.1.zip.sha256`: checksum of the ZIP.
- `SWaP.user.js` and `dist/SWaP.user.js`: userscript alternative.

`npm run build:extension` builds only the extension. Dependencies and all executable code are bundled locally. The ZIP uses an explicit file allowlist and fixed timestamps; it excludes demo fixtures, source maps, development servers, browser profiles and local configuration. On the same Node/zlib toolchain, unchanged inputs produce the same ZIP bytes. The committed PNG icons require no image tools to build; optional regeneration uses `python3 scripts/generate-icons.py` with Pillow.

## Architecture and access

`src/main.js` exports the shared app entry point. `src/userscript.js` and `extension/content.js` are separate adapters; room, playback, calls, chat and modular theme code remain shared. The toolbar and packaging live under `extension/` and `scripts/`.

The manifest uses a static, top-level, isolated content script matching only `https://web.stremio.com/*`. Chrome grants it access to read/change that site so it can find the video element and render the sidebar. There are no additional Chrome API permissions, background worker, remote code, page-message bridge or web-accessible resources. The toolbar queries the active tab ID without requesting permission to read browsing history or tab URLs, then sends two fixed messages to its own content script: get status and open panel.

The room lives in the Stremio tab, so closing the toolbar does not end it; closing/reloading the host tab does. Isolated JavaScript reduces exposure of application variables to page scripts, but the page DOM and legacy local/session storage remain shared. Read the [privacy notice](PRIVACY.md) and [security boundaries](SECURITY.md).

## Chrome Web Store next steps

This ZIP is in the format required for a Web Store upload. Publication is a separate step, subject to Google's developer registration, listing requirements, policy review and approval; the package is not a store listing or approval.

For a future submission:

1. Use the Chrome Web Store Developer Dashboard with the publisher account and complete any registration yourself.
2. Upload the release ZIP. Add the description, category, support URL, icons and current screenshots with no live room codes or personal data.
3. Set the privacy policy URL to [PRIVACY.md](https://github.com/vijay2411/SWaP-Stremio-Watch-Party/blob/main/PRIVACY.md). Complete data-use disclosures accurately: SWaP handles chat, watching metadata and optional audio/video, even though it has no developer-operated chat database. Explain the narrow Stremio site access and locally bundled code.
4. Exercise the checklist in [TESTING.md](TESTING.md), especially real streams and calls across different networks, then submit for review. After approval, update the installation links to the actual store listing.

Official Chrome references used for this package: [Manifest V3](https://developer.chrome.com/docs/extensions/reference/manifest), [isolated content scripts](https://developer.chrome.com/docs/extensions/develop/concepts/content-scripts), [CSP](https://developer.chrome.com/docs/extensions/reference/manifest/content-security-policy), [toolbar/tab API permissions](https://developer.chrome.com/docs/extensions/reference/api/tabs), [load unpacked](https://developer.chrome.com/docs/extensions/get-started/tutorial/hello-world), [ZIP preparation](https://developer.chrome.com/docs/webstore/prepare), [publishing](https://developer.chrome.com/docs/webstore/publish), and [user-data disclosures](https://developer.chrome.com/docs/webstore/program-policies/user-data-faq).
