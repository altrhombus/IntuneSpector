// Generates solid-color PNG icons for the extension (no dependencies, pure Node.js)
import { deflateSync } from 'node:zlib'
import { writeFileSync, mkdirSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))

// CRC-32 (PNG standard)
const crcTable = (() => {
  const t = new Uint32Array(256)
  for (let n = 0; n < 256; n++) {
    let c = n
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    t[n] = c
  }
  return t
})()

function crc32(buf) {
  let crc = 0xffffffff
  for (let i = 0; i < buf.length; i++) crc = crcTable[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8)
  return (crc ^ 0xffffffff) >>> 0
}

function pngChunk(type, data) {
  const typeBytes = Buffer.from(type, 'ascii')
  const lenBuf = Buffer.alloc(4)
  lenBuf.writeUInt32BE(data.length)
  const payload = Buffer.concat([typeBytes, data])
  const crcBuf = Buffer.alloc(4)
  crcBuf.writeUInt32BE(crc32(payload))
  return Buffer.concat([lenBuf, payload, crcBuf])
}

function makePNG(size, r, g, b) {
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])

  const ihdrData = Buffer.alloc(13)
  ihdrData.writeUInt32BE(size, 0)
  ihdrData.writeUInt32BE(size, 4)
  ihdrData.writeUInt8(8, 8)   // bit depth
  ihdrData.writeUInt8(2, 9)   // color type: RGB
  // compression, filter, interlace all 0

  // Raw image: one row = [filter=0, R, G, B, R, G, B, ...]
  const row = Buffer.alloc(1 + size * 3)
  row[0] = 0
  for (let i = 0; i < size; i++) {
    row[1 + i * 3]     = r
    row[1 + i * 3 + 1] = g
    row[1 + i * 3 + 2] = b
  }
  const rawData = Buffer.concat(Array.from({ length: size }, () => row))
  const compressed = deflateSync(rawData)

  return Buffer.concat([
    signature,
    pngChunk('IHDR', ihdrData),
    pngChunk('IDAT', compressed),
    pngChunk('IEND', Buffer.alloc(0)),
  ])
}

const outDir = join(__dirname, '..', 'public', 'icons')
mkdirSync(outDir, { recursive: true })

// IntuneSpector blue: #0078d4 = rgb(0, 120, 212)
for (const size of [16, 48, 128]) {
  const png = makePNG(size, 0, 120, 212)
  writeFileSync(join(outDir, `icon${size}.png`), png)
  console.log(`  icon${size}.png  (${png.length} bytes)`)
}
