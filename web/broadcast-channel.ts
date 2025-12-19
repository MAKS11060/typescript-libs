interface BroadcastChannelTypedEventMap<T = unknown> {
  message: MessageEvent<T>
  messageerror: MessageEvent
}

/** [MDN Reference](https://developer.mozilla.org/docs/Web/API/BroadcastChannel) */
export class BroadcastChannelTyped<T extends unknown> extends BroadcastChannel {
  constructor(name: string) {
    super(name)
  }

  override set onmessage(handler: ((this: BroadcastChannel, ev: MessageEvent<T>) => any) | null) {
    super.onmessage = handler
  }

  override postMessage(message: T): void {
    super.postMessage(message)
  }

  override addEventListener<K extends keyof BroadcastChannelTypedEventMap<T>>(
    type: K,
    listener: (this: BroadcastChannel, ev: BroadcastChannelTypedEventMap<T>[K]) => any,
    options?: boolean | AddEventListenerOptions,
  ): void {
    super.addEventListener(type, listener, options)
  }

  override removeEventListener<K extends keyof BroadcastChannelTypedEventMap<T>>(
    type: K,
    listener: (this: BroadcastChannel, ev: BroadcastChannelTypedEventMap<T>[K]) => any,
    options?: boolean | EventListenerOptions,
  ): void {
    super.removeEventListener(type, listener, options)
  }
}
