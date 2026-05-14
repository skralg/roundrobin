import TTS from "./TTS.js";
import { buildWebSocketURL } from "../utils/utils.js";
import constants from "../constants/constants.js";

export default class EdgeTTSBrowser {
  static fileTypes = constants.OUTPUT_FORMATS;

  static async getVoices() {
    try {
      const response = await fetch(constants.VOICE_LIST_URL, {
        headers: constants.VOICE_HEADERS,
      });

      const data = await response.json();

      return data;
    } catch (e) {
      console.error(e);
      return e;
    }
  }
  /**
   * @constructor
   * @param {TTS} tts
   */
  constructor(tts) {
    this.url = buildWebSocketURL();
    this.tts = new TTS(tts);
    this.file = new Uint8Array();
  }

  /**
   * @param {string} directory
   * @returns {Promise<HTMLAnchorElement|Error>} - file path to the element or an error string
   */
  ttsToFile(fileName = "") {
    return new Promise((resolve, reject) => {
      if (!this.tts.text) {
        return reject("there is no text input");
      }

      // Reset file buffer before starting a new TTS operation
      this.file = new Uint8Array();

      let settled = false;
      let socket;
      const fail = (err) => {
        if (settled) return;
        settled = true;
        try {
          if (socket) socket.close();
        } catch (_) { /* ignore */ }
        reject(err);
      };

      socket = new WebSocket(this.url);
      socket.binaryType = "arraybuffer";

      socket.addEventListener("error", (e) => {
        const detail =
          e && typeof e === "object" && "message" in e && e.message
            ? String(e.message)
            : "WebSocket error (no details from browser).";
        fail(
          new Error(
            `Microsoft Edge TTS WebSocket failed: ${detail} If the voice list loads but playback does not, try another network, disable strict blockers, or open this page over HTTPS.`,
            { cause: e }
          )
        );
      });

      socket.addEventListener("close", (e) => {
        if (settled) return;
        if (this.file.length === 0) {
          const code = e && typeof e.code === "number" ? ` (close code ${e.code})` : "";
          settled = true;
          return reject(
            new Error(
              `No audio received from Edge TTS${code}. Check clock sync, VPN, or try again.`
            )
          );
        }

        // Create and download file using browser APIs
        try {
          const blob = new Blob([this.file], {
            type: this.tts.fileType.mimeType || "audio/mpeg",
          });

          settled = true;
          resolve(blob);
        } catch (err) {
          console.error("Error creating file:", err);
          fail(err instanceof Error ? err : new Error(String(err)));
        }
      });

      socket.addEventListener("open", () => {
        socket.send(this.tts.generateCommand());
        socket.send(this.tts.generateSSML());
      });

      socket.addEventListener("message", (ev) => {
        if (ev.data instanceof ArrayBuffer) {
          const buffer = new Uint8Array(ev.data);
          if (buffer.length < 2) {
            return;
          }
          const headerLength = (buffer[0] << 8) | (buffer[1] + "\r\n".length);
          const header = buffer.subarray(0, headerLength);
          const result = this.#parseMessageText(
            new TextDecoder().decode(header)
          );

          if (result.Path !== "audio") {
            return;
          }

          const payload = buffer.subarray(headerLength);

          const newFile = new Uint8Array(this.file.length + payload.length);
          newFile.set(this.file);
          newFile.set(payload, this.file.length);
          this.file = newFile;
        } else if (typeof ev.data === "string") {
          const result = this.#parseMessageText(ev.data);
          if (result.Path === "turn.end") {
            socket.close();
          }
        }
      });
    });
  }
  /**
   * @param {string} text
   * @returns {object}
   */
  #parseMessageText(text) {
    const obj = {};
    const split = text.split("\r\n");

    for (const line of split) {
      if (!line) continue;
      try {
        obj.metaData = JSON.parse(line);
      } catch {
        const idx = line.indexOf(":");
        if (idx === -1) continue;
        const key = line.slice(0, idx).trim();
        const value = line.slice(idx + 1).trim();
        obj[key] = value;
      }
    }

    return obj;
  }
}
