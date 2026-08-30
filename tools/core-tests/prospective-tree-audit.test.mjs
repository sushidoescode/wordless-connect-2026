import assert from 'node:assert/strict'
import test from 'node:test'

import {
  PATTERN_SOURCE_PATHS,
  partitionAuditReport,
} from '../security/audit-prospective-tree.mjs'

// The wrapper's git/IO layer is exercised by running the CLI; these tests cover
// the pure verdict logic that decides what actually blocks a release. Findings
// carry only rule/path/label/count — never a matched value.

const finding = (rule, path, label = null) => ({ rule, path, label, count: 1, commit: null })

test('empty report is clean (exit 0)', () => {
  const r = partitionAuditReport({ blocking: [], allowlisted: [], allowlistedCount: 0 })
  assert.equal(r.exitCode, 0)
  assert.deepEqual(r.envValueLeaks, [])
  assert.deepEqual(r.otherBlocking, [])
  assert.deepEqual(r.patternMachinery, [])
})

test('pattern-shape findings confined to detection-machinery paths are benign (exit 0)', () => {
  const blocking = [
    finding('supabase-secret-name', 'tools/core-tests/release-history-audit.test.mjs', 'SUPABASE_ACCESS_TOKEN'),
    finding('credential-shaped-value', 'tools/core-tests/public-build-config-audit.test.mjs', 'sb_secret_'),
    finding('encoded-service-role', 'docs/superpowers/plans/2026-08-24-wordless-relay-implementation.md'),
  ]
  const r = partitionAuditReport({ blocking, allowlisted: [], allowlistedCount: 0 })
  assert.equal(r.exitCode, 0)
  assert.equal(r.patternMachinery.length, 3)
  assert.deepEqual(r.otherBlocking, [])
  assert.deepEqual(r.envValueLeaks, [])
})

test('a real env-value leak ALWAYS blocks, even on a pattern-source path (exit 20)', () => {
  const blocking = [
    finding('env-value-leak', 'tools/security/audit-release-history.mjs', 'ELEVENLABS_API_KEY'),
  ]
  const r = partitionAuditReport({ blocking, allowlisted: [], allowlistedCount: 0 })
  assert.equal(r.exitCode, 20)
  assert.equal(r.envValueLeaks.length, 1)
  // an env-value-leak is never reclassified as benign machinery
  assert.equal(r.patternMachinery.length, 0)
})

test('a secret shape on a NON-machinery path blocks (exit 20)', () => {
  const blocking = [finding('credential-shaped-value', 'README.md', 'sb_secret_')]
  const r = partitionAuditReport({ blocking, allowlisted: [], allowlistedCount: 0 })
  assert.equal(r.exitCode, 20)
  assert.equal(r.otherBlocking.length, 1)
  assert.equal(r.patternMachinery.length, 0)
})

test('only allowlisted findings yields exit 10', () => {
  const r = partitionAuditReport({
    blocking: [],
    allowlisted: [finding('reference-only-material', 'docs/references/visuals/x.png')],
    allowlistedCount: 1,
  })
  assert.equal(r.exitCode, 10)
})

test('an env-value leak dominates over allowlisted-only (exit 20)', () => {
  const r = partitionAuditReport({
    blocking: [finding('env-value-leak', 'docs/x.md', 'SUPABASE_URL')],
    allowlisted: [finding('reference-only-material', 'docs/references/visuals/x.png')],
    allowlistedCount: 1,
  })
  assert.equal(r.exitCode, 20)
})

test('a mix of machinery + real finding still blocks on the real one (exit 20)', () => {
  const blocking = [
    finding('supabase-secret-name', 'tools/core-tests/release-history-audit.test.mjs', 'SUPABASE_ACCESS_TOKEN'),
    finding('database-credential', 'docs/submission/project-description.md', 'DATABASE_URL'),
  ]
  const r = partitionAuditReport({ blocking, allowlisted: [], allowlistedCount: 0 })
  assert.equal(r.exitCode, 20)
  assert.equal(r.patternMachinery.length, 1)
  assert.equal(r.otherBlocking.length, 1)
})

test('the verdict never serializes a matched value (only rule/path/label)', () => {
  const blocking = [finding('env-value-leak', 'x.md', 'ELEVENLABS_API_KEY')]
  const r = partitionAuditReport({ blocking, allowlisted: [], allowlistedCount: 0 })
  const serialized = JSON.stringify(r)
  // label is a NAME, never the value; assert no obvious value material leaked
  assert.equal(serialized.includes('ELEVENLABS_API_KEY'), true) // the name is fine
  assert.equal(/sk_[A-Za-z0-9]{20,}/.test(serialized), false)
})

test('PATTERN_SOURCE_PATHS enumerates exactly the auditor machinery + plan', () => {
  assert.ok(PATTERN_SOURCE_PATHS.has('tools/security/audit-release-history.mjs'))
  assert.ok(PATTERN_SOURCE_PATHS.has('tools/security/audit-prospective-tree.mjs'))
  assert.ok(PATTERN_SOURCE_PATHS.has('tools/core-tests/release-history-audit.test.mjs'))
  // this test file itself carries secret-shaped fixture names, so it must be enumerated too
  assert.ok(PATTERN_SOURCE_PATHS.has('tools/core-tests/prospective-tree-audit.test.mjs'))
  assert.ok(PATTERN_SOURCE_PATHS.has('docs/superpowers/plans/2026-08-24-wordless-relay-implementation.md'))
  // a normal release file must never be in the machinery set
  assert.equal(PATTERN_SOURCE_PATHS.has('README.md'), false)
  assert.equal(PATTERN_SOURCE_PATHS.has('docs/submission/project-description.md'), false)
})
