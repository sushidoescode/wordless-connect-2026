import { readFile } from 'node:fs/promises'
import ts from 'typescript'

const LENS_SUPABASE_SPECIFIER = 'SupabaseClient.lspkg/supabase-snapcloud'
const BROWSER_SUPABASE_SPECIFIER = '@supabase/supabase-js'
const LENS_SUPABASE_STUB = `data:text/javascript,${encodeURIComponent(`
export const REALTIME_SUBSCRIBE_STATES = Object.freeze({
  SUBSCRIBED: 'SUBSCRIBED',
  CLOSED: 'CLOSED',
  CHANNEL_ERROR: 'CHANNEL_ERROR',
  TIMED_OUT: 'TIMED_OUT',
})
export function createClient(...args) {
  return globalThis.__wordlessLensCreateClient(...args)
}
`)}`
const BROWSER_SUPABASE_STUB = `data:text/javascript,${encodeURIComponent(`
export function createClient(...args) {
  return globalThis.__wordlessBrowserCreateClient(...args)
}
`)}`

export async function resolve(specifier, context, nextResolve) {
  if (specifier === LENS_SUPABASE_SPECIFIER) {
    return { url: LENS_SUPABASE_STUB, shortCircuit: true }
  }
  if (specifier === BROWSER_SUPABASE_SPECIFIER) {
    return { url: BROWSER_SUPABASE_STUB, shortCircuit: true }
  }
  if (specifier.startsWith('@wordless/core/')) {
    const moduleName = specifier.slice('@wordless/core/'.length)
    return {
      url: new URL(
        `../../Assets/Wordless/Scripts/Core/${moduleName}.ts`,
        import.meta.url,
      ).href,
      shortCircuit: true,
    }
  }
  try {
    return await nextResolve(specifier, context)
  } catch (error) {
    if (specifier.startsWith('.') && !specifier.endsWith('.ts')) {
      return nextResolve(`${specifier}.ts`, context)
    }
    throw error
  }
}

export async function load(url, context, nextLoad) {
  if (!url.endsWith('/Assets/Wordless/Scripts/Transport/SupabaseRelayTransport.ts')) {
    return nextLoad(url, context)
  }
  const source = await readFile(new URL(url), 'utf8')
  const output = ts.transpileModule(source, {
    compilerOptions: {
      target: ts.ScriptTarget.ES2022,
      module: ts.ModuleKind.ESNext,
      experimentalDecorators: true,
      useDefineForClassFields: false,
      sourceMap: true,
    },
    fileName: 'SupabaseRelayTransport.ts',
  })
  return { format: 'module', source: output.outputText, shortCircuit: true }
}
