/** Storage for oauth `state` */
export interface OAuth2StateStorage<T = string> {
  generator?(): T | Promise<T>
  set(state: T, data: StateData): string | Promise<string>
  get(state: string): StateData | Promise<StateData>
}

export interface StateData {
  /** OAuth2 provider name */
  service: string
  /** Subject */
  sub?: string
}
