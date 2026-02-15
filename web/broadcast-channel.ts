interface BroadcastChannelTypedEventMap<T = unknown> {
  message: MessageEvent<T>
  messageerror: MessageEvent
}

/**
 * @example
 * ```ts
 * type BcType =
 *  | {type: 'req'}
 *  | {type: 'res'; value: number}
 *
 * const bc1 = new BroadcastChannelTyped<BcType>('bc-1')
 * ```
 *
 * [MDN Reference](https://developer.mozilla.org/docs/Web/API/BroadcastChannel)
 */
export class BroadcastChannelTyped<T extends unknown> extends BroadcastChannel {
  override set onmessage(handler: ((this: BroadcastChannel, ev: MessageEvent<T>) => any) | null) {
    super.onmessage = handler
  }

  override postMessage(message: T): void {
    super.postMessage(message)
  }

  override addEventListener<K extends keyof BroadcastChannelTypedEventMap<T>>(
    ...args: [
      type: K,
      listener: (this: BroadcastChannel, ev: BroadcastChannelTypedEventMap<T>[K]) => any,
      options?: boolean | AddEventListenerOptions,
    ]
  ): void {
    super.addEventListener(...args)
  }

  override removeEventListener<K extends keyof BroadcastChannelTypedEventMap<T>>(
    ...args: [
      type: K,
      listener: (this: BroadcastChannel, ev: BroadcastChannelTypedEventMap<T>[K]) => any,
      options?: boolean | EventListenerOptions,
    ]
  ): void {
    super.removeEventListener(...args)
  }
}
