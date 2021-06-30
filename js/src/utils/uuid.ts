let id = 0

export function uniqueId (): string {
  return [
    Date.now().toString(36),
    Math.random()
      .toString(36)
      .slice(2),
    id++,
  ].join('-')
}
