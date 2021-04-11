# Enums and none

```js
// Enums are useful for generalizing types

type enumValue = <type str> // This takes in an str into the constructer
               | <test int> // This takes in an int into the contructer
               | default // This is a contant value like none that does not need another value

let enumTest:enumValue = <type "test"> // This creates an enumTest
let enumDefult = default

// There are multiple inbulit enums such as maybe and err

// The enum maybe is either a yes or a none
let test:maybe[str] = yes("test")
let nothing = none

// The enum result is SOMETHING HERE
```

## Notes
- Enums can be used with [generics](./generic.md).