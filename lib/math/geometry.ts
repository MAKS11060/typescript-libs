export interface Point {
  clientX: number
  clientY: number
}

export function getDistance(a: Point, b?: Point): number {
  if (!b) return 0
  return Math.sqrt((b.clientX - a.clientX) ** 2 + (b.clientY - a.clientY) ** 2)
}

export function getMidpoint(a: Point, b?: Point): Point {
  if (!b) return a
  return {
    clientX: (a.clientX + b.clientX) / 2,
    clientY: (a.clientY + b.clientY) / 2,
    // clientX: (a.clientX + b.clientX) * 0.5,
    // clientY: (a.clientY + b.clientY) * 0.5,
  }
}
