# Online N editor

Uses [Monaco](https://microsoft.github.io/monaco-editor/) for a VS Code-like
experience.

**IMPORTANT**: In order to build this, you need to first build the Nearley
**grammar in the [js/ folder](../js/) first. See its README for more info.

```sh
# Install global dependencies
npm install --global rollup

# Install more dependencies
npm install

# Serve local development server that watches for changes in the files
npm run serve

# Build for production
npm run build

# Deploy to GitHub Pages
./bin/deploy.sh
```
