use serde::{Deserialize, Serialize};
use sqlx::migrate::MigrateDatabase;
use sqlx::sqlite::SqliteConnectOptions;
use sqlx::sqlite::SqlitePoolOptions;
use sqlx::{sqlite::SqlitePool, Column, Row, Sqlite, Transaction};
use std::collections::HashMap;
use std::path::PathBuf;
use std::str::FromStr;
use std::sync::Arc;
use tokio::sync::Mutex;
use uuid::Uuid;

pub struct DatabaseConnection {
    pub pool: Arc<SqlitePool>,
    transactions: Arc<Mutex<HashMap<String, Transaction<'static, Sqlite>>>>,
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

impl DatabaseConnection {
    pub async fn new(db_path: PathBuf) -> Self {
        let dbfile = db_path.display().to_string();
        if !<Sqlite as MigrateDatabase>::database_exists(&dbfile)
            .await
            .unwrap_or(false)
        {
            <Sqlite as MigrateDatabase>::create_database(&dbfile)
                .await
                .unwrap();
        };
        let options = SqliteConnectOptions::from_str(&dbfile)
            .expect("Failed to create database options")
            .foreign_keys(false);

        let pool = SqlitePoolOptions::new()
            .max_connections(5)
            .connect_with(options)
            .await
            .expect("Failed to initialize database");
        let db = Self {
            pool: Arc::new(pool),
            transactions: Arc::new(Mutex::new(HashMap::new())),
        };
        db.migrate().await;

        db
    }

    pub async fn migrate(&self) {
        // Disable foreign keys before migration
        sqlx::query("PRAGMA foreign_keys = OFF")
            .execute(&*self.pool)
            .await
            .expect("Failed to disable foreign keys");

        let m = sqlx::migrate!("src/database/migrations");

        match m.run(&*self.pool).await {
            Ok(_) => println!("Migrations completed successfully"),
            Err(e) => {
                eprintln!("Migration error: {}", e);
            }
        };

        // Re-enable foreign keys after migration
        sqlx::query("PRAGMA foreign_keys = ON")
            .execute(&*self.pool)
            .await
            .expect("Failed to enable foreign keys");
    }

    pub async fn begin_transaction(&self) -> Result<String, String> {
        let transaction_id = Uuid::new_v4().to_string();
        let tx = self.pool.begin().await.map_err(|e| e.to_string())?;

        let mut transactions = self.transactions.lock().await;
        transactions.insert(transaction_id.clone(), tx);

        Ok(transaction_id)
    }

    pub async fn execute_query(
        &self,
        transaction_id: String,
        query: String,
        params: Vec<serde_json::Value>,
    ) -> Result<QueryResult, String> {
        let mut transactions = self.transactions.lock().await;
        let tx = transactions
            .get_mut(&transaction_id)
            .ok_or_else(|| "Transaction not found".to_string())?;

        // Use a regular query with parameters
        let mut query = sqlx::query(&query);

        for param in params {
            // Need to properly handle different types of JSON values
            match param {
                serde_json::Value::Null => {
                    query = query.bind(None::<String>);
                }
                serde_json::Value::Bool(b) => {
                    query = query.bind(b);
                }
                serde_json::Value::Number(n) => {
                    if let Some(i) = n.as_i64() {
                        query = query.bind(i);
                    } else if let Some(f) = n.as_f64() {
                        query = query.bind(f);
                    } else {
                        return Err("Unsupported number type".to_string());
                    }
                }
                serde_json::Value::String(s) => {
                    query = query.bind(s);
                }
                _ => return Err("Unsupported JSON type for query parameter".to_string()),
            }
        }

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
        // Use a regular query with parameters
        let mut query = sqlx::query(&query);

        for param in params {
            // Need to properly handle different types of JSON values
            match param {
                serde_json::Value::Null => {
                    query = query.bind(None::<String>);
                }
                serde_json::Value::Bool(b) => {
                    query = query.bind(b);
                }
                serde_json::Value::Number(n) => {
                    if let Some(i) = n.as_i64() {
                        query = query.bind(i);
                    } else if let Some(f) = n.as_f64() {
                        query = query.bind(f);
                    } else {
                        return Err("Unsupported number type".to_string());
                    }
                }
                serde_json::Value::String(s) => {
                    query = query.bind(s);
                }
                _ => return Err("Unsupported JSON type for query parameter".to_string()),
            }
        }

        let result = if let Some(tid) = transaction_id {
            let mut transactions = self.transactions.lock().await;
            let tx = transactions
                .get_mut(&tid)
                .ok_or_else(|| "Transaction not found".to_string())?;
            query
                .fetch_optional(&mut **tx)
                .await
                .map_err(|e| e.to_string())?
        } else {
            query
                .fetch_optional(&*self.pool)
                .await
                .map_err(|e| e.to_string())?
        };

        match result {
            Some(row) => {
                // Convert SQLite row to a HashMap
                let mut record = HashMap::new();
                for (i, column) in row.columns().iter().enumerate() {
                    let column_name = column.name();

                    // Handle different column types
                    if let Ok(val) = row.try_get::<i64, _>(i) {
                        record.insert(
                            column_name.to_string(),
                            serde_json::Value::Number(val.into()),
                        );
                    } else if let Ok(val) = row.try_get::<f64, _>(i) {
                        // Convert float to json number
                        if let Some(num) = serde_json::Number::from_f64(val) {
                            record.insert(column_name.to_string(), serde_json::Value::Number(num));
                        } else {
                            record.insert(column_name.to_string(), serde_json::Value::Null);
                        }
                    } else if let Ok(val) = row.try_get::<String, _>(i) {
                        record.insert(column_name.to_string(), serde_json::Value::String(val));
                    } else if let Ok(val) = row.try_get::<bool, _>(i) {
                        record.insert(column_name.to_string(), serde_json::Value::Bool(val));
                    } else {
                        // Unknown or null type
                        record.insert(column_name.to_string(), serde_json::Value::Null);
                    }
                }
                Ok(FetchOneResult { data: Some(record) })
            }
            None => Ok(FetchOneResult { data: None }),
        }
    }

    pub async fn find_many(
        &self,
        transaction_id: Option<String>,
        query: String,
        params: Vec<serde_json::Value>,
    ) -> Result<FetchResult, String> {
        // Use a regular query with parameters
        let mut query = sqlx::query(&query);

        for param in params {
            // Need to properly handle different types of JSON values
            match param {
                serde_json::Value::Null => {
                    query = query.bind(None::<String>);
                }
                serde_json::Value::Bool(b) => {
                    query = query.bind(b);
                }
                serde_json::Value::Number(n) => {
                    if let Some(i) = n.as_i64() {
                        query = query.bind(i);
                    } else if let Some(f) = n.as_f64() {
                        query = query.bind(f);
                    } else {
                        return Err("Unsupported number type".to_string());
                    }
                }
                serde_json::Value::String(s) => {
                    query = query.bind(s);
                }
                _ => return Err("Unsupported JSON type for query parameter".to_string()),
            }
        }

        let rows = if let Some(tid) = transaction_id {
            let mut transactions = self.transactions.lock().await;
            let tx = transactions
                .get_mut(&tid)
                .ok_or_else(|| "Transaction not found".to_string())?;
            query
                .fetch_all(&mut **tx)
                .await
                .map_err(|e| e.to_string())?
        } else {
            query
                .fetch_all(&*self.pool)
                .await
                .map_err(|e| e.to_string())?
        };

        let mut records = Vec::with_capacity(rows.len());
        for row in rows {
            // Convert SQLite row to a HashMap
            let mut record = HashMap::new();
            for (i, column) in row.columns().iter().enumerate() {
                let column_name = column.name();

                // Handle different column types
                if let Ok(val) = row.try_get::<i64, _>(i) {
                    record.insert(
                        column_name.to_string(),
                        serde_json::Value::Number(val.into()),
                    );
                } else if let Ok(val) = row.try_get::<f64, _>(i) {
                    // Convert float to json number
                    if let Some(num) = serde_json::Number::from_f64(val) {
                        record.insert(column_name.to_string(), serde_json::Value::Number(num));
                    } else {
                        record.insert(column_name.to_string(), serde_json::Value::Null);
                    }
                } else if let Ok(val) = row.try_get::<String, _>(i) {
                    record.insert(column_name.to_string(), serde_json::Value::String(val));
                } else if let Ok(val) = row.try_get::<bool, _>(i) {
                    record.insert(column_name.to_string(), serde_json::Value::Bool(val));
                } else {
                    // Unknown or null type
                    record.insert(column_name.to_string(), serde_json::Value::Null);
                }
            }
            records.push(record);
        }

        Ok(FetchResult { data: records })
    }

    pub async fn commit_transaction(&self, transaction_id: String) -> Result<(), String> {
        let mut transactions = self.transactions.lock().await;
        if let Some(tx) = transactions.remove(&transaction_id) {
            tx.commit().await.map_err(|e| e.to_string())?;
        }
        Ok(())
    }

    pub async fn rollback_transaction(&self, transaction_id: String) -> Result<(), String> {
        let mut transactions = self.transactions.lock().await;
        if let Some(tx) = transactions.remove(&transaction_id) {
            tx.rollback().await.map_err(|e| e.to_string())?;
        }
        Ok(())
    }
}

// Tauri command handlers
#[tauri::command]
pub async fn begin_transaction(db: tauri::State<'_, DatabaseConnection>) -> Result<String, String> {
    db.begin_transaction().await
}

#[tauri::command]
pub async fn execute_query(
    db: tauri::State<'_, DatabaseConnection>,
    transaction_id: String,
    query: String,
    params: Vec<serde_json::Value>,
) -> Result<QueryResult, String> {
    db.execute_query(transaction_id, query, params).await
}

#[tauri::command]
pub async fn commit_transaction(
    db: tauri::State<'_, DatabaseConnection>,
    transaction_id: String,
) -> Result<(), String> {
    db.commit_transaction(transaction_id).await
}

#[tauri::command]
pub async fn rollback_transaction(
    db: tauri::State<'_, DatabaseConnection>,
    transaction_id: String,
) -> Result<(), String> {
    db.rollback_transaction(transaction_id).await
}

#[tauri::command]
pub async fn find_one(
    db: tauri::State<'_, DatabaseConnection>,
    transaction_id: Option<String>,
    query: String,
    params: Vec<serde_json::Value>,
) -> Result<FetchOneResult, String> {
    db.find_one(transaction_id, query, params).await
}

#[tauri::command]
pub async fn find_many(
    db: tauri::State<'_, DatabaseConnection>,
    transaction_id: Option<String>,
    query: String,
    params: Vec<serde_json::Value>,
) -> Result<FetchResult, String> {
    db.find_many(transaction_id, query, params).await
}
