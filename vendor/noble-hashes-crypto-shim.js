/**
 * Import-map target for @noble/hashes/crypto (mirrors @noble/hashes/esm/crypto.js).
 * Required because bare specifiers are not resolved in browser module graphs.
 */
export const crypto =
  typeof globalThis === "object" && "crypto" in globalThis ? globalThis.crypto : undefined;
