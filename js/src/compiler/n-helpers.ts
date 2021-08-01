export const helperNames = {
  /**
   * Polyfill for Python's modulo (%) operator instead of JS's remainder
   * operator.
   *
   * Takes two numbers and returns a number.
   */
  modulo: 'modulo_n',

  /**
   * For `assert value` to keep track of value assertion results.
   *
   * Takes a number (the value assertion ID) and a boolean.
   */
  assertValue: 'assertValue_n',

  /**
   * A function that does nothing.
   */
  noop: 'noop_n',
}

export const helpers: Record<string, string[]> = {
  modulo: [
    `function ${helperNames.modulo}(a, b) {`,
    '  return (a % b + b) % b;',
    '}',
  ],
  assertValue: [
    'var valueAssertionResults_n = {};',
    `function ${helperNames.assertValue}(valueAssertionId, pass) {`,
    '  valueAssertionResults_n[valueAssertionId] = pass;',
    '}',
  ],
  noop: [`function ${helperNames.noop}() {}`],
}
