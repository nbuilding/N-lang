# Enums

In making a video game, for example, you may want to keep track of the state of your game. In N, enums are an excellent data type for storing a specific possibility out of multiple possibilities. You could keep track of your game like this:

```ts
type state = mainMenu | ongoing | ended
```

`mainMenu`, `ongoing`, and `ended` are **variants** of the enum `state`. This allows you to store the state of your game in a variable, and its value will have to be one of those three variants:

```ts
let gameState: state = ended
```

An enum type declaration starts with the keyword `type` followed by the name of the enum type, which you can use in type annotations. The type name is followed by an equal sign (`=`) and then the variants of the enum, separated by pipes (`|`). Each of these variants will be introduced as values in your code, so you can use them as constants.

There are several enums built into N that you can use right out of the box. `bool` is nothing more than an enum with two variants, `true` and `false`:

```ts
type bool = true | false
```

Back to your video game, perhaps you also want to store the health of the player in your game, but only while the game is running, and when the game ends, you want to store the name of the player so they can be added to a leaderboard. Enum variants are also capable of storing other values. Let's modify `state` from the above example to store the player health and name in our enum:

```ts
type state =
  | mainMenu
  | <ongoing int>
  | <ended str>
```

Now, the `ongoing` and `ended` variants each contain one field, but each variant can have a field of a different type. In N, when variants contain at least one field, they need to be surrounded in angle brackets (`<` and `>`). Of course, enum variants aren't limited to just one field; they can contain multiple fields of tuples, lists, or even other enums.

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
- By convention, enum names are lowercase.
- Angle brackets are used because historically, the function call syntax used angle brackets, and when that was changed to C-style function calls, enum declarations remained unchained.
