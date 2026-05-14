import constants from "../constants/constants.js";
import { sha256 } from "../../../node_modules/@noble/hashes/esm/sha256.js";
import { utf8ToBytes, bytesToHex } from "../../../node_modules/@noble/hashes/esm/utils.js";

/**
 * @returns {string}
 */
export function buildWebSocketURL() {
  let url = constants.WSS_URL;
  url += "&Sec-MS-GEC=";
  url += generateSecMsGec();
  url += "&Sec-MS-GEC-Version=";
  url += constants.SEC_MS_GEC_VERSION;
  url += "&ConnectionId=";
  url += uuid();
  return url;
}

/**
 * @returns {string}
 */
function generateSecMsGec() {
  const now = new Date();
  const unixTimestamp = Math.floor(now.getTime() / 1000);
  const S_TO_NS = 1e9;

  let ticks = unixTimestamp + constants.WIN_EPOCH;
  ticks -= ticks % 300;
  ticks *= S_TO_NS / 100;

  const strToHash = `${Math.floor(ticks)}${constants.TRUSTED_CLIENT_TOKEN}`;
  return bytesToHex(sha256(utf8ToBytes(strToHash))).toUpperCase();
}

/**
 * @returns {string} - uuid is used in headers
 */
export function uuid() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID().replaceAll("-", "").toUpperCase();
  }
  return generateRandomUUID().replaceAll("-", "").toUpperCase();
}

/**
 * @returns {string}
 */
function generateRandomUUID() {
  const rnd = new Uint8Array(16);
  if (typeof crypto !== "undefined" && crypto.getRandomValues) {
    crypto.getRandomValues(rnd);
  } else {
    for (let i = 0; i < 16; i++) rnd[i] = (Math.random() * 256) | 0;
  }
  rnd[6] = (rnd[6] & 0x0f) | 0x40;
  rnd[8] = (rnd[8] & 0x3f) | 0x80;
  const hex = [...rnd].map((b) => b.toString(16).padStart(2, "0")).join("");
  return [
    hex.substring(0, 8),
    hex.substring(8, 12),
    hex.substring(12, 16),
    hex.substring(16, 20),
    hex.substring(20, 32),
  ].join("-");
}
