/**
 * Whether the two arrays have the same set of items. Duplicates are ignored.
 * Items are compared by reference (===).
 */
export function haveSameItems<T> (a: T[], b: T[]): boolean {
  const set = new Set(a)
  for (const item of b) {
    if (!set.delete(item)) {
      return false
    }
  }
  return true
}
