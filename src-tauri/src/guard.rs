//! Authorization for the raw-SQL channel between the webview and SQLite.
//!
//! The webview can call `execute_query` with any SQL, so UI-only role checks are
//! cosmetic. This module classifies each statement by the tables it writes and the
//! role it needs, and the backend refuses what the logged-in session may not do.

#[derive(Debug, PartialEq, Eq)]
pub enum Verdict {
    Allow,
    /// Needs super_admin, admin or manager.
    NeedAdmin,
    NeedSuperAdmin,
    Deny(&'static str),
}

pub fn is_admin_role(role: &str) -> bool {
    matches!(role, "super_admin" | "admin" | "manager")
}

/// Tables nobody may write through raw SQL (users have dedicated commands).
const DENIED_TABLES: &[&str] = &["users", "_sqlx_migrations"];

const SUPER_ADMIN_TABLES: &[&str] = &["admin_settings"];

/// Config and money-movement tables only admin-level roles may write.
const ADMIN_TABLES: &[&str] = &[
    "suppliers",
    "business_expenses",
    "product_price_history",
    "product_units",
    "common_units",
    "purchase_orders",
    "purchase_order_items",
    "supplier_payables",
    "supplier_payments",
    "supplier_payment_allocations",
    "sale_returns",
    "sale_return_items",
];

fn tokenize(query: &str) -> Vec<String> {
    query
        .to_lowercase()
        .chars()
        .map(|c| {
            if c.is_alphanumeric() || c == '_' || c == '.' {
                c
            } else {
                ' '
            }
        })
        .collect::<String>()
        .split_whitespace()
        .map(|t| t.trim_start_matches("main.").to_string())
        .collect()
}

#[derive(Debug, PartialEq)]
enum Op {
    Insert,
    Update,
    Delete,
}

/// Every (operation, table) a statement writes to.
fn writes(tokens: &[String]) -> Vec<(Op, String)> {
    let mut out = Vec::new();
    for (i, t) in tokens.iter().enumerate() {
        match t.as_str() {
            "insert" => {
                let mut j = i + 1;
                if tokens.get(j).map(String::as_str) == Some("or") {
                    j += 2;
                }
                if tokens.get(j).map(String::as_str) == Some("into") {
                    if let Some(table) = tokens.get(j + 1) {
                        out.push((Op::Insert, table.clone()));
                    }
                }
            }
            "replace" => {
                if tokens.get(i + 1).map(String::as_str) == Some("into") {
                    if let Some(table) = tokens.get(i + 2) {
                        out.push((Op::Insert, table.clone()));
                    }
                }
            }
            "update" => {
                let mut j = i + 1;
                if tokens.get(j).map(String::as_str) == Some("or") {
                    j += 2;
                }
                // "ON CONFLICT DO UPDATE SET ..." is part of an insert, not a new write.
                match tokens.get(j).map(String::as_str) {
                    Some("set") | None => {}
                    Some(table) => out.push((Op::Update, table.to_string())),
                }
            }
            "delete" => {
                if tokens.get(i + 1).map(String::as_str) == Some("from") {
                    if let Some(table) = tokens.get(i + 2) {
                        out.push((Op::Delete, table.clone()));
                    }
                }
            }
            _ => {}
        }
    }
    out
}

fn max_verdict(a: Verdict, b: Verdict) -> Verdict {
    use Verdict::*;
    match (&a, &b) {
        (Deny(_), _) => a,
        (_, Deny(_)) => b,
        (NeedSuperAdmin, _) => a,
        (_, NeedSuperAdmin) => b,
        (NeedAdmin, _) => a,
        (_, NeedAdmin) => b,
        _ => a,
    }
}

pub fn classify(query: &str) -> Verdict {
    let trimmed = query.trim().trim_end_matches(';').trim();
    if trimmed.contains(';') {
        return Verdict::Deny("Multiple statements are not allowed.");
    }

    let tokens = tokenize(trimmed);
    let first = match tokens.first() {
        Some(t) => t.as_str(),
        None => return Verdict::Deny("Empty statement."),
    };

    match first {
        "select" | "with" | "insert" | "replace" | "update" | "delete" => {}
        _ => return Verdict::Deny("This kind of statement is not allowed."),
    }

    let lowered = trimmed.to_lowercase();
    let mut verdict = Verdict::Allow;

    for (op, table) in writes(&tokens) {
        let table = table.as_str();
        if DENIED_TABLES.contains(&table) || table.starts_with("sqlite_") {
            return Verdict::Deny("This table cannot be changed directly.");
        }

        let needed = if SUPER_ADMIN_TABLES.contains(&table) {
            Verdict::NeedSuperAdmin
        } else if ADMIN_TABLES.contains(&table) {
            Verdict::NeedAdmin
        } else {
            match (table, &op) {
                // Removing records, or approving a receipt, is an admin action.
                ("sales" | "sale_items" | "sale_payments" | "debtors" | "debtor_payments", Op::Delete) => {
                    Verdict::NeedAdmin
                }
                ("customers" | "products" | "purchase_receipts", Op::Delete) => Verdict::NeedAdmin,
                ("purchase_receipts", Op::Update) => Verdict::NeedAdmin,
                ("products", Op::Insert) => Verdict::NeedAdmin,
                ("products", Op::Update)
                    if lowered.contains("cost_price") || lowered.contains("selling_price") =>
                {
                    Verdict::NeedAdmin
                }
                _ => Verdict::Allow,
            }
        };
        verdict = max_verdict(verdict, needed);
    }

    verdict
}

/// `role` is the logged-in user's role (None when nobody is logged in).
pub fn authorize_write(role: Option<&str>, query: &str) -> Result<(), String> {
    match classify(query) {
        Verdict::Deny(reason) => Err(reason.to_string()),
        Verdict::Allow => match role {
            Some(_) => Ok(()),
            None => Err("Your session has expired. Please log in again.".to_string()),
        },
        Verdict::NeedAdmin => match role {
            Some(r) if is_admin_role(r) => Ok(()),
            Some(_) => Err("You don't have permission to do that.".to_string()),
            None => Err("Your session has expired. Please log in again.".to_string()),
        },
        Verdict::NeedSuperAdmin => match role {
            Some("super_admin") => Ok(()),
            Some(_) => Err("You don't have permission to do that.".to_string()),
            None => Err("Your session has expired. Please log in again.".to_string()),
        },
    }
}

/// Reads must never expose password hashes, even through aliases or joins.
pub fn authorize_read(query: &str) -> Result<(), String> {
    if query.to_lowercase().contains("password") {
        return Err("This query is not allowed.".to_string());
    }
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn selects_are_allowed() {
        assert_eq!(classify("SELECT * FROM users WHERE id = $1"), Verdict::Allow);
    }

    #[test]
    fn users_table_is_never_writable() {
        assert!(matches!(classify("UPDATE users SET role = 'super_admin' WHERE id = $1"), Verdict::Deny(_)));
        assert!(matches!(classify("insert into users (name) values ($1)"), Verdict::Deny(_)));
        assert!(matches!(classify("DELETE FROM users"), Verdict::Deny(_)));
        assert!(matches!(classify("UPDATE main.users SET x=1"), Verdict::Deny(_)));
    }

    #[test]
    fn ddl_and_pragma_are_denied() {
        assert!(matches!(classify("DROP TABLE sales"), Verdict::Deny(_)));
        assert!(matches!(classify("PRAGMA foreign_keys = OFF"), Verdict::Deny(_)));
        assert!(matches!(classify("ATTACH DATABASE 'x' AS y"), Verdict::Deny(_)));
        assert!(matches!(classify("VACUUM INTO 'x'"), Verdict::Deny(_)));
    }

    #[test]
    fn multiple_statements_are_denied() {
        assert!(matches!(classify("SELECT 1; DELETE FROM sales"), Verdict::Deny(_)));
        assert_eq!(classify("SELECT 1;"), Verdict::Allow);
    }

    #[test]
    fn cashier_sale_flow_is_allowed() {
        assert_eq!(classify("INSERT INTO sales (id, customer_id) VALUES ($1, $2)"), Verdict::Allow);
        assert_eq!(classify("INSERT INTO sale_items (sale_id) VALUES ($1)"), Verdict::Allow);
        assert_eq!(
            classify("UPDATE products SET quantity_on_hand = quantity_on_hand - $1 WHERE id = $2 AND quantity_on_hand >= $1"),
            Verdict::Allow
        );
        assert_eq!(classify("INSERT INTO debtors (sale_id) VALUES ($1)"), Verdict::Allow);
        assert_eq!(classify("UPDATE debtors SET amount_owed = $1 WHERE id = $2"), Verdict::Allow);
    }

    #[test]
    fn destructive_and_price_changes_need_admin() {
        assert_eq!(classify("DELETE FROM sales WHERE id = ?"), Verdict::NeedAdmin);
        assert_eq!(classify("DELETE FROM sale_items WHERE sale_id = ?"), Verdict::NeedAdmin);
        assert_eq!(classify("UPDATE products SET cost_price = $1 WHERE id = $2"), Verdict::NeedAdmin);
        assert_eq!(classify("UPDATE products SET selling_price = 1"), Verdict::NeedAdmin);
        assert_eq!(classify("INSERT INTO suppliers (supplier_name) VALUES ($1)"), Verdict::NeedAdmin);
        assert_eq!(classify("UPDATE purchase_receipts SET status = 'approved' WHERE id = $1"), Verdict::NeedAdmin);
        assert_eq!(classify("INSERT INTO business_expenses (amount) VALUES ($1)"), Verdict::NeedAdmin);
    }

    #[test]
    fn settings_need_super_admin() {
        assert_eq!(classify("UPDATE admin_settings SET value = $1 WHERE key = $2"), Verdict::NeedSuperAdmin);
    }

    #[test]
    fn upsert_clause_is_not_a_second_write() {
        assert_eq!(
            classify("INSERT INTO sale_items (id) VALUES (1) ON CONFLICT(id) DO UPDATE SET id = 2"),
            Verdict::Allow
        );
    }

    #[test]
    fn function_named_replace_is_not_a_write() {
        assert_eq!(classify("SELECT replace(name, 'a', 'b') FROM customers"), Verdict::Allow);
    }

    #[test]
    fn authorize_applies_roles() {
        assert!(authorize_write(Some("sales"), "INSERT INTO sales (id) VALUES (1)").is_ok());
        assert!(authorize_write(Some("sales"), "DELETE FROM sales").is_err());
        assert!(authorize_write(Some("manager"), "DELETE FROM sales").is_ok());
        assert!(authorize_write(Some("admin"), "UPDATE admin_settings SET value = 1").is_err());
        assert!(authorize_write(Some("super_admin"), "UPDATE admin_settings SET value = 1").is_ok());
        assert!(authorize_write(None, "INSERT INTO sales (id) VALUES (1)").is_err());
    }

    #[test]
    fn password_reads_are_blocked() {
        assert!(authorize_read("SELECT password FROM users").is_err());
        assert!(authorize_read("SELECT password AS p FROM users").is_err());
        assert!(authorize_read("SELECT name FROM users").is_ok());
    }

    /// Replays SQL recorded from the real app code (see HANAN_SQL_ADMIN / HANAN_SQL_CASHIER)
    /// so a guard rule can never silently block a legitimate flow.
    fn replay(var: &str, role: &str) -> Option<Vec<String>> {
        let path = std::env::var(var).ok()?;
        let text = std::fs::read_to_string(path).ok()?;
        let mut denied = Vec::new();
        for line in text.lines().filter(|l| !l.trim().is_empty()) {
            let query: String = serde_json::from_str(line).unwrap();
            if let Err(e) = authorize_write(Some(role), &query) {
                denied.push(format!("{e}  <-  {}", query.split_whitespace().take(8).collect::<Vec<_>>().join(" ")));
            }
        }
        Some(denied)
    }

    #[test]
    fn recorded_admin_flows_are_allowed_for_admin() {
        if let Some(denied) = replay("HANAN_SQL_ADMIN", "admin") {
            assert!(denied.is_empty(), "admin blocked:\n{}", denied.join("\n"));
        }
    }

    #[test]
    fn recorded_cashier_flows_are_allowed_for_cashier() {
        if let Some(denied) = replay("HANAN_SQL_CASHIER", "sales") {
            assert!(denied.is_empty(), "cashier blocked:\n{}", denied.join("\n"));
        }
    }

    #[test]
    fn cashier_cannot_run_admin_flows() {
        if let Some(denied) = replay("HANAN_SQL_ADMIN", "sales") {
            // returns, receipts approval, costing, supplier payments... must be refused to cashiers
            assert!(denied.len() > 10, "expected many admin-only statements, got {}", denied.len());
        }
    }
}
