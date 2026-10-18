use serde::{Deserialize, Serialize};
use std::collections::HashSet;
use std::fs;
use std::path::{Path, PathBuf};
use std::sync::{Mutex, OnceLock};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AppEntry {
    pub id: String,
    pub name: String,
    pub path: String,
    pub bundle_id: String,
}

static CACHED_APPS: OnceLock<Mutex<Vec<AppEntry>>> = OnceLock::new();

fn get_app_search_dirs() -> Vec<PathBuf> {
    let mut dirs = vec![
        PathBuf::from("/Applications"),
        PathBuf::from("/System/Applications"),
        PathBuf::from("/System/Applications/Utilities"),
    ];

    if let Some(home) = dirs::home_dir() {
        let user_apps = home.join("Applications");
        if user_apps.exists() {
            dirs.push(user_apps);
        }
    }

    dirs
}

fn scan_directory_for_apps(dir: &Path, seen: &mut HashSet<String>, apps: &mut Vec<AppEntry>) {
    if let Ok(entries) = fs::read_dir(dir) {
        for entry in entries.flatten() {
            let path = entry.path();
            if path.is_dir() {
                if let Some(ext) = path.extension() {
                    if ext == "app" {
                        let name = path
                            .file_stem()
                            .and_then(|s| s.to_str())
                            .unwrap_or("Unknown")
                            .to_string();

                        if seen.insert(name.to_lowercase()) {
                            // Extract bundle id if possible from Info.plist
                            let info_plist = path.join("Contents").join("Info.plist");
                            let mut bundle_id = String::new();
                            if info_plist.exists() {
                                if let Ok(content) = fs::read_to_string(&info_plist) {
                                    if let Some(idx) = content.find("<key>CFBundleIdentifier</key>") {
                                        let rest = &content[idx..];
                                        if let Some(start) = rest.find("<string>") {
                                            if let Some(end) = rest[start + 8..].find("</string>") {
                                                bundle_id = rest[start + 8..start + 8 + end].to_string();
                                            }
                                        }
                                    }
                                }
                            }

                            apps.push(AppEntry {
                                id: format!("app-{}", apps.len()),
                                name,
                                path: path.to_string_lossy().to_string(),
                                bundle_id,
                            });
                        }
                    }
                }
            }
        }
    }
}

pub fn get_or_scan_apps() -> Vec<AppEntry> {
    let mutex = CACHED_APPS.get_or_init(|| {
        let mut seen = HashSet::new();
        let mut apps = Vec::new();

        for dir in get_app_search_dirs() {
            scan_directory_for_apps(&dir, &mut seen, &mut apps);
        }

        apps.sort_by(|a, b| a.name.to_lowercase().cmp(&b.name.to_lowercase()));
        log::info!("Indexed {} macOS applications into in-memory Trie cache", apps.len());
        Mutex::new(apps)
    });

    let guard = mutex.lock().unwrap();
    guard.clone()
}

pub fn launch_app_by_path(path_str: &str) -> Result<(), String> {
    let path = Path::new(path_str);
    if !path.exists() {
        return Err(format!("Application path not found: {}", path_str));
    }

    #[cfg(target_os = "macos")]
    {
        std::process::Command::new("open")
            .arg(path_str)
            .spawn()
            .map_err(|e| format!("Failed to launch app: {}", e))?;
        Ok(())
    }

    #[cfg(not(target_os = "macos"))]
    {
        Ok(())
    }
}
