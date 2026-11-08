#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::path::Path;
use walkdir::WalkDir;

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct FileInfo {
    pub name: String,
    #[serde(rename = "fullPath")]
    pub full_path: String,
    #[serde(rename = "relativePath")]
    pub relative_path: String,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct DialogFilter {
    pub name: String,
    pub extensions: Vec<String>,
}

#[tauri::command]
async fn select_file(filters: Option<Vec<DialogFilter>>) -> Result<Option<String>, String> {
    let mut dialog = rfd::AsyncFileDialog::new();
    if let Some(ref flts) = filters {
        for f in flts {
            let exts: Vec<&str> = f.extensions.iter().map(|s| s.as_str()).collect();
            dialog = dialog.add_filter(&f.name, &exts);
        }
    }
    let res = dialog.pick_file().await;
    Ok(res.map(|h| h.path().to_string_lossy().to_string()))
}

#[tauri::command]
async fn select_directory() -> Result<Option<String>, String> {
    let res = rfd::AsyncFileDialog::new().pick_folder().await;
    Ok(res.map(|h| h.path().to_string_lossy().to_string()))
}

#[tauri::command]
fn read_dir(dir_path: String) -> Result<Vec<String>, String> {
    let p = Path::new(&dir_path);
    if !p.exists() {
        return Err("Thư mục không tồn tại".to_string());
    }
    let mut files = Vec::new();
    if let Ok(entries) = std::fs::read_dir(p) {
        for entry in entries.filter_map(|e| e.ok()) {
            files.push(entry.file_name().to_string_lossy().to_string());
        }
    }
    Ok(files)
}

#[tauri::command]
fn read_dir_recursive(dir_path: String) -> Result<Vec<FileInfo>, String> {
    let base = Path::new(&dir_path);
    if !base.exists() {
        return Err("Thư mục không tồn tại".to_string());
    }

    let mut result = Vec::new();
    for entry in WalkDir::new(base).into_iter().filter_map(|e| e.ok()) {
        if entry.file_type().is_file() {
            let full_p = entry.path();
            let rel_p = full_p.strip_prefix(base).unwrap_or(full_p);
            let name = entry.file_name().to_string_lossy().to_string();
            result.push(FileInfo {
                name,
                full_path: full_p.to_string_lossy().to_string(),
                relative_path: rel_p.to_string_lossy().to_string(),
            });
        }
    }
    Ok(result)
}

#[tauri::command]
fn read_file(file_path: String) -> Result<String, String> {
    std::fs::read_to_string(&file_path).map_err(|e| e.to_string())
}

#[tauri::command]
fn write_file(file_path: String, content: String) -> Result<(), String> {
    if let Some(parent) = Path::new(&file_path).parent() {
        let _ = std::fs::create_dir_all(parent);
    }
    std::fs::write(&file_path, content).map_err(|e| e.to_string())
}

#[tauri::command]
fn check_exists(target_path: String) -> bool {
    Path::new(&target_path).exists()
}

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct ProxyResponse {
    pub ok: bool,
    pub status: u16,
    pub text: String,
    pub json: Option<serde_json::Value>,
}

#[tauri::command]
async fn proxy_request(
    url: String,
    method: String,
    headers: Option<HashMap<String, String>>,
    body: Option<serde_json::Value>,
) -> Result<ProxyResponse, String> {
    let client = reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(180))
        .build()
        .map_err(|e| e.to_string())?;

    let http_method = match method.to_uppercase().as_str() {
        "POST" => reqwest::Method::POST,
        "PUT" => reqwest::Method::PUT,
        "DELETE" => reqwest::Method::DELETE,
        _ => reqwest::Method::GET,
    };

    let mut req = client.request(http_method, &url);

    if let Some(hdrs) = headers {
        for (k, v) in hdrs {
            req = req.header(&k, &v);
        }
    }

    if let Some(b) = body {
        req = req.json(&b);
    }

    let resp = req.send().await.map_err(|e| e.to_string())?;
    let status = resp.status().as_u16();
    let ok = resp.status().is_success();
    let text = resp.text().await.map_err(|e| e.to_string())?;

    let json = serde_json::from_str::<serde_json::Value>(&text).ok();

    Ok(ProxyResponse {
        ok,
        status,
        text,
        json,
    })
}

fn main() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![
            select_file,
            select_directory,
            read_dir,
            read_dir_recursive,
            read_file,
            write_file,
            check_exists,
            proxy_request
        ])
        .run(tauri::generate_context!())
        .expect("Lỗi khi khởi chạy ứng dụng Tauri");
}
