# Destructuring

```js
// Destructuring is the main way to get values out of a tuple and is used for conditional lets

let a, b = (1, 2) // Sets a and b to 1 and 2 respectively

let { c; d: e } = { c: 1, d: 1 } // Sets a and c in the record to a and b respectively


if let [f, g] = [1, 2] { // If it is able to destructure then it runs the code
	print(f)
	print(g)
} else {
	print("Destructure failed")
}

if let <yes h> = yes("test") { // Sets a to "test" as it managed to destructure correctly, so it is not a maybe
	print(h)
}
```

## Notes
- All destructuring types can be used with a conditional let.