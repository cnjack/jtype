pub mod board_memberships;
pub mod migrations;
pub mod models;

use sqlx::{mysql::MySqlPoolOptions, MySql, Pool};
use std::env;

pub async fn connect() -> Result<Pool<MySql>, sqlx::Error> {
    let database_url = env::var("JTYPED_DATABASE_URL")
        .or_else(|_| env::var("DATABASE_URL"))
        .unwrap_or_else(|_| "mysql://jtype:jtype-local@127.0.0.1:3306/jtype".to_string());

    MySqlPoolOptions::new()
        .max_connections(8)
        .connect(&database_url)
        .await
}
