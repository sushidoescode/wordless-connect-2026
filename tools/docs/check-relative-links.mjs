#!/usr/bin/env node
// Checks relative markdown links and image embeds across a directory tree.
// Scans every .md file (skipping .git and node_modules), extracts
// [text](target) and ![alt](target) targets, resolves relative targets
// against the containing file's directory, and reports any that do not exist
// on disk. Scheme links (http, https, mailto, tel, data, ...) and pure
// anchors are skipped; an ignore list of root-relative path prefixes covers
// known-future files.
//
// Deterministic and read-only: output is sorted by (file, link) and the tool
// never writes anything.
//
// Usage:
//   node tools/docs/check-relative-links.mjs [rootDir] [--ignore <prefix>]...
//   node tools/docs/check-relative-links.mjs --help
//
// Exit codes: 0 all links resolve, 1 broken links found, 2 usage/input error.

import { access, readFile, readdir, stat } from 'node:fs/promises'
import { dirname, join, relative, resolve, sep } from 'node:path'
import process from 'node:process'
import { pathToFileURL } from 'node:url'

const SKIPPED_DIRECTORIES = new Set(['.git', 'node_modules'])
const SCHEME_TARGET = /^[a-z][a-z0-9+.-]*:/i
// Inline markdown links/images: optional !, [label], then (<target ...> or
// (target ...) where a plain target runs to whitespace or the closing paren.
const INLINE_LINK = /!?\[[^\]]*\]\(\s*(<[^>]*>|[^)\s]+)(?:\s+[^)]*)?\)/g

const toPosix = (value) => value.split(sep).join('/')

async function listMarkdownFiles(rootDir) {
  const found = []
  const pending = [rootDir]
  while (pending.length > 0) {
    const current = pending.pop()
    for (const entry of await readdir(current, { withFileTypes: true })) {
      if (entry.isDirectory()) {
        if (!SKIPPED_DIRECTORIES.has(entry.name)) pending.push(join(current, entry.name))
      } else if (entry.isFile() && entry.name.toLowerCase().endsWith('.md')) {
        found.push(join(current, entry.name))
      }
    }
  }
  return found.sort()
}

function extractTargets(markdownText) {
  const targets = []
  INLINE_LINK.lastIndex = 0
  for (const match of markdownText.matchAll(INLINE_LINK)) {
    let target = match[1]
    if (target.startsWith('<') && target.endsWith('>')) {
      target = target.slice(1, -1).trim()
    }
    if (target !== '') targets.push(target)
  }
  return targets
}

export async function checkRelativeLinks(rootDir, { ignore = [] } = {}) {
  if (typeof rootDir !== 'string' || rootDir === '') {
    throw new TypeError('rootDir must be a non-empty directory path string')
  }
  if (!Array.isArray(ignore) || !ignore.every((entry) => typeof entry === 'string')) {
    throw new TypeError('ignore must be an array of path-prefix strings')
  }
  const absoluteRoot = resolve(rootDir)
  let rootInfo
  try {
    rootInfo = await stat(absoluteRoot)
  } catch {
    throw new Error(`root directory does not exist: ${rootDir}`)
  }
  if (!rootInfo.isDirectory()) {
    throw new Error(`root path is not a directory: ${rootDir}`)
  }

  const broken = []
  for (const filePath of await listMarkdownFiles(absoluteRoot)) {
    const text = await readFile(filePath, 'utf8')
    const fileDir = dirname(filePath)
    const relFile = toPosix(relative(absoluteRoot, filePath))

    for (const rawTarget of extractTargets(text)) {
      if (SCHEME_TARGET.test(rawTarget) || rawTarget.startsWith('#')) continue

      let pathPart = rawTarget
      const anchorIndex = pathPart.indexOf('#')
      if (anchorIndex !== -1) pathPart = pathPart.slice(0, anchorIndex)
      if (pathPart === '') continue
      try {
        pathPart = decodeURIComponent(pathPart)
      } catch {
        // keep the raw form when percent-decoding fails
      }

      const resolved = pathPart.startsWith('/')
        ? join(absoluteRoot, pathPart)
        : resolve(fileDir, pathPart)
      const relResolved = toPosix(relative(absoluteRoot, resolved))
      if (ignore.some((prefix) => relResolved.startsWith(toPosix(prefix)))) continue

      try {
        await access(resolved)
      } catch {
        broken.push({
          file: relFile,
          link: anchorIndex === -1 ? rawTarget : rawTarget.slice(0, anchorIndex),
        })
      }
    }
  }

  broken.sort((a, b) =>
    a.file === b.file ? a.link.localeCompare(b.link) : a.file.localeCompare(b.file))
  const deduped = broken.filter((entry, index) =>
    index === 0 ||
    entry.file !== broken[index - 1].file ||
    entry.link !== broken[index - 1].link)
  return { ok: deduped.length === 0, broken: deduped }
}

// ---------------------------------------------------------------------------
// CLI
// ---------------------------------------------------------------------------

const USAGE = `usage: check-relative-links.mjs [rootDir] [--ignore <prefix>]...

Checks relative markdown link and image targets under rootDir (default: the
current directory). --ignore may repeat; each value is a root-relative path
prefix to skip (for known-future files).
Exit codes: 0 all links resolve, 1 broken links found, 2 usage/input error.`

const invokedDirectly = process.argv[1] !== undefined &&
  import.meta.url === pathToFileURL(process.argv[1]).href

if (invokedDirectly) {
  const args = process.argv.slice(2)
  if (args.includes('--help') || args.includes('-h')) {
    console.log(USAGE)
    process.exit(0)
  }
  let rootDir = '.'
  let rootSeen = false
  const ignore = []
  let argvOk = true
  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index]
    if (arg === '--ignore') {
      const value = args[index + 1]
      if (value === undefined) { argvOk = false; break }
      ignore.push(value)
      index += 1
    } else if (!arg.startsWith('--') && !rootSeen) {
      rootDir = arg
      rootSeen = true
    } else {
      argvOk = false
      break
    }
  }
  if (!argvOk) {
    console.error(USAGE)
    process.exit(2)
  }
  try {
    const result = await checkRelativeLinks(rootDir, { ignore })
    console.log(JSON.stringify(result, null, 2))
    process.exit(result.ok ? 0 : 1)
  } catch (error) {
    console.error(`link check error: ${error.message}`)
    process.exit(2)
  }
}
