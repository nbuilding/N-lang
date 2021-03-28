# If Statements

```js
// Simple if statement that will always be false

if (1 /= 1) { // usually if (1 != 1) in other langugaes
	print("This will never run")
} else if (false) {
	print("This will never run")
} else {
	print("This will always run")
}

// The condutional let will only run the block of code if the value can be assigned to the variable
if let i:str = 1 {
	print("This will never run")
}

if let i:str = "This will always run" {
	print(i)
}

let notnone:maybe[str] = yes("This will always run")

if let <yes test> = notnone {
	print(test) // test is not a maybe anymore, it is a string
}
```

## Notes:
- There is no parenthesis in between `if` and `let` on a conditional let
- Conditional lets can be used with [destructuring](./destructuring.md).