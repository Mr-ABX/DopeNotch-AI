// commands.rs - All Tauri IPC commands exposed to the frontend

use std::collections::HashMap;
use tauri::{AppHandle, Emitter, Manager, State};
use tokio::task;
use anyhow::Result;

use crate::audio::AudioCapture;
use crate::model_manager;
use crate::settings::{AppSettings, WhisperModel};
use crate::transcriber::{self, TranscriberState};
use crate::voxcoder;
use crate::overlay;
use crate::MurmurState;

// ============================================================
// Recording Commands
// ============================================================

#[tauri::command]
pub async fn start_recording(
    app: AppHandle,
    _state: State<'_, MurmurState>,
) -> Result<(), String> {
    start_recording_internal(&app).await.map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn toggle_recording(
    app: AppHandle,
    state: State<'_, MurmurState>,
) -> Result<bool, String> {
    let is_rec = *state.is_recording.lock().unwrap();
    if is_rec {
        stop_recording_internal(&app).await.map_err(|e| e.to_string())?;
        Ok(false)
    } else {
        start_recording_internal(&app).await.map_err(|e| e.to_string())?;
        Ok(true)
    }
}

pub async fn start_recording_internal(app: &AppHandle) -> Result<()> {
    if !crate::license::is_pro_active() && crate::license::get_today_dictation_seconds() >= 300 {
        let quota_msg = "Community limit reached (5 min/day). Upgrade to DopeNotch Pro for unlimited dictation.";
        let _ = app.emit("murmur://quota-exceeded", quota_msg);
        let _ = app.emit_to("notch", "murmur://quota-exceeded", quota_msg);
        return Err(anyhow::anyhow!(quota_msg));
    }

    let state = app.state::<MurmurState>();

    {
        let mut is_recording = state.is_recording.lock().unwrap();
        if *is_recording {
            return Ok(()); // Already recording
        }
        *is_recording = true;
    }

    let settings = state.settings.lock().unwrap().clone();

    // Show the visualizer FIRST
    overlay::show_visualizer(app, &settings);

    // Emit event to all windows and specifically to the notch window
    let _ = app.emit("murmur://recording-started", ());
    let _ = app.emit_to("notch", "murmur://recording-started", ());

    // Start audio capture in background
    let app_clone = app.clone();
    let transcriber = state.transcriber.clone();
    let is_recording = state.is_recording.clone();

    task::spawn_blocking(move || {
        let mut audio = match AudioCapture::new() {
            Ok(a) => a,
            Err(e) => {
                log::error!("Failed to create audio capture: {}", e);
                let _ = app_clone.emit("murmur://error", format!("Audio capture error: {}", e));
                return;
            }
        };
        audio.clear_buffer();

        if let Err(e) = audio.start() {
            log::error!("Failed to start audio: {}", e);
            let _ = app_clone.emit("murmur://error", format!("Microphone error: {}", e));
            return;
        }

        let mut frame_count: u64 = 0;

        // Wait until recording is stopped (60 FPS Native Audio Snapshot loop)
        loop {
            std::thread::sleep(std::time::Duration::from_millis(16));
            let recording = is_recording.lock().unwrap();

            if *recording {
                let snapshot = audio.get_recent_snapshot(1024);
                let _ = app_clone.emit("audio_level", snapshot.level);
                let _ = app_clone.emit_to("notch", "audio_level", snapshot.level);
                let _ = app_clone.emit("murmur://audio-snapshot", &snapshot);
                let _ = app_clone.emit_to("notch", "murmur://audio-snapshot", &snapshot);

                frame_count = frame_count.wrapping_add(1);
                if frame_count % 90 == 0 {
                    log::info!("[audio_level] emitting level={:.4}", snapshot.level);
                }
            } else {
                // Recording stopped! Drop lock, stop audio capture, and trigger transcription
                drop(recording);

                // Stop audio and get samples
                match audio.stop() {
                    Ok(samples) => {
                        let _ = app_clone.emit("murmur://recording-stopped", ());
                        let _ = app_clone.emit_to("notch", "murmur://recording-stopped", ());
                        
                        tauri::async_runtime::spawn(async move {
                            handle_transcription(app_clone, samples, settings, transcriber).await;
                        });
                    }
                    Err(e) => {
                        let _ = app_clone.emit("murmur://error", format!("Audio error: {}", e));
                    }
                }
                break;
            }
        }
    });

    Ok(())
}

async fn handle_transcription(
    app: AppHandle,
    samples: Vec<f32>,
    settings: AppSettings,
    transcriber: std::sync::Arc<std::sync::Mutex<TranscriberState>>,
) {
    if samples.is_empty() {
        overlay::hide_visualizers(&app, &settings);
        let _ = app.emit("murmur://error", "No audio captured");
        return;
    }

    let max_amp = samples.iter().map(|s| s.abs()).fold(0.0f32, |a, b| a.max(b));
    if max_amp < 0.005 {
        overlay::hide_visualizers(&app, &settings);
        let _ = app.emit("murmur://error", "Microphone input was silent (is it muted?)");
        return;
    }

    let duration_secs = (samples.len() as f32 / 16000.0).round() as u64;
    crate::license::add_dictation_seconds(duration_secs);

    // Run inference (cloud first, fallback to local)
    match transcriber::transcribe_hybrid(&samples, &settings, &transcriber).await {
        Ok(text) => {
            handle_transcription_result(app, text, settings).await;
        }
        Err(e) => {
            let _ = app.emit("murmur://error", format!("Transcription failed: {}", e));
        }
    }
}

async fn handle_transcription_result(
    app: AppHandle,
    mut text: String,
    settings: AppSettings,
) {
    if text.is_empty() {
        let _ = app.emit("murmur://error", "No speech detected");
        return;
    }

    log::info!("Transcribed text successfully: {:?}", text);

    // Apply VoxCoder mode if enabled
    if settings.voxcoder_mode {
        text = voxcoder::apply_voxcoder_mode(&text);
    }

    // Emit transcript to UI
    let _ = app.emit("murmur://transcript-done", &text);
    let _ = app.emit_to("notch", "murmur://transcript-done", &text);

    // Save to persistent backend history
    let mut history = crate::settings::AppSettings::load_history();
    let item = crate::settings::VoiceHistoryItem {
        id: format!("{}", chrono::Utc::now().timestamp_millis()),
        text: text.clone(),
        timestamp: chrono::Utc::now().timestamp_millis(),
        date_str: chrono::Local::now().format("%b %d • %I:%M %p").to_string(),
        model: if settings.cloud_provider == crate::settings::CloudProvider::Local {
            settings.model.as_str().to_string()
        } else {
            format!("{:?}", settings.cloud_provider)
        },
    };
    history.insert(0, item);
    if history.len() > 200 {
        history.truncate(200);
    }
    let _ = crate::settings::AppSettings::save_history(&history);
    let _ = app.emit("murmur://history-updated", &history);
    let _ = app.emit_to("notch", "murmur://history-updated", &history);
    let _ = app.emit_to("settings", "murmur://history-updated", &history);

    // Also auto-save to SuPaste Clipboard Vault
    let clip_item = crate::clipboard_listener::ClipboardItemPayload {
        id: format!("clip-{}", chrono::Utc::now().timestamp_millis()),
        content: text.clone(),
        category: "dictation".to_string(),
        timestamp: "Just now".to_string(),
        timestamp_raw: chrono::Utc::now().timestamp_millis(),
        source_app: if settings.operating_mode == crate::settings::OperatingMode::Assistant { "AI Assistant".to_string() } else { "DopeNotch".to_string() },
        char_count: text.chars().count(),
        word_count: text.split_whitespace().count(),
        is_pinned: false,
    };
    let mut clips = crate::clipboard_listener::load_saved_clipboard();
    clips.retain(|c| c.content != clip_item.content);
    clips.insert(0, clip_item.clone());
    let max_history = crate::license::get_max_history();
    if clips.len() > max_history {
        clips.truncate(max_history);
    }
    crate::clipboard_listener::save_clipboard_to_disk(&clips);
    let _ = app.emit("murmur://clipboard-changed", &clip_item);
    let _ = app.emit_to("notch", "murmur://clipboard-changed", &clip_item);

    let state = app.state::<MurmurState>();
    let purpose = state.recording_purpose.lock().unwrap().take();

    if purpose.as_deref() == Some("voice_note") {
        overlay::hide_visualizers(&app, &settings);
        let title = format!("Voice Note • {}", chrono::Local::now().format("%b %d, %I:%M %p"));
        let _ = crate::notes::add_note(
            title,
            text.clone(),
            vec!["voice".to_string(), "quick-note".to_string()],
        );
        let _ = app.emit("dopenotch://note-saved", "Saved to Notes");
        let _ = app.emit_to("notch", "dopenotch://note-saved", "Saved to Notes");
        let _ = app.emit("dopenotch://notes-updated", ());
        let _ = app.emit_to("settings", "dopenotch://notes-updated", ());
        // Never auto-paste voice notes
    } else if purpose.as_deref() == Some("meeting") {
        overlay::hide_visualizers(&app, &settings);
        let _ = app.emit("dopenotch://meeting-chunk", &text);
        let _ = app.emit_to("notch", "dopenotch://meeting-chunk", &text);
        // Never auto-paste meeting transcripts
    } else if settings.operating_mode == crate::settings::OperatingMode::Assistant {
        overlay::show_visualizer(&app, &settings);
        overlay::resize_notch(&app, true, None, None);
        let _ = app.emit("murmur://assistant-voice-input", &text);
        let _ = app.emit_to("notch", "murmur://assistant-voice-input", &text);
    } else {
        // Hide visualizer if auto_hidden mode is active
        overlay::hide_visualizers(&app, &settings);

        // Auto-paste if enabled
        if settings.auto_paste {
            // Small delay to allow macOS/Windows to finish switching focus
            std::thread::sleep(std::time::Duration::from_millis(150));
            if let Err(e) = paste_text(&app, &text) {
                log::error!("Failed to paste text: {}", e);
                let _ = app.emit("murmur://error", "Accessibility Permission Required: Go to System Settings -> Privacy & Security -> Accessibility and enable it for your Terminal/IDE.".to_string());
            }
        }
    }
}

#[cfg(target_os = "macos")]
pub fn is_accessibility_granted() -> bool {
    #[link(name = "ApplicationServices", kind = "framework")]
    extern "C" {
        fn AXIsProcessTrusted() -> bool;
    }
    unsafe {
        AXIsProcessTrusted()
    }
}

#[cfg(target_os = "macos")]
pub fn request_accessibility_permissions() -> bool {
    #[link(name = "ApplicationServices", kind = "framework")]
    extern "C" {
        fn AXIsProcessTrusted() -> bool;
        fn AXIsProcessTrustedWithOptions(options: *const std::ffi::c_void) -> bool;
        fn CFDictionaryCreate(
            allocator: *const std::ffi::c_void,
            keys: *const *const std::ffi::c_void,
            values: *const *const std::ffi::c_void,
            numValues: isize,
            keyCallBacks: *const std::ffi::c_void,
            valueCallBacks: *const std::ffi::c_void,
        ) -> *const std::ffi::c_void;
        fn CFRelease(cf: *const std::ffi::c_void);
        static kAXTrustedCheckOptionPrompt: *const std::ffi::c_void;
        static kCFBooleanTrue: *const std::ffi::c_void;
    }

    unsafe {
        if AXIsProcessTrusted() {
            return true;
        }

        let keys = [kAXTrustedCheckOptionPrompt];
        let values = [kCFBooleanTrue];
        let dict = CFDictionaryCreate(
            std::ptr::null(),
            keys.as_ptr(),
            values.as_ptr(),
            1,
            std::ptr::null(),
            std::ptr::null(),
        );
        let trusted = AXIsProcessTrustedWithOptions(dict);
        if !dict.is_null() {
            CFRelease(dict);
        }
        trusted
    }
}

#[cfg(target_os = "macos")]
fn simulate_paste_macos() -> bool {
    #[link(name = "CoreGraphics", kind = "framework")]
    extern "C" {
        fn CGEventCreateKeyboardEvent(source: *mut std::ffi::c_void, virtual_key: u16, key_down: bool) -> *mut std::ffi::c_void;
        fn CGEventSetFlags(event: *mut std::ffi::c_void, flags: u64);
        fn CGEventPost(tap: u32, event: *mut std::ffi::c_void);
        fn CFRelease(cf: *const std::ffi::c_void);
    }

    const K_CG_HID_EVENT_TAP: u32 = 0;
    const K_CG_EVENT_FLAG_MASK_COMMAND: u64 = 0x00100000;
    const K_VK_ANSI_V: u16 = 0x09;

    unsafe {
        // Key down: Command + V
        let event_down = CGEventCreateKeyboardEvent(std::ptr::null_mut(), K_VK_ANSI_V, true);
        if event_down.is_null() {
            return false;
        }
        CGEventSetFlags(event_down, K_CG_EVENT_FLAG_MASK_COMMAND);
        // Post to HID tap only — HID events propagate to the session level automatically.
        // Posting to both taps would deliver the keystroke twice (causing double-paste).
        CGEventPost(K_CG_HID_EVENT_TAP, event_down);
        CFRelease(event_down);

        std::thread::sleep(std::time::Duration::from_millis(25));

        // Key up: Command + V
        let event_up = CGEventCreateKeyboardEvent(std::ptr::null_mut(), K_VK_ANSI_V, false);
        if !event_up.is_null() {
            CGEventSetFlags(event_up, K_CG_EVENT_FLAG_MASK_COMMAND);
            CGEventPost(K_CG_HID_EVENT_TAP, event_up);
            CFRelease(event_up);
        }

        true
    }
}

#[cfg(target_os = "windows")]
fn simulate_paste_windows() {
    #[link(name = "user32")]
    extern "system" {
        fn keybd_event(bVk: u8, bScan: u8, dwFlags: u32, dwExtraInfo: usize);
    }
    const VK_CONTROL: u8 = 0x11;
    const VK_V: u8 = 0x56;
    const KEYEVENTF_KEYUP: u32 = 0x0002;

    unsafe {
        keybd_event(VK_CONTROL, 0, 0, 0);
        keybd_event(VK_V, 0, 0, 0);
        std::thread::sleep(std::time::Duration::from_millis(25));
        keybd_event(VK_V, 0, KEYEVENTF_KEYUP, 0);
        keybd_event(VK_CONTROL, 0, KEYEVENTF_KEYUP, 0);
    }
}

/// Use the clipboard to paste text into the active window
fn paste_text(app: &AppHandle, text: &str) -> Result<()> {
    use tauri_plugin_clipboard_manager::ClipboardExt;
    
    // Copy the text to the system clipboard
    let _ = app.clipboard().write_text(text.to_string());

    // Wait a tiny bit for the clipboard to register
    std::thread::sleep(std::time::Duration::from_millis(60));

    #[cfg(target_os = "macos")]
    {
        // Check/request accessibility permission
        let _ = request_accessibility_permissions();

        // 1. Native CoreGraphics HID event post (fastest & works directly in active window)
        let native_success = simulate_paste_macos();

        // 2. Secondary fallback: AppleScript keystroke
        if !native_success {
            let _ = std::process::Command::new("osascript")
                .arg("-e")
                .arg("tell application \"System Events\" to keystroke \"v\" using command down")
                .output();
        }
    }

    #[cfg(target_os = "windows")]
    {
        simulate_paste_windows();
    }

    #[cfg(not(any(target_os = "macos", target_os = "windows")))]
    {
        use enigo::{Enigo, Keyboard, Key, Settings, Direction};
        if let Ok(mut enigo) = Enigo::new(&Settings::default()) {
            let _ = enigo.key(Key::Control, Direction::Press);
            let _ = enigo.key(Key::Layout('v'), Direction::Click);
            let _ = enigo.key(Key::Control, Direction::Release);
        }
    }

    Ok(())
}

#[tauri::command]
pub async fn paste_text_direct(text: String, app: AppHandle) -> Result<(), String> {
    #[cfg(target_os = "macos")]
    {
        extern "C" {
            fn paste_text_to_target_app(text: *const std::os::raw::c_char) -> bool;
        }
        let c_text = std::ffi::CString::new(text.clone()).unwrap_or_default();
        let success = unsafe { paste_text_to_target_app(c_text.as_ptr()) };
        if success {
            return Ok(());
        }
    }
    paste_text(&app, &text).map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn paste_image_direct(base64_data: String, _app: AppHandle) -> Result<(), String> {
    #[cfg(target_os = "macos")]
    {
        extern "C" {
            fn paste_image_to_target_app(base64_data: *const std::os::raw::c_char) -> bool;
        }
        let c_b64 = std::ffi::CString::new(base64_data).unwrap_or_default();
        let success = unsafe { paste_image_to_target_app(c_b64.as_ptr()) };
        if success {
            return Ok(());
        }
        return Err("Failed to paste image".to_string());
    }
    #[cfg(not(target_os = "macos"))]
    Err("Image pasting only supported on macOS currently".to_string())
}

#[tauri::command]
pub async fn stop_recording(
    app: AppHandle,
    _state: State<'_, MurmurState>,
) -> Result<(), String> {
    stop_recording_internal(&app).await.map_err(|e| e.to_string())
}

pub async fn stop_recording_internal(app: &AppHandle) -> Result<()> {
    let state = app.state::<MurmurState>();
    let mut is_recording = state.is_recording.lock().unwrap();
    *is_recording = false;
    Ok(())
}

// ============================================================
// Settings Commands
// ============================================================

#[tauri::command]
pub fn open_settings(app: AppHandle) {
    overlay::show_settings_window(&app);
}

#[tauri::command]
pub fn get_settings(state: State<'_, MurmurState>) -> AppSettings {
    state.settings.lock().unwrap().clone()
}

#[tauri::command]
pub fn save_settings(
    settings: AppSettings,
    app: AppHandle,
    state: State<'_, MurmurState>,
) -> Result<(), String> {
    let mut current = state.settings.lock().unwrap();
    *current = settings.clone();
    let res = settings.save().map_err(|e| e.to_string());

    #[cfg(target_os = "macos")]
    {
        if settings.show_dock_icon {
            let _ = app.set_activation_policy(tauri::ActivationPolicy::Regular);
            crate::overlay::set_dock_icon();
        } else {
            let _ = app.set_activation_policy(tauri::ActivationPolicy::Accessory);
        }
    }

    // Update tray icon dynamically
    if let Some(tray) = app.tray_by_id("main") {
        let tray_icon_bytes = match settings.tray_icon_style {
            crate::settings::TrayIconStyle::Flat => include_bytes!("../icons/tray-flat.png").as_slice(),
            crate::settings::TrayIconStyle::Color => include_bytes!("../icons/tray.png").as_slice(),
        };
        if let Ok(tray_icon) = tauri::image::Image::from_bytes(tray_icon_bytes) {
            let _ = tray.set_icon(Some(tray_icon));
            let _ = tray.set_icon_as_template(settings.tray_icon_style == crate::settings::TrayIconStyle::Flat);
        }
    }
    
    // Update visualizer visibility
    if settings.visibility_mode == crate::settings::VisibilityMode::AlwaysOn {
        overlay::show_visualizer(&app, &settings);
    } else {
        // If it's autohidden, we should hide it unless we are currently recording.
        let is_recording = *state.is_recording.lock().unwrap();
        if !is_recording {
            // Since we override the internal check for AlwaysOn, here we can just use the internal logic:
            // if we pass settings, it will hide it because it's AutoHidden.
            overlay::hide_visualizers(&app, &settings);
        }
    }

    // Update global shortcut dynamically
    crate::setup_global_shortcut(&app, &settings.hotkey);

    // Broadcast updated settings to ALL webviews
    let _ = app.emit("murmur://settings-updated", &settings);
    let _ = app.emit_to("notch", "murmur://settings-updated", &settings);
    let _ = app.emit_to("settings", "murmur://settings-updated", &settings);
    let _ = app.emit_to("overlay", "murmur://settings-updated", &settings);

    res
}

// ============================================================
// Model Management Commands
// ============================================================

#[tauri::command]
pub fn get_downloaded_models(state: State<'_, MurmurState>) -> HashMap<String, bool> {
    let settings = state.settings.lock().unwrap();
    let models = [
        WhisperModel::TinyEn,
        WhisperModel::Tiny,
        WhisperModel::BaseEn,
        WhisperModel::Base,
        WhisperModel::SmallEn,
        WhisperModel::Small,
        WhisperModel::MediumEn,
        WhisperModel::Medium,
        WhisperModel::LargeV3Turbo,
    ];
    models.iter().map(|m| {
        (m.as_str().to_string(), settings.is_model_downloaded(m))
    }).collect()
}

#[tauri::command]
pub fn get_voice_history() -> Vec<crate::settings::VoiceHistoryItem> {
    crate::settings::AppSettings::load_history()
}

#[tauri::command]
pub fn delete_voice_history_item(id: String, app: AppHandle) -> Vec<crate::settings::VoiceHistoryItem> {
    let mut history = crate::settings::AppSettings::load_history();
    history.retain(|item| item.id != id);
    let _ = crate::settings::AppSettings::save_history(&history);
    let _ = app.emit("murmur://history-updated", &history);
    history
}

#[tauri::command]
pub fn clear_voice_history(app: AppHandle) -> Result<(), String> {
    let empty: Vec<crate::settings::VoiceHistoryItem> = Vec::new();
    let _ = crate::settings::AppSettings::save_history(&empty);
    let _ = app.emit("murmur://history-updated", &empty);
    Ok(())
}

#[tauri::command]
pub fn get_clipboard_history() -> Vec<crate::clipboard_listener::ClipboardItemPayload> {
    crate::clipboard_listener::load_saved_clipboard()
}

#[tauri::command]
pub fn delete_clipboard_item(id: String, app: AppHandle) -> Vec<crate::clipboard_listener::ClipboardItemPayload> {
    let mut items = crate::clipboard_listener::load_saved_clipboard();
    items.retain(|c| c.id != id);
    crate::clipboard_listener::save_clipboard_to_disk(&items);
    let _ = app.emit("murmur://clipboard-history-updated", &items);
    let _ = app.emit_to("notch", "murmur://clipboard-history-updated", &items);
    items
}

#[tauri::command]
pub fn toggle_pin_clipboard_item(id: String, app: AppHandle) -> Vec<crate::clipboard_listener::ClipboardItemPayload> {
    let mut items = crate::clipboard_listener::load_saved_clipboard();
    for c in &mut items {
        if c.id == id {
            c.is_pinned = !c.is_pinned;
        }
    }
    crate::clipboard_listener::save_clipboard_to_disk(&items);
    let _ = app.emit("murmur://clipboard-history-updated", &items);
    let _ = app.emit_to("notch", "murmur://clipboard-history-updated", &items);
    items
}

#[tauri::command]
pub fn clear_clipboard_history(app: AppHandle) -> Result<(), String> {
    let empty: Vec<crate::clipboard_listener::ClipboardItemPayload> = Vec::new();
    crate::clipboard_listener::save_clipboard_to_disk(&empty);
    let _ = app.emit("murmur://clipboard-history-updated", &empty);
    let _ = app.emit_to("notch", "murmur://clipboard-history-updated", &empty);
    Ok(())
}

#[tauri::command]
pub async fn download_model(
    model: WhisperModel,
    app: AppHandle,
    state: State<'_, MurmurState>,
) -> Result<(), String> {
    let settings = state.settings.lock().unwrap().clone();
    let model_path = settings.model_path(&model);
    let model_url = model.download_url();
    let model_name = model.as_str().to_string();

    task::spawn(async move {
        match model_manager::download_model_file(&model_url, &model_path, &app, &model_name).await {
            Ok(()) => {
                let _ = app.emit("murmur://model-downloaded", model_name);
            }
            Err(e) => {
                let _ = app.emit("murmur://error", format!("Download failed: {}", e));
            }
        }
    });

    Ok(())
}

#[tauri::command]
pub fn get_downloaded_gemma_models(state: State<'_, MurmurState>) -> HashMap<String, bool> {
    let settings = state.settings.lock().unwrap();
    let models = [crate::settings::GemmaModel::E2B, crate::settings::GemmaModel::E4B];
    models.iter().map(|m| {
        (m.as_str().to_string(), settings.is_gemma_model_downloaded(m))
    }).collect()
}

#[tauri::command]
pub async fn download_gemma_model_cmd(
    model: crate::settings::GemmaModel,
    app: AppHandle,
    state: State<'_, MurmurState>,
) -> Result<(), String> {
    let settings = state.settings.lock().unwrap().clone();
    let dest_dir = settings.gemma_model_path(&model);
    let model_name = model.as_str().to_string();

    task::spawn(async move {
        match model_manager::download_gemma_model(&model, &dest_dir, &app).await {
            Ok(()) => {
                let _ = app.emit("murmur://gemma-downloaded", model_name);
            }
            Err(e) => {
                let _ = app.emit("murmur://error", format!("Gemma download failed: {}", e));
            }
        }
    });

    Ok(())
}

#[tauri::command]
pub async fn delete_gemma_model(
    model: crate::settings::GemmaModel,
    state: State<'_, MurmurState>,
) -> Result<(), String> {
    let settings = state.settings.lock().unwrap().clone();
    let dest_dir = settings.gemma_model_path(&model);

    if dest_dir.exists() {
        tokio::fs::remove_dir_all(dest_dir).await.map_err(|e| e.to_string())?;
    }
    
    Ok(())
}

// ============================================================
// App Commands
// ============================================================

#[tauri::command]
pub fn quit_app() {
    std::process::exit(0);
}

#[tauri::command]
pub async fn clear_all_app_data(app: tauri::AppHandle) -> Result<(), String> {
    // Delete settings directory
    let config_path = crate::settings::AppSettings::config_path();
    if let Some(config_dir) = config_path.parent() {
        if config_dir.exists() {
            let _ = tokio::fs::remove_dir_all(config_dir).await;
        }
    }
    
    // Delete models directory
    let models_dir = crate::settings::AppSettings::models_dir();
    if let Some(data_dir) = models_dir.parent() {
        if data_dir.exists() {
            let _ = tokio::fs::remove_dir_all(data_dir).await;
        }
    }
    
    // Also quit the app after clearing
    app.exit(0);
    Ok(())
}

#[tauri::command]
pub fn set_notch_expanded(app: tauri::AppHandle, expanded: bool, width: Option<f64>, height: Option<f64>) {
    overlay::resize_notch(&app, expanded, width, height);
}

#[tauri::command]
pub fn preview_notch(app: tauri::AppHandle, state: State<'_, MurmurState>) {
    let settings = state.settings.lock().unwrap().clone();
    overlay::show_visualizer(&app, &settings);
    let app_clone = app.clone();
    let settings_clone = settings.clone();
    tauri::async_runtime::spawn(async move {
        tokio::time::sleep(tokio::time::Duration::from_millis(2500)).await;
        if settings_clone.visibility_mode == crate::settings::VisibilityMode::AutoHidden {
            overlay::hide_visualizers(&app_clone, &settings_clone);
        }
    });
}

#[tauri::command]
pub fn toggle_shelf(app: tauri::AppHandle) {
    #[cfg(target_os = "macos")]
    {
        extern "C" {
            fn record_target_application();
        }
        unsafe {
            record_target_application();
        }
    }
    if let Some(window) = app.get_webview_window("notch") {
        let _ = window.show();
        let _ = window.set_focus();
    }
    let _ = app.emit("murmur://toggle-shelf", ());
}

#[tauri::command]
pub fn toggle_search(app: tauri::AppHandle) {
    #[cfg(target_os = "macos")]
    {
        extern "C" {
            fn record_target_application();
        }
        unsafe {
            record_target_application();
        }
    }
    if let Some(window) = app.get_webview_window("notch") {
        let _ = window.show();
        let _ = window.set_focus();
    }
    let _ = app.emit("murmur://toggle-search", ());
}

#[tauri::command]
pub fn toggle_hud(app: tauri::AppHandle) {
    toggle_shelf(app);
}

// ============================================================
// macOS Native Tools & Permissions Commands
// ============================================================

#[cfg(target_os = "macos")]
extern "C" {
    fn sample_screen_color(
        callback: extern "C" fn(*const std::os::raw::c_char, *mut std::os::raw::c_void),
        context: *mut std::os::raw::c_void,
    );
    fn check_mic_permission_status() -> std::os::raw::c_int;
    fn request_mic_permission(
        callback: extern "C" fn(bool, *mut std::os::raw::c_void),
        context: *mut std::os::raw::c_void,
    );
    fn perform_screen_ocr() -> *mut std::os::raw::c_char;
    fn check_grammar_native(input: *const std::os::raw::c_char) -> *mut std::os::raw::c_char;
    fn capture_screen_as_base64() -> *mut std::os::raw::c_char;
    fn free_c_string(ptr: *mut std::os::raw::c_char);
}

#[tauri::command]
pub async fn pick_screen_color(app: AppHandle) -> Result<String, String> {
    #[cfg(target_os = "macos")]
    {
        use std::ffi::CStr;
        use std::os::raw::{c_char, c_void};
        use tauri_plugin_clipboard_manager::ClipboardExt;
        use tokio::sync::oneshot;

        let (tx, rx) = oneshot::channel::<String>();
        let boxed_tx = Box::into_raw(Box::new(tx));

        extern "C" fn on_color_picked(hex_ptr: *const c_char, ctx: *mut c_void) {
            let tx = unsafe { Box::from_raw(ctx as *mut oneshot::Sender<String>) };
            let hex = if hex_ptr.is_null() {
                String::new()
            } else {
                unsafe { CStr::from_ptr(hex_ptr) }
                    .to_str()
                    .unwrap_or("")
                    .to_string()
            };
            let _ = tx.send(hex);
        }

        unsafe {
            sample_screen_color(on_color_picked, boxed_tx as *mut c_void);
        }

        let hex = rx.await.map_err(|e| e.to_string())?;
        if !hex.is_empty() {
            let _ = app.clipboard().write_text(hex.clone());

            let clip_item = crate::clipboard_listener::ClipboardItemPayload {
                id: format!("clip-{}", chrono::Utc::now().timestamp_millis()),
                content: hex.clone(),
                category: "color".to_string(),
                timestamp: "Just now".to_string(),
                timestamp_raw: chrono::Utc::now().timestamp_millis(),
                source_app: "ColorPicker".to_string(),
                char_count: hex.chars().count(),
                word_count: 1,
                is_pinned: false,
            };
            let mut clips = crate::clipboard_listener::load_saved_clipboard();
            clips.retain(|c| c.content != clip_item.content);
            clips.insert(0, clip_item.clone());
            let max_history = crate::license::get_max_history();
            if clips.len() > max_history {
                clips.truncate(max_history);
            }
            crate::clipboard_listener::save_clipboard_to_disk(&clips);
            let _ = app.emit("murmur://clipboard-changed", &clip_item);
            let _ = app.emit_to("notch", "murmur://clipboard-changed", &clip_item);
            let _ = app.emit("murmur://clipboard-history-updated", &clips);
            let _ = app.emit_to("notch", "murmur://clipboard-history-updated", &clips);
        }
        Ok(hex)
    }
    #[cfg(not(target_os = "macos"))]
    {
        Err("Color sampler is only supported on macOS".to_string())
    }
}

#[tauri::command]
pub async fn grab_screen_ocr(app: AppHandle) -> Result<String, String> {
    #[cfg(target_os = "macos")]
    {
        use std::ffi::CStr;
        use tauri_plugin_clipboard_manager::ClipboardExt;

        let ocr_ptr = unsafe { perform_screen_ocr() };
        if ocr_ptr.is_null() {
            return Ok(String::new());
        }

        let extracted_text = unsafe {
            let s = CStr::from_ptr(ocr_ptr).to_string_lossy().into_owned();
            free_c_string(ocr_ptr);
            s
        };

        let trimmed = extracted_text.trim();
        if !trimmed.is_empty() {
            let text_val = trimmed.to_string();
            let _ = app.clipboard().write_text(text_val.clone());

            let word_cnt = text_val.split_whitespace().count();
            let clip_item = crate::clipboard_listener::ClipboardItemPayload {
                id: format!("clip-{}", chrono::Utc::now().timestamp_millis()),
                content: text_val.clone(),
                category: "text".to_string(),
                timestamp: "Just now".to_string(),
                timestamp_raw: chrono::Utc::now().timestamp_millis(),
                source_app: "Screen OCR".to_string(),
                char_count: text_val.chars().count(),
                word_count: word_cnt,
                is_pinned: false,
            };

            let mut clips = crate::clipboard_listener::load_saved_clipboard();
            clips.retain(|c| c.content != clip_item.content);
            clips.insert(0, clip_item.clone());
            let max_history = crate::license::get_max_history();
            if clips.len() > max_history {
                clips.truncate(max_history);
            }
            crate::clipboard_listener::save_clipboard_to_disk(&clips);
            let _ = app.emit("murmur://clipboard-changed", &clip_item);
            let _ = app.emit_to("notch", "murmur://clipboard-changed", &clip_item);
            let _ = app.emit("murmur://clipboard-history-updated", &clips);
            let _ = app.emit_to("notch", "murmur://clipboard-history-updated", &clips);
        }

        Ok(trimmed.to_string())
    }
    #[cfg(not(target_os = "macos"))]
    {
        Err("OCR is currently supported on macOS using Apple Vision Framework".to_string())
    }
}

#[tauri::command]
pub async fn check_text_grammar(text: String) -> Result<String, String> {
    #[cfg(target_os = "macos")]
    {
        use std::ffi::{CStr, CString};

        let c_text = CString::new(text).map_err(|e| e.to_string())?;
        let report_ptr = unsafe { check_grammar_native(c_text.as_ptr()) };
        if report_ptr.is_null() {
            return Ok("No grammar issues detected. Your text is clean!".to_string());
        }

        let report = unsafe {
            let s = CStr::from_ptr(report_ptr).to_string_lossy().into_owned();
            free_c_string(report_ptr);
            s
        };

        Ok(report)
    }
    #[cfg(not(target_os = "macos"))]
    {
        Err("Grammar check is currently supported on macOS".to_string())
    }
}

#[derive(serde::Serialize, serde::Deserialize, Clone, Debug)]
pub struct UserExtension {
    pub id: String,
    pub title: String,
    pub description: String,
    pub icon: String,
    pub mode: String, // "clipboard" | "fullOutput" | "silent"
    pub file_path: String,
    pub language: String, // "bash" | "python" | "node" | "binary"
    pub author: Option<String>,
}

#[tauri::command]
pub async fn load_user_extensions() -> Result<Vec<UserExtension>, String> {
    let mut extensions = Vec::new();
    let settings = crate::settings::AppSettings::load_or_default();
    let root = crate::storage::DopeNotchStorage::get_root(settings.storage_directory.as_deref());
    let _ = crate::storage::DopeNotchStorage::init_and_migrate(&root);
    let ext_dir = crate::storage::DopeNotchStorage::extensions_dir(&root);

    let entries = match std::fs::read_dir(&ext_dir) {
        Ok(e) => e,
        Err(_) => return Ok(extensions),
    };

    for entry in entries.flatten() {
        let path = entry.path();
        if path.is_file() {
            let filename = path.file_name().unwrap_or_default().to_string_lossy().to_string();
            if filename.starts_with('.') || filename.eq_ignore_ascii_case("readme.md") {
                continue;
            }

            let ext = path.extension().unwrap_or_default().to_string_lossy().to_lowercase();
            let language = match ext.as_str() {
                "sh" | "bash" | "zsh" => "bash".to_string(),
                "py" => "python".to_string(),
                "js" | "mjs" | "ts" => "node".to_string(),
                _ => "binary".to_string(),
            };

            if let Ok(content) = std::fs::read_to_string(&path) {
                let mut title = filename.clone();
                let mut description = format!("Custom {} script extension", language);
                let mut icon = "⚡".to_string();
                let mut mode = "clipboard".to_string();
                let mut author = None;

                for line in content.lines().take(40) {
                    let trimmed = line.trim();
                    if trimmed.starts_with("# @raycast.title") || trimmed.starts_with("// @raycast.title") {
                        title = trimmed.split_whitespace().skip(2).collect::<Vec<_>>().join(" ");
                    } else if trimmed.starts_with("# @raycast.description") || trimmed.starts_with("// @raycast.description") {
                        description = trimmed.split_whitespace().skip(2).collect::<Vec<_>>().join(" ");
                    } else if trimmed.starts_with("# @raycast.icon") || trimmed.starts_with("// @raycast.icon") {
                        icon = trimmed.split_whitespace().skip(2).collect::<Vec<_>>().join(" ");
                    } else if trimmed.starts_with("# @raycast.mode") || trimmed.starts_with("// @raycast.mode") {
                        mode = trimmed.split_whitespace().skip(2).collect::<Vec<_>>().join(" ");
                    } else if trimmed.starts_with("# @raycast.author") || trimmed.starts_with("// @raycast.author") {
                        author = Some(trimmed.split_whitespace().skip(2).collect::<Vec<_>>().join(" "));
                    }
                }

                extensions.push(UserExtension {
                    id: format!("user-ext-{}", filename),
                    title,
                    description,
                    icon,
                    mode,
                    file_path: path.to_string_lossy().to_string(),
                    language,
                    author,
                });
            }
        } else if path.is_dir() {
            let manifest_path = path.join("manifest.json");
            if manifest_path.exists() {
                if let Ok(manifest_content) = std::fs::read_to_string(&manifest_path) {
                    if let Ok(val) = serde_json::from_str::<serde_json::Value>(&manifest_content) {
                        let dir_name = path.file_name().unwrap_or_default().to_string_lossy().to_string();
                        let title = val["title"].as_str().unwrap_or(&dir_name).to_string();
                        let description = val["description"].as_str().unwrap_or("Folder extension").to_string();
                        let icon = val["icon"].as_str().unwrap_or("📦").to_string();
                        let mode = val["mode"].as_str().unwrap_or("clipboard").to_string();
                        let entry_file = val["entry"].as_str().unwrap_or("index.js");
                        let full_entry = path.join(entry_file);

                        extensions.push(UserExtension {
                            id: format!("user-pkg-{}", dir_name),
                            title,
                            description,
                            icon,
                            mode,
                            file_path: full_entry.to_string_lossy().to_string(),
                            language: "node".to_string(),
                            author: val["author"].as_str().map(|s| s.to_string()),
                        });
                    }
                }
            }
        }
    }

    Ok(extensions)
}

#[tauri::command]
pub async fn open_extensions_folder() -> Result<String, String> {
    let settings = crate::settings::AppSettings::load_or_default();
    let root = crate::storage::DopeNotchStorage::get_root(settings.storage_directory.as_deref());
    let _ = crate::storage::DopeNotchStorage::init_and_migrate(&root);
    let ext_dir = crate::storage::DopeNotchStorage::extensions_dir(&root);
    crate::storage::DopeNotchStorage::reveal_path(&ext_dir)?;
    Ok(ext_dir.to_string_lossy().to_string())
}

#[tauri::command]
pub async fn open_local_models_folder() -> Result<String, String> {
    let settings = crate::settings::AppSettings::load_or_default();
    let root = crate::storage::DopeNotchStorage::get_root(settings.storage_directory.as_deref());
    let _ = crate::storage::DopeNotchStorage::init_and_migrate(&root);
    let models_dir = crate::storage::DopeNotchStorage::models_dir(&root);
    crate::storage::DopeNotchStorage::reveal_path(&models_dir)?;
    Ok(models_dir.to_string_lossy().to_string())
}

#[tauri::command]
pub async fn get_storage_info(state: State<'_, MurmurState>) -> Result<crate::storage::StorageInfo, String> {
    let settings = state.settings.lock().unwrap().clone();
    let is_custom = settings.storage_directory.is_some();
    let root = crate::storage::DopeNotchStorage::get_root(settings.storage_directory.as_deref());
    let _ = crate::storage::DopeNotchStorage::init_and_migrate(&root);
    let stats = crate::storage::DopeNotchStorage::get_stats(&root, is_custom);
    Ok(stats)
}

#[tauri::command]
pub async fn open_storage_directory(subfolder: Option<String>, state: State<'_, MurmurState>) -> Result<String, String> {
    let settings = state.settings.lock().unwrap().clone();
    let root = crate::storage::DopeNotchStorage::get_root(settings.storage_directory.as_deref());
    let _ = crate::storage::DopeNotchStorage::init_and_migrate(&root);

    let target = match subfolder.as_deref() {
        Some("notes") => crate::storage::DopeNotchStorage::notes_dir(&root),
        Some("history") => crate::storage::DopeNotchStorage::history_dir(&root),
        Some("extensions") => crate::storage::DopeNotchStorage::extensions_dir(&root),
        Some("voice") | Some("models/voice") => crate::storage::DopeNotchStorage::voice_models_dir(&root),
        Some("ai") | Some("models/ai") => crate::storage::DopeNotchStorage::ai_models_dir(&root),
        Some("models") => crate::storage::DopeNotchStorage::models_dir(&root),
        _ => root.clone(),
    };

    crate::storage::DopeNotchStorage::reveal_path(&target)?;
    Ok(target.to_string_lossy().to_string())
}

#[tauri::command]
pub async fn change_storage_directory(new_path: String, state: State<'_, MurmurState>) -> Result<crate::storage::StorageInfo, String> {
    let clean = new_path.trim().to_string();
    if clean.is_empty() {
        return Err("Storage path cannot be empty".to_string());
    }

    let target_root = crate::storage::DopeNotchStorage::get_root(Some(&clean));
    crate::storage::DopeNotchStorage::init_and_migrate(&target_root)
        .map_err(|e| format!("Failed to initialize storage directory: {}", e))?;

    let mut settings = state.settings.lock().unwrap().clone();
    settings.storage_directory = Some(clean);
    settings.save().map_err(|e| e.to_string())?;
    *state.settings.lock().unwrap() = settings;

    let stats = crate::storage::DopeNotchStorage::get_stats(&target_root, true);
    Ok(stats)
}

#[tauri::command]
pub async fn reset_storage_directory(state: State<'_, MurmurState>) -> Result<crate::storage::StorageInfo, String> {
    let target_root = crate::storage::DopeNotchStorage::get_root(None);
    crate::storage::DopeNotchStorage::init_and_migrate(&target_root)
        .map_err(|e| format!("Failed to initialize default storage directory: {}", e))?;

    let mut settings = state.settings.lock().unwrap().clone();
    settings.storage_directory = None;
    settings.save().map_err(|e| e.to_string())?;
    *state.settings.lock().unwrap() = settings;

    let stats = crate::storage::DopeNotchStorage::get_stats(&target_root, false);
    Ok(stats)
}

#[tauri::command]
pub async fn pick_storage_folder(app: AppHandle) -> Result<Option<String>, String> {
    use tauri_plugin_dialog::DialogExt;
    let folder = app.dialog().file().blocking_pick_folder();
    Ok(folder.map(|f| f.to_string()))
}

#[tauri::command]
pub async fn check_or_start_ollama() -> Result<crate::ollama_manager::OllamaEngineStatus, String> {
    let _ = crate::ollama_manager::OllamaManager::ensure_running().await;
    Ok(crate::ollama_manager::OllamaManager::get_status().await)
}

#[tauri::command]
pub async fn get_ollama_status() -> Result<crate::ollama_manager::OllamaEngineStatus, String> {
    Ok(crate::ollama_manager::OllamaManager::get_status().await)
}

#[tauri::command]
pub async fn execute_user_extension(
    app: AppHandle,
    file_path: String,
    mode: String,
) -> Result<String, String> {
    use std::process::Command;
    use tauri_plugin_clipboard_manager::ClipboardExt;

    let path = std::path::Path::new(&file_path);
    if !path.exists() {
        return Err(format!("Extension file not found at: {}", file_path));
    }

    // Security Gate: Ensure the script resides strictly inside the trusted extensions directory
    let root = crate::storage::DopeNotchStorage::get_root(None);
    let trusted_dir = crate::storage::DopeNotchStorage::extensions_dir(&root);
    let legacy_dir = dirs::home_dir().map(|h| h.join(".dopenotch").join("extensions"));

    let canonical_file = path
        .canonicalize()
        .map_err(|e| format!("Invalid extension file path: {}", e))?;

    let in_trusted = if let Ok(canonical_trusted) = trusted_dir.canonicalize() {
        canonical_file.starts_with(&canonical_trusted)
    } else {
        false
    };

    let in_legacy = if let Some(legacy) = legacy_dir {
        if let Ok(canonical_legacy) = legacy.canonicalize() {
            canonical_file.starts_with(&canonical_legacy)
        } else {
            false
        }
    } else {
        false
    };

    if !in_trusted && !in_legacy {
        return Err(format!(
            "Security restriction: Execution blocked. Extension scripts can only be executed from your trusted DopeNotch extensions folder ({:?})",
            trusted_dir
        ));
    }

    let ext = canonical_file.extension().unwrap_or_default().to_string_lossy().to_lowercase();
    let mut cmd = match ext.as_str() {
        "sh" | "bash" | "zsh" => {
            let mut c = Command::new("/bin/bash");
            c.arg(&canonical_file);
            c
        }
        "py" => {
            let mut c = Command::new("python3");
            c.arg(&canonical_file);
            c
        }
        "js" | "mjs" => {
            let mut c = Command::new("node");
            c.arg(&canonical_file);
            c
        }
        _ => {
            Command::new(&canonical_file)
        }
    };

    let output = cmd.output().map_err(|e| format!("Failed to run extension: {}", e))?;
    let stdout = String::from_utf8_lossy(&output.stdout).trim().to_string();
    let stderr = String::from_utf8_lossy(&output.stderr).trim().to_string();

    if !output.status.success() {
        return Err(if !stderr.is_empty() { stderr } else { format!("Exited with code: {:?}", output.status.code()) });
    }

    if (mode == "clipboard" || mode == "silent" || mode == "compact") && !stdout.is_empty() {
        let _ = app.clipboard().write_text(stdout.clone());

        let clip_item = crate::clipboard_listener::ClipboardItemPayload {
            id: format!("clip-{}", chrono::Utc::now().timestamp_millis()),
            content: stdout.clone(),
            category: "text".to_string(),
            timestamp: "Just now".to_string(),
            timestamp_raw: chrono::Utc::now().timestamp_millis(),
            source_app: path.file_stem().unwrap_or_default().to_string_lossy().to_string(),
            char_count: stdout.chars().count(),
            word_count: stdout.split_whitespace().count(),
            is_pinned: false,
        };
        let mut clips = crate::clipboard_listener::load_saved_clipboard();
        clips.retain(|c| c.content != clip_item.content);
        clips.insert(0, clip_item.clone());
        let max_history = crate::license::get_max_history();
        if clips.len() > max_history {
            clips.truncate(max_history);
        }
        crate::clipboard_listener::save_clipboard_to_disk(&clips);
        let _ = app.emit("murmur://clipboard-changed", &clip_item);
        let _ = app.emit_to("notch", "murmur://clipboard-changed", &clip_item);
        let _ = app.emit("murmur://clipboard-history-updated", &clips);
        let _ = app.emit_to("notch", "murmur://clipboard-history-updated", &clips);
    }

    Ok(stdout)
}

#[derive(serde::Serialize, serde::Deserialize, Clone, Debug)]
pub struct SystemPermissionsStatus {
    pub accessibility: bool,
    pub microphone: bool,
    pub microphone_status: String,
}

#[tauri::command]
pub fn check_system_permissions() -> SystemPermissionsStatus {
    #[cfg(target_os = "macos")]
    {
        let accessibility = is_accessibility_granted();
        let mic_code = unsafe { check_mic_permission_status() };
        let (microphone, microphone_status) = match mic_code {
            3 => (true, "authorized".to_string()),
            2 => (false, "denied".to_string()),
            1 => (false, "restricted".to_string()),
            _ => (false, "not_determined".to_string()),
        };
        SystemPermissionsStatus {
            accessibility,
            microphone,
            microphone_status,
        }
    }
    #[cfg(not(target_os = "macos"))]
    {
        SystemPermissionsStatus {
            accessibility: true,
            microphone: true,
            microphone_status: "authorized".to_string(),
        }
    }
}

#[tauri::command]
pub async fn request_system_permissions() -> Result<SystemPermissionsStatus, String> {
    #[cfg(target_os = "macos")]
    {
        use std::os::raw::c_void;
        use tokio::sync::oneshot;

        let accessibility = request_accessibility_permissions();
        let (tx, rx) = oneshot::channel::<bool>();
        let boxed_tx = Box::into_raw(Box::new(tx));

        extern "C" fn on_mic_permission(granted: bool, ctx: *mut c_void) {
            let tx = unsafe { Box::from_raw(ctx as *mut oneshot::Sender<bool>) };
            let _ = tx.send(granted);
        }

        unsafe {
            request_mic_permission(on_mic_permission, boxed_tx as *mut c_void);
        }

        let mic_granted = rx.await.unwrap_or(false);
        let mic_code = unsafe { check_mic_permission_status() };
        let (_, microphone_status) = match mic_code {
            3 => (true, "authorized".to_string()),
            2 => (false, "denied".to_string()),
            1 => (false, "restricted".to_string()),
            _ => (mic_granted, if mic_granted { "authorized".to_string() } else { "not_determined".to_string() }),
        };

        Ok(SystemPermissionsStatus {
            accessibility,
            microphone: mic_granted || mic_code == 3,
            microphone_status,
        })
    }
    #[cfg(not(target_os = "macos"))]
    {
        Ok(SystemPermissionsStatus {
            accessibility: true,
            microphone: true,
            microphone_status: "authorized".to_string(),
        })
    }
}

// ============================================================
// Pixel Distance Ruler Commands
// ============================================================

#[tauri::command]
pub async fn open_ruler(app: AppHandle) -> Result<(), String> {
    overlay::show_ruler_overlay(&app);
    Ok(())
}

#[tauri::command]
pub async fn close_ruler(app: AppHandle) -> Result<(), String> {
    overlay::hide_ruler_overlay(&app);
    Ok(())
}

#[tauri::command]
pub async fn toggle_ruler(app: AppHandle) -> Result<(), String> {
    overlay::toggle_ruler_overlay(&app);
    Ok(())
}

#[tauri::command]
pub async fn open_loupe(app: AppHandle) -> Result<(), String> {
    #[cfg(target_os = "macos")]
    {
        use std::ffi::CStr;
        let b64_ptr = unsafe { capture_screen_as_base64() };
        let data_url = if !b64_ptr.is_null() {
            let s = unsafe { CStr::from_ptr(b64_ptr).to_string_lossy().into_owned() };
            unsafe { free_c_string(b64_ptr) };
            s
        } else {
            String::new()
        };

        overlay::show_ruler_overlay(&app);
        let _ = app.emit("dopenotch://activate-loupe", data_url);
        Ok(())
    }
    #[cfg(not(target_os = "macos"))]
    {
        Err("Screen Loupe is currently supported on macOS".to_string())
    }
}

#[tauri::command]
pub async fn close_loupe(app: AppHandle) -> Result<(), String> {
    overlay::hide_ruler_overlay(&app);
    let _ = app.emit("dopenotch://deactivate-loupe", ());
    Ok(())
}

// ============================================================
// System Vitals & Media Control Commands
// ============================================================

#[derive(serde::Serialize, serde::Deserialize, Clone, Debug)]
pub struct SystemVitals {
    pub cpu_usage: f32,
    pub mem_used_gb: f32,
    pub mem_total_gb: f32,
    pub mem_percent: f32,
    pub battery_percent: u8,
    pub is_charging: bool,
    pub has_battery: bool,
}

#[derive(serde::Serialize, serde::Deserialize, Clone, Debug)]
pub struct MediaPlaybackStatus {
    pub active: bool,
    pub app: String,
    pub state: String,
    pub title: String,
    pub artist: String,
    pub album: String,
    pub duration: u64,
    pub position: u64,
}

#[tauri::command]
pub async fn get_system_vitals() -> Result<SystemVitals, String> {
    #[cfg(target_os = "macos")]
    {
        // 1. Battery Info via pmset
        let mut battery_percent = 100u8;
        let mut is_charging = false;
        let mut has_battery = false;

        if let Ok(out) = std::process::Command::new("pmset").arg("-g").arg("batt").output() {
            let text = String::from_utf8_lossy(&out.stdout);
            if text.contains("InternalBattery") {
                has_battery = true;
                if let Some(pct_idx) = text.find("%;") {
                    let prefix = &text[..pct_idx];
                    if let Some(start_idx) = prefix.rfind(|c: char| !c.is_ascii_digit()) {
                        if let Ok(p) = prefix[start_idx + 1..].parse::<u8>() {
                            battery_percent = p;
                        }
                    }
                }
                is_charging = text.contains("charging") || text.contains("AC Power") || text.contains("charged;");
            }
        }

        // 2. Memory Info via sysctl & vm_stat
        let total_bytes: u64 = if let Ok(out) = std::process::Command::new("sysctl").arg("-n").arg("hw.memsize").output() {
            String::from_utf8_lossy(&out.stdout).trim().parse::<u64>().unwrap_or(16 * 1024 * 1024 * 1024)
        } else {
            16 * 1024 * 1024 * 1024
        };

        let mem_total_gb = (total_bytes as f32 / 1_073_741_824.0 * 10.0).round() / 10.0;

        let mut used_bytes: u64 = (total_bytes as f64 * 0.45) as u64;
        if let Ok(out) = std::process::Command::new("vm_stat").output() {
            let text = String::from_utf8_lossy(&out.stdout);
            let mut page_size: u64 = 4096;
            if let Some(pos) = text.find("page size of ") {
                let rest = &text[pos + 13..];
                if let Some(end) = rest.find(" bytes") {
                    if let Ok(ps) = rest[..end].trim().parse::<u64>() {
                        page_size = ps;
                    }
                }
            }

            let mut active_pages: u64 = 0;
            let mut wired_pages: u64 = 0;

            for line in text.lines() {
                if line.starts_with("Pages active:") {
                    let num_str: String = line.chars().filter(|c| c.is_ascii_digit()).collect();
                    active_pages = num_str.parse::<u64>().unwrap_or(0);
                } else if line.starts_with("Pages wired down:") {
                    let num_str: String = line.chars().filter(|c| c.is_ascii_digit()).collect();
                    wired_pages = num_str.parse::<u64>().unwrap_or(0);
                }
            }

            if active_pages > 0 || wired_pages > 0 {
                used_bytes = (active_pages + wired_pages) * page_size;
            }
        }

        let mem_used_gb = (used_bytes as f32 / 1_073_741_824.0 * 10.0).round() / 10.0;
        let mem_percent = ((mem_used_gb / mem_total_gb) * 100.0).clamp(5.0, 99.0);

        // 3. CPU Load via vm.loadavg normalized across CPU cores
        let num_cores = num_cpus::get().max(1) as f32;
        let mut cpu_usage: f32 = 12.0;

        if let Ok(out) = std::process::Command::new("sysctl").arg("-n").arg("vm.loadavg").output() {
            let text = String::from_utf8_lossy(&out.stdout);
            if let Some(start) = text.find('{') {
                let rest = &text[start + 1..];
                let parts: Vec<&str> = rest.split_whitespace().collect();
                if let Some(first) = parts.first() {
                    if let Ok(load1) = first.parse::<f32>() {
                        cpu_usage = ((load1 / num_cores) * 100.0).clamp(4.0, 98.0);
                    }
                }
            }
        }

        Ok(SystemVitals {
            cpu_usage: (cpu_usage * 10.0).round() / 10.0,
            mem_used_gb,
            mem_total_gb,
            mem_percent: (mem_percent * 10.0).round() / 10.0,
            battery_percent,
            is_charging,
            has_battery,
        })
    }
    #[cfg(not(target_os = "macos"))]
    {
        Ok(SystemVitals {
            cpu_usage: 18.0,
            mem_used_gb: 8.2,
            mem_total_gb: 16.0,
            mem_percent: 51.2,
            battery_percent: 100,
            is_charging: true,
            has_battery: false,
        })
    }
}

#[tauri::command]
pub async fn get_media_playback_status() -> Result<MediaPlaybackStatus, String> {
    #[cfg(target_os = "macos")]
    {
        let script = r#"
function run() {
  const se = Application("System Events");
  const procs = se.processes.name();
  let res = { active: false, app: "", state: "stopped", title: "", artist: "", album: "", duration: 0, position: 0 };
  if (procs.indexOf("Spotify") !== -1) {
    try {
      const s = Application("Spotify");
      res.active = true;
      res.app = "Spotify";
      res.state = s.playerState();
      res.title = s.currentTrack.name();
      res.artist = s.currentTrack.artist();
      res.album = s.currentTrack.album();
      res.duration = Math.round(s.currentTrack.duration() / 1000);
      res.position = Math.round(s.playerPosition());
    } catch (e) {}
  } else if (procs.indexOf("Music") !== -1) {
    try {
      const m = Application("Music");
      res.active = true;
      res.app = "Music";
      res.state = m.playerState();
      res.title = m.currentTrack.name();
      res.artist = m.currentTrack.artist();
      res.album = m.currentTrack.album();
      res.duration = Math.round(m.currentTrack.duration());
      res.position = Math.round(m.playerPosition());
    } catch (e) {}
  }
  return JSON.stringify(res);
}
"#;
        let output = std::process::Command::new("osascript")
            .arg("-l")
            .arg("JavaScript")
            .arg("-e")
            .arg(script)
            .output();

        if let Ok(out) = output {
            let text = String::from_utf8_lossy(&out.stdout).trim().to_string();
            if let Ok(status) = serde_json::from_str::<MediaPlaybackStatus>(&text) {
                return Ok(status);
            }
        }

        Ok(MediaPlaybackStatus {
            active: false,
            app: String::new(),
            state: "stopped".to_string(),
            title: String::new(),
            artist: String::new(),
            album: String::new(),
            duration: 0,
            position: 0,
        })
    }
    #[cfg(not(target_os = "macos"))]
    {
        Ok(MediaPlaybackStatus {
            active: false,
            app: String::new(),
            state: "stopped".to_string(),
            title: String::new(),
            artist: String::new(),
            album: String::new(),
            duration: 0,
            position: 0,
        })
    }
}

#[tauri::command]
pub async fn control_media_playback(action: String) -> Result<bool, String> {
    #[cfg(target_os = "macos")]
    {
        let script = r#"
function run(argv) {
  const action = argv[0];
  const se = Application("System Events");
  const procs = se.processes.name();
  if (procs.indexOf("Spotify") !== -1) {
    const s = Application("Spotify");
    if (action === "playpause") s.playpause();
    else if (action === "next") s.nextTrack();
    else if (action === "prev") s.previousTrack();
    return "ok";
  } else if (procs.indexOf("Music") !== -1) {
    const m = Application("Music");
    if (action === "playpause") m.playpause();
    else if (action === "next") m.nextTrack();
    else if (action === "prev") m.previousTrack();
    return "ok";
  }
  return "no_player";
}
"#;
        let output = std::process::Command::new("osascript")
            .arg("-l")
            .arg("JavaScript")
            .arg("-e")
            .arg(script)
            .arg(&action)
            .output();

        match output {
            Ok(out) => {
                let res = String::from_utf8_lossy(&out.stdout).trim().to_string();
                Ok(res == "ok")
            }
            Err(e) => Err(e.to_string()),
        }
    }
    #[cfg(not(target_os = "macos"))]
    {
        Ok(false)
    }
}

// ============================================================================
// Notes & Checklists Persistence Commands (~/.dopenotch/notes.json)
// ============================================================================

#[tauri::command]
pub async fn get_notes() -> Result<Vec<crate::notes::NoteItem>, String> {
    crate::notes::load_notes_from_disk()
}

#[tauri::command]
pub async fn save_note(
    title: String,
    content: String,
    tags: Vec<String>,
) -> Result<crate::notes::NoteItem, String> {
    crate::notes::add_note(title, content, tags)
}

#[tauri::command]
pub async fn delete_note(id: String) -> Result<(), String> {
    crate::notes::delete_note(&id)
}

#[tauri::command]
pub async fn update_note(
    id: String,
    title: Option<String>,
    content: Option<String>,
    tags: Option<Vec<String>>,
    is_pinned: Option<bool>,
) -> Result<crate::notes::NoteItem, String> {
    crate::notes::update_note(&id, title, content, tags, is_pinned)
}

#[tauri::command]
pub async fn start_voice_note_recording(app: AppHandle) -> Result<(), String> {
    let state = app.state::<MurmurState>();
    *state.recording_purpose.lock().unwrap() = Some("voice_note".to_string());
    start_recording_internal(&app).await.map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn start_meeting_recording(app: AppHandle) -> Result<(), String> {
    let state = app.state::<MurmurState>();
    *state.recording_purpose.lock().unwrap() = Some("meeting".to_string());
    start_recording_internal(&app).await.map_err(|e| e.to_string())
}

#[tauri::command]
pub fn toggle_voice_note(app: AppHandle) {
    let state = app.state::<MurmurState>();
    let is_rec = *state.is_recording.lock().unwrap();
    if is_rec {
        let app_clone = app.clone();
        tauri::async_runtime::spawn(async move {
            let _ = stop_recording_internal(&app_clone).await;
        });
    } else {
        *state.recording_purpose.lock().unwrap() = Some("voice_note".to_string());
        if let Some(notch_win) = app.get_webview_window("notch") {
            let _ = notch_win.show();
        }
        let app_clone = app.clone();
        tauri::async_runtime::spawn(async move {
            let _ = start_recording_internal(&app_clone).await;
        });
    }
}

#[derive(Debug, serde::Serialize, serde::Deserialize, Clone)]
pub struct SystemFileResult {
    pub name: String,
    pub path: String,
    pub kind: String,
    pub size_bytes: Option<u64>,
    pub modified_timestamp: Option<u64>,
    pub is_image: bool,
}

#[derive(Debug, serde::Serialize, serde::Deserialize, Clone)]
pub struct FilePreviewPayload {
    pub path: String,
    pub name: String,
    pub kind: String,
    pub size_bytes: u64,
    pub modified_timestamp: u64,
    pub is_image: bool,
    pub preview_base64: Option<String>,
}

#[tauri::command]
pub async fn inspect_website(app: AppHandle, url: String) -> Result<crate::web_inspector::WebInspectionResult, String> {
    let _ = app.emit("dopenotch://inspect-fetching-started", &url);
    let _ = app.emit_to("notch", "dopenotch://inspect-fetching-started", &url);

    match crate::web_inspector::inspect_url(&url).await {
        Ok(result) => {
            let _ = app.emit("dopenotch://inspect-fetching-done", &result);
            let _ = app.emit_to("notch", "dopenotch://inspect-fetching-done", &result);
            let _ = app.emit("dopenotch://inspector-data", &result);
            let _ = app.emit_to("inspector", "dopenotch://inspector-data", &result);
            
            // Open inspector window automatically
            if let Some(win) = app.get_webview_window("inspector") {
                let _ = win.show();
                let _ = win.set_focus();
            }
            Ok(result)
        }
        Err(e) => {
            let _ = app.emit("dopenotch://inspect-fetching-error", &e);
            let _ = app.emit_to("notch", "dopenotch://inspect-fetching-error", &e);
            Err(e)
        }
    }
}

#[tauri::command]
pub fn open_inspector_window(app: AppHandle) {
    if let Some(win) = app.get_webview_window("inspector") {
        let _ = win.show();
        let _ = win.set_focus();
        let _ = win.center();
    }
}

#[tauri::command]
pub fn close_inspector_window(app: AppHandle) {
    if let Some(win) = app.get_webview_window("inspector") {
        let _ = win.hide();
    }
}

#[tauri::command]
pub fn get_active_browser_tab_url() -> Option<String> {
    crate::web_inspector::get_frontmost_browser_url()
}

#[tauri::command]
pub async fn download_asset_to_disk(
    target_data: String,
    suggested_filename: Option<String>,
    is_svg_content: bool,
) -> Result<String, String> {
    let base_dir = dirs::document_dir()
        .unwrap_or_else(|| std::path::PathBuf::from("."))
        .join("DopeNotch")
        .join("downloads");

    std::fs::create_dir_all(&base_dir).map_err(|e| e.to_string())?;

    let filename = suggested_filename.unwrap_or_else(|| {
        let ext = if is_svg_content { "svg" } else { "png" };
        format!("asset_{}.{}", uuid::Uuid::new_v4().simple(), ext)
    });

    let safe_filename: String = filename
        .chars()
        .map(|c| if c.is_alphanumeric() || c == '.' || c == '-' || c == '_' { c } else { '_' })
        .collect();

    let dest_path = base_dir.join(&safe_filename);

    if is_svg_content {
        std::fs::write(&dest_path, target_data.as_bytes()).map_err(|e| e.to_string())?;
    } else {
        if target_data.starts_with("data:") {
            if let Some(comma_pos) = target_data.find(',') {
                let b64 = &target_data[comma_pos + 1..];
                use base64::Engine;
                let decoded = base64::engine::general_purpose::STANDARD
                    .decode(b64)
                    .map_err(|e| format!("Base64 decode failed: {}", e))?;
                std::fs::write(&dest_path, decoded).map_err(|e| e.to_string())?;
            } else {
                return Err("Invalid data URI".to_string());
            }
        } else {
            let client = reqwest::Client::builder()
                .timeout(std::time::Duration::from_secs(20))
                .build()
                .map_err(|e| e.to_string())?;

            let bytes = client
                .get(&target_data)
                .send()
                .await
                .map_err(|e| e.to_string())?
                .bytes()
                .await
                .map_err(|e| e.to_string())?;

            std::fs::write(&dest_path, bytes).map_err(|e| e.to_string())?;
        }
    }

    Ok(dest_path.to_string_lossy().to_string())
}

#[tauri::command]
pub async fn search_system_files(query: String) -> Result<Vec<SystemFileResult>, String> {
    let q = query.trim();
    if q.is_empty() {
        return Ok(vec![]);
    }

    #[cfg(target_os = "macos")]
    {
        let output = tokio::process::Command::new("mdfind")
            .arg("-name")
            .arg(q)
            .output()
            .await
            .map_err(|e| e.to_string())?;

        if !output.status.success() {
            return Ok(vec![]);
        }

        let stdout = String::from_utf8_lossy(&output.stdout);
        let mut results = Vec::new();
        for line in stdout.lines().take(25) {
            let path_str = line.trim();
            if path_str.is_empty() {
                continue;
            }
            let p = std::path::Path::new(path_str);
            if let Some(name) = p.file_name().and_then(|n| n.to_str()) {
                let ext = p.extension().and_then(|e| e.to_str()).unwrap_or("file").to_lowercase();
                let is_image = matches!(ext.as_str(), "png" | "jpg" | "jpeg" | "webp" | "gif" | "svg" | "bmp" | "ico" | "tiff");
                let meta = p.metadata().ok();
                results.push(SystemFileResult {
                    name: name.to_string(),
                    path: path_str.to_string(),
                    kind: ext,
                    size_bytes: meta.as_ref().map(|m| m.len()),
                    modified_timestamp: meta.and_then(|m| m.modified().ok())
                        .and_then(|t| t.duration_since(std::time::UNIX_EPOCH).ok())
                        .map(|d| d.as_secs()),
                    is_image,
                });
            }
        }
        Ok(results)
    }

    #[cfg(not(target_os = "macos"))]
    {
        let mut results = Vec::new();
        let home = std::env::var("USERPROFILE").unwrap_or_default();
        if !home.is_empty() {
            let search_dirs = [
                std::path::PathBuf::from(&home).join("Desktop"),
                std::path::PathBuf::from(&home).join("Downloads"),
                std::path::PathBuf::from(&home).join("Documents"),
                std::path::PathBuf::from(&home).join("Pictures"),
            ];
            let q_lower = q.to_lowercase();
            for dir in search_dirs {
                if let Ok(entries) = std::fs::read_dir(dir) {
                    for entry in entries.flatten() {
                        let path = entry.path();
                        if let Some(file_name) = path.file_name().and_then(|n| n.to_str()) {
                            if file_name.to_lowercase().contains(&q_lower) {
                                let ext = path.extension().and_then(|e| e.to_str()).unwrap_or("file").to_lowercase();
                                let is_image = matches!(ext.as_str(), "png" | "jpg" | "jpeg" | "webp" | "gif" | "bmp" | "ico");
                                let meta = entry.metadata().ok();
                                results.push(SystemFileResult {
                                    name: file_name.to_string(),
                                    path: path.to_string_lossy().to_string(),
                                    kind: ext,
                                    size_bytes: meta.as_ref().map(|m| m.len()),
                                    modified_timestamp: meta.and_then(|m| m.modified().ok())
                                        .and_then(|t| t.duration_since(std::time::UNIX_EPOCH).ok())
                                        .map(|d| d.as_secs()),
                                    is_image,
                                });
                                if results.len() >= 25 {
                                    break;
                                }
                            }
                        }
                    }
                }
                if results.len() >= 25 {
                    break;
                }
            }
        }
        Ok(results)
    }
}

#[tauri::command]
pub async fn get_file_preview_data(path: String) -> Result<FilePreviewPayload, String> {
    let p = std::path::Path::new(&path);
    if !p.exists() {
        return Err("File not found".to_string());
    }
    let meta = p.metadata().map_err(|e| e.to_string())?;
    let name = p.file_name().and_then(|n| n.to_str()).unwrap_or("Unknown").to_string();
    let ext = p.extension().and_then(|e| e.to_str()).unwrap_or("file").to_lowercase();
    let is_image = matches!(ext.as_str(), "png" | "jpg" | "jpeg" | "webp" | "gif" | "svg" | "bmp" | "ico");
    let size_bytes = meta.len();
    let modified_timestamp = meta.modified().ok()
        .and_then(|t| t.duration_since(std::time::UNIX_EPOCH).ok())
        .map(|d| d.as_secs())
        .unwrap_or(0);

    let mut preview_base64 = None;
    if is_image && size_bytes <= 15 * 1024 * 1024 {
        if let Ok(bytes) = std::fs::read(p) {
            use base64::Engine;
            let mime = if ext == "svg" { "image/svg+xml" } else if ext == "jpg" || ext == "jpeg" { "image/jpeg" } else { "image/png" };
            let b64 = base64::engine::general_purpose::STANDARD.encode(&bytes);
            preview_base64 = Some(format!("data:{};base64,{}", mime, b64));
        }
    }

    Ok(FilePreviewPayload {
        path,
        name,
        kind: ext,
        size_bytes,
        modified_timestamp,
        is_image,
        preview_base64,
    })
}

#[tauri::command]
pub fn quick_look_file(path: String) -> Result<(), String> {
    #[cfg(target_os = "macos")]
    {
        let _ = std::process::Command::new("qlmanage")
            .arg("-p")
            .arg(&path)
            .spawn()
            .map_err(|e| format!("Failed to open Quick Look: {}", e))?;
        Ok(())
    }
    #[cfg(not(target_os = "macos"))]
    {
        open_path_in_os(path)
    }
}

#[tauri::command]
pub async fn take_screenshot_area(app: AppHandle) -> Result<crate::screenshot::ScreenshotPayload, String> {
    crate::screenshot::capture_interactive_area(&app).await
}

#[tauri::command]
pub async fn take_screenshot_full(app: AppHandle) -> Result<crate::screenshot::ScreenshotPayload, String> {
    crate::screenshot::capture_full_screen(&app).await
}

#[tauri::command]
pub fn copy_screenshot_to_clipboard(base64_data: String) -> Result<(), String> {
    let clean_b64 = if let Some(idx) = base64_data.find(",") {
        &base64_data[idx + 1..]
    } else {
        &base64_data
    };
    use base64::Engine;
    let bytes = base64::engine::general_purpose::STANDARD
        .decode(clean_b64.trim())
        .map_err(|e| format!("Invalid base64: {}", e))?;
    crate::screenshot::copy_png_bytes_to_clipboard(&bytes)
}

#[tauri::command]
pub fn save_screenshot_to_file(base64_data: String, filename: Option<String>) -> Result<String, String> {
    crate::screenshot::save_base64_to_disk(&base64_data, filename)
}

#[tauri::command]
pub fn reveal_path_in_finder(path: String) -> Result<(), String> {
    #[cfg(target_os = "macos")]
    {
        let _ = std::process::Command::new("open")
            .arg("-R")
            .arg(&path)
            .spawn();
        Ok(())
    }
    #[cfg(not(target_os = "macos"))]
    {
        let _ = std::process::Command::new("explorer")
            .arg(format!("/select,{}", path))
            .spawn();
        Ok(())
    }
}

#[tauri::command]
pub fn open_path_in_os(path: String) -> Result<(), String> {
    #[cfg(target_os = "macos")]
    {
        let _ = std::process::Command::new("open")
            .arg(&path)
            .spawn();
        Ok(())
    }
    #[cfg(not(target_os = "macos"))]
    {
        let _ = std::process::Command::new("cmd")
            .args(["/C", "start", "", &path])
            .spawn();
        Ok(())
    }
}

#[tauri::command]
pub fn get_installed_applications() -> Vec<crate::app_launcher::AppEntry> {
    crate::app_launcher::get_or_scan_apps()
}

#[tauri::command]
pub fn launch_application(path: String) -> Result<(), String> {
    crate::app_launcher::launch_app_by_path(&path)
}

#[tauri::command]
pub fn capture_screen_vision() -> Result<crate::screen_vision::ScreenVisionPayload, String> {
    crate::screen_vision::capture_screen_snapshot()
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct StashItemPayload {
    pub id: String,
    pub name: String,
    pub path: String,
    pub size: u64,
    pub formatted_size: String,
    pub kind: String,
    pub preview_data: Option<String>,
}

#[tauri::command]
pub async fn process_dropped_stash_files(paths: Vec<String>) -> Result<Vec<StashItemPayload>, String> {
    let mut items = Vec::new();

    for p_str in paths {
        let p = std::path::Path::new(&p_str);
        if !p.exists() {
            continue;
        }

        let name = p
            .file_name()
            .and_then(|n| n.to_str())
            .unwrap_or("file")
            .to_string();

        let ext = p
            .extension()
            .and_then(|e| e.to_str())
            .unwrap_or("")
            .to_lowercase();

        let metadata = std::fs::metadata(p).ok();
        let size = metadata.as_ref().map(|m| m.len()).unwrap_or(0);

        let formatted_size = if size < 1024 {
            format!("{} B", size)
        } else if size < 1024 * 1024 {
            format!("{:.1} KB", size as f64 / 1024.0)
        } else if size < 1024 * 1024 * 1024 {
            format!("{:.1} MB", size as f64 / (1024.0 * 1024.0))
        } else {
            format!("{:.2} GB", size as f64 / (1024.0 * 1024.0 * 1024.0))
        };

        let is_image = matches!(
            ext.as_str(),
            "png" | "jpg" | "jpeg" | "webp" | "gif" | "svg" | "ico" | "bmp"
        );

        let kind = if is_image {
            "image"
        } else if matches!(
            ext.as_str(),
            "rs" | "ts" | "tsx" | "js" | "jsx" | "py" | "html" | "css" | "json" | "sh" | "sql" | "toml" | "yaml" | "yml"
        ) {
            "code"
        } else if matches!(ext.as_str(), "pdf" | "doc" | "docx" | "txt" | "md") {
            "document"
        } else if matches!(ext.as_str(), "zip" | "tar" | "gz" | "dmg" | "pkg") {
            "archive"
        } else {
            "file"
        };

        let mut preview_data = None;
        if is_image && size < 15 * 1024 * 1024 {
            if let Ok(bytes) = std::fs::read(p) {
                use base64::Engine;
                let b64 = base64::engine::general_purpose::STANDARD.encode(&bytes);
                let mime = match ext.as_str() {
                    "png" => "image/png",
                    "jpg" | "jpeg" => "image/jpeg",
                    "webp" => "image/webp",
                    "gif" => "image/gif",
                    "svg" => "image/svg+xml",
                    _ => "image/png",
                };
                preview_data = Some(format!("data:{};base64,{}", mime, b64));
            }
        }

        items.push(StashItemPayload {
            id: format!("stash-{}", uuid::Uuid::new_v4().simple()),
            name,
            path: p_str,
            size,
            formatted_size,
            kind: kind.to_string(),
            preview_data,
        });
    }

    Ok(items)
}

#[tauri::command]
pub fn copy_file_to_system_clipboard(path: String) -> Result<bool, String> {
    #[cfg(target_os = "macos")]
    {
        extern "C" {
            fn copy_file_path_to_pasteboard(file_path: *const std::os::raw::c_char) -> bool;
        }
        use std::ffi::CString;
        if let Ok(c_path) = CString::new(path) {
            let success = unsafe { copy_file_path_to_pasteboard(c_path.as_ptr()) };
            return Ok(success);
        }
        Err("Failed to convert path string".to_string())
    }
    #[cfg(not(target_os = "macos"))]
    {
        Ok(false)
    }
}

#[tauri::command]
pub async fn save_data_to_stash(
    name: String,
    data_or_text: String,
    is_image: bool,
) -> Result<StashItemPayload, String> {
    let stash_dir = dirs::document_dir()
        .unwrap_or_else(|| std::path::PathBuf::from("."))
        .join("DopeNotch")
        .join("stash");

    std::fs::create_dir_all(&stash_dir).map_err(|e| e.to_string())?;

    let safe_name: String = name
        .chars()
        .map(|c| if c.is_alphanumeric() || c == '.' || c == '-' || c == '_' { c } else { '_' })
        .collect();

    let target_path = stash_dir.join(&safe_name);

    let mut preview_data = None;
    let size: u64;

    if is_image {
        if data_or_text.starts_with("data:") {
            if let Some(comma_pos) = data_or_text.find(',') {
                let b64 = &data_or_text[comma_pos + 1..];
                use base64::Engine;
                let decoded = base64::engine::general_purpose::STANDARD
                    .decode(b64)
                    .map_err(|e| format!("Base64 decode failed: {}", e))?;
                std::fs::write(&target_path, &decoded).map_err(|e| e.to_string())?;
                size = decoded.len() as u64;
                preview_data = Some(data_or_text.clone());
            } else {
                return Err("Invalid data URI".to_string());
            }
        } else {
            return Err("Expected data URI for image".to_string());
        }
    } else {
        std::fs::write(&target_path, data_or_text.as_bytes()).map_err(|e| e.to_string())?;
        size = data_or_text.len() as u64;
    }

    let formatted_size = if size < 1024 {
        format!("{} B", size)
    } else if size < 1024 * 1024 {
        format!("{:.1} KB", size as f64 / 1024.0)
    } else {
        format!("{:.1} MB", size as f64 / (1024.0 * 1024.0))
    };

    Ok(StashItemPayload {
        id: format!("stash-{}", uuid::Uuid::new_v4().simple()),
        name: safe_name,
        path: target_path.to_string_lossy().to_string(),
        size,
        formatted_size,
        kind: if is_image { "image".to_string() } else { "text".to_string() },
        preview_data,
    })
}

#[tauri::command]
pub async fn open_stash_directory() -> Result<String, String> {
    let stash_dir = dirs::document_dir()
        .unwrap_or_else(|| std::path::PathBuf::from("."))
        .join("DopeNotch")
        .join("stash");
    std::fs::create_dir_all(&stash_dir).map_err(|e| e.to_string())?;
    crate::storage::DopeNotchStorage::reveal_path(&stash_dir)?;
    Ok(stash_dir.to_string_lossy().to_string())
}

static ACTIVE_SPEECH_PROCESS: std::sync::atomic::AtomicU32 = std::sync::atomic::AtomicU32::new(0);

#[tauri::command]
pub async fn speak_text_native(text: String, voice: Option<String>, rate: Option<u32>) -> Result<(), String> {
    let _ = stop_speech_native().await;

    tokio::task::spawn_blocking(move || {
        let clean_text = text
            .replace("```", " ")
            .replace('`', "")
            .replace('#', "")
            .replace('*', "")
            .replace('_', "")
            .replace('~', "")
            .replace('>', "")
            .trim()
            .to_string();

        if clean_text.is_empty() {
            return Ok(());
        }

        let voice_name = voice.unwrap_or_else(|| "Nicky".to_string());
        let speed_wpm = rate.unwrap_or(190).to_string();

        #[cfg(target_os = "macos")]
        {
            let mut cmd = std::process::Command::new("say");
            cmd.arg("-v").arg(&voice_name);
            cmd.arg("-r").arg(&speed_wpm);
            cmd.arg(&clean_text);

            if let Ok(mut child) = cmd.spawn() {
                ACTIVE_SPEECH_PROCESS.store(child.id(), std::sync::atomic::Ordering::SeqCst);
                let _ = child.wait();
                ACTIVE_SPEECH_PROCESS.store(0, std::sync::atomic::Ordering::SeqCst);
            }
        }

        Ok::<(), String>(())
    })
    .await
    .map_err(|e| e.to_string())?
}

#[tauri::command]
pub async fn stop_speech_native() -> Result<(), String> {
    #[cfg(target_os = "macos")]
    {
        let pid = ACTIVE_SPEECH_PROCESS.swap(0, std::sync::atomic::Ordering::SeqCst);
        if pid != 0 {
            let _ = std::process::Command::new("kill")
                .arg("-9")
                .arg(pid.to_string())
                .output();
        }
    }
    Ok(())
}

#[tauri::command]
pub fn get_license_info() -> crate::license::LicenseData {
    crate::license::load_license()
}

#[tauri::command]
pub async fn activate_license_key(key: String, label: Option<String>) -> Result<crate::license::LicenseData, String> {
    crate::license::activate_license(key, label).await
}

#[tauri::command]
pub async fn deactivate_license_key(force: Option<bool>) -> Result<crate::license::LicenseData, String> {
    crate::license::deactivate_license(force.unwrap_or(false)).await
}

#[tauri::command]
pub async fn validate_license_key() -> Result<bool, String> {
    crate::license::validate_license_remote().await
}

#[tauri::command]
pub async fn snap_window(layout: String) -> Result<crate::window_snapper::SnapResult, String> {
    tokio::task::spawn_blocking(move || crate::window_snapper::snap_active_window(&layout))
        .await
        .map_err(|e| e.to_string())?
}





