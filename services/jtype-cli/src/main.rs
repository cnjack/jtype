//! jtype — manage JType notes and kanban projects from the terminal or AI agents.
//!
//! Notes are **local-first**: when run inside a vault (a `.jtype/`-marked folder,
//! discovered from the cwd) the `note` commands read/write the vault's `.md` files
//! directly, and create/update additionally write-through to the bound cloud
//! workspace. Board/card stay cloud (remote). Auth is the OAuth device flow
//! (`jtype login`). The same binary doubles as a local stdio MCP server (`jtype mcp-stdio`).

mod auth;
mod client;
mod config;
mod kanban;
mod mcpstdio;
mod notes;
mod print;
mod sync;
mod tokens;
mod vault;

use anyhow::{anyhow, Result};
use clap::{Parser, Subcommand};

use client::ApiClient;
use config::Config;

#[derive(Parser)]
#[command(name = "jtype", version, about = "Manage JType notes & kanban from the terminal or AI agents")]
struct Cli {
    /// Override the server URL (default: from config or http://localhost:13345).
    #[arg(long, global = true)]
    server: Option<String>,
    /// Emit machine-readable JSON for read commands.
    #[arg(long, global = true)]
    json: bool,
    /// Operate on the vault at this path instead of discovering one from the cwd.
    #[arg(long, global = true)]
    vault: Option<String>,
    #[command(subcommand)]
    command: Command,
}

#[derive(Subcommand)]
enum Command {
    /// Log in via the OAuth device flow.
    Login,
    /// Clear the stored credentials.
    Logout,
    /// Show the authenticated account.
    Whoami,
    /// Workspace commands.
    Workspace {
        #[command(subcommand)]
        cmd: WorkspaceCmd,
    },
    /// Note (Markdown document) commands — local-first against the cwd vault.
    Note {
        #[command(subcommand)]
        cmd: NoteCmd,
    },
    /// Bind the current vault to a cloud workspace (writes .jtype/cloud.json).
    Bind {
        /// Cloud workspace id, name, or slug.
        #[arg(long)]
        workspace: String,
    },
    /// Vault inspection commands.
    Vault {
        #[command(subcommand)]
        cmd: VaultCmd,
    },
    /// Sync the current vault with its bound cloud workspace (pull + push).
    Sync,
    /// Kanban board commands.
    Board {
        #[command(subcommand)]
        cmd: BoardCmd,
    },
    /// Kanban card commands.
    Card {
        #[command(subcommand)]
        cmd: CardCmd,
    },
    /// Manage scoped MCP tokens for AI clients.
    Token {
        #[command(subcommand)]
        cmd: TokenCmd,
    },
    /// Run a local stdio MCP server bridging to the HTTP `/mcp` endpoint.
    #[command(name = "mcp-stdio")]
    McpStdio,
}

#[derive(Subcommand)]
enum TokenCmd {
    /// Mint a new scoped MCP token (shown once).
    Create {
        #[arg(long)]
        label: Option<String>,
        #[arg(long = "ttl-days")]
        ttl_days: Option<i64>,
    },
    /// List your tokens.
    List,
    /// Revoke a token by its id.
    Revoke { id: String },
}

#[derive(Subcommand)]
enum WorkspaceCmd {
    /// List workspaces.
    List,
}

#[derive(Subcommand)]
enum VaultCmd {
    /// Show the current vault root + cloud binding.
    Status,
}

#[derive(Subcommand)]
enum NoteCmd {
    /// List notes (optionally within a folder).
    List {
        #[arg(long)]
        workspace: Option<String>,
        #[arg(long)]
        folder: Option<String>,
    },
    /// Print a note's Markdown by path.
    Get {
        #[arg(long)]
        workspace: Option<String>,
        path: String,
    },
    /// Search notes by keyword.
    Search {
        #[arg(long)]
        workspace: Option<String>,
        query: String,
        #[arg(long, default_value_t = 10)]
        limit: usize,
    },
    /// Create or overwrite a note. Content via --content, --file, or stdin (`-`).
    Create {
        #[arg(long)]
        workspace: Option<String>,
        path: String,
        #[arg(long)]
        content: Option<String>,
        #[arg(long)]
        file: Option<String>,
        #[arg(long)]
        title: Option<String>,
    },
    /// Replace a note's content.
    Update {
        #[arg(long)]
        workspace: Option<String>,
        path: String,
        #[arg(long)]
        content: Option<String>,
        #[arg(long)]
        file: Option<String>,
    },
}

#[derive(Subcommand)]
enum BoardCmd {
    /// List boards.
    List {
        #[arg(long)]
        workspace: Option<String>,
    },
    /// Show a board with columns and cards.
    Get {
        #[arg(long)]
        workspace: Option<String>,
        board: String,
    },
}

#[derive(Subcommand)]
enum CardCmd {
    /// List cards on a board.
    List {
        #[arg(long)]
        workspace: Option<String>,
        #[arg(long)]
        board: String,
        #[arg(long)]
        column: Option<String>,
    },
    /// Create a card.
    Create {
        #[arg(long)]
        workspace: Option<String>,
        #[arg(long)]
        board: String,
        #[arg(long)]
        column: String,
        title: String,
        #[arg(long)]
        description: Option<String>,
        #[arg(long)]
        priority: Option<String>,
        #[arg(long)]
        assignee: Option<String>,
    },
    /// Update a card's fields.
    Update {
        #[arg(long)]
        workspace: Option<String>,
        card: String,
        #[arg(long)]
        title: Option<String>,
        #[arg(long)]
        description: Option<String>,
        #[arg(long)]
        priority: Option<String>,
        #[arg(long)]
        assignee: Option<String>,
    },
    /// Move a card to another column (status change).
    Move {
        #[arg(long)]
        workspace: Option<String>,
        #[arg(long)]
        board: String,
        card: String,
        #[arg(long, name = "to-column")]
        to_column: String,
        #[arg(long, default_value_t = 0)]
        position: i64,
    },
}

/// Restore default SIGPIPE behaviour so piping into `head`/`grep -q` exits
/// quietly instead of panicking on "Broken pipe" (Rust ignores SIGPIPE by default).
#[cfg(unix)]
fn reset_sigpipe() {
    unsafe {
        libc::signal(libc::SIGPIPE, libc::SIG_DFL);
    }
}
#[cfg(not(unix))]
fn reset_sigpipe() {}

#[tokio::main]
async fn main() {
    reset_sigpipe();
    if let Err(e) = run().await {
        eprintln!("error: {e:#}");
        std::process::exit(1);
    }
}

/// Resolve a cloud workspace id for a REMOTE command: explicit `--workspace`, else the
/// bound `workspaceId` of the cwd vault, else a readable error.
fn resolve_remote_ws(explicit: Option<&str>, vault_opt: Option<&str>) -> Result<String> {
    if let Some(ws) = explicit {
        return Ok(ws.to_string());
    }
    if let Ok(root) = vault::require_vault(vault_opt) {
        if let Some(b) = vault::load_binding(&root) {
            if b.is_bound() {
                return Ok(b.workspace_id);
            }
        }
    }
    Err(anyhow!(
        "--workspace required (or run `jtype bind` in a vault to set a default workspace)"
    ))
}

async fn run() -> Result<()> {
    let cli = Cli::parse();
    let mut cfg = Config::load()?;
    if let Some(server) = &cli.server {
        cfg.server_url = server.clone();
    }
    let json = cli.json;
    let client = || ApiClient::new(cfg.server_url.clone(), cfg.token.clone());

    match cli.command {
        Command::Login => auth::login(&mut cfg).await?,
        Command::Logout => {
            cfg.token = None;
            cfg.username = None;
            cfg.save()?;
            println!("✓ Logged out.");
        }
        Command::Whoami => {
            let me = auth::whoami(&cfg).await?;
            if json {
                print::emit(true, &me);
            } else {
                println!(
                    "{} ({})",
                    me["username"].as_str().unwrap_or("?"),
                    me["role"].as_str().unwrap_or("user")
                );
            }
        }
        Command::Workspace { cmd } => match cmd {
            WorkspaceCmd::List => {
                cfg.require_token()?;
                notes::list_workspaces(&client(), json).await?
            }
        },
        Command::Note { cmd } => match cmd {
            NoteCmd::List { folder, .. } => {
                let root = vault::require_vault(cli.vault.as_deref())?;
                notes::list_notes_local(&root, folder.as_deref(), json)?
            }
            NoteCmd::Get { path, .. } => {
                let root = vault::require_vault(cli.vault.as_deref())?;
                notes::get_note_local(&root, &path, json)?
            }
            NoteCmd::Search { query, limit, .. } => {
                let root = vault::require_vault(cli.vault.as_deref())?;
                notes::search_notes_local(&root, &query, limit, json)?
            }
            NoteCmd::Create { path, content, file, title, workspace } => {
                let root = vault::vault_or_init(cli.vault.as_deref())?;
                let body = notes::read_content(content, file)?;
                notes::save_note_local(&root, &cfg, workspace.as_deref(), &path, &body, title.as_deref(), json).await?
            }
            NoteCmd::Update { path, content, file, workspace } => {
                let root = vault::vault_or_init(cli.vault.as_deref())?;
                let body = notes::read_content(content, file)?;
                notes::save_note_local(&root, &cfg, workspace.as_deref(), &path, &body, None, json).await?
            }
        },
        Command::Bind { workspace } => {
            cfg.require_token()?;
            let root = vault::vault_or_init(cli.vault.as_deref())?;
            let (id, name, slug) = notes::resolve_workspace(&client(), &workspace).await?;
            let binding = vault::CloudBinding {
                workspace_id: id.clone(),
                server_url: cfg.server_url.clone(),
                workspace_name: name.clone(),
                workspace_slug: slug,
                last_pulled_clock: 0,
            };
            vault::save_binding(&root, &binding)?;
            if json {
                print::emit(
                    true,
                    &serde_json::json!({ "vault": root.display().to_string(), "workspaceId": id, "workspaceName": name }),
                );
            } else {
                println!("✓ bound {} → {} ({})", root.display(), name, id);
            }
        }
        Command::Vault { cmd } => match cmd {
            VaultCmd::Status => {
                let root = vault::require_vault(cli.vault.as_deref())?;
                let binding = vault::load_binding(&root);
                if json {
                    print::emit(
                        true,
                        &serde_json::json!({ "vault": root.display().to_string(), "binding": binding }),
                    );
                } else {
                    println!("vault:  {}", root.display());
                    match binding {
                        Some(b) if b.is_bound() => {
                            println!("bound:  {} ({})", b.workspace_name, b.workspace_id);
                            let server = if b.server_url.is_empty() {
                                cfg.server_url.clone()
                            } else {
                                b.server_url
                            };
                            println!("server: {server}");
                            println!("clock:  {}", b.last_pulled_clock);
                        }
                        _ => println!("bound:  (not bound — run `jtype bind --workspace <id|name>`)"),
                    }
                }
            }
        },
        Command::Sync => {
            let root = vault::require_vault(cli.vault.as_deref())?;
            sync::sync(&cfg, &root, json).await?
        }
        Command::Board { cmd } => {
            cfg.require_token()?;
            let c = client();
            match cmd {
                BoardCmd::List { workspace } => {
                    let ws = resolve_remote_ws(workspace.as_deref(), cli.vault.as_deref())?;
                    kanban::list_boards(&c, &ws, json).await?
                }
                BoardCmd::Get { workspace, board } => {
                    let ws = resolve_remote_ws(workspace.as_deref(), cli.vault.as_deref())?;
                    kanban::get_board(&c, &ws, &board, json).await?
                }
            }
        }
        Command::Card { cmd } => {
            cfg.require_token()?;
            let c = client();
            match cmd {
                CardCmd::List { workspace, board, column } => {
                    let ws = resolve_remote_ws(workspace.as_deref(), cli.vault.as_deref())?;
                    kanban::list_cards(&c, &ws, &board, column.as_deref(), json).await?
                }
                CardCmd::Create {
                    workspace, board, column, title, description, priority, assignee,
                } => {
                    let ws = resolve_remote_ws(workspace.as_deref(), cli.vault.as_deref())?;
                    kanban::create_card(
                        &c, &ws, &board, &column, &title,
                        description.as_deref(), priority.as_deref(), assignee.as_deref(), json,
                    )
                    .await?
                }
                CardCmd::Update {
                    workspace, card, title, description, priority, assignee,
                } => {
                    let ws = resolve_remote_ws(workspace.as_deref(), cli.vault.as_deref())?;
                    kanban::update_card(
                        &c, &ws, &card, title.as_deref(),
                        description.as_deref(), priority.as_deref(), assignee.as_deref(), json,
                    )
                    .await?
                }
                CardCmd::Move { workspace, board, card, to_column, position } => {
                    let ws = resolve_remote_ws(workspace.as_deref(), cli.vault.as_deref())?;
                    kanban::move_card(&c, &ws, &board, &card, &to_column, position, json).await?
                }
            }
        }
        Command::Token { cmd } => {
            cfg.require_token()?;
            let c = client();
            match cmd {
                TokenCmd::Create { label, ttl_days } => {
                    tokens::create(&c, label.as_deref(), ttl_days, json).await?
                }
                TokenCmd::List => tokens::list(&c, json).await?,
                TokenCmd::Revoke { id } => tokens::revoke(&c, &id).await?,
            }
        }
        Command::McpStdio => {
            cfg.require_token()?;
            mcpstdio::run(&client()).await?
        }
    }
    Ok(())
}
