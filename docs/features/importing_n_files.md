# Importing .n files

This will be `import.n`
```js
// the pub modifier allows variables to be public

let pub test = "Hello"
let test2 = "Goodbye" // Cannot be accessed when imported

print("test")
```

This will be `run.n`
```js
// imp takes in a string or a name (depricated) and returns a record after running though the file

let importedthings = imp "./import.n" // This goes though the file so it will print out test

print(importedthings.test) // Prints out hello
//print(importedthigns.test2) will cause an error because it is not public
```

## Notes:
- `imp` returns a record and so its type is as such.
- `imp` runs though the imported file.
- `imp` can be called with a name not a string but that is deprecated.