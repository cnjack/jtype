The `jtype` CLI brings your vault to the terminal. It reads and writes the plain Markdown files in whatever folder you're standing in, and — once you sign in — it can sync those files to a cloud workspace, drive kanban boards, and mint tokens for AI tools.

It's the same product as the desktop app, just keyboard-first: great for capturing a note mid-command, scripting, or piping output from another tool straight into your notes.

## Install it (pick one)

**From the desktop app — easiest.** Open **Settings → Tools → Command line** and click **Install jtype to your PATH**. The app downloads the right binary for your OS and puts it on your PATH. Nothing else to configure.

**macOS / Linux — one line:**

```sh
curl -fsSL https://raw.githubusercontent.com/cnjack/jtype/main/scripts/install.sh | sh
```

**Windows — PowerShell:**

```powershell
irm https://raw.githubusercontent.com/cnjack/jtype/main/scripts/install.ps1 | iex
```

**From source — if you have Rust:**

```sh
cargo install --path services/jtype-cli
```

Confirm it landed by checking the version:

```sh
jtype --version
```

If the command isn't found, open a new terminal so your updated PATH is picked up.

## Sign in

Note commands work offline and need no account — that's the whole point of local-first. You only sign in when you want the cloud: sync, kanban, tokens, or the MCP bridge.

Login is browser-based. The CLI never asks for your password — it starts a device flow and you approve it in your browser:

```sh
jtype login
```

You'll see something like:

```text
To authorize the jtype CLI:
  1. Open:          http://localhost:13345/device
  2. Approve code:  WDJF-QXMP

Waiting for approval…
```

Open that URL, confirm the code matches, and approve. The CLI stores your session and prints a checkmark. The approval code is single-use and expires in 10 minutes, so finish promptly.

## Confirm you're signed in

```sh
jtype whoami
```

It prints your account, for example `ada (user)`. To sign out on this machine:

```sh
jtype logout
```

## Point at a different server

By default the CLI talks to `http://localhost:13345`. To use a hosted JType, add `--server` to any command (or it's remembered per bound vault):

```sh
jtype --server https://notes.example.com login
```

## Where to go next

- Start capturing and syncing notes in [Notes, bind & sync from the CLI](/help/c/cli/notes-bind-sync).
- New to the whole model? Read [How JType works](/help/c/getting-started/the-jtype-flow).
- Wiring up an assistant? See [Connect your AI](/help/c/ai-mcp/connect-your-ai) — `jtype token create` and `jtype mcp-stdio` live there.
