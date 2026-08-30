#!/usr/bin/env node
// Renders a WORDLESS Relay SVG media asset to a PNG at an exact pixel size
// using the Playwright Chromium installation that already lives under
// web/node_modules. Deterministic and safe to re-run: the same SVG input
// produces the same rendered frame, and the output file is simply rewritten.
//
// Usage (from anywhere; paths resolve against the repository root):
//   node tools/media/render-wordless-assets.mjs \
//     [--svg docs/media/wordless-relay-end-card.svg] \
//     [--out docs/media/wordless-relay-end-card.png] \
//     [--width 1920] [--height 1080]

import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'

const scriptDir = path.dirname(fileURLToPath(import.meta.url))
const repoRoot = path.resolve(scriptDir, '..', '..')

const defaults = {
  svg: path.join('docs', 'media', 'wordless-relay-end-card.svg'),
  out: path.join('docs', 'media', 'wordless-relay-end-card.png'),
  width: '1920',
  height: '1080',
}

function parseArgs(argv) {
  const options = { ...defaults }
  for (let i = 0; i < argv.length; i += 1) {
    const flag = argv[i]
    if (!flag.startsWith('--')) {
      throw new Error(`Unexpected argument: ${flag}`)
    }
    const key = flag.slice(2)
    if (!(key in defaults)) {
      throw new Error(`Unknown option: ${flag}`)
    }
    const value = argv[i + 1]
    if (value === undefined) {
      throw new Error(`Missing value for ${flag}`)
    }
    options[key] = value
    i += 1
  }
  return options
}

const options = parseArgs(process.argv.slice(2))
const width = Number.parseInt(options.width, 10)
const height = Number.parseInt(options.height, 10)
if (!Number.isInteger(width) || width <= 0 || !Number.isInteger(height) || height <= 0) {
  throw new Error('--width and --height must be positive integers')
}

const svgPath = path.resolve(repoRoot, options.svg)
const outPath = path.resolve(repoRoot, options.out)

// Resolve Playwright from the web workspace, where it is already installed.
const webRequire = createRequire(path.join(repoRoot, 'web', 'package.json'))
const { chromium } = webRequire('playwright')

const svgText = await readFile(svgPath, 'utf8')
const page = `<!doctype html><html><head><meta charset="utf-8"><style>
  html, body { margin: 0; padding: 0; background: #200B2B; }
  svg { display: block; }
</style></head><body>${svgText}</body></html>`

const browser = await chromium.launch()
try {
  const context = await browser.newContext({
    viewport: { width, height },
    deviceScaleFactor: 1,
    reducedMotion: 'reduce',
  })
  const tab = await context.newPage()
  await tab.setContent(page, { waitUntil: 'load' })
  await tab.evaluate(() => document.fonts.ready)
  const png = await tab.screenshot({
    type: 'png',
    clip: { x: 0, y: 0, width, height },
  })
  await mkdir(path.dirname(outPath), { recursive: true })
  await writeFile(outPath, png)
  const rel = (p) => path.relative(repoRoot, p)
  console.log(`rendered ${rel(svgPath)} -> ${rel(outPath)} at ${width}x${height} (${png.length} bytes)`)
} finally {
  await browser.close()
}
