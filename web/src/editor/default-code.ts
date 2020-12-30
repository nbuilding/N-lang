export default `// There's a warning below because \`to\` is unused. Try fixing it!
let fizzbuzz = [to: int] -> str {
\tfor i 10 {
\t\tlet n = i + 1
\t\tprint
\t\t\tif n % 3 = 0 & n % 5 = 0
\t\t\t\t"FizzBuzz"
\t\t\telse if n % 3 = 0
\t\t\t\t"Fizz"
\t\t\telse if n % 5 = 0
\t\t\t\t"Buzz"
\t\t\telse
\t\t\t\t<intInBase10 n>
\t}
\t"Done with fizzbuzzing"
}
print <fizzbuzz 100> + " for 100 rounds."
`
