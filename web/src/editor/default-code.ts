export default `// There's a warning below because \`to\` is unused. Try fixing it!
let fizzbuzz = (to: int) -> str {
	for (i in range(0, 10, 1)) {
		let n = i + 1
		print (
			if n % 3 = 0 & n % 5 = 0 {
				"FizzBuzz"
			} else if n % 3 = 0 {
				"Fizz"
			} else if n % 5 = 0 {
				"Buzz"
			} else {
				n.intInBase10()
			})
	}
	return "Done with fizzbuzzing"
}

print(fizzbuzz(100) + " for 100 rounds.")
`
