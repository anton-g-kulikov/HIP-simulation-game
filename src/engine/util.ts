export function clamp(value: number, min: number, max: number): number {
  return value < min ? min : value > max ? max : value
}

export function sum(values: readonly number[]): number {
  return values.reduce((total, v) => total + v, 0)
}

/** Guard for content-supplied weight maps, which must describe a full distribution. */
export function assertWeightsSumToOne(
  weights: Record<string, number | undefined>,
  what: string,
): void {
  const total = sum(Object.values(weights).filter((w): w is number => w !== undefined))
  if (Math.abs(total - 1) > 1e-6) {
    throw new Error(`${what}: weights must sum to 1, got ${total.toFixed(4)}`)
  }
}
