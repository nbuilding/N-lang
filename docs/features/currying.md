# Currying and the Pipe Operator

```js
// Currying is when a function is called with less arguments than intended
// When calling a function with fewer arguments than it can take, it will return a new function that calls the old function, but with the arguments already given pre-filled.

let sum = [a:int b:int] -> int {
	return a + b
}

let addOne = sum(1) // Here it is called with one less argument than intended; this ends up returning a function that is an int -> int, which when called will add one to the number

print(addOne(2)) // Prints 3

// The pipe operator takes in a value on the left side and a function on the right side, and calls the function with the value on the left side

2
 |> sum(1)
 |> print // Note that the pipe operator can be stacked indefinitely. This still prints 3
```

## Notes
- You can call currying with no arguments on a function that takes in at least one argument.