use crate::guard;
use serde::{Deserialize, Serialize};
use sqlx::migrate::MigrateDatabase;
use sqlx::sqlite::{SqliteArguments, SqliteConnectOptions, SqlitePoolOptions, SqliteRow};
use sqlx::{sqlite::SqlitePool, Column, Row, Sqlite, Transaction};
use std::collections::HashMap;
use std::path::{Path, PathBuf};
use std::str::FromStr;
use std::sync::Arc;
use std::time::{Duration, Instant};
use tauri::Manager;
use tokio::sync::{Mutex, OnceCell};
use uuid::Uuid;

/// A transaction left open this long was abandoned (the UI threw between begin and
/// commit/rollback). It is rolled back so it stops holding a pooled connection and
/// the SQLite write lock.
const STALE_TRANSACTION: Duration = Duration::from_secs(120);
const BACKUPS_TO_KEEP: usize = 14;
const PRE_MIGRATION_BACKUPS_TO_KEEP: usize = 5;
const DEFAULT_ADMIN_PASSWORD: &str = "letmeonlinenow";

/// Some development databases were built from locally edited copies of migrations
/// 5 (default business name) and 9 (nullable purchase_orders.employee_id) before
/// those files were restored to the committed versions. sqlx refuses to continue
/// when an applied migration's checksum changed, which would block startup. These
/// are the checksums of exactly those two edited variants (SHA-384, hex); only
/// they are re-stamped, any other mismatch still fails loudly.
const KNOWN_EDITED_MIGRATIONS: &[(i64, &str)] = &[
    (5, "2c78dc31ec0f81147e9642adbc3d4b5ad2ff15c3dcf4b2af88a641d8cd5c9e98b6fa8338fee28ae1d1efee98ad568cb2"),
    (9, "547f23651f4c987dcb136319467668ed5104d592541bf98611b53048e07f01d53fb2935166a498b67a8cf99705b355ba"),
];

struct TxEntry {
    tx: Option<Transaction<'static, Sqlite>>,
    started: Instant,
}

type TxMap = Arc<Mutex<HashMap<String, Arc<Mutex<TxEntry>>>>>;

pub struct DatabaseConnection {
    pub pool: Arc<SqlitePool>,
    transactions: TxMap,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct QueryResult {
    #[serde(rename = "lastInsertId")]
    pub last_insert_id: Option<i64>,
    #[serde(rename = "rowsAffected")]
    pub rows_affected: u64,
}

// Changed to use serializable types
#[derive(Default, Serialize, Deserialize)]
pub struct FetchResult {
    pub data: Vec<HashMap<String, serde_json::Value>>,
}

// Changed to use serializable types
#[derive(Default, Serialize, Deserialize)]
pub struct FetchOneResult {
    pub data: Option<HashMap<String, serde_json::Value>>,
}

#[derive(Clone)]
pub struct Session {
    pub user_id: String,
    pub role: String,
}

/// Managed Tauri state. The database is opened lazily on first use (and warmed up
/// at startup), so a command can never run before the database exists, and a failed
/// startup (e.g. a bad migration) is reported to every caller instead of ignored.
pub struct Db {
    path: PathBuf,
    backup_dir: PathBuf,
    cell: OnceCell<Result<Arc<DatabaseConnection>, String>>,
    session: std::sync::Mutex<Option<Session>>,
}

impl Db {
    pub fn new(path: PathBuf, backup_dir: PathBuf) -> Self {
        Self {
            path,
            backup_dir,
            cell: OnceCell::new(),
            session: std::sync::Mutex::new(None),
        }
    }

    pub async fn conn(&self) -> Result<Arc<DatabaseConnection>, String> {
        self.cell
            .get_or_init(|| async {
                DatabaseConnection::open(self.path.clone(), self.backup_dir.clone())
                    .await
                    .map(Arc::new)
                    .map_err(|e| format!("Database unavailable: {e}"))
            })
            .await
            .clone()
    }

    pub fn session(&self) -> Option<Session> {
        self.session.lock().unwrap().clone()
    }

    pub fn set_session(&self, session: Option<Session>) {
        *self.session.lock().unwrap() = session;
    }

    /// The logged-in session, or an error if nobody is logged in.
    pub fn require_session(&self) -> Result<Session, String> {
        self.session()
            .ok_or_else(|| "Your session has expired. Please log in again.".to_string())
    }

    pub fn require_admin(&self) -> Result<Session, String> {
        let s = self.require_session()?;
        if guard::is_admin_role(&s.role) {
            Ok(s)
        } else {
            Err("You don't have permission to do that.".to_string())
        }
    }
}

fn bind_all<'q>(
    mut query: sqlx::query::Query<'q, Sqlite, SqliteArguments<'q>>,
    params: Vec<serde_json::Value>,
) -> Result<sqlx::query::Query<'q, Sqlite, SqliteArguments<'q>>, String> {
    for param in params {
        query = match param {
            serde_json::Value::Null => query.bind(None::<String>),
            serde_json::Value::Bool(b) => query.bind(b),
            serde_json::Value::Number(n) => {
                if let Some(i) = n.as_i64() {
                    query.bind(i)
                } else if let Some(f) = n.as_f64() {
                    query.bind(f)
                } else {
                    return Err("Unsupported number type".to_string());
                }
            }
            serde_json::Value::String(s) => query.bind(s),
            _ => return Err("Unsupported JSON type for query parameter".to_string()),
        };
    }
    Ok(query)
}

/// Convert a row to JSON. Password hashes never leave the backend.
pub fn row_to_record(row: &SqliteRow, keep_password: bool) -> HashMap<String, serde_json::Value> {
    let mut record = HashMap::new();
    for (i, column) in row.columns().iter().enumerate() {
        let column_name = column.name();
        if !keep_password && column_name.eq_ignore_ascii_case("password") {
            continue;
        }

        if let Ok(val) = row.try_get::<i64, _>(i) {
            record.insert(column_name.to_string(), serde_json::Value::Number(val.into()));
        } else if let Ok(val) = row.try_get::<f64, _>(i) {
            match serde_json::Number::from_f64(val) {
                Some(num) => record.insert(column_name.to_string(), serde_json::Value::Number(num)),
                None => record.insert(column_name.to_string(), serde_json::Value::Null),
            };
        } else if let Ok(val) = row.try_get::<String, _>(i) {
            record.insert(column_name.to_string(), serde_json::Value::String(val));
        } else if let Ok(val) = row.try_get::<bool, _>(i) {
            record.insert(column_name.to_string(), serde_json::Value::Bool(val));
        } else {
            record.insert(column_name.to_string(), serde_json::Value::Null);
        }
    }
    record
}

/// Snapshot the live database with SQLite's own `VACUUM INTO`, which is consistent
/// even while the app keeps writing (unlike a raw file copy).
async fn vacuum_into(pool: &SqlitePool, destination: &Path) -> Result<(), String> {
    if let Some(parent) = destination.parent() {
        std::fs::create_dir_all(parent).map_err(|e| e.to_string())?;
    }
    // VACUUM INTO refuses to overwrite an existing file.
    if destination.exists() {
        std::fs::remove_file(destination).map_err(|e| e.to_string())?;
    }
    let result = sqlx::query("VACUUM INTO ?")
        .bind(destination.to_string_lossy().to_string())
        .execute(pool)
        .await;
    if let Err(e) = result {
        // A failed VACUUM INTO leaves an empty/partial file that looks like a backup.
        let _ = std::fs::remove_file(destination);
        return Err(e.to_string());
    }
    Ok(())
}

/// Keep only the newest `keep` files in `dir` whose name starts with `prefix`.
fn prune_backups(dir: &Path, prefix: &str, keep: usize) {
    let Ok(entries) = std::fs::read_dir(dir) else { return };
    let mut files: Vec<PathBuf> = entries
        .filter_map(|e| e.ok())
        .map(|e| e.path())
        .filter(|p| {
            p.file_name()
                .and_then(|n| n.to_str())
                .map(|n| n.starts_with(prefix) && n.ends_with(".db"))
                .unwrap_or(false)
        })
        .collect();
    // File names embed the date, so a reverse name sort is newest-first.
    files.sort();
    files.reverse();
    for old in files.into_iter().skip(keep) {
        let _ = std::fs::remove_file(old);
    }
}

async fn ensure_super_user(pool: &SqlitePool) -> Result<(), String> {
    let existing: Option<(String, Option<String>)> =
        sqlx::query_as("SELECT id, role FROM users WHERE username = 'admin'")
            .fetch_optional(pool)
            .await
            .map_err(|e| e.to_string())?;

    match existing {
        Some((id, role)) => {
            if role.as_deref() != Some("super_admin") {
                sqlx::query("UPDATE users SET role = 'super_admin' WHERE id = ?")
                    .bind(id)
                    .execute(pool)
                    .await
                    .map_err(|e| e.to_string())?;
            }
        }
        None => {
            let hash = tokio::task::spawn_blocking(|| bcrypt::hash(DEFAULT_ADMIN_PASSWORD, 10))
                .await
                .map_err(|e| e.to_string())?
                .map_err(|e| e.to_string())?;
            sqlx::query(
                "INSERT INTO users (name, username, password, role, must_change_password)
                 VALUES ('Super', 'admin', ?, 'super_admin', 1)",
            )
            .bind(hash)
            .execute(pool)
            .await
            .map_err(|e| e.to_string())?;
        }
    }
    Ok(())
}

impl DatabaseConnection {
    async fn open(db_path: PathBuf, backup_dir: PathBuf) -> Result<Self, String> {
        let dbfile = db_path.display().to_string();
        if let Some(parent) = db_path.parent() {
            std::fs::create_dir_all(parent).map_err(|e| e.to_string())?;
        }
        if !<Sqlite as MigrateDatabase>::database_exists(&dbfile)
            .await
            .unwrap_or(false)
        {
            <Sqlite as MigrateDatabase>::create_database(&dbfile)
                .await
                .map_err(|e| e.to_string())?;
        }

        // Migrations run on their own single connection with foreign keys OFF.
        // Several migrations rebuild tables (DROP TABLE users, ...); with foreign keys
        // enforced that fires ON DELETE actions and wipes child rows. A PRAGMA sent
        // from a pool can't do this: it hits an arbitrary connection and is a no-op
        // inside sqlx's migration transaction.
        Self::migrate(&dbfile, &db_path, &backup_dir).await?;

        let options = SqliteConnectOptions::from_str(&dbfile)
            .map_err(|e| e.to_string())?
            .foreign_keys(true)
            .busy_timeout(Duration::from_secs(10));

        let pool = SqlitePoolOptions::new()
            .max_connections(5)
            .connect_with(options)
            .await
            .map_err(|e| e.to_string())?;

        ensure_super_user(&pool).await?;

        let db = Self {
            pool: Arc::new(pool),
            transactions: Arc::new(Mutex::new(HashMap::new())),
        };
        db.spawn_background_tasks(db_path, backup_dir);
        Ok(db)
    }

    async fn migrate(dbfile: &str, db_path: &Path, backup_dir: &Path) -> Result<(), String> {
        let options = SqliteConnectOptions::from_str(dbfile)
            .map_err(|e| e.to_string())?
            .foreign_keys(false)
            .busy_timeout(Duration::from_secs(10));
        let pool = SqlitePoolOptions::new()
            .max_connections(1)
            .connect_with(options)
            .await
            .map_err(|e| e.to_string())?;

        let migrator = sqlx::migrate!("src/database/migrations");

        for (version, edited_hex) in KNOWN_EDITED_MIGRATIONS {
            let edited: Vec<u8> = (0..edited_hex.len())
                .step_by(2)
                .filter_map(|i| u8::from_str_radix(&edited_hex[i..i + 2], 16).ok())
                .collect();
            if let Some(m) = migrator.iter().find(|m| m.version == *version) {
                let _ = sqlx::query(
                    "UPDATE _sqlx_migrations SET checksum = ? WHERE version = ? AND checksum = ?",
                )
                .bind(m.checksum.to_vec())
                .bind(version)
                .bind(edited)
                .execute(&pool)
                .await;
            }
        }
        let latest = migrator.iter().map(|m| m.version).max().unwrap_or(0);
        let applied: Option<i64> = sqlx::query_scalar("SELECT MAX(version) FROM _sqlx_migrations")
            .fetch_one(&pool)
            .await
            .ok()
            .flatten();

        // Snapshot before touching the schema of a database that already has data.
        if let Some(applied) = applied {
            if applied < latest {
                let stem = db_path.file_stem().and_then(|s| s.to_str()).unwrap_or("db");
                let dest = backup_dir.join(format!(
                    "{stem}-pre-migration-v{applied}-to-v{latest}-{}.db",
                    Uuid::new_v4().simple()
                ));
                vacuum_into(&pool, &dest)
                    .await
                    .map_err(|e| format!("could not back up before migrating: {e}"))?;
                prune_backups(
                    backup_dir,
                    &format!("{stem}-pre-migration-"),
                    PRE_MIGRATION_BACKUPS_TO_KEEP,
                );
            }
        }

        let result = migrator.run(&pool).await.map_err(|e| format!("migration failed: {e}"));
        pool.close().await;
        result
    }

    fn spawn_background_tasks(&self, db_path: PathBuf, backup_dir: PathBuf) {
        // Roll back transactions that were abandoned.
        let transactions = self.transactions.clone();
        tauri::async_runtime::spawn(async move {
            loop {
                tokio::time::sleep(Duration::from_secs(30)).await;
                let stale: Vec<(String, Arc<Mutex<TxEntry>>)> = {
                    let mut map = transactions.lock().await;
                    let mut stale_ids = Vec::new();
                    for (id, entry) in map.iter() {
                        if let Ok(e) = entry.try_lock() {
                            if e.started.elapsed() > STALE_TRANSACTION {
                                stale_ids.push(id.clone());
                            }
                        }
                    }
                    stale_ids
                        .into_iter()
                        .filter_map(|id| map.remove(&id).map(|e| (id, e)))
                        .collect()
                };
                for (id, entry) in stale {
                    let mut e = entry.lock().await;
                    if let Some(tx) = e.tx.take() {
                        eprintln!("Rolling back abandoned transaction {id}");
                        let _ = tx.rollback().await;
                    }
                }
            }
        });

        // Daily automatic backup, keeping the newest BACKUPS_TO_KEEP.
        let pool = self.pool.clone();
        tauri::async_runtime::spawn(async move {
            let stem = db_path
                .file_stem()
                .and_then(|s| s.to_str())
                .unwrap_or("db")
                .to_string();
            loop {
                if let Err(e) = run_daily_backup(&pool, &backup_dir, &stem).await {
                    eprintln!("Automatic backup failed: {e}");
                }
                // Re-check a few times a day so a till left on overnight still gets one.
                tokio::time::sleep(Duration::from_secs(60 * 60 * 6)).await;
            }
        });
    }

    pub async fn begin_transaction(&self) -> Result<String, String> {
        let mut tx = self.pool.begin().await.map_err(|e| e.to_string())?;

        // Take SQLite's write lock now instead of at the first write. Otherwise two
        // overlapping transactions both start as readers, and the second one blocks
        // on its first write while holding the shared lock the first one needs to
        // commit. A no-op UPDATE acquires the lock without touching any row.
        sqlx::query("UPDATE admin_settings SET key = key WHERE 0")
            .execute(&mut *tx)
            .await
            .map_err(|e| e.to_string())?;

        let transaction_id = Uuid::new_v4().to_string();
        let entry = Arc::new(Mutex::new(TxEntry {
            tx: Some(tx),
            started: Instant::now(),
        }));
        self.transactions
            .lock()
            .await
            .insert(transaction_id.clone(), entry);

        Ok(transaction_id)
    }

    async fn entry(&self, transaction_id: &str) -> Result<Arc<Mutex<TxEntry>>, String> {
        self.transactions
            .lock()
            .await
            .get(transaction_id)
            .cloned()
            .ok_or_else(|| "Transaction not found or timed out".to_string())
    }

    pub async fn execute_query(
        &self,
        transaction_id: String,
        query: String,
        params: Vec<serde_json::Value>,
    ) -> Result<QueryResult, String> {
        let entry = self.entry(&transaction_id).await?;
        let mut entry = entry.lock().await;
        let tx = entry
            .tx
            .as_mut()
            .ok_or_else(|| "Transaction already finished".to_string())?;

        let query = bind_all(sqlx::query(&query), params)?;
        let result = query.execute(&mut **tx).await.map_err(|e| e.to_string())?;

        Ok(QueryResult {
            last_insert_id: Some(result.last_insert_rowid()),
            rows_affected: result.rows_affected(),
        })
    }

    pub async fn find_one(
        &self,
        transaction_id: Option<String>,
        query: String,
        params: Vec<serde_json::Value>,
    ) -> Result<FetchOneResult, String> {
        let query = bind_all(sqlx::query(&query), params)?;

        let row = if let Some(tid) = transaction_id {
            let entry = self.entry(&tid).await?;
            let mut entry = entry.lock().await;
            let tx = entry
                .tx
                .as_mut()
                .ok_or_else(|| "Transaction already finished".to_string())?;
            query.fetch_optional(&mut **tx).await.map_err(|e| e.to_string())?
        } else {
            query
                .fetch_optional(&*self.pool)
                .await
                .map_err(|e| e.to_string())?
        };

        Ok(FetchOneResult {
            data: row.map(|r| row_to_record(&r, false)),
        })
    }

    pub async fn find_many(
        &self,
        transaction_id: Option<String>,
        query: String,
        params: Vec<serde_json::Value>,
    ) -> Result<FetchResult, String> {
        let query = bind_all(sqlx::query(&query), params)?;

        let rows = if let Some(tid) = transaction_id {
            let entry = self.entry(&tid).await?;
            let mut entry = entry.lock().await;
            let tx = entry
                .tx
                .as_mut()
                .ok_or_else(|| "Transaction already finished".to_string())?;
            query.fetch_all(&mut **tx).await.map_err(|e| e.to_string())?
        } else {
            query.fetch_all(&*self.pool).await.map_err(|e| e.to_string())?
        };

        Ok(FetchResult {
            data: rows.iter().map(|r| row_to_record(r, false)).collect(),
        })
    }

    pub async fn backup_to(&self, destination: &str) -> Result<(), String> {
        vacuum_into(&self.pool, Path::new(destination)).await
    }

    pub async fn commit_transaction(&self, transaction_id: String) -> Result<(), String> {
        let entry = self.transactions.lock().await.remove(&transaction_id);
        if let Some(entry) = entry {
            let tx = entry.lock().await.tx.take();
            if let Some(tx) = tx {
                tx.commit().await.map_err(|e| e.to_string())?;
            }
        }
        Ok(())
    }

    pub async fn rollback_transaction(&self, transaction_id: String) -> Result<(), String> {
        let entry = self.transactions.lock().await.remove(&transaction_id);
        if let Some(entry) = entry {
            let tx = entry.lock().await.tx.take();
            if let Some(tx) = tx {
                tx.rollback().await.map_err(|e| e.to_string())?;
            }
        }
        Ok(())
    }
}

/// The folder backups go to: the `backup_dir` admin setting if set, else the default.
async fn resolve_backup_dir(pool: &SqlitePool, default_dir: &Path) -> PathBuf {
    let configured: Option<String> =
        sqlx::query_scalar("SELECT value FROM admin_settings WHERE key = 'backup_dir'")
            .fetch_optional(pool)
            .await
            .ok()
            .flatten();
    match configured.as_deref().map(str::trim) {
        Some(d) if !d.is_empty() => PathBuf::from(d),
        _ => default_dir.to_path_buf(),
    }
}

/// Back up once per calendar day (local time).
async fn run_daily_backup(pool: &SqlitePool, default_dir: &Path, stem: &str) -> Result<(), String> {
    let dir = resolve_backup_dir(pool, default_dir).await;

    let today: String = sqlx::query_scalar("SELECT date('now', 'localtime')")
        .fetch_one(pool)
        .await
        .map_err(|e| e.to_string())?;
    let prefix = format!("{stem}-auto-");
    let target = dir.join(format!("{prefix}{today}.db"));

    if !target.exists() {
        vacuum_into(pool, &target).await?;
    }
    prune_backups(&dir, &prefix, BACKUPS_TO_KEEP);
    Ok(())
}

#[derive(Serialize)]
pub struct BackupFile {
    name: String,
    size_bytes: u64,
    modified_secs: u64,
}

#[derive(Serialize)]
pub struct BackupInfo {
    dir: String,
    is_default_dir: bool,
    keep: usize,
    files: Vec<BackupFile>,
}

// Tauri command handlers
#[tauri::command]
pub async fn begin_transaction(db: tauri::State<'_, Db>) -> Result<String, String> {
    // Anyone logged in may open a transaction; what it may write is checked per statement.
    db.require_session()?;
    db.conn().await?.begin_transaction().await
}

#[tauri::command]
pub async fn execute_query(
    db: tauri::State<'_, Db>,
    transaction_id: String,
    query: String,
    params: Vec<serde_json::Value>,
) -> Result<QueryResult, String> {
    guard::authorize_write(db.session().as_ref().map(|s| s.role.as_str()), &query)?;
    db.conn()
        .await?
        .execute_query(transaction_id, query, params)
        .await
}

#[tauri::command]
pub async fn commit_transaction(
    db: tauri::State<'_, Db>,
    transaction_id: String,
) -> Result<(), String> {
    db.conn().await?.commit_transaction(transaction_id).await
}

#[tauri::command]
pub async fn rollback_transaction(
    db: tauri::State<'_, Db>,
    transaction_id: String,
) -> Result<(), String> {
    db.conn().await?.rollback_transaction(transaction_id).await
}

#[tauri::command]
pub async fn find_one(
    db: tauri::State<'_, Db>,
    transaction_id: Option<String>,
    query: String,
    params: Vec<serde_json::Value>,
) -> Result<FetchOneResult, String> {
    guard::authorize_read(&query)?;
    db.conn().await?.find_one(transaction_id, query, params).await
}

#[tauri::command]
pub async fn find_many(
    db: tauri::State<'_, Db>,
    transaction_id: Option<String>,
    query: String,
    params: Vec<serde_json::Value>,
) -> Result<FetchResult, String> {
    guard::authorize_read(&query)?;
    db.conn().await?.find_many(transaction_id, query, params).await
}

#[tauri::command]
pub async fn backup_database(
    db: tauri::State<'_, Db>,
    app_handle: tauri::AppHandle,
    filename: String,
) -> Result<String, String> {
    db.require_admin()?;
    // A bare file name only: the webview must not choose where this is written.
    let safe_name = Path::new(&filename)
        .file_name()
        .and_then(|n| n.to_str())
        .filter(|n| !n.is_empty())
        .ok_or_else(|| "Invalid file name".to_string())?
        .to_string();
    let download_dir = app_handle
        .path()
        .download_dir()
        .map_err(|e| e.to_string())?;
    let destination = download_dir.join(safe_name);
    db.conn()
        .await?
        .backup_to(&destination.to_string_lossy())
        .await?;
    Ok(destination.to_string_lossy().to_string())
}

#[cfg(test)]
mod tests {
    use super::*;
    use tauri::async_runtime::block_on;

    fn temp_dir(name: &str) -> PathBuf {
        let dir = std::env::temp_dir().join(format!("hanan-test-{name}-{}", Uuid::new_v4().simple()));
        std::fs::create_dir_all(&dir).unwrap();
        dir
    }

    async fn scalar(conn: &DatabaseConnection, sql: &str) -> i64 {
        sqlx::query_scalar::<_, i64>(sql).fetch_one(&*conn.pool).await.unwrap()
    }

    #[test]
    fn fresh_install_migrates_and_seeds_admin() {
        block_on(async {
            let dir = temp_dir("fresh");
            let conn = DatabaseConnection::open(dir.join("app.db"), dir.join("backups"))
                .await
                .expect("open");
            assert_eq!(scalar(&conn, "SELECT MAX(version) FROM _sqlx_migrations").await, 15);
            assert_eq!(
                scalar(&conn, "SELECT must_change_password FROM users WHERE username = 'admin'").await,
                1
            );
            // foreign keys are enforced on the working pool
            assert_eq!(scalar(&conn, "PRAGMA foreign_keys").await, 1);
        });
    }

    /// Upgrade a copy of a real database: set HANAN_TEST_DB to a file at an older schema.
    #[test]
    fn real_database_upgrades_without_losing_rows() {
        let Ok(source) = std::env::var("HANAN_TEST_DB") else {
            eprintln!("HANAN_TEST_DB not set, skipping");
            return;
        };
        block_on(async {
            let dir = temp_dir("upgrade");
            let db_path = dir.join("app.db");
            std::fs::copy(&source, &db_path).unwrap();

            // Row counts before, read straight from the file.
            let before_pool = SqlitePoolOptions::new()
                .connect_with(SqliteConnectOptions::from_str(&db_path.display().to_string()).unwrap())
                .await
                .unwrap();
            let tables = ["users", "customers", "products", "sales", "sale_items", "sale_payments", "debtors", "debtor_payments", "purchase_orders", "purchase_order_items", "business_expenses"];
            let mut before = Vec::new();
            for t in tables {
                let n: i64 = sqlx::query_scalar(&format!("SELECT COUNT(*) FROM {t}"))
                    .fetch_one(&before_pool)
                    .await
                    .unwrap_or(-1);
                before.push((t, n));
            }
            before_pool.close().await;

            let conn = DatabaseConnection::open(db_path.clone(), dir.join("backups"))
                .await
                .expect("upgrade should succeed");

            assert_eq!(scalar(&conn, "SELECT MAX(version) FROM _sqlx_migrations").await, 15);
            for (t, n) in before {
                let after = scalar(&conn, &format!("SELECT COUNT(*) FROM {t}")).await;
                assert!(after >= n, "table {t} lost rows: {n} -> {after}");
            }
            // a safety copy was taken before the schema changed
            let has_backup = std::fs::read_dir(dir.join("backups"))
                .unwrap()
                .filter_map(|e| e.ok())
                .any(|e| e.file_name().to_string_lossy().contains("pre-migration"));
            assert!(has_backup, "expected a pre-migration backup");
            // debt rows were backfilled
            assert_eq!(
                scalar(&conn, "SELECT COUNT(*) FROM debtors WHERE original_amount IS NULL").await,
                0
            );
        });
    }

    #[test]
    fn overlapping_transactions_queue_instead_of_deadlocking() {
        block_on(async {
            let dir = temp_dir("tx");
            let conn = Arc::new(
                DatabaseConnection::open(dir.join("app.db"), dir.join("backups"))
                    .await
                    .unwrap(),
            );

            let first = conn.begin_transaction().await.unwrap();
            conn.execute_query(
                first.clone(),
                "INSERT INTO customers (id, name) VALUES ('a', 'A')".into(),
                vec![],
            )
            .await
            .unwrap();

            // Second transaction starts while the first is open: it must wait, not deadlock.
            let c2 = conn.clone();
            let second = tauri::async_runtime::spawn(async move {
                let t = c2.begin_transaction().await.unwrap();
                c2.execute_query(t.clone(), "INSERT INTO customers (id, name) VALUES ('b', 'B')".into(), vec![])
                    .await
                    .unwrap();
                c2.commit_transaction(t).await.unwrap();
            });

            tokio::time::sleep(Duration::from_millis(300)).await;
            assert!(!second.inner().is_finished(), "second tx should be waiting for the first");
            conn.commit_transaction(first).await.unwrap();
            tokio::time::timeout(Duration::from_secs(5), second)
                .await
                .expect("second tx should finish once the first commits")
                .unwrap();
            assert_eq!(scalar(&conn, "SELECT COUNT(*) FROM customers WHERE id IN ('a','b')").await, 2);
        });
    }

    #[test]
    fn rollback_discards_writes_and_frees_the_lock() {
        block_on(async {
            let dir = temp_dir("rb");
            let conn = DatabaseConnection::open(dir.join("app.db"), dir.join("backups"))
                .await
                .unwrap();
            let t = conn.begin_transaction().await.unwrap();
            conn.execute_query(t.clone(), "INSERT INTO customers (id, name) VALUES ('x', 'X')".into(), vec![])
                .await
                .unwrap();
            conn.rollback_transaction(t).await.unwrap();
            assert_eq!(scalar(&conn, "SELECT COUNT(*) FROM customers WHERE id = 'x'").await, 0);
            // lock is free again
            let t2 = conn.begin_transaction().await.unwrap();
            conn.commit_transaction(t2).await.unwrap();
        });
    }
}

#[tauri::command]
pub async fn get_backup_info(db: tauri::State<'_, Db>) -> Result<BackupInfo, String> {
    db.require_admin()?;
    let conn = db.conn().await?;
    let dir = resolve_backup_dir(&conn.pool, &db.backup_dir).await;

    let mut files: Vec<BackupFile> = std::fs::read_dir(&dir)
        .map(|entries| {
            entries
                .filter_map(|e| e.ok())
                .filter(|e| e.file_name().to_string_lossy().ends_with(".db"))
                .filter_map(|e| {
                    let meta = e.metadata().ok()?;
                    let modified = meta
                        .modified()
                        .ok()?
                        .duration_since(std::time::UNIX_EPOCH)
                        .ok()?
                        .as_secs();
                    Some(BackupFile {
                        name: e.file_name().to_string_lossy().to_string(),
                        size_bytes: meta.len(),
                        modified_secs: modified,
                    })
                })
                .collect()
        })
        .unwrap_or_default();
    files.sort_by(|a, b| b.modified_secs.cmp(&a.modified_secs));

    Ok(BackupInfo {
        is_default_dir: dir == db.backup_dir,
        dir: dir.to_string_lossy().to_string(),
        keep: BACKUPS_TO_KEEP,
        files,
    })
}

/// Choose where automatic backups are written (super admin only). An empty path
/// restores the default folder. The folder is created and test-written first.
#[tauri::command]
pub async fn set_backup_dir(db: tauri::State<'_, Db>, path: String) -> Result<(), String> {
    let session = db.require_session()?;
    if session.role != "super_admin" {
        return Err("Only a super admin can change the backup folder.".to_string());
    }
    let conn = db.conn().await?;
    let path = path.trim().to_string();

    if path.is_empty() {
        sqlx::query("DELETE FROM admin_settings WHERE key = 'backup_dir'")
            .execute(&*conn.pool)
            .await
            .map_err(|e| e.to_string())?;
        return Ok(());
    }

    let dir = PathBuf::from(&path);
    if !dir.is_absolute() {
        return Err("Enter a full folder path (starting with / or a drive letter).".to_string());
    }
    std::fs::create_dir_all(&dir).map_err(|e| format!("Can't create that folder: {e}"))?;
    let probe = dir.join(".hanan-write-test");
    std::fs::write(&probe, b"ok").map_err(|e| format!("Can't write to that folder: {e}"))?;
    let _ = std::fs::remove_file(probe);

    sqlx::query(
        "INSERT INTO admin_settings (key, value, description) VALUES ('backup_dir', ?, 'Folder for automatic backups')
         ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = CURRENT_TIMESTAMP",
    )
    .bind(path)
    .execute(&*conn.pool)
    .await
    .map_err(|e| e.to_string())?;
    Ok(())
}
