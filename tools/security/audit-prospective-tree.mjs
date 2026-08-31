#!/usr/bin/env node
// Safe prospective-tree audit wrapper (Task 6). Does the git operations the
// pure auditor deliberately avoids: it resolves a git tree, extracts every
// text blob from it with `git cat-file`, reads the ignored env files, and calls
// auditReleaseHistory IN-PROCESS so environment VALUES are only ever held in
// memory and never serialized — only variable NAMES can appear in the report.
//
// Usage:
//   node tools/security/audit-prospective-tree.mjs --tree <tree-ish|INDEX> \
//     [--root-env .env] [--web-env web/.env.local] \
//     [--sidecars <dir>]... [--report out.json] [--tree-id-out id.txt]
//
// --tree INDEX runs `git write-tree` on the current index. Exit codes mirror
// the auditor: 0 clean, 10 only known-allowlisted blockers, 20 new/blocking
// finding, 30 execution/input error.

import { execFileSync } from 'node:child_process'
import { readFileSync, writeFileSync, existsSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'
import process from 'node:process'
import { auditReleaseHistory, KNOWN_ALLOWLIST } from './audit-release-history.mjs'

// Text vs binary is decided by CONTENT over the COMPLETE buffer (not a file-
// extension allowlist and not a prefix window), so any reviewable text blob is
// scanned regardless of extension (.toml, Lens .mat / .graphShader resources,
// extensionless files, …), nothing beyond any offset can evade scanning, and a
// multibyte UTF-8 character straddling a chunk boundary can never be mis-flagged
// as binary. A blob is binary (filename-only, no content scan) iff a NUL byte
// appears ANYWHERE or the WHOLE buffer is not valid UTF-8; otherwise its full
// content is scanned.
const utf8Strict = new TextDecoder('utf-8', { fatal: true })
export function looksBinary(buf) {
  if (buf.includes(0)) return true // NUL anywhere in the complete buffer -> binary
  try { utf8Strict.decode(buf); return false } catch { return true } // validate the WHOLE buffer
}

// EXPLICITLY ENUMERATED synthetic self-references. Each entry is the EXACT
// (path, rule, label) of a secret-SHAPED hit that is, by construction, the
// credential-detection machinery itself — the auditors' own regex/marker
// source, their synthetic test fixtures, and the implementation plan that
// documents the audit commands. These are the ONLY findings the wrapper may
// exempt. `label` is matched exactly (null means the rule reports no label);
// count is NOT part of the key. Everything not on this list — including a
// home-path, a database-credential, a forbidden-filename, an env-value-leak,
// or an unexpected label EVEN INSIDE one of these machinery files — fails
// closed and blocks. Adding a genuinely new synthetic fixture requires adding
// its exact tuple here (and a reviewer sees exactly what was exempted).
export const SYNTHETIC_SELF_REFERENCES = Object.freeze([
  { path: 'docs/superpowers/plans/2026-08-24-wordless-relay-implementation.md', rule: 'encoded-service-role', label: null },
  // This wrapper's own source lists the secret NAMES below as data, so it trips
  // supabase-secret-name on itself; and its test file names them in fixtures.
  { path: 'tools/security/audit-prospective-tree.mjs', rule: 'supabase-secret-name', label: 'SUPABASE_SERVICE_ROLE_KEY' },
  { path: 'tools/security/audit-prospective-tree.mjs', rule: 'supabase-secret-name', label: 'SUPABASE_ACCESS_TOKEN' },
  { path: 'tools/security/audit-prospective-tree.mjs', rule: 'supabase-secret-name', label: 'SUPABASE_MANAGEMENT_TOKEN' },
  { path: 'tools/core-tests/prospective-tree-audit.test.mjs', rule: 'supabase-secret-name', label: 'SUPABASE_ACCESS_TOKEN' },
  { path: 'tools/core-tests/prospective-tree-audit.test.mjs', rule: 'supabase-secret-name', label: 'SUPABASE_SERVICE_ROLE_KEY' },
  { path: 'tools/core-tests/prospective-tree-audit.test.mjs', rule: 'supabase-secret-name', label: 'SUPABASE_MANAGEMENT_TOKEN' },
  { path: 'tools/core-tests/public-build-config-audit.test.mjs', rule: 'supabase-secret-name', label: 'SUPABASE_SERVICE_ROLE_KEY' },
  { path: 'tools/core-tests/public-build-config-audit.test.mjs', rule: 'credential-shaped-value', label: 'sb_secret_' },
  { path: 'tools/core-tests/public-build-config-audit.test.mjs', rule: 'encoded-service-role', label: null },
  { path: 'tools/core-tests/release-history-audit.test.mjs', rule: 'supabase-secret-name', label: 'SUPABASE_SERVICE_ROLE_KEY' },
  { path: 'tools/core-tests/release-history-audit.test.mjs', rule: 'supabase-secret-name', label: 'SUPABASE_ACCESS_TOKEN' },
  { path: 'tools/core-tests/release-history-audit.test.mjs', rule: 'supabase-secret-name', label: 'SUPABASE_MANAGEMENT_TOKEN' },
  { path: 'tools/core-tests/release-history-audit.test.mjs', rule: 'database-credential', label: 'DATABASE_URL' },
  { path: 'tools/core-tests/release-history-audit.test.mjs', rule: 'database-credential', label: 'POSTGRES_PASSWORD' },
  { path: 'tools/core-tests/release-history-audit.test.mjs', rule: 'database-credential', label: 'postgres-url' },
  { path: 'tools/core-tests/release-history-audit.test.mjs', rule: 'encoded-service-role', label: null },
  { path: 'tools/security/audit-public-build-config.mjs', rule: 'supabase-secret-name', label: 'SUPABASE_SERVICE_ROLE_KEY' },
  { path: 'tools/security/audit-public-build-config.mjs', rule: 'supabase-secret-name', label: 'SUPABASE_ACCESS_TOKEN' },
  { path: 'tools/security/audit-public-build-config.mjs', rule: 'supabase-secret-name', label: 'SUPABASE_MANAGEMENT_TOKEN' },
  { path: 'tools/security/audit-public-build-config.mjs', rule: 'encoded-service-role', label: null },
  { path: 'tools/security/audit-release-history.mjs', rule: 'supabase-secret-name', label: 'SUPABASE_SERVICE_ROLE_KEY' },
  { path: 'tools/security/audit-release-history.mjs', rule: 'supabase-secret-name', label: 'SUPABASE_ACCESS_TOKEN' },
  { path: 'tools/security/audit-release-history.mjs', rule: 'supabase-secret-name', label: 'SUPABASE_MANAGEMENT_TOKEN' },
  { path: 'tools/security/audit-release-history.mjs', rule: 'encoded-service-role', label: null },
])

// Structured, fully-reviewable tuple key (no control-character sentinel): a
// path/rule/label collision is impossible because JSON encodes each field.
const selfRefKey = (path, rule, label) => JSON.stringify([path, rule, label ?? null])
const SYNTHETIC_SELF_REFERENCE_KEYS = new Set(
  SYNTHETIC_SELF_REFERENCES.map((e) => selfRefKey(e.path, e.rule, e.label)))

// Partitions a pure-auditor report into the release verdict this wrapper
// reports, FAILING CLOSED: a blocking finding is exempted ONLY when its exact
// (path, rule, label) tuple is one of SYNTHETIC_SELF_REFERENCES. Every other
// finding blocks — env-value-leak, absolute-home-path, database-credential,
// forbidden-filename, jwt-shaped-value, or an unexpected label, INCLUDING
// inside a machinery file. Pure — no git, no I/O — so it is unit-testable.
export function partitionAuditReport(report, exemptKeys = SYNTHETIC_SELF_REFERENCE_KEYS) {
  const blocking = Array.isArray(report?.blocking) ? report.blocking : []
  const isExempt = (f) =>
    f.rule !== 'env-value-leak' &&
    exemptKeys.has(selfRefKey(f.path, f.rule, f.label ?? null))
  const envValueLeaks = blocking.filter((f) => f.rule === 'env-value-leak')
  const exempted = blocking.filter((f) => isExempt(f))
  const otherBlocking = blocking.filter((f) => f.rule !== 'env-value-leak' && !isExempt(f))
  let exitCode
  if (envValueLeaks.length > 0 || otherBlocking.length > 0) exitCode = 20
  else if ((report?.allowlistedCount ?? 0) > 0) exitCode = 10
  else exitCode = 0
  return {
    exitCode,
    envValueLeaks,
    otherBlocking,
    patternMachinery: exempted,
    allowlisted: report?.allowlisted ?? [],
  }
}

function git(args) {
  return execFileSync('git', args, { maxBuffer: 256 * 1024 * 1024 })
}

// Decides text vs binary from the blob's own BYTES (content), then returns the
// scannable blob: text -> full UTF-8 content; binary -> filename-only ('').
export function blobFromBuffer(path, buf) {
  return looksBinary(buf) ? { path, text: '' } : { path, text: buf.toString('utf8') }
}

function collectTreeBlobs(tree) {
  const listing = git(['ls-tree', '-r', '--format=%(objecttype) %(path)', tree]).toString()
  const blobs = []
  for (const line of listing.split('\n')) {
    if (!line) continue
    const sp = line.indexOf(' ')
    const type = line.slice(0, sp)
    const path = line.slice(sp + 1)
    if (type !== 'blob') continue
    let buf
    try { buf = git(['cat-file', 'blob', `${tree}:${path}`]) } // Buffer
    catch { blobs.push({ path, text: '' }); continue }
    blobs.push(blobFromBuffer(path, buf))
  }
  return blobs
}

function collectSidecars(dirs) {
  const out = []
  const walk = (d) => {
    for (const name of readdirSync(d)) {
      const full = join(d, name)
      const st = statSync(full)
      if (st.isDirectory()) walk(full)
      else if (st.isFile()) {
        try { out.push(blobFromBuffer(full, readFileSync(full))) } catch { /* skip */ }
      }
    }
  }
  for (const d of dirs) { if (existsSync(d)) walk(d) }
  return out
}

function parseArgs(argv) {
  const o = { tree: null, rootEnv: null, webEnv: null, sidecars: [], report: null, treeIdOut: null }
  for (let i = 0; i < argv.length; i += 2) {
    const k = argv[i]; const v = argv[i + 1]
    if (v === undefined) return null
    if (k === '--tree') o.tree = v
    else if (k === '--root-env') o.rootEnv = v
    else if (k === '--web-env') o.webEnv = v
    else if (k === '--sidecars') o.sidecars.push(v)
    else if (k === '--report') o.report = v
    else if (k === '--tree-id-out') o.treeIdOut = v
    else return null
  }
  return o
}

async function main() {
  const a = parseArgs(process.argv.slice(2))
  if (!a || a.tree === null) {
    process.stderr.write('usage: audit-prospective-tree.mjs --tree <tree-ish|INDEX> [--root-env f] [--web-env f] [--sidecars dir]... [--report out.json] [--tree-id-out id.txt]\n')
    process.exit(30)
  }
  let tree = a.tree
  try {
    if (tree === 'INDEX') tree = git(['write-tree']).toString().trim()
    else tree = git(['rev-parse', `${tree}^{tree}`]).toString().trim()
  } catch (e) {
    process.stderr.write(`git tree resolution failed: ${e.message}\n`); process.exit(30)
  }
  if (a.treeIdOut) writeFileSync(a.treeIdOut, tree + '\n')

  const treeBlobs = collectTreeBlobs(tree)
  const sidecars = collectSidecars(a.sidecars)
  const readEnv = (p) => (p && existsSync(p)) ? { path: p, text: readFileSync(p, 'utf8') } : null

  // Real text for every blob: the env-value-leak comparison must cover all
  // blobs (a real credential pasted into any file — auditor sources included —
  // must still be caught). Pattern-SHAPE false positives are separated below,
  // never suppressed at scan time.
  const { exitCode: rawExit, report } = await auditReleaseHistory({
    tree: treeBlobs,
    rootEnv: readEnv(a.rootEnv),
    webEnv: readEnv(a.webEnv),
    sidecars,
    report: a.report,
    allowlist: KNOWN_ALLOWLIST,
  })
  if (rawExit === 30) {
    process.stdout.write(JSON.stringify({ tree, exitCode: 30, report }, null, 2) + '\n')
    process.exit(30)
  }

  const { exitCode, envValueLeaks: envLeaks, otherBlocking, patternMachinery, allowlisted } =
    partitionAuditReport(report)

  const summary = {
    tree,
    exitCode,
    treeBlobCount: treeBlobs.length,
    sidecarCount: sidecars.length,
    envValueLeaks: envLeaks,
    otherBlocking,
    allowlisted,
    syntheticSelfReferences: {
      note: 'exempted ONLY because each exact (path, rule, label) is an enumerated synthetic self-reference (auditor patterns / fixtures / documented commands); every other finding — incl. any rule not on the list, even inside these files — fails closed and blocks',
      enumerated: SYNTHETIC_SELF_REFERENCES,
      findings: patternMachinery,
    },
    rawAuditorExit: rawExit,
    rawBlockingCount: report.blockingCount,
  }
  // Summary holds only counts/paths/labels — safe to print and serialize.
  process.stdout.write(JSON.stringify(summary, null, 2) + '\n')
  if (a.report) {
    const summaryPath = a.report.replace(/\.json$/, '') + '.summary.json'
    writeFileSync(summaryPath, JSON.stringify(summary, null, 2) + '\n')
  }
  process.exit(exitCode)
}

const invokedDirectly = process.argv[1] !== undefined &&
  import.meta.url === pathToFileURL(process.argv[1]).href

if (invokedDirectly) {
  main().catch((e) => { process.stderr.write(`error: ${e.message}\n`); process.exit(30) })
}
