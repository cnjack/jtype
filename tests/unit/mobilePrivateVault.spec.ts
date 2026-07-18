import { expect, test } from "@playwright/test";
import {
  rebaseAppPrivateVaultPath,
  rebaseAppPrivateVaultRecents,
} from "../../src/lib/mobilePrivateVault";

const current = "/new/container/Library/Application Support/net.jcode.jtype/vaults/default";

test("rebases stale app-private vault and document paths after a container move", () => {
  expect(rebaseAppPrivateVaultPath(
    "/old/container/Library/Application Support/net.jcode.jtype/vaults/default",
    current,
  )).toBe(current);
  expect(rebaseAppPrivateVaultPath(
    "/old/container/Library/Application Support/net.jcode.jtype/vaults/default/notes/today.md",
    current,
  )).toBe(`${current}/notes/today.md`);
  expect(rebaseAppPrivateVaultPath(
    "/old/container/Library/Application Support/net.jcode.jtype/vaults/external/provider-1/notes/today.md",
    current,
  )).toBe("/new/container/Library/Application Support/net.jcode.jtype/vaults/external/provider-1/notes/today.md");
  expect(rebaseAppPrivateVaultPath("/external/notes/today.md", current))
    .toBe("/external/notes/today.md");
});

test("rebases and deduplicates recent items without changing their kind", () => {
  const recents = rebaseAppPrivateVaultRecents([
    {
      kind: "workspace",
      name: "default",
      path: "/old/container/Library/Application Support/net.jcode.jtype/vaults/default",
    },
    { kind: "workspace", name: "default", path: current },
    {
      kind: "file",
      name: "today.md",
      path: "/old/container/Library/Application Support/net.jcode.jtype/vaults/default/today.md",
    },
    {
      kind: "workspace",
      name: "Device Notes",
      path: "/old/container/Library/Application Support/net.jcode.jtype/vaults/external/provider-1",
    },
  ], current);

  expect(recents).toEqual([
    { kind: "workspace", name: "default", path: current },
    { kind: "file", name: "today.md", path: `${current}/today.md` },
    {
      kind: "workspace",
      name: "Device Notes",
      path: "/new/container/Library/Application Support/net.jcode.jtype/vaults/external/provider-1",
    },
  ]);
});
