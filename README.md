# N
![Version](https://img.shields.io/github/v/release/nbuilding/N-Lang?color=Green&style=flat-square)

A programming language by N Building with features such as modular imports.

## Install N

Shell (Mac, ~~Linux~~):

```sh
curl -fsSL https://github.com/nbuilding/N-lang/raw/main/install.sh | sh
```

PowerShell (Windows):

```ps1
iwr https://github.com/nbuilding/N-lang/raw/main/install.ps1 -useb | iex
```

### Install a specific version

Shell (Mac, ~~Linux~~):

```sh
curl -fsSL https://github.com/nbuilding/N-lang/raw/main/install.sh | sh -s v1.0.0
```

PowerShell (Windows):

```ps1
$v="1.0.0"; iwr https://github.com/nbuilding/N-lang/raw/main/install.ps1 -useb | iex
```

## Python instructions

See [python/](./python/).

### Have something cool in N?
- Contact us or make a PR
- Look at [PROJECTS.md](./PROJECTS.md)

### Bugs:

See [issues](https://github.com/nbuilding/N-lang/issues).

## JavaScript

The JavaScript version uses [Node](https://nodejs.org/),
[TypeScript](https://www.typescriptlang.org/), and
[Nearley](https://nearley.js.org/).

See how to run it in the [js/ folder](./js/).

## Web editor

An IDE is available at https://nbuilding.github.io/N-lang/. It uses the JS
version and [Monaco](https://microsoft.github.io/monaco-editor/), the same
editor used in VSCode. The code for the editor is available in the [web/
folder](./web/).
