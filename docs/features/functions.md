# Functions

```js
// Declare a function that takes in 2 arguments and returns the sum of them
let test = [a:int b:int] -> int {
	return a + b
} // The type of this is int -> int -> int


let test2 = test(1, 2)

print(test)
print(test2)

print(type(test)) // This print out `int -> int -> int`
```

## Notes:
- The type of a function is `[type of argument 1] -> [type of argument 2] -> ... -> [return type]`
- The value of a function is an expression so this is what anonymous functions are commonly used as