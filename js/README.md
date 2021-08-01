# Node

```sh
# Required global dependencies:
npm install --global nearley typescript ts-node

# Install dependencies
npm install

# Compile Nearley grammar
npm run build:ne

# Run
ts-node --pretty src/n-lang.ts ../examples/test.n
```

Alternatively, you can combine the last two steps if you're working on the
grammar:

```sh
npm run build:ne && ts-node --pretty src/n-lang.ts ../examples/test.n
```

## Development

This repository uses the [JavaScript Standard style](https://standardjs.com/)
but with the trailing commas typical of TypeScript.

```sh
# Global dependencies
# (The prettier-standard package has been unmaintained and doesn't support
# modern TypeScript syntax, so we're using a branch made by a dependency updater
# bot.)
npm install --global sheerun/prettier-standard#snyk-fix-9db5557ac6db798b421e149e10797a39 eslint

# Type check the entire project
npx tsc --noEmit

# Autoformats the files in place
prettier-standard --format

# Lint with recommended TypeScript rules
npm run lint

# Build helpers.js, globals.js, and modules.js into TypeScript files that
# export the text content of the JS files
npm run build:lines
```
