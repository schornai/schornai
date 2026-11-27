/** Waiting jobs retain their coordinator lease and reacquire capacity before resuming. */
export class WorkerSlots extends EventTarget {
  #occupied = 0;
  #resuming: Array<() => void> = [];
  readonly capacity: number;
  constructor(capacity: number) {
    super();
    this.capacity = capacity;
  }
  get occupied() {
    return this.#occupied;
  }
  tryAcquire() {
    if (this.#occupied >= this.capacity) return false;
    this.#occupied++;
    return true;
  }
  release() {
    const resume = this.#resuming.shift();
    if (resume) resume();
    else this.#occupied--;
    this.dispatchEvent(new Event("release"));
  }
  async whileWaiting<T>(operation: () => Promise<T>): Promise<T> {
    this.release();
    try {
      return await operation();
    } finally {
      if (!this.tryAcquire())
        await new Promise<void>((resolve) => this.#resuming.push(resolve));
    }
  }
}
