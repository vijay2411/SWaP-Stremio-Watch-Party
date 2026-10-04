# Chrome Web Store submission guide

Prepared 4 October 2026 for **SWaP 4.2.6**. This is a preparation kit, not confirmation of Google review or store publication. Use the existing draft item; do not create a second listing.

## 1. Package

In **Package**, upload [SWaP-Chrome-4.2.6.zip](https://github.com/vijay2411/SWaP-Stremio-Watch-Party/releases/download/v4.2.6/SWaP-Chrome-4.2.6.zip). Confirm the dashboard displays version **4.2.6**. Do not upload the store-assets ZIP, userscript, GitHub source ZIP or an enclosing folder.

This patch adds dragging for the folded Watch together / Reply bar in both distributions and retains the 4.2.5 call fixes. It retains the latest Join fix, consistent logo, centered controls and Hide/Show; Chrome permissions and room protocol remain unchanged. **Hold store submission:** default-route media tests passed, but the bundled TURN relay did not provide a working route from the test network. Complete a different-device/network voice test and verify a usable relay path before publication. See [TESTING.md](TESTING.md).

## 2. Store listing: exact field values

| Dashboard field | Value |
| --- | --- |
| Title from package | `SWaP — Stremio Watch Party` (automatic) |
| Summary from package | `Watch together on Stremio Web: room codes, synchronized playback, chat and optional video calls.` (automatic) |
| Description | Paste [store/description.txt](store/description.txt). Plain text; do not include Markdown code fences. |
| Category | **Entertainment** |
| Language | **English** (English/United States if a regional choice is required). |
| Store icon | [store-icon-128.png](store/assets/store-icon-128.png) — 128 × 128 PNG, with transparent padding. |
| Global promo video | Leave blank for now; no uploaded YouTube promo has been prepared. |
| Screenshots | Upload the three 1280 × 800 JPEGs in [store/assets](store/assets), in filename order. They show the real shared SWaP UI with an explicitly labeled demo player and fictional names/messages. |
| Small promo tile | [small-promo-440x280.jpg](store/assets/small-promo-440x280.jpg). Prepare this even though the screenshot of the dashboard does not mark it with an asterisk: Google's image guide lists it as required. |
| Marquee promo tile | [marquee-1400x560.jpg](store/assets/marquee-1400x560.jpg) — optional, supplied. |
| Official URL | **None**. This is for a site you have verified as owning through Search Console. Do not claim Stremio's domain. |
| Homepage URL | `https://github.com/vijay2411/SWaP-Stremio-Watch-Party` |
| Support URL | `https://github.com/vijay2411/SWaP-Stremio-Watch-Party/issues` |
| Mature content | **Off** for the supplied extension and clean demo assets. Reassess if future listing/content specifically features mature material; private communication does not make SWaP an adult-content product. |
| Item support visibility | **On** so users can reach support. |

These recommendations use Google's [listing guide](https://developer.chrome.com/docs/webstore/cws-dashboard-listing), [category guidance](https://developer.chrome.com/docs/webstore/best-practices#choose_your_extensions_category_well), [image specifications](https://developer.chrome.com/docs/webstore/images), and [content-rating guidance](https://developer.chrome.com/docs/webstore/rating). The live dashboard remains the source of truth for which fields block submission.

## 3. Privacy tab

### Single purpose

Paste [store/single-purpose.txt](store/single-purpose.txt).

### Site access justification

For the Stremio host/site-access field, paste [store/host-permission.txt](store/host-permission.txt). The manifest has only the static content-script match `https://web.stremio.com/*`; it does not request extra Chrome API permissions. If a host-justification field is not shown, put the explanation in reviewer notes instead. Do not add permissions merely to obtain a field.

### Remote code

Select **No, I am not using remote code**. If an explanation field is available, paste [store/remote-code.txt](store/remote-code.txt). PeerJS signaling and WebRTC network data are not remotely executed code.

### Privacy policy URL

`https://github.com/vijay2411/SWaP-Stremio-Watch-Party/blob/main/PRIVACY.md`

Open it while signed out and confirm it is publicly readable.

### Data usage

Do **not** select “no data collected” merely because SWaP has no developer backend. Google's [User Data FAQ](https://developer.chrome.com/docs/webstore/program-policies/user-data-faq) covers collecting, processing, transmitting and sharing, including local-only data. The following is a conservative mapping of the current source behavior to the usual dashboard categories; read each displayed definition before certifying.

| Category | Recommended selection | What SWaP handles |
| --- | --- | --- |
| Personally identifiable information | **Yes** | User-chosen display names, ephemeral participant identifiers and connection IP information. No SWaP registration, email or account profile. |
| Authentication information | **Yes** | Room access codes, derived authentication material/call capabilities, and optional user-entered TURN credentials. SWaP does not collect a Stremio account password or authentication cookies. |
| Personal communications | **Yes** | Room chat and opt-in microphone/camera communication with participants. |
| Location | **Yes, for IP-based connection information** | Signaling/relay providers and WebRTC peers can receive IP addresses. No GPS, browser geolocation or location lookup is performed. Google's category examples include IP addresses. |
| Web history | **Yes, narrowly scoped** | The current Stremio title/episode identifier and playback context are derived from the active player page and shared for synchronization. No general browser-history API or cross-site browsing history is used. |
| User activity | **Yes, narrowly scoped** | Play/pause, seek, playback position/rate and buffering/call participation needed for room features. No analytics or general keystroke/mouse logging. |
| Website content | **Yes** | Current title/description, duration and sanitized stream/release metadata read from Stremio; content entered by room participants. The movie itself is not broadcast. |
| Health information | **No** | No health-data feature or intentional health-data collection. |
| Financial and payment information | **No** | No billing, checkout or financial-data feature. |

The same data can fit more than one category. Selecting a category does not mean the developer receives or sells it. Keep the listing, reviewer notes and privacy policy consistent about where data goes. Do not claim anonymity, unlimited group size, perfect security, or absence of all third-party servers.

### Limited-use certifications

Read and confirm the three dashboard statements yourself. Current code and project policy support these declarations:

- Data is not sold or transferred for unrelated purposes; transfers to room participants and connection providers support the disclosed functionality.
- Data is used only for SWaP's stated watch-party purpose.
- Data is not used for creditworthiness or lending decisions.

These statements concern your actual ongoing practices as publisher, not only this source snapshot. See Google's [privacy-fields guide](https://developer.chrome.com/docs/webstore/cws-dashboard-privacy).

## 4. Access → Test instructions

Paste [store/reviewer-instructions.txt](store/reviewer-instructions.txt). No SWaP credentials exist. Do not enter your personal Stremio password, addon/debrid credentials or a live private room code.

Stremio may require its own sign-in and each viewer's playable content setup. Before submitting, rehearse the instructions from a clean Chrome profile with lawful content. If the reviewer cannot reach a playable stream without restricted access, arrange a dedicated test account/content path and provide it only in the dashboard's private reviewer-access fields. Never commit those credentials. The kit does not invent a test account or promise access it has not verified.

## 5. Distribution

Recommended first store release: **Unlisted**, **All regions**, free. This gives friends an install URL while the remaining real-network tests are completed. Choose **Public** when ready to appear in store search. Both require Google's normal review; unlisted is not an access-control mechanism. See [distribution options](https://developer.chrome.com/docs/webstore/cws-dashboard-distribution).

Complete any verified contact-email, developer identity/trader status or account-specific requirements using your own accurate details. Those values cannot be inferred from the repository. Keep two-step verification enabled if the dashboard requires it.

## 6. Save and submit

1. Upload the current extension ZIP to the existing draft.
2. Complete Store listing, Privacy, Test instructions and Distribution; **Save draft**.
3. Click **Why can't I submit?** and resolve the specific missing fields it reports.
4. Rehearse install, create/join, playback, chat and leave-call behavior from the uploaded package. [TESTING.md](TESTING.md) records passed checks and the remaining live stream, cross-network and physical-device checks.
5. When you are ready, choose **Submit for review**. If offered, turn off automatic publishing/use deferred publishing so you can launch after approval.
6. When approved, publish from the dashboard and replace the repository's upcoming-store text with the actual public/unlisted listing link. Do not advertise store availability before then.

Google's [publishing guide](https://developer.chrome.com/docs/webstore/publish) explains review and deferred publication. No guaranteed review time or acceptance is implied.

## Asset provenance and scope

The logo and promotional graphics are original SWaP artwork. Screenshots show the actual current shared application running in a local demo, with generated test-pattern video and fictional conversation; they are not screenshots of a live customer party or an assertion of installed-extension verification. No copyrighted movie stills, personal Chrome screenshots, bookmarks, accounts or active room codes are included.

The store kit is separate from the allowlisted extension ZIP. `store/preview.html` and `store/promo.html` are only served by the local development server and are not packaged executable extension content.
