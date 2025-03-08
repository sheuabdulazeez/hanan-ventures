use std::fs;
use tauri_plugin_sql::{Migration, MigrationKind};

const MIGRATIONS_DIR: &str = concat!(env!("CARGO_MANIFEST_DIR"), "/src/migrations/sql");

fn read_sql_file(filename: &str) -> String {
    fs::read_to_string(format!("{}/{}", MIGRATIONS_DIR, filename))
        .unwrap_or_else(|_| panic!("Error reading migration file: {}", filename))
}

pub fn get_migrations() -> Vec<Migration> {
    let mv1 = read_sql_file("001_initial_schema.sql");
    vec![Migration {
        version: 1,
        description: "Initial schema creation",
        sql: Box::leak(mv1.into_boxed_str()),
        kind: MigrationKind::Up,
    }]
}
