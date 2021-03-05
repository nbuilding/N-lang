# N syntax test suite

The `syntax` folder tries to test every single edge case to ensure:

- No syntactical ambiguities

- Parity between different N implementations

- No syntax "surprises"

Each N file contains at least one snippet in N, which are each separated by
*three* newlines. Each file should at least be parsed successfully—no type
checking required—without any ambiguities. (Ideally, this means you should
enable the option that lists every possibility, if such an option exists.)

Within each file, if there are multiple snippets, each snippet should produce
*equivalent* ASTs. For example:

```ts
let /* comment */ (((myVar))) /* comment */ = ((((/* comment */))))


let myVar = ()
```

The AST, which ignores comments in at least Lark and Nearley, should produce the
equivalent AST in both snippets, ignoring the line and column positions of
tokens as well as parentheses around values, types, and patterns.
