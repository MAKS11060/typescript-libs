export type MessageEventWithTypedData<T> = Omit<MessageEvent, 'data'> & {data: T}

type BroadcastChannelEventListener<T> = (this: BroadcastChannel, ev: MessageEventWithTypedData<T>) => any

interface BroadcastChannelTypedEventMap<T = unknown> {
  message: MessageEventWithTypedData<T>
  messageerror: MessageEvent
}

/** [MDN Reference](https://developer.mozilla.org/docs/Web/API/BroadcastChannel) */
export class BroadcastChannelTyped<T extends unknown> {
  private bc: BroadcastChannel

  constructor(name: string) {
    this.bc = new BroadcastChannel(name)
    this.bc.dispatchEvent
  }

  set onmessage(handler: BroadcastChannelEventListener<T> | null) {
    if (handler === null) {
      this.bc.onmessage = null
    } else {
      this.bc.onmessage = (event) => {
        handler.call(this.bc, event as MessageEventWithTypedData<T>)
      }
    }
  }

  get onmessage(): BroadcastChannelEventListener<T> | null {
    return this.bc.onmessage as BroadcastChannelEventListener<T> | null
  }

  postMessage(message: T): void {
    this.bc.postMessage(message)
  }

  addEventListener<K extends keyof BroadcastChannelTypedEventMap<T>>(
    type: K,
    listener: (this: BroadcastChannel, ev: BroadcastChannelTypedEventMap<T>[K]) => any,
    options?: boolean | AddEventListenerOptions,
  ): void {
    this.bc.addEventListener(type, listener, options)
  }

  removeEventListener<K extends keyof BroadcastChannelTypedEventMap<T>>(
    type: K,
    listener: (this: BroadcastChannel, ev: BroadcastChannelTypedEventMap<T>[K]) => any,
    options?: boolean | EventListenerOptions,
  ): void {
    this.bc.removeEventListener(type, listener, options)
  }

  close(): void {
    this.bc.close()
  }
}
