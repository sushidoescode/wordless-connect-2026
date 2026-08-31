import assert from 'node:assert/strict'
import test from 'node:test'
import { execFileSync } from 'node:child_process'
import { mkdtempSync, writeFileSync, mkdirSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'

import {
  SYNTHETIC_SELF_REFERENCES,
  partitionAuditReport,
} from '../security/audit-prospective-tree.mjs'
import { auditReleaseHistory } from '../security/audit-release-history.mjs'

// Findings carry only rule/path/label/count — never a matched value.
const finding = (rule, path, label = null) => ({ rule, path, label, count: 1, commit: null })

// A path + rule + label that IS an enumerated synthetic self-reference.
const MACHINERY = 'tools/core-tests/release-history-audit.test.mjs'

test('empty report is clean (exit 0)', () => {
  const r = partitionAuditReport({ blocking: [], allowlisted: [], allowlistedCount: 0 })
  assert.equal(r.exitCode, 0)
  assert.deepEqual(r.envValueLeaks, [])
  assert.deepEqual(r.otherBlocking, [])
  assert.deepEqual(r.patternMachinery, [])
})

test('an enumerated synthetic self-reference is exempted (exit 0)', () => {
  const blocking = [
    finding('supabase-secret-name', MACHINERY, 'SUPABASE_ACCESS_TOKEN'),
    finding('database-credential', MACHINERY, 'DATABASE_URL'),
    finding('encoded-service-role', MACHINERY, null),
  ]
  const r = partitionAuditReport({ blocking, allowlisted: [], allowlistedCount: 0 })
  assert.equal(r.exitCode, 0)
  assert.equal(r.patternMachinery.length, 3)
  assert.deepEqual(r.otherBlocking, [])
})

test('env-value-leak ALWAYS blocks, even on an enumerated machinery path (exit 20)', () => {
  const blocking = [finding('env-value-leak', MACHINERY, 'ELEVENLABS_API_KEY')]
  const r = partitionAuditReport({ blocking, allowlisted: [], allowlistedCount: 0 })
  assert.equal(r.exitCode, 20)
  assert.equal(r.envValueLeaks.length, 1)
  assert.equal(r.patternMachinery.length, 0)
})

// --- FAIL-CLOSED NEGATIVES: non-enumerated findings block even in machinery files ---

test('absolute-home-path in a machinery file BLOCKS (not enumerated → exit 20)', () => {
  const blocking = [finding('absolute-home-path', MACHINERY, null)]
  const r = partitionAuditReport({ blocking, allowlisted: [], allowlistedCount: 0 })
  assert.equal(r.exitCode, 20)
  assert.equal(r.otherBlocking.length, 1)
  assert.equal(r.patternMachinery.length, 0)
})

test('a database-credential with an UNENUMERATED label in a machinery file BLOCKS (exit 20)', () => {
  // DATABASE_URL is enumerated for this path; DATABASE_PASSWORD is NOT.
  const blocking = [finding('database-credential', MACHINERY, 'DATABASE_PASSWORD')]
  const r = partitionAuditReport({ blocking, allowlisted: [], allowlistedCount: 0 })
  assert.equal(r.exitCode, 20)
  assert.equal(r.otherBlocking.length, 1)
  assert.equal(r.patternMachinery.length, 0)
})

test('a forbidden-filename finding on a machinery path BLOCKS (exit 20)', () => {
  const blocking = [finding('forbidden-filename', MACHINERY, '.env')]
  const r = partitionAuditReport({ blocking, allowlisted: [], allowlistedCount: 0 })
  assert.equal(r.exitCode, 20)
  assert.equal(r.otherBlocking.length, 1)
})

test('an UNEXPECTED label for an otherwise-enumerated (path, rule) BLOCKS (exit 20)', () => {
  // supabase-secret-name is enumerated for this path only for the three known
  // names; a different name must not be laundered through.
  const blocking = [finding('supabase-secret-name', MACHINERY, 'SUPABASE_DB_PASSWORD')]
  const r = partitionAuditReport({ blocking, allowlisted: [], allowlistedCount: 0 })
  assert.equal(r.exitCode, 20)
  assert.equal(r.otherBlocking.length, 1)
})

test('an enumerated (rule,label) on a DIFFERENT path BLOCKS (exit 20)', () => {
  const blocking = [finding('supabase-secret-name', 'README.md', 'SUPABASE_ACCESS_TOKEN')]
  const r = partitionAuditReport({ blocking, allowlisted: [], allowlistedCount: 0 })
  assert.equal(r.exitCode, 20)
  assert.equal(r.otherBlocking.length, 1)
})

test('a credential shape on a non-machinery path BLOCKS (exit 20)', () => {
  const blocking = [finding('credential-shaped-value', 'README.md', 'sb_secret_')]
  const r = partitionAuditReport({ blocking, allowlisted: [], allowlistedCount: 0 })
  assert.equal(r.exitCode, 20)
  assert.equal(r.otherBlocking.length, 1)
})

test('only allowlisted findings yields exit 10', () => {
  const r = partitionAuditReport({
    blocking: [],
    allowlisted: [finding('reference-only-material', 'docs/references/visuals/x.png')],
    allowlistedCount: 1,
  })
  assert.equal(r.exitCode, 10)
})

test('an env-value leak dominates allowlisted-only (exit 20)', () => {
  const r = partitionAuditReport({
    blocking: [finding('env-value-leak', 'docs/x.md', 'SUPABASE_URL')],
    allowlisted: [finding('reference-only-material', 'docs/references/visuals/x.png')],
    allowlistedCount: 1,
  })
  assert.equal(r.exitCode, 20)
})

test('a mix of enumerated + one non-enumerated finding still blocks on the real one', () => {
  const blocking = [
    finding('supabase-secret-name', MACHINERY, 'SUPABASE_ACCESS_TOKEN'), // enumerated
    finding('absolute-home-path', MACHINERY, null), // NOT enumerated
  ]
  const r = partitionAuditReport({ blocking, allowlisted: [], allowlistedCount: 0 })
  assert.equal(r.exitCode, 20)
  assert.equal(r.patternMachinery.length, 1)
  assert.equal(r.otherBlocking.length, 1)
})

test('the verdict never serializes a value shape (only rule/path/label)', () => {
  const blocking = [finding('env-value-leak', 'x.md', 'ELEVENLABS_API_KEY')]
  const r = partitionAuditReport({ blocking, allowlisted: [], allowlistedCount: 0 })
  const serialized = JSON.stringify(r)
  assert.equal(serialized.includes('ELEVENLABS_API_KEY'), true) // the NAME is fine
  assert.equal(/sk_[A-Za-z0-9]{20,}/.test(serialized), false)
})

test('SYNTHETIC_SELF_REFERENCES enumerates known machinery tuples and no release file', () => {
  const keys = new Set(SYNTHETIC_SELF_REFERENCES.map((e) => `${e.path} ${e.rule} ${e.label ?? 'null'}`))
  assert.ok(keys.has('tools/core-tests/release-history-audit.test.mjs supabase-secret-name SUPABASE_ACCESS_TOKEN'))
  assert.ok(keys.has('tools/core-tests/prospective-tree-audit.test.mjs supabase-secret-name SUPABASE_ACCESS_TOKEN'))
  assert.ok(keys.has('docs/superpowers/plans/2026-08-24-wordless-relay-implementation.md encoded-service-role null'))
  // no normal release file may be enumerated
  for (const e of SYNTHETIC_SELF_REFERENCES) {
    assert.ok(
      e.path.startsWith('tools/') || e.path.startsWith('docs/superpowers/plans/'),
      `unexpected enumerated path: ${e.path}`,
    )
    assert.notEqual(e.path, 'README.md')
    assert.notEqual(e.path, 'docs/submission/project-description.md')
  }
})

// --- INTEGRATION: real auditReleaseHistory + partition on synthetic blobs ---

test('INTEGRATION: real auditor + partition — a home path in a machinery file blocks', async () => {
  // A machinery-named blob whose only hit is an absolute home path (built as a
  // literal so scanBlobForFindings actually matches it).
  const homePath = ['', 'Users', 'someone', 'proj', 'x.txt'].join('/')
  const tree = [
    { path: MACHINERY, text: `const p = "${homePath}"\n` },
    { path: 'README.md', text: 'clean prose, nothing secret here\n' },
  ]
  const { report } = await auditReleaseHistory({ tree })
  const verdict = partitionAuditReport(report)
  assert.equal(verdict.exitCode, 20, 'home path in a machinery file must block')
  assert.ok(verdict.otherBlocking.some((f) => f.rule === 'absolute-home-path' && f.path === MACHINERY))
})

test('INTEGRATION: real auditor + partition — enumerated fixture names alone stay clean', async () => {
  const tree = [
    { path: MACHINERY, text: 'labels: SUPABASE_ACCESS_TOKEN SUPABASE_SERVICE_ROLE_KEY SUPABASE_MANAGEMENT_TOKEN\n' },
  ]
  const { report } = await auditReleaseHistory({ tree })
  const verdict = partitionAuditReport(report)
  assert.equal(verdict.exitCode, 0, 'enumerated fixture names must be exempt')
  assert.ok(verdict.otherBlocking.length === 0)
})

// --- CLI: spawn the wrapper against a throwaway git repo ---

test('CLI: wrapper exits 20 when a machinery file carries a non-enumerated home path', () => {
  const dir = mkdtempSync(join(tmpdir(), 'wl-audit-cli-'))
  try {
    const wrapper = resolve('tools/security/audit-prospective-tree.mjs')
    const auditor = resolve('tools/security/audit-release-history.mjs')
    // The wrapper imports ./audit-release-history.mjs relative to itself, so the
    // temp repo needs both files at the same relative location it reads from.
    mkdirSync(join(dir, 'tools/security'), { recursive: true })
    mkdirSync(join(dir, 'tools/core-tests'), { recursive: true })
    execFileSync('cp', [wrapper, join(dir, 'tools/security/audit-prospective-tree.mjs')])
    execFileSync('cp', [auditor, join(dir, 'tools/security/audit-release-history.mjs')])
    // A machinery-named file whose only finding is a home path (not enumerated).
    const homePath = ['', 'Users', 'someone', 'proj', 'y.txt'].join('/')
    writeFileSync(join(dir, 'tools/core-tests/release-history-audit.test.mjs'), `const p = "${homePath}"\n`)
    writeFileSync(join(dir, 'README.md'), 'clean\n')
    execFileSync('git', ['init', '-q'], { cwd: dir })
    execFileSync('git', ['config', 'user.email', 't@t'], { cwd: dir })
    execFileSync('git', ['config', 'user.name', 't'], { cwd: dir })
    execFileSync('git', ['add', '-A'], { cwd: dir })
    let code = 0
    try {
      execFileSync('node', ['tools/security/audit-prospective-tree.mjs', '--tree', 'INDEX'],
        { cwd: dir, stdio: 'pipe' })
    } catch (e) { code = e.status }
    assert.equal(code, 20, 'CLI must block a non-enumerated home path in a machinery file')
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
})

test('CLI: wrapper exits 0 on a repo whose only hits are enumerated fixture names', () => {
  const dir = mkdtempSync(join(tmpdir(), 'wl-audit-cli-'))
  try {
    const wrapper = resolve('tools/security/audit-prospective-tree.mjs')
    const auditor = resolve('tools/security/audit-release-history.mjs')
    mkdirSync(join(dir, 'tools/security'), { recursive: true })
    mkdirSync(join(dir, 'tools/core-tests'), { recursive: true })
    execFileSync('cp', [wrapper, join(dir, 'tools/security/audit-prospective-tree.mjs')])
    execFileSync('cp', [auditor, join(dir, 'tools/security/audit-release-history.mjs')])
    writeFileSync(join(dir, 'tools/core-tests/release-history-audit.test.mjs'),
      'SUPABASE_ACCESS_TOKEN SUPABASE_SERVICE_ROLE_KEY SUPABASE_MANAGEMENT_TOKEN\n')
    writeFileSync(join(dir, 'README.md'), 'clean\n')
    execFileSync('git', ['init', '-q'], { cwd: dir })
    execFileSync('git', ['config', 'user.email', 't@t'], { cwd: dir })
    execFileSync('git', ['config', 'user.name', 't'], { cwd: dir })
    execFileSync('git', ['add', '-A'], { cwd: dir })
    let code = 0
    try {
      execFileSync('node', ['tools/security/audit-prospective-tree.mjs', '--tree', 'INDEX'],
        { cwd: dir, stdio: 'pipe' })
    } catch (e) { code = e.status }
    assert.equal(code, 0, 'enumerated fixture names alone must pass')
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
})

// --- CONTENT-based text detection (no extension allowlist) ---

// Runs the wrapper against a throwaway repo whose files are given as
// { relpath: Buffer|string }; returns the wrapper exit code.
function runWrapperOnFiles(files) {
  const dir = mkdtempSync(join(tmpdir(), 'wl-audit-content-'))
  try {
    mkdirSync(join(dir, 'tools/security'), { recursive: true })
    execFileSync('cp', [resolve('tools/security/audit-prospective-tree.mjs'), join(dir, 'tools/security/audit-prospective-tree.mjs')])
    execFileSync('cp', [resolve('tools/security/audit-release-history.mjs'), join(dir, 'tools/security/audit-release-history.mjs')])
    for (const [rel, content] of Object.entries(files)) {
      const full = join(dir, rel)
      mkdirSync(join(full, '..'), { recursive: true })
      writeFileSync(full, content)
    }
    execFileSync('git', ['init', '-q'], { cwd: dir })
    execFileSync('git', ['config', 'user.email', 't@t'], { cwd: dir })
    execFileSync('git', ['config', 'user.name', 't'], { cwd: dir })
    execFileSync('git', ['add', '-A'], { cwd: dir })
    let code = 0
    try {
      execFileSync('node', ['tools/security/audit-prospective-tree.mjs', '--tree', 'INDEX'], { cwd: dir, stdio: 'pipe' })
    } catch (e) { code = e.status }
    return code
  } finally { rmSync(dir, { recursive: true, force: true }) }
}

const HOME = ['', 'Users', 'someone', 'proj', 'x.txt'].join('/') // matches the home-path rule

test('CONTENT: a home path in a .toml (not in any extension allowlist) is scanned and BLOCKS', () => {
  assert.equal(runWrapperOnFiles({ 'config.toml': `path = "${HOME}"\n`, 'README.md': 'clean\n' }), 20)
})

test('CONTENT: a home path in a Lens .mat text resource is scanned and BLOCKS', () => {
  // Lens material files are YAML-like text; the old extension allowlist omitted
  // them, so this proves content-detection now scans them.
  assert.equal(runWrapperOnFiles({ 'Assets/M.mat': `- !<Material>\n  path: "${HOME}"\n`, 'README.md': 'clean\n' }), 20)
})

test('CONTENT: an extensionless text file with a home path is scanned and BLOCKS', () => {
  assert.equal(runWrapperOnFiles({ NOTES: `see ${HOME}\n`, 'README.md': 'clean\n' }), 20)
})

test('CONTENT: a BINARY blob (NUL byte) carrying a home-path-shaped string stays filename-only (exit 0)', () => {
  // A NUL in the sniff window makes the blob binary -> content is NOT scanned, so
  // the home-path-shaped bytes inside do not trigger a finding.
  const bin = Buffer.concat([Buffer.from([0x00, 0x01, 0x02]), Buffer.from(`${HOME}\n`)])
  assert.equal(runWrapperOnFiles({ 'blob.mesh': bin, 'README.md': 'clean\n' }), 0)
})
