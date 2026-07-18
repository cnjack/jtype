#!/usr/bin/env bash
set -euo pipefail

JTYPE_REPO_ROOT=$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)
JTYPE_APP_PATH=${1:-"$JTYPE_REPO_ROOT/src-tauri/gen/apple/build/jtype_iOS.xcarchive/Products/Applications/JType.app"}
JTYPE_BINARY="$JTYPE_APP_PATH/JType"
JTYPE_INDEX="$JTYPE_REPO_ROOT/dist/index.html"

if [[ ! -x "$JTYPE_BINARY" ]]; then
  printf 'error: iOS app executable not found: %s\n' "$JTYPE_BINARY" >&2
  exit 1
fi

if [[ ! -f "$JTYPE_INDEX" ]]; then
  printf 'error: frontend build index not found: %s\n' "$JTYPE_INDEX" >&2
  exit 1
fi

JTYPE_ASSET_REFERENCES=$(rg -o '/assets/[^"[:space:]>]+\.(js|css)' "$JTYPE_INDEX" | sort -u || true)
if [[ -z "$JTYPE_ASSET_REFERENCES" ]]; then
  printf 'error: no JavaScript or CSS entry assets found in %s\n' "$JTYPE_INDEX" >&2
  exit 1
fi

if ! printf '%s\n' "$JTYPE_ASSET_REFERENCES" | rg -q '\.js$'; then
  printf 'error: frontend index has no JavaScript entry asset\n' >&2
  exit 1
fi

if ! printf '%s\n' "$JTYPE_ASSET_REFERENCES" | rg -q '\.css$'; then
  printf 'error: frontend index has no CSS entry asset\n' >&2
  exit 1
fi

JTYPE_STRINGS_FILE=$(mktemp -t jtype-ios-static-archive.XXXXXX)
trap 'rm -f "$JTYPE_STRINGS_FILE"' EXIT
strings "$JTYPE_BINARY" > "$JTYPE_STRINGS_FILE"

JTYPE_MISSING=0
while IFS= read -r JTYPE_ASSET; do
  [[ -z "$JTYPE_ASSET" ]] && continue
  if ! rg -Fq "$JTYPE_ASSET" "$JTYPE_STRINGS_FILE"; then
    printf 'error: static archive is missing frontend entry asset %s\n' "$JTYPE_ASSET" >&2
    JTYPE_MISSING=1
  fi
done <<< "$JTYPE_ASSET_REFERENCES"

if [[ "$JTYPE_MISSING" -ne 0 ]]; then
  printf 'error: archive may have been overwritten by `tauri ios dev`; rebuild the static archive\n' >&2
  exit 1
fi

if JTYPE_BINARY_BYTES=$(stat -f '%z' "$JTYPE_BINARY" 2>/dev/null); then
  :
else
  JTYPE_BINARY_BYTES=$(stat -c '%s' "$JTYPE_BINARY")
fi
JTYPE_BINARY_SHA256=$(shasum -a 256 "$JTYPE_BINARY" | awk '{print $1}')

printf 'iOS static archive verified\n'
printf 'app: %s\n' "$JTYPE_APP_PATH"
printf 'binary_bytes: %s\n' "$JTYPE_BINARY_BYTES"
printf 'binary_sha256: %s\n' "$JTYPE_BINARY_SHA256"
printf 'entry_assets:\n%s\n' "$JTYPE_ASSET_REFERENCES"
