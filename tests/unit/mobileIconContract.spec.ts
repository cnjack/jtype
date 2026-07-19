import { expect, test } from "@playwright/test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = process.cwd();
const canonicalRoot = "src-tauri/icons/android";
const generatedRoot = "src-tauri/gen/android/app/src/main/res";

function bytes(path: string) {
  return readFileSync(resolve(root, path));
}

function text(path: string) {
  return bytes(path).toString("utf8").trim();
}

test("generated Android launcher icons stay aligned with the canonical JType icon", () => {
  const densities = ["mdpi", "hdpi", "xhdpi", "xxhdpi", "xxxhdpi"];
  const files = ["ic_launcher.png", "ic_launcher_foreground.png", "ic_launcher_round.png"];

  for (const density of densities) {
    for (const file of files) {
      const canonical = bytes(`${canonicalRoot}/mipmap-${density}/${file}`);
      const generated = bytes(`${generatedRoot}/mipmap-${density}/${file}`);
      expect(generated.equals(canonical), `mipmap-${density}/${file}`).toBe(true);
    }
  }

  expect(text(`${generatedRoot}/mipmap-anydpi-v26/ic_launcher.xml`)).toBe(
    text(`${canonicalRoot}/mipmap-anydpi-v26/ic_launcher.xml`),
  );
  expect(text(`${generatedRoot}/values/ic_launcher_background.xml`)).toBe(
    text(`${canonicalRoot}/values/ic_launcher_background.xml`),
  );

  const manifest = text("src-tauri/gen/android/app/src/main/AndroidManifest.xml");
  expect(manifest).toContain('android:icon="@mipmap/ic_launcher"');
  expect(manifest).toContain('android:roundIcon="@mipmap/ic_launcher_round"');
});
