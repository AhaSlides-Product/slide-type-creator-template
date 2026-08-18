/**
 * The human-facing name of item `index` (0-based) in a NumberedItem list:
 * "<Label> N" when a label is given, else the bare number. Kept as a pure module
 * (not a binding inside NumberedItem.vue) so the header text and the delete
 * aria-label share one implementation AND it is unit-testable in this repo's
 * `node` vitest env, which has no SFC transform.
 */
export function numberedItemLabel(label: string | undefined, index: number): string {
  const n = index + 1
  return label ? `${label} ${n}` : String(n)
}
