import assert from 'node:assert/strict'
import test from 'node:test'
import { execFile } from 'node:child_process'
import { access, copyFile, mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { promisify } from 'node:util'

import {
  parseBlackdetectStderr,
  parseLoudnormJson,
  parseSilencedetectStderr,
  scanTopLevelBoxes,
  verifyWordlessVideo,
} from '../media/verify-wordless-video.mjs'

const execFileAsync = promisify(execFile)

const checkByName = (result, name) => {
  const found = result.checks.find((check) => check.name === name)
  assert.notEqual(found, undefined, `expected a check named ${name}`)
  return found
}

const failingCheckNames = (result) =>
  result.checks.filter((check) => check.ok === false).map((check) => check.name)

const fileExists = async (path) => {
  try {
    await access(path)
    return true
  } catch {
    return false
  }
}

// ---------------------------------------------------------------------------
// Pure parser tests (no ffmpeg required)
// ---------------------------------------------------------------------------

test('parseLoudnormJson extracts input loudness and true peak from stderr', () => {
  const stderr = [
    'ffmpeg version banner noise',
    '[Parsed_loudnorm_0 @ 0x600000c1c000]',
    '{',
    '\t"input_i" : "-16.05",',
    '\t"input_tp" : "-13.02",',
    '\t"input_lra" : "0.00",',
    '\t"input_thresh" : "-26.08",',
    '\t"output_i" : "-16.00",',
    '\t"target_offset" : "0.05"',
    '}',
  ].join('\n')

  assert.deepEqual(parseLoudnormJson(stderr), {
    inputIntegratedLufs: -16.05,
    inputTruePeakDbtp: -13.02,
  })
})

test('parseLoudnormJson returns null for stderr without a loudnorm block', () => {
  assert.equal(parseLoudnormJson(''), null)
  assert.equal(parseLoudnormJson('no json here { broken'), null)
  assert.equal(parseLoudnormJson('{"unrelated": true}'), null)
})

test('parseBlackdetectStderr collects black intervals and ignores other lines', () => {
  const stderr = [
    'frame=  120 fps=0.0 q=-0.0 size=N/A',
    '[blackdetect @ 0x7f9] black_start:2.4 black_end:3.15 black_duration:0.75',
    '[blackdetect @ 0x7f9] black_start:10 black_end:10.5 black_duration:0.5',
  ].join('\n')

  assert.deepEqual(parseBlackdetectStderr(stderr), [
    { start: 2.4, end: 3.15, duration: 0.75 },
    { start: 10, end: 10.5, duration: 0.5 },
  ])
  assert.deepEqual(parseBlackdetectStderr('clean run, no detections'), [])
})

test('parseSilencedetectStderr pairs starts with ends and keeps open tails', () => {
  const stderr = [
    '[silencedetect @ 0x1] silence_start: 12.5',
    '[silencedetect @ 0x1] silence_end: 13.25 | silence_duration: 0.75',
    '[silencedetect @ 0x1] silence_start: 58.9',
  ].join('\n')

  assert.deepEqual(parseSilencedetectStderr(stderr), [
    { start: 12.5, end: 13.25, duration: 0.75 },
    { start: 58.9, end: null, duration: null },
  ])
  assert.deepEqual(parseSilencedetectStderr(''), [])
})

const box = (type, payloadLength) => {
  const buffer = Buffer.alloc(8 + payloadLength)
  buffer.writeUInt32BE(8 + payloadLength, 0)
  buffer.write(type, 4, 'ascii')
  return buffer
}

test('scanTopLevelBoxes reports offsets for faststart-ordered boxes', async () => {
  const file = Buffer.concat([box('ftyp', 8), box('moov', 16), box('mdat', 32)])
  const boxes = await scanTopLevelBoxes(file)

  assert.deepEqual(boxes, [
    { type: 'ftyp', offset: 0, size: 16 },
    { type: 'moov', offset: 16, size: 24 },
    { type: 'mdat', offset: 40, size: 40 },
  ])
})

test('scanTopLevelBoxes handles 64-bit largesize and to-end-of-file boxes', async () => {
  const large = Buffer.alloc(16 + 4)
  large.writeUInt32BE(1, 0)
  large.write('mdat', 4, 'ascii')
  large.writeBigUInt64BE(20n, 8)
  const toEnd = Buffer.alloc(8 + 4)
  toEnd.writeUInt32BE(0, 0)
  toEnd.write('moov', 4, 'ascii')

  const boxes = await scanTopLevelBoxes(Buffer.concat([box('ftyp', 0), large, toEnd]))
  assert.deepEqual(boxes, [
    { type: 'ftyp', offset: 0, size: 8 },
    { type: 'mdat', offset: 8, size: 20 },
    { type: 'moov', offset: 28, size: 12 },
  ])
})

test('scanTopLevelBoxes rejects a truncated or malformed box header', async () => {
  const malformed = Buffer.alloc(8)
  malformed.writeUInt32BE(3, 0) // impossible size < 8 that is not 0 or 1
  malformed.write('free', 4, 'ascii')

  await assert.rejects(() => scanTopLevelBoxes(malformed), /box/i)
})

// ---------------------------------------------------------------------------
// Fixture-driven tests (generate tiny clips with ffmpeg inside the test)
// ---------------------------------------------------------------------------

let ffmpegAvailable = true
try {
  await execFileAsync('ffmpeg', ['-version'])
  await execFileAsync('ffprobe', ['-version'])
} catch {
  ffmpegAvailable = false
}

const fixtureDir = await mkdtemp(join(tmpdir(), 'wordless-video-verifier-'))
const wrongFixture = join(fixtureDir, 'wrong-profile.mp4')
const nearlyFixture = join(fixtureDir, 'nearly-conformant.mp4')

if (ffmpegAvailable) {
  // Deliberately wrong: 640x480, 30 fps, yuv422p, no audio, no faststart.
  await execFileAsync('ffmpeg', [
    '-v', 'error', '-nostdin', '-y',
    '-f', 'lavfi', '-i', 'testsrc=size=640x480:rate=30',
    '-t', '1',
    '-pix_fmt', 'yuv422p',
    '-c:v', 'libx264', '-preset', 'ultrafast',
    wrongFixture,
  ])
  // Conformant except duration: 1 s, 1920x1080, 60 fps, yuv420p, aac 48 kHz.
  // The lavfi sine source sits near -21.8 LUFS, so +5.8 dB lands close to
  // -16 LUFS integrated with roughly -11.7 dBTP true peak.
  await execFileAsync('ffmpeg', [
    '-v', 'error', '-nostdin', '-y',
    '-f', 'lavfi', '-i', 'testsrc2=size=1920x1080:rate=60',
    '-f', 'lavfi', '-i', 'sine=frequency=440:sample_rate=48000',
    '-t', '1',
    '-pix_fmt', 'yuv420p',
    '-c:v', 'libx264', '-preset', 'ultrafast',
    '-af', 'volume=5.8dB',
    '-c:a', 'aac', '-b:a', '192k', '-ar', '48000',
    '-movflags', '+faststart',
    nearlyFixture,
  ])
}

test.after(async () => {
  await rm(fixtureDir, { recursive: true, force: true })
})

test('missing file reports a clear failing check instead of throwing', async () => {
  const result = await verifyWordlessVideo(join(fixtureDir, 'does-not-exist.mp4'))

  assert.equal(result.ok, false)
  const readable = checkByName(result, 'file-readable')
  assert.equal(readable.ok, false)
  assert.match(readable.detail, /unreadable|not found|no such/i)
})

test('wrong-profile fixture fails with the specific check names', async (t) => {
  if (!ffmpegAvailable) return t.skip('ffmpeg unavailable on this machine')

  const result = await verifyWordlessVideo(wrongFixture)
  assert.equal(result.ok, false)

  const failing = failingCheckNames(result)
  for (const expected of [
    'duration',
    'video-resolution',
    'video-pixel-format',
    'video-frame-rate',
    'audio-stream-count',
    'faststart',
  ]) {
    assert.ok(failing.includes(expected), `expected ${expected} to fail; failing: ${failing.join(', ')}`)
  }

  assert.equal(checkByName(result, 'file-readable').ok, true)
  assert.equal(checkByName(result, 'video-stream-count').ok, true)
  assert.equal(checkByName(result, 'video-codec').ok, true)
  assert.equal(checkByName(result, 'clean-decode').ok, true)

  assert.equal(result.measurements.width, 640)
  assert.equal(result.measurements.height, 480)
  assert.equal(result.measurements.frameRate, '30/1')
  assert.equal(result.measurements.audioStreamCount, 0)
})

test('shell metacharacters in the path are inert (execFile, not a shell)', async (t) => {
  if (!ffmpegAvailable) return t.skip('ffmpeg unavailable on this machine')

  const hostileName = 'clip;$(touch injected)&`touch injected`.mp4'
  const hostilePath = join(fixtureDir, hostileName)
  await copyFile(wrongFixture, hostilePath)

  const result = await verifyWordlessVideo(hostilePath)

  // The probe actually ran against the file (stream facts were measured) ...
  assert.equal(checkByName(result, 'file-readable').ok, true)
  assert.equal(result.measurements.width, 640)
  // ... and no shell ever interpreted the metacharacters.
  assert.equal(await fileExists(join(fixtureDir, 'injected')), false)
  assert.equal(await fileExists(join(process.cwd(), 'injected')), false)
})

test('nearly-conformant 1 s fixture fails only on length-derived checks', async (t) => {
  if (!ffmpegAvailable) return t.skip('ffmpeg unavailable on this machine')

  const result = await verifyWordlessVideo(nearlyFixture)
  assert.equal(result.ok, false)

  const failing = failingCheckNames(result)
  assert.ok(failing.includes('duration'), `duration must fail; failing: ${failing.join(', ')}`)
  for (const name of failing) {
    assert.ok(
      name === 'duration' || name === 'frame-count',
      `only duration/frame-count may fail for this fixture, got: ${failing.join(', ')}`,
    )
  }

  assert.equal(checkByName(result, 'video-resolution').ok, true)
  assert.equal(checkByName(result, 'video-frame-rate').ok, true)
  assert.equal(checkByName(result, 'video-pixel-format').ok, true)
  assert.equal(checkByName(result, 'audio-codec').ok, true)
  assert.equal(checkByName(result, 'audio-sample-rate').ok, true)
  assert.equal(checkByName(result, 'faststart').ok, true)
  assert.equal(checkByName(result, 'clean-decode').ok, true)
  assert.equal(checkByName(result, 'loudness-integrated').ok, true)
  assert.equal(checkByName(result, 'loudness-true-peak').ok, true)
  assert.equal(checkByName(result, 'black-intervals').ok, true)
  assert.equal(checkByName(result, 'trailing-silence').ok, true)

  assert.ok(result.measurements.moovOffset < result.measurements.mdatOffset)
  assert.ok(result.measurements.integratedLoudnessLufs >= -17)
  assert.ok(result.measurements.integratedLoudnessLufs <= -15)
  assert.ok(result.measurements.truePeakDbtp <= -1.5)
})

test('verifier report is a plain serializable shape', async () => {
  const result = await verifyWordlessVideo(join(fixtureDir, 'nope.mp4'))

  assert.equal(typeof result.ok, 'boolean')
  assert.ok(Array.isArray(result.checks))
  for (const check of result.checks) {
    assert.equal(typeof check.name, 'string')
    assert.equal(typeof check.ok, 'boolean')
    assert.equal(typeof check.detail, 'string')
  }
  assert.equal(typeof result.measurements, 'object')
  assert.doesNotThrow(() => JSON.stringify(result))
})
