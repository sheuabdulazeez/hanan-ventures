use serde::Serialize;
use tauri::{AppHandle, Manager};

#[tauri::command]
pub fn save_bytes_to_downloads(
    app_handle: AppHandle,
    filename: String,
    bytes: Vec<u8>,
) -> Result<String, String> {
    let download_dir = app_handle
        .path()
        .download_dir()
        .map_err(|e| e.to_string())?;
    // A bare file name only: "../" must not let the webview write outside Downloads.
    let safe_name = std::path::Path::new(&filename)
        .file_name()
        .and_then(|n| n.to_str())
        .filter(|n| !n.is_empty())
        .ok_or_else(|| "Invalid file name".to_string())?
        .to_string();
    let path = download_dir.join(safe_name);
    std::fs::write(&path, bytes).map_err(|e| e.to_string())?;
    Ok(path.to_string_lossy().to_string())
}

pub fn db_path(app_handle: &AppHandle) -> Result<std::path::PathBuf, String> {
    let db_name = if cfg!(debug_assertions) {
        "dev.db"
    } else {
        "app.db"
    };
    Ok(app_handle
        .path()
        .app_config_dir()
        .map_err(|e| e.to_string())?
        .join(db_name))
}

#[derive(Debug, Serialize)]
pub struct DatabaseInfo {
    path: String,
    size_bytes: u64,
}

#[tauri::command]
pub fn get_database_info(app_handle: AppHandle) -> Result<DatabaseInfo, String> {
    let path = db_path(&app_handle)?;
    let size_bytes = std::fs::metadata(&path).map_err(|e| e.to_string())?.len();
    Ok(DatabaseInfo {
        path: path.to_string_lossy().to_string(),
        size_bytes,
    })
}
