/**
 * Seeded pseudo-randomness (ADR-003).
 *
 * The entire simulation draws from one stream per campaign so that
 * `(seed, profileId, allocationLog)` reproduces a campaign exactly. `cursor()`
 * counts draws taken; passing it back to `createRng` fast-forwards to that
 * position, which is how a saved campaign resumes mid-stream.
 *
 * Reordering draws in engine code changes every historical campaign, so draw
 * order is effectively part of the save format.
 */

export type Rng = {
  /** Uniform in [0, 1). */
  next(): number
  /** Uniform integer in [min, max], both inclusive. */
  int(min: number, max: number): number
  /** Normal deviate. Consumes two draws. */
  normal(mean: number, sd: number): number
  /** True with probability p. */
  bool(p: number): boolean
  /** Weighted choice. Throws on an empty list or non-positive total weight. */
  pick<T>(items: readonly T[], weight: (item: T) => number): T
  /** Number of draws taken so far. */
  cursor(): number
}

function mulberry32(seed: number): () => number {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export function createRng(seed: number, cursor = 0): Rng {
  const draw = mulberry32(seed)
  let count = 0

  const next = (): number => {
    count++
    return draw()
  }

  for (let i = 0; i < cursor; i++) next()

  return {
    next,
    cursor: () => count,

    int(min, max) {
      if (max < min) throw new Error(`rng.int: max (${max}) is below min (${min})`)
      return min + Math.floor(next() * (max - min + 1))
    },

    normal(mean, sd) {
      // Box–Muller. The second deviate is discarded rather than cached: caching
      // would put state outside the cursor and break restore-from-save.
      const u1 = 1 - next()
      const u2 = next()
      const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2)
      return mean + z * sd
    },

    bool(p) {
      return next() < p
    },

    pick(items, weight) {
      if (items.length === 0) throw new Error('rng.pick: cannot pick from an empty list')

      let total = 0
      for (const item of items) {
        const w = weight(item)
        if (w < 0) throw new Error('rng.pick: negative weight')
        total += w
      }
      if (total <= 0) throw new Error('rng.pick: total weight must be positive')

      let target = next() * total
      for (const item of items) {
        target -= weight(item)
        if (target < 0) return item
      }
      // Only reachable through floating-point drift on the final item.
      return items[items.length - 1] as (typeof items)[number]
    },
  }
}
