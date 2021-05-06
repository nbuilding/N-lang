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
distinguish between them. **TODO**: Implementation?

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

**TODO**: Comparisons

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

**TODO**: Comparisons

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

Here's some psuedocode (in JavaScript) to explain how the API for these type
comparisons should work.

```js
// For `assert value`
const { type: valueType, exitPoint } = context.scope.typeCheck(this.expression)
context.typeErrIfNecessary(
  ErrorType.VALUE_ASSERTION_NOT_BOOL,
  checkAssignable(bool.instance(), valueType)
)
return { exitPoint }
```

or maybe just

```js
return this.expression.shouldBeAssignableTo(bool)
```
