# Destructuring

```js
// Destructuring is the main way to get values out of a tuple and is used for conditional lets

let a, b = (1, 2) // Sets a and b to 1 and 2 respectively
let a, b = [1, 2] // Works the same as tuples

let { a, c: b } = { a: 1, c: 1 } // Sets a and c in the record to a and b respectively

let <yes a> = yes("test") // Sets a to "test" as it managed to destructure correctly, so it is not a maybe

if let a, b = (1, 2) { // If it is able to destructure then it runs the code
	print(a)
	print(b)
} else {
	print("Destructure failed")
}
```

## Notes
- All destructuring types can be used with a conditional let.
- Enum destructuring uses the old form of enums.