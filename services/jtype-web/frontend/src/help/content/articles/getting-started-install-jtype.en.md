Getting JType onto your machine takes about a minute. Download the desktop app, open it, and you're writing — no account required. The optional `jtype` CLI and cloud sign-in are there when you want them, not before.

## Install the desktop app

Grab the installer for your operating system from the [**latest release page**](https://github.com/cnjack/jtype/releases/latest):

| Operating system | File to download |
|---|---|
| macOS (Apple Silicon — M1 and later) | `JType_*_aarch64.dmg` |
| macOS (Intel) | `JType_*_x64.dmg` |
| Windows (64-bit) | `JType_*_x64-setup.exe` |

- **macOS:** open the `.dmg` and drag **JType** into your Applications folder, then launch it.
- **Windows:** run the `x64-setup.exe` installer and follow the prompts.

If you're not sure which Mac you have, click the Apple menu and choose **About This Mac** — "Apple M-series" means the `aarch64` build, "Intel" means the `x64` build.

## First launch: the welcome screen

The first time you open JType, you land on a **welcome screen** instead of an empty editor. From here you can:

- **Use the default vault** — JType creates and opens a folder at `~/Documents/.jtype`. This is the fastest way to start.
- **Open vault** — point JType at any existing folder of Markdown files.
- **Open Markdown file** — open a single `.md` file in a focused editor.
- **Recent items** — jump straight back into a vault or file you opened before.

You do **not** need to sign in to write. Everything you create stays on your disk as plain `.md` files. Browser-based OAuth sign-in is **optional** and only needed later for cloud features like sync, sharing, kanban, and publishing.

Want the full picture of those concepts first? Read [How JType works](/help/c/getting-started/the-jtype-flow). Otherwise, head to [Open your first vault](/help/c/getting-started/your-first-vault).

## Install the CLI (optional)

The `jtype` command-line tool lets you read and write your vault, sync, and manage boards from a terminal. It's optional — install it only if you live in the shell. Pick whichever is easiest:

- **From the desktop app:** Settings → **Tools → Command line** → **Install jtype to your PATH**.
- **macOS / Linux:**
  ```sh
  curl -fsSL https://raw.githubusercontent.com/cnjack/jtype/main/scripts/install.sh | sh
  ```
- **Windows (PowerShell):**
  ```powershell
  irm https://raw.githubusercontent.com/cnjack/jtype/main/scripts/install.ps1 | iex
  ```
- **From source (needs Rust):**
  ```sh
  cargo install --path services/jtype-cli
  ```

Verify it installed:

```sh
jtype whoami
```

For full CLI setup and sign-in, see [Install the CLI & sign in](/help/c/cli/install-and-login).

## Next steps

- [Open your first vault](/help/c/getting-started/your-first-vault) — create a note and try write / split / preview.
- [Connect your AI](/help/c/ai-mcp/connect-your-ai) — let an assistant read and update your notes.
