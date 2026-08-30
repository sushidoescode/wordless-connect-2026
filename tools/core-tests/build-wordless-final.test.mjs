import assert from 'node:assert/strict'
import test from 'node:test'

import { planBuild } from '../media/build-wordless-final.mjs'

function manifest(overrides = {}) {
  return {
    baseDir: 'captures/task16',
    endCardSha256: 'deadbeef',
    segments: [
      { source: 'raw/a.mov', inStart: 2, inEnd: 28, outStart: 0, outEnd: 26,
        crop: '960:1044:0:0' },
      { source: 'raw/clad.mov', inStart: 0, inEnd: 25, outStart: 26, outEnd: 51 },
    ],
    ...overrides,
  }
}

test('planBuild builds one input per segment plus the end card and a concat filter', () => {
  const plan = planBuild(manifest(), {
    captions: 'docs/submission/wordless-relay-en.srt',
    endCard: 'docs/media/wordless-relay-end-card.png',
    output: 'captures/task16/wordless-relay-final-59s.mp4',
  })
  assert.equal(plan.segmentCount, 2)
  // two product inputs (6 tokens each) + one end-card loop input (6 tokens: -loop 1 -t N -i card)
  assert.equal(plan.inputs.filter((token) => token === '-i').length, 3)
  assert.ok(plan.filterComplex.includes('concat=n=3:v=1:a=0'))
  assert.ok(plan.filterComplex.includes('subtitles='))
  assert.ok(plan.filterComplex.includes('0x200B2B'))
  assert.equal(plan.videoOut, '[vout]')
})

test('planBuild rejects a gap between segment output windows', () => {
  assert.throws(() => planBuild(manifest({
    segments: [
      { source: 'raw/a.mov', outStart: 0, outEnd: 20 },
      { source: 'raw/b.mov', outStart: 26, outEnd: 51 },
    ],
  }), { captions: 'c.srt', endCard: 'e.png', output: 'o.mp4' }), /does not abut/)
})

test('planBuild requires product segments to end at the end-card start (51s)', () => {
  assert.throws(() => planBuild(manifest({
    segments: [{ source: 'raw/a.mov', outStart: 0, outEnd: 40 }],
  }), { captions: 'c.srt', endCard: 'e.png', output: 'o.mp4' }), /must end at 51/)
})

test('planBuild rejects an empty segment list', () => {
  assert.throws(() => planBuild({ segments: [] },
    { captions: 'c.srt', endCard: 'e.png', output: 'o.mp4' }), /non-empty/)
})

test('planBuild adds an audio map only when narration is present', () => {
  const withoutAudio = planBuild(manifest(),
    { captions: 'c.srt', endCard: 'e.png', output: 'o.mp4' })
  assert.equal(withoutAudio.audioInputIndex, null)
  const withAudio = planBuild(manifest({
    narration: { source: 'narration/chris/full.mp3', sha256: 'abc' },
  }), { captions: 'c.srt', endCard: 'e.png', output: 'o.mp4' })
  assert.notEqual(withAudio.audioInputIndex, null)
})
