// model_manager.rs - Handles downloading Whisper model files from HuggingFace

use anyhow::{anyhow, Result};
use reqwest::Client;
use serde::Serialize;
use std::path::PathBuf;
use tauri::{AppHandle, Emitter};
use tokio::io::AsyncWriteExt;

#[derive(Clone, Serialize)]
pub struct ProgressPayload {
    pub model: String,
    pub progress: u32,
    pub downloaded: u64,
    pub total: u64,
}

/// Download a Whisper model file with progress reporting
pub async fn download_model_file(
    url: &str,
    dest_path: &PathBuf,
    app: &AppHandle,
    model_name: &str,
) -> Result<()> {
    // Ensure parent directory exists
    if let Some(parent) = dest_path.parent() {
        tokio::fs::create_dir_all(parent).await?;
    }

    log::info!("Downloading model '{}' from: {}", model_name, url);

    let client = Client::builder()
        .user_agent("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) Murmur/0.2.0")
        .timeout(std::time::Duration::from_secs(1200))
        .build()?;

    let response = client.get(url).send().await?;

    if !response.status().is_success() {
        return Err(anyhow!("HTTP {} downloading model", response.status()));
    }

    let total = response.content_length().unwrap_or(0);
    let mut downloaded: u64 = 0;
    let mut last_reported = 0u32;
    let mut last_reported_bytes = 0u64;

    // Immediately emit an initial progress event (0%) so frontend syncs instantly
    let _ = app.emit("murmur://download-progress", ProgressPayload {
        model: model_name.to_string(),
        progress: 0,
        downloaded: 0,
        total,
    });

    let temp_path = dest_path.with_extension("download");
    let mut file = tokio::fs::File::create(&temp_path).await?;
    let mut stream = response.bytes_stream();

    use futures_util::StreamExt;
    while let Some(chunk) = stream.next().await {
        let chunk = chunk?;
        file.write_all(&chunk).await?;
        downloaded += chunk.len() as u64;

        let mut should_report = false;
        let mut progress = 0;

        if total > 0 {
            progress = ((downloaded as f64 / total as f64) * 100.0) as u32;
            if progress != last_reported {
                last_reported = progress;
                should_report = true;
            }
        }
        
        // Report at least every 250KB to keep the UI smooth and responsive
        if downloaded.saturating_sub(last_reported_bytes) > 250_000 {
            should_report = true;
        }

        if should_report {
            last_reported_bytes = downloaded;
            let _ = app.emit("murmur://download-progress", ProgressPayload {
                model: model_name.to_string(),
                progress,
                downloaded,
                total,
            });
        }
    }

    file.flush().await?;
    drop(file);
    tokio::fs::rename(&temp_path, dest_path).await?;

    // Final 100% emit
    let _ = app.emit("murmur://download-progress", ProgressPayload {
        model: model_name.to_string(),
        progress: 100,
        downloaded,
        total: if total > 0 { total } else { downloaded },
    });

    log::info!("Model '{}' downloaded successfully to {:?}", model_name, dest_path);

    Ok(())
}

pub async fn download_gemma_model(
    model: &crate::settings::GemmaModel,
    dest_dir: &std::path::Path,
    app: &AppHandle,
) -> Result<()> {
    let repo_id = model.repo_id();
    let files = [
        "config.json",
        "generation_config.json",
        "model.safetensors",
        "special_tokens_map.json",
        "tokenizer.json",
        "tokenizer_config.json",
    ];

    for file in files.iter() {
        let url = format!("https://huggingface.co/{}/resolve/main/{}", repo_id, file);
        let dest_path = dest_dir.join(file);
        
        let model_name_file = format!("{}/{}", model.as_str(), file);
        download_model_file(&url, &dest_path, app, &model_name_file).await?;
    }

    Ok(())
}

#[tauri::command]
pub async fn delete_model_file(
    model: crate::settings::WhisperModel,
    state: tauri::State<'_, crate::MurmurState>,
) -> Result<(), String> {
    let settings = state.settings.lock().unwrap().clone();
    let model_path = settings.model_path(&model);
    
    if model_path.exists() {
        tokio::fs::remove_file(model_path).await.map_err(|e| e.to_string())?;
    }
    
    Ok(())
}

#[tauri::command]
pub fn open_models_directory() -> Result<(), String> {
    let settings = crate::settings::AppSettings::load_or_default();
    let root = crate::storage::DopeNotchStorage::get_root(settings.storage_directory.as_deref());
    let dir = crate::storage::DopeNotchStorage::voice_models_dir(&root);
    crate::storage::DopeNotchStorage::reveal_path(&dir)
}
