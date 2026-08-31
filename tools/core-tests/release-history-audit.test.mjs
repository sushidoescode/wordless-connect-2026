import assert from 'node:assert/strict'
import test from 'node:test'

import {
  KNOWN_ALLOWLIST,
  auditReleaseHistory,
  classifyFindings,
  scanBlobForFindings,
} from '../security/audit-release-history.mjs'

// Synthetic secrets: obviously fake shapes used only to exercise the matchers.
const SYNTHETIC_SB_SECRET = `sb_secret_${'Zq'.repeat(14)}SYNTH`
const SYNTHETIC_SBP = `sbp_${'Ab'.repeat(12)}SYNTH`
const SYNTHETIC_GHO = `gho_${'Cd'.repeat(12)}SYNTH`
const SYNTHETIC_SK = `sk-${'Ef'.repeat(12)}SYNTH`
const SYNTHETIC_JWT = `eyJ${'a'.repeat(12)}.${'b'.repeat(12)}.${'c'.repeat(12)}`
const SYNTHETIC_HOME = ['', 'Users', 'somebody', 'project', 'file.txt'].join('/')

const rulesOf = (findings) => findings.map((finding) => finding.rule).sort()

const findingsNeverLeak = (findings, secrets) => {
  const serialized = JSON.stringify(findings)
  for (const secret of secrets) {
    assert.equal(
      serialized.includes(secret),
      false,
      `report leaked a matched value shape: ${secret.slice(0, 6)}...`,
    )
    assert.equal(serialized.includes('SYNTH'), false, 'report leaked value material')
  }
}

// ---------------------------------------------------------------------------
// scanBlobForFindings
// ---------------------------------------------------------------------------

test('clean prose produces no findings', () => {
  const text = [
    'WORDLESS Relay design notes.',
    'The browser submits an answer choice; it never declares correctness.',
    'See docs/prompt-log.md for decisions.',
  ].join('\n')

  assert.deepEqual(scanBlobForFindings(text, 'docs/notes.md'), [])
})

test('supabase secret variable names are flagged by name only', () => {
  const text = [
    'SUPABASE_SERVICE_ROLE_KEY=redacted',
    'SUPABASE_ACCESS_TOKEN=redacted',
    'SUPABASE_MANAGEMENT_TOKEN=redacted',
  ].join('\n')
  const findings = scanBlobForFindings(text, 'scripts/setup.sh')

  const named = findings.filter((finding) => finding.rule === 'supabase-secret-name')
  assert.deepEqual(
    named.map((finding) => finding.label).sort(),
    ['SUPABASE_ACCESS_TOKEN', 'SUPABASE_MANAGEMENT_TOKEN', 'SUPABASE_SERVICE_ROLE_KEY'],
  )
  for (const finding of named) assert.equal(finding.path, 'scripts/setup.sh')
})

test('database URLs and password variable names are flagged', () => {
  const text = [
    'export DATABASE_URL=postgresql://owner:hunter2SYNTH@db.example.internal:5432/app',
    'POSTGRES_PASSWORD=hunter2SYNTH',
  ].join('\n')
  const findings = scanBlobForFindings(text, 'ops/deploy.env.bak')

  assert.ok(findings.some((finding) => finding.rule === 'database-credential'))
  findingsNeverLeak(findings, ['hunter2SYNTH', 'db.example.internal'])
})

test('credential-shaped values are flagged by prefix label, never by value', () => {
  const text = [
    `key_a=${SYNTHETIC_SB_SECRET}`,
    `key_b=${SYNTHETIC_SBP}`,
    `key_c=${SYNTHETIC_GHO}`,
    `key_d=${SYNTHETIC_SK}`,
  ].join('\n')
  const findings = scanBlobForFindings(text, 'web/src/config.ts')

  const shaped = findings.filter((finding) => finding.rule === 'credential-shaped-value')
  assert.deepEqual(
    shaped.map((finding) => finding.label).sort(),
    ['gho_', 'sb_secret_', 'sbp_', 'sk-'],
  )
  findingsNeverLeak(findings, [SYNTHETIC_SB_SECRET, SYNTHETIC_SBP, SYNTHETIC_GHO, SYNTHETIC_SK])
})

test('short prefixed strings below 20 chars are not credential-shaped', () => {
  const findings = scanBlobForFindings('sb_secret_short sbp_x gho_y sk-z', 'a.md')
  assert.equal(findings.some((finding) => finding.rule === 'credential-shaped-value'), false)
})

test('encoded service_role and JWT shapes are flagged', () => {
  const text = `token=${SYNTHETIC_JWT}\nmarker=c2VydmljZV9yb2xl\n`
  const findings = scanBlobForFindings(text, 'dist/bundle.js')

  assert.ok(findings.some((finding) => finding.rule === 'encoded-service-role'))
  const jwt = findings.find((finding) => finding.rule === 'jwt-shaped-value')
  assert.notEqual(jwt, undefined)
  assert.equal(jwt.count, 1)
  findingsNeverLeak(findings, [SYNTHETIC_JWT])
})

test('absolute home paths are counted without echoing the path value', () => {
  const text = `log line at ${SYNTHETIC_HOME}\nagain ${SYNTHETIC_HOME}\n`
  const findings = scanBlobForFindings(text, 'docs/old-log.md')

  const home = findings.find((finding) => finding.rule === 'absolute-home-path')
  assert.notEqual(home, undefined)
  assert.equal(home.count, 2)
  assert.equal(JSON.stringify(findings).includes('somebody'), false)
})

test('forbidden filename patterns fire on name alone', () => {
  assert.ok(scanBlobForFindings('', '.env')
    .some((finding) => finding.rule === 'forbidden-filename'))
  assert.ok(scanBlobForFindings('', 'web/.env.local')
    .some((finding) => finding.rule === 'forbidden-filename'))
  assert.ok(scanBlobForFindings('', 'web/.env.production')
    .some((finding) => finding.rule === 'forbidden-filename'))
  assert.ok(scanBlobForFindings('', 'Wordless/Assets/LocalOnly/notes.md')
    .some((finding) => finding.rule === 'forbidden-filename'))
  // Redacted templates are explicitly allowed by the project contract
  // (.gitignore whitelists .env.example and .env.production.example).
  assert.equal(scanBlobForFindings('', '.env.example')
    .some((finding) => finding.rule === 'forbidden-filename'), false)
  assert.equal(scanBlobForFindings('', 'web/.env.production.example')
    .some((finding) => finding.rule === 'forbidden-filename'), false)
  // A name merely containing 'example' without the suffix stays forbidden.
  assert.ok(scanBlobForFindings('', 'web/.env.examples')
    .some((finding) => finding.rule === 'forbidden-filename'))
})

test('reference-only visual material is flagged by path', () => {
  const findings = scanBlobForFindings('binary-ish', 'docs/references/visuals/wordless-relay-chatgpt-north-star.png')
  assert.ok(findings.some((finding) => finding.rule === 'reference-only-material'))
})

// ---------------------------------------------------------------------------
// classifyFindings — the four exit outcomes
// ---------------------------------------------------------------------------

test('exit 0: a clean finding set classifies clean', () => {
  const { exitCode, report } = classifyFindings([], KNOWN_ALLOWLIST)

  assert.equal(exitCode, 0)
  assert.equal(report.totalFindings, 0)
  assert.deepEqual(report.blocking, [])
  assert.deepEqual(report.allowlisted, [])
})

test('exit 10: only known-allowlisted blockers remain', () => {
  const findings = [
    { rule: 'absolute-home-path', path: 'docs/prompt-log.md', label: null, count: 3, commit: '4cffae0' },
    { rule: 'absolute-home-path', path: 'docs/prompt-log.md', label: null, count: 1, commit: '4dc5751' },
    { rule: 'reference-only-material', path: 'docs/references/visuals/wordless-relay-chatgpt-north-star.png', label: null, count: 1, commit: 'aaaa111' },
    { rule: 'reference-only-material', path: 'docs/references/visuals/wordless-relay-gemini-alternate.jpeg', label: null, count: 1, commit: 'aaaa111' },
    { rule: 'reference-only-material', path: 'docs/references/visuals/wordless-relay-gemini-ui-reference.jpeg', label: null, count: 1, commit: 'aaaa111' },
    { rule: 'absolute-home-path', path: 'docs/research/competitive-audit-2026-08-24.md', label: null, count: 1, commit: 'bbbb222' },
    { rule: 'jwt-shaped-value', path: 'docs/research/fable-connect-verdict-original.md', label: null, count: 1, commit: 'bbbb222' },
  ]

  const { exitCode, report } = classifyFindings(findings, KNOWN_ALLOWLIST)
  assert.equal(exitCode, 10)
  assert.equal(report.blocking.length, 0)
  assert.equal(report.allowlisted.length, findings.length)
})

test('exit 20: a fresh service-role-shaped value blocks release', () => {
  const findings = [
    { rule: 'absolute-home-path', path: 'docs/prompt-log.md', label: null, count: 1, commit: '4cffae0' },
    { rule: 'credential-shaped-value', path: 'web/src/config.ts', label: 'sb_secret_', count: 1, commit: 'cafe123' },
  ]

  const { exitCode, report } = classifyFindings(findings, KNOWN_ALLOWLIST)
  assert.equal(exitCode, 20)
  assert.equal(report.blocking.length, 1)
  assert.equal(report.blocking[0].path, 'web/src/config.ts')
  assert.equal(report.blocking[0].label, 'sb_secret_')
})

test('exit 20: home-path hits outside the two known commits block', () => {
  const findings = [
    { rule: 'absolute-home-path', path: 'docs/new-log.md', label: null, count: 1, commit: 'ffff999' },
  ]
  assert.equal(classifyFindings(findings, KNOWN_ALLOWLIST).exitCode, 20)
})

test('exit 30: malformed inputs are execution errors, not crashes', () => {
  assert.equal(classifyFindings('garbage', KNOWN_ALLOWLIST).exitCode, 30)
  assert.equal(classifyFindings([{ nonsense: true }], KNOWN_ALLOWLIST).exitCode, 30)
  assert.equal(classifyFindings([], null).exitCode, 30)
  assert.equal(classifyFindings([], { referenceImagePaths: 'nope' }).exitCode, 30)
})

test('classification report never carries a matched value', () => {
  const text = `leak=${SYNTHETIC_SB_SECRET}\njwt=${SYNTHETIC_JWT}\nat ${SYNTHETIC_HOME}\n`
  const findings = scanBlobForFindings(text, 'web/dist/assets/index.js')
    .map((finding) => ({ ...finding, commit: 'dead001' }))
  const { exitCode, report } = classifyFindings(findings, KNOWN_ALLOWLIST)

  assert.equal(exitCode, 20)
  const serialized = JSON.stringify(report)
  assert.equal(serialized.includes(SYNTHETIC_SB_SECRET), false)
  assert.equal(serialized.includes(SYNTHETIC_JWT), false)
  assert.equal(serialized.includes('somebody'), false)
  assert.equal(serialized.includes('SYNTH'), false)
})

// ---------------------------------------------------------------------------
// auditReleaseHistory — data-driven, no git involved
// ---------------------------------------------------------------------------

test('audit over clean blob groups exits 0', async () => {
  const { exitCode, report } = await auditReleaseHistory({
    tree: [{ path: 'README.md', text: 'WORDLESS Relay proof.' }],
    rootEnv: { path: '.env', text: 'SUPABASE_URL=redacted-placeholder\n' },
    webEnv: null,
    bundle: [{ path: 'web/dist/index.html', text: '<html></html>' }],
    sidecars: [],
    allowlist: KNOWN_ALLOWLIST,
  })

  assert.equal(exitCode, 0)
  assert.equal(report.blocking.length, 0)
})

test('audit flags an env value leaking into the bundle by variable name only', async () => {
  const leakedValue = `${'Qw'.repeat(10)}LEAKSYNTH`
  const { exitCode, report } = await auditReleaseHistory({
    tree: [],
    rootEnv: { path: '.env', text: `SUPABASE_PRIVATE_THING=${leakedValue}\n` },
    webEnv: null,
    bundle: [{ path: 'web/dist/assets/index.js', text: `const k = "${leakedValue}"` }],
    sidecars: [],
    allowlist: KNOWN_ALLOWLIST,
  })

  assert.equal(exitCode, 20)
  const leak = report.blocking.find((finding) => finding.rule === 'env-value-leak')
  assert.notEqual(leak, undefined)
  assert.equal(leak.label, 'SUPABASE_PRIVATE_THING')
  assert.equal(leak.path, 'web/dist/assets/index.js')
  assert.equal(JSON.stringify(report).includes('LEAKSYNTH'), false)
})

test('audit rejects malformed blob groups with exit 30', async () => {
  const malformed = await auditReleaseHistory({ tree: 'not-an-array' })
  assert.equal(malformed.exitCode, 30)

  const badBlob = await auditReleaseHistory({ tree: [{ path: 42, text: null }] })
  assert.equal(badBlob.exitCode, 30)
})
