#!/usr/bin/env node
// Verifies the WORDLESS Relay submission video against the exact delivery
// profile: 58.5-60 s, one H.264 1920x1080 yuv420p square-pixel 60 fps video
// stream, one AAC 48 kHz audio stream, a frame count matching the duration,
// a clean full decode, faststart atom order (moov before mdat), integrated
// loudness in [-17, -15] LUFS with true peak <= -1.5 dBTP, no black interval
// of 0.25 s or longer, and no trailing silence of 0.5 s or longer.
//
// ffprobe/ffmpeg are always invoked through execFile with an argument array:
// no shell is ever spawned, so the input path is never interpreted.
//
// Usage:
//   node tools/media/verify-wordless-video.mjs <video.mp4>
//   node tools/media/verify-wordless-video.mjs --help
//
// Exit codes: 0 all checks pass, 1 verification failed, 2 usage/input error.

import { execFile } from 'node:child_process'
import { open, stat } from 'node:fs/promises'
import process from 'node:process'
import { pathToFileURL } from 'node:url'
import { promisify } from 'node:util'

const execFileAsync = promisify(execFile)
const EXEC_OPTIONS = { maxBuffer: 64 * 1024 * 1024, windowsHide: true }

const DURATION_MIN_SECONDS = 58.5
const DURATION_MAX_SECONDS = 60.0
const TARGET_FRAME_RATE = 60
const LOUDNESS_MIN_LUFS = -17
const LOUDNESS_MAX_LUFS = -15
const TRUE_PEAK_MAX_DBTP = -1.5
const BLACK_MIN_SECONDS = 0.25
const SILENCE_MIN_SECONDS = 0.5
const TRAILING_SILENCE_END_TOLERANCE_SECONDS = 0.25

// ---------------------------------------------------------------------------
// Pure parsers (exported for direct testing)
// ---------------------------------------------------------------------------

export function parseLoudnormJson(stderrText) {
  if (typeof stderrText !== 'string') return null
  const match = stderrText.match(/\{[^{}]*"input_i"[^{}]*\}/)
  if (match === null) return null
  let parsed
  try {
    parsed = JSON.parse(match[0])
  } catch {
    return null
  }
  const inputIntegratedLufs = Number.parseFloat(parsed.input_i)
  const inputTruePeakDbtp = Number.parseFloat(parsed.input_tp)
  if (!Number.isFinite(inputIntegratedLufs) || !Number.isFinite(inputTruePeakDbtp)) {
    return null
  }
  return { inputIntegratedLufs, inputTruePeakDbtp }
}

export function parseBlackdetectStderr(stderrText) {
  if (typeof stderrText !== 'string') return []
  const intervals = []
  const pattern = /black_start:\s*([0-9.]+)\s+black_end:\s*([0-9.]+)\s+black_duration:\s*([0-9.]+)/g
  for (const match of stderrText.matchAll(pattern)) {
    intervals.push({
      start: Number.parseFloat(match[1]),
      end: Number.parseFloat(match[2]),
      duration: Number.parseFloat(match[3]),
    })
  }
  return intervals
}

export function parseSilencedetectStderr(stderrText) {
  if (typeof stderrText !== 'string') return []
  const intervals = []
  let openInterval = null
  const pattern = /silence_(start|end):\s*(-?[0-9.]+)(?:\s*\|\s*silence_duration:\s*([0-9.]+))?/g
  for (const match of stderrText.matchAll(pattern)) {
    const kind = match[1]
    const time = Number.parseFloat(match[2])
    if (kind === 'start') {
      if (openInterval !== null) intervals.push(openInterval)
      openInterval = { start: time, end: null, duration: null }
    } else if (openInterval !== null) {
      openInterval.end = time
      openInterval.duration = match[3] === undefined
        ? time - openInterval.start
        : Number.parseFloat(match[3])
      intervals.push(openInterval)
      openInterval = null
    }
  }
  if (openInterval !== null) intervals.push(openInterval)
  return intervals
}

// Minimal MP4 top-level box scanner. Accepts a Buffer (tests) or a file path
// (real verification); only box headers are read, never media payloads.
export async function scanTopLevelBoxes(source) {
  let readAt
  let totalSize
  let handle = null
  if (Buffer.isBuffer(source)) {
    totalSize = source.length
    readAt = async (offset, length) =>
      source.subarray(offset, Math.min(offset + length, totalSize))
  } else {
    handle = await open(source, 'r')
    totalSize = (await handle.stat()).size
    readAt = async (offset, length) => {
      const buffer = Buffer.alloc(length)
      const { bytesRead } = await handle.read(buffer, 0, length, offset)
      return buffer.subarray(0, bytesRead)
    }
  }

  try {
    const boxes = []
    let offset = 0
    while (offset + 8 <= totalSize) {
      const header = await readAt(offset, 16)
      if (header.length < 8) throw new Error(`truncated box header at byte ${offset}`)
      const size32 = header.readUInt32BE(0)
      const type = header.toString('latin1', 4, 8)
      let boxSize
      if (size32 === 0) {
        boxSize = totalSize - offset
      } else if (size32 === 1) {
        if (header.length < 16) throw new Error(`truncated largesize box header at byte ${offset}`)
        const largeSize = header.readBigUInt64BE(8)
        if (largeSize < 16n || largeSize > BigInt(Number.MAX_SAFE_INTEGER)) {
          throw new Error(`invalid largesize box at byte ${offset}`)
        }
        boxSize = Number(largeSize)
      } else if (size32 < 8) {
        throw new Error(`invalid box size ${size32} at byte ${offset}`)
      } else {
        boxSize = size32
      }
      if (offset + boxSize > totalSize) {
        throw new Error(`box ${JSON.stringify(type)} overruns the file at byte ${offset}`)
      }
      boxes.push({ type, offset, size: boxSize })
      offset += boxSize
    }
    if (offset !== totalSize) throw new Error(`trailing bytes after last box at byte ${offset}`)
    return boxes
  } finally {
    if (handle !== null) await handle.close()
  }
}

// ---------------------------------------------------------------------------
// Verification
// ---------------------------------------------------------------------------

const formatNumber = (value) => (Number.isFinite(value) ? String(value) : 'unknown')

async function runProbeJson(mp4Path, extraArgs) {
  const { stdout } = await execFileAsync('ffprobe', [
    '-v', 'error',
    '-print_format', 'json',
    ...extraArgs,
    mp4Path,
  ], EXEC_OPTIONS)
  return JSON.parse(stdout)
}

// ffmpeg writes analysis output to stderr and may exit non-zero; both paths
// return the captured stderr so callers can parse or report it.
async function runFfmpeg(args) {
  try {
    const { stderr } = await execFileAsync('ffmpeg', args, EXEC_OPTIONS)
    return { failed: false, stderr }
  } catch (error) {
    return { failed: true, stderr: typeof error.stderr === 'string' ? error.stderr : String(error.message) }
  }
}

export async function verifyWordlessVideo(mp4Path) {
  const checks = []
  const measurements = {}
  const addCheck = (name, ok, detail) => {
    checks.push({ name, ok: ok === true, detail: String(detail) })
  }
  const finish = () => ({
    ok: checks.length > 0 && checks.every((check) => check.ok),
    checks,
    measurements,
  })

  if (typeof mp4Path !== 'string' || mp4Path === '') {
    addCheck('file-readable', false, 'input path must be a non-empty string')
    return finish()
  }
  try {
    const info = await stat(mp4Path)
    if (!info.isFile()) throw new Error('not a regular file')
    measurements.fileSizeBytes = info.size
    addCheck('file-readable', true, `regular file, ${info.size} bytes`)
  } catch (error) {
    addCheck('file-readable', false, `file unreadable (no such file or not a regular file): ${error.code ?? error.message}`)
    return finish()
  }

  // --- ffprobe stream/format facts -----------------------------------------
  let probe = null
  try {
    probe = await runProbeJson(mp4Path, ['-show_format', '-show_streams'])
    addCheck('probe', true, 'ffprobe parsed the container')
  } catch (error) {
    addCheck('probe', false, `ffprobe failed: ${error.stderr?.trim() || error.message}`)
    return finish()
  }

  const duration = Number.parseFloat(probe.format?.duration)
  measurements.durationSeconds = Number.isFinite(duration) ? duration : null
  addCheck(
    'duration',
    Number.isFinite(duration) && duration >= DURATION_MIN_SECONDS && duration < DURATION_MAX_SECONDS,
    `duration ${formatNumber(duration)} s (required >= ${DURATION_MIN_SECONDS} and < ${DURATION_MAX_SECONDS})`,
  )

  const streams = Array.isArray(probe.streams) ? probe.streams : []
  const videoStreams = streams.filter((stream) => stream.codec_type === 'video')
  const audioStreams = streams.filter((stream) => stream.codec_type === 'audio')
  measurements.videoStreamCount = videoStreams.length
  measurements.audioStreamCount = audioStreams.length

  addCheck('video-stream-count', videoStreams.length === 1,
    `${videoStreams.length} video stream(s) (required exactly 1)`)
  addCheck('audio-stream-count', audioStreams.length === 1,
    `${audioStreams.length} audio stream(s) (required exactly 1)`)

  const video = videoStreams[0] ?? null
  if (video === null) {
    addCheck('video-codec', false, 'no video stream to inspect')
    addCheck('video-resolution', false, 'no video stream to inspect')
    addCheck('video-pixel-format', false, 'no video stream to inspect')
    addCheck('video-square-pixels', false, 'no video stream to inspect')
    addCheck('video-frame-rate', false, 'no video stream to inspect')
  } else {
    measurements.videoCodec = video.codec_name ?? null
    measurements.width = video.width ?? null
    measurements.height = video.height ?? null
    measurements.pixelFormat = video.pix_fmt ?? null
    measurements.sampleAspectRatio = video.sample_aspect_ratio ?? 'N/A'
    measurements.frameRate = video.r_frame_rate ?? null

    addCheck('video-codec', video.codec_name === 'h264',
      `codec ${video.codec_name} (required h264)`)
    addCheck('video-resolution', video.width === 1920 && video.height === 1080,
      `${video.width}x${video.height} (required 1920x1080)`)
    addCheck('video-pixel-format', video.pix_fmt === 'yuv420p',
      `pixel format ${video.pix_fmt} (required yuv420p)`)
    const sar = video.sample_aspect_ratio
    addCheck('video-square-pixels', sar === undefined || sar === '1:1' || sar === 'N/A' || sar === '0:1',
      `sample aspect ratio ${sar ?? 'unset'} (required 1:1 or N/A)`)
    addCheck('video-frame-rate', video.r_frame_rate === '60/1',
      `r_frame_rate ${video.r_frame_rate} (required 60/1)`)
  }

  const audio = audioStreams[0] ?? null
  if (audio === null) {
    addCheck('audio-codec', false, 'no audio stream to inspect')
    addCheck('audio-sample-rate', false, 'no audio stream to inspect')
  } else {
    measurements.audioCodec = audio.codec_name ?? null
    measurements.audioSampleRate = audio.sample_rate ?? null
    addCheck('audio-codec', audio.codec_name === 'aac',
      `codec ${audio.codec_name} (required aac)`)
    addCheck('audio-sample-rate', audio.sample_rate === '48000',
      `sample rate ${audio.sample_rate} Hz (required 48000)`)
  }

  // --- decoded frame count --------------------------------------------------
  try {
    const frameProbe = await runProbeJson(mp4Path, [
      '-select_streams', 'v:0',
      '-count_frames',
      '-show_entries', 'stream=nb_read_frames',
    ])
    const decoded = Number.parseInt(frameProbe.streams?.[0]?.nb_read_frames, 10)
    const expected = Number.isFinite(duration) ? Math.round(duration * TARGET_FRAME_RATE) : NaN
    measurements.decodedFrameCount = Number.isFinite(decoded) ? decoded : null
    measurements.expectedFrameCount = Number.isFinite(expected) ? expected : null
    addCheck('frame-count',
      Number.isFinite(decoded) && Number.isFinite(expected) && Math.abs(decoded - expected) <= 1,
      `decoded ${formatNumber(decoded)} frames, expected ${formatNumber(expected)} +/- 1`)
  } catch (error) {
    addCheck('frame-count', false, `frame counting failed: ${error.stderr?.trim() || error.message}`)
  }

  // --- clean full decode ----------------------------------------------------
  {
    const decode = await runFfmpeg(['-v', 'error', '-nostdin', '-i', mp4Path, '-f', 'null', '-'])
    const clean = !decode.failed && decode.stderr.trim() === ''
    addCheck('clean-decode', clean,
      clean ? 'full decode produced no errors' : `decode errors: ${decode.stderr.trim().slice(0, 400) || 'ffmpeg exited non-zero'}`)
  }

  // --- faststart: moov before mdat -----------------------------------------
  try {
    const boxes = await scanTopLevelBoxes(mp4Path)
    const moov = boxes.find((entry) => entry.type === 'moov') ?? null
    const mdat = boxes.find((entry) => entry.type === 'mdat') ?? null
    measurements.moovOffset = moov?.offset ?? null
    measurements.mdatOffset = mdat?.offset ?? null
    if (moov === null || mdat === null) {
      addCheck('faststart', false,
        `missing top-level box: moov ${moov === null ? 'absent' : 'present'}, mdat ${mdat === null ? 'absent' : 'present'}`)
    } else {
      addCheck('faststart', moov.offset < mdat.offset,
        `moov at byte ${moov.offset}, mdat at byte ${mdat.offset} (required moov before mdat)`)
    }
  } catch (error) {
    addCheck('faststart', false, `box scan failed: ${error.message}`)
  }

  // --- loudness -------------------------------------------------------------
  {
    const loudness = await runFfmpeg([
      '-hide_banner', '-nostats', '-nostdin',
      '-i', mp4Path,
      '-af', 'loudnorm=I=-16:TP=-1.5:LRA=11:print_format=json',
      '-vn', '-f', 'null', '-',
    ])
    const parsed = parseLoudnormJson(loudness.stderr)
    if (parsed === null) {
      addCheck('loudness-integrated', false, 'loudnorm measurement unavailable (no parsable JSON block)')
      addCheck('loudness-true-peak', false, 'loudnorm measurement unavailable (no parsable JSON block)')
    } else {
      measurements.integratedLoudnessLufs = parsed.inputIntegratedLufs
      measurements.truePeakDbtp = parsed.inputTruePeakDbtp
      addCheck('loudness-integrated',
        parsed.inputIntegratedLufs >= LOUDNESS_MIN_LUFS && parsed.inputIntegratedLufs <= LOUDNESS_MAX_LUFS,
        `integrated ${parsed.inputIntegratedLufs} LUFS (required ${LOUDNESS_MIN_LUFS} to ${LOUDNESS_MAX_LUFS})`)
      addCheck('loudness-true-peak',
        parsed.inputTruePeakDbtp <= TRUE_PEAK_MAX_DBTP,
        `true peak ${parsed.inputTruePeakDbtp} dBTP (required <= ${TRUE_PEAK_MAX_DBTP})`)
    }
  }

  // --- black intervals ------------------------------------------------------
  {
    const black = await runFfmpeg([
      '-hide_banner', '-nostats', '-nostdin', '-v', 'info',
      '-i', mp4Path,
      '-vf', `blackdetect=d=${BLACK_MIN_SECONDS}`,
      '-an', '-f', 'null', '-',
    ])
    if (black.failed) {
      addCheck('black-intervals', false, `blackdetect run failed: ${black.stderr.trim().slice(0, 400)}`)
    } else {
      const intervals = parseBlackdetectStderr(black.stderr)
      measurements.blackIntervalCount = intervals.length
      addCheck('black-intervals', intervals.length === 0,
        intervals.length === 0
          ? `no black interval >= ${BLACK_MIN_SECONDS} s`
          : `${intervals.length} black interval(s) >= ${BLACK_MIN_SECONDS} s, first at ${intervals[0].start}-${intervals[0].end} s`)
    }
  }

  // --- trailing silence -----------------------------------------------------
  {
    const silence = await runFfmpeg([
      '-hide_banner', '-nostats', '-nostdin', '-v', 'info',
      '-i', mp4Path,
      '-af', `silencedetect=n=-50dB:d=${SILENCE_MIN_SECONDS}`,
      '-vn', '-f', 'null', '-',
    ])
    if (silence.failed) {
      addCheck('trailing-silence', false, `silencedetect run failed: ${silence.stderr.trim().slice(0, 400)}`)
    } else {
      const intervals = parseSilencedetectStderr(silence.stderr)
      measurements.silenceIntervalCount = intervals.length
      const trailing = Number.isFinite(duration)
        ? intervals.find((interval) =>
          interval.end === null ||
          interval.end >= duration - TRAILING_SILENCE_END_TOLERANCE_SECONDS) ?? null
        : intervals.find((interval) => interval.end === null) ?? null
      measurements.trailingSilence = trailing
      addCheck('trailing-silence', trailing === null,
        trailing === null
          ? `no trailing silence >= ${SILENCE_MIN_SECONDS} s`
          : `silence from ${trailing.start} s runs to ${trailing.end === null ? 'end of file' : `${trailing.end} s`} (at/near video end)`)
    }
  }

  return finish()
}

// ---------------------------------------------------------------------------
// CLI
// ---------------------------------------------------------------------------

const USAGE = `usage: verify-wordless-video.mjs <video.mp4>

Verifies the WORDLESS Relay submission video profile with ffprobe/ffmpeg.
Exit codes: 0 all checks pass, 1 verification failed, 2 usage/input error.`

const invokedDirectly = process.argv[1] !== undefined &&
  import.meta.url === pathToFileURL(process.argv[1]).href

if (invokedDirectly) {
  const args = process.argv.slice(2)
  if (args.includes('--help') || args.includes('-h')) {
    console.log(USAGE)
    process.exit(0)
  }
  if (args.length !== 1 || args[0].startsWith('--')) {
    console.error(USAGE)
    process.exit(2)
  }
  try {
    const result = await verifyWordlessVideo(args[0])
    console.log(JSON.stringify(result, null, 2))
    process.exit(result.ok ? 0 : 1)
  } catch (error) {
    console.error(`verification error: ${error.message}`)
    process.exit(2)
  }
}
