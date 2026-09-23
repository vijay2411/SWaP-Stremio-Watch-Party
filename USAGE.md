# Using SWaP

[Back to README](README.md) · [Install SWaP](INSTALL.md)

## Start a room

1. Open [Stremio Web](https://web.stremio.com/) and load the movie or episode you want to watch.
2. Click **Watch together** at the bottom right and enter your display name. No SWaP account is needed.
3. Optionally expand **Room preferences** before creating the room: choose **Only the host** or **Everyone in the room** for playback control, and turn buffering waits on/off. Defaults are host control and waits enabled.
4. Click **Create a room**. Expand **Room & viewing options**, select **Copy code**, and send it privately to your friends.
5. Once everyone has joined and checked their stream, press **Play room**.

Keep the host tab open. Closing/reloading it or ending the room disconnects the party; there is no automatic host handover.

## Join a friend

1. Install SWaP and open your own matching movie/episode in Stremio Web.
2. Open **Watch together**, enter a name and the host's room code, then click **Join**.
3. Compare **Watching now** and any warnings. Choose the same edition/cut; the same title can have different runtimes.
4. Let the host start playback. If autoplay is blocked or you drift, use **Sync now** and follow the browser's playback prompt.

The room synchronizes players, not content access. SWaP cannot make an unsupported or unavailable stream play, and it does not copy anyone's login or addons.

## Playback, stream checks and buffering

- **Change who controls playback:** the host opens **Room & viewing options → Room preferences · host only → Playback control**. Changes apply to the current room.
- **Play/pause/seek:** the host controls the group by default. With **Everyone in the room** enabled, guests with a matching, loaded stream can also control playback.
- **Wait for friends:** with the wait setting enabled, the room pauses for buffering friends for up to 20 seconds. The host can use **Continue without waiting** or switch the setting off.
- **See what's happening:** expand **Everyone's playback** for participant status and timing. A loading person's name appears when the information is available.
- **Check the stream:** expand **Stream details** for title, duration and available source/release information. Warnings can identify a different episode, cut or duration. Matching labels/duration are useful clues, not proof of an identical file; missing details are reported as unavailable.
- **Read about the movie:** **Watching now** can show a description and a link to the title in Stremio when metadata is available.

Room options, stream details and participant playback start folded. Failed, mismatched or stale streams do not hold the room indefinitely. The wait setting concerns friends' buffering; it cannot make the host's own stalled stream playable.

## Chat while watching

Type a message in the sidebar and press **Enter** or the send button. Chat follows new messages when you're at the bottom; if you've scrolled up, use the latest-message control to catch up.

Minimize the panel to expand the movie. New messages appear as compact previews for five seconds. Queued previews start two seconds apart, with at most three visible at once. Select **Reply** beside **Watch together** to type in the horizontal bottom bar without reopening the sidebar.

Your draft is shared between the sidebar and compact reply. Failed sends preserve it; wait briefly and retry. Sending too quickly can trigger the short per-person rate limit. Messages are plain text, and recent history is shared with people joining the room.

## Audio and video calls

- **Join video call:** requests camera and microphone access. **Audio only:** requests just the microphone. Joining the room itself does not start capture.
- **Mic on/off:** toggle what you transmit. **Sound on/off:** toggle received call audio; this is separate from the movie's volume.
- **Camera off:** stops and removes SWaP's video track and shows an explicit placeholder to the room. Switch it on again to resume video.
- **Pin:** use the pin control on a participant's tile to enlarge that video in your view.
- **Hold to talk:** choose it under **Microphone mode**, then select an A–Z shortcut or **Button only**. The default shortcut is **V**. Hold to speak; release to mute. The key works only while that tab is focused and you're not typing in an input.
- **Leave call:** stops SWaP's camera and microphone access while keeping you in the room and chat.

Muting and hold-to-talk keep the microphone acquired, so a browser device indicator can remain on. Other apps/tabs may also keep devices active. Browser echo cancellation and noise suppression are requested, but effectiveness depends on your setup; headphones help.

Minimizing during a call keeps it active in a compact top strip with space reserved for the movie. Open **Chat & room** to return to the sidebar.

## Appearance and layout

Use **Appearance** in the lobby or **Room & viewing options → Theme** in a room. The sun/moon button at the top switches light/dark mode. Each of the 11 themes supports both modes:

Minimalism, Scrapbook, Surrealism, Y2K, Pixel art, Glassmorphism, Bento grid, Editorial, Swiss, Maximalism and Wabi sabi.

Minimalism dark is the default. Your theme/mode only changes your view and is remembered locally. The sidebar reserves space beside the movie; narrower layouts use a bottom dock. Minimizing restores viewing space, except for the reserved call strip when a call is active.

## Leave, disable or remove

| Action | Result |
| --- | --- |
| Minimize panel | Hides the sidebar; room, chat and calls continue. |
| Leave call | Releases SWaP's devices; room/chat stay connected. |
| Leave room | Disconnects you and ends your call. |
| End room (host) | Asks for confirmation, then disconnects everyone. |
| Close/reload the host tab | Ends the party; a new room is needed. |

To disable SWaP, leave the room, switch it off in **Tampermonkey → Dashboard** or **chrome://extensions**, then reload Stremio. Switch it on and reload to re-enable it. Reloading matters: disabling an installed script/extension does not reliably remove code already running in a page.

To uninstall, delete the SWaP script in Tampermonkey or choose **Remove** on its Chrome extension card. Website preferences can remain afterward; see [clearing saved settings](PRIVACY.md#local-storage-and-retention).

## Updates and help

Use the [installation guide](INSTALL.md) for missing buttons, room joins and device problems. See [extension updates](CHROME-EXTENSION.md#update-or-remove) for the manual ZIP process. Keep only one SWaP copy active and use compatible versions across the room.

Leave **Connection settings** empty for the public defaults. Custom signaling settings must agree across participants; relay setup is covered in the [developer guide](DEVELOPING.md#connections-and-cost).

[Privacy notice](PRIVACY.md) · [Security review](SECURITY.md) · [Tested behavior and remaining limits](TESTING.md)
