/**
 * Object.fromEntries (because TypeScript is annoying) but with mapFn support
 * since I'm writing this, I might as well
 */
function fromEntries<V, A, B> (
  ...args:
    | [Iterable<[string, V]>]
    | [Iterable<[A, B]>, (key: A, value: B) => [string, V]]
): Record<string, V> {
  const object: Record<string, V> = {}
  if (args.length === 1) {
    const [entries] = args
    for (const [key, value] of entries) {
      object[key] = value
    }
  } else {
    const [entries, mapFn] = args
    for (const [key, value] of entries) {
      const [newKey, newValue] = mapFn(key, value)
      object[newKey] = newValue
    }
  }
  return object
}
