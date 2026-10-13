// @ts-check

// A minimal "store" (uncompressed) zip writer. Git objects are already zlib-compressed,
// so compressing again would gain nothing.

/** @typedef {import("./git.js").RepoFile} RepoFile */
/** @typedef {Uint8Array<ArrayBuffer>} Bytes */
/** @typedef {[width: 2 | 4, value: number]} Field */

const crcTable = Array.from({ length: 256 }, (_, n) => {
  let c = n
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
  return c >>> 0
})

/** @param {Uint8Array} data */
function crc32(data) {
  let crc = 0xffffffff
  for (const byte of data) crc = crcTable[(crc ^ byte) & 0xff] ^ (crc >>> 8)
  return (crc ^ 0xffffffff) >>> 0
}

/**
 * Packs little-endian integer fields into bytes.
 * @param {...Field} fields
 */
function pack(...fields) {
  const out = new Uint8Array(fields.reduce((n, [width]) => n + width, 0))
  const view = new DataView(out.buffer)
  let at = 0
  for (const [width, value] of fields) {
    if (width === 2) view.setUint16(at, value, true)
    else view.setUint32(at, value, true)
    at += width
  }
  return out
}

const DOS_DATE_1980 = 33 // zip needs a date; 1980-01-01 is the epoch

/** @param {RepoFile[]} files */
export function zip(files) {
  const encoder = new TextEncoder()
  /** @type {Bytes[]} */
  const body = []
  /** @type {Bytes[]} */
  const directory = []
  let offset = 0

  for (const { path, data } of files) {
    const name = encoder.encode(path)
    /** @type {Field[]} */
    const meta = [
      [2, 0], // flags
      [2, 0], // method: store
      [2, 0], // time
      [2, DOS_DATE_1980],
      [4, crc32(data)],
      [4, data.length], // compressed size
      [4, data.length], // uncompressed size
    ]
    const local = pack([4, 0x04034b50], [2, 20], ...meta, [2, name.length], [2, 0])
    const entry = pack([4, 0x02014b50], [2, 20], [2, 20], ...meta, [2, name.length], [2, 0], [2, 0], [2, 0], [2, 0], [4, 0], [4, offset])

    body.push(local, name, data)
    directory.push(entry, name)
    offset += local.length + name.length + data.length
  }

  const directorySize = directory.reduce((n, part) => n + part.length, 0)
  const end = pack([4, 0x06054b50], [2, 0], [2, 0], [2, files.length], [2, files.length], [4, directorySize], [4, offset], [2, 0])
  return new Blob([...body, ...directory, end], { type: "application/zip" })
}
