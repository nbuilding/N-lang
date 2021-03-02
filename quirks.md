Since we have released N 1,
we must maintain backwards compatibility
in minor releases.
This has resulted in poor decisions
that must be kept in the language
until the next major release of N.
The following list documents these quirks
that will likely be removed.

- `imp filename` has been changed to `imp "filename.n"`
to allow for import paths to other folders.

- The `for i 10` syntax has been deprecated
in favour of the `for (i in range(0, 10, 1))` syntax.
The old syntax only allowed an integer literal.

- Integer exponentiation returns a float
because negative powers could result in a non-integer
(this is a bug in Elm),
but this is inconsistent with integer division,
which truncates towards zero.
This will likely be changed in the future
to an int.

- Record aliases now declare a constructor function,
which was not the case,
so the type checker won't stop you from having a function
with the same name already defined.

  - **BUG**: Declaring a variable
  with the same name as an alias
  will now raise an error.
