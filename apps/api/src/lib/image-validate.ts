import zlib from "node:zlib";

const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

/**
 * Validate that a `data:image/png;base64,...` URL is a genuinely decodable PNG.
 *
 * This matters because pdfkit decodes PNG pixel data ASYNCHRONOUSLY when the
 * invoice PDF streams — a corrupt IDAT throws inside a zlib callback that no
 * surrounding try/catch can trap, crashing the API process. We only ever accept
 * PNGs (the browser converts uploads to PNG via canvas), so we validate the
 * structure and decompress the IDAT here, synchronously and catchably, and
 * reject bad data before it can ever reach the PDF renderer.
 *
 * Throws an Error with a user-facing message when invalid.
 */
export function assertValidPngDataUrl(dataUrl: string): void {
  const comma = dataUrl.indexOf(",");
  if (comma === -1) throw new Error("Invalid image data.");

  let buf: Buffer;
  try {
    buf = Buffer.from(dataUrl.slice(comma + 1), "base64");
  } catch {
    throw new Error("Invalid image data.");
  }

  if (buf.length < 8 || !buf.subarray(0, 8).equals(PNG_SIGNATURE)) {
    throw new Error("Logo must be a valid PNG image.");
  }

  let offset = 8;
  let sawIHDR = false;
  const idat: Buffer[] = [];

  while (offset + 8 <= buf.length) {
    const length = buf.readUInt32BE(offset);
    const type = buf.toString("ascii", offset + 4, offset + 8);
    const dataStart = offset + 8;
    const dataEnd = dataStart + length;
    if (dataEnd + 4 > buf.length) break; // truncated / malformed chunk

    if (type === "IHDR") sawIHDR = true;
    else if (type === "IDAT") idat.push(buf.subarray(dataStart, dataEnd));
    else if (type === "IEND") break;

    offset = dataEnd + 4; // skip the 4-byte CRC
  }

  if (!sawIHDR || idat.length === 0) {
    throw new Error("Malformed PNG image (missing header or pixel data).");
  }

  try {
    // The exact operation that would otherwise crash pdfkit on corrupt data.
    zlib.inflateSync(Buffer.concat(idat));
  } catch {
    throw new Error("The PNG image data is corrupt.");
  }
}
