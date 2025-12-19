#!/usr/bin/env -S deno bench --watch

import {Point} from './geometry.ts'

const createGroup = (group: string) => {
  return (name: string) => {
    return {name, group} as Deno.BenchDefinition
  }
}

//
export function getDistance(a: Point, b?: Point): number {
  if (!b) return 0
  return Math.sqrt((b.clientX - a.clientX) ** 2 + (b.clientY - a.clientY) ** 2)
}

export function getDistanceAlt(a: Point, b?: Point): number {
  if (!b) return 0
  return Math.sqrt(
    (b.clientX - a.clientX) * (b.clientX - a.clientX) +
      (b.clientY - a.clientY) * (b.clientY - a.clientY),
  )
}

const getDistanceBench = createGroup('distance')

Deno.bench(getDistanceBench('getDistance'), () => {
  const a: Point = {clientX: 100, clientY: 600}
  const b: Point = {clientX: 745, clientY: 2421}
  for (let i = 0; i < 10_000_000; i++) {
    getDistance(a, b)
  }
})

Deno.bench(getDistanceBench('getDistanceAlt'), () => {
  const a: Point = {clientX: 100, clientY: 600}
  const b: Point = {clientX: 745, clientY: 2421}
  for (let i = 0; i < 10_000_000; i++) {
    getDistanceAlt(a, b)
  }
})

//
export function getMidpoint(a: Point, b?: Point): Point {
  if (!b) return a

  return {
    clientX: (a.clientX + b.clientX) * 0.5,
    clientY: (a.clientY + b.clientY) * 0.5,
  }
}

export function getMidpointAlt(a: Point, b?: Point): Point {
  if (!b) return a
  return {
    clientX: (a.clientX + b.clientX) / 2,
    clientY: (a.clientY + b.clientY) / 2,
  }
}

const getMidpointBench = createGroup('getMidpoint')

Deno.bench(getMidpointBench('getMidpoint'), () => {
  const a: Point = {clientX: 100, clientY: 600}
  const b: Point = {clientX: 745, clientY: 2421}
  for (let i = 0; i < 10_000_000; i++) {
    getMidpoint(a, b)
  }
})

Deno.bench(getMidpointBench('getMidpointAlt'), () => {
  const a: Point = {clientX: 100, clientY: 600}
  const b: Point = {clientX: 745, clientY: 2421}
  for (let i = 0; i < 10_000_000; i++) {
    getMidpointAlt(a, b)
  }
})
