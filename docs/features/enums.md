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

```ts
assert type mainMenu : state
```

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

Because `ongoing` takes a field of type `int`, the type declaration provides a function named `ongoing` that takes an int and returns a `state`:

```ts
assert type ongoing : int -> state

// The game is ongoing, and the player's health is at 100 HP.
let gameState: state = ongoing(100)
```

You can directly compare enum values

```ts
if gameState = mainMenu {
	print("Welcome to my game!")
} else if gameState = ended("Bob") {
	print("Welcome back, Bob! Don't get discouraged by the game over. :)")
}
```

Now that we've stored values inside an enum variant, how would one get the value back out? Since an enum value might be one of multiple variants, we need to use an `if let` statement or expression to check if an enum value is a certain variant. `if let` is followed by a conditional pattern. For example, to determine whether the game is ongoing:

```ts
if let <ongoing health> = gameState {
	print("Your health is at " + intInBase10(health) + " HP.")
}
```

If `gameState` is of the `ongoing` variant, then the if statement's condition will be fulfilled. Since you then know that `gameState` is `ongoing`, you can directly get the enum variant's fields from the conditional pattern. In the example above, `health` is an int that was contained inside an `ongoing` variant.

Enums are not limited to keeping track of state. N provides built-in enums `maybe` and `result`:

```ts
type maybe[t]
	| <yes t>
	| none
 
type result[o, e]
	| <ok o>
	| <err e>
```

These types allow programs in N to avoid runtime errors because the type checker encourages programs to check to ensure that the enums are a specific variant. The `maybe` type helps avoid null pointer exceptions, and `result` allows functions to return errors without implicitly throwing unexpected uncaught runtime errors. You can use `maybe` and `result` like ordinary enums:

```ts
let divideBy2 = [number: int] -> result[int, string] {
	if number % 2 = 1 {
		return err("Odd numbers are not divisible by two.")
	} else if not number = 42 {
		return ok(number / 2)
	} else {
		return err("I have decided to refuse to divide 42 by two.")
	}
}
```

```ts
if let <yes char> = SystemIO.inp("Give me a character.")! |> charAt(0) {
	print(char)
} else {
	print("All I asked for was ONE character, and you gave me NOTHING. You MONSTER!")
}
```

When returning errors, it is helpful to create your own error enum type so that someone using your program can deal with each type of error on a case-by-case basis. For example, an HTTP request library might have:

```ts
type httpError =
	| <invalidUrl str>
	| connectionFailed
	| <statusCode int response>
```

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
- By convention, enum names are lowerCamelCase like identifiers, unlike most other programming languages.
- Angle brackets are used for variants with fields because historically, the function call syntax used angle brackets, and when that was changed to C-style function calls, enum declarations remained unchanged by accident.
