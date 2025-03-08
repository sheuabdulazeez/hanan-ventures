use base64::{engine::general_purpose, Engine as _};
use tauri::{Url, WebviewWindow};

#[tauri::command]
pub async fn open_print_window(handle: tauri::AppHandle, html_content: String) -> Result<(), String> {
    let data_url = Url::parse(&format!(
        "data:text/html,{}",
        general_purpose::URL_SAFE.encode(html_content)
    )).map_err(|e| e.to_string())?;

    let print_window = tauri::WebviewWindowBuilder::new(
        &handle,
        "print", // window label
        tauri::WebviewUrl::CustomProtocol(data_url)
    )
    .title("Print Invoice")
    .inner_size(800.0, 600.0)
    .build()
    .map_err(|e| e.to_string())?;
    
    if let Err(e) = WebviewWindow::set_shadow(&print_window, true) {
        panic!("Failed to add shadow: {}", e);
    }

    Ok(())
}
