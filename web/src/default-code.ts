export default `for i 100 {
\tvar n = i + 1
\tprint
\t\tif n % 3 = 0 & n % 5 = 0
\t\t\t"FizzBuzz"
\t\telse if n % 3 = 0
\t\t\t"Fizz"
\t\telse if n % 5 = 0
\t\t\t"Buzz"
\t\telse
\t\t\t<intInBase10 n>
}
`
