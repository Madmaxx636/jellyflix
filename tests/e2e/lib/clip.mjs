// A short real HLS clip (H.264 video and AAC audio) for the player checks, made once with ffmpeg and cached.
import { spawnSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const DIR = fileURLToPath(new URL('../.cache/media/', import.meta.url))

/** The folder holding index.m3u8 and its segments, or '' when ffmpeg isn't installed (player checks are then skipped). */
export function ensureClip() {
  if (fs.existsSync(path.join(DIR, 'index.m3u8')) && fs.existsSync(path.join(DIR, 'clip.mp4'))) return DIR
  fs.mkdirSync(DIR, { recursive: true })
  const made = spawnSync('ffmpeg', [
    '-loglevel', 'error', '-y',
    '-f', 'lavfi', '-i', 'testsrc2=duration=12:size=640x360:rate=24',
    '-f', 'lavfi', '-i', 'sine=frequency=440:duration=12',
    '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-preset', 'veryfast', '-g', '48',
    '-c:a', 'aac', '-b:a', '64k',
    '-f', 'hls', '-hls_time', '2', '-hls_playlist_type', 'vod',
    '-hls_segment_filename', path.join(DIR, 'seg%d.ts'), path.join(DIR, 'index.m3u8')
  ], { encoding: 'utf8' })
  // The same clip as one mp4 file, for the title the player can play as it is.
  const file = made.status === 0
    ? spawnSync('ffmpeg', [
      '-loglevel', 'error', '-y',
      '-f', 'lavfi', '-i', 'testsrc2=duration=12:size=640x360:rate=24',
      '-f', 'lavfi', '-i', 'sine=frequency=440:duration=12',
      '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-preset', 'veryfast', '-g', '48',
      '-c:a', 'aac', '-b:a', '64k', '-movflags', '+faststart', path.join(DIR, 'clip.mp4')
    ], { encoding: 'utf8' })
    : made
  if (made.status !== 0 || file.status !== 0) {
    console.warn('ffmpeg is not available, so checks that need a real video stream will be skipped.')
    return ''
  }
  return DIR
}
