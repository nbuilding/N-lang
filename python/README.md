## Python development instructions

Windows: (You may have to do `Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser` first.)

Git Bash users should do `source .venv/Scripts/activate`.

```bat
py -m venv .venv
.\.venv\Scripts\activate
py -m pip install -r python/requirements.txt

py python/n.py --file python/run.n

deactivate
```

Everywhere else:

```sh
python3 -m venv .venv
source .venv/bin/activate
python3 -m pip install -r python/requirements.txt

python3 python/n.py --file python/run.n

deactivate
```

- Save to requirements.txt: `python3 -m pip freeze > python/requirements.txt` (Windows: `py -m pip freeze | Out-File -Encoding UTF8 python/requirements.txt`)

- Load from requirements.txt `pip install -r python/requirements.txt`

OPTIONAL: Check the code for accidental errors.

```sh
pylint --disable=all --enable=F,E,unreachable,duplicate-key,unnecessary-semicolon,global-variable-not-assigned,unused-variable,binary-op-exception,bad-format-string,anomalous-backslash-in-string,bad-open-mode,dangerous-default-value *.py **/*.py
```
