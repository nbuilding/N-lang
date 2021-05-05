# Thoughts on the type system

## Types of types

- named types, which can take type variables
  - native named types, like `int` and `str`
  - native named types with type variables, like `list[t]`
  - native and user-defined enums, like `maybe[t]` and `result[o, e]`
  - aliased types
  - type variables themselves, such as inside a function expression, enum/type
    alias declaration, and function type expression
- unit type (which could be considered a named type with name `()`)
- tuples and records
- function types, which can also contain type variables
- imported module type, which is record-like but can also contain exported types
  inside it

We might also have types like `number`, which can either be `int` or `float`.
Either it could be usable as both or it'll be resolved to one and then cannot be
switched in the future.

There could also be a never type if an expression returns.

```ts
let wow = 3
let a: int = wow

// Should this be allowed?
let b: float = wow
```

### Unknown types

We might also have truly unknown types. This might arise from two scenarios:

- Named types with type variables that cannot determine the types of those type
  variables. For example, an empty list `[]` or an enum variant like `none`.
  These could become `list[unknown]` and `maybe[unknown]`, respectively

  Similarly, I'm not sure if we should resolve an unknown value once or allow it
  to be used wherever.

  ```ts
  let wow = []
  let a: list[str] = wow

  // Should this be allowed?
  let b: list[bool] = wow
  ```

  There's also a question of how these types should be displayed in error
  messages.

- Function types from function expressions with inferred type annotations.
  Currently, this is not actually a feature in N. However, for these unknown
  types, they probably shouldn't be able to accept any value.

  ```ts
  let myFunc = [arg] -> {
    // We could probably also figure out here that `arg` is float -> str
    return floatInBase10(arg)
  }

  // myFunc is therefore float -> str
  let wow: str = myFunc(2.3)
  ```

  However, resolving these unknowns might be a bit difficult if we want useful
  error messages. If we just resolve types based on its first use, then the
  error messages would be a bit confusing.

  ```ts
  let myFunc = [arg] -> {
    // Type checking of function body is deferred because it may (and here,
    // does) use variables defined later.
    // After finishing the statements in this block, this function body is
    // checked, and since `myFunc` is resolved to be str -> int, type errors are
    // thrown here about how `wow` takes a float and whatnot.
    return wow(arg)
  }
  let wow = floatInBase10

  // A naïve unknown-type resolution thing might thus incorrectly resolve
  // `myFunc` as str -> int here
  let misuse: int = myFunc("str")

  // Thus resulting in type errors for what should be correct
  let correct: str = myFunc(3.14)
  ```

  Okay, I guess because this isn't a feature in N, there's no reason to prepare
  for such a feature.

In that case, if unknown types can only occur for named types, this simplifies
things greatly.

There are also cases like

```ts
for wow in [] {
  // What type is wow?
}
```

I think these should be considered errors since everything is pure so we know
that this for loop won't ever be run.

Also, how about

```ts
let list = [] // list : list[?]

var list = ['hi']
```

Suddenly, `list`'s type has changed, which normally `var` can't do if we're not
resolving unknown types. This also is a problem for the number type.

```ts
let num = 3

var num = 3.4
```

Fortunately, the JS branch views `var` as fairly undefined behaviour, so we are
free to wreck havoc on this by perhaps requiring type annotations or throwing a
type error when using `var` in these situations.

## How types are used

- calling functions: Given a function type and the type of the argument, it
  should try to determine the return type.

  - should resolve ONLY the type variables of the function
    - the function and argument type may contain inner function types with their
      own type variables that need to be intelligently compared
  - `str -> str` where the argument expects `[a] a -> a` is not acceptable
  - `[a] a -> a` where the argument expects `str -> str` is acceptable
  - Question: What if I pass a `list[unknown]` into a function `[t] list[t] -> list[t] -> list[t]`? What if I pass two `list[unknown]`s? What should `t` be
    resolved to?
    - Probably another unknown, and when it encounters a non-unknown, `t` is
      re-resolved to the non-unknown type. The same goes for the never type, and
      similarly for the number type if the non-number type is int or float.

- assigning to variables: If the type annotation is given (with `var`, this is
  just the type of the variable), then it should be compared with the type of
  the variable value to be set.

  - fairly similar to calling functions
  - does not resolve type variables
  - no return type
  - so `str -> str` is not assignable to `[a] a -> a`

- operations: Operations are type checked like functions, with two arguments for
  the left and right expression. There are a list of possible types for a given
  operation, such as `int -> int -> int` and `float -> float -> float`.

  - can also have type variables to be resolved (eg `[t] list[t] -> list[t] -> list[t]`)
  - should be fairly pure because if one match fails, it'll try the next
    function (ie don't resolve unknown types)
    - This is another complication of using unknown types since operators cannot
      resolve unknown types very well
  - has a return type
  - because there are multiple possible operation types, error messages will be
    more vague (eg "cannot add a bool and a bool")
  - might also have to define operations for the number type

- if/else expression branches: Given the types of either branch of an if/else, it should try to compare them.
  - could also be used for match expressions and list literals
  - unlike assigning to variables, this is symmetrical:
    - if one branch is `str -> str`, and the other is `[a] a -> a`, then the
      if/else expression's return type is `str -> str`
  - return type should be the intersection between the branches' types
    - if one branch returns never, use the other branch
  - `list[unknown]` and `list[str]` can become `list[str]`
  - also used for types of items of list literals

## Type errors

Here might be how we display type errors in N.

For _calling functions_ and _assigning to variables_, we can display the value
type (eg the type of the argument being passed in or the value that the variable
will be set to), then point out what types need to change.

```
Error: The value that you gave to this function are not the type of value that
the function wants.

--> whatever.n:3:4
# | ...

Here is the type of the value you gave to this function:

{
  a: (
    int,
    str,
    ^^^ This should be a float. You can convert a string to a float using
    `parseFloat`.
  )
  b: list[
    bool,
    ^^^^ This should be a str.
  ]
  c: maybe[int]
     ^^^^^^^^^^ This should be a list[()].
  d: str -> str
     ^^^^^^^^^^ This function is too specific. It should be able to handle any
     value, not just str.
  e: int -> MyClass
            ^^^^^^^ This should be a myAlias.
  ...
}
```

You can see how it "explodes" type annotations so it can insert specific errors
and tips inline.

Question: Should there be a way to indicate that an alias was expanded?

```
Error: The type of the value you set `billy` to does not match the variable's
type annotation.

--> whatever.n:3:4
# | ...

Here is the type of the value you set `billy` to:

(
  list[...],
  list[...],
  ^^^^^^^^^ This should be a maybe[bool].
  list[number],
       ^^^^^^ This should be a str. You can convert an int to a str using
       `intToBase10`.
)
```

For _operations_, the error messages are relatively vague.

```
Error: I don't know how to perform (+) between a list[str] and a list[bool].

--> whatever.n:3:4
# | ...
```

For _if/else expression branches_, there is also a diff between the types.

```
Error: The two branches of this if/else expression do not have the same type, so
I don't know what its return type should be.

--> whatever.n:3:4
# | ...

This is the type of the first branch and how it differs from the second branch:

bool -> str -> str
               ^^^ The second branch has a int here instead. You can convert an
               int into a str using `parseInt`.
```

### Displaying types

With the `^^^` parts removed, the displayed type should be a syntactically valid
type annotation.

Unknown types, such as from an empty list, should appear as `...`. Example:
`list[...]`.

For record types only, irrelevant keys can be omitted with a `...`.

It should be fine if `number` and `never` show up in type errors.

In N, it is possible for native types to be overwritten thanks to scoping rules.

```ts
alias list[t] = (t, t)

let wow: list[int] = [1]
```

We should namespace duplicate names somehow.

```
<native>.list[int]
^^^^^^^^^^^^^^^^^^ This should be a list[int].

importName.coolAlias
^^^^^^^^^^^^^^^^^^^^ This should be a importName.coolAlias2.

imp "./alternative-maybe.n".maybe[float]
                                  ^^^^^ This should be a bool.
```

This means that named types also need to keep track of the import names etc.,
and when displaying errors, it needs to be aware of the type and variable names
in the scope.

It's worth noting, of course, that alias names should be kept intact unless
there's a structural difference inside the alias.
