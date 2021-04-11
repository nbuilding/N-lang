# Async

```js
// Async is used with the cmd type and the await operator to run things asynchronously

let asyncFunction = [message:str] -> cmd[str] {
	print(message)
	return message
} // Declares an async function that simply prints out a message

let asyncHelper = [] -> cmd[()] {
	let _ = asyncFunction("test")! // ! calls an async function and awaits for it to finish
}

let _ = asyncHelper()
```

## Notes
- The `!` operator is an expression, not a command
- The `!` operator can only be used inside a `cmd`