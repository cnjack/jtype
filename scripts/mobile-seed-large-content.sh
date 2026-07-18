#!/usr/bin/env bash
set -euo pipefail

platform="${1:-}"
section_count="${2:-900}"
card_count="${3:-1200}"
app_id="net.jcode.jtype"

if [[ "$platform" != "android" && "$platform" != "ios" ]]; then
  echo "usage: $0 <android|ios> [section-count] [card-count]" >&2
  exit 2
fi
if [[ ! "$section_count" =~ ^[0-9]+$ ]] || (( section_count < 100 || section_count > 5000 )); then
  echo "section-count must be an integer between 100 and 5000" >&2
  exit 2
fi
if [[ ! "$card_count" =~ ^[0-9]+$ ]] || (( card_count < 100 || card_count > 10000 )); then
  echo "card-count must be an integer between 100 and 10000" >&2
  exit 2
fi

script_dir="$(cd "$(dirname "$0")" && pwd)"
project_root="$(cd "$script_dir/.." && pwd)"
fixture_root="$(mktemp -d "${TMPDIR:-/tmp}/jtype-large-content.XXXXXX")"
trap 'rm -rf "$fixture_root"' EXIT
fixture_dir="$fixture_root/vault"
asset_dir="$fixture_dir/large-content-assets"
board_dir="$fixture_dir/performance"
mkdir -p "$asset_dir" "$board_dir"

content_file="$fixture_dir/large-content.md"
printf -- '# Large content fixture\n\n$E = mc^2$\n\n```mermaid\nflowchart LR\n  Start --> Indexed --> Visible\n```\n\n![Large attachment 00](large-content-assets/large-00.png)\n\n' > "$content_file"

index=0
while (( index < section_count )); do
  padded="$(printf '%04d' "$index")"
  printf -- '## Section %s\n\nLarge Markdown fixture %s. Shared desktop and mobile preview content. Shared desktop and mobile preview content. Shared desktop and mobile preview content. Shared desktop and mobile preview content. Shared desktop and mobile preview content. Shared desktop and mobile preview content. Shared desktop and mobile preview content. Shared desktop and mobile preview content.\n\n' \
    "$padded" "$padded" >> "$content_file"
  if (( index > 0 && index % 40 == 0 )); then
    image_index="$(printf '%02d' "$((index / 40))")"
    printf -- '![Large attachment %s](large-content-assets/large-%s.png)\n\n' "$image_index" "$image_index" >> "$content_file"
  fi
  index=$((index + 1))
done

sips -z 3072 3072 "$project_root/src-tauri/icons/128x128.png" --out "$asset_dir/large-00.png" >/dev/null
asset_count=$(((section_count - 1) / 40 + 1))
index=1
while (( index < asset_count )); do
  image_index="$(printf '%02d' "$index")"
  cp "$asset_dir/large-00.png" "$asset_dir/large-$image_index.png"
  index=$((index + 1))
done

printf -- '{\n  "id": "performance",\n  "title": "Performance board",\n  "groupBy": "status",\n  "columns": [\n    { "key": "todo", "name": "To do" },\n    { "key": "doing", "name": "Doing" },\n    { "key": "done", "name": "Done" }\n  ],\n  "doneColumn": "done"\n}\n' > "$fixture_dir/performance.board"

index=0
while (( index < card_count )); do
  padded="$(printf '%05d' "$index")"
  case $((index % 3)) in
    0) status="todo" ;;
    1) status="doing" ;;
    *) status="done" ;;
  esac
  printf -- '---\ntitle: Large card %s\nboard: performance\nstatus: %s\nposition: %d\npriority: medium\n---\n\nLarge board card fixture %s.\n' \
    "$padded" "$status" "$((index / 3))" "$padded" > "$board_dir/large-card-$padded.md"
  index=$((index + 1))
done

if [[ "$platform" == "android" ]]; then
  adb get-state >/dev/null
  adb shell am force-stop "$app_id"
  fixture_tar="$fixture_root/jtype-large-content.tar"
  COPYFILE_DISABLE=1 tar -C "$fixture_dir" -cf "$fixture_tar" .
  adb push "$fixture_tar" /data/local/tmp/jtype-large-content.tar >/dev/null
  adb shell "run-as $app_id sh -c 'mkdir -p vaults/default && rm -f vaults/default/large-content.md vaults/default/performance.board && rm -rf vaults/default/performance vaults/default/large-content-assets && tar -xf /data/local/tmp/jtype-large-content.tar -C vaults/default'" >/dev/null
  adb shell rm -f /data/local/tmp/jtype-large-content.tar
  actual_sections="$(adb shell "run-as $app_id sh -c 'grep -c \"^## Section\" vaults/default/large-content.md'" | tr -d '\r[:space:]')"
  actual_cards="$(adb shell "run-as $app_id sh -c 'find vaults/default/performance -maxdepth 1 -type f -name \"large-card-*.md\" | wc -l'" | tr -d '\r[:space:]')"
  actual_assets="$(adb shell "run-as $app_id sh -c 'find vaults/default/large-content-assets -maxdepth 1 -type f -name \"large-*.png\" | wc -l'" | tr -d '\r[:space:]')"
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
  rm -f "$vault_dir/large-content.md" "$vault_dir/performance.board"
  rm -rf "$vault_dir/performance" "$vault_dir/large-content-assets"
  cp -R "$fixture_dir"/. "$vault_dir"/
  actual_sections="$(grep -c '^## Section' "$vault_dir/large-content.md" | tr -d '[:space:]')"
  actual_cards="$(find "$vault_dir/performance" -maxdepth 1 -type f -name 'large-card-*.md' | wc -l | tr -d '[:space:]')"
  actual_assets="$(find "$vault_dir/large-content-assets" -maxdepth 1 -type f -name 'large-*.png' | wc -l | tr -d '[:space:]')"
fi

if [[ "$actual_sections" != "$section_count" || "$actual_cards" != "$card_count" || "$actual_assets" != "$asset_count" ]]; then
  echo "fixture verification failed: sections=$actual_sections/$section_count cards=$actual_cards/$card_count assets=$actual_assets/$asset_count" >&2
  exit 1
fi

echo "seeded large content for $platform: $actual_sections sections, $actual_cards cards, $actual_assets large images ($app_id)"
