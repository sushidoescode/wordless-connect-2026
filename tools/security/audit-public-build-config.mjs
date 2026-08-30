#!/usr/bin/env node
// Audits the ignored browser environment file and the built public bundle for
// credential-safety before release. Values are compared in memory only; the
// report contains counts, key type, and finding labels — never a configured
// value, URL, hash of a value, or file excerpt.

import { readFile, readdir, stat } from 'node:fs/promises'
import { join } from 'node:path'
import process from 'node:process'

const JWT_SHAPE = /eyJ[A-Za-z0-9_-]{4,}\.[A-Za-z0-9_-]{4,}\.[A-Za-z0-9_-]{4,}/g
const SUPABASE_URL_SHAPE = /https:\/\/[a-z0-9-]+\.supabase\.(co|com)/g
const ENCODED_SERVICE_ROLE = 'c2VydmljZV9yb2xl'
const FORBIDDEN_ENV_NAMES = [
  /^SUPABASE_SERVICE_ROLE_KEY$/,
  /^SUPABASE_ACCESS_TOKEN$/,
  /^SUPABASE_MANAGEMENT_TOKEN$/,
  /^DATABASE_URL$/,
  /^DATABASE_PASSWORD$/,
  /^POSTGRES_PASSWORD$/,
  /SERVICE_ROLE/,
  /SECRET/,
]
const FORBIDDEN_VALUE_PREFIXES = ['sb_secret_', 'sbp_', 'gho_']
const FORBIDDEN_VALUE_SHAPES = [
  ['sb_secret_', /sb_secret_[A-Za-z0-9_-]{20,}/],
  ['sbp_', /sbp_[A-Za-z0-9_-]{20,}/],
  ['gho_', /gho_[A-Za-z0-9]{20,}/],
]

function parseEnv(content) {
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

function decodeJwtRole(token) {
  try {
    const payload = token.split('.')[1]
    const decoded = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'))
    return typeof decoded.role === 'string' ? decoded.role : null
  }
  catch {
    return null
  }
}

async function listFiles(root) {
  const found = []
  const pending = [root]
  while (pending.length > 0) {
    const current = pending.pop()
    for (const entry of await readdir(current, { withFileTypes: true })) {
      const full = join(current, entry.name)
      if (entry.isDirectory()) pending.push(full)
      else if (entry.isFile()) found.push(full)
    }
  }
  return found
}

export async function auditPublicBuildConfig(envPath, distDir) {
  const findings = []
  let envContent
  try {
    envContent = await readFile(envPath, 'utf8')
  }
  catch {
    return {
      exitCode: 2,
      summary: { error: 'environment file unreadable', findings: [] },
    }
  }
  try {
    const distInfo = await stat(distDir)
    if (!distInfo.isDirectory()) throw new Error('not a directory')
  }
  catch {
    return {
      exitCode: 2,
      summary: { error: 'bundle directory unreadable', findings: [] },
    }
  }

  const env = parseEnv(envContent)
  const configuredUrl = env.get('VITE_SUPABASE_URL') ?? null
  const configuredKey = env.get('VITE_SUPABASE_PUBLIC_KEY') ?? null

  for (const [name, value] of env) {
    if (FORBIDDEN_ENV_NAMES.some((pattern) => pattern.test(name))) {
      findings.push(`forbidden environment variable name: ${name}`)
    }
    if (FORBIDDEN_VALUE_PREFIXES.some((prefix) => value.startsWith(prefix)) &&
        !(name === 'VITE_SUPABASE_PUBLIC_KEY' && value.startsWith('sb_publishable_'))) {
      findings.push(`environment variable ${name} holds a private-credential-shaped value`)
    }
  }

  if (configuredUrl === null || !/^https:\/\/[a-z0-9-]+\.supabase\.(co|com)$/.test(configuredUrl)) {
    findings.push('VITE_SUPABASE_URL missing or not a Supabase project URL')
  }

  let keyType = null
  if (configuredKey === null || configuredKey === '') {
    findings.push('VITE_SUPABASE_PUBLIC_KEY missing')
  }
  else if (configuredKey.startsWith('sb_publishable_')) {
    keyType = 'publishable'
  }
  else if (/^eyJ/.test(configuredKey)) {
    keyType = 'legacy-anon'
    const role = decodeJwtRole(configuredKey)
    if (role !== 'anon') {
      findings.push('configured JWT public key does not carry the anon role')
    }
  }
  else {
    findings.push('VITE_SUPABASE_PUBLIC_KEY is neither publishable nor a legacy JWT key')
  }

  let jwtShapedEnvValues = 0
  for (const value of env.values()) {
    const matches = value.match(JWT_SHAPE)
    if (matches !== null) jwtShapedEnvValues += matches.length
  }
  if (keyType === 'publishable' && jwtShapedEnvValues > 0) {
    findings.push('publishable-key configuration must contain zero JWT-shaped values')
  }
  if (keyType === 'legacy-anon' && jwtShapedEnvValues > 1) {
    findings.push('configuration contains JWT-shaped values beyond the public key')
  }

  const bundleFiles = await listFiles(distDir)
  let jwtShapedInBundle = 0
  let bundleUrlCount = 0
  for (const filePath of bundleFiles) {
    let text
    try {
      text = await readFile(filePath, 'utf8')
    }
    catch {
      continue
    }
    for (const match of text.match(JWT_SHAPE) ?? []) {
      jwtShapedInBundle += 1
      if (configuredKey === null || match !== configuredKey) {
        findings.push('bundle contains a JWT-shaped value that is not the configured public key')
      }
      else {
        const role = decodeJwtRole(match)
        if (role !== 'anon') {
          findings.push('bundle contains a non-anon JWT-shaped value')
        }
      }
    }
    for (const match of text.match(SUPABASE_URL_SHAPE) ?? []) {
      bundleUrlCount += 1
      if (configuredUrl === null || match !== configuredUrl) {
        findings.push('bundle contains a Supabase URL that is not the configured project URL')
      }
    }
    if (text.includes(ENCODED_SERVICE_ROLE)) {
      findings.push('bundle contains an encoded service_role marker')
    }
    if (text.includes('service_role')) {
      findings.push('bundle contains a literal service_role marker')
    }
    for (const [label, shape] of FORBIDDEN_VALUE_SHAPES) {
      if (shape.test(text)) {
        findings.push(`bundle contains a ${label} prefixed credential-shaped value`)
      }
    }
  }

  const deduped = [...new Set(findings)]
  return {
    exitCode: deduped.length === 0 ? 0 : 1,
    summary: {
      envVarCount: env.size,
      keyType,
      urlConfigured: configuredUrl !== null,
      bundleFileCount: bundleFiles.length,
      jwtShapedInBundle,
      supabaseUrlReferencesInBundle: bundleUrlCount,
      findings: deduped,
    },
  }
}

const invokedDirectly = process.argv[1] !== undefined &&
  import.meta.url === new URL(`file://${process.argv[1]}`).href

if (invokedDirectly) {
  const [envPath, distDir] = process.argv.slice(2)
  if (!envPath || !distDir) {
    console.error('usage: audit-public-build-config.mjs <env-file> <dist-dir>')
    process.exit(2)
  }
  const { exitCode, summary } = await auditPublicBuildConfig(envPath, distDir)
  console.log(JSON.stringify(summary, null, 2))
  process.exit(exitCode)
}
