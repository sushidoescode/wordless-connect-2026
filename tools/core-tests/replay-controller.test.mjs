import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'
import ts from 'typescript'

async function loadDecoratedTypeScript(relativePath) {
  const fileUrl = new URL(relativePath, import.meta.url)
  const source = await readFile(fileUrl, 'utf8')
  const output = ts.transpileModule(source, {
    compilerOptions: {
      target: ts.ScriptTarget.ES2022,
      module: ts.ModuleKind.ESNext,
      experimentalDecorators: true,
      useDefineForClassFields: false,
    },
    fileName: fileUrl.pathname,
  })

  const protocolUrl = new URL('../Core/Protocol.ts', fileUrl).href
  const executableSource = output.outputText
    .replaceAll("'../Core/Protocol'", JSON.stringify(protocolUrl))
    .replaceAll('"../Core/Protocol"', JSON.stringify(protocolUrl))

  globalThis.component = (target) => target
  globalThis.input = () => undefined
  globalThis.BaseScriptComponent = class {
    constructor() {
      this.testEvents = new Map()
    }

    createEvent(name) {
      return {
        bind: (callback) => this.testEvents.set(name, callback),
      }
    }
  }
  return import(`data:text/javascript;base64,${Buffer.from(executableSource).toString('base64')}`)
}

const {
  ReplayController,
  ReplayRequestGate,
  isReplayAvailablePhase,
} = await loadDecoratedTypeScript(
  '../../Assets/Wordless/Scripts/Input/ReplayController.ts',
)

const phases = [
  'DISCONNECTED',
  'JOINING',
  'READY',
  'ACTIVE',
  'CORRECT',
  'GLYPH_LOCKED',
  'TIMED_OUT',
]

test('only glyph-locked and timed-out phases make replay available', () => {
  for (const phase of phases) {
    assert.equal(
      isReplayAvailablePhase(phase),
      phase === 'GLYPH_LOCKED' || phase === 'TIMED_OUT',
      phase,
    )
  }
})

test('the gate emits one request for the exact bound terminal round', () => {
  for (const phase of phases) {
    const gate = new ReplayRequestGate()
    const roundId = `r-REPLAY01-${phases.indexOf(phase) + 1}`
    gate.setAvailable(roundId, isReplayAvailablePhase(phase))

    assert.equal(
      gate.request(roundId),
      isReplayAvailablePhase(phase) ? roundId : null,
      phase,
    )
    assert.equal(gate.request(roundId), null, `${phase} repeated request`)
  }
})

test('stale round requests are no-ops and never consume the current gate', () => {
  const gate = new ReplayRequestGate()
  gate.setAvailable('r-REPLAY01-1', true)

  assert.equal(gate.request('r-REPLAY01-0'), null)
  assert.equal(gate.request('r-REPLAY01-1'), 'r-REPLAY01-1')
  assert.equal(gate.request('r-REPLAY01-1'), null)
  gate.setAvailable('r-REPLAY01-1', true)
  assert.equal(gate.request('r-REPLAY01-1'), null)

  gate.setAvailable('r-REPLAY01-2', true)
  assert.equal(gate.request('r-REPLAY01-1'), null)
  assert.equal(gate.request('r-REPLAY01-2'), 'r-REPLAY01-2')
})

test('false or invalid availability fails closed', () => {
  const gate = new ReplayRequestGate()
  gate.setAvailable('r-REPLAY01-1', true)
  gate.setAvailable('r-REPLAY01-1', false)
  assert.equal(gate.request('r-REPLAY01-1'), null)

  for (const invalid of ['', 'lobby', 'bad round', 'x'.repeat(33)]) {
    gate.setAvailable(invalid, true)
    assert.equal(gate.request(invalid), null)
  }
})

test('the runtime controller subscribes once and disables authored controls before notifying', () => {
  const triggerListeners = []
  let addCount = 0
  let unsubscribeCount = 0
  const controller = new ReplayController()
  controller.replayLabel = { enabled: true }
  controller.replayCollider = { enabled: true }
  controller.replayInteractable = {
    enabled: true,
    onTriggerStart: {
      add(callback) {
        addCount += 1
        triggerListeners.push(callback)
        return () => { unsubscribeCount += 1 }
      },
    },
  }

  const requests = []
  controller.setListener({
    onReplayRequested(roundId) {
      requests.push({
        roundId,
        labelEnabled: controller.replayLabel.enabled,
        colliderEnabled: controller.replayCollider.enabled,
        interactableEnabled: controller.replayInteractable.enabled,
      })
    },
  })
  controller.onAwake()
  controller.testEvents.get('OnStartEvent')()

  controller.setAvailable('r-REPLAY01-1', true)
  controller.setAvailable('r-REPLAY01-1', true)
  assert.equal(addCount, 1)
  assert.equal(triggerListeners.length, 1)
  assert.equal(controller.replayLabel.enabled, true)
  assert.equal(controller.replayCollider.enabled, true)
  assert.equal(controller.replayInteractable.enabled, true)

  triggerListeners[0]({})
  triggerListeners[0]({})
  assert.deepEqual(requests, [{
    roundId: 'r-REPLAY01-1',
    labelEnabled: false,
    colliderEnabled: false,
    interactableEnabled: false,
  }])

  controller.testEvents.get('OnDestroyEvent')()
  assert.equal(unsubscribeCount, 1)
})

test('defers every SIK enabled write until OnStart while keeping authored hit resources hidden', () => {
  let sikStarted = false
  const enabledWrites = []
  const triggerListeners = []
  const interactable = {
    onTriggerStart: {
      add(callback) {
        triggerListeners.push(callback)
        return () => {}
      },
    },
    get enabled() { return enabledWrites.at(-1) ?? true },
    set enabled(value) {
      if (!sikStarted) {
        throw new Error('SIK enabled was written before OnStart')
      }
      enabledWrites.push(value)
    },
  }
  const controller = new ReplayController()
  controller.replayLabel = { enabled: true }
  controller.replayCollider = { enabled: true }
  controller.replayInteractable = interactable

  assert.doesNotThrow(() => controller.onAwake())
  assert.equal(controller.replayLabel.enabled, false)
  assert.equal(controller.replayCollider.enabled, false)
  controller.setAvailable('r-REPLAY01-1', true)
  assert.equal(controller.replayLabel.enabled, false)
  assert.equal(controller.replayCollider.enabled, false)
  assert.deepEqual(enabledWrites, [])

  sikStarted = true
  controller.testEvents.get('OnStartEvent')()
  assert.deepEqual(enabledWrites, [true])
  assert.equal(controller.replayLabel.enabled, true)
  assert.equal(controller.replayCollider.enabled, true)
  assert.equal(triggerListeners.length, 1)
})

test('the runtime controller rejects an incomplete authored control', () => {
  const controller = new ReplayController()
  assert.throws(
    () => controller.onAwake(),
    /requires label, collider, and interactable bindings/i,
  )
})
