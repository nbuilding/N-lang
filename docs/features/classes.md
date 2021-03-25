# Classes

```js
// This will create a simple public class that takes in two ints and has a public function and a private function
class pub Test [a:int b:int] {
	let pub sum = [] -> int {
		return a + b
	} // This uses a and b from the first line of the class as they are internal variables

	let internalSum = a + b // This is private
}
```

## Notes:
- There is currently no way for multiple contructors.
- All things in a class are automatially private, this does include the values passed in.