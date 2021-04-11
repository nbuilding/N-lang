# For Loops

```js
// Simple for loop that prints out 0 though 9
// for loops take in a name and an optional type and a list value and will iterate thought the list value

for (i in range(0, 10, 1)) { // range takes in a lower bound (inclusive), and upperbound (exclusive), and a step size are returns an int array
	print(i)
} // This will print 0 - 9

/*
for i 10 {
	print(i)
} // deprecated
*/

// range can be replaced with any iterable
for (i in ["a", "b", "c"]) {
	print(i)
}
```

## Notes:
- Currently the only iterables that are registered are `list` values
- The old syntax will still run, but will give a deprecation warning