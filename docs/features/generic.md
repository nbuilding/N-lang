# Type variables

In N code, you'll often encounter mysterious letters like `list[t]` in certain types. For example, the `print` function:

```ts
assert type print : [t] t -> t
```

That `[t]` in the function type annotation means that you can substitute `t` with any type. This allows `print` to be able to accept and return any type, not just strings:

```ts
assert type print("Hello!") : str
assert type print(3.14) : float
```

The same `t` is used in the function's argument and return type, which means that the return type must be the same as the argument type.

For a more sophisticated example, let us consider `map`, whose much more complicated type signature is shown below. However, when broken down, it is much simpler than it looks.

```ts
assert type map : [a, b] (a -> b) -> list[a] -> list[b]
```

Here, `[a, b]` declares two type variables. This means that the argument of the function `a -> b` and the items of the list `list[a]` must be the same type, but the items of the list `list[a]` do not have to be the same type as the *return* value of the function because `a` and `b` can stand for different types.

For example, `intInBase10` converts ints to strs (`int -> str`), so we know that `a` must stand for an `int`, and `b` must stand for a `str`. Since `a` must stand for the same type throughout the function, and likewise for `b`, we can determine the type of `map(intInBase10)`.

```ts
assert type map(intInBase10) : list[int] -> list[str]
```

As of writing this, `map` is not a built-in function provided by N. However, we can write our own generic `map` function using type variables, in terms of `filterMap`:

```ts
// Provided by N
assert type filterMap : [a, b] (a -> maybe[b]) -> list[a] -> list[b]

let map: [a, b] (a -> b) -> list[a] -> list[b] = [[x, y] transform:(x -> y) list:list[x]] -> list[y] {
	let filter: x -> maybe[y] = [item: x] -> maybe[y] {
		return yes(item)
	}
	return list |> filterMap(filter)
}
```

In the function arguments, we use `[x, y]` to declare the type variables within the function. (I specifically chose `x` and `y` to demonstrate that the names do not matter as long as they are different from each other; they do not have to match the `a` and `b` in the type annotation, though they can.) Inside the function, we can then use `x` and `y` as if they were normal types, and define tye annotations in terms of these type variables.
