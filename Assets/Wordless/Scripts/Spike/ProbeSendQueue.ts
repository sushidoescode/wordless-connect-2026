interface PendingSend<T> {
  value: T
  resolve: (sent: boolean) => void
}

export class ProbeSendQueue<T> {
  private readonly pending: PendingSend<T>[] = []
  private readonly sender: (value: T) => Promise<boolean>
  private readonly capacity: number
  private running = false
  private stopped = false

  constructor(
    sender: (value: T) => Promise<boolean>,
    capacity: number = 8,
  ) {
    if (!Number.isInteger(capacity) || capacity < 1) {
      throw new Error('ProbeSendQueue capacity must be a positive integer')
    }
    this.sender = sender
    this.capacity = capacity
  }

  enqueue(value: T): Promise<boolean> {
    const depth = this.pending.length + (this.running ? 1 : 0)
    if (this.stopped || depth >= this.capacity) {
      return Promise.resolve(false)
    }

    return new Promise((resolve) => {
      this.pending.push({ value, resolve })
      void this.drain()
    })
  }

  stop(): void {
    if (this.stopped) return
    this.stopped = true

    const rejected = this.pending.splice(0)
    for (const item of rejected) item.resolve(false)
  }

  private async drain(): Promise<void> {
    if (this.running || this.stopped) return
    this.running = true

    try {
      while (!this.stopped) {
        const item = this.pending.shift()
        if (!item) return

        let sent = false
        try {
          sent = await this.sender(item.value)
        }
        catch {
          sent = false
        }

        if (this.stopped || !sent) {
          item.resolve(false)
          this.stop()
          return
        }

        item.resolve(true)
      }
    }
    finally {
      this.running = false
    }
  }
}
