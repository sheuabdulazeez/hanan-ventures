mod database;
use database::DatabaseConnection;
use tauri::Manager;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::async_runtime::block_on(async {
        tauri::Builder::default()
            .plugin(tauri_plugin_store::Builder::new().build())
            .setup(|app| {
                let db_name = if cfg!(debug_assertions) {
                    "dev.db"
                } else {
                    "app.db"
                };

                let db_path = app.path().app_config_dir().unwrap().join(db_name);

                let app_handle = app.handle().clone();
                tauri::async_runtime::spawn(async move {
                    let db_conn = DatabaseConnection::new(db_path).await;
                    app_handle.manage(db_conn);
                });

                Ok(())
            })
            .invoke_handler(tauri::generate_handler![
                database::begin_transaction,
                database::execute_query,
                database::commit_transaction,
                database::rollback_transaction,
                database::find_one,
                database::find_many,
            ])
            .plugin(tauri_plugin_opener::init())
            .run(tauri::generate_context!())
            .expect("error while running tauri application");
    });
}
