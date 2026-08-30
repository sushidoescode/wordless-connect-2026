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

const TEXT_EXT = new Set([
  '.md', '.txt', '.ts', '.tsx', '.js', '.mjs', '.cjs', '.json', '.scene',
  '.meta', '.html', '.css', '.srt', '.yml', '.yaml', '.sh', '.svg', '.esproj',
  '.graphql', '.map',
])

// Files whose secret-SHAPED strings are, by construction, the detection
// machinery itself: the credential auditors' own regex/marker source, their
// synthetic test fixtures (e.g. a repetition-built `sb_secret_…`, a fake JWT),
// and the implementation plan that documents the exact audit commands/patterns.
// These carry no real credential value; the env-value-leak comparison still
// runs against every blob including these, so a real leak would still be
// caught. Filename-based rules still apply. This mirrors the build-config
// audit's existing `--glob '!…audit-public-build-config.mjs'` self-exclusion.
export const PATTERN_SOURCE_PATHS = new Set([
  'tools/security/audit-public-build-config.mjs',
  'tools/security/audit-release-history.mjs',
  'tools/security/audit-prospective-tree.mjs',
  'tools/core-tests/public-build-config-audit.test.mjs',
  'tools/core-tests/release-history-audit.test.mjs',
  'tools/core-tests/prospective-tree-audit.test.mjs',
  'docs/superpowers/plans/2026-08-24-wordless-relay-implementation.md',
])

// Partitions a pure-auditor report (its `blocking`/`allowlisted`/counts) into
// the release verdict this wrapper reports. env-value-leak on ANY path always
// blocks (rule checked first, so it can never be masked). Pattern-SHAPE
// findings confined to the enumerated detection-machinery paths are benign
// self-references, separated out; a pattern-shape finding on any OTHER path
// stays blocking. Pure — no git, no I/O — so it is unit-testable.
export function partitionAuditReport(report, patternSourcePaths = PATTERN_SOURCE_PATHS) {
  const blocking = Array.isArray(report?.blocking) ? report.blocking : []
  const envValueLeaks = blocking.filter((f) => f.rule === 'env-value-leak')
  const patternMachinery = blocking.filter(
    (f) => f.rule !== 'env-value-leak' && patternSourcePaths.has(f.path))
  const otherBlocking = blocking.filter(
    (f) => f.rule !== 'env-value-leak' && !patternSourcePaths.has(f.path))
  let exitCode
  if (envValueLeaks.length > 0 || otherBlocking.length > 0) exitCode = 20
  else if ((report?.allowlistedCount ?? 0) > 0) exitCode = 10
  else exitCode = 0
  return { exitCode, envValueLeaks, otherBlocking, patternMachinery, allowlisted: report?.allowlisted ?? [] }
}

function git(args) {
  return execFileSync('git', args, { maxBuffer: 256 * 1024 * 1024 })
}

function isTextPath(p) {
  const dot = p.lastIndexOf('.')
  if (dot < 0) return true // extensionless (LICENSE, etc.) — treat as text
  return TEXT_EXT.has(p.slice(dot).toLowerCase())
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
    if (isTextPath(path)) {
      let text = ''
      try { text = git(['cat-file', 'blob', `${tree}:${path}`]).toString('utf8') }
      catch { text = '' }
      blobs.push({ path, text })
    } else {
      // binary: filename-only check (reference-image paths etc.), no content
      blobs.push({ path, text: '' })
    }
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
      else if (st.isFile() && isTextPath(full)) {
        try { out.push({ path: full, text: readFileSync(full, 'utf8') }) } catch { /* skip */ }
      } else if (st.isFile()) {
        out.push({ path: full, text: '' })
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
    patternSourceSelfReferences: {
      note: 'secret-SHAPED strings that are the credential auditors\' own detection patterns, synthetic test fixtures, and the plan\'s documented audit commands — no real credential value; env-value-leak still scanned these blobs',
      paths: [...PATTERN_SOURCE_PATHS],
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
