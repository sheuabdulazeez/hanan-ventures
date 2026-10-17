//! Login, session and user management.
//!
//! Authentication lives in the backend: the webview can't claim a role, because the
//! role used for authorization comes from the session set here after a password
//! check, not from anything the frontend sends.

use crate::database::{row_to_record, Db, Session};
use serde::Deserialize;
use sqlx::Row;
use std::collections::HashMap;
use std::time::Duration;

const MIN_PASSWORD_LENGTH: usize = 8;
const ROLES: &[&str] = &["super_admin", "admin", "manager", "sales"];

type UserRecord = HashMap<String, serde_json::Value>;

async fn hash_password(password: String) -> Result<String, String> {
    tokio::task::spawn_blocking(move || bcrypt::hash(password, 10))
        .await
        .map_err(|e| e.to_string())?
        .map_err(|e| e.to_string())
}

fn validate_password(password: &str) -> Result<(), String> {
    if password.chars().count() < MIN_PASSWORD_LENGTH {
        return Err(format!("Password must be at least {MIN_PASSWORD_LENGTH} characters."));
    }
    Ok(())
}

fn validate_role(role: &str) -> Result<(), String> {
    if ROLES.contains(&role) {
        Ok(())
    } else {
        Err("Unknown role.".to_string())
    }
}

#[tauri::command]
pub async fn login(
    db: tauri::State<'_, Db>,
    username: String,
    password: String,
) -> Result<UserRecord, String> {
    let conn = db.conn().await?;
    let row = sqlx::query("SELECT * FROM users WHERE username = ?")
        .bind(&username)
        .fetch_optional(&*conn.pool)
        .await
        .map_err(|e| e.to_string())?;

    let Some(row) = row else {
        tokio::time::sleep(Duration::from_millis(400)).await;
        return Err("User not found".to_string());
    };

    let hash: String = row.try_get("password").map_err(|e| e.to_string())?;
    let valid = tokio::task::spawn_blocking(move || bcrypt::verify(password, &hash).unwrap_or(false))
        .await
        .map_err(|e| e.to_string())?;
    if !valid {
        // Slow down guessing.
        tokio::time::sleep(Duration::from_millis(400)).await;
        return Err("Invalid password".to_string());
    }

    let record = row_to_record(&row, false);
    if record.get("is_active").and_then(|v| v.as_i64()) == Some(0) {
        return Err("This account has been deactivated.".to_string());
    }

    let user_id = record
        .get("id")
        .and_then(|v| v.as_str())
        .ok_or("User record has no id")?
        .to_string();
    let role = record
        .get("role")
        .and_then(|v| v.as_str())
        .unwrap_or("sales")
        .to_string();
    db.set_session(Some(Session { user_id, role }));
    Ok(record)
}

#[tauri::command]
pub async fn logout(db: tauri::State<'_, Db>) -> Result<(), String> {
    db.set_session(None);
    Ok(())
}

/// The currently logged-in user (fresh from the database), if any. Lets the UI
/// restore its state after a reload without being able to forge a session.
#[tauri::command]
pub async fn get_session(db: tauri::State<'_, Db>) -> Result<Option<UserRecord>, String> {
    let Some(session) = db.session() else { return Ok(None) };
    let conn = db.conn().await?;
    let row = sqlx::query("SELECT * FROM users WHERE id = ?")
        .bind(&session.user_id)
        .fetch_optional(&*conn.pool)
        .await
        .map_err(|e| e.to_string())?;

    match row {
        Some(row) => {
            let record = row_to_record(&row, false);
            if record.get("is_active").and_then(|v| v.as_i64()) == Some(0) {
                db.set_session(None);
                return Ok(None);
            }
            // Pick up a role change made since login.
            if let Some(role) = record.get("role").and_then(|v| v.as_str()) {
                db.set_session(Some(Session {
                    user_id: session.user_id,
                    role: role.to_string(),
                }));
            }
            Ok(Some(record))
        }
        None => {
            db.set_session(None);
            Ok(None)
        }
    }
}

#[derive(Deserialize)]
pub struct NewUser {
    name: String,
    username: String,
    phone: Option<String>,
    password: String,
    role: String,
}

#[derive(Deserialize)]
pub struct UserUpdate {
    name: String,
    username: String,
    phone: Option<String>,
    role: String,
    /// Set to reset the password; the user must then choose a new one at next login.
    password: Option<String>,
}

#[tauri::command]
pub async fn create_user(db: tauri::State<'_, Db>, user: NewUser) -> Result<String, String> {
    let caller = db.require_admin()?;
    validate_role(&user.role)?;
    validate_password(&user.password)?;
    if user.role == "super_admin" && caller.role != "super_admin" {
        return Err("Only a super admin can create a super admin.".to_string());
    }
    if user.name.trim().is_empty() || user.username.trim().is_empty() {
        return Err("Name and username are required.".to_string());
    }

    let hash = hash_password(user.password).await?;
    let conn = db.conn().await?;
    let id: String = sqlx::query_scalar(
        "INSERT INTO users (name, username, phone, password, role, must_change_password)
         VALUES (?, ?, ?, ?, ?, 1) RETURNING id",
    )
    .bind(user.name.trim())
    .bind(user.username.trim())
    .bind(user.phone.unwrap_or_default())
    .bind(hash)
    .bind(&user.role)
    .fetch_one(&*conn.pool)
    .await
    .map_err(|e| {
        let msg = e.to_string();
        if msg.contains("UNIQUE") {
            "That username is already taken.".to_string()
        } else {
            msg
        }
    })?;
    Ok(id)
}

async fn role_of(db: &Db, id: &str) -> Result<Option<String>, String> {
    let conn = db.conn().await?;
    sqlx::query_scalar("SELECT role FROM users WHERE id = ?")
        .bind(id)
        .fetch_optional(&*conn.pool)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn update_user(
    db: tauri::State<'_, Db>,
    id: String,
    user: UserUpdate,
) -> Result<(), String> {
    let caller = db.require_admin()?;
    validate_role(&user.role)?;

    let current_role = role_of(&db, &id).await?.ok_or("User not found.")?;
    if (current_role == "super_admin" || user.role == "super_admin") && caller.role != "super_admin" {
        return Err("Only a super admin can change a super admin account.".to_string());
    }
    if id == caller.user_id && user.role != current_role {
        return Err("You can't change your own role.".to_string());
    }

    let conn = db.conn().await?;
    let reset = user.password.as_deref().map(str::trim).filter(|p| !p.is_empty());
    let result = match reset {
        Some(password) => {
            validate_password(password)?;
            let hash = hash_password(password.to_string()).await?;
            // An admin-set password is temporary unless they reset their own.
            let must_change = if id == caller.user_id { 0 } else { 1 };
            sqlx::query(
                "UPDATE users SET name = ?, username = ?, phone = ?, role = ?, password = ?,
                 must_change_password = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
            )
            .bind(user.name.trim())
            .bind(user.username.trim())
            .bind(user.phone.unwrap_or_default())
            .bind(&user.role)
            .bind(hash)
            .bind(must_change)
            .bind(&id)
            .execute(&*conn.pool)
            .await
        }
        None => {
            sqlx::query(
                "UPDATE users SET name = ?, username = ?, phone = ?, role = ?,
                 updated_at = CURRENT_TIMESTAMP WHERE id = ?",
            )
            .bind(user.name.trim())
            .bind(user.username.trim())
            .bind(user.phone.unwrap_or_default())
            .bind(&user.role)
            .bind(&id)
            .execute(&*conn.pool)
            .await
        }
    };
    result.map_err(|e| {
        let msg = e.to_string();
        if msg.contains("UNIQUE") {
            "That username is already taken.".to_string()
        } else {
            msg
        }
    })?;
    Ok(())
}

#[tauri::command]
pub async fn set_user_active(
    db: tauri::State<'_, Db>,
    id: String,
    is_active: bool,
) -> Result<(), String> {
    let caller = db.require_admin()?;
    if id == caller.user_id && !is_active {
        return Err("You can't deactivate your own account.".to_string());
    }
    let target_role = role_of(&db, &id).await?.ok_or("User not found.")?;
    if target_role == "super_admin" && caller.role != "super_admin" {
        return Err("Only a super admin can change a super admin account.".to_string());
    }

    let conn = db.conn().await?;
    sqlx::query("UPDATE users SET is_active = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?")
        .bind(if is_active { 1 } else { 0 })
        .bind(&id)
        .execute(&*conn.pool)
        .await
        .map_err(|e| e.to_string())?;
    Ok(())
}

/// Change the logged-in user's own password.
#[tauri::command]
pub async fn change_password(db: tauri::State<'_, Db>, new_password: String) -> Result<(), String> {
    let session = db.require_session()?;
    validate_password(&new_password)?;
    if new_password == "letmeonlinenow" {
        return Err("Choose a password other than the default one.".to_string());
    }
    let hash = hash_password(new_password).await?;
    let conn = db.conn().await?;
    sqlx::query(
        "UPDATE users SET password = ?, must_change_password = 0, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
    )
    .bind(hash)
    .bind(&session.user_id)
    .execute(&*conn.pool)
    .await
    .map_err(|e| e.to_string())?;
    Ok(())
}
