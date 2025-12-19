export function clamp(val: number, min: number, max: number) {
  return Math.max(min, Math.min(max, val))
}

export function toPercent(value: number, min: number, max: number) {
  if (min === max) return 0 // Avoid division by zero if the range is zero
  return ((value - min) / (max - min)) * 100
}
