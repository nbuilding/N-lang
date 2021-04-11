# If Statements

```js
// Simple if statement that will always be false

if (1 /= 1) { // usually if (1 != 1) in other languages
	print("This will never run")
} else if (false) {
	print("This will never run")
} else {
	print("This will always run")
}

// The conditional let will only run the block of code if the value can be assigned to the variable
if let i = "This will always run" {
	print(i)
}

let notNone:maybe[str] = yes("This will always run")

if let <yes test> = notNone {
	print(test) // test is not a maybe, it is a string
}

if let <yes test> = none {
	print("This will never run")
}
```

## Notes:
- There is no parenthesis in between `if` and `let` on a conditional let
- Conditional lets can be used with [destructuring](./destructuring.md).