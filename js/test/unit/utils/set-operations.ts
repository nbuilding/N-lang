// Currently unused
export function intersection<T> (a: Iterable<T>, b: Iterable<T>): Set<T> {
  const result: Set<T> = new Set()
  const setB = b instanceof Set ? b : new Set(b)
  for (const item of a) {
    if (setB.has(item)) {
      result.add(item)
    }
  }
  return result
}

export function isSubset<T> (
  subset: Iterable<T>,
  superset: Iterable<T>,
): boolean {
  const set = superset instanceof Set ? superset : new Set(superset)
  for (const item of subset) {
    if (!set.has(item)) {
      return false
    }
  }
  return true
}

export function difference<T> (
  a: Iterable<T>,
  b: Iterable<T>,
): [Set<T>, Set<T>] {
  const aNoB = new Set(a)
  for (const item of b) {
    aNoB.delete(item)
  }
  const bNoA = new Set(b)
  for (const item of a) {
    bNoA.delete(item)
  }
  return [aNoB, bNoA]
}
