import { expect } from 'chai'
import {
  bool,
  int,
  list,
  maybe,
  str,
} from '../../../src/type-checker/types/builtins'
import {
  Function as FuncType,
  Tuple,
  Type,
  Unknown,
} from '../../../src/type-checker/types/types'

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

  The error can be represented as
  [
    {
      type: Tuple<bool, str, int>
      index: 0
      errors: [
        {
          shouldBe: Type<str>
        }
      ]
    },
    {
      maxFields: 2
    }
  ]

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

- (([a] a -> list[a]) -> int)([b] b -> list[b])
  assignable
  both functions, upon encountering each other, could see that they both have
  the same number of generic types. they could create a dummy clone by
  substituting a -> t and b -> t then comparing:
  [t] t -> list[t] vs. [t] t -> list[t]
  returns int

- (([a, b] list[(a, b)] -> list[a]) -> int)([c, d] list[(d, c)] -> list[c])
  the above suggested strategy won't work here, or at least it would be too
  naïve.
  perhaps the functions can compare each other normally, structurally, and do
  normal substitutions:
    a=d
    b=c
  then, it would be incompatible because
    [a, b] list[(b, a)] -> list[a]
                           ^^^^^^^
      list[a]
           ^ This should be `b`.
  returns int

- ((str -> str) -> int)([a] a -> a)
  assignable
  What to do when `str` encounters the function type variable `a`? I guess then
  we should substitute a=str in the VALUE (not annotation) type and see if that
  works? So it becomes str -> str vs. [a] a -> a
  This can be done by having some substitution map in FuncTypeVar.func perhaps,
  but this'll have to be cleaned by the end
  Would this work for the previous tests? think so
  returns int

- (([a] a -> a) -> int)(str -> str)
  incompatible:
    str -> str
    ^^^^^^^^^^ This should be a `[a] a -> a`. `([a] a -> a) -> int` might call
    this function with a different type argument, which this function cannot
    handle.
  How can this be systematically determined? Probably if `a` encounters `str`,
  then because `str` is the value type and is not a FuncTypeVar, this is an
  error! This would probably instead produce (using a.func):
    str -> str
    ^^^ This should be `a` for `[a] a -> a`. It should be able to handle any
    value, not just a `str`.
  In summary, when comparing functions for type equality, type variables should
  be substituted for the VALUE not annotation type
  returns int

- ([a] (a -> a) -> a)([b] b -> b)
  Let's follow the existing rules:
  1. [a] a -> a vs. [b] b -> b
  2. a vs. b (function argument type)
  3. => b=a
    note: just realized that this will have to distinguish between type vars for
    the outermost function, which get resolved, and the type vars for inner
    functions
  4. => [a] a -> a vs. [b] b=a -> b=a
  5. a vs. b=a (function return type) ok
  6. both are ok, so ok
  but the return type? ah ...

  BUT it's [a] (a -> a) -> a! so `a` is actually from the outermost function.
  thus, the steps are a bit different (see note in step 3)
  1. a -> a vs. [b] b -> b
  2. a vs. b (function argument type)
  3. => a=b (because `a` belongs to outermost function)
  4. => a=b -> a=b vs. [b] b -> b
  5. a=b vs. b (function return type) ok
  6. both are ok, so ok
  HOWEVER, this results in some polution! `b` has ESCAPED from inside its
  function because a=b, so the return value has resolved to become `b`

  How can we deal with this? Should it be an error? Since resolving a function
  typevar as another function typevar probably isn't intended?

  Perhaps instead, we consistently substitute b's type vars. Thus:
  1. a -> a vs. [b] b -> b
  2. a vs. b (function argument type)
  3. => b=a (because `b` is a function type var)
  4. => a -> a vs. [b] b=a -> b=a
  5. a vs. b=a (function return type) ok
  6. both are ok, so ok
  `a` remains unresolved, so it becomes `unknown_1`. Excellent!

  assignable?? yes
  returns unknown_1?? yes

By the way, inside a function, the type vars are declared as Types not
FuncTypeVars.

*/

describe('type system', () => {
  it('(str -> int)(str)', () => {
    const [incompatible, returnType] = FuncType.make(() => [
      str.instance(),
      int.instance(),
    ]).given(str.instance())
    expect(incompatible).to.be.empty
    expect(int.isInstance(returnType)).to.be.true
  })

  it('(null -> int)(str)', () => {
    const [incompatible, returnType] = new FuncType(null, int.instance()).given(
      str.instance(),
    )
    expect(incompatible).to.be.empty
    expect(int.isInstance(returnType)).to.be.true
  })

  it('(str -> int)(bool)', () => {
    const [incompatible, returnType] = FuncType.make(() => [
      str.instance(),
      int.instance(),
    ]).given(bool.instance())
    expect(incompatible).to.deep.equal([
      // TODO
    ])
    expect(int.isInstance(returnType)).to.be.true
  })

  it('((int, str) -> int)((bool, str, int))', () => {
    const [incompatible, returnType] = FuncType.make(() => [
      new Tuple([int.instance(), str.instance()]),
      int.instance(),
    ]).given(new Tuple([bool.instance(), str.instance(), int.instance()]))
    expect(incompatible).to.deep.equal([
      // TODO
    ])
    expect(int.isInstance(returnType)).to.be.true
  })

  it('(list[str] -> list[str])(list[int])', () => {
    const [incompatible, returnType] = FuncType.make(() => [
      list.instance([str.instance([])]),
      list.instance([str.instance([])]),
    ]).given(list.instance([int.instance()]))
    expect(incompatible).to.deep.equal([
      // TODO
    ])
    expect(int.isInstance(returnType)).to.be.true
  })

  it('([a] list[a] -> int)(list[str])', () => {
    const [incompatible, returnType] = FuncType.make(
      a => [list.instance([a]), int.instance()],
      'a',
    ).given(list.instance([str.instance()]))
    expect(incompatible).to.be.empty
    expect(int.isInstance(returnType)).to.be.true
  })

  it('([a] list[a] -> a)(null)', () => {
    const [incompatible, returnType] = FuncType.make(
      a => [list.instance([a]), a],
      'a',
    ).given(null)
    expect(incompatible).to.be.empty
    expect(returnType).to.be.null
  })

  it('([a] str -> a)(str)', () => {
    const [incompatible, returnType] = FuncType.make(
      a => [str.instance(), a],
      'a',
    ).given(list.instance([str.instance()]))
    expect(incompatible).to.be.empty
    expect(returnType).to.be.instanceof(Unknown)
  })

  it('([a] (str, null[a]) -> list[a])((bool, list[int]))', () => {
    const [incompatible, returnType] = FuncType.make(
      a => [
        new Tuple([str.instance(), new Type(null, [a])]),
        list.instance([a]),
      ],
      'a',
    ).given(new Tuple([bool.instance(), list.instance([int.instance()])]))
    expect(incompatible).to.deep.equal([
      // TODO
    ])
    expect(list.isInstance(returnType, typeVar => int.isInstance(typeVar))).to
      .be.true
  })

  it('([a] (str, list[a]) -> list[a])((null, maybe[bool]))', () => {
    const [incompatible, returnType] = FuncType.make(
      a => [
        new Tuple([str.instance(), list.instance([a])]),
        list.instance([a]),
      ],
      'a',
    ).given(new Tuple([null, maybe.instance([bool.instance()])]))
    expect(incompatible).to.deep.equal([
      // TODO
    ])
    expect(list.isInstance(returnType, typeVar => typeVar === null)).to.be.true
  })

  it('(([a] a -> list[a]) -> int)([b] b -> list[b])', () => {
    const [incompatible, returnType] = FuncType.make(() => [
      FuncType.make(a => [a, list.instance([a])], 'a'),
      int.instance(),
    ]).given(new Tuple([null, maybe.instance([bool.instance()])]))
    expect(incompatible).to.be.empty
    expect(list.isInstance(returnType, typeVar => int.isInstance(typeVar))).to
      .be.true
  })

  it('(([a, b] list[(a, b)] -> list[a]) -> int)([c, d] list[(d, c)] -> list[c])', () => {
    const [incompatible, returnType] = FuncType.make(() => [
      FuncType.make(
        (a, b) => [list.instance([new Tuple([a, b])]), list.instance([a])],
        'a',
        'b',
      ),
      int.instance(),
    ]).given(
      FuncType.make(
        (c, d) => [list.instance([new Tuple([d, c])]), list.instance([c])],
        'c',
        'd',
      ),
    )
    expect(incompatible).to.be.empty
    expect(list.isInstance(returnType, typeVar => int.isInstance(typeVar))).to
      .be.true
  })

  it('((str -> str) -> int)([a] a -> a)', () => {
    //
  })

  it('(([a] a -> a) -> int)(str -> str)', () => {
    //
  })

  it('([a] (a -> a) -> a)([b] b -> b)', () => {
    //
  })
})
