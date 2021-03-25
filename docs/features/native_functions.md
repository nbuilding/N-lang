# Native Functions

```js
intInBase10(10) // Takes in an int and returns the string version.
round(10.5) // Rounds a float to the nearest value.
floor(10.5) // Floors a float to the nearest value.
ceil(10.4) // Ceilings a float to the nearest value.
charCode(\{a}) // Returns the code for a character.
intCode(32) // Returns the chacter associated for an int.
charAt(1, "abc") // Returns the character at an index of a string, takes in an int and a string and returns a maybe.
substring(0, 2, "abc") // Takes in a start, an end, and a string and returns a maybe string.
len("abc") // Takes in any value and returns the length of it.
split(\{b}, "abc") // Splits a string based on a character.
strip(" abc ") // Returns a string with removed whitespace from the end.
range(0, 10, 1) // Returns a list of ints that takes in a start, and end, and a step value.
type(10) // Takes in any type and returns the type of it as a string.
print("test") // Takes in any type and prints it out in a formatted way. It also returns the value printed out.
itemAt(1, [1, 2, 3]) // Takes in an int and a list of any type and returns a maybe of the item that might be there.
append(4, [1, 2, 3]) // Returns a list with the item added to the end, this is not a void function.
filterMap([value:int] -> int {
	return value + 1
}, [0, 1, 2]) // This takes in a function and a list and applys to function to all items in the list, this is a void function.
yes("test") // This turns any type into a maybe.
default("test1", yes("test")) // This will turn a maybe into a regular type but if the value is none then it will use the default value instead
ok("test") // Takes in any value and returns an ok
err("test") // Takes in any value and return an err of it
then(func, someCmdFunction()!) // Runs the function after the cmd is done
mapFrom([("a", 1), ("b", 2)]) // Takes in a list of tuples and returns a map
getValue("b", map) // Takes in a key and a map and returns a maybe
entries(map) // Returns all of the values in the map,
```