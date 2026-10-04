import { registerToolbar } from './toolbar.js';

// Tab-scoped preference belongs only to the extension. The userscript always
// keeps its launcher, because it has no toolbar from which to recover it.
const HIDDEN_KEY = 'swap-extension-hidden';
export function mountExtension(runtime, mountApp, storage = () => sessionStorage) {
  let hidden = false;
  try { hidden = storage().getItem(HIDDEN_KEY) === '1'; } catch { /* Storage is optional. */ }
  const app = mountApp({ hidden });
  const save = value => {
    try { if (value) storage().setItem(HIDDEN_KEY, '1'); else storage().removeItem(HIDDEN_KEY); }
    catch { /* Hide/show still works for this visit if storage is blocked. */ }
  };
  return registerToolbar(runtime, app && {
    status: () => app.status(),
    show: () => { app.show(); save(false); },
    hide: () => { app.hide(); save(true); }
  });
}
