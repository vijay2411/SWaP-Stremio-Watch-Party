# SWaP privacy notice

Updated 24 September 2026. Applies to SWaP’s Chrome extension and userscript.

SWaP helps a private group synchronize Stremio Web playback, chat and optionally make audio/video calls. The project does not operate an application backend or add analytics, advertising, tracking pixels or a chat database. Third-party connection services are still involved.

## What is processed and shared

- **Room membership and chat:** your chosen display name, membership/call status and chat messages are shared with your room. The host forwards chat and keeps up to 100 messages in memory. New members receive recent history, limited to 100 messages / 128 KiB.
- **Watching together:** room members receive title/episode identifiers, display title/description, playback time/duration, buffering state and sanitized source/release labels. When available, a room-salted file fingerprint helps compare streams. SWaP does not forward raw stream URLs, configured addon URLs, headers or Stremio login credentials. Display-label filtering is heuristic: do not put secrets in titles, filenames, your name or chat.
- **Calls:** camera/microphone media is sent to other call participants only after you select Join video call or Audio only and the browser allows capture. Camera off releases SWaP’s video track; leaving the call stops its camera and microphone tracks. Mic mute/hold-to-talk mutes transmission while keeping the microphone acquired.
- **Connection metadata:** the default PeerJS signaling service, Google STUN and PeerJS TURN services receive connection information. TURN may relay encrypted traffic. Direct WebRTC connections can reveal IP addresses to participants. Optional servers you configure receive relevant connection information instead.
- **Title lookup:** a best-effort Cinemeta request uses the public IMDb title/type ID, with credentials and referrer omitted. That provider sees ordinary request/network metadata.
- **Distribution:** GitHub receives ordinary download/update request metadata. A future Chrome Web Store installation would also be subject to Google’s distribution policies. There is no store listing yet.

Peers can independently record or share information they receive, and anyone with a room code can join. The signaling provider remains trusted. Read [SECURITY.md](https://github.com/vijay2411/SWaP-Stremio-Watch-Party/blob/main/SECURITY.md) for the precise boundaries.

## Local storage and retention

Your display name, theme, light/dark mode and talk key are stored in Stremio’s same-origin localStorage. Optional signaling/TURN settings are stored in that tab’s sessionStorage. These legacy storage keys remain shared between the extension and userscript for compatibility. They are not sent to a SWaP account service. Same-origin code can access this storage; avoid storing long-lived sensitive relay credentials.

Chats, room authentication keys and call capabilities are held in memory and cleared by SWaP when the room ends or the tab closes. Recipients may retain their own copies. The project does not control the logging/retention of external signaling, relay, metadata or distribution providers.

Change preferences inside SWaP. To clear saved SWaP preferences without deleting other Stremio settings, remove the `sidekick-name`, `sidekick-theme`, `sidekick-color-mode` and `sidekick-talk-key` localStorage entries for `https://web.stremio.com`. Clear optional Connection settings using the empty value and Save for this tab, or close the tab. Removing the extension alone does not erase website storage.

## Chrome extension access

The extension’s packaged content script runs only on `https://web.stremio.com/*`, in Chrome’s isolated JavaScript world and the top-level page. It can read/change that page to coordinate playback and show the SWaP interface. It does not request browsing-history, cookies, downloads, tab capture, desktop capture, native messaging, or access to all websites. The toolbar sends only fixed status/open-panel messages to its own content script; it does not receive movie URLs, chat, room codes or camera data.

Isolation protects the extension’s JavaScript variables from ordinary page scripts, but the DOM and website storage remain shared. SWaP is not a protection against a compromised browser, Stremio page, installed extension, invited member or signaling provider.

## Use and contact

Data is used to provide the watch-party features described here. SWaP does not sell user data, use it for advertising, or send it to the developer for analysis. The project’s use of user data is limited to these user-facing features, consistent with the Chrome Web Store User Data Policy’s Limited Use requirements. This statement does not represent store approval.

For privacy questions, use [the project’s issue tracker](https://github.com/vijay2411/SWaP-Stremio-Watch-Party/issues). Do not post room codes, account tokens or private chat logs. For a sensitive report, request a private contact channel without disclosing the sensitive information publicly.
