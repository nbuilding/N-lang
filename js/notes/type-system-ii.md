# Type system II

Clarifying my thoughts on the type system and suggesting a less vague
implementation for it.

## Types of types

Here, I should explain an overview of how each type of type could be represented
in JS.

### Named types

Named types are like a catch-all building block for the type system. I suppose
with type variables, these could technically also replace the other types.

- built-in types, such as `int` and `maybe[t]`
- enums
- aliases
- the unit type `()`
- type variables when used in a function expression or type declaration

Named types should be compared *by reference* based on their spec. For example,
two instances of the type `maybe[str]` may not `===` each other in memory, but
because they're both `maybe`s, they could have a base form that would remain
identical for every instance of `maybe`. The current implementation calls this
the **type spec**.

Aliases are slightly different. It should first compare the **alias spec**, but
if there's no match (or one isn't an alias), then it should break down the
aliases and compare again.

Named types are the only types that depend on the types available in scope in
type annotations. Scopes should store type specs separate from the variables.

Named types also keep track of their names *and* where they were declared. This
way, if there are multiple types named `maybe` in scope, type errors can
distinguish between them. **TODO**: How should this be stored/implemented?

In summary, *type instances* need to have:

- type spec
- type variable values

and *type specs* need to have:

- name
- place of declaration
- number of type variables

Here's how named types behave when compared in each context, ignoring function
type variables and aliases:

- *calling functions*, *operations*: Type specs must match by `===`.
  - Function type variables *of the function being called* will populate
    substitution maps (type spec => other type). If a substitution is available,
    the substitution will be used for the comparison.
- *assigning to variables*: As above, but there's
  no function being called.
- *if/else expression branches*: As above; it should return an instance of the
  branches' type spec.

The contained type variable types should also be compared the same way.

#### Type variables

Type variables specifically have a feature allowing them to be substituted. This
is used for function type variable resolution and creating constructor types for
enums.

Now that type variables are like other named types, substitution maps should map
*type specs* (rather than type instances) to resolved types.

Function type variable *specs* should keep a reference to their parent function.
Type variables in type (enum or alias) declarations and function expressions
just have normal named type specs, like `int` and `str`.

Comparing function type variables in functions that aren't being called (eg `[a]
a -> a` vs `[b] b -> b`) are more complicated, especially as it demonstrates a
case of asymmetry for most of the comparison methods:

Here's how comparison should work (when the function type variable isn't of the
function being called):

annotation type | value type | is this fine?
--- | --- | ---
`[a] a -> a` | `[b] b -> b` | yes
`str -> str` | `[a] a -> a` | yes
`[a] a -> a` | `str -> str` | no, `str -> str` is not generic enough
`[a] a -> a` | `[a, b] a -> b` | yes
`[a, b] a -> b` | `[a] a -> a` | no, not generic enough
`[a] { hello: a } -> { hello: a }` | `[b] b -> b` | yes

- *calling functions*, *assigning to variables*, *operations*:
  - if the annotation type is a function type variable but the value is not,
    then there's an error about how the given function isn't generic enough (too
    specific)
  - regardless or not of whether the annotation type is a function type
    variable, using the comparison context:
    - if a substitution does not yet exist for this type var, map the value
      type's type var to the annotation type
    - if a substitution does exist, compare the substituted type (which is from
      an annotation type!) with the annotation type:
      - this specific type of comparison can compare function type variables by
        their type specs
    - example: annotation `[a] { hello: a } -> { hello: a } -> { hello: a }`,
      value `[b, c] b -> b -> c`
      1. `b` is mapped to `{ hello: a }`
      2. `b` is already mapped, so `{ hello: a }` is compared with `{ hello: a
        }`. `a` has the same type spec as the other `a`, so they're equal
      3. `c` is mapped to `{ hello: a }`
- *if/else expression branches*:
  - if just one type is a type variable, then map it to the other type
  - if both types are a type variable, then map them both to a new type
    variable, perhaps?
    - first, however, check if their type specs are equal, which can happen
      after substitution
      - and what if they aren't? and it was already after substitution?
      - example: `[a, c] a -> c -> a` and `[b, d] b -> d -> d`
        1. `a` vs `b`: Neither have substitutions, and both are type vars.
          Create a new type spec and a new instance of it `e`. Map `a` to `e`
          and `b` to `e`.
        2. `c` vs `d`: Similarly, a new type var `f` is created, and `c` and `d`
          are mapped to it.
        3. `a` vs `d`: Both have substitutions: `e` and `f`, respectively. A new
          comparison is performed:
          - Without a special case, `e` and `f` are merely more type variables
            without substitutions, so a new type variable would be made, mapping
            `e` and `f` to `g`.
          - This makes sense, though; the intersection of the two original types
            should be `[t] t -> t -> t`; the last type must be the same type as
            the first two
          - Thus, the only thing that I need to change is that the final
            substitution at the end must be recursive; `a` => `e` => `g`.
  - function types, when finished, should substitute its type variables from the
    comparison context if it has any (this should be symmetric, so it doesn't
    matter if it's the one with or without the type variables)
    - don't forget to set the owner of any new type specs to this function
    - remove duplicates
  - if a mapping exists for a type variable, substitute and re-compare
    - if there are two type variables but only one has a mapping, substitute
      first

Do function type variables need names? Ideally not.

#### Enum type specs

For destructuring purposes, enum type specs should know:

- the variant names
- the number of fields
- the types of each of the fields, to determine them given the type variables of
  the value

In cases like as shown below, the type checker should set `value`'s type to
unknown (the type error type) and create a warning that the branch will never
run.

```ts
if let <yes value> = none {
  // value : unknown
}
```

#### Alias types

Because aliases substitute for other types, they may need to be resolved
explicitly. The alias type itself can deal with this in comparisons, but there
are a few situations where the alias type needs to be resolved because there's
no comparison being made:

- determining that a value is a function in function calls
  - though perhaps this is just another operator `[a, b] (a -> b) -> a -> b`
- determining that a function using the `!` operator returns a `cmd`

### Number type

The number type is meant to represent a value that can be used as any number
type: `int`, `float`, or `byte` (if we add a `byte` type).

Number types can match themselves or any number type.

Comparisons:

- *calling functions*, *assigning to variables*, *operations*: As above.
  - Re *operations*: I might define operations specifically for the number type
    so that there doesn't need to be any special handling here.
- *if/else expression branches*: If both branches are numbers, then the return
  type is number. If one branch is a number type, then return that number type.

### Tuples and records

Tuples and records can be represented as Arrays and Maps in JS, containing other
type instances. They don't have type specs because they don't depend on the type
variables in scope.

Comparing tuple and record types are fairly simple; they need to be compared
structurally. This will get more complicated when we add the spread operator to
types.

Note that extra fields will make record types unequal. We might loosen this
restriction in the future.

The comparisons should be symmetric. For *if/else expression branches*, it
should return the combined result of the comparisons in each contained type.

### Functions

Functions could be seen as two-type tuples, but they can contain type variables. Thus, a function type should have:

- a list of function type variable *specs*
- the argument type
- the return type

To compare them:

- *calling functions*, *assigning to variables*, *operations*: Compare the
  argument and return type. I don't think anything else fancy needs to be done.
  Type variables can deal with themselves maturely (see their section).
- *if/else expression branches*: As noted in the function type variable section,
  after comparing the argument and return type, the function type should return
  a new function type with the resolved argument/return types, and also
  substitute the type variables from the comparison context, removing
  duplicates.

### Unknown type

The unknown type should be compatible with any other type:

- *calling functions*, *operations*: The types are equal.
  - If the other type has function type variables for the function being called,
    resolve them as unknowns.
    - These substitutions can be re-resolved if a non-unknown type is found.
  - I'm not sure if the unknown type can show up on the annotation side.
  - For *operations*, at the top level, if any of the operands are unknown,
    return unknown for the operation.
- *assigning to variables*: The types are equal.
- *if/else expression branches*: Return the other type, even if the other type
  is also an unknown.

I think that the never type is the same as the unknown type.

How about for this case? What's the type of `whatever`?

```ts
let whatever = (return 3) + (return 4)
```

Ideally, it'd at least be an unknown type, but with the currently defined
*operations* comparison algorithm defined above, this would likely match
whatever the first possibility is and use that return value.

Maybe if one of operands is an unknown, the entire thing should be unknown? Or
null. Maybe null is better because it may turn out later that the type isn't
addable.

#### Error type

Results from when type errors prevent determination of the return type of
something. It should try to recover as much information as possible; for
example, if a tuple's second item has a type error, then its type could be
`(str, unknown, int)`.

The error type can also result from a bad type annotation, such as an undefined
named type.

Thus, the error type can pretty much be anywhere, in all types of types, and as
both the annotation and value type.

To avoid compounding consecutive type errors resulting from a single type error,
the error type is fairly lenient, and should always be associated with some
type error somewhere.

Because the error type behaves so similarly to the unknown type in comparisons,
the error type is the same as the unknown type.

## Type comparisons

The type of comparisons that may be made between type instances.

### Calling functions

This mostly only has one main use:

- Calling functions

This could borrow code from assigning to variables, with the argument type as
the annotation type, but it also needs to establish a context for resolving
function type variables for determining the return type.

### Assigning to variables

If a user-given type should be a certain type, you can use the *assigning to
variables* comparison. It should be symmetric as long as a function type isn't
on either side.

This is used in a few situations:

- `let` statements with an explicit type annotation
  - generally, any declaration where there's an explicit type annotation and the
    type of the value being assigned; this might also include `if let` and `for`
- `var` statements
- `assert type` where the annotation type is the expected type
- `assert value` and `if` conditions, where the annotation type is `bool`
  - it *probably* doesn't matter whether `bool` is the annotation or value type
    because it should be symmetric when one side is a simple named type
- `return` expressions, where the function return type is the annotation type,
  and the return value is the value type

### Operations

This is used in a few situations:

- binary and unary operations
- `for` loops

I'm not sure what comparison operations should use.

This can use code from *calling functions* because it resolves function type
generics. However, instead of using the generated helpful type error message, if
there's an error, it'll try the next one. There might also be a special case for
unknown types, as noted in the Unknown types section.

### Comparing annotation to annotation or value to value type

There are two scenarios in *assigning to variables* comparisons where types from
the same side are compared:

- In *calling functions*, comparing an already resolved function type variable
  with another type. (Both will be from the value type side.)

  - Are there any type annotations from here though? Must this be symmetric?

- Comparing a resolved function type variable in a function type. (Both will be
  from the annotation type side.)

Type variables in this type of comparison are just compared by their type spec,
like other named types. However, the question is then what happens if there are
other function type variables.

Example: assigning `[a] a -> a` (value) to `[b] b -> b` (annotation). This maps
`a` to `b` in the argument type. Since `a` has already been mapped, `b` is
compared with `b`. Since they have the same type spec, they're equal.

How about assigning `[a] a -> a` (value) to `([b] b -> b) -> ([c] c -> c)`
(annotation)? Or to `(str -> str) -> ([d] d -> d)` (annotation)? In either case, `a` gets mapped to a function, which is then compared with the
return type.

- Assigning to `(str -> str) -> ([d] d -> d)` should fail. `[a] a -> a` should be able to just return whatever it is given, but if it is given `str -> str`

### If/else expression branches

This is used in a few situations:

- `if`/`else` *expression* branches (not statement)
- list literals
- in the future, `match` expression branches

The *if/else expression branches* comparison is a bit unique in that it
determines a common type and returns it. Thus, I'm not sure if it can borrow
code from other comparisons, or if the *assigning to variables* comparison can
borrow *if/else expression branches* comparison code and then discard the
determined type.

## Interface

The current type system implementation is janky, hard to use, and hard to read.

Here's some psuedocode (in JavaScript) for `assert value` to explain how the API
for these type comparisons should work.

```js
const { type: valueType, exitPoint } = context.scope.typeCheck(this.expression)
context.typeErrIfNecessary(
  ErrorType.VALUE_ASSERTION_NOT_BOOL,
  checkAssignable(bool.instance(), valueType)
)
return { exitPoint }
```

or maybe just

```js
return {
  // Returns the exit point
  exitPoint: context.shouldBeAssignableTo(
    // The Expression to type check
    this.expression,
    // A type instance or spec
    bool,
    // Error type to use if there's a type error
    ErrorType.VALUE_ASSERTION_NOT_BOOL
  )
}
```

For `if`/`else` expressions:

```js
const condExit = context.shouldBeAssignableTo(
  this.condition,
  bool,
  ErrorType.CONDITIONAL_NOT_BOOL
)
// Returns resolved type and the first exit point
// If it fails, type is unknown
const { type, firstExitPoint } = context.equalBranches(
  // List of Expressions to type check and compare type instances of
  [this.then, this.else],
  // Error to use if there's no type error
  ErrorType.IF_BRANCH_TYPE_MISMATCH
)
return {
  type,
  exitPoint: condExit || firstExitPoint
}
```

## Errors

How should type errors be represented? Ideally,

- These errors can be serialised and reconstructed

  - We might just slap the type instances in the error directly, but make
    interfaces in the error type definition so that parsing JSON can produce a
    valid error type still

    - This also means types should be IMMUTABLE

    - This also means we can't use any type helper methods

- There should be sufficient information to construct a helpful error message
  (as drafted in [type-system.md](#type-system.md))

- It should be easy for the type comparisons to produce

Here's how the first example could be represented in YAML:

```yml
type: ARGUMENT_TYPE_MISMATCH
diff:
  type: record
  diff:
    a:
      type: tuple
      types:
        - type: type
          name: int
        - type: type
          name: str
          shouldBe:
            type: type
            name: float
          hasIssue: true
      hasIssue: true
    b:
      type: type
      name: list
      vars:
        - type: type
          name: bool
          shouldBe:
            type: type
            name: str
          hasIssue: true
      hasIssue: true
    c:
      type: type
      name: maybe
      vars:
        - type: type
          name: int
      shouldBe:
        type: type
        name: list
        vars:
          - type: unit
      hasIssue: true
    d:
      type: function
      argument:
        type: type
        name: str
        tooSpecific: true
        hasIssue: true
      return:
        type: type
        name: str
        tooSpecific: true
        hasIssue: true
      hasIssue: true
    e:
      type: function
      argument:
        type: type
        name: int
      return:
        type: type
        name: MyClass
        shouldBe:
          type: type
          name: myAlias
        hasIssue: true
      hasIssue: true
    f:
      type: type
      name: char
    g:
      type: type
      name: char
  hasIssue: true
```

There are several issues here:

- How to serialise type specs so that they can be compared by memory?

  - Maybe unique IDs? 😬 This could also allow deserialisation to use existing
    types, and native types could have the IDs hardcoded?

- How to encode names when there are duplicate names?

  - Maybe there can be a separate definitions object for imported types. It
    would use the import path and maybe also the name of the variable it was
    assigned to, if that can be trivially figured out (this should be low
    priority).

  - Perhaps the scope tree could be included as well.

```
// imported.n

export type maybe[t] = <cool t>
```

```
// run.n

let imported = imp "././imported.n"

type maybe[t] = <whatever t>

{
  alias maybe[t] = (t, t, int)
  alias hmm = maybe[int]

  {
    alias int = float

    let value: hmm = (none, whatever, imported.cool)
  }
}
```

Perhaps this should produce the following type error:

```
Error: The type of the value you set `value` to doesn't match the type
annotation you specified.

  --> run.n:10:28
 14 |     let value: maybe[int] = (none, whatever, imported.cool, ())
                                  ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^

Here's the type of the value you set `value` to:

(
  <native>.maybe[...],
  ^^^^^^^^^^^^^^^^^^^ This should be a <native>.int.
  [a] a -> maybe@5:1[a],
  ^^^^^^^^^^^^^^^^^^^^^ This should be a <native>.int.
  [b] b -> imp "././imported.n".maybe[b],
  ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^ This should be a <native>.int.
  ... (1 more item)
  ^^^^^^^^^^^^^^^^^ The tuple should have exactly 3 items.
)
```

## Summary

There are a few types of types:

- Named types, including aliases, the unit type, and type variables
  - The type spec has the name and number of type variables
  - The type instance has a reference to the type spec and the type varaible
    types
- Types that contain other types: tuples, records, and functions
- The number type
- The unknown type
  - Also produced from the return expression

For comparisons, I might italicise a few key words:

- *Assignable* means that it passed and nothing else needs to be done.
- *Should* means that if it fails, there's an error, so return it and don't
  proceed.
- *Compare* means to recursively compare two inner types, perhaps with
  modifications to the comparison context.
- *Combine errors* means to collect errors that occur from the following steps,
  as well as noting whether each type has an error or not.

### *Assigning to variables* comparisons

Also used by *calling functions* and *operations*. Assigning to variables is
*assymmetric*, so there's a distinction between the **annotation type** and the
**value type**.

The comparison context contains the following information, and is passed down
recursive comparison calls:

- The function being called (for the *calling functions* comparison)
- Whether type variables should be compared by type spec

1. Is at least one of the types an unknown type?

    - If the comparison context's function exists, check if the non-unknown type
      has any function type variables for that function.

      - Map each function type variable to unknown.

    - The types are *assignable*.

1. Is the value type an alias type?

    - We do this step early so that the value alias can be resolved.

    - Is the annotation type an alias type with the same alias type spec?

      - Yes: For each type variable:

        - *Compare* the corresponding type variables using *assigning to a
          variable*.

      - No: Resolve the value alias (i.e. determine the type instance it is an
        alias for), then *compare* the annotation type with the resolved value
        type using *assigning to a variable*.

1. Is the value type a function type variable? (And is the comparison context
  not comparing two annotation types?)

    - Note: This can't be a function type variable from the comparison context
      function.

    - Does a substitution exist for this type variable? And is it not the
      unknown type?

      - Yes: *Compare* the annotation type with the type from the substitution
        with the context set to indicate this.

        - This should compare function type variables by type spec.

        - **TODO**: What about other function type variables? And if they're
          from the comparison context function?

      - No: Map the type variable spec to the annotation type in the context.

1. Is the annotation type a function type variable?

    - Is it of the context function (i.e. the function being called)?

      - Yes: Does a substitution for the type variable spec exist in the context
        substitution map?

        - Yes: Compare the substitution with the value type.

          - **TODO**: Compare how? Presumably with the same method as above.

        - No: Map the type variable spec to the value type.

      - No: The types are *not assignable*; the value type is too specific when
        it should be able to handle any value.

1. Is the annotation type a number type?

    - The other type *should* be either a number, int, or float.

1. Is the annotation type a tuple type?

    - The value type *should* be a tuple.

    - *Combine errors*.

    - For each type in the annotation tuple:

      - Does the value tuple have a corresponding type? If not, that's fine:
        just break.

      - *Compare* the annotation type with the corresponding value type using
        *assigning to variables*.

    - The value tuple *should* have the same number of types.

1. Is the annotation type a record type?

    - The value type *should* be a record.

    - *Combine errors*.

    - For each key present in *both* records:

      - *Compare* the corresponding types using *assigning to variables*.

    - The value type *should* not have extra keys.

    - The value type *should* have the missing keys that the annotation type has
      that the value type doesn't.

1. Is the annotation type a function type?

    - The value type *should* be a function.

    - *Combine errors*.

    - *Compare* the argument types using *assigning to variables*.

    - *Compare* the return types using *assigning to variables*.

1. Is the annotation type a named type?

    - Is the annotation type an alias type?

      - Note: If the value type's alias type matched, it would have been matched
        earlier on. Thus, here, the alias types must not match. Alias resolution
        is necessary.

      - Note: Either way, the value type will not be an alias type.

      - Yes: *Compare* the resolved annotation alias using *assigning to
        variables*.

      - No:

        - The value's type spec *should* `===` that of the annotation type.

        - *Combine errors*.

        - For each type variable in each named type:

          - *Compare* the corresponding types using *assigning to variables*.

#### *Calling functions* comparisons

*Calling functions* comparisons are a specialised form of *assigning to
variables* comparisons.

They involve the **function type**, from which the **argument type** and the
**return type** can be derived, as well as the **value type**: the type of the
value being passed into the function as the argument.

1. *Compare* the argument type as the annotation type with the value type using
  *assigning to variables* with the function type instance as the context.

    - This way, function type variables can determine whether they are of this
      function.

    - This should also collect substitutions for its type variables.

2. If there are errors, the return type is unknown. Otherwise, substitute the
  type variables of the function in the return type with substitutions from the
  map, or the unknown type if the substitution doesn't exist (in the case of
  `[t] str -> t`, for example).

#### *Operations* comparisons

*Operations* comparisons are a trial-and-error form of *calling functions*. It
involves a list of function types and tries each one with the given operands
until one succeeds with no errors.

1. If any of the operands is unknown, return unknown.

2. Otherwise, try each function type:

    - Perform the *calling functions* comparison on the operands with each
      function type. If there are no errors, return the return type.

3. If none match without errors, then raise an error and return null.

### *If/else expression branches* comparisons

When dealing with branches for list items or the match expression, the type from
each branch will be given as an array. However, the following algorithm only
handles two types at a time.

The error messages will show a given item compared to the first item in the
list. For example,

```
Here's how it compares with the first item:

str
^^^ The first item has an int here. You can convert a str to an int using
`parseInt >> default 0`.
```

However, because of unknowns, comparing with just the first item of a list may
not be ideal. Thus, items should be compared with the accumulated value.

Here's what the comparison context contains:

- A substitution map between function type variable specs and type *instances*.

**It is implied that an error will make it return unknown.**

1. Is at least one type an unknown?

    - Return the other type.

1. Are both types an alias type? Do their alias specs match?

    - *Compare* each type variable using *if/else expression branches*.

    - Return a new alias type instance with the resulting types.

1. Is either type an alias type?

    - Resolve the aliases and *compare* the resolved types using *if/else
      expression branches*.

    - Do this one at a time so nested alias specs have a chance of being
      compared by name.

1. Is either type a function type variable?

    - If a substitution exists for any of the function type variables,
      substitute them, then *compare* the substitutions and other types using
      *if/else expression branches*. Return the result.

      - For example, if there are two type variables, but only one has a
        substitution, substitute only that one type variable, then recompare.

    - By now, all function type variables have no substitutions.

    - Are both types function type variables?

      - Yes: Create a new type variable spec, and map both type variables' type
        specs to an instance of it in the comparison context's substitution map.

      - No: Map the type variable to the other type.

1. Is the first type a tuple?

    - The other type *should* be a tuple.

    - Maintain a list of types for a new tuple.

    - For each type in the first tuple:

      - If the other tuple doesn't have a corresponding type, break.

      - *Compare* the types using *if/else expression branches* and add the
        result to the list of types.

    - The tuple lengths *should* match.

    - Return a new tuple with the list of resulting types.

1. Is the first type a record?

    - The other type *should* be a record.

    - Maintain a new mapping of keys to types for a new record.

    - For each key in the first record:

      - The other record *should* have the key.

      - *Compare* the types using *if/else expression branches* and add the
        result to the map of types.

    - The other record *should* not have extra fields.

    - Return a new record with the mapping of keys to types.

1. Is the first type a function?

    - The other type *should* be a function.

    - *Compare* the corresponding argument types using *if/else expression
      branches*.

    - *Compare* the corresponding return types using *if/else expression
      branches*.

    - *Recursively* substitute the type variables from the comparison context in
      the function's type variable list. Remove duplicates. Set the owner of the
      function type variable specs to a new function made from the results of
      the previous comparisons and the new type variable list. Return the new
      function.

1. Is the first type a named type?

    - Note: Aliases should not have survived to this point.

    - The other type *should* be a named type.

    - The other type's spec *should* `===` the first type's spec.

    - Maintain a list of types for the new type instance.

    - For each type variable,

      - *Compare* the types using *if/else expression branches* and add the
        result to the list of types.

    - Return a new instance of the type spec with the list of resolved types.
