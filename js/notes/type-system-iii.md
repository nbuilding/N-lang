Theorising about the type system has really helped speed things up.

There remain a few (theoretical, for I haven't yet tested anything) issues and
other things to solve:

- In assignment comparisons, how to compare substituted function type variables.

- Giving too many arguments to a function `[t] str -> t` (encounterable by means
  of function arguments) won't create any errors.

  - For example, the following code:

    ```ts
    let test = [func: [t] str -> t] -> () {
      let value = func("one", "two", "three", "four")
      return ()
    }
    ```

    Other than the number of function arguments, there's no other error here.
    However, after passing `"one"` (a `str`) into `func` (a `[t] str -> t`), the
    function type variable `t` will be resolved to unknown, so the return type
    is unknown. This is typical.

    However, the type checker assumes that unknown probably was due to some
    other type error (even though there is none), and so when dealing with the
    second argument, because the accumulated function (by currying) type is
    unknown, it simply stops. Normally had the function type been some other
    non-function type, it'd raise an error about how there's too many arguments
    being passed in. However, because the function type is unknown, these errors
    are suppressed. Without any errors, this program would be allowed to be
    handed over to the compile step, causing an error during runtime. Unsound!

    Note that a very similar scenario, `str -> someUndefinedType`, will result
    in a similar situation, but because `someUndefinedType` should've created an
    error earlier on, the unsound problem won't happen.

  - The solution might not be too revolutionary. The difference between `[t] str
    -> t` and `str -> someUndefinedType` is that the latter case becomes `str ->
    unknown`, while the former case still retains its non-unknown type (before
    the comparison).

    Thus, the error about there being too many arguments being given should be created before any assignment comparisons. If it encounters an unknown, there's no need to create an error, like before, because this unknown type (probably) is due to some other type error.

  - Or could it have been from another function type variable resolution in an
    outer function? Like `[t] str -> (str -> t)`. But once you see it that way,
    it's fairly obvious, at least for this specific example, that it won't cause
    any trouble: it just simplifies to `[t] str -> str -> t`, which can be
    detected by the solution I just proposed.

- Module types (from `import` and `imp`).

  - These are record-like and named type-like. In the former case, they have
    fields, and in the latter case, they can only be compared by type spec.
    There's no way to comprehensively get all the fields of a module type, and a
    module type is never equal to an ordinary record type. The import types from
    two files with the same exports will not be equal.

  - They also have the special property of being able to contain other types.

  - Maybe we should call these import types instead.

- Class types.

  - Class types are like aliases for records. In fact, they might as well be.
    They're just a function that returns a record. IIRC the Python branch
    doesn't do anything fancy like it does for modules.

- Storing type names.

  - It's a bit awkward to be maintaining type variable names when they're meant
    to be ignored when displaying errors.

  - There also needs to be a way to store native types and where user-created
    types were declared in case they share the same name.

  - The number type has been converted into a union type, but it doesn't have
    name. I guess that's fine, though, since it's a bit confusing to see
    `number` without being able to use it. `int or float` suffices.
