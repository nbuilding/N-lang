# N
![Status](https://img.shields.io/badge/Status-Finished-brightgreen)
![Version](https://img.shields.io/badge/Version-1.0.1-brightgreen)

A programming language by N Building with stuff like modular imports.

## Installing
### For windows
In PowerShell run
```ps1
iwr https://github.com/nbuilding/N-lang/raw/installer/install.ps1 -useb | iex
```
to install N

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
