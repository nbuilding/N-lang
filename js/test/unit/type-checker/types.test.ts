import { expect } from 'chai'
import { int, list, str } from '../../../src/type-checker/types/builtins'
import { Function as FuncType } from '../../../src/type-checker/types/types'

/*

Type systems are hard! ugh

Everything can be thought of as a function IMO:

- Is str usable as an argument to [a] a -> list[a]? What does it return?
- Is str -> str assignable to [a] a -> a?
- Can (+) be used for str and str given (+) : str -> str -> str? What does it return?

Thus, type equality is based on two questions:
- Can a value with type A be used where type B is expected?
- What does a function return?

The goal of this is to ensure that

- Compare types and figure out where the differences are (for errors)

  It's not very nice to tell the user "hey list[int] -> list[bool] -> list[str]"
  is not assignable to "(list[int] -> list[bool]) -> list[str]" or if there's
  just a single, very tiny difference. It should tell the user where the error
  is.

- Facilitate type inference

  A function like `[a] -> { ... }` has the type `unknown_1 -> unknown_2`.
  Passing it into map : [a, b] (a -> b) -> list[a] -> list[b] should mean that
  a=unknown_1, b=unknown_2, and the function should return a list[unknown_1] ->
  list[unknown_2]. Trying to pass something like `["a", "b"]` should thus
  resolve list[unknown_1] as list[str], and thus the earlier function as str ->
  unknown_2. The function thus returns unknown_2, which could be resolved by
  assigning it to a let with a type annotation or passing it to another
  function.

- An error somewhere does not result in a misleading chain of errors resulting
  from uncertainties due to the first error:

  If `lisy` is undefined, then there shouldn't be an error about passing [] to a
  function that expects a `lisy[str]`

- All information that can be "recovered" should be recovered. For example, we
  know for sure that ??? -> str returns a string, even if the parameter type had
  an accident.

What null means:
- With type vars, it means the type spec is null (type is undefined).
  For example, null[a, b, c]
- As a type var, it probably means there was an error somewhere, like [2 + \n],
  which produces list[null].

Let's start simple.

- (str -> int)(str):
  str is assignable to str
  returns int

- (unknown_1)(str):
  unknown_1 is a unknown_2 -> unknown_3
  unknown_2 is a str and thus str is assignable to it
  returns unknown_3

- (null -> int)(str):
  returns int

- (str -> int)(bool):
  bool is not assignable to str
  returns int

- ((int, str) -> int)((bool, str, int)):
  (bool, str, int) is not assignable to (int, str) because:
    in the first field, bool is not assignable to str
    (int, str) does not have a third field

  Human readable error:
  You give a `bool, str, int` to a function that takes a `int, str`. Those types
  aren't compatible:
    bool, str, int
    ^^^^ This should be a `str`.
    bool, str, int
               ^^^ There shouldn't be a third field.

  returns int

- (list[str] -> list[str])(list[int]):
  incompatible:
    list[int]
         ^^^ This should be a `str`.
  returns list[str]

- ([a] list[a] -> int)(list[str]):
  a=str
  assignable
  returns int

- ([a] list[a] -> a)(null):
  type signature uses `a`, so a=null
  thus,
  returns null

- ([a] str -> a)(str)
  (note: achievable as a function argument)
  assignable
  because it returns non-function, and `a` remains unresolved:
  a=unknown_1,
  returns unknown_1 (no error!)

- ([a] (str, null[a]) -> list[a])((bool, list[int]))
  a=int
  incompatible:
    bool, list[int]
    ^^^^ This should be a `str`.
  returns list[int]

- ([a] (str, list[a]) -> list[a])((null, maybe[bool]))
  incompatible:
    ..., maybe[bool]
         ^^^^^^^^^^ This should be a `list[...]`.
  a remains unresolved, yet the function uses `a` in its take type. a=null
  returns list[null]

- (([a] a -> a) -> int)([b] b -> b)
  assignable
  returns int

- ((str -> str) -> int)([a] a -> a)
  assignable
  returns int

- (([a] a -> a) -> int)(str -> str)
  incompatible:
    str -> str
    ^^^^^^^^^^ This should be a `[a] a -> a`. `([a] a -> a) -> int` might call
    this function with a different type argument, which this function cannot
    handle.
  How can this be systematically determined?
  returns int

- ([a] (a -> a) -> a)([b] b -> b)
  assignable??
  returns unknown_1??

*/

/** [a] a -> a */
function identityType (): FuncType {
  return FuncType.make(a => [a, a], 'a')
}

/** str -> str */
function stringTransformType (): FuncType {
  return FuncType.make(() => [str.instance(), str.instance()])
}

/** [a, b] (a -> b) -> list[a] -> list[b] */
function listMapType (): FuncType {
  return FuncType.make((a, b) => [FuncType.make(() => [a, b]), FuncType.make(() => [list.instance([a]), list.instance([b])])])
}

/** str -> int */
function stringLengthType (): FuncType {
  return FuncType.make(() => [str.instance(), int.instance()])
}

describe('type system', () => {
  it('(str -> int)(str) should be assignable', () => {
    //
  })
})
