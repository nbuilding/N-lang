# Native Functions

```js
intInBase10(10) // Takes in an int and returns the string version.
round(10.5) // Rounds a float to the nearest value, returns an int.
floor(10.5) // Rounds down a float to the nearest value, returns an int.
ceil(10.4) // Rounds up a float to the nearest value, returns an int.
charCode(\{a}) // Returns the unicode code for a character.
intCode(32) // Returns the character associated for an int.
charAt(1, "abc") // Returns the character at an index of a string, takes in an int and a string and returns a maybe char.
substring(0, 2, "abc") // Takes in a start, an end, and a string and returns a string.
len("abc") // Takes in any value and returns the length of it. For lists and tuples it gets the amount of items otherwise it is string representation.
split(\{b}, "abc") // Splits a string based on a character as many times as possible and returns a list[str].
strip(" abc ") // Returns a string with removed whitespace from the end.
range(0, 10, 1) // Returns a list of ints that takes in a start, and end, and a step value.
//type(10) // Takes in any object and returns the type of it as a string. Deprecated until new name is added.
print("test") // Takes in any type and prints it out in a formatted way. It also returns the value printed out.
itemAt(1, [1, 2, 3]) // Takes in an int and a list of any type and returns a maybe of the item that might be there.
append(4, [1, 2, 3]) // Returns a list with the item added to the end, this is not a void function.
filterMap([value:int] -> maybe[int] {
	return yes(value + 1)
}, [0, 1, 2]) // This takes in a function and a list and applies to function to all items in the list, this also returns a copy of the list.
default("test1", yes("test")) // This will turn a maybe into a regular type but if the value is none then it will use the default value instead
then(func, someCmdFunction()) // Runs the function after the cmd is done
mapFrom([("a", 1), ("b", 2)]) // Takes in a list of tuples and returns a map
getValue("b", map) // Takes in a key and a map and returns a maybe
entries(map) // Returns all of the values in the map
```

## Notes
- All of these are meant to be used with the [pipe operator](./currying.md).