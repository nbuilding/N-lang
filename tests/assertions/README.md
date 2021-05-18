# N assertion test suite

The `assertions` folder aims to test every single edge case to ensure:

- No unsound programs pass

- Parity between different N implementations

- No "surprises"

- Functions return proper values

Each N file should

1. parse correctly

2. type check successfully

  - Note that this makes use of the `assert type` statement, which should raise
    a type error if the expression and type are incompatible.

3. pass `assert value` statements successfully

  - This makes use of the `assert value` statement, which when run in testing
    mode (i.e. for these tests) should be executed at least once and be given
    `true`.

  - If an `assert value` statement is never executed, the test fails.

  - If the `assert value` statement is given `false`, the test fails.

  - `assert value` should only be given a bool, but this should be enforced by
    the type checker in step 2.
