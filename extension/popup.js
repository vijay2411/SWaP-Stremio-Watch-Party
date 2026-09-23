const status = document.getElementById('status');
const show = document.getElementById('show');
const stremio = document.getElementById('stremio');
document.getElementById('version').textContent = `v${chrome.runtime.getManifest().version}`;
let tabId;
const unavailable = () => {
  show.hidden = true; stremio.hidden = false;
  status.textContent = 'Open Stremio Web to watch together. Already there? Reload the tab after installing or updating SWaP.';
};
async function connect() {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!Number.isInteger(tab?.id)) { unavailable(); return; }
    tabId = tab.id;
    const result = await chrome.tabs.sendMessage(tabId, { type: 'swap:status' });
    if (result?.status === 'duplicate') {
      status.textContent = 'Another SWaP or Sidekick copy is already on this page. Disable the old userscript or duplicate extension, then reload Stremio.';
      return;
    }
    if (result?.status !== 'ready') { unavailable(); return; }
    status.textContent = result.inRoom ? 'Your room is running in the Stremio tab.' : 'Ready for a movie night? Create a room or join your friends.';
    show.hidden = false; stremio.hidden = true;
  } catch { unavailable(); }
}
show.addEventListener('click', async () => {
  show.disabled = true;
  try {
    const result = await chrome.tabs.sendMessage(tabId, { type: 'swap:show' });
    if (result?.status === 'ready') window.close(); else unavailable();
  } catch { unavailable(); }
  finally { show.disabled = false; }
});
void connect();
