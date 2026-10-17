mod auth;
mod database;
mod files;
mod guard;
mod printer;
use database::Db;
use tauri::Manager;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::async_runtime::block_on(async {
        tauri::Builder::default()
            .plugin(tauri_plugin_fs::init())
            .plugin(tauri_plugin_store::Builder::new().build())
            .setup(|app| {
                let db_name = if cfg!(debug_assertions) {
                    "dev.db"
                } else {
                    "app.db"
                };

                let config_dir = app.path().app_config_dir().unwrap();
                let db_path = config_dir.join(db_name);
                let backup_dir = config_dir.join("backups");

                // Register the state synchronously so no command can run before it
                // exists; the database itself opens on first use (warmed up below).
                app.manage(Db::new(db_path, backup_dir));

                let app_handle = app.handle().clone();
                tauri::async_runtime::spawn(async move {
                    let db = app_handle.state::<Db>();
                    if let Err(e) = db.conn().await {
                        eprintln!("{e}");
                    }
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
                database::backup_database,
                database::get_backup_info,
                database::set_backup_dir,
                auth::login,
                auth::logout,
                auth::get_session,
                auth::create_user,
                auth::update_user,
                auth::set_user_active,
                auth::change_password,
                printer::get_printers,
                printer::print_pdf,
                printer::test_print,
                files::save_bytes_to_downloads,
                files::get_database_info
            ])
            .plugin(tauri_plugin_opener::init())
            .run(tauri::generate_context!())
            .expect("error while running tauri application");
    });
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_list_printers() {
        let printers = printer::get_printers().unwrap();
        println!("Found {} printers:", printers.len());
        for printer in printers {
            println!("  - {} ({})", printer.name, printer.port);
        }
    }
}
