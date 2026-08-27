import './styles.css'
import type { ChoiceIndex, RelayMessageDraft } from '@wordless/core/Protocol'
import {
  BrowserRelayClient,
  createSupabaseBrowserChannelFactory,
  type BrowserChannelFactory,
  type BrowserRoundDelegate,
  type BrowserTimerFactory,
} from './relay-client'
import { render } from './render'
import {
  WebRoundStore,
  type WebRoundIntent,
  type WebRoundSnapshot,
} from './web-round-store'

const SESSION_ID_PATTERN = /^[A-Z0-9]{6}$/
const DISPLAY_TICK_MS = 100
const GLYPH_LOCK_DELAY_MS = 450

interface WordlessRelayTestSeam {
  readonly channelFactory: BrowserChannelFactory
  readonly now?: () => number
  readonly timers?: BrowserTimerFactory
  readonly senderIdFactory?: () => string
  readonly connectionIdFactory?: () => string
  readonly guessIdFactory?: () => string
}

declare global {
  interface Window {
    __WORDLESS_RELAY_TEST__?: WordlessRelayTestSeam
  }
}

const defaultTimers: BrowserTimerFactory = {
  setTimeout(callback, delayMs) {
    return globalThis.setTimeout(callback, delayMs)
  },
  clearTimeout(handle) {
    globalThis.clearTimeout(handle as ReturnType<typeof setTimeout>)
  },
}

function requiredElement<T extends HTMLElement>(id: string): T {
  const element = document.getElementById(id)
  if (!element) throw new Error(`missing element: ${id}`)
  return element as T
}

function boundedRandomId(prefix: string, byteCount: number): string {
  const bytes = new Uint8Array(byteCount)
  crypto.getRandomValues(bytes)
  const suffix = [...bytes].map((value) => value.toString(16).padStart(2, '0')).join('')
  return `${prefix}${suffix}`
}

function randomConnectionId(): string {
  const bytes = new Uint8Array(4)
  crypto.getRandomValues(bytes)
  return [...bytes].map((value) => value.toString(16).padStart(2, '0')).join('').toUpperCase()
}

function toRelayDraft(intent: WebRoundIntent): RelayMessageDraft {
  switch (intent.type) {
    case 'guess.submit':
      return {
        type: 'guess.submit',
        roundId: intent.roundId,
        payload: {
          guessId: intent.guessId,
          choiceIndex: intent.choiceIndex,
        },
      }
    case 'round.resync.request':
      return {
        type: 'round.resync.request',
        roundId: intent.roundId,
        payload: { reason: intent.reason },
      }
  }
}

function isChoiceIndex(value: number): value is ChoiceIndex {
  return value === 0 || value === 1 || value === 2 || value === 3
}

function phaseDiagnostic(snapshot: WebRoundSnapshot): void {
  console.info(`[WORDLESS] BROWSER PHASE ${snapshot.phase}`)
}

function startSession(
  sessionId: string,
  channelFactory: BrowserChannelFactory,
  seam: WordlessRelayTestSeam | undefined,
): void {
  const now = seam?.now ?? Date.now
  const timers = seam?.timers ?? defaultTimers
  const motionPreference = globalThis.matchMedia?.('(prefers-reduced-motion: reduce)')
  const reducedMotion = (): boolean => motionPreference?.matches === true
  const store = new WebRoundStore({
    sessionId,
    guessIdFactory: seam?.guessIdFactory ?? (() => boundedRandomId('g-', 10)),
    now,
  })

  let client: BrowserRelayClient | null = null
  let stopped = false
  let tickTimer: unknown | null = null
  let glyphTimer: unknown | null = null
  let glyphTimerKey: string | null = null

  const clearGlyphTimer = (): void => {
    if (glyphTimer !== null) timers.clearTimeout(glyphTimer)
    glyphTimer = null
    glyphTimerKey = null
  }

  const scheduleGlyphLock = (snapshot: WebRoundSnapshot): void => {
    const key = `${snapshot.roundId}:${snapshot.roundGeneration}`
    if (glyphTimerKey === key) return
    clearGlyphTimer()
    glyphTimerKey = key
    const roundId = snapshot.roundId
    const generation = snapshot.roundGeneration
    glyphTimer = timers.setTimeout(() => {
      glyphTimer = null
      glyphTimerKey = null
      if (stopped) return
      store.lockGlyph(roundId, generation)
    }, GLYPH_LOCK_DELAY_MS)
  }

  const presentSnapshot = (snapshot: WebRoundSnapshot): void => {
    if (snapshot.phase !== 'CORRECT' && glyphTimer !== null) clearGlyphTimer()
    if (snapshot.phase === 'CORRECT' && reducedMotion()) {
      clearGlyphTimer()
      store.lockGlyph(snapshot.roundId, snapshot.roundGeneration)
      return
    }
    if (snapshot.phase === 'CORRECT') scheduleGlyphLock(snapshot)
    phaseDiagnostic(snapshot)
    render(snapshot, { reducedMotion: reducedMotion() })
  }

  const unsubscribe = store.subscribe(presentSnapshot)
  const onMotionPreferenceChange = (): void => {
    const snapshot = store.getSnapshot()
    if (snapshot.phase !== 'CORRECT' || !reducedMotion()) return
    clearGlyphTimer()
    store.lockGlyph(snapshot.roundId, snapshot.roundGeneration)
  }
  motionPreference?.addEventListener('change', onMotionPreferenceChange)

  const sendIntent = (intent: WebRoundIntent): void => {
    const activeClient = client
    if (!activeClient) return
    void activeClient.send(toRelayDraft(intent)).catch(() => {
      // The adapter owns recovery and emits an allowlisted transport state.
    })
  }

  const dispatchIntents = (intents: readonly WebRoundIntent[]): void => {
    for (const intent of intents) sendIntent(intent)
  }

  const delegate: BrowserRoundDelegate = {
    dispatchAccepted(message) {
      dispatchIntents(store.dispatch(message))
    },
    invalidateForReconnect() {
      clearGlyphTimer()
      store.invalidateForReconnect()
    },
    setTransportState(state, detail) {
      store.setTransportState(state, detail)
    },
  }

  client = new BrowserRelayClient({
    channelFactory,
    sessionId,
    senderId: (seam?.senderIdFactory ?? (() => boundedRandomId('browser-', 8)))(),
    connectionIdFactory: seam?.connectionIdFactory ?? randomConnectionId,
    now,
    timers,
    delegate,
  })

  const scheduleTick = (): void => {
    if (stopped) return
    tickTimer = timers.setTimeout(() => {
      tickTimer = null
      if (stopped) return
      const nowMs = now()
      store.expirePending(nowMs)
      store.tick(nowMs)
      scheduleTick()
    }, DISPLAY_TICK_MS)
  }

  requiredElement<HTMLElement>('choices').addEventListener('click', (event) => {
    const target = event.target
    if (!(target instanceof Element)) return
    const button = target.closest<HTMLButtonElement>('button[data-choice-index]')
    if (!button) return
    const choiceIndex = Number(button.dataset.choiceIndex)
    if (!isChoiceIndex(choiceIndex)) return
    const intent = store.submitChoice(choiceIndex, now())
    if (intent) sendIntent(intent)
  })

  const stop = (): void => {
    if (stopped) return
    stopped = true
    if (tickTimer !== null) timers.clearTimeout(tickTimer)
    tickTimer = null
    clearGlyphTimer()
    unsubscribe()
    motionPreference?.removeEventListener('change', onMotionPreferenceChange)
    const activeClient = client
    client = null
    if (activeClient) void activeClient.close()
  }

  window.addEventListener('beforeunload', stop, { once: true })
  render(store.getSnapshot(), { reducedMotion: reducedMotion() })
  phaseDiagnostic(store.getSnapshot())
  scheduleTick()
  void client.connect().catch(() => {
    // The typed delegate has already rendered the allowlisted failure state.
  })
}

function startJoinView(): void {
  const form = requiredElement<HTMLFormElement>('join-form')
  const input = requiredElement<HTMLInputElement>('session-code')
  const error = requiredElement<HTMLElement>('join-error')
  const prefill = import.meta.env.VITE_RELAY_SESSION_ID
  if (typeof prefill === 'string') input.value = prefill.trim().toUpperCase()

  let joined = false
  form.addEventListener('submit', (event) => {
    event.preventDefault()
    if (joined) return

    const sessionId = input.value.trim().toUpperCase()
    input.value = sessionId
    if (!SESSION_ID_PATTERN.test(sessionId)) {
      error.textContent = 'ENTER A 6-CHARACTER CODE'
      return
    }

    const seam = window.__WORDLESS_RELAY_TEST__
    let channelFactory: BrowserChannelFactory
    if (seam) {
      channelFactory = seam.channelFactory
    }
    else {
      const url = import.meta.env.VITE_SUPABASE_URL
      const publicKey = import.meta.env.VITE_SUPABASE_PUBLIC_KEY
      if (!url || !publicKey) {
        error.textContent = 'RELAY CONFIGURATION UNAVAILABLE'
        return
      }
      channelFactory = createSupabaseBrowserChannelFactory(url, publicKey)
    }

    joined = true
    error.textContent = ''
    startSession(sessionId, channelFactory, seam)
  })
}

startJoinView()
