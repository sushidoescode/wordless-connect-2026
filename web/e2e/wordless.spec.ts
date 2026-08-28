import { expect, test, type Page, type TestInfo } from '@playwright/test'

const SESSION_ID = 'WAVE42'
const PAINTER_ID = 'painter-1'
const PAINTER_CONNECTION_ID = 'PAIN0001'
const BROWSER_CONNECTION_ID = 'BROW0001'
const RECOVERED_BROWSER_CONNECTION_ID = 'BROW0002'
const CHOICES = ['SNAKE', 'RIVER', 'ROPE', 'WAVE'] as const

async function installFakeRelay(page: Page): Promise<void> {
  await page.addInitScript(() => {
    type ScheduledTask = {
      readonly id: number
      readonly atMs: number
      readonly callback: () => void
      cancelled: boolean
    }
    type Broadcast = { readonly payload: unknown }

    let nowMs = 1_000
    let nextTimerId = 1
    let connectionOrdinal = 1
    let guessOrdinal = 1
    const scheduled: ScheduledTask[] = []
    const sent: unknown[] = []
    const channels: Array<{
      payloadListener: ((message: Broadcast) => void) | null
      statusListener: ((status: string, error?: unknown) => void) | null
    }> = []
    const unhandledRejections: string[] = []
    let nextApplicationFailure: 'non-ok' | 'reject' | null = null
    let broadcastRegistrations = 0
    let statusRegistrations = 0
    window.addEventListener('unhandledrejection', (event) => {
      unhandledRejections.push(String(event.reason))
    })

    const timers = {
      setTimeout(callback: () => void, delayMs: number) {
        const task = {
          id: nextTimerId,
          atMs: nowMs + Math.max(0, delayMs),
          callback,
          cancelled: false,
        }
        nextTimerId += 1
        scheduled.push(task)
        return task.id
      },
      clearTimeout(handle: unknown) {
        const task = scheduled.find((candidate) => candidate.id === handle)
        if (task) task.cancelled = true
      },
    }

    const seam = {
      now: () => nowMs,
      timers,
      senderIdFactory: () => 'browser-test',
      connectionIdFactory: () => `BROW${String(connectionOrdinal++).padStart(4, '0')}`,
      guessIdFactory: () => `guess-${guessOrdinal++}`,
      channelFactory: (_topic: string) => {
        const record = { payloadListener: null, statusListener: null } as {
          payloadListener: ((message: Broadcast) => void) | null
          statusListener: ((status: string, error?: unknown) => void) | null
        }
        channels.push(record)
        const channel = {
          on(
            _type: 'broadcast',
            _filter: { event: string },
            callback: (message: Broadcast) => void,
          ) {
            broadcastRegistrations += 1
            record.payloadListener = callback
            return channel
          },
          subscribe(callback: (status: string, error?: unknown) => void) {
            statusRegistrations += 1
            record.statusListener = callback
            queueMicrotask(() => callback('SUBSCRIBED'))
            return channel
          },
          async send(message: { readonly payload: unknown }) {
            sent.push(message.payload)
            const relayMessage = message.payload as { readonly type?: string }
            if (relayMessage.type === 'guess.submit' && nextApplicationFailure !== null) {
              const failure = nextApplicationFailure
              nextApplicationFailure = null
              if (failure === 'reject') {
                throw new Error('https://provider.invalid service_role eyJ-secret raw provider detail')
              }
              return 'https://provider.invalid service_role eyJ-secret raw provider detail'
            }
            return 'ok'
          },
          async unsubscribe() { return 'ok' },
          async remove() {},
        }
        return channel
      },
      emit(payload: unknown) { channels.at(-1)?.payloadListener?.({ payload }) },
      emitStatus(status: string, error?: unknown) {
        channels.at(-1)?.statusListener?.(status, error)
      },
      failNextApplicationSend(mode: 'non-ok' | 'reject') {
        nextApplicationFailure = mode
      },
      channelCount: () => channels.length,
      registrationCounts: () => ({
        broadcast: broadcastRegistrations,
        status: statusRegistrations,
      }),
      sent,
      unhandledRejections,
      async advanceBy(deltaMs: number) {
        const target = nowMs + deltaMs
        while (true) {
          const due = scheduled
            .filter((task) => !task.cancelled && task.atMs <= target)
            .sort((left, right) => left.atMs - right.atMs || left.id - right.id)[0]
          if (!due) break
          due.cancelled = true
          nowMs = due.atMs
          due.callback()
          await Promise.resolve()
          await Promise.resolve()
        }
        nowMs = target
        await Promise.resolve()
        await Promise.resolve()
      },
    }

    ;(window as unknown as { __WORDLESS_RELAY_TEST__: typeof seam })
      .__WORDLESS_RELAY_TEST__ = seam
  })
}

async function join(page: Page): Promise<void> {
  await page.goto('/')
  await page.getByLabel('Six-character session code').fill(' wave42 ')
  await page.getByRole('button', { name: 'JOIN ROUND' }).click()
  await expect(page.getByRole('status')).toContainText('WAITING FOR PAINTER')
}

async function emit(page: Page, payload: unknown): Promise<void> {
  await page.evaluate((message) => {
    const seam = (window as unknown as {
      __WORDLESS_RELAY_TEST__: { emit(payload: unknown): void }
    }).__WORDLESS_RELAY_TEST__
    seam.emit(message)
  }, payload)
}

async function advance(page: Page, milliseconds: number): Promise<void> {
  await page.evaluate(async (delta) => {
    const seam = (window as unknown as {
      __WORDLESS_RELAY_TEST__: { advanceBy(value: number): Promise<void> }
    }).__WORDLESS_RELAY_TEST__
    await seam.advanceBy(delta)
  }, milliseconds)
}

async function emitStatus(page: Page, status: string, error?: unknown): Promise<void> {
  await page.evaluate(({ nextStatus, nextError }) => {
    const seam = (window as unknown as {
      __WORDLESS_RELAY_TEST__: { emitStatus(value: string, error?: unknown): void }
    }).__WORDLESS_RELAY_TEST__
    seam.emitStatus(nextStatus, nextError)
  }, { nextStatus: status, nextError: error })
}

async function channelCount(page: Page): Promise<number> {
  return page.evaluate(() => (window as unknown as {
    __WORDLESS_RELAY_TEST__: { channelCount(): number }
  }).__WORDLESS_RELAY_TEST__.channelCount())
}

async function sentMessages(page: Page, type: string): Promise<Array<{
  readonly type: string
  readonly roundId: string
  readonly payload: Record<string, unknown>
}>> {
  return page.evaluate((messageType) => {
    const sent = (window as unknown as {
      __WORDLESS_RELAY_TEST__: { sent: Array<{
        type?: string
        roundId?: string
        payload?: Record<string, unknown>
      }> }
    }).__WORDLESS_RELAY_TEST__.sent
    return sent.filter((entry) => entry.type === messageType) as Array<{
      type: string
      roundId: string
      payload: Record<string, unknown>
    }>
  }, type)
}

function message(
  type: string,
  roundId: string,
  sequence: number,
  payload: unknown,
  connectionId = PAINTER_CONNECTION_ID,
) {
  return {
    v: 2,
    type,
    sessionId: SESSION_ID,
    roundId,
    senderId: PAINTER_ID,
    sequence,
    sentAtMs: 1_000 + sequence,
    payload,
    connectionId,
  }
}

async function startRound(page: Page): Promise<void> {
  await emit(page, message('presence.ack', 'lobby', 1, {
    role: 'painter',
    connectionId: PAINTER_CONNECTION_ID,
    acknowledgedConnectionId: BROWSER_CONNECTION_ID,
  }))
  await emit(page, message('round.start', 'round-1', 2, {
    choices: CHOICES,
    durationMs: 20_000,
    targetConnectionId: BROWSER_CONNECTION_ID,
  }))
  await expect(page.locator('.app-shell')).toHaveAttribute('data-phase', 'ACTIVE')
}

async function latestGuessId(page: Page): Promise<string> {
  return page.evaluate(() => {
    const sent = (window as unknown as {
      __WORDLESS_RELAY_TEST__: { sent: Array<{ type?: string; payload?: { guessId?: string } }> }
    }).__WORDLESS_RELAY_TEST__.sent
    const guess = [...sent].reverse().find((entry) => entry.type === 'guess.submit')
    if (!guess?.payload?.guessId) throw new Error('guess draft not sent')
    return guess.payload.guessId
  })
}

async function capture(page: Page, testInfo: TestInfo): Promise<void> {
  await page.screenshot({ path: testInfo.outputPath('surface.png'), fullPage: true })
}

test.beforeEach(async ({ page }) => {
  await installFakeRelay(page)
})

test('validates join input without bypassing the six-character code', async ({ page }) => {
  await page.goto('/')
  await page.getByLabel('Six-character session code').fill('bad')
  await page.getByRole('button', { name: 'JOIN ROUND' }).click()

  await expect(page.getByRole('alert')).toHaveText('ENTER A 6-CHARACTER CODE')
  await expect(page.getByRole('button', { name: 'JOIN ROUND' })).toBeVisible()
  expect(await channelCount(page)).toBe(0)

  await page.getByLabel('Six-character session code').fill(' wave42 ')
  await page.getByRole('button', { name: 'JOIN ROUND' }).click()
  await expect(page.getByRole('status')).toContainText('WAITING FOR PAINTER')
  await expect.poll(() => channelCount(page)).toBe(1)
  await page.waitForTimeout(50)
  expect(await channelCount(page)).toBe(1)
  expect(await page.evaluate(() => (window as unknown as {
    __WORDLESS_RELAY_TEST__: {
      registrationCounts(): { broadcast: number; status: number }
    }
  }).__WORDLESS_RELAY_TEST__.registrationCounts())).toEqual({
    broadcast: 1,
    status: 1,
  })
})

test('pre-join view has no horizontal overflow at 390px or 320px', async ({ page }) => {
  for (const viewport of [
    { width: 390, height: 844 },
    { width: 320, height: 700 },
  ]) {
    await page.setViewportSize(viewport)
    await page.goto('/')
    expect(await page.evaluate(() => ({
      scrollWidth: document.documentElement.scrollWidth,
      innerWidth: window.innerWidth,
    }))).toEqual({ scrollWidth: viewport.width, innerWidth: viewport.width })
  }
})

test('keeps the round surface bounded at the phone, tablet, and desktop craft sizes', async ({ page }, testInfo) => {
  await join(page)
  await startRound(page)
  await emit(page, message('stroke.points', 'round-1', 3, {
    strokeId: 'stroke-responsive',
    points: [[170, 640], [320, 260], [500, 760], [700, 210], [850, 590]],
  }))

  for (const viewport of [
    { width: 390, height: 844 },
    { width: 768, height: 1_024 },
    { width: 1_440, height: 900 },
  ]) {
    await page.setViewportSize(viewport)
    const layout = await page.evaluate(() => {
      const field = document.querySelector<HTMLElement>('.play-field')!.getBoundingClientRect()
      const choices = document.querySelector<HTMLElement>('#choices')!.getBoundingClientRect()
      const result = document.querySelector<HTMLElement>('#result')!.getBoundingClientRect()
      const cards = [...document.querySelectorAll<HTMLElement>('#choices button')]
      const cardRects = cards.map((card) => card.getBoundingClientRect())
      return {
        overflow: document.documentElement.scrollWidth > window.innerWidth,
        field: { left: field.left, right: field.right, top: field.top, bottom: field.bottom },
        choices: {
          left: choices.left,
          right: choices.right,
          top: choices.top,
          bottom: choices.bottom,
        },
        result: { top: result.top, bottom: result.bottom },
        cards: cardRects.map((card) => ({
          left: card.left,
          top: card.top,
          right: card.right,
          bottom: card.bottom,
          width: card.width,
          height: card.height,
        })),
      }
    })

    expect(layout.overflow).toBe(false)
    expect(layout.field.left).toBeGreaterThanOrEqual(0)
    expect(layout.field.right).toBeLessThanOrEqual(viewport.width)
    expect(layout.choices.left).toBeGreaterThanOrEqual(0)
    expect(layout.choices.right).toBeLessThanOrEqual(viewport.width)
    expect(layout.cards).toHaveLength(4)
    expect(Math.min(...layout.cards.map((card) => card.height))).toBeGreaterThanOrEqual(48)
    expect(layout.cards[0]?.top).toBeCloseTo(layout.cards[1]!.top, 0)
    expect(layout.cards[0]?.left).toBeLessThan(layout.cards[1]!.left)
    expect(layout.cards[2]?.top).toBeGreaterThan(layout.cards[0]!.bottom)
    if (viewport.width >= 960) {
      expect(layout.choices.left).toBeGreaterThan(layout.field.right)
      expect(layout.result.top - layout.field.bottom).toBeLessThanOrEqual(60)
    }
    else {
      expect(layout.choices.top).toBeGreaterThan(layout.field.bottom)
    }
    await page.screenshot({
      path: testInfo.outputPath(`round-${viewport.width}x${viewport.height}.png`),
      fullPage: true,
    })
  }
})

test('renders four responsive cards and pending, rejection, retry, and timeout states', async ({ page }, testInfo) => {
  await join(page)
  await startRound(page)

  const cards = page.locator('#choices button')
  await expect(cards).toHaveCount(4)
  for (let index = 0; index < 4; index += 1) {
    await expect(cards.nth(index)).toBeVisible()
    expect((await cards.nth(index).boundingBox())?.height ?? 0).toBeGreaterThanOrEqual(48)
  }
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)

  await cards.nth(1).click()
  expect(await cards.evaluateAll((buttons) =>
    buttons.every((button) => (button as HTMLButtonElement).disabled),
  )).toBe(true)
  await expect(cards.nth(1)).toContainText('SUBMITTED')
  const firstGuessId = await latestGuessId(page)
  await expect.poll(async () => {
    const guess = (await sentMessages(page, 'guess.submit')).at(-1)
    return guess === undefined ? null : {
      type: guess.type,
      roundId: guess.roundId,
      payload: guess.payload,
    }
  }).toEqual({
    type: 'guess.submit',
    roundId: 'round-1',
    payload: { guessId: firstGuessId, choiceIndex: 1 },
  })
  await emit(page, message('guess.rejected', 'round-1', 3, {
    guessId: firstGuessId,
    choiceIndex: 1,
    reason: 'DUPLICATE_GUESS',
  }))
  await expect(cards.nth(1)).toBeEnabled()

  await cards.nth(1).click()
  await advance(page, 3_000)
  await expect(cards.nth(1)).toBeEnabled()
  await emit(page, message('round.timeout', 'round-1', 4, { finalPointCount: 0 }))
  expect(await cards.evaluateAll((buttons) =>
    buttons.every((button) => (button as HTMLButtonElement).disabled),
  )).toBe(true)
  await expect(page.getByText(/TIME’S UP/)).toBeVisible()
  await expect(page.locator('#glyph-medallion')).toBeHidden()
  await capture(page, testInfo)
})

test('shows wrong then authoritative correct, derives the exact glyph, and locks after 450 ms', async ({ page }, testInfo) => {
  await join(page)
  await startRound(page)
  await emit(page, message('stroke.points', 'round-1', 3, {
    strokeId: 'stroke-1',
    points: [[200, 200], [400, 800], [600, 300]],
  }))

  const cards = page.locator('#choices button')
  await cards.nth(1).click()
  const wrongGuessId = await latestGuessId(page)
  await emit(page, message('round.result', 'round-1', 4, {
    outcome: 'incorrect',
    guessId: wrongGuessId,
    choiceIndex: 1,
  }))
  await expect(cards.nth(1)).toContainText('×')
  await expect(cards.nth(1)).toContainText('TRY AGAIN')

  await cards.nth(0).click()
  const correctGuessId = await latestGuessId(page)
  await emit(page, message('round.result', 'round-1', 5, {
    outcome: 'correct',
    guessId: correctGuessId,
    choiceIndex: 0,
    revealedWord: 'SNAKE',
    finalPointCount: 3,
  }))
  await expect(page.locator('.app-shell')).toHaveAttribute('data-phase', 'CORRECT')
  await expect(page.getByText(/CORRECT · SNAKE/)).toBeVisible()
  await expect(page.locator('#glyph-medallion canvas[aria-label="Solved clue glyph drawing"]')).toBeVisible()
  expect(await page.locator('#glyph-medallion canvas').evaluate((canvas) => {
    const glyphCanvas = canvas as HTMLCanvasElement
    const context = glyphCanvas.getContext('2d')
    if (!context) return false
    return [[233, 100], [500, 900], [767, 233]].every(([x, y]) =>
      context.getImageData(
        Math.round(x / 1_000 * glyphCanvas.width),
        Math.round(y / 1_000 * glyphCanvas.height),
        1,
        1,
      ).data[3] > 0,
    )
  })).toBe(true)

  await advance(page, 449)
  await expect(page.locator('.app-shell')).toHaveAttribute('data-phase', 'CORRECT')
  await advance(page, 1)
  await expect(page.locator('.app-shell')).toHaveAttribute('data-phase', 'GLYPH_LOCKED')
  await capture(page, testInfo)
})

test('reduced motion locks the exact glyph immediately without rendering a moving overlay', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await join(page)
  await startRound(page)
  await emit(page, message('stroke.points', 'round-1', 3, {
    strokeId: 'stroke-1',
    points: [[200, 200], [400, 800], [600, 300]],
  }))

  const cards = page.locator('#choices button')
  await cards.nth(1).click()
  const wrongGuessId = await latestGuessId(page)
  await emit(page, message('round.result', 'round-1', 4, {
    outcome: 'incorrect',
    guessId: wrongGuessId,
    choiceIndex: 1,
  }))
  expect(await cards.nth(1).evaluate((element) => {
    const style = getComputedStyle(element)
    return { duration: style.animationDuration, transform: style.transform }
  })).toEqual({ duration: '0s', transform: 'none' })

  await cards.first().click()
  const correctGuessId = await latestGuessId(page)
  await emit(page, message('round.result', 'round-1', 5, {
    outcome: 'correct',
    guessId: correctGuessId,
    choiceIndex: 0,
    revealedWord: 'SNAKE',
    finalPointCount: 3,
  }))

  await expect(page.locator('.app-shell')).toHaveAttribute('data-phase', 'GLYPH_LOCKED')
  await expect(page.locator('#glyph-transition-canvas')).toHaveCount(0)
  await expect(page.locator('#glyph-medallion')).toBeVisible()
  await expect(page.locator('#glyph-medallion')).not.toHaveClass(/is-transitioning/)
})

test('a motion preference change immediately settles an in-flight glyph', async ({ page }) => {
  await join(page)
  await startRound(page)
  await emit(page, message('stroke.points', 'round-1', 3, {
    strokeId: 'stroke-1',
    points: [[200, 200], [400, 800], [600, 300]],
  }))
  await emit(page, message('round.result', 'round-1', 4, {
    outcome: 'correct',
    guessId: 'guess-motion-change',
    choiceIndex: 0,
    revealedWord: 'SNAKE',
    finalPointCount: 3,
  }))
  await expect(page.locator('.app-shell')).toHaveAttribute('data-phase', 'CORRECT')
  await expect(page.locator('#glyph-transition-canvas')).toHaveCount(1)

  await page.emulateMedia({ reducedMotion: 'reduce' })

  await expect(page.locator('.app-shell')).toHaveAttribute('data-phase', 'GLYPH_LOCKED')
  await expect(page.locator('#glyph-transition-canvas')).toHaveCount(0)
  await expect(page.locator('#glyph-medallion')).not.toHaveClass(/is-transitioning/)
})

test('uses the fixed one-shot connection, wrong, and correct visual timings', async ({ page }) => {
  await join(page)
  await emit(page, message('presence.ack', 'lobby', 1, {
    role: 'painter',
    connectionId: PAINTER_CONNECTION_ID,
    acknowledgedConnectionId: BROWSER_CONNECTION_ID,
  }))
  await expect(page.getByRole('status')).toContainText('PAINTER READY')
  expect(await page.locator('#connection').evaluate((element) => {
    const style = getComputedStyle(element)
    return { name: style.animationName, duration: style.animationDuration }
  })).toEqual({ name: 'connection-fade', duration: '0.16s' })

  await emit(page, message('round.start', 'round-1', 2, {
    choices: CHOICES,
    durationMs: 20_000,
    targetConnectionId: BROWSER_CONNECTION_ID,
  }))
  await expect(page.locator('#connection')).toHaveClass(/is-changing/)
  await emit(page, message('stroke.points', 'round-1', 3, {
    strokeId: 'stroke-1',
    points: [[200, 200], [400, 800], [600, 300]],
  }))

  const cards = page.locator('#choices button')
  await cards.nth(1).click()
  const wrongGuessId = await latestGuessId(page)
  await emit(page, message('round.result', 'round-1', 4, {
    outcome: 'incorrect',
    guessId: wrongGuessId,
    choiceIndex: 1,
  }))
  expect(await cards.nth(1).evaluate((element) => {
    const style = getComputedStyle(element)
    return { name: style.animationName, duration: style.animationDuration }
  })).toEqual({ name: 'wrong-shake', duration: '0.22s' })
  await cards.nth(1).evaluate((element) => {
    ;(window as unknown as { __wordlessWrongNode?: Element }).__wordlessWrongNode = element
  })
  await cards.nth(3).focus()
  await advance(page, 100)
  expect(await cards.nth(1).evaluate((element) =>
    element === (window as unknown as { __wordlessWrongNode?: Element }).__wordlessWrongNode,
  )).toBe(true)
  await expect(cards.nth(3)).toBeFocused()
  expect(await cards.nth(1).evaluate((element) =>
    getComputedStyle(element).animationDuration,
  )).toBe('0.22s')

  await cards.nth(0).click()
  const correctGuessId = await latestGuessId(page)
  await emit(page, message('round.result', 'round-1', 5, {
    outcome: 'correct',
    guessId: correctGuessId,
    choiceIndex: 0,
    revealedWord: 'SNAKE',
    finalPointCount: 3,
  }))
  expect(await cards.nth(0).evaluate((element) => {
    const style = getComputedStyle(element)
    return { name: style.animationName, duration: style.animationDuration }
  })).toEqual({ name: 'correct-settle', duration: '0.18s' })
  await expect(page.locator('#glyph-transition-canvas')).toHaveAttribute('data-point-count', '3')
})

test('a render failure cannot prevent the semantic glyph lock', async ({ page }) => {
  const phases: string[] = []
  page.on('console', (message) => {
    const match = message.text().match(/^\[WORDLESS\] BROWSER PHASE (\S+)$/)
    if (match) phases.push(match[1]!)
  })
  await join(page)
  await startRound(page)
  await emit(page, message('stroke.points', 'round-1', 3, {
    strokeId: 'stroke-1',
    points: [[200, 200], [400, 800], [600, 300]],
  }))
  await page.locator('#result').evaluate((element) => element.remove())
  await emit(page, message('round.result', 'round-1', 4, {
    outcome: 'correct',
    guessId: 'guess-render-failure',
    choiceIndex: 0,
    revealedWord: 'SNAKE',
    finalPointCount: 3,
  }))

  await advance(page, 450)

  expect(phases).toContain('GLYPH_LOCKED')
})

test('reset before completion makes the stale glyph callback harmless', async ({ page }) => {
  await join(page)
  await startRound(page)
  await emit(page, message('stroke.points', 'round-1', 3, {
    strokeId: 'stroke-1',
    points: [[100, 200]],
  }))
  await emit(page, message('round.result', 'round-1', 4, {
    outcome: 'correct',
    guessId: 'guess-late',
    choiceIndex: 0,
    revealedWord: 'SNAKE',
    finalPointCount: 1,
  }))
  await expect(page.locator('.app-shell')).toHaveAttribute('data-phase', 'CORRECT')

  await emit(page, message('round.reset', 'round-1', 5, {
    nextRoundId: 'round-2',
    targetConnectionId: BROWSER_CONNECTION_ID,
  }))
  await emit(page, message('round.start', 'round-2', 6, {
    choices: CHOICES,
    durationMs: 20_000,
    targetConnectionId: BROWSER_CONNECTION_ID,
  }))
  await advance(page, 450)

  await expect(page.locator('.app-shell')).toHaveAttribute('data-phase', 'ACTIVE')
  await expect(page.locator('#glyph-medallion')).toBeHidden()
  await expect(page.getByText('CORRECT · SNAKE')).toHaveCount(0)
})

test('one-point authoritative result paints the exact normalized violet glyph point', async ({ page }) => {
  await join(page)
  await startRound(page)
  await emit(page, message('stroke.points', 'round-1', 3, {
    strokeId: 'stroke-1',
    points: [[237, 811]],
  }))
  await emit(page, message('round.result', 'round-1', 4, {
    outcome: 'correct',
    guessId: 'guess-one-point',
    choiceIndex: 0,
    revealedWord: 'SNAKE',
    finalPointCount: 1,
  }))

  await expect(page.locator('.app-shell')).toHaveAttribute('data-phase', 'CORRECT')
  const pixels = await page.locator('#glyph-medallion canvas').evaluate((canvas) => {
    const glyph = canvas as HTMLCanvasElement
    const context = glyph.getContext('2d')!
    return {
      exact: [...context.getImageData(glyph.width / 2, glyph.height / 2, 1, 1).data],
      away: [...context.getImageData(10, 10, 1, 1).data],
    }
  })
  expect(pixels.exact).toEqual([139, 92, 246, 255])
  expect(pixels.away[3]).toBe(0)
})

test('phone glyph canvas and painted right-bottom edge stay inside the visible medallion', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await join(page)
  await startRound(page)
  await emit(page, message('stroke.points', 'round-1', 3, {
    strokeId: 'stroke-1',
    points: [[0, 0], [1_000, 1_000]],
  }))
  await emit(page, message('round.result', 'round-1', 4, {
    outcome: 'correct',
    guessId: 'guess-contained-edge',
    choiceIndex: 0,
    revealedWord: 'SNAKE',
    finalPointCount: 2,
  }))
  await advance(page, 450)
  await expect(page.locator('.app-shell')).toHaveAttribute('data-phase', 'GLYPH_LOCKED')

  const evidence = await page.locator('#glyph-medallion canvas').evaluate((element) => {
    const canvas = element as HTMLCanvasElement
    const medallion = canvas.parentElement as HTMLElement
    const canvasRect = canvas.getBoundingClientRect()
    const medallionRect = medallion.getBoundingClientRect()
    const medallionStyle = getComputedStyle(medallion)
    const left = medallionRect.left + Number.parseFloat(medallionStyle.borderLeftWidth)
    const top = medallionRect.top + Number.parseFloat(medallionStyle.borderTopWidth)
    const right = medallionRect.right - Number.parseFloat(medallionStyle.borderRightWidth)
    const bottom = medallionRect.bottom - Number.parseFloat(medallionStyle.borderBottomWidth)
    const edgeBackingX = Math.round(canvas.width * 0.9)
    const edgeBackingY = Math.round(canvas.height * 0.9)
    const edgeClientX = canvasRect.left + canvasRect.width * 0.9
    const edgeClientY = canvasRect.top + canvasRect.height * 0.9
    return {
      canvas: {
        left: canvasRect.left,
        top: canvasRect.top,
        right: canvasRect.right,
        bottom: canvasRect.bottom,
        width: canvasRect.width,
        height: canvasRect.height,
      },
      content: { left, top, right, bottom },
      medallionClient: { width: medallion.clientWidth, height: medallion.clientHeight },
      canvasClient: { width: canvas.clientWidth, height: canvas.clientHeight },
      edgeClient: { x: edgeClientX, y: edgeClientY },
      edgePixel: [...canvas.getContext('2d')!
        .getImageData(edgeBackingX, edgeBackingY, 1, 1).data],
    }
  })

  expect(evidence.canvas.left).toBeCloseTo(evidence.content.left, 0)
  expect(evidence.canvas.top).toBeCloseTo(evidence.content.top, 0)
  expect(evidence.canvas.right).toBeLessThanOrEqual(evidence.content.right + 0.5)
  expect(evidence.canvas.bottom).toBeLessThanOrEqual(evidence.content.bottom + 0.5)
  expect(evidence.canvasClient).toEqual(evidence.medallionClient)
  expect(evidence.edgeClient.x).toBeLessThanOrEqual(evidence.content.right)
  expect(evidence.edgeClient.y).toBeLessThanOrEqual(evidence.content.bottom)
  expect(evidence.edgePixel[3]).toBeGreaterThan(0)
})

test('point-count mismatch sends the exact round-scoped resync request', async ({ page }) => {
  await join(page)
  await startRound(page)
  await emit(page, message('stroke.points', 'round-1', 3, {
    strokeId: 'stroke-1',
    points: [[100, 200]],
  }))
  await emit(page, message('round.result', 'round-1', 4, {
    outcome: 'correct',
    guessId: 'guess-mismatch',
    choiceIndex: 0,
    revealedWord: 'SNAKE',
    finalPointCount: 2,
  }))

  await expect.poll(async () => {
    const request = (await sentMessages(page, 'round.resync.request')).at(-1)
    return request === undefined ? null : {
      type: request.type,
      roundId: request.roundId,
      payload: request.payload,
    }
  }).toEqual({
      type: 'round.resync.request',
      roundId: 'round-1',
      payload: { reason: 'POINT_COUNT_MISMATCH' },
    })
})

test('channel error creates one successor and stale glyph work cannot lock its round', async ({ page }) => {
  await join(page)
  await expect(page.getByRole('status')).toContainText('WAITING FOR PAINTER')
  await startRound(page)
  await emit(page, message('stroke.points', 'round-1', 3, {
    strokeId: 'stroke-1',
    points: [[100, 200]],
  }))
  await emit(page, message('round.result', 'round-1', 4, {
    outcome: 'correct',
    guessId: 'guess-stale',
    choiceIndex: 0,
    revealedWord: 'SNAKE',
    finalPointCount: 1,
  }))
  await expect(page.locator('#glyph-medallion')).toBeVisible()

  await emitStatus(page, 'CHANNEL_ERROR', new Error('provider raw detail'))
  await expect(page.getByRole('status')).toContainText('RECONNECTING')
  await expect(page.locator('.app-shell')).toHaveAttribute('data-phase', 'DISCONNECTED')
  await expect(page.locator('#glyph-medallion')).toBeHidden()
  expect(await page.locator('#stroke-canvas').evaluate((canvas) => {
    const target = canvas as HTMLCanvasElement
    const pixels = target.getContext('2d')!.getImageData(0, 0, target.width, target.height).data
    return pixels.some((value, index) => index % 4 === 3 && value > 0)
  })).toBe(false)
  await expect.poll(() => channelCount(page)).toBe(2)
  await expect.poll(async () => (await sentMessages(page, 'presence.ready'))
    .map((ready) => ready.payload.connectionId)).toEqual([
      BROWSER_CONNECTION_ID,
      RECOVERED_BROWSER_CONNECTION_ID,
    ])

  await emit(page, message('presence.ack', 'lobby', 5, {
    role: 'painter',
    connectionId: PAINTER_CONNECTION_ID,
    acknowledgedConnectionId: RECOVERED_BROWSER_CONNECTION_ID,
  }))
  await emit(page, message('round.reset', 'round-1', 6, {
    nextRoundId: 'round-2',
    targetConnectionId: RECOVERED_BROWSER_CONNECTION_ID,
  }))
  await emit(page, message('round.start', 'round-2', 7, {
    choices: CHOICES,
    durationMs: 20_000,
    targetConnectionId: RECOVERED_BROWSER_CONNECTION_ID,
  }))
  await advance(page, 450)

  expect(await channelCount(page)).toBe(2)
  await expect(page.locator('.app-shell')).toHaveAttribute('data-phase', 'ACTIVE')
  await expect(page.locator('#glyph-medallion')).toBeHidden()
})

test('rejected application send fails safely without leaking provider detail', async ({ page }) => {
  const pageErrors: string[] = []
  page.on('pageerror', (error) => pageErrors.push(error.message))
  await join(page)
  await startRound(page)
  await page.evaluate(() => {
    const seam = (window as unknown as {
      __WORDLESS_RELAY_TEST__: { failNextApplicationSend(mode: 'reject'): void }
    }).__WORDLESS_RELAY_TEST__
    seam.failNextApplicationSend('reject')
  })

  await page.locator('#choices button').first().click()
  await expect(page.getByRole('status')).toContainText('RECONNECTING')
  await expect.poll(() => channelCount(page)).toBe(2)
  await emitStatus(page, 'CHANNEL_ERROR', new Error('https://provider.invalid service_role'))
  await expect(page.getByRole('status')).toContainText('CONNECTION FAILED')

  const status = await page.getByRole('status').textContent()
  expect(status).not.toMatch(/https?:\/\/|service_role|eyJ|provider|raw/i)
  expect(pageErrors).toEqual([])
  expect(await page.evaluate(() => (window as unknown as {
    __WORDLESS_RELAY_TEST__: { unhandledRejections: string[] }
  }).__WORDLESS_RELAY_TEST__.unhandledRejections)).toEqual([])
})
