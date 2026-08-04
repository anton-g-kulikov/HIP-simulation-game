import { describe, it, expect } from 'vitest'
import { createRng } from '@engine/rng'

// Test intent: test/test-documentation.md, M1 §rng.ts (cases 1.1–1.8)

describe('rng', () => {
  it('1.1 produces an identical sequence for the same seed', () => {
    const a = createRng(12345)
    const b = createRng(12345)
    const seqA = Array.from({ length: 50 }, () => a.next())
    const seqB = Array.from({ length: 50 }, () => b.next())
    expect(seqA).toEqual(seqB)
  })

  it('1.2 diverges for different seeds within the first ten draws', () => {
    const a = createRng(1)
    const b = createRng(2)
    const seqA = Array.from({ length: 10 }, () => a.next())
    const seqB = Array.from({ length: 10 }, () => b.next())
    expect(seqA).not.toEqual(seqB)
  })

  it('1.3 keeps every draw within [0, 1)', () => {
    const rng = createRng(99)
    for (let i = 0; i < 10_000; i++) {
      const v = rng.next()
      expect(v).toBeGreaterThanOrEqual(0)
      expect(v).toBeLessThan(1)
    }
  })

  it('1.4 restores the remaining sequence from a serialised cursor', () => {
    const original = createRng(777)
    for (let i = 0; i < 37; i++) original.next()

    const cursor = original.cursor()
    const remaining = Array.from({ length: 20 }, () => original.next())

    const restored = createRng(777, cursor)
    const replayed = Array.from({ length: 20 }, () => restored.next())

    expect(replayed).toEqual(remaining)
  })

  it('1.5 draws integers inclusive of both bounds and nothing outside', () => {
    const rng = createRng(4242)
    const seen = new Set<number>()
    for (let i = 0; i < 5_000; i++) {
      const v = rng.int(3, 7)
      expect(Number.isInteger(v)).toBe(true)
      expect(v).toBeGreaterThanOrEqual(3)
      expect(v).toBeLessThanOrEqual(7)
      seen.add(v)
    }
    expect(seen).toEqual(new Set([3, 4, 5, 6, 7]))
  })

  it('1.6 draws a normal distribution with the requested mean and sd', () => {
    const rng = createRng(31337)
    const n = 20_000
    const samples = Array.from({ length: n }, () => rng.normal(0.5, 0.18))
    const mean = samples.reduce((s, v) => s + v, 0) / n
    const variance = samples.reduce((s, v) => s + (v - mean) ** 2, 0) / n

    expect(mean).toBeCloseTo(0.5, 2)
    expect(Math.sqrt(variance)).toBeCloseTo(0.18, 2)
  })

  it('1.7 respects weights in a weighted pick', () => {
    const rng = createRng(555)
    const items = [
      { id: 'heavy', w: 3 },
      { id: 'light', w: 1 },
    ]
    let heavy = 0
    const n = 10_000
    for (let i = 0; i < n; i++) {
      if (rng.pick(items, (it) => it.w).id === 'heavy') heavy++
    }
    // 3:1 weighting → ~0.75
    expect(heavy / n).toBeGreaterThan(0.72)
    expect(heavy / n).toBeLessThan(0.78)
  })

  it('1.8 throws on an empty or zero-weight pick rather than returning undefined', () => {
    const rng = createRng(1)
    expect(() => rng.pick([], () => 1)).toThrow(/empty/i)
    expect(() => rng.pick([{ w: 0 }, { w: 0 }], (it) => it.w)).toThrow(/weight/i)
  })

  it('bool respects its probability', () => {
    const rng = createRng(8)
    let hits = 0
    const n = 10_000
    for (let i = 0; i < n; i++) if (rng.bool(0.3)) hits++
    expect(hits / n).toBeGreaterThan(0.28)
    expect(hits / n).toBeLessThan(0.32)
  })
})
