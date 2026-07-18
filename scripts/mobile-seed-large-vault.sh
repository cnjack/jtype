#!/usr/bin/env bash
set -euo pipefail

platform="${1:-}"
document_count="${2:-5000}"
app_id="net.jcode.jtype"

if [[ "$platform" != "android" && "$platform" != "ios" ]]; then
  echo "usage: $0 <android|ios> [document-count]" >&2
  exit 2
fi
if [[ ! "$document_count" =~ ^[0-9]+$ ]] || (( document_count < 100 || document_count > 50000 )); then
  echo "document-count must be an integer between 100 and 50000" >&2
  exit 2
fi

fixture_root="$(mktemp -d "${TMPDIR:-/tmp}/jtype-large-vault.XXXXXX")"
trap 'rm -rf "$fixture_root"' EXIT
fixture_dir="$fixture_root/documents"
mkdir -p "$fixture_dir"

index=0
while (( index < document_count )); do
  padded="$(printf '%05d' "$index")"
  printf -- '---\ntitle: Performance note %s\ntags: [large-vault]\n---\n\n# Performance note %s\n\nShared desktop/mobile large vault fixture %s.\n' \
    "$padded" "$padded" "$padded" > "$fixture_dir/performance-note-$padded.md"
  index=$((index + 1))
done

if [[ "$platform" == "android" ]]; then
  adb get-state >/dev/null
  adb shell am force-stop "$app_id"
  fixture_tar="$fixture_root/jtype-large-vault.tar"
  COPYFILE_DISABLE=1 tar -C "$fixture_dir" -cf "$fixture_tar" .
  adb push "$fixture_tar" /data/local/tmp/jtype-large-vault.tar >/dev/null
  adb shell "run-as $app_id sh -c 'mkdir -p vaults/default && find vaults/default -maxdepth 1 -type f \( -name \"performance-note-*.md\" -o -name \"._performance-note-*.md\" \) -delete >/dev/null && tar -xf /data/local/tmp/jtype-large-vault.tar -C vaults/default'"
  adb shell rm -f /data/local/tmp/jtype-large-vault.tar
  actual_count="$(adb shell "run-as $app_id sh -c 'find vaults/default -maxdepth 1 -type f -name \"performance-note-*.md\" | wc -l'" | tr -d '\r[:space:]')"
else
  ios_device="${JTYPE_IOS_UDID:-booted}"
  xcrun simctl terminate "$ios_device" "$app_id" >/dev/null 2>&1 || true
  app_container="$(xcrun simctl get_app_container "$ios_device" "$app_id" data)"
  case "$app_container" in
    *"/CoreSimulator/Devices/"*"/data/Containers/Data/Application/"*) ;;
    *) echo "refusing unexpected iOS app container: $app_container" >&2; exit 1 ;;
  esac
  vault_dir="$app_container/Library/Application Support/net.jcode.jtype/vaults/default"
  mkdir -p "$vault_dir"
  find "$vault_dir" -maxdepth 1 -type f \( -name 'performance-note-*.md' -o -name '._performance-note-*.md' \) -delete
  cp -R "$fixture_dir"/. "$vault_dir"/
  actual_count="$(find "$vault_dir" -maxdepth 1 -type f -name 'performance-note-*.md' | wc -l | tr -d '[:space:]')"
fi

if [[ "$actual_count" != "$document_count" ]]; then
  echo "fixture verification failed: expected $document_count, found $actual_count" >&2
  exit 1
fi

echo "seeded $actual_count performance documents for $platform ($app_id)"
