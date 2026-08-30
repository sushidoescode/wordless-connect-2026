import assert from 'node:assert/strict'
import test from 'node:test'
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { checkRelativeLinks } from '../docs/check-relative-links.mjs'

const makeFixtureTree = async () => {
  const root = await mkdtemp(join(tmpdir(), 'wordless-link-check-'))
  await mkdir(join(root, 'docs'), { recursive: true })
  await mkdir(join(root, 'node_modules', 'pkg'), { recursive: true })

  await writeFile(join(root, 'top.md'), '# Top\n')
  await writeFile(join(root, 'docs', 'b.md'), '[up to top](../top.md)\n')
  await writeFile(join(root, 'docs', 'a.md'), [
    '# Fixture page',
    '',
    'A valid relative link: [design](./b.md).',
    'A valid anchored file link: [section](b.md#part-two).',
    'A broken relative link: [gone](missing/file.md).',
    'A broken image embed: ![img](img/nope.png).',
    'An http link is skipped: [web](https://example.com/x).',
    'A pure anchor is skipped: [local](#heading).',
    'A mailto is skipped: [mail](mailto:owner@example.com).',
    'A known-future ignored file: ![hero](../docs/media/wordless-relay-hero.png).',
    'A known-future ignored capture: [clip](../captures/spike-recording.mp4).',
    '',
  ].join('\n'))
  // Never scanned: dependency directories are excluded.
  await writeFile(
    join(root, 'node_modules', 'pkg', 'readme.md'),
    '[broken](never/checked.md)\n',
  )

  return root
}

test('flags exactly the broken relative targets and nothing else', async (t) => {
  const root = await makeFixtureTree()
  t.after(() => rm(root, { recursive: true, force: true }))

  const result = await checkRelativeLinks(root, {
    ignore: ['docs/media/', 'captures/'],
  })

  assert.equal(result.ok, false)
  assert.deepEqual(result.broken, [
    { file: 'docs/a.md', link: 'img/nope.png' },
    { file: 'docs/a.md', link: 'missing/file.md' },
  ])
})

test('a fully valid tree reports ok with no broken links', async (t) => {
  const root = await mkdtemp(join(tmpdir(), 'wordless-link-check-ok-'))
  t.after(() => rm(root, { recursive: true, force: true }))

  await mkdir(join(root, 'docs'), { recursive: true })
  await writeFile(join(root, 'docs', 'guide.md'), [
    '[home](../index.md)',
    '![diagram](assets/flow.svg)',
    '[spec](guide.md#top)',
  ].join('\n'))
  await writeFile(join(root, 'index.md'), '# Index\n')
  await mkdir(join(root, 'docs', 'assets'), { recursive: true })
  await writeFile(join(root, 'docs', 'assets', 'flow.svg'), '<svg/>')

  const result = await checkRelativeLinks(root, { ignore: [] })
  assert.deepEqual(result, { ok: true, broken: [] })
})

test('ignore prefixes suppress only their own subtree', async (t) => {
  const root = await mkdtemp(join(tmpdir(), 'wordless-link-check-ignore-'))
  t.after(() => rm(root, { recursive: true, force: true }))

  await writeFile(join(root, 'page.md'), [
    '[future ok](captures/day-one.mp4)',
    '[still broken](elsewhere/day-one.mp4)',
  ].join('\n'))

  const result = await checkRelativeLinks(root, { ignore: ['captures/'] })
  assert.equal(result.ok, false)
  assert.deepEqual(result.broken, [
    { file: 'page.md', link: 'elsewhere/day-one.mp4' },
  ])
})

test('ignore option defaults to an empty list', async (t) => {
  const root = await mkdtemp(join(tmpdir(), 'wordless-link-check-default-'))
  t.after(() => rm(root, { recursive: true, force: true }))

  await writeFile(join(root, 'solo.md'), '[dangling](void.md)\n')

  const result = await checkRelativeLinks(root)
  assert.equal(result.ok, false)
  assert.deepEqual(result.broken, [{ file: 'solo.md', link: 'void.md' }])
})

test('angle-bracketed targets with spaces resolve correctly', async (t) => {
  const root = await mkdtemp(join(tmpdir(), 'wordless-link-check-angle-'))
  t.after(() => rm(root, { recursive: true, force: true }))

  await writeFile(join(root, 'spaced name.md'), '# Spaced\n')
  await writeFile(join(root, 'page.md'), [
    '[good](<spaced name.md>)',
    '[bad](<missing name.md>)',
  ].join('\n'))

  const result = await checkRelativeLinks(root)
  assert.deepEqual(result.broken, [{ file: 'page.md', link: 'missing name.md' }])
})

test('missing root directory is a clear error', async () => {
  await assert.rejects(
    () => checkRelativeLinks(join(tmpdir(), 'wordless-link-check-nonexistent-root')),
    /root|directory/i,
  )
})
