export function areArraysEqual<T> (a: T[], b: T[]): boolean {
  return a.length === b.length && a.every((item, i) => item === b[i])
}
