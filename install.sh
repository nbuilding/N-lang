#!/bin/sh
# Based on https://github.com/denoland/deno_install/blob/7b9f98c3030d7ce6cfdd9bee113055beec1ce7ed/install.sh

set -e

if ! command -v unzip >/dev/null; then
	echo "Error: unzip is required to install N. You can install unzip via 'brew install unzip' on MacOS or 'apt-get install unzip -y' on Linux." 1>&2
	exit 1
fi

if [ "$OS" = "Windows_NT" ]; then
	target="N"
else
	case $(uname -sm) in
	"Darwin x86_64") target="N-macos" ;;
	"Darwin arm64") target="N-macos" ;;
	*) target="N-macos" ;;
	esac
fi

if [ $# -eq 0 ]; then
	n_uri="https://github.com/nbuilding/N-lang/releases/latest/download/${target}.zip"
else
	n_uri="https://github.com/nbuilding/N-lang/releases/download/${1}/${target}.zip"
fi

n_install="${N_INSTALL:-$HOME/.n}"
bin_dir="$n_install/bin"
exe="$bin_dir/n"

if [ ! -d "$bin_dir" ]; then
	mkdir -p "$bin_dir"
fi

curl --fail --location --progress-bar --output "$exe.zip" "$n_uri"
unzip -d "$bin_dir" -o "$exe.zip"
chmod +x "$exe"
rm "$exe.zip"

echo "N was installed successfully to $exe"
if command -v n >/dev/null; then
	echo "Run 'n --help' to get started"
else
	case $SHELL in
	/bin/zsh) shell_profile=".zshrc" ;;
	*) shell_profile=".bash_profile" ;;
	esac
	echo "Manually add the directory to your \$HOME/$shell_profile (or similar)"
	echo "  export N_INSTALL=\"$n_install\""
	echo "  export PATH=\"\$N_INSTALL/bin:\$PATH\""
	echo "Run '$exe --help' to get started"
fi
