const alphabet = 'abcdefghijklmnopqrstuvwxyz'

export function * generateNames (): Generator<string, never> {
  for (const letter of alphabet) {
    yield letter
  }
  for (const name of generateNames()) {
    for (const letter of alphabet) {
      yield name + letter
    }
  }
  throw new Error('This should not happen!')
}
