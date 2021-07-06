export const helpers: Record<string, string[]> = {
  modulo: ['function modulo_n(a, b) {', '  return (a % b + b) % b;', '}'],
  assertValue: [
    'var valueAssertionResults_n = {};',
    'function assertValue_n(valueAssertionId, pass) {',
    '  valueAssertionResults_n[valueAssertionId] = pass;',
    '}',
  ],
}
