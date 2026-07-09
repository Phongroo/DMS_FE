const crypto = require('crypto');

// 1. Polyfill the required/imported 'crypto' module object directly
// This is critical because Vite imports 'node:crypto' and calls 'crypto.getRandomValues' on it.
if (!crypto.getRandomValues) {
  Object.defineProperty(crypto, 'getRandomValues', {
    value: function (buffer) {
      return crypto.randomFillSync(buffer);
    },
    writable: true,
    configurable: true
  });
}

// 2. Polyfill globalThis.crypto for other web-standard calls
if (!globalThis.crypto) {
  globalThis.crypto = crypto.webcrypto || {};
}

if (!globalThis.crypto.getRandomValues) {
  Object.defineProperty(globalThis.crypto, 'getRandomValues', {
    value: function (buffer) {
      return crypto.randomFillSync(buffer);
    },
    writable: true,
    configurable: true
  });
}
