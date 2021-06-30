## Python development instructions

Your command line's working directory should be inside the `python/` folder.

Windows: (You may have to do `Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser` first.)

Git Bash users should do `source .venv/Scripts/activate`.

```bat
py -m venv .venv
.\.venv\Scripts\activate
py -m pip install -r requirements.txt

py n.py --file run.n

deactivate
```

Everywhere else:

```sh
python3 -m venv .venv
source .venv/bin/activate
python3 -m pip install -r requirements.txt

python3 n.py --file run.n

deactivate
```

## Running `n.py`

If there are no arguments, then it will interpret `run.n`.

If there is a `--file [file name]` flag, then it will run the file in the filename.

If there is a `--check` flag, then it will only do compile-time and show warnings.

```sh
python python/n.py
```

## `requirements.txt`

- Save to requirements.txt: `python3 -m pip freeze > requirements.txt` (Windows: `py -m pip freeze | Out-File -Encoding UTF8 requirements.txt`)

- Load from requirements.txt `pip install -r requirements.txt`

## Bundle

```sh
pyinstaller -y --add-data="syntax.lark;." n.py
```

## Test

Windows users should use `py`, and everyone else should use `python3`.

```sh
# Test syntax and type/value assertions
N_ST_DEBUG=dev python -m unittest parse_test.py type_check_test.py
```

## Formatting

We conform to the [PEP 8](https://www.python.org/dev/peps/pep-0008/) style guide.

```sh
# Lint
pylint --disable=all --enable=F,E,unreachable,duplicate-key,unnecessary-semicolon,global-variable-not-assigned,unused-variable,binary-op-exception,bad-format-string,anomalous-backslash-in-string,bad-open-mode,dangerous-default-value ../**/*.py

# Autoformatting
black .
```
