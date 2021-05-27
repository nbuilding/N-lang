# Type Aliases

```js
// This will create a simple alias for a record type
alias test = {
	a:int
	b:int
	c:str
}

let test2:test = {a:1; b:1; c:"test"}
// This is useful for shortening down big types when you want to make it clear what type it is based off of code
```

## Notes:
- When printing out the type of a value that uses an alias as its type, it will not print out the alias' name.