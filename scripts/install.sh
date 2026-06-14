#!/bin/sh
# Install the jtype CLI on macOS / Linux.
#   curl -fsSL https://raw.githubusercontent.com/cnjack/jtype/main/scripts/install.sh | sh
set -e

REPO="cnjack/jtype"
os="$(uname -s)"
arch="$(uname -m)"

case "$os" in
  Darwin)
    case "$arch" in
      arm64) asset="jtype-macos-arm64" ;;
      x86_64) asset="jtype-macos-x64" ;;
      *) echo "Unsupported macOS arch: $arch" >&2; exit 1 ;;
    esac ;;
  Linux)
    case "$arch" in
      x86_64) asset="jtype-linux-x64" ;;
      *) echo "Unsupported Linux arch: $arch" >&2; exit 1 ;;
    esac ;;
  *)
    echo "Unsupported OS: $os. On Windows use install.ps1." >&2; exit 1 ;;
esac

dir="$HOME/.jtype/bin"
mkdir -p "$dir"
url="https://github.com/$REPO/releases/latest/download/$asset"

echo "Downloading $asset …"
if ! curl -fsSL "$url" -o "$dir/jtype"; then
  echo "Download failed — is there a published release with CLI binaries yet?" >&2
  exit 1
fi
chmod +x "$dir/jtype"

# Ensure ~/.jtype/bin is on PATH via the user's shell profiles (idempotent).
line='export PATH="$HOME/.jtype/bin:$PATH"'
for rc in "$HOME/.zshrc" "$HOME/.bashrc" "$HOME/.profile"; do
  [ -e "$rc" ] || { [ "$rc" = "$HOME/.profile" ] || continue; }
  if ! grep -q '.jtype/bin' "$rc" 2>/dev/null; then
    printf '\n# Added by JType\n%s\n' "$line" >> "$rc"
  fi
done

echo "✓ Installed jtype to $dir/jtype"
echo "  Open a new terminal (or run: $line), then: jtype login"
