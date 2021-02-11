# N
![Version](https://img.shields.io/github/v/release/nbuilding/N-Lang?color=Green&style=flat-square)

A programming language by N Building with stuff like modular imports.

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
$v="1.0.0"; iwr https://github.com/nbuilding/N-lang/raw/master/install.ps1 -useb | iex
```

## Python instructions

In `python/`, run `n.py`

```sh
# Command line argument parsing
pip install argparse

# Parsing package
pip install lark

# Coloured console text
pip install colorama

# Async requests and files
pip install aiohttp
pip install aiofile

# Websockets
pip install websockets

# Parses and interprets code
# If there are no arguments then it will interpret run.n
# If there is a --file [file name] flag then it will run the file in the filename
# If there is a --check flag then it will only do compile-time and show warnings
python n.py

# OPTIONAL: Check the code for accidental errors
# https://stackoverflow.com/a/31908039
# https://stackoverflow.com/a/54488818
pylint --disable=all --enable=F,E,unreachable,duplicate-key,unnecessary-semicolon,global-variable-not-assigned,unused-variable,binary-op-exception,bad-format-string,anomalous-backslash-in-string,bad-open-mode,dangerous-default-value *.py **/*.py
```

### Features to add:
- look at [features.md](./features.md)

### Bugs:
- None currently

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
