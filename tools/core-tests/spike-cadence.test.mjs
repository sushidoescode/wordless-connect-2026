import assert from 'node:assert/strict'
import test from 'node:test'

import * as ProbeCadenceModule from '../../Assets/Wordless/Scripts/Spike/ProbeCadence'
import { ProbeSendQueue } from '../../Assets/Wordless/Scripts/Spike/ProbeSendQueue'

const {
  ProbeCadence,
  ProbePointStartGate,
  ProbeUpdateGapSampler,
  ProbeUpdateGapTracker,
  ProbeWireSequencer,
} = ProbeCadenceModule
const nextTurn = () => new Promise((resolve) => setImmediate(resolve))

const collectFrameReleases = (framesPerSecond) => {
  const cadence = new ProbeCadence()
  const pointStartGate = new ProbePointStartGate()
  const releasesMs = [0]
  const pointStartsMs = [0]
  const frameMs = 1_000 / framesPerSecond

  assert.deepEqual(cadence.start(0), { dueTicks: 1, overflowed: false })
  assert.deepEqual(pointStartGate.tryStart(0), {
    dueTicks: 1,
    overflowed: false,
  })
  for (let frame = 1; frame <= framesPerSecond * 10; frame += 1) {
    const nowMs = frame * frameMs
    const batch = cadence.poll(nowMs)
    assert.equal(batch.overflowed, false)
    assert.ok(batch.dueTicks === 0 || batch.dueTicks === 1)
    if (batch.dueTicks === 1) {
      releasesMs.push(nowMs)
      assert.deepEqual(pointStartGate.tryStart(nowMs), {
        dueTicks: 1,
        overflowed: false,
      })
      pointStartsMs.push(nowMs)
    }
  }

  return { frameMs, pointStartsMs, releasesMs }
}

const assertDeadlineBounds = (frameMs, releasesMs) => {
  assert.equal(releasesMs.length, 101)
  for (let index = 0; index < releasesMs.length; index += 1) {
    const deadlineMs = index * 100
    assert.ok(releasesMs[index] >= deadlineMs)
    assert.ok(releasesMs[index] <= deadlineMs + frameMs + 1)
    if (index === 0) continue

    const intervalMs = releasesMs[index] - releasesMs[index - 1]
    assert.ok(intervalMs >= 100 - frameMs - 1)
    assert.ok(intervalMs <= 100 + frameMs + 1)
  }
}

test('starts immediately and releases only on phase-locked deadlines', () => {
  const cadence = new ProbeCadence()

  assert.deepEqual(cadence.start(1_000), { dueTicks: 1, overflowed: false })
  assert.deepEqual(cadence.poll(1_099), { dueTicks: 0, overflowed: false })
  assert.deepEqual(cadence.poll(1_100), { dueTicks: 1, overflowed: false })
  assert.deepEqual(cadence.poll(1_199), { dueTicks: 0, overflowed: false })
  assert.deepEqual(cadence.poll(1_200), { dueTicks: 1, overflowed: false })
})

test('a 350 ms stall coalesces to one release and rebases without catch-up', () => {
  const cadence = new ProbeCadence()

  assert.deepEqual(cadence.start(0), { dueTicks: 1, overflowed: false })
  assert.deepEqual(cadence.poll(350), { dueTicks: 1, overflowed: false })
  assert.deepEqual(cadence.poll(350), { dueTicks: 0, overflowed: false })
  assert.deepEqual(cadence.poll(449), { dueTicks: 0, overflowed: false })
  assert.deepEqual(cadence.poll(450), { dueTicks: 1, overflowed: false })
})

test('stop suppresses releases and start resets the absolute schedule', () => {
  const cadence = new ProbeCadence()

  assert.deepEqual(cadence.start(0), { dueTicks: 1, overflowed: false })
  cadence.stop()
  assert.deepEqual(cadence.poll(10_000), { dueTicks: 0, overflowed: false })

  assert.deepEqual(cadence.start(2_000), { dueTicks: 1, overflowed: false })
  assert.deepEqual(cadence.poll(2_099), { dueTicks: 0, overflowed: false })
  assert.deepEqual(cadence.poll(2_100), { dueTicks: 1, overflowed: false })
})

test('stopping the point-start gate permanently suppresses queued starts', () => {
  const pointStartGate = new ProbePointStartGate()

  assert.equal(pointStartGate.tryStart(0).dueTicks, 1)
  pointStartGate.stop()
  assert.deepEqual(pointStartGate.tryStart(10_000), {
    dueTicks: 0,
    overflowed: false,
  })
})

test('a non-finite clock reading fails closed without releasing a tick', () => {
  const cadence = new ProbeCadence()

  assert.deepEqual(cadence.start(Number.NaN), {
    dueTicks: 0,
    overflowed: true,
  })
  assert.deepEqual(cadence.poll(1_000), {
    dueTicks: 0,
    overflowed: false,
  })

  assert.equal(cadence.start(0).dueTicks, 1)
  assert.deepEqual(cadence.poll(Number.POSITIVE_INFINITY), {
    dueTicks: 0,
    overflowed: true,
  })
  assert.deepEqual(cadence.poll(1_000), {
    dueTicks: 0,
    overflowed: false,
  })
})

test('update gaps report exactly once after a 10 second sample window', () => {
  const sampler = new ProbeUpdateGapSampler()
  const frameMs = 1_000 / 60

  assert.equal(sampler.start(0), true)
  for (let frame = 1; frame < 600; frame += 1) {
    assert.deepEqual(sampler.observe(frame * frameMs), {
      invalid: false,
      report: null,
    })
  }
  const completed = sampler.observe(600 * frameMs)

  assert.equal(completed.invalid, false)
  assert.equal(completed.report.sampleCount, 600)
  assert.ok(Math.abs(completed.report.maxGapMs - frameMs) < 0.000001)
  assert.equal(completed.report.spanMs, 10_000)
  assert.equal(
    ProbeCadenceModule.formatProbeUpdateGapReport(completed.report),
    '[RelaySpike] UPDATE_GAP_MAX sampleCount=600 maxGapMs=17 spanMs=10000',
  )
  assert.deepEqual(sampler.observe(10_100), {
    invalid: false,
    report: null,
  })
})

test('update-gap sampling resets explicitly and fails closed on bad clocks', () => {
  const sampler = new ProbeUpdateGapSampler()

  assert.equal(sampler.start(100), true)
  assert.deepEqual(sampler.observe(99), { invalid: true, report: null })
  assert.deepEqual(sampler.observe(10_100), {
    invalid: false,
    report: null,
  })

  assert.equal(sampler.start(5_000), true)
  assert.equal(sampler.observe(5_000).invalid, false)
  assert.deepEqual(sampler.observe(Number.NaN), {
    invalid: true,
    report: null,
  })
  assert.equal(sampler.start(Number.NaN), false)
  assert.deepEqual(sampler.observe(10_000), {
    invalid: false,
    report: null,
  })
})

test('point-window gap tracking drains intervals without losing gap coverage', () => {
  const tracker = new ProbeUpdateGapTracker()

  assert.equal(tracker.start(100), true)
  assert.equal(tracker.drainMaxGapMs(), 0)
  assert.equal(tracker.observe(112), true)
  assert.equal(tracker.observe(130), true)
  assert.equal(tracker.drainMaxGapMs(), 18)

  assert.equal(tracker.observe(155), true)
  assert.equal(tracker.drainMaxGapMs(), 25)
  assert.equal(tracker.observe(160), true)
  assert.equal(tracker.drainMaxGapMs(), 5)
  for (let nowMs = 260; nowMs <= 10_160; nowMs += 100) {
    assert.equal(tracker.observe(nowMs), true)
  }
  assert.equal(tracker.drainMaxGapMs(), 100)
  assert.equal(tracker.observe(10_175), true)
  assert.equal(tracker.drainMaxGapMs(), 15)
})

test('point-window gap tracking fails closed on invalid or reversing clocks', () => {
  const tracker = new ProbeUpdateGapTracker()

  assert.equal(tracker.start(Number.NaN), false)
  assert.equal(tracker.observe(100), false)
  assert.equal(tracker.drainMaxGapMs(), null)

  assert.equal(tracker.start(100), true)
  assert.equal(tracker.observe(Number.POSITIVE_INFINITY), false)
  assert.equal(tracker.observe(101), false)
  assert.equal(tracker.drainMaxGapMs(), null)

  assert.equal(tracker.start(200), true)
  assert.equal(tracker.observe(199), false)
  assert.equal(tracker.drainMaxGapMs(), null)
})

test('60 FPS releases exactly 101 phase-locked ticks through 10 seconds', () => {
  const { frameMs, pointStartsMs, releasesMs } = collectFrameReleases(60)
  assertDeadlineBounds(frameMs, releasesMs)
  assertDeadlineBounds(frameMs, pointStartsMs)
})

test('61 FPS releases exactly 101 ticks with bounded alternating jitter', () => {
  const { frameMs, pointStartsMs, releasesMs } = collectFrameReleases(61)
  assertDeadlineBounds(frameMs, releasesMs)
  assertDeadlineBounds(frameMs, pointStartsMs)

  const intervalsMs = releasesMs.slice(1).map((value, index) => (
    value - releasesMs[index]
  ))
  assert.ok(Math.abs(Math.min(...intervalsMs) - 98.360655737704) < 0.000001)
  assert.ok(Math.abs(Math.max(...intervalsMs) - 114.754098360656) < 0.000001)
})

test('a 750 ms blocked send cannot burst queued point starts on settlement', async () => {
  let nowMs = 0
  let releaseFirstSend
  let releaseStartWait
  const pointStartGate = new ProbePointStartGate()
  const wireSequencer = new ProbeWireSequencer()
  const pointStartsMs = []
  const startedSequences = []
  const drafts = []
  const sendResults = []
  const queue = new ProbeSendQueue(async (draft) => {
    let startBatch = pointStartGate.tryStart(nowMs)
    assert.equal(startBatch.overflowed, false)
    if (startBatch.dueTicks === 0) {
      await new Promise((resolve) => {
        releaseStartWait = resolve
      })
      startBatch = { dueTicks: 1, overflowed: false }
    }

    assert.equal(startBatch.dueTicks, 1)
    pointStartsMs.push(nowMs)
    const wirePayload = wireSequencer.stamp(draft)
    startedSequences.push(wirePayload.seq)
    if (wirePayload.seq === 1) {
      await new Promise((resolve) => {
        releaseFirstSend = resolve
      })
    }
    return true
  }, 8)
  const generationCadence = new ProbeCadence()
  const enqueueTicks = (batch) => {
    for (let count = 0; count < batch.dueTicks; count += 1) {
      const draft = { draftOrdinal: drafts.length + 1, kind: 'points' }
      drafts.push(draft)
      sendResults.push(queue.enqueue(draft))
    }
  }
  const pumpPointStart = async (nextNowMs) => {
    nowMs = nextNowMs
    if (!releaseStartWait) return
    const batch = pointStartGate.tryStart(nowMs)
    assert.equal(batch.overflowed, false)
    if (batch.dueTicks === 0) return

    const release = releaseStartWait
    releaseStartWait = undefined
    release()
    await nextTurn()
  }

  enqueueTicks(generationCadence.start(0))
  for (nowMs = 100; nowMs <= 700; nowMs += 100) {
    enqueueTicks(generationCadence.poll(nowMs))
  }
  assert.deepEqual(pointStartsMs, [0])

  nowMs = 750
  releaseFirstSend()
  await nextTurn()
  assert.deepEqual(pointStartsMs, [0, 750])

  await pumpPointStart(849)
  assert.deepEqual(pointStartsMs, [0, 750])
  for (const releaseAtMs of [850, 950, 1_050, 1_150, 1_250, 1_350]) {
    await pumpPointStart(releaseAtMs)
  }

  assert.deepEqual(pointStartsMs, [
    0, 750, 850, 950, 1_050, 1_150, 1_250, 1_350,
  ])
  assert.equal(drafts.every((draft) => !Object.hasOwn(draft, 'seq')), true)
  assert.deepEqual(startedSequences, [1, 2, 3, 4, 5, 6, 7, 8])
  assert.deepEqual(await Promise.all(sendResults), [
    true, true, true, true, true, true, true, true,
  ])
})

test('a very long stall emits once and rebases without an unbounded loop', () => {
  const cadence = new ProbeCadence()

  assert.deepEqual(cadence.start(0), { dueTicks: 1, overflowed: false })
  assert.deepEqual(cadence.poll(600_000), {
    dueTicks: 1,
    overflowed: false,
  })
  assert.deepEqual(cadence.poll(600_099), {
    dueTicks: 0,
    overflowed: false,
  })
  assert.deepEqual(cadence.poll(600_100), {
    dueTicks: 1,
    overflowed: false,
  })
})

test('point send preparation stamps the wire boundary and logs no payload data', () => {
  const draft = {
    v: 2,
    kind: 'points',
    sessionId: 'DO_NOT_LOG',
    seq: 41,
    points: [[123, 456]],
    sentAtMs: 7,
  }

  const prepared = ProbeCadenceModule.prepareProbePointSend(
    draft,
    3,
    1_234.567,
    9_001,
    18.25,
  )

  assert.deepEqual(prepared.wirePayload, { ...draft, sentAtMs: 9_001 })
  assert.equal(draft.sentAtMs, 7)
  assert.equal(
    prepared.telemetry,
    '[RelaySpike] POINT_START ordinal=3 monotonicMs=1235 updateGapMaxMs=19',
  )
  assert.match(prepared.telemetry, /updateGapMaxMs=\d+$/)
  assert.equal(prepared.telemetry.includes('DO_NOT_LOG'), false)
  assert.equal(prepared.telemetry.includes('123,456'), false)
})

test('point drafts at 0, 100, and 200 ms remain independent of delayed FIFO work', async () => {
  let releaseFirst
  let active = 0
  let maxConcurrency = 0
  const started = []
  const generatedPointTimesMs = []
  const wireSequencer = new ProbeWireSequencer()
  const queue = new ProbeSendQueue(async (draft) => {
    active += 1
    maxConcurrency = Math.max(maxConcurrency, active)
    const wirePayload = wireSequencer.stamp(draft)
    started.push({ seq: wirePayload.seq, kind: wirePayload.kind })
    if (wirePayload.seq === 1) {
      await new Promise((resolve) => {
        releaseFirst = resolve
      })
    }
    active -= 1
    return true
  }, 8)
  const cadence = new ProbeCadence()
  const sends = []
  const enqueue = (kind, generatedAtMs) => {
    if (kind === 'points') generatedPointTimesMs.push(generatedAtMs)
    sends.push(queue.enqueue({ kind }))
  }

  enqueue('points', 0)
  assert.equal(cadence.start(0).dueTicks, 1)
  enqueue('ack', 50)
  assert.equal(cadence.poll(100).dueTicks, 1)
  enqueue('points', 100)
  assert.equal(cadence.poll(200).dueTicks, 1)
  enqueue('points', 200)

  assert.deepEqual(generatedPointTimesMs, [0, 100, 200])
  assert.deepEqual(started, [{ seq: 1, kind: 'points' }])
  releaseFirst()

  assert.deepEqual(await Promise.all(sends), [true, true, true, true])
  assert.deepEqual(started, [
    { seq: 1, kind: 'points' },
    { seq: 2, kind: 'ack' },
    { seq: 3, kind: 'points' },
    { seq: 4, kind: 'points' },
  ])
  assert.equal(maxConcurrency, 1)
})

test('cadence-driven queue capacity rejection is explicit and fail-closed', async () => {
  let releaseActive
  const startedSequences = []
  const wireSequencer = new ProbeWireSequencer()
  const queue = new ProbeSendQueue(async (draft) => {
    const wirePayload = wireSequencer.stamp(draft)
    startedSequences.push(wirePayload.seq)
    await new Promise((resolve) => {
      releaseActive = resolve
    })
    return true
  }, 4)
  const cadence = new ProbeCadence()
  let draftId = 0
  let failClosed = false
  const accepted = []
  const generatedDraftIds = []
  const enqueue = async (kind) => {
    draftId += 1
    generatedDraftIds.push(draftId)
    const send = queue.enqueue({ draftId, kind })
    if (draftId <= 4) {
      accepted.push(send)
      return
    }
    if (!await send) {
      failClosed = true
      queue.stop()
    }
  }

  assert.equal(cadence.start(0).dueTicks, 1)
  await enqueue('points')
  await enqueue('ack')
  for (const nowMs of [100, 200, 300]) {
    assert.equal(cadence.poll(nowMs).dueTicks, 1)
    await enqueue('points')
  }
  await nextTurn()

  assert.equal(failClosed, true)
  assert.deepEqual(generatedDraftIds, [1, 2, 3, 4, 5])
  assert.deepEqual(startedSequences, [1])
  releaseActive()
  assert.deepEqual(await Promise.all(accepted), [false, false, false, false])
})
