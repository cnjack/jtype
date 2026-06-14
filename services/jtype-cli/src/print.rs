//! Output helpers.

use serde_json::Value;

/// Emit a JSON value (pretty). The `json` flag is accepted for call-site
/// symmetry; structured values are always rendered as pretty JSON.
pub fn emit(_json: bool, v: &Value) {
    println!("{}", serde_json::to_string_pretty(v).unwrap_or_else(|_| v.to_string()));
}
