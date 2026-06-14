//! jtype — manage JType notes and kanban projects from the terminal or AI agents.
//!
//! Auth is the OAuth device flow (`jtype login`). The same binary doubles as a
//! local stdio MCP server (`jtype mcp-stdio`).

mod auth;
mod client;
mod config;
mod kanban;
mod mcpstdio;
mod notes;
mod print;
mod tokens;

use anyhow::Result;
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
    /// Note (Markdown document) commands.
    Note {
        #[command(subcommand)]
        cmd: NoteCmd,
    },
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
enum NoteCmd {
    /// List notes (optionally within a folder).
    List {
        #[arg(long)]
        workspace: String,
        #[arg(long)]
        folder: Option<String>,
    },
    /// Print a note's Markdown by path.
    Get {
        #[arg(long)]
        workspace: String,
        path: String,
    },
    /// Search notes by keyword.
    Search {
        #[arg(long)]
        workspace: String,
        query: String,
        #[arg(long, default_value_t = 10)]
        limit: usize,
    },
    /// Create or overwrite a note. Content via --content, --file, or stdin (`-`).
    Create {
        #[arg(long)]
        workspace: String,
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
        workspace: String,
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
        workspace: String,
    },
    /// Show a board with columns and cards.
    Get {
        #[arg(long)]
        workspace: String,
        board: String,
    },
}

#[derive(Subcommand)]
enum CardCmd {
    /// List cards on a board.
    List {
        #[arg(long)]
        workspace: String,
        #[arg(long)]
        board: String,
        #[arg(long)]
        column: Option<String>,
    },
    /// Create a card.
    Create {
        #[arg(long)]
        workspace: String,
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
        workspace: String,
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
        workspace: String,
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
            WorkspaceCmd::List => notes::list_workspaces(&client(), json).await?,
        },
        Command::Note { cmd } => {
            let c = client();
            match cmd {
                NoteCmd::List { workspace, folder } => {
                    notes::list_notes(&c, &workspace, folder.as_deref(), json).await?
                }
                NoteCmd::Get { workspace, path } => {
                    notes::get_note(&c, &workspace, &path, json).await?
                }
                NoteCmd::Search { workspace, query, limit } => {
                    notes::search_notes(&c, &workspace, &query, limit, json).await?
                }
                NoteCmd::Create { workspace, path, content, file, title } => {
                    let body = notes::read_content(content, file)?;
                    notes::save_note(&c, &workspace, &path, &body, title.as_deref(), json).await?
                }
                NoteCmd::Update { workspace, path, content, file } => {
                    let body = notes::read_content(content, file)?;
                    notes::save_note(&c, &workspace, &path, &body, None, json).await?
                }
            }
        }
        Command::Board { cmd } => {
            let c = client();
            match cmd {
                BoardCmd::List { workspace } => kanban::list_boards(&c, &workspace, json).await?,
                BoardCmd::Get { workspace, board } => {
                    kanban::get_board(&c, &workspace, &board, json).await?
                }
            }
        }
        Command::Card { cmd } => {
            let c = client();
            match cmd {
                CardCmd::List { workspace, board, column } => {
                    kanban::list_cards(&c, &workspace, &board, column.as_deref(), json).await?
                }
                CardCmd::Create {
                    workspace, board, column, title, description, priority, assignee,
                } => {
                    kanban::create_card(
                        &c, &workspace, &board, &column, &title,
                        description.as_deref(), priority.as_deref(), assignee.as_deref(), json,
                    )
                    .await?
                }
                CardCmd::Update {
                    workspace, card, title, description, priority, assignee,
                } => {
                    kanban::update_card(
                        &c, &workspace, &card, title.as_deref(),
                        description.as_deref(), priority.as_deref(), assignee.as_deref(), json,
                    )
                    .await?
                }
                CardCmd::Move { workspace, board, card, to_column, position } => {
                    kanban::move_card(&c, &workspace, &board, &card, &to_column, position, json).await?
                }
            }
        }
        Command::Token { cmd } => {
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
