export default `import fek

> main test: int test1: str -> bool |
\tprint "# Main"
\tprint test
\tprint test1
\t; if test1 = "hi" then return true
< false

> loop 10 i: int |
\tvar n: int < i + 1
\tprint
\t\tif n % 3 = 0 & n % 5 = 0 then
\t\t\t"Fizzbuzz"
\t\telse if n % 3 = 0 then
\t\t\t"Fizz"
\t\telse if n % 5 = 0 then
\t\t\t"Buzz"
\t\telse
\t\t\tn
<

var test: int < if not 1 = 1 | 2 > 3 then 1 else 3
var test1: int < 1 + 1
var eee: str < "hi"

var a: int < 1
var b: int < 3
var c: int < 2
print a < c < b

{main test1 eee}
{fek.paer test}
if not {main test "hello"} ->
\tprint "{main test \\"hello\\"} returned false"
if {main test eee} ->
\tprint "{main test eee} returned true"
else
\tprint "{main test eee} returned false"

print 2 + 3 * (4 + 1) * 4 + 5`
