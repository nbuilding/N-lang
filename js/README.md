# Node

```sh
# Required global dependencies:
npm install --global nearley typescript ts-node

# Install dependencies
npm install

# Compile Nearley grammar
npm run build:ne

# Run
ts-node src/n-lang.ts ../examples/test.n
```

Alternatively, you can combine the last two steps if you're working on the grammar:

```sh
npm run build:ne && ts-node src/n-lang.ts ../examples/test.n
```

When using the `web` folder, you'll also need to compile the TypeScript files
because for some reason, Rollup doesn't build TypeScript files in its
dependencies:

```sh
npm run build:ts
```
