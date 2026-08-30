import assert from 'node:assert/strict'
import test from 'node:test'
import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { auditPublicBuildConfig } from '../security/audit-public-build-config.mjs'

function base64Url(value) {
  return Buffer.from(value, 'utf8').toString('base64url')
}

function fakeJwt(role) {
  const header = base64Url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }))
  const payload = base64Url(JSON.stringify({ role, iss: 'supabase' }))
  return `${header}.${payload}.${base64Url(`sig-${role}`)}`
}

const ANON_JWT = fakeJwt('anon')
const SERVICE_JWT = fakeJwt('service_role')
const PROJECT_URL = 'https://demo-fixture-project.supabase.co'
const OTHER_URL = 'https://other-fixture-project.supabase.co'
const PUBLISHABLE_KEY = 'sb_publishable_demo_fixture_key_0123456789'

async function fixture(envLines, bundleText) {
  const root = await mkdtemp(join(tmpdir(), 'wordless-audit-'))
  const envPath = join(root, '.env.local')
  await writeFile(envPath, envLines.join('\n'), 'utf8')
  const distDir = join(root, 'dist')
  await mkdir(join(distDir, 'assets'), { recursive: true })
  await writeFile(join(distDir, 'index.html'), '<!doctype html>', 'utf8')
  await writeFile(join(distDir, 'assets', 'index-demo.js'), bundleText, 'utf8')
  return { root, envPath, distDir }
}

test('clean legacy-anon configuration and matching bundle audits clean without leaking values', async () => {
  const { root, envPath, distDir } = await fixture(
    [
      `VITE_SUPABASE_URL=${PROJECT_URL}`,
      `VITE_SUPABASE_PUBLIC_KEY=${ANON_JWT}`,
      'VITE_RELAY_SESSION_ID=ABC123',
    ],
    `const url=${JSON.stringify(PROJECT_URL)};const key=${JSON.stringify(ANON_JWT)};` +
      'const protocolField={access_token:token};',
  )
  try {
    const result = await auditPublicBuildConfig(envPath, distDir)
    assert.equal(result.exitCode, 0)
    assert.equal(result.summary.keyType, 'legacy-anon')
    assert.equal(result.summary.findings.length, 0)
    assert.equal(result.summary.envVarCount, 3)
    assert.ok(result.summary.bundleFileCount >= 2)
    const serialized = JSON.stringify(result)
    assert.ok(!serialized.includes(ANON_JWT))
    assert.ok(!serialized.includes(PROJECT_URL))
  }
  finally {
    await rm(root, { recursive: true, force: true })
  }
})

test('a service_role public key is rejected without printing its value', async () => {
  const { root, envPath, distDir } = await fixture(
    [
      `VITE_SUPABASE_URL=${PROJECT_URL}`,
      `VITE_SUPABASE_PUBLIC_KEY=${SERVICE_JWT}`,
    ],
    'const empty=1;',
  )
  try {
    const result = await auditPublicBuildConfig(envPath, distDir)
    assert.equal(result.exitCode, 1)
    assert.ok(result.summary.findings.length >= 1)
    assert.ok(!JSON.stringify(result).includes(SERVICE_JWT))
  }
  finally {
    await rm(root, { recursive: true, force: true })
  }
})

test('forbidden private credential names in the environment are findings', async () => {
  const { root, envPath, distDir } = await fixture(
    [
      `VITE_SUPABASE_URL=${PROJECT_URL}`,
      `VITE_SUPABASE_PUBLIC_KEY=${ANON_JWT}`,
      'SUPABASE_SERVICE_ROLE_KEY=super-secret-value',
    ],
    'const empty=1;',
  )
  try {
    const result = await auditPublicBuildConfig(envPath, distDir)
    assert.equal(result.exitCode, 1)
    assert.ok(result.summary.findings.some((finding) => finding.includes('SUPABASE_SERVICE_ROLE_KEY')))
    assert.ok(!JSON.stringify(result).includes('super-secret-value'))
  }
  finally {
    await rm(root, { recursive: true, force: true })
  }
})

test('a bundle JWT that is not the configured public key is a finding', async () => {
  const { root, envPath, distDir } = await fixture(
    [
      `VITE_SUPABASE_URL=${PROJECT_URL}`,
      `VITE_SUPABASE_PUBLIC_KEY=${ANON_JWT}`,
    ],
    `const rogue=${JSON.stringify(SERVICE_JWT)};`,
  )
  try {
    const result = await auditPublicBuildConfig(envPath, distDir)
    assert.equal(result.exitCode, 1)
    assert.ok(result.summary.findings.length >= 1)
    assert.ok(!JSON.stringify(result).includes(SERVICE_JWT))
  }
  finally {
    await rm(root, { recursive: true, force: true })
  }
})

test('a bundle Supabase URL differing from the configured URL is a finding', async () => {
  const { root, envPath, distDir } = await fixture(
    [
      `VITE_SUPABASE_URL=${PROJECT_URL}`,
      `VITE_SUPABASE_PUBLIC_KEY=${ANON_JWT}`,
    ],
    `const url=${JSON.stringify(OTHER_URL)};`,
  )
  try {
    const result = await auditPublicBuildConfig(envPath, distDir)
    assert.equal(result.exitCode, 1)
    assert.ok(result.summary.findings.length >= 1)
    assert.ok(!JSON.stringify(result).includes(OTHER_URL))
  }
  finally {
    await rm(root, { recursive: true, force: true })
  }
})

test('an encoded service_role marker in the bundle is a finding', async () => {
  const { root, envPath, distDir } = await fixture(
    [
      `VITE_SUPABASE_URL=${PROJECT_URL}`,
      `VITE_SUPABASE_PUBLIC_KEY=${ANON_JWT}`,
    ],
    'const marker="c2VydmljZV9yb2xl";',
  )
  try {
    const result = await auditPublicBuildConfig(envPath, distDir)
    assert.equal(result.exitCode, 1)
    assert.ok(result.summary.findings.length >= 1)
  }
  finally {
    await rm(root, { recursive: true, force: true })
  }
})

test('library prefix checks are not findings while value-shaped secrets are', async () => {
  const libraryOnly = await fixture(
    [
      `VITE_SUPABASE_URL=${PROJECT_URL}`,
      `VITE_SUPABASE_PUBLIC_KEY=${ANON_JWT}`,
    ],
    'const isSecret=(e)=>e.startsWith(`sb_secret_`)||e.startsWith(`sbp_`);',
  )
  try {
    const result = await auditPublicBuildConfig(libraryOnly.envPath, libraryOnly.distDir)
    assert.equal(result.exitCode, 0)
    assert.equal(result.summary.findings.length, 0)
  }
  finally {
    await rm(libraryOnly.root, { recursive: true, force: true })
  }

  const valueShaped = await fixture(
    [
      `VITE_SUPABASE_URL=${PROJECT_URL}`,
      `VITE_SUPABASE_PUBLIC_KEY=${ANON_JWT}`,
    ],
    'const leaked="sb_secret_abcdefghijklmnopqrstuvwxyz012345";',
  )
  try {
    const result = await auditPublicBuildConfig(valueShaped.envPath, valueShaped.distDir)
    assert.equal(result.exitCode, 1)
    assert.ok(result.summary.findings.length >= 1)
    assert.ok(!JSON.stringify(result).includes('sb_secret_abcdefghijklmnopqrstuvwxyz012345'))
  }
  finally {
    await rm(valueShaped.root, { recursive: true, force: true })
  }
})

test('a publishable key audits clean and forbids JWT-shaped configuration values', async () => {
  const clean = await fixture(
    [
      `VITE_SUPABASE_URL=${PROJECT_URL}`,
      `VITE_SUPABASE_PUBLIC_KEY=${PUBLISHABLE_KEY}`,
    ],
    `const key=${JSON.stringify(PUBLISHABLE_KEY)};const url=${JSON.stringify(PROJECT_URL)};`,
  )
  try {
    const result = await auditPublicBuildConfig(clean.envPath, clean.distDir)
    assert.equal(result.exitCode, 0)
    assert.equal(result.summary.keyType, 'publishable')
  }
  finally {
    await rm(clean.root, { recursive: true, force: true })
  }

  const mixed = await fixture(
    [
      `VITE_SUPABASE_URL=${PROJECT_URL}`,
      `VITE_SUPABASE_PUBLIC_KEY=${PUBLISHABLE_KEY}`,
      `VITE_EXTRA_TOKEN=${ANON_JWT}`,
    ],
    'const empty=1;',
  )
  try {
    const result = await auditPublicBuildConfig(mixed.envPath, mixed.distDir)
    assert.equal(result.exitCode, 1)
    assert.ok(result.summary.findings.length >= 1)
  }
  finally {
    await rm(mixed.root, { recursive: true, force: true })
  }
})

test('missing inputs are execution errors, not clean results', async () => {
  const { root, envPath, distDir } = await fixture(
    [`VITE_SUPABASE_URL=${PROJECT_URL}`, `VITE_SUPABASE_PUBLIC_KEY=${ANON_JWT}`],
    'const empty=1;',
  )
  try {
    const missingEnv = await auditPublicBuildConfig(join(root, 'missing.env'), distDir)
    assert.equal(missingEnv.exitCode, 2)
    const missingDist = await auditPublicBuildConfig(envPath, join(root, 'missing-dist'))
    assert.equal(missingDist.exitCode, 2)
  }
  finally {
    await rm(root, { recursive: true, force: true })
  }
})
