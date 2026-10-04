const status = document.getElementById('status');
const show = document.getElementById('show');
const hide = document.getElementById('hide');
const visibilityHint = document.getElementById('visibility-hint');
const stremio = document.getElementById('stremio');
document.getElementById('version').textContent = `v${chrome.runtime.getManifest().version}`;
let tabId;
const unavailable = () => {
  show.hidden = hide.hidden = visibilityHint.hidden = true; stremio.hidden = false;
  status.textContent = 'Open Stremio Web to watch together. Already there? Reload the tab after installing or updating SWaP.';
};
function render(result) {
  if (result?.status === 'duplicate') {
    show.hidden = hide.hidden = visibilityHint.hidden = true; stremio.hidden = false;
    status.textContent = 'Another SWaP or Sidekick copy is already on this page. Disable the old userscript or duplicate extension, then reload Stremio.';
    return false;
  }
  if (result?.status !== 'ready') { unavailable(); return false; }
  if (result.hidden) {
    status.textContent = result.inRoom ? 'SWaP is hidden on this tab. Your room and any call are still running.' : 'SWaP is hidden on this tab. Bring it back whenever you want.';
  } else {
    status.textContent = result.inRoom ? 'Your room is running in the Stremio tab.' : 'Ready for a movie night? Create a room or join your friends.';
  }
  show.textContent = result.hidden ? 'Show SWaP ↗' : 'Open watch party ↗';
  show.hidden = false; hide.hidden = !!result.hidden; stremio.hidden = true;
  visibilityHint.hidden = false;
  visibilityHint.textContent = result.inRoom
    ? 'Hiding keeps your room and call connected. To disconnect, open SWaP and leave the room.'
    : 'Hide the button and sidebar on this tab. Show them again from this menu.';
  return true;
}
async function connect() {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!Number.isInteger(tab?.id)) { unavailable(); return; }
    tabId = tab.id;
    render(await chrome.tabs.sendMessage(tabId, { type: 'swap:status' }));
  } catch { unavailable(); }
}
async function changeVisibility(type) {
  show.disabled = hide.disabled = true;
  try {
    const result = await chrome.tabs.sendMessage(tabId, { type });
    if (render(result) && type === 'swap:show') window.close();
  } catch { unavailable(); }
  finally { show.disabled = hide.disabled = false; }
}
show.addEventListener('click', () => changeVisibility('swap:show'));
hide.addEventListener('click', () => changeVisibility('swap:hide'));
void connect();
