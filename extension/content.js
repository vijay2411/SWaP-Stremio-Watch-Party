import { mountSwap } from '../src/main.js';
import { registerToolbar } from './toolbar.js';
const app = mountSwap();
registerToolbar(chrome.runtime, app);
