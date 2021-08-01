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
   * A helper function for determining if two objects are deeply equal.
   */
  deepEqual: 'deepEqual_n',
}

export const helpers: Record<string, string[]> = {
  modulo: [
    `function ${helperNames.modulo}(a, b) {`,
    '  return (a % b + b) % b;',
    '}',
  ],
  assertValue: [
    `function ${helperNames.assertValue}(valueAssertionId, pass) {`,
    '  valueAssertionResults_n[valueAssertionId] = pass;',
    '}',
  ],
  deepEqual: [
    `function ${helperNames.deepEqual}(a, b) {`,
    '  return false;',
    '}',
  ],
}
