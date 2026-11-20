// Draws the app icon (build/icon.png, 512×512): a red rounded square with a white play button.
// Run `node scripts/make-icon.mjs` to draw it again after changing the colours or shapes below.
import { mkdirSync, writeFileSync } from 'node:fs'
import { deflateSync } from 'node:zlib'

const SIZE = 512
const SAMPLES = 4 // 4×4 samples per pixel smooth the edges
const RADIUS = 112
const TOP = [255, 61, 74]
const BOTTOM = [140, 10, 20]
const PLAY = [[196, 150], [196, 362], [388, 256]]
const PLAY_ROUNDING = 14

/** How far a point is outside a rounded square covering the whole canvas (negative inside). */
const roundedSquare = (x, y) => {
  const half = SIZE / 2 - RADIUS
  const dx = Math.abs(x - SIZE / 2) - half
  const dy = Math.abs(y - SIZE / 2) - half
  return Math.hypot(Math.max(dx, 0), Math.max(dy, 0)) + Math.min(Math.max(dx, dy), 0) - RADIUS
}

const toSegment = (px, py, [ax, ay], [bx, by]) => {
  const t = Math.max(0, Math.min(1, ((px - ax) * (bx - ax) + (py - ay) * (by - ay)) / ((bx - ax) ** 2 + (by - ay) ** 2)))
  return Math.hypot(px - (ax + t * (bx - ax)), py - (ay + t * (by - ay)))
}

/** How far a point is outside a convex polygon whose corners run clockwise on screen (negative inside). */
const signedDistance = (x, y, polygon) => {
  const edges = polygon.map((corner, i) => [corner, polygon[(i + 1) % polygon.length]])
  const inside = edges.every(([from, to]) => (to[0] - from[0]) * (y - from[1]) - (to[1] - from[1]) * (x - from[0]) <= 0)
  const nearest = Math.min(...edges.map(([from, to]) => toSegment(x, y, from, to)))
  return inside ? -nearest : nearest
}

// Rounded corners: shrink the triangle towards its centre, then count everything within the rounding distance of it.
const [p0, p1, p2] = PLAY
const sides = [Math.hypot(p1[0] - p2[0], p1[1] - p2[1]), Math.hypot(p0[0] - p2[0], p0[1] - p2[1]), Math.hypot(p0[0] - p1[0], p0[1] - p1[1])]
const perimeter = sides[0] + sides[1] + sides[2]
const centre = [0, 1].map(i => (sides[0] * p0[i] + sides[1] * p1[i] + sides[2] * p2[i]) / perimeter)
const area = Math.abs((p1[0] - p0[0]) * (p2[1] - p0[1]) - (p2[0] - p0[0]) * (p1[1] - p0[1])) / 2
const inradius = (2 * area) / perimeter
const shrunk = PLAY.map(corner => corner.map((v, i) => centre[i] + (v - centre[i]) * (inradius - PLAY_ROUNDING) / inradius))
const playButton = (x, y) => signedDistance(x, y, shrunk) - PLAY_ROUNDING

const covered = (shape, x, y) => {
  let hits = 0
  for (let sy = 0; sy < SAMPLES; sy++) for (let sx = 0; sx < SAMPLES; sx++) {
    if (shape(x + (sx + 0.5) / SAMPLES, y + (sy + 0.5) / SAMPLES) <= 0) hits++
  }
  return hits / (SAMPLES * SAMPLES)
}

const raw = Buffer.alloc(SIZE * (SIZE * 4 + 1))
for (let y = 0; y < SIZE; y++) {
  raw[y * (SIZE * 4 + 1)] = 0 // each row starts with its filter type: none
  for (let x = 0; x < SIZE; x++) {
    const square = covered(roundedSquare, x, y)
    const play = covered(playButton, x, y)
    const t = y / SIZE
    const at = y * (SIZE * 4 + 1) + 1 + x * 4
    for (let channel = 0; channel < 3; channel++) {
      const background = TOP[channel] + (BOTTOM[channel] - TOP[channel]) * t
      raw[at + channel] = Math.round(background + (255 - background) * play)
    }
    raw[at + 3] = Math.round(square * 255)
  }
}

const crcTable = Array.from({ length: 256 }, (_, n) => {
  let c = n
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
  return c >>> 0
})
const crc32 = buf => {
  let c = 0xffffffff
  for (const byte of buf) c = crcTable[(c ^ byte) & 0xff] ^ (c >>> 8)
  return (c ^ 0xffffffff) >>> 0
}
const chunk = (type, data) => {
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data])
  const out = Buffer.alloc(body.length + 8)
  out.writeUInt32BE(data.length, 0)
  body.copy(out, 4)
  out.writeUInt32BE(crc32(body), body.length + 4)
  return out
}
const header = Buffer.alloc(13)
header.writeUInt32BE(SIZE, 0)
header.writeUInt32BE(SIZE, 4)
header[8] = 8 // bits per channel
header[9] = 6 // colour type: RGBA

mkdirSync('build', { recursive: true })
writeFileSync('build/icon.png', Buffer.concat([
  Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
  chunk('IHDR', header),
  chunk('IDAT', deflateSync(raw, { level: 9 })),
  chunk('IEND', Buffer.alloc(0))
]))
console.log('wrote build/icon.png')
