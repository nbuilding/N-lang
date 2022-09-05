/**
 * Object.fromEntries (because TypeScript is annoying) but with mapFn support
 * since I'm writing this, I might as well
 */
export function fromEntries<V>(
  iterable: Iterable<[string, V]>,
): Record<string, V>;
export function fromEntries<V, Tuple extends [any, ...any[]]>(
  iterable: Iterable<Tuple>,
  mapFn: (...args: Tuple) => [string, V],
): Record<string, V>;
export function fromEntries<V, Tuple extends [any, ...any[]]>(
  iterable: Iterable<Tuple>,
  mapFn?: (...args: Tuple) => [string, V],
): Record<string, V> {
  const object: Record<string, V> = {};
  if (mapFn) {
    for (const tuple of iterable) {
      const [newKey, newValue] = mapFn(...tuple);
      object[newKey] = newValue;
    }
  } else {
    for (const [key, value] of iterable) {
      object[key] = value;
    }
  }
  return object;
}
