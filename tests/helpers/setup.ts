/**
 * Vitest global setup. Node 20+ ships `globalThis.crypto` (WebCrypto); nothing
 * else to bootstrap for unit tests targeting Worker-shaped helpers.
 */
export {}
