import assert from 'node:assert/strict'
import test from 'node:test'

import { ProbeSendQueue } from '../../Assets/Wordless/Scripts/Spike/ProbeSendQueue'

const nextTurn = () => new Promise((resolve) => setImmediate(resolve))

test('awaits every send and preserves FIFO order with max concurrency one', async () => {
  let active = 0
  let maxConcurrency = 0
  const started = []
  const releases = []
  const queue = new ProbeSendQueue(async (value) => {
    active += 1
    maxConcurrency = Math.max(maxConcurrency, active)
    started.push(value)
    await new Promise((resolve) => releases.push(resolve))
    active -= 1
    return true
  }, 4)

  const results = [
    queue.enqueue('points-1'),
    queue.enqueue('ack-1'),
    queue.enqueue('points-2'),
  ]

  assert.deepEqual(started, ['points-1'])
  releases.shift()()
  await nextTurn()
  assert.deepEqual(started, ['points-1', 'ack-1'])
  releases.shift()()
  await nextTurn()
  assert.deepEqual(started, ['points-1', 'ack-1', 'points-2'])
  releases.shift()()

  assert.deepEqual(await Promise.all(results), [true, true, true])
  assert.equal(maxConcurrency, 1)
})

test('bounds pending work and safely rejects it when stopped', async () => {
  let releaseActive
  const queue = new ProbeSendQueue(async () => {
    await new Promise((resolve) => {
      releaseActive = resolve
    })
    return true
  }, 2)

  const active = queue.enqueue('active')
  const pending = queue.enqueue('pending')

  assert.equal(await queue.enqueue('overflow'), false)
  queue.stop()
  assert.equal(await pending, false)
  assert.equal(await queue.enqueue('after-stop'), false)

  releaseActive()
  assert.equal(await active, false)
})
