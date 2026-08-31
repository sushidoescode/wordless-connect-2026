#!/usr/bin/env node
// Audits release-candidate text blobs (prospective tree, env files, built
// bundle, sidecar files) for secret-shaped content, private-path leaks, and
// forbidden filenames before the repository is made public.
//
// The report carries ONLY safe counts, blob paths, rule names, and labels
// (variable names or credential prefixes) — never a matched value, hash of a
// value, or file excerpt.
//
// The scanning logic is pure and data-driven: callers supply text blobs (for
// history audits, a wrapper enumerates git blobs and feeds them in; this tool
// itself never invokes git). The CLI reads the same blob groups from a JSON
// manifest file.
//
// Usage:
//   node tools/security/audit-release-history.mjs --manifest blobs.json \
//     [--allowlist allow.json] [--report out.json]
//   node tools/security/audit-release-history.mjs --help
//
// Manifest shape: { "tree": [{"path", "text", "commit"?}...], "rootEnv":
// {"path", "text"}|null, "webEnv": ...|null, "bundle": [...], "sidecars":
// [...] }. Allowlist shape mirrors KNOWN_ALLOWLIST below.
//
// Exit codes:
//   0  clean — no findings
//  10  only known-allowlisted blockers remain
//  20  at least one new/blocking finding
//  30  execution or input error

import { readFile, writeFile } from 'node:fs/promises'
import process from 'node:process'
import { pathToFileURL } from 'node:url'

// Known, owner-reviewed allowlist. Callers may pass their own allowlist data;
// this constant records the currently approved exceptions.
export const KNOWN_ALLOWLIST = Object.freeze({
  // Reference-only AI-generated inspiration images: absent from the
  // prospective tree but reachable in history.
  referenceImagePaths: Object.freeze([
    'docs/references/visuals/wordless-relay-chatgpt-north-star.png',
    'docs/references/visuals/wordless-relay-gemini-alternate.jpeg',
    'docs/references/visuals/wordless-relay-gemini-ui-reference.jpeg',
  ]),
  // Historical absolute-home-path hits confined to these commits.
  homePathCommits: Object.freeze(['4cffae0', '4dc5751']),
  // Current owner-decision privacy blockers.
  privacyBlockerPaths: Object.freeze([
    'docs/research/competitive-audit-2026-08-24.md',
    'docs/research/fable-connect-verdict-original.md',
  ]),
})

const SUPABASE_SECRET_NAME = /\b(SUPABASE_SERVICE_ROLE_KEY|SUPABASE_ACCESS_TOKEN|SUPABASE_MANAGEMENT_TOKEN)\b/g
const DATABASE_CREDENTIAL_NAME = /\b(DATABASE_URL|DATABASE_PASSWORD|POSTGRES_PASSWORD)\s*=/g
const POSTGRES_URL_SHAPE = /\bpostgres(?:ql)?:\/\/\S+/g
const CREDENTIAL_VALUE_SHAPES = Object.freeze([
  ['sb_secret_', /\bsb_secret_[A-Za-z0-9_-]{20,}/g],
  ['sbp_', /\bsbp_[A-Za-z0-9_-]{20,}/g],
  ['gho_', /\bgho_[A-Za-z0-9_-]{20,}/g],
  ['sk-', /\bsk-[A-Za-z0-9_-]{20,}/g],
])
const ENCODED_SERVICE_ROLE = 'c2VydmljZV9yb2xl'
const JWT_SHAPE = /\beyJ[A-Za-z0-9_-]{4,}\.[A-Za-z0-9_-]{4,}\.[A-Za-z0-9_-]{4,}/g
// Pattern only — matches occurrences of macOS home directories in scanned
// text; the matched path itself is never echoed into any finding.
const HOME_PATH_SHAPE = /\/Users\/[A-Za-z0-9._-]+\//g
const ENV_FILENAME = /(^|\/)\.env(\.[^/]+)?$/
const ENV_EXAMPLE_FILENAME = /(^|\/)\.env\.example$/
const LOCAL_ONLY_SEGMENT = /(^|\/)Assets\/LocalOnly(\/|$)/
const REFERENCE_VISUALS_PREFIX = 'docs/references/visuals/'
// Env-value leak comparison threshold. Only env values with at least this many
// characters are searched for inside release blobs. Rationale: every real
// credential in this project is long (ELEVENLABS_API_KEY 51, VITE_SUPABASE_URL
// 40, VITE_SUPABASE_PUBLIC_KEY 46 chars — all compared); the only sub-threshold
// value is the six-character session-coordination code (VITE_RELAY_SESSION_ID,
// e.g. EOU4LZ), which is NOT a secret and is intentionally committed in the Lens
// scene, so comparing it would raise a false positive on legitimate content.
// Short values are therefore excluded by design; see docs/submission/release-checklist.md
// §7. If a genuinely short secret is ever introduced, lower this threshold.
const ENV_LEAK_MIN_VALUE_LENGTH = 12

const countMatches = (text, pattern) => {
  let count = 0
  pattern.lastIndex = 0
  while (pattern.exec(text) !== null) count += 1
  return count
}

// Scans one text blob. Returns findings shaped
// { rule, path, label, count } — labels are rule identifiers (variable names
// or credential prefixes), never matched values.
export function scanBlobForFindings(text, filename) {
  if (typeof text !== 'string' || typeof filename !== 'string') {
    throw new TypeError('scanBlobForFindings requires (text: string, filename: string)')
  }
  const findings = []
  const add = (rule, label, count) => {
    if (count > 0) findings.push({ rule, path: filename, label, count })
  }

  // Filename-based rules fire regardless of content.
  if (ENV_FILENAME.test(filename) && !ENV_EXAMPLE_FILENAME.test(filename)) {
    add('forbidden-filename', '.env', 1)
  }
  if (LOCAL_ONLY_SEGMENT.test(filename)) {
    add('forbidden-filename', 'Assets/LocalOnly', 1)
  }
  if (filename.startsWith(REFERENCE_VISUALS_PREFIX)) {
    add('reference-only-material', null, 1)
  }

  const secretNames = new Map()
  SUPABASE_SECRET_NAME.lastIndex = 0
  for (const match of text.matchAll(SUPABASE_SECRET_NAME)) {
    secretNames.set(match[1], (secretNames.get(match[1]) ?? 0) + 1)
  }
  for (const [name, count] of secretNames) add('supabase-secret-name', name, count)

  const databaseNames = new Map()
  DATABASE_CREDENTIAL_NAME.lastIndex = 0
  for (const match of text.matchAll(DATABASE_CREDENTIAL_NAME)) {
    databaseNames.set(match[1], (databaseNames.get(match[1]) ?? 0) + 1)
  }
  for (const [name, count] of databaseNames) add('database-credential', name, count)
  add('database-credential', 'postgres-url', countMatches(text, POSTGRES_URL_SHAPE))

  for (const [label, shape] of CREDENTIAL_VALUE_SHAPES) {
    add('credential-shaped-value', label, countMatches(text, shape))
  }

  add('encoded-service-role', null, text.split(ENCODED_SERVICE_ROLE).length - 1)
  add('jwt-shaped-value', null, countMatches(text, JWT_SHAPE))
  add('absolute-home-path', null, countMatches(text, HOME_PATH_SHAPE))

  return findings
}

const isSafeFinding = (finding) =>
  finding !== null &&
  typeof finding === 'object' &&
  !Array.isArray(finding) &&
  typeof finding.rule === 'string' && finding.rule !== '' &&
  typeof finding.path === 'string' && finding.path !== '' &&
  (finding.label === null || finding.label === undefined || typeof finding.label === 'string') &&
  Number.isInteger(finding.count) && finding.count >= 1 &&
  (finding.commit === null || finding.commit === undefined || typeof finding.commit === 'string')

const isStringArray = (value) =>
  Array.isArray(value) && value.every((entry) => typeof entry === 'string')

const isAllowlist = (value) =>
  value !== null &&
  typeof value === 'object' &&
  isStringArray(value.referenceImagePaths) &&
  isStringArray(value.homePathCommits) &&
  isStringArray(value.privacyBlockerPaths)

const errorResult = (message) => ({
  exitCode: 30,
  report: { error: message, totalFindings: 0, allowlisted: [], blocking: [] },
})

const safeFindingView = (finding) => ({
  rule: finding.rule,
  path: finding.path,
  label: finding.label ?? null,
  count: finding.count,
  commit: finding.commit ?? null,
})

// Classifies findings against the allowlist. Returns { exitCode, report };
// the report repeats only rule/path/label/count/commit fields.
export function classifyFindings(findings, allowlist) {
  if (!Array.isArray(findings)) {
    return errorResult('findings must be an array')
  }
  if (!isAllowlist(allowlist)) {
    return errorResult('allowlist must provide referenceImagePaths, homePathCommits, and privacyBlockerPaths string arrays')
  }
  if (!findings.every(isSafeFinding)) {
    return errorResult('findings contain a malformed entry')
  }

  const allowlisted = []
  const blocking = []
  for (const finding of findings) {
    const known =
      allowlist.referenceImagePaths.includes(finding.path) ||
      allowlist.privacyBlockerPaths.includes(finding.path) ||
      (finding.rule === 'absolute-home-path' &&
        typeof finding.commit === 'string' &&
        allowlist.homePathCommits.includes(finding.commit))
    if (known) allowlisted.push(safeFindingView(finding))
    else blocking.push(safeFindingView(finding))
  }

  let exitCode = 0
  if (blocking.length > 0) exitCode = 20
  else if (allowlisted.length > 0) exitCode = 10

  return {
    exitCode,
    report: {
      totalFindings: findings.length,
      allowlistedCount: allowlisted.length,
      blockingCount: blocking.length,
      allowlisted,
      blocking,
    },
  }
}

const isBlob = (value) =>
  value !== null &&
  typeof value === 'object' &&
  typeof value.path === 'string' && value.path !== '' &&
  typeof value.text === 'string' &&
  (value.commit === null || value.commit === undefined || typeof value.commit === 'string')

const isBlobArray = (value) => Array.isArray(value) && value.every(isBlob)

function parseEnvValues(content) {
  const entries = new Map()
  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim()
    if (line === '' || line.startsWith('#')) continue
    const separator = line.indexOf('=')
    if (separator <= 0) continue
    const name = line.slice(0, separator).trim()
    let value = line.slice(separator + 1).trim()
    if ((value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith('\'') && value.endsWith('\''))) {
      value = value.slice(1, -1)
    }
    entries.set(name, value)
  }
  return entries
}

// Audits the provided blob groups. All inputs are data; no git, no network.
// `report` (optional) is a path the JSON report is written to.
export async function auditReleaseHistory({
  tree = [],
  rootEnv = null,
  webEnv = null,
  bundle = [],
  sidecars = [],
  report = null,
  allowlist = KNOWN_ALLOWLIST,
} = {}) {
  for (const [name, group] of [['tree', tree], ['bundle', bundle], ['sidecars', sidecars]]) {
    if (!isBlobArray(group)) {
      return errorResult(`${name} must be an array of { path, text, commit? } blobs`)
    }
  }
  for (const [name, envBlob] of [['rootEnv', rootEnv], ['webEnv', webEnv]]) {
    if (envBlob !== null && !isBlob(envBlob)) {
      return errorResult(`${name} must be null or a { path, text } blob`)
    }
  }

  // Local env values must never appear inside any release blob. Only the
  // variable NAME is ever reported.
  const envValues = new Map()
  for (const envBlob of [rootEnv, webEnv]) {
    if (envBlob === null) continue
    for (const [name, value] of parseEnvValues(envBlob.text)) {
      if (value.length >= ENV_LEAK_MIN_VALUE_LENGTH) envValues.set(name, value)
    }
  }

  const findings = []
  for (const blob of [...tree, ...bundle, ...sidecars]) {
    for (const finding of scanBlobForFindings(blob.text, blob.path)) {
      findings.push({ ...finding, commit: blob.commit ?? null })
    }
    for (const [name, value] of envValues) {
      const count = blob.text.split(value).length - 1
      if (count > 0) {
        findings.push({
          rule: 'env-value-leak',
          path: blob.path,
          label: name,
          count,
          commit: blob.commit ?? null,
        })
      }
    }
  }

  const classified = classifyFindings(findings, allowlist)
  if (report !== null && classified.exitCode !== 30) {
    try {
      await writeFile(report, `${JSON.stringify(classified.report, null, 2)}\n`)
    } catch (error) {
      return errorResult(`could not write report: ${error.code ?? error.message}`)
    }
  }
  return classified
}

// ---------------------------------------------------------------------------
// CLI
// ---------------------------------------------------------------------------

const USAGE = `usage: audit-release-history.mjs --manifest <blobs.json> [--allowlist <allow.json>] [--report <out.json>]

Scans release-candidate text blobs for secret-shaped content. The report
holds only counts, paths, and labels — never matched values.
Exit codes: 0 clean, 10 only known-allowlisted blockers, 20 blocking finding,
30 execution/input error.`

const invokedDirectly = process.argv[1] !== undefined &&
  import.meta.url === pathToFileURL(process.argv[1]).href

if (invokedDirectly) {
  const args = process.argv.slice(2)
  if (args.includes('--help') || args.includes('-h')) {
    console.log(USAGE)
    process.exit(0)
  }
  const options = { manifest: null, allowlist: null, report: null }
  let argvOk = true
  for (let index = 0; index < args.length; index += 2) {
    const key = args[index]
    const value = args[index + 1]
    if (value === undefined) { argvOk = false; break }
    if (key === '--manifest') options.manifest = value
    else if (key === '--allowlist') options.allowlist = value
    else if (key === '--report') options.report = value
    else { argvOk = false; break }
  }
  if (!argvOk || options.manifest === null) {
    console.error(USAGE)
    process.exit(30)
  }
  try {
    const manifest = JSON.parse(await readFile(options.manifest, 'utf8'))
    const allowlist = options.allowlist === null
      ? KNOWN_ALLOWLIST
      : JSON.parse(await readFile(options.allowlist, 'utf8'))
    const { exitCode, report } = await auditReleaseHistory({
      ...manifest,
      report: options.report,
      allowlist,
    })
    console.log(JSON.stringify(report, null, 2))
    process.exit(exitCode)
  } catch (error) {
    console.error(`audit error: ${error.message}`)
    process.exit(30)
  }
}
