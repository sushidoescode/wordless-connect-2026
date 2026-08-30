#!/usr/bin/env node
// Deterministic assembler for the 59-second WORDLESS Relay candidate.
// Reads an edit manifest, the reviewed SRT, and the end-card PNG, verifies
// every input (existence + SHA-256) before invoking ffmpeg, then trims,
// normalizes, burns captions, appends the end card, mixes narration, and
// encodes the final MP4. Contains no absolute home path, secret, or session
// value; all paths are relative and supplied by the manifest/arguments.
//
// Usage:
//   node tools/media/build-wordless-final.mjs \
//     --manifest captures/task16/edit-manifest.json \
//     --captions docs/submission/wordless-relay-en.srt \
//     --end-card docs/media/wordless-relay-end-card.png \
//     --output captures/task16/wordless-relay-final-59s.mp4

import { createHash } from 'node:crypto'
import { readFile, stat, mkdtemp, rm } from 'node:fs/promises'
import { execFile } from 'node:child_process'
import { tmpdir } from 'node:os'
import { join, dirname, resolve } from 'node:path'
import process from 'node:process'

const OUT_W = 1920
const OUT_H = 1080
const FPS = 60
const END_CARD_START = 51.0
const TOTAL = 59.0
const CAPTION_FACE = 'Arial'

function parseArgs(argv) {
  const args = {}
  for (let i = 0; i < argv.length; i += 2) {
    const key = argv[i]
    if (!key.startsWith('--')) throw new Error(`unexpected argument: ${key}`)
    args[key.slice(2)] = argv[i + 1]
  }
  return args
}

function run(bin, args) {
  return new Promise((resolvePromise, reject) => {
    execFile(bin, args, { maxBuffer: 64 * 1024 * 1024 }, (error, stdout, stderr) => {
      if (error) {
        reject(new Error(`${bin} failed: ${stderr || error.message}`))
        return
      }
      resolvePromise({ stdout, stderr })
    })
  })
}

async function sha256(path) {
  const hash = createHash('sha256')
  hash.update(await readFile(path))
  return hash.digest('hex')
}

async function requireFile(path, expectedSha) {
  const info = await stat(path).catch(() => null)
  if (!info || !info.isFile()) throw new Error(`missing input file: ${path}`)
  if (expectedSha) {
    const actual = await sha256(path)
    if (actual !== expectedSha) {
      throw new Error(`hash mismatch for ${path}: expected ${expectedSha}, got ${actual}`)
    }
  }
}

/**
 * Builds the ffmpeg filter graph and input list for the manifest. Exported so a
 * test can assert graph shape (segment count, output geometry, caption burn,
 * end-card append) without invoking ffmpeg.
 */
export function planBuild(manifest, { captions, endCard, output }) {
  if (!Array.isArray(manifest.segments) || manifest.segments.length === 0) {
    throw new Error('manifest.segments must be a non-empty array')
  }
  const baseDir = manifest.baseDir ?? '.'
  const inputs = []
  const productSegments = []
  let expectedOut = 0

  for (const [index, segment] of manifest.segments.entries()) {
    if (typeof segment.source !== 'string') {
      throw new Error(`segment ${index} missing source`)
    }
    if (!(segment.outStart >= 0) || !(segment.outEnd > segment.outStart)) {
      throw new Error(`segment ${index} has an invalid output window`)
    }
    if (Math.abs(segment.outStart - expectedOut) > 0.0005) {
      throw new Error(`segment ${index} does not abut the previous segment ` +
        `(${segment.outStart} vs expected ${expectedOut})`)
    }
    expectedOut = segment.outEnd
    const inStart = segment.inStart ?? 0
    const inEnd = segment.inEnd ?? (inStart + (segment.outEnd - segment.outStart))
    inputs.push('-ss', String(inStart), '-to', String(inEnd),
      '-i', join(baseDir, segment.source))
    productSegments.push(index)
  }

  if (Math.abs(expectedOut - END_CARD_START) > 0.05) {
    throw new Error(`product segments must end at ${END_CARD_START}s, got ${expectedOut}s`)
  }

  const endCardIndex = inputs.length / 6 // each product input is 6 argv tokens
  // End card as a still image looped for the 8-second tail.
  inputs.push('-loop', '1', '-t', String(TOTAL - END_CARD_START), '-i', endCard)

  const narration = manifest.narration ?? null
  let audioInputIndex = null
  if (narration && typeof narration.source === 'string') {
    inputs.push('-i', join(baseDir, narration.source))
    audioInputIndex = (inputs.length - 1)
  }

  const filters = []
  const normalized = []
  manifest.segments.forEach((segment, index) => {
    const label = `p${index}`
    const crop = segment.crop
      ? `crop=${segment.crop},`
      : ''
    filters.push(
      `[${index}:v]${crop}scale=${OUT_W}:${OUT_H}:force_original_aspect_ratio=decrease,` +
      `pad=${OUT_W}:${OUT_H}:(ow-iw)/2:(oh-ih)/2:color=0x200B2B,` +
      `setsar=1,fps=${FPS},format=yuv420p[${label}]`,
    )
    normalized.push(`[${label}]`)
  })
  const endLabel = 'pend'
  filters.push(
    `[${endCardIndex}:v]scale=${OUT_W}:${OUT_H},setsar=1,fps=${FPS},format=yuv420p[${endLabel}]`,
  )
  normalized.push(`[${endLabel}]`)

  const concatIn = normalized.join('')
  filters.push(`${concatIn}concat=n=${normalized.length}:v=1:a=0[vcat]`)

  const srtPath = captions.replace(/([:\\'])/g, '\\$1')
  filters.push(
    `[vcat]subtitles='${srtPath}':force_style='FontName=${CAPTION_FACE},` +
    `Fontsize=22,PrimaryColour=&H00E8F6FF,BackColour=&H802B0B20,BorderStyle=4,` +
    `Outline=0,Shadow=0,MarginV=54,Alignment=2'[vout]`,
  )

  return {
    inputs,
    filterComplex: filters.join(';'),
    endCardIndex,
    audioInputIndex,
    videoOut: '[vout]',
    output,
    segmentCount: manifest.segments.length,
  }
}

async function main() {
  const args = parseArgs(process.argv.slice(2))
  for (const key of ['manifest', 'captions', 'end-card', 'output']) {
    if (!args[key]) throw new Error(`--${key} is required`)
  }
  const manifestPath = args.manifest
  await requireFile(manifestPath)
  const manifest = JSON.parse(await readFile(manifestPath, 'utf8'))
  manifest.baseDir = manifest.baseDir ?? dirname(manifestPath)

  await requireFile(args.captions)
  await requireFile(args['end-card'], manifest.endCardSha256)
  for (const segment of manifest.segments) {
    await requireFile(join(manifest.baseDir, segment.source), segment.sha256)
  }
  if (manifest.narration?.source) {
    await requireFile(join(manifest.baseDir, manifest.narration.source), manifest.narration.sha256)
  }

  const plan = planBuild(manifest, {
    captions: args.captions,
    endCard: args['end-card'],
    output: args.output,
  })

  const work = await mkdtemp(join(tmpdir(), 'wordless-build-'))
  try {
    const ffArgs = ['-y', ...plan.inputs, '-filter_complex', plan.filterComplex,
      '-map', plan.videoOut]
    if (plan.audioInputIndex !== null) {
      ffArgs.push('-map', `${plan.audioInputIndex / 1}:a`)
    }
    ffArgs.push(
      '-c:v', 'libx264', '-profile:v', 'high', '-pix_fmt', 'yuv420p',
      '-r', String(FPS), '-color_primaries', 'bt709', '-color_trc', 'bt709',
      '-colorspace', 'bt709',
    )
    if (plan.audioInputIndex !== null) {
      ffArgs.push(
        '-af', 'aresample=48000,loudnorm=I=-16:TP=-1.5:LRA=11',
        '-c:a', 'aac', '-b:a', '192k', '-ar', '48000',
      )
    } else {
      ffArgs.push('-an')
    }
    ffArgs.push('-movflags', '+faststart', '-t', String(TOTAL), args.output)

    await run('ffmpeg', ffArgs)

    const probe = await run('ffprobe', [
      '-v', 'error', '-show_entries', 'format=duration',
      '-of', 'default=noprint_wrappers=1:nokey=1', args.output,
    ])
    const duration = Number.parseFloat(probe.stdout.trim())
    if (!(duration >= 58.5 && duration < 60.0)) {
      throw new Error(`output duration ${duration}s is outside [58.5, 60.0)`)
    }
    process.stdout.write(`built ${args.output} at ${duration.toFixed(3)}s\n`)
  }
  finally {
    await rm(work, { recursive: true, force: true })
  }
}

const invokedDirectly = process.argv[1] !== undefined &&
  resolve(process.argv[1]) === resolve(new URL(import.meta.url).pathname)

if (invokedDirectly) {
  main().catch((error) => {
    process.stderr.write(`${error.message}\n`)
    process.exit(1)
  })
}
