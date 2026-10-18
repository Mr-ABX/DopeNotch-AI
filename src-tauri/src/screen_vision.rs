use serde::{Deserialize, Serialize};
use std::fs;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ScreenVisionPayload {
    pub base64_image: String,
    pub mime_type: String,
    pub width: u32,
    pub height: u32,
    pub timestamp: u64,
}

pub fn capture_screen_snapshot() -> Result<ScreenVisionPayload, String> {
    #[cfg(target_os = "macos")]
    {
        use base64::Engine;
        let tmp_path = std::env::temp_dir().join("dopenotch_vision_snap.jpg");
        let path_str = tmp_path.to_string_lossy().to_string();

        // Run macOS native screencapture silently in JPEG format (fast, compact ~250KB)
        let status = std::process::Command::new("screencapture")
            .arg("-x") // silent, no shutter sound
            .arg("-t")
            .arg("jpg")
            .arg(&path_str)
            .status()
            .map_err(|e| format!("Failed to execute screencapture: {}", e))?;

        if !status.success() {
            return Err("screencapture command failed or was denied permission".to_string());
        }

        if !tmp_path.exists() {
            return Err("Screenshot file not found after capture".to_string());
        }

        let bytes = fs::read(&tmp_path).map_err(|e| format!("Failed to read capture: {}", e))?;
        let _ = fs::remove_file(&tmp_path);

        let base64_str = base64::engine::general_purpose::STANDARD.encode(&bytes);

        Ok(ScreenVisionPayload {
            base64_image: base64_str,
            mime_type: "image/jpeg".to_string(),
            width: 1920,
            height: 1080,
            timestamp: chrono::Utc::now().timestamp_millis() as u64,
        })
    }

    #[cfg(not(target_os = "macos"))]
    {
        Err("Screen vision is currently supported on macOS".to_string())
    }
}
