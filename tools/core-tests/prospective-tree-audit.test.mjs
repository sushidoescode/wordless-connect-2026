import assert from 'node:assert/strict'
import test from 'node:test'
import { execFileSync } from 'node:child_process'
import { mkdtempSync, writeFileSync, mkdirSync, rmSync, symlinkSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'

import {
  SYNTHETIC_SELF_REFERENCES,
  partitionAuditReport,
  looksBinary,
  blobFromBuffer,
  collectTreeBlobs,
  collectSidecars,
  parseArgs,
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

// --- CONTENT detection over the COMPLETE buffer (no prefix window) ---

const HOME_PATH = ['', 'Users', 'someone', 'proj', 'z.txt'].join('/') // matches the home-path rule

// A valid-UTF-8 buffer whose multibyte character (U+20AC '€', 3 bytes) straddles
// the old 65536-byte sniff boundary (bytes 65535/65536/65537), followed by a
// home path. Under a prefix-window decode this looked "binary" (truncated char);
// under whole-buffer validation it is valid text and must be scanned.
function boundaryStraddleBuffer() {
  const head = Buffer.alloc(65535, 0x61) // 65535 'a'
  const euro = Buffer.from('€', 'utf8')  // 0xE2 0x82 0xAC at indices 65535..65537
  const tail = Buffer.from(` see ${HOME_PATH}\n`, 'utf8')
  return Buffer.concat([head, euro, tail])
}

test('looksBinary: valid UTF-8 with a multibyte char across the 64 KiB boundary is TEXT', () => {
  assert.equal(looksBinary(boundaryStraddleBuffer()), false)
})

test('looksBinary: a NUL byte anywhere (incl. beyond 64 KiB) is BINARY', () => {
  const late = Buffer.concat([Buffer.alloc(70000, 0x61), Buffer.from([0x00]), Buffer.from('x')])
  assert.equal(looksBinary(late), true)
  assert.equal(looksBinary(Buffer.from([0x00, 0x41])), true)
})

test('looksBinary: invalid UTF-8 without a NUL is BINARY (filename-only)', () => {
  // 0xFF is never a valid UTF-8 lead byte; no NUL present.
  assert.equal(looksBinary(Buffer.from([0xff, 0xfe, 0x41, 0x42])), true)
})

test('INTEGRATION: a home path in text that straddles the 64 KiB boundary is scanned and BLOCKS', async () => {
  const blob = blobFromBuffer('notes.md', boundaryStraddleBuffer())
  assert.ok(blob.text.includes(HOME_PATH), 'boundary-straddling text must be scanned as full content')
  const { report } = await auditReleaseHistory({ tree: [blob] })
  const verdict = partitionAuditReport(report)
  assert.equal(verdict.exitCode, 20)
  assert.ok(verdict.otherBlocking.some((f) => f.rule === 'absolute-home-path' && f.path === 'notes.md'))
})

test('INTEGRATION: a home path BEYOND 64 KiB cannot evade scanning (BLOCKS)', async () => {
  const buf = Buffer.concat([Buffer.alloc(70000, 0x61), Buffer.from(`\n${HOME_PATH}\n`, 'utf8')])
  const blob = blobFromBuffer('big.md', buf)
  assert.ok(blob.text.includes(HOME_PATH))
  const { report } = await auditReleaseHistory({ tree: [blob] })
  assert.equal(partitionAuditReport(report).exitCode, 20)
})

test('INTEGRATION: genuine binary (NUL) carrying a home-path-shaped string stays filename-only (exit 0)', async () => {
  const bin = Buffer.concat([Buffer.from([0x00, 0x01]), Buffer.from(`${HOME_PATH}\n`, 'utf8')])
  const blob = blobFromBuffer('blob.mesh', bin)
  assert.equal(blob.text, '')
  const { report } = await auditReleaseHistory({ tree: [blob] })
  assert.equal(partitionAuditReport(report).exitCode, 0)
})

test('selfRefKey (JSON tuple) still exempts enumerated refs and blocks a home path in a machinery file', () => {
  const finding2 = (rule, path, label = null) => ({ rule, path, label, count: 1, commit: null })
  const r = partitionAuditReport({
    blocking: [
      finding2('supabase-secret-name', 'tools/core-tests/release-history-audit.test.mjs', 'SUPABASE_ACCESS_TOKEN'),
      finding2('absolute-home-path', 'tools/core-tests/release-history-audit.test.mjs', null),
    ],
    allowlisted: [], allowlistedCount: 0,
  })
  assert.equal(r.exitCode, 20)
  assert.equal(r.patternMachinery.length, 1)
  assert.equal(r.otherBlocking.length, 1)
})

// --- FAIL-CLOSED tree/sidecar handling (ls-tree -z, object-id retrieval) ---

const HOMEPATH = ['', 'Users', 'nobody', 'p', 'x.txt'].join('/') // matches the home-path rule
const OID = (c) => c.repeat(40) // fake 40-hex object id

// Build a `git ls-tree -r -z` buffer from [{object, path(str|Buffer), content(str|Buffer)}].
function lsTreeZ(entries) {
  const parts = []
  for (const e of entries) {
    parts.push(Buffer.from(`100644 blob ${e.object}\t`, 'latin1'))
    parts.push(Buffer.isBuffer(e.path) ? e.path : Buffer.from(e.path, 'utf8'))
    parts.push(Buffer.from([0x00]))
  }
  return Buffer.concat(parts)
}
// Injectable git runner: serves ls-tree from entries, cat-file by object id.
function fakeRun(entries, { failCatFile = false, lsTreeBuf = null } = {}) {
  const byId = new Map(entries.map((e) => [e.object, Buffer.isBuffer(e.content) ? e.content : Buffer.from(e.content ?? '', 'utf8')]))
  return (args) => {
    if (args[0] === 'ls-tree') return lsTreeBuf ?? lsTreeZ(entries)
    if (args[0] === 'cat-file') {
      if (failCatFile) throw new Error('injected cat-file failure')
      const b = byId.get(args[2])
      if (!b) throw new Error('unknown object ' + args[2])
      return b
    }
    throw new Error('unexpected git call: ' + args.join(' '))
  }
}

for (const [name, path] of [
  ['newline', 'a\nb.txt'],
  ['tab', 'a\tb.txt'],
  ['double-quote', 'a"b.txt'],
  ['backslash', 'a\\b.txt'],
]) {
  test(`FAIL-CLOSED: a ${name} filename with a home path is parsed (by object id) and BLOCKS`, async () => {
    const blobs = collectTreeBlobs('T', fakeRun([{ object: OID('a'), path, content: `x ${HOMEPATH}\n` }]))
    assert.equal(blobs.length, 1)
    assert.equal(blobs[0].path, path, 'path preserved losslessly')
    assert.ok(blobs[0].text.includes(HOMEPATH), 'content scanned (retrieved by object id)')
    const { report } = await auditReleaseHistory({ tree: blobs })
    assert.equal(partitionAuditReport(report).exitCode, 20)
  })
}

test('FAIL-CLOSED: an injected cat-file read failure THROWS (no silent empty text)', () => {
  assert.throws(
    () => collectTreeBlobs('T', fakeRun([{ object: OID('b'), path: 'ok.md', content: 'hi' }], { failCatFile: true })),
    /cat-file/i)
})

test('FAIL-CLOSED: a non-UTF-8 tree path THROWS (cannot represent safely → exit 30)', () => {
  const badPath = Buffer.from([0xff, 0xfe, 0x2e, 0x74, 0x78, 0x74]) // invalid UTF-8 lead bytes
  assert.throws(() => collectTreeBlobs('T', fakeRun([{ object: OID('c'), path: badPath, content: 'x' }])),
    /valid UTF-8|cannot represent/i)
})

test('FAIL-CLOSED: a malformed ls-tree record (no TAB) THROWS', () => {
  const buf = Buffer.concat([Buffer.from('100644 blob ' + OID('d'), 'latin1'), Buffer.from([0x00])]) // no TAB/path
  assert.throws(() => collectTreeBlobs('T', fakeRun([], { lsTreeBuf: buf })), /no TAB/i)
})

test('FAIL-CLOSED: a malformed object id THROWS', () => {
  const buf = Buffer.concat([Buffer.from('100644 blob NOTAHASH\tok.md', 'latin1'), Buffer.from([0x00])])
  assert.throws(() => collectTreeBlobs('T', fakeRun([], { lsTreeBuf: buf })), /object id/i)
})

test('FAIL-CLOSED: a broken symlink in a sidecar dir THROWS (no silent skip → exit 30)', () => {
  const dir = mkdtempSync(join(tmpdir(), 'wl-sidecar-fail-'))
  try {
    symlinkSync(join(dir, 'does-not-exist-target'), join(dir, 'broken-link'))
    assert.throws(() => collectSidecars([dir]))
  } finally { rmSync(dir, { recursive: true, force: true }) }
})

test('CLI: the reproduced NEWLINE-filename case BLOCKS (exit 20), not a false clean', () => {
  const dir = mkdtempSync(join(tmpdir(), 'wl-audit-nl-'))
  try {
    mkdirSync(join(dir, 'tools/security'), { recursive: true })
    execFileSync('cp', [resolve('tools/security/audit-prospective-tree.mjs'), join(dir, 'tools/security/audit-prospective-tree.mjs')])
    execFileSync('cp', [resolve('tools/security/audit-release-history.mjs'), join(dir, 'tools/security/audit-release-history.mjs')])
    // a real file whose NAME contains a newline, carrying a home path
    writeFileSync(join(dir, 'a\nb.txt'), `see ${HOMEPATH}\n`)
    writeFileSync(join(dir, 'README.md'), 'clean\n')
    execFileSync('git', ['init', '-q'], { cwd: dir })
    execFileSync('git', ['config', 'user.email', 't@t'], { cwd: dir })
    execFileSync('git', ['config', 'user.name', 't'], { cwd: dir })
    execFileSync('git', ['add', '-A'], { cwd: dir })
    let code = 0
    try { execFileSync('node', ['tools/security/audit-prospective-tree.mjs', '--tree', 'INDEX'], { cwd: dir, stdio: 'pipe' }) }
    catch (e) { code = e.status }
    assert.equal(code, 20, 'a home path in a newline-named file must block, not exit clean')
  } finally { rmSync(dir, { recursive: true, force: true }) }
})

// --- FAIL-CLOSED explicit-input handling: --sidecars and --root-env/--web-env ---

// A throwaway git repo with the wrapper+auditor and one clean tracked file, so a
// test can add sidecar dirs / env files and run the wrapper with explicit flags.
function setupWrapperRepo() {
  const dir = mkdtempSync(join(tmpdir(), 'wl-audit-io-'))
  mkdirSync(join(dir, 'tools/security'), { recursive: true })
  execFileSync('cp', [resolve('tools/security/audit-prospective-tree.mjs'), join(dir, 'tools/security/audit-prospective-tree.mjs')])
  execFileSync('cp', [resolve('tools/security/audit-release-history.mjs'), join(dir, 'tools/security/audit-release-history.mjs')])
  writeFileSync(join(dir, 'README.md'), 'clean prose, nothing secret here\n')
  execFileSync('git', ['init', '-q'], { cwd: dir })
  execFileSync('git', ['config', 'user.email', 't@t'], { cwd: dir })
  execFileSync('git', ['config', 'user.name', 't'], { cwd: dir })
  execFileSync('git', ['add', '-A'], { cwd: dir })
  return dir
}
function runWrapper(dir, extraArgs) {
  let code = 0
  try {
    execFileSync('node', ['tools/security/audit-prospective-tree.mjs', '--tree', 'INDEX', ...extraArgs],
      { cwd: dir, stdio: 'pipe' })
  } catch (e) { code = e.status }
  return code
}

test('CLI: an explicitly supplied MISSING --sidecars dir exits 30 (no silent skip)', () => {
  const dir = setupWrapperRepo()
  try { assert.equal(runWrapper(dir, ['--sidecars', 'does/not/exist']), 30) }
  finally { rmSync(dir, { recursive: true, force: true }) }
})

test('CLI: --sidecars pointing at a FILE (not a directory) exits 30', () => {
  const dir = setupWrapperRepo()
  try { assert.equal(runWrapper(dir, ['--sidecars', 'README.md']), 30) }
  finally { rmSync(dir, { recursive: true, force: true }) }
})

test('CLI: an explicitly supplied MISSING --root-env exits 30', () => {
  const dir = setupWrapperRepo()
  try { assert.equal(runWrapper(dir, ['--root-env', 'nope.env']), 30) }
  finally { rmSync(dir, { recursive: true, force: true }) }
})

test('CLI: an explicitly supplied MISSING --web-env exits 30', () => {
  const dir = setupWrapperRepo()
  try { assert.equal(runWrapper(dir, ['--web-env', 'web/nope.env']), 30) }
  finally { rmSync(dir, { recursive: true, force: true }) }
})

test('CLI: a --root-env file containing a NUL byte (not UTF-8 text) exits 30', () => {
  const dir = setupWrapperRepo()
  try {
    writeFileSync(join(dir, 'bad.env'), Buffer.from([0x41, 0x00, 0x42])) // "A\0B"
    assert.equal(runWrapper(dir, ['--root-env', 'bad.env']), 30)
  } finally { rmSync(dir, { recursive: true, force: true }) }
})

test('CLI: a --root-env file with invalid UTF-8 (no NUL) exits 30', () => {
  const dir = setupWrapperRepo()
  try {
    writeFileSync(join(dir, 'bad2.env'), Buffer.from([0xff, 0xfe, 0x41])) // invalid UTF-8 lead bytes
    assert.equal(runWrapper(dir, ['--root-env', 'bad2.env']), 30)
  } finally { rmSync(dir, { recursive: true, force: true }) }
})

test('CLI: a valid --root-env / --web-env / --sidecars set still audits clean (exit 0)', () => {
  const dir = setupWrapperRepo()
  try {
    writeFileSync(join(dir, 'root.env'), 'SUPABASE_URL=https://wl-unique-test-abcdefghijk.example\n')
    mkdirSync(join(dir, 'web'), { recursive: true })
    writeFileSync(join(dir, 'web/local.env'), 'VITE_X=y\n')
    mkdirSync(join(dir, 'sc'), { recursive: true })
    writeFileSync(join(dir, 'sc/note.md'), 'clean sidecar prose\n')
    assert.equal(runWrapper(dir, ['--root-env', 'root.env', '--web-env', 'web/local.env', '--sidecars', 'sc']), 0)
  } finally { rmSync(dir, { recursive: true, force: true }) }
})

// An OMITTED env/sidecar option remains valid — covered by the earlier CLI tests
// that pass neither and exit 0/20; asserted here directly at the unit level too.
test('FAIL-CLOSED: collectSidecars on a MISSING dir THROWS (no silent skip)', () => {
  const dir = mkdtempSync(join(tmpdir(), 'wl-missing-'))
  rmSync(dir, { recursive: true, force: true }) // now guaranteed absent
  assert.throws(() => collectSidecars([dir]))
})

test('FAIL-CLOSED: collectSidecars on a non-directory path THROWS', () => {
  const dir = mkdtempSync(join(tmpdir(), 'wl-sidecar-file-'))
  try {
    const f = join(dir, 'afile.txt'); writeFileSync(f, 'x')
    assert.throws(() => collectSidecars([f]), /not a directory/i)
  } finally { rmSync(dir, { recursive: true, force: true }) }
})

test('FAIL-CLOSED: an unsupported sidecar entry (fifo, neither file nor dir) THROWS', (t) => {
  const dir = mkdtempSync(join(tmpdir(), 'wl-sidecar-fifo-'))
  try {
    try { execFileSync('mkfifo', [join(dir, 'pipe')]) }
    catch { t.skip('mkfifo unavailable on this platform'); return }
    assert.throws(() => collectSidecars([dir]), /unsupported sidecar filesystem entry/i)
  } finally { rmSync(dir, { recursive: true, force: true }) }
})

test('collectSidecars with NO dirs returns [] (an omitted --sidecars option is valid)', () => {
  assert.deepEqual(collectSidecars([]), [])
})

// --- FAIL-CLOSED tree framing: NUL-termination, empty records, headers, gitlinks ---

test('FAIL-CLOSED: ls-tree -z output not NUL-terminated THROWS (truncated)', () => {
  const buf = Buffer.from(`100644 blob ${OID('e')}\tok.md`, 'latin1') // no trailing NUL
  assert.throws(() => collectTreeBlobs('T', fakeRun([], { lsTreeBuf: buf })), /NUL-terminated/i)
})

test('FAIL-CLOSED: an empty ls-tree -z record (stray/double NUL) THROWS', () => {
  const rec = Buffer.from(`100644 blob ${OID('e')}\tok.md`, 'latin1')
  const buf = Buffer.concat([Buffer.from([0x00]), rec, Buffer.from([0x00])]) // leading empty record
  assert.throws(() => collectTreeBlobs('T', fakeRun([], { lsTreeBuf: buf })), /empty ls-tree/i)
})

test('FAIL-CLOSED: a non-blob terminal entry (gitlink commit) THROWS (no silent skip)', () => {
  const buf = Buffer.concat([Buffer.from(`160000 commit ${OID('f')}\tsubmod`, 'latin1'), Buffer.from([0x00])])
  assert.throws(() => collectTreeBlobs('T', fakeRun([], { lsTreeBuf: buf })), /non-blob terminal entry|gitlink/i)
})

test('FAIL-CLOSED: an unknown ls-tree object type THROWS', () => {
  const buf = Buffer.concat([Buffer.from(`100644 widget ${OID('f')}\tok.md`, 'latin1'), Buffer.from([0x00])])
  assert.throws(() => collectTreeBlobs('T', fakeRun([], { lsTreeBuf: buf })), /unknown ls-tree object type/i)
})

test('FAIL-CLOSED: a header with the wrong field count THROWS', () => {
  const buf = Buffer.concat([Buffer.from(`100644 blob\tok.md`, 'latin1'), Buffer.from([0x00])]) // missing object-id field
  assert.throws(() => collectTreeBlobs('T', fakeRun([], { lsTreeBuf: buf })), /record header/i)
})

test('FAIL-CLOSED: a malformed mode field THROWS', () => {
  const buf = Buffer.concat([Buffer.from(`XYZ blob ${OID('f')}\tok.md`, 'latin1'), Buffer.from([0x00])])
  assert.throws(() => collectTreeBlobs('T', fakeRun([], { lsTreeBuf: buf })), /malformed ls-tree mode/i)
})

test('FAIL-CLOSED: a well-formed multi-record NUL-terminated tree parses every blob', () => {
  const entries = [
    { object: OID('a'), path: 'one.md', content: 'first\n' },
    { object: OID('b'), path: 'dir/two.md', content: 'second\n' },
  ]
  const blobs = collectTreeBlobs('T', fakeRun(entries))
  assert.equal(blobs.length, 2)
  assert.deepEqual(blobs.map((b) => b.path).sort(), ['dir/two.md', 'one.md'])
})

// --- parseArgs: omitted-vs-empty and duplicate singleton flags (fail closed) ---

test('parseArgs: omitted optional flags are valid (null/[] defaults)', () => {
  const o = parseArgs(['--tree', 'HEAD'])
  assert.equal(o.tree, 'HEAD')
  assert.equal(o.rootEnv, null)
  assert.equal(o.webEnv, null)
  assert.deepEqual(o.sidecars, [])
  assert.equal(o.report, null)
  assert.equal(o.treeIdOut, null)
})

test('parseArgs: an explicitly EMPTY --root-env value is rejected (null, not omission)', () => {
  assert.equal(parseArgs(['--tree', 'HEAD', '--root-env', '']), null)
})

test('parseArgs: an explicitly EMPTY --web-env value is rejected (null)', () => {
  assert.equal(parseArgs(['--tree', 'HEAD', '--web-env', '']), null)
})

test('parseArgs: an explicitly EMPTY --sidecars value is rejected (null)', () => {
  assert.equal(parseArgs(['--tree', 'HEAD', '--sidecars', '']), null)
})

test('parseArgs: an empty --tree value is rejected (null)', () => {
  assert.equal(parseArgs(['--tree', '']), null)
})

test('parseArgs: a duplicate singleton --tree is rejected (null)', () => {
  assert.equal(parseArgs(['--tree', 'HEAD', '--tree', 'INDEX']), null)
})

test('parseArgs: a duplicate --root-env is rejected (null)', () => {
  assert.equal(parseArgs(['--tree', 'HEAD', '--root-env', '.env', '--root-env', 'other.env']), null)
})

test('parseArgs: a duplicate --report is rejected (null)', () => {
  assert.equal(parseArgs(['--tree', 'HEAD', '--report', 'a.json', '--report', 'b.json']), null)
})

test('parseArgs: --sidecars MAY repeat (valid, order preserved)', () => {
  const o = parseArgs(['--tree', 'HEAD', '--sidecars', 'a', '--sidecars', 'b'])
  assert.deepEqual(o.sidecars, ['a', 'b'])
})

test('parseArgs: a flag with no value is rejected (null)', () => {
  assert.equal(parseArgs(['--tree']), null)
})

test('parseArgs: an unknown flag is rejected (null)', () => {
  assert.equal(parseArgs(['--tree', 'HEAD', '--bogus', 'x']), null)
})

test('CLI: an explicitly empty --root-env value exits 30', () => {
  const dir = setupWrapperRepo()
  try { assert.equal(runWrapper(dir, ['--root-env', '']), 30) }
  finally { rmSync(dir, { recursive: true, force: true }) }
})

test('CLI: an explicitly empty --web-env value exits 30', () => {
  const dir = setupWrapperRepo()
  try { assert.equal(runWrapper(dir, ['--web-env', '']), 30) }
  finally { rmSync(dir, { recursive: true, force: true }) }
})
