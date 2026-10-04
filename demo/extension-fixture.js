// Browser integration fixture for the real extension adapter and shared app.
// It simulates only Chrome's internal message delivery, never device APIs.
import { mountSwap } from '../src/main.js';
import { mountExtension } from '../extension/app.js';

let listener;
const runtime = {
  id: 'swap-local-fixture',
  getURL: path => `chrome-extension://swap-local-fixture/${path}`,
  onMessage: { addListener: fn => { listener = fn; }, removeListener: () => { listener = null; } }
};
mountExtension(runtime, mountSwap);
const command = type => listener({ type }, { id: runtime.id, url: runtime.getURL('popup.html') }, result => {
  document.getElementById('fixture-visibility').textContent = result.status === 'ready'
    ? `${result.hidden ? 'Hidden' : 'Visible'} · ${result.inRoom ? 'Room connected' : 'No room'}` : result.status;
});
document.getElementById('fixture-hide').onclick = () => command('swap:hide');
document.getElementById('fixture-show').onclick = () => command('swap:show');
document.getElementById('fixture-status').onclick = () => command('swap:status');
command('swap:status');
