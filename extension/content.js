import { mountSwap } from '../src/main.js';
import { mountExtension } from './app.js';
mountExtension(chrome.runtime, mountSwap);
