// DopeNotch - Main Tauri Entry Point (Tauri 2.x)
// Initializes the app, system tray, global hotkeys, and all plugins.

mod audio;
mod commands;
mod model_manager;
mod overlay;
mod settings;
mod transcriber;
mod voxcoder;
pub mod clipboard_listener;

use std::sync::{Arc, Mutex};
use tauri::{
    menu::{Menu, MenuItem, PredefinedMenuItem},
    tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent},
    AppHandle, Manager,
};
use tauri_plugin_global_shortcut::{GlobalShortcutExt, ShortcutState};

use crate::settings::AppSettings;
use crate::transcriber::TranscriberState;

/// Shared application state passed to all Tauri commands
pub struct MurmurState {
    pub settings: Arc<Mutex<AppSettings>>,
    pub transcriber: Arc<Mutex<TranscriberState>>,
    pub is_recording: Arc<Mutex<bool>>,
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    env_logger::Builder::from_env(env_logger::Env::default().default_filter_or("info")).init();

    tauri::Builder::default()
        .plugin(tauri_plugin_global_shortcut::Builder::new().build())
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_clipboard_manager::init())
        .plugin(tauri_plugin_dialog::init())
        .on_window_event(|window, event| {
            if let tauri::WindowEvent::CloseRequested { api, .. } = event {
                if window.label() == "settings" {
                    let _ = window.hide();
                    api.prevent_close();
                }
            }
        })
        .setup(|app| {
            let settings = AppSettings::load_or_default();
            let transcriber_state = TranscriberState::new(&settings.model);

            let murmur_state = MurmurState {
                settings: Arc::new(Mutex::new(settings.clone())),
                transcriber: Arc::new(Mutex::new(transcriber_state)),
                is_recording: Arc::new(Mutex::new(false)),
            };

            app.manage(murmur_state);

            #[cfg(target_os = "macos")]
            {
                overlay::set_dock_icon();
                let _ = crate::commands::request_accessibility_permissions();
                if settings.show_dock_icon {
                    app.set_activation_policy(tauri::ActivationPolicy::Regular);
                } else {
                    app.set_activation_policy(tauri::ActivationPolicy::Accessory);
                }
            }
            
            if settings.visibility_mode == crate::settings::VisibilityMode::AlwaysOn {
                overlay::show_visualizer(app.handle(), &settings);
            }

            // Start live system clipboard background monitor
            clipboard_listener::start_clipboard_monitor(app.handle().clone());

            // Build system tray menu
            let settings_item = MenuItem::with_id(app, "settings", "DopeNotch Dashboard", true, None::<&str>)?;
            let separator = PredefinedMenuItem::separator(app)?;
            let quit_item = MenuItem::with_id(app, "quit", "Quit DopeNotch", true, None::<&str>)?;

            let menu = Menu::with_items(app, &[&settings_item, &separator, &quit_item])?;

            // Load tray icon
            let tray_icon_bytes = match settings.tray_icon_style {
                crate::settings::TrayIconStyle::Flat => include_bytes!("../icons/tray-flat.png").as_slice(),
                crate::settings::TrayIconStyle::Color => include_bytes!("../icons/tray.png").as_slice(),
            };
            let tray_icon = tauri::image::Image::from_bytes(tray_icon_bytes)
                .unwrap_or_else(|_| app.default_window_icon().cloned().unwrap());

            // Build tray icon
            let _tray = TrayIconBuilder::with_id("main")
                .icon(tray_icon)
                .icon_as_template(settings.tray_icon_style == crate::settings::TrayIconStyle::Flat)
                .menu(&menu)
                .tooltip("DopeNotch — 'cause it's top-notch (Press ⌃⌥ to record)")
                .on_menu_event(|app_handle, event| {
                    match event.id().as_ref() {
                        "settings" => {
                            overlay::show_settings_window(app_handle);
                        }
                        "quit" => {
                            std::process::exit(0);
                        }
                        _ => {}
                    }
                })
                .on_tray_icon_event(|tray, event| {
                    if let TrayIconEvent::Click {
                        button: MouseButton::Left,
                        button_state: MouseButtonState::Up,
                        ..
                    } = event
                    {
                        overlay::toggle_tray_popover(tray.app_handle());
                    }
                })
                .build(app)?;

            // Register global hotkey
            let app_handle = app.handle().clone();
            let hotkey = settings.hotkey.clone();
            setup_global_shortcut(&app_handle, &hotkey);

            // Apply macOS window styling to settings window so top bar matches background color
            if let Some(settings_win) = app.get_webview_window("settings") {
                overlay::apply_macos_window_styling(&settings_win);
            }

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::open_settings,
            commands::start_recording,
            commands::stop_recording,
            commands::toggle_recording,
            commands::get_settings,
            commands::save_settings,
            commands::get_downloaded_models,
            commands::download_model,
            commands::get_downloaded_gemma_models,
            commands::download_gemma_model_cmd,
            commands::delete_gemma_model,
            model_manager::delete_model_file,
            model_manager::open_models_directory,
            commands::clear_all_app_data,
            commands::quit_app,
            commands::get_voice_history,
            commands::delete_voice_history_item,
            commands::clear_voice_history,
            commands::get_clipboard_history,
            commands::delete_clipboard_item,
            commands::toggle_pin_clipboard_item,
            commands::clear_clipboard_history,
            commands::set_notch_expanded,
            commands::preview_notch,
            commands::paste_text_direct,
            commands::paste_image_direct,
            commands::toggle_hud,
            commands::pick_screen_color,
            commands::open_ruler,
            commands::close_ruler,
            commands::toggle_ruler,
            commands::check_system_permissions,
            commands::request_system_permissions,
            commands::get_system_vitals,
            commands::get_media_playback_status,
            commands::control_media_playback,
        ])
        .build(tauri::generate_context!())
        .expect("error while building dopenotch")
        .run(|app_handle, event| {
            match event {
                #[cfg(target_os = "macos")]
                tauri::RunEvent::Reopen { .. } => {
                    overlay::show_settings_window(app_handle);
                }
                _ => {}
            }
        });
}

pub fn setup_global_shortcut(app: &AppHandle, primary_hotkey: &str) {
    let _ = app.global_shortcut().unregister_all();
    let app_clone = app.clone();

    let mut shortcuts = Vec::new();
    let clean_primary = primary_hotkey.trim().to_string();
    if !clean_primary.is_empty() {
        shortcuts.push(clean_primary.clone());
    }

    // Always register standard aliases so user can trigger via Option+Space or Control+Option+Space or Cmd+Shift+Space
    let aliases = [
        "Option+Space",
        "Alt+Space",
        "Control+Option+Space",
        "CommandOrControl+Shift+Space",
    ];
    for alias in &aliases {
        if !shortcuts.iter().any(|s| s.eq_ignore_ascii_case(alias)) {
            shortcuts.push(alias.to_string());
        }
    }

    for sc in shortcuts {
        let app_c = app_clone.clone();
        let sc_name = sc.clone();

        let result = app.global_shortcut().on_shortcut(sc.as_str(), move |_app, _shortcut, event| {
            let state = app_c.state::<MurmurState>();
            let settings = state.settings.lock().unwrap().clone();
            let is_hold = settings.activation_mode == crate::settings::ActivationMode::Hold;
            let is_rec = *state.is_recording.lock().unwrap();

            log::info!("[global_shortcut] Key event for '{}': {:?}, hold_mode={}, is_rec={}", sc_name, event.state(), is_hold, is_rec);

            let app_h = app_c.clone();
            match event.state() {
                ShortcutState::Pressed => {
                    if is_hold {
                        if !is_rec {
                            tauri::async_runtime::spawn(async move {
                                if let Err(e) = commands::start_recording_internal(&app_h).await {
                                    log::error!("Failed to start recording: {}", e);
                                }
                            });
                        }
                    } else {
                        // Toggle Mode (Press once to Start, Press once to Stop & Auto-Paste)
                        tauri::async_runtime::spawn(async move {
                            if is_rec {
                                log::info!("Toggle: stopping recording & transcribing...");
                                if let Err(e) = commands::stop_recording_internal(&app_h).await {
                                    log::error!("Failed to stop recording: {}", e);
                                }
                            } else {
                                log::info!("Toggle: starting recording...");
                                if let Err(e) = commands::start_recording_internal(&app_h).await {
                                    log::error!("Failed to start recording: {}", e);
                                }
                            }
                        });
                    }
                }
                ShortcutState::Released => {
                    if is_hold {
                        tauri::async_runtime::spawn(async move {
                            std::thread::sleep(std::time::Duration::from_millis(200));
                            let currently_recording = *app_h.state::<MurmurState>().is_recording.lock().unwrap();
                            if currently_recording {
                                if let Err(e) = commands::stop_recording_internal(&app_h).await {
                                    log::error!("Failed to stop recording on release: {}", e);
                                }
                            }
                        });
                    }
                }
            }
        });

        match result {
            Ok(_) => log::info!("Successfully registered global shortcut: '{}'", sc),
            Err(e) => log::debug!("Could not register shortcut '{}': {}", sc, e),
        }
    }

    // Register shortcuts to toggle the SuperNotch HUD (Search & Shelf)
    let hud_aliases = [
        "Option+V",
        "Alt+V",
        "CommandOrControl+Shift+V",
    ];

    for hud_sc in hud_aliases {
        let app_h = app_clone.clone();
        let sc_name = hud_sc.to_string();
        let result = app.global_shortcut().on_shortcut(hud_sc, move |_app, _shortcut, event| {
            if event.state() == ShortcutState::Pressed {
                log::info!("[global_shortcut] Toggle HUD shortcut triggered: '{}'", sc_name);
                let app_inner = app_h.clone();
                tauri::async_runtime::spawn(async move {
                    commands::toggle_hud(app_inner);
                });
            }
        });
        match result {
            Ok(_) => log::info!("Successfully registered HUD global shortcut: '{}'", hud_sc),
            Err(e) => log::debug!("Could not register HUD shortcut '{}': {}", hud_sc, e),
        }
    }

    // Register shortcuts to toggle the Pixel Ruler Overlay
    let ruler_aliases = [
        "Option+R",
        "Alt+R",
    ];

    for r_sc in ruler_aliases {
        let app_h = app_clone.clone();
        let sc_name = r_sc.to_string();
        let result = app.global_shortcut().on_shortcut(r_sc, move |_app, _shortcut, event| {
            if event.state() == ShortcutState::Pressed {
                log::info!("[global_shortcut] Toggle Ruler shortcut triggered: '{}'", sc_name);
                let app_inner = app_h.clone();
                tauri::async_runtime::spawn(async move {
                    overlay::toggle_ruler_overlay(&app_inner);
                });
            }
        });
        match result {
            Ok(_) => log::info!("Successfully registered Ruler global shortcut: '{}'", r_sc),
            Err(e) => log::debug!("Could not register Ruler shortcut '{}': {}", r_sc, e),
        }
    }
}

#[cfg(test)]
mod tests {
    #[test]
    fn test_sanity_check() {
        assert_eq!(1 + 1, 2);
    }
}
