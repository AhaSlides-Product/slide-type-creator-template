// Pure helpers for NumberWithUnit — extracted so the cap / step / clamp rules
// can be unit-tested in the node vitest env (the SFC itself needs a DOM the
// suite doesn't mount). The component composes these; keep the two in agreement.

/**
 * Digits only, capped to `maxDigits`. A 5th keystroke or a pasted longer value
 * is dropped rather than accepted — the field never shows or stores more than
 * `maxDigits` characters. Non-digits (spaces, minus, letters) are stripped.
 */
export function sanitizeDigits(raw: string, maxDigits: number): string {
  return raw.replace(/\D/g, '').slice(0, Math.max(0, maxDigits))
}

/** Clamp `v` into [min, max], applying only the bounds that are defined. */
export function clampToRange(v: number, min?: number, max?: number): number {
  let n = v
  if (min !== undefined) n = Math.max(min, n)
  if (max !== undefined) n = Math.min(max, n)
  return n
}

/**
 * The value after an arrow press. `delta` is +step (up) or -step (down). From
 * an empty field both arrows land on `min` — matching the approved mock, where
 * an empty value is treated as `min` for stepping.
 */
export function stepValue(
  current: number | undefined,
  delta: number,
  step: number,
  min?: number,
  max?: number,
): number {
  const fallbackMin = min ?? 0
  const base = current ?? (delta > 0 ? fallbackMin - step : fallbackMin + step)
  return clampToRange(base + delta, min, max)
}

/**
 * Whether the ▲ arrow is disabled (value at or above max). An empty field is
 * treated as `min`, so ▲ stays enabled at rest.
 */
export function atMax(value: number | undefined, min?: number, max?: number): boolean {
  if (max === undefined) return false
  return (value ?? min ?? -Infinity) >= max
}

/**
 * Whether the ▼ arrow is disabled (value at or below min). An empty field is
 * treated as `min`, so ▼ is disabled at rest.
 */
export function atMin(value: number | undefined, min?: number): boolean {
  if (min === undefined) return false
  return (value ?? min) <= min
}

/**
 * Whether the field shows its error styling. Both an explicit `invalid` flag and
 * a non-empty `errorMessage` trigger the red border + ring; `errorMessage` also
 * renders the reason line below the field.
 */
export function showError(invalid: boolean, errorMessage?: string): boolean {
  return invalid || !!errorMessage
}
