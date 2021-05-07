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
`null` (the type error type) and create a warning that the branch will never
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
    - **TODO**: Maybe these substitutions can then be re-resolved if a
      non-unknown type is found?
  - I'm not sure if the unknown type can show up on the annotation side.
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
generics and . However, instead of using the generated helpful type error
message, if there's an error, it'll try the next one. There might also be a
special case for unknown types, as noted in the Unknown types section.

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
// If it fails, type is null
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
