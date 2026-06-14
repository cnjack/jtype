//! Kanban board + card commands.

use anyhow::Result;
use serde_json::{json, Value};

use crate::client::ApiClient;
use crate::print::emit;

pub async fn list_boards(client: &ApiClient, ws: &str, json: bool) -> Result<()> {
    let boards = client.get(&format!("/api/v1/workspaces/{ws}/kanban/boards")).await?;
    if json {
        emit(true, &boards);
    } else {
        println!("{:<38}  {:<24}  {:>5}  {:>5}", "ID", "NAME", "COLS", "CARDS");
        for b in boards.as_array().cloned().unwrap_or_default() {
            println!(
                "{:<38}  {:<24}  {:>5}  {:>5}",
                b["id"].as_str().unwrap_or("-"),
                b["name"].as_str().unwrap_or("-"),
                b["columnCount"].as_i64().unwrap_or(0),
                b["cardCount"].as_i64().unwrap_or(0),
            );
        }
    }
    Ok(())
}

pub async fn get_board(client: &ApiClient, ws: &str, board: &str, json: bool) -> Result<()> {
    let b = client
        .get(&format!("/api/v1/workspaces/{ws}/kanban/boards/{board}"))
        .await?;
    if json {
        emit(true, &b);
        return Ok(());
    }
    println!("# {}\n", b["name"].as_str().unwrap_or("Board"));
    let cards = b["cards"].as_array().cloned().unwrap_or_default();
    for col in b["columns"].as_array().cloned().unwrap_or_default() {
        let cid = col["id"].as_str().unwrap_or("");
        println!("## {} ({})", col["name"].as_str().unwrap_or("-"), cid);
        for c in cards.iter().filter(|c| c["columnId"].as_str() == Some(cid)) {
            let pr = c["priority"].as_str().unwrap_or("none");
            println!("  - [{}] {}  · {}", pr, c["title"].as_str().unwrap_or("-"), c["id"].as_str().unwrap_or(""));
        }
        println!();
    }
    Ok(())
}

pub async fn list_cards(
    client: &ApiClient,
    ws: &str,
    board: &str,
    column: Option<&str>,
    json: bool,
) -> Result<()> {
    let cards = client
        .get(&format!("/api/v1/workspaces/{ws}/kanban/boards/{board}/cards"))
        .await?;
    let arr: Vec<Value> = cards
        .as_array()
        .cloned()
        .unwrap_or_default()
        .into_iter()
        .filter(|c| column.is_none() || c["columnId"].as_str() == column)
        .collect();
    if json {
        emit(true, &json!(arr));
    } else {
        for c in &arr {
            println!(
                "[{}] {}  · {}",
                c["priority"].as_str().unwrap_or("none"),
                c["title"].as_str().unwrap_or("-"),
                c["id"].as_str().unwrap_or("")
            );
        }
        println!("\n{} card(s)", arr.len());
    }
    Ok(())
}

#[allow(clippy::too_many_arguments)]
pub async fn create_card(
    client: &ApiClient,
    ws: &str,
    board: &str,
    column: &str,
    title: &str,
    description: Option<&str>,
    priority: Option<&str>,
    assignee: Option<&str>,
    json: bool,
) -> Result<()> {
    let mut body = json!({ "columnId": column, "title": title });
    if let Some(d) = description {
        body["description"] = json!(d);
    }
    if let Some(p) = priority {
        body["priority"] = json!(p);
    }
    if let Some(a) = assignee {
        body["assigneeUserId"] = json!(a);
    }
    let card = client
        .post(&format!("/api/v1/workspaces/{ws}/kanban/boards/{board}/cards"), body)
        .await?;
    if json {
        emit(true, &card);
    } else {
        println!(
            "✓ created card {} — {}",
            card["id"].as_str().unwrap_or("?"),
            card["title"].as_str().unwrap_or(title)
        );
    }
    Ok(())
}

pub async fn update_card(
    client: &ApiClient,
    ws: &str,
    card: &str,
    title: Option<&str>,
    description: Option<&str>,
    priority: Option<&str>,
    assignee: Option<&str>,
    json: bool,
) -> Result<()> {
    let mut body = serde_json::Map::new();
    if let Some(t) = title {
        body.insert("title".into(), json!(t));
    }
    if let Some(d) = description {
        body.insert("description".into(), json!(d));
    }
    if let Some(p) = priority {
        body.insert("priority".into(), json!(p));
    }
    if let Some(a) = assignee {
        body.insert("assigneeUserId".into(), json!(a));
    }
    if body.is_empty() {
        anyhow::bail!("provide at least one field to update (--title/--description/--priority/--assignee)");
    }
    let res = client
        .patch(&format!("/api/v1/workspaces/{ws}/kanban/cards/{card}"), Value::Object(body))
        .await?;
    if json {
        emit(true, &res);
    } else {
        println!("✓ updated card {card}");
    }
    Ok(())
}

pub async fn move_card(
    client: &ApiClient,
    ws: &str,
    board: &str,
    card: &str,
    to_column: &str,
    position: i64,
    json: bool,
) -> Result<()> {
    let body = json!({ "cardId": card, "targetColumnId": to_column, "targetPosition": position });
    let res = client
        .post(&format!("/api/v1/workspaces/{ws}/kanban/boards/{board}/cards/move"), body)
        .await?;
    if json {
        emit(true, &res);
    } else {
        println!("✓ moved card {card} → column {to_column}");
    }
    Ok(())
}
