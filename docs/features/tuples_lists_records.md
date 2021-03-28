# Tuples, Lists, and Records

```js
// This will declare a simple tuple with a int and a char
let tuplevalue:(int, char) = (1, \{a})

// This will declare a record with a int called value and then get that from it
let recordvalue:{ value: int } = {
	value: 1 // There is either a newline or a ; at the end of this to separate these
}
let value = recordvalue.value

// This will declare a list of strings
let listvalue = ["a", "b", "c"]

var listvalue = append("d", listvalue) // Append is not a void function

let listindexvalue = itemAt(1, listvalue) // This returns a maybe which will need to be defaulted

print(listindexvalue)
```

## Notes:
- All of the above can be [destructured](./destructuring.md).
- Tuples can only be [destructured](./destructuring.md) to get the values from them.
- `append` returns a list.
- `itemAt` will return a `maybe` for null saftey, see how to deal with that [here](./enums.md).
- Most of the list functions are intended to be used with the [pipe operator](./currying.md).