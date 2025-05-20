// crypto-polyfill.ts
import * as crypto from 'crypto';

if (typeof globalThis !== 'undefined' && !globalThis.crypto) {
  (globalThis as any).crypto = {
    randomUUID: () => {
      return crypto.randomUUID ? crypto.randomUUID() : generateUUID();
    },
  };
}

// Fallback UUID generator
function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export { crypto };
