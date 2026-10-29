// screenshot.rs - Cross-platform screen capture & clipboard management for DopeNotch
use base64::Engine;
use serde::{Deserialize, Serialize};
use std::fs;
use std::path::PathBuf;
use tauri::AppHandle;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ScreenshotPayload {
    pub base64_image: String,
    pub mime_type: String,
    pub width: u32,
    pub height: u32,
    pub file_path: Option<String>,
    pub timestamp: u64,
}

/// Parse width and height from PNG bytes (IHDR chunk at bytes 16..24)
pub fn parse_png_dimensions(bytes: &[u8]) -> (u32, u32) {
    if bytes.len() >= 24 && &bytes[0..8] == b"\x89PNG\r\n\x1a\n" {
        let width = u32::from_be_bytes([bytes[16], bytes[17], bytes[18], bytes[19]]);
        let height = u32::from_be_bytes([bytes[20], bytes[21], bytes[22], bytes[23]]);
        return (width, height);
    }
    (1920, 1080)
}

/// Put PNG image bytes onto the system clipboard directly
pub fn copy_png_bytes_to_clipboard(png_bytes: &[u8]) -> Result<(), String> {
    #[cfg(target_os = "macos")]
    {
        use objc2::msg_send;
        use objc2::runtime::AnyObject;
        use objc2::ffi::objc_getClass;

        unsafe {
            let pboard_cls = objc_getClass(b"NSPasteboard\0".as_ptr() as *const _);
            if pboard_cls.is_null() {
                return Err("Failed to access NSPasteboard".to_string());
            }
            let ns_pboard: *mut AnyObject = msg_send![pboard_cls as *mut AnyObject, generalPasteboard];
            if ns_pboard.is_null() {
                return Err("Failed to get generalPasteboard".to_string());
            }
            let _: () = msg_send![ns_pboard, clearContents];

            let data_cls = objc_getClass(b"NSData\0".as_ptr() as *const _);
            if data_cls.is_null() {
                return Err("Failed to get NSData class".to_string());
            }
            let ns_data: *mut AnyObject = msg_send![
                data_cls as *mut AnyObject,
                dataWithBytes: png_bytes.as_ptr() as *const std::ffi::c_void,
                length: png_bytes.len()
            ];
            if ns_data.is_null() {
                return Err("Failed to create NSData from PNG bytes".to_string());
            }

            let str_cls = objc_getClass(b"NSString\0".as_ptr() as *const _);
            let png_type: *mut AnyObject = msg_send![
                str_cls as *mut AnyObject,
                stringWithUTF8String: b"public.png\0".as_ptr() as *const _
            ];

            let success: bool = msg_send![ns_pboard, setData: ns_data, forType: png_type];
            if !success {
                return Err("NSPasteboard setData returned false".to_string());
            }
            log::info!("Successfully copied {} bytes PNG to NSPasteboard", png_bytes.len());
            Ok(())
        }
    }

    #[cfg(target_os = "windows")]
    {
        // On Windows, use PowerShell clipboard setter or Windows API
        let tmp_file = std::env::temp_dir().join("dopenotch_clip.png");
        fs::write(&tmp_file, png_bytes).map_err(|e| e.to_string())?;
        let _ = std::process::Command::new("powershell")
            .args(["-NoProfile", "-Command", &format!(
                "Add-Type -AssemblyName System.Windows.Forms; [System.Windows.Forms.Clipboard]::SetImage([System.Drawing.Image]::FromFile('{}'))",
                tmp_file.to_string_lossy()
            )])
            .output();
        Ok(())
    }

    #[cfg(not(any(target_os = "macos", target_os = "windows")))]
    {
        Err("Clipboard image copy not supported on this platform".to_string())
    }
}

/// Capture an interactive region (macOS crosshair or Windows selection)
pub async fn capture_interactive_area(_app: &AppHandle) -> Result<ScreenshotPayload, String> {
    #[cfg(target_os = "macos")]
    {
        let tmp_path = std::env::temp_dir().join(format!("dopenotch_snip_{}.png", chrono::Utc::now().timestamp_millis()));
        let path_str = tmp_path.to_string_lossy().to_string();

        // screencapture -i -x captures interactively with zero sound
        let status = tokio::process::Command::new("screencapture")
            .arg("-i")
            .arg("-x")
            .arg("-t")
            .arg("png")
            .arg(&path_str)
            .status()
            .await
            .map_err(|e| format!("Failed to execute screencapture: {}", e))?;

        if !status.success() || !tmp_path.exists() {
            // User cancelled with Escape or closed crosshair
            let _ = fs::remove_file(&tmp_path);
            return Err("User cancelled capture".to_string());
        }

        let bytes = fs::read(&tmp_path).map_err(|e| format!("Failed to read capture file: {}", e))?;
        if bytes.is_empty() {
            let _ = fs::remove_file(&tmp_path);
            return Err("Captured file is empty".to_string());
        }

        // Copy to system clipboard immediately so user can paste without saving if they wish
        let _ = copy_png_bytes_to_clipboard(&bytes);

        let (width, height) = parse_png_dimensions(&bytes);
        let base64_str = base64::engine::general_purpose::STANDARD.encode(&bytes);

        // Keep file path available in payload for immediate saving or shelf dropping
        let payload = ScreenshotPayload {
            base64_image: format!("data:image/png;base64,{}", base64_str),
            mime_type: "image/png".to_string(),
            width,
            height,
            file_path: Some(path_str),
            timestamp: chrono::Utc::now().timestamp_millis() as u64,
        };

        Ok(payload)
    }

    #[cfg(target_os = "windows")]
    {
        Err("Interactive capture on Windows is handled via in-app snip overlay".to_string())
    }

    #[cfg(not(any(target_os = "macos", target_os = "windows")))]
    {
        Err("Unsupported operating system".to_string())
    }
}

/// Capture the full screen silently
pub async fn capture_full_screen(_app: &AppHandle) -> Result<ScreenshotPayload, String> {
    #[cfg(target_os = "macos")]
    {
        let tmp_path = std::env::temp_dir().join(format!("dopenotch_full_{}.png", chrono::Utc::now().timestamp_millis()));
        let path_str = tmp_path.to_string_lossy().to_string();

        let status = tokio::process::Command::new("screencapture")
            .arg("-x")
            .arg("-m") // Main monitor
            .arg("-t")
            .arg("png")
            .arg(&path_str)
            .status()
            .await
            .map_err(|e| format!("Failed to execute screencapture: {}", e))?;

        if !status.success() || !tmp_path.exists() {
            let _ = fs::remove_file(&tmp_path);
            return Err("Fullscreen capture failed".to_string());
        }

        let bytes = fs::read(&tmp_path).map_err(|e| format!("Failed to read capture file: {}", e))?;
        let _ = copy_png_bytes_to_clipboard(&bytes);

        let (width, height) = parse_png_dimensions(&bytes);
        let base64_str = base64::engine::general_purpose::STANDARD.encode(&bytes);

        Ok(ScreenshotPayload {
            base64_image: format!("data:image/png;base64,{}", base64_str),
            mime_type: "image/png".to_string(),
            width,
            height,
            file_path: Some(path_str),
            timestamp: chrono::Utc::now().timestamp_millis() as u64,
        })
    }

    #[cfg(not(target_os = "macos"))]
    {
        Err("Fullscreen capture is currently implemented for macOS".to_string())
    }
}

/// Save Base64 image data to a specific file or ~/Downloads/DopeNotch
pub fn save_base64_to_disk(base64_data: &str, destination_name: Option<String>) -> Result<String, String> {
    let clean_b64 = if let Some(idx) = base64_data.find(",") {
        &base64_data[idx + 1..]
    } else {
        base64_data
    };

    let bytes = base64::engine::general_purpose::STANDARD
        .decode(clean_b64.trim())
        .map_err(|e| format!("Invalid base64: {}", e))?;

    let filename = destination_name.unwrap_or_else(|| {
        let now = chrono::Local::now();
        format!("DopeNotch-Screenshot-{}.png", now.format("%Y-%m-%d-%H%M%S"))
    });

    let home = std::env::var("HOME")
        .or_else(|_| std::env::var("USERPROFILE"))
        .map_err(|_| "Could not find home directory".to_string())?;

    let downloads_dir = PathBuf::from(home).join("Downloads");
    if !downloads_dir.exists() {
        let _ = fs::create_dir_all(&downloads_dir);
    }

    let target_file = downloads_dir.join(filename);
    fs::write(&target_file, &bytes).map_err(|e| format!("Failed to write screenshot: {}", e))?;

    Ok(target_file.to_string_lossy().to_string())
}
