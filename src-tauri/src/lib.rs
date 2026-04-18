use tauri::{
    menu::{Menu, MenuItem, PredefinedMenuItem},
    tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent},
    Manager, WindowEvent,
};
use std::{
    io::{Read, Write},
    net::TcpStream,
    time::Duration,
};

mod foundry_bridge;

// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

#[tauri::command]
fn table_http_get(hostname: String, port: u16, path: String) -> Result<String, String> {
    table_http_request("GET", &hostname, port, &path, None)
}

#[tauri::command]
fn table_http_post_json(
    hostname: String,
    port: u16,
    path: String,
    body: String,
) -> Result<String, String> {
    table_http_request("POST", &hostname, port, &path, Some(&body))
}

#[tauri::command]
fn table_http_put_json(
    hostname: String,
    port: u16,
    path: String,
    body: String,
) -> Result<String, String> {
    table_http_request("PUT", &hostname, port, &path, Some(&body))
}

#[tauri::command]
fn configure_foundry_bridge(
    enabled: bool,
    secret: String,
) -> foundry_bridge::FoundryBridgeSnapshot {
    foundry_bridge::configure_foundry_bridge(enabled, secret)
}

#[tauri::command]
fn foundry_next_turn() -> Result<usize, String> {
    foundry_bridge::send_foundry_next_turn()
}

#[tauri::command]
fn foundry_ping() -> Result<usize, String> {
    foundry_bridge::send_foundry_ping()
}

fn table_http_request(
    method: &str,
    hostname: &str,
    port: u16,
    path: &str,
    body: Option<&str>,
) -> Result<String, String> {
    let mut stream = TcpStream::connect((hostname, port)).map_err(|error| error.to_string())?;
    stream
        .set_read_timeout(Some(Duration::from_secs(5)))
        .map_err(|error| error.to_string())?;
    stream
        .set_write_timeout(Some(Duration::from_secs(5)))
        .map_err(|error| error.to_string())?;

    let body = body.unwrap_or("");
    let request = if method == "POST" || method == "PUT" {
        format!(
            "{method} {path} HTTP/1.1\r\nHost: {hostname}\r\nContent-Type: application/json\r\nContent-Length: {}\r\nConnection: close\r\n\r\n{body}",
            body.as_bytes().len()
        )
    } else {
        format!("GET {path} HTTP/1.1\r\nHost: {hostname}\r\nConnection: close\r\n\r\n")
    };

    stream
        .write_all(request.as_bytes())
        .map_err(|error| error.to_string())?;

    let mut response = String::new();
    stream
        .read_to_string(&mut response)
        .map_err(|error| error.to_string())?;

    let (head, response_body) = response
        .split_once("\r\n\r\n")
        .ok_or_else(|| "Malformed HTTP response from table".to_string())?;

    if !head.starts_with("HTTP/1.1 2") && !head.starts_with("HTTP/1.0 2") {
        return Err(head.lines().next().unwrap_or("HTTP request failed").to_string());
    }

    Ok(response_body.to_string())
}

fn show_main_window(app: &tauri::AppHandle) {
    if let Some(window) = app.get_webview_window("main") {
        let _ = window.show();
        let _ = window.unminimize();
        let _ = window.set_focus();
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .setup(|app| {
            foundry_bridge::start_foundry_bridge(app.handle().clone());

            let open = MenuItem::with_id(app, "open", "Open Console / Открыть пульт", true, None::<&str>)?;
            let separator = PredefinedMenuItem::separator(app)?;
            let quit = MenuItem::with_id(app, "quit", "Quit / Выход", true, None::<&str>)?;
            let menu = Menu::with_items(app, &[&open, &separator, &quit])?;

            TrayIconBuilder::with_id("main-tray")
                .tooltip("DnD Table")
                .icon(app.default_window_icon().unwrap().clone())
                .menu(&menu)
                .show_menu_on_left_click(false)
                .on_menu_event(|app, event| match event.id().as_ref() {
                    "open" => show_main_window(app),
                    "quit" => app.exit(0),
                    _ => {}
                })
                .on_tray_icon_event(|tray, event| {
                    if let TrayIconEvent::Click {
                        button: MouseButton::Left,
                        button_state: MouseButtonState::Up,
                        ..
                    } = event
                    {
                        show_main_window(tray.app_handle());
                    }
                })
                .build(app)?;

            Ok(())
        })
        .on_window_event(|window, event| {
            if let WindowEvent::CloseRequested { api, .. } = event {
                api.prevent_close();
                let _ = window.hide();
            }
        })
        .invoke_handler(tauri::generate_handler![
            greet,
            table_http_get,
            table_http_post_json,
            table_http_put_json,
            configure_foundry_bridge,
            foundry_next_turn,
            foundry_ping
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
