// storage.rs - Centralized Storage Management for DopeNotch
// All user data, notes, history, extensions, and offline AI models are unified under ~/Documents/DopeNotch/

use anyhow::Result;
use serde::{Deserialize, Serialize};
use std::path::{Path, PathBuf};
use std::fs;

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct StorageInfo {
    pub root_path: String,
    pub is_custom: bool,
    pub notes_path: String,
    pub history_path: String,
    pub extensions_path: String,
    pub voice_models_path: String,
    pub ai_models_path: String,
    pub notes_count: usize,
    pub clipboard_count: usize,
    pub voice_history_count: usize,
    pub extensions_count: usize,
    pub voice_models_count: usize,
    pub total_size_bytes: u64,
}

pub struct DopeNotchStorage;

impl DopeNotchStorage {
    /// Resolves the root directory: custom path if set, otherwise ~/Documents/DopeNotch
    pub fn get_root(custom_dir: Option<&str>) -> PathBuf {
        if let Some(custom) = custom_dir {
            let trimmed = custom.trim();
            if !trimmed.is_empty() {
                if trimmed.starts_with("~/") {
                    if let Some(home) = dirs::home_dir() {
                        return home.join(&trimmed[2..]);
                    }
                }
                return PathBuf::from(trimmed);
            }
        }

        // Default: ~/Documents/DopeNotch
        if let Some(doc_dir) = dirs::document_dir() {
            doc_dir.join("DopeNotch")
        } else if let Some(home) = dirs::home_dir() {
            home.join("Documents").join("DopeNotch")
        } else {
            PathBuf::from("DopeNotch")
        }
    }

    pub fn notes_dir(root: &Path) -> PathBuf {
        root.join("notes")
    }

    pub fn history_dir(root: &Path) -> PathBuf {
        root.join("history")
    }

    pub fn extensions_dir(root: &Path) -> PathBuf {
        root.join("extensions")
    }

    pub fn models_dir(root: &Path) -> PathBuf {
        root.join("models")
    }

    pub fn voice_models_dir(root: &Path) -> PathBuf {
        root.join("models").join("voice")
    }

    pub fn ai_models_dir(root: &Path) -> PathBuf {
        root.join("models").join("ai")
    }

    pub fn notes_file(root: &Path) -> PathBuf {
        Self::notes_dir(root).join("notes.json")
    }

    pub fn clipboard_file(root: &Path) -> PathBuf {
        Self::history_dir(root).join("clipboard_history.json")
    }

    pub fn voice_history_file(root: &Path) -> PathBuf {
        Self::history_dir(root).join("voice_history.json")
    }

    /// Initializes folder structure and performs seamless auto-migration from legacy locations
    pub fn init_and_migrate(root: &Path) -> Result<()> {
        let notes_d = Self::notes_dir(root);
        let hist_d = Self::history_dir(root);
        let ext_d = Self::extensions_dir(root);
        let voice_d = Self::voice_models_dir(root);
        let ai_d = Self::ai_models_dir(root);

        let _ = fs::create_dir_all(root);
        let _ = fs::create_dir_all(&notes_d);
        let _ = fs::create_dir_all(&hist_d);
        let _ = fs::create_dir_all(&ext_d);
        let _ = fs::create_dir_all(&voice_d);
        let _ = fs::create_dir_all(&ai_d);

        // 1. Root README.md
        let root_readme = root.join("README.md");
        if !root_readme.exists() {
            let readme_content = r#"# DopeNotch Unified Workspace

Welcome to your unified DopeNotch folder! Everything is organized in one transparent, easy-to-browse place:

- 📝 **notes/**: Quick voice notes, meeting summaries, and markdown checklists.
- 📋 **history/**: SuPaste clipboard history and voice transcription logs.
- ⚡ **extensions/**: Custom user tools and scripts (.sh, .py, .js) instantly executable from the Notch.
- 🎙️ **models/voice/**: Local Whisper GGML speech-to-text models (100% private, on-device).
- 🧠 **models/ai/**: Local neural LLM models (e.g. Qwen 2.5, SmolLM2).

You can safely back up, move, or sync this folder with iCloud / Google Drive.
"#;
            let _ = fs::write(&root_readme, readme_content);
        }

        // 2. Auto-migrate legacy Notes
        let target_notes_file = Self::notes_file(root);
        if !target_notes_file.exists() {
            let legacy_notes_file = dirs::home_dir()
                .map(|h| h.join(".dopenotch").join("notes.json"))
                .unwrap_or_else(|| PathBuf::from(""));
            if legacy_notes_file.exists() {
                log::info!("Migrating legacy notes from {:?} to {:?}", legacy_notes_file, target_notes_file);
                let _ = fs::copy(&legacy_notes_file, &target_notes_file);
            } else {
                // Seed initial welcome note
                let welcome_note = serde_json::json!([
                    {
                        "id": "welcome_dopenotch_note",
                        "title": "Welcome to DopeNotch Notes",
                        "content": "All your voice notes, transcripts, and ideas are safely stored in this folder on your computer (~/Documents/DopeNotch/notes).\n\n• Press ⌥Space to dictate\n• Press ⌃⌥ to invoke Notch AI\n• 100% private and on-device!",
                        "tags": ["Welcome", "Getting Started"],
                        "created_at": chrono::Utc::now().to_rfc3339(),
                        "updated_at": chrono::Utc::now().to_rfc3339(),
                        "char_count": 250,
                        "word_count": 40,
                        "is_pinned": true
                    }
                ]);
                let _ = fs::write(&target_notes_file, serde_json::to_string_pretty(&welcome_note).unwrap_or_default());
            }
        }

        // Sample markdown note for Finder visibility
        let sample_md = notes_d.join("Welcome to DopeNotch.md");
        if !sample_md.exists() {
            let sample_content = r#"# Welcome to DopeNotch Notes

All your voice notes, thoughts, and quick recordings are saved here.
You can open and edit any note in your favorite editor (Obsidian, VS Code, Notes, etc.).

- Dictation Hotkey: Option + Space
- Notch AI Assistant: Control + Option
"#;
            let _ = fs::write(&sample_md, sample_content);
        }

        // 3. Auto-migrate legacy Clipboard History
        let target_clip_file = Self::clipboard_file(root);
        if !target_clip_file.exists() {
            let legacy_candidates = [
                dirs::data_dir().map(|d| d.join("Murmur").join("clipboard_history.json")),
                dirs::data_dir().map(|d| d.join("DopeNotch").join("clipboard_history.json")),
                dirs::config_dir().map(|d| d.join("Murmur").join("clipboard_history.json")),
                dirs::config_dir().map(|d| d.join("DopeNotch").join("clipboard_history.json")),
            ];
            for cand in legacy_candidates.into_iter().flatten() {
                if cand.exists() {
                    log::info!("Migrating legacy clipboard history from {:?} to {:?}", cand, target_clip_file);
                    let _ = fs::copy(&cand, &target_clip_file);
                    break;
                }
            }
        }

        // 4. Auto-migrate legacy Voice History
        let target_voice_hist = Self::voice_history_file(root);
        if !target_voice_hist.exists() {
            let legacy_hist_candidates = [
                dirs::data_dir().map(|d| d.join("Murmur").join("models").join("history.json")),
                dirs::data_dir().map(|d| d.join("DopeNotch").join("models").join("history.json")),
            ];
            for cand in legacy_hist_candidates.into_iter().flatten() {
                if cand.exists() {
                    log::info!("Migrating legacy voice history from {:?} to {:?}", cand, target_voice_hist);
                    let _ = fs::copy(&cand, &target_voice_hist);
                    break;
                }
            }
        }

        // 5. Auto-migrate legacy Extensions
        let legacy_ext_dir = dirs::home_dir().map(|h| h.join(".dopenotch").join("extensions"));
        if let Some(leg_ext) = legacy_ext_dir {
            if leg_ext.exists() {
                if let Ok(entries) = fs::read_dir(&leg_ext) {
                    for entry in entries.flatten() {
                        let path = entry.path();
                        let file_name = path.file_name().unwrap_or_default();
                        let target_path = ext_d.join(file_name);
                        if !target_path.exists() {
                            let _ = fs::copy(&path, &target_path);
                        }
                    }
                }
            }
        }

        // Ensure starter extension scripts exist
        let ext_readme = ext_d.join("README.md");
        if !ext_readme.exists() {
            let readme = r#"# DopeNotch Custom Extensions & Scripts

Welcome to your DopeNotch extensions folder! Any script placed here is automatically discovered, indexed, and made executable from the DopeNotch Notch and Command Palette.

## Supported Script Formats
- **Bash / Shell** (`.sh`, `.bash`, `.zsh`)
- **Python** (`.py`)
- **Node.js** (`.js`, `.mjs`)
- **Folder Extensions** (a subfolder containing a `manifest.json` and entry file)

## Raycast-Compatible Metadata Headers
Add comments at the top of your script to configure its title, icon, and output mode:

```bash
#!/bin/bash
# @raycast.schemaVersion 1
# @raycast.title My Custom Tool
# @raycast.mode clipboard
# @raycast.icon 🚀
# @raycast.description Copies custom generated data to your clipboard
# @raycast.author YourName

echo "Hello from my custom extension!"
```

### Modes:
- `clipboard` (Default): Output of stdout is automatically copied to clipboard and added to your SuPaste shelf history.
- `silent`: Runs in the background without modifying clipboard.
"#;
            let _ = fs::write(ext_readme, readme);
        }

        let sample_sh = ext_d.join("iso-timestamp.sh");
        if !sample_sh.exists() {
            let sh = r#"#!/bin/bash
# @raycast.schemaVersion 1
# @raycast.title Insert ISO Timestamp
# @raycast.mode clipboard
# @raycast.icon ⏱️
# @raycast.description Copies current ISO 8601 UTC timestamp to clipboard
date -u +"%Y-%m-%dT%H:%M:%SZ"
"#;
            let _ = fs::write(sample_sh, sh);
        }

        let sample_py = ext_d.join("generate-uuid.py");
        if !sample_py.exists() {
            let py = r#"#!/usr/bin/env python3
# @raycast.schemaVersion 1
# @raycast.title Generate UUID v4
# @raycast.mode clipboard
# @raycast.icon 🔑
# @raycast.description Generates a random UUID v4 and copies it to clipboard
import uuid
print(str(uuid.uuid4()))
"#;
            let _ = fs::write(sample_py, py);
        }

        // 6. Auto-migrate legacy Voice Models (.bin files)
        let legacy_model_dirs = [
            dirs::data_dir().map(|d| d.join("Murmur").join("models")),
            dirs::data_dir().map(|d| d.join("DopeNotch").join("models")),
        ];
        for leg_dir in legacy_model_dirs.into_iter().flatten() {
            if leg_dir.exists() {
                if let Ok(entries) = fs::read_dir(&leg_dir) {
                    for entry in entries.flatten() {
                        let path = entry.path();
                        if path.is_file() {
                            if let Some(ext) = path.extension() {
                                if ext == "bin" {
                                    let filename = path.file_name().unwrap_or_default();
                                    let dest = voice_d.join(filename);
                                    if !dest.exists() {
                                        log::info!("Migrating Whisper model {:?} -> {:?}", path, dest);
                                        // Hardlink if possible for instant zero-disk transfer, fallback to copy
                                        if fs::hard_link(&path, &dest).is_err() {
                                            let _ = fs::copy(&path, &dest);
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }

        // 7. AI Models directory README
        let ai_readme = ai_d.join("README.md");
        if !ai_readme.exists() {
            let readme = r#"# DopeNotch Local AI Models

Local neural LLM models (e.g. Qwen 2.5 0.5B, SmolLM2 135M) for offline intelligence, vision, and rewriting.
Models are stored here and executed directly on-device with sub-second response times.
"#;
            let _ = fs::write(ai_readme, readme);
        }

        Ok(())
    }

    /// Calculate storage statistics and total disk size
    pub fn get_stats(root: &Path, is_custom: bool) -> StorageInfo {
        let notes_file = Self::notes_file(root);
        let clip_file = Self::clipboard_file(root);
        let voice_hist_file = Self::voice_history_file(root);
        let ext_dir = Self::extensions_dir(root);
        let voice_dir = Self::voice_models_dir(root);
        let ai_dir = Self::ai_models_dir(root);

        let mut notes_count = 0;
        if let Ok(content) = fs::read_to_string(&notes_file) {
            if let Ok(arr) = serde_json::from_str::<serde_json::Value>(&content) {
                if let Some(list) = arr.as_array() {
                    notes_count = list.len();
                }
            }
        }

        let mut clipboard_count = 0;
        if let Ok(content) = fs::read_to_string(&clip_file) {
            if let Ok(arr) = serde_json::from_str::<serde_json::Value>(&content) {
                if let Some(list) = arr.as_array() {
                    clipboard_count = list.len();
                }
            }
        }

        let mut voice_history_count = 0;
        if let Ok(content) = fs::read_to_string(&voice_hist_file) {
            if let Ok(arr) = serde_json::from_str::<serde_json::Value>(&content) {
                if let Some(list) = arr.as_array() {
                    voice_history_count = list.len();
                }
            }
        }

        let mut extensions_count = 0;
        if let Ok(entries) = fs::read_dir(&ext_dir) {
            extensions_count = entries.flatten().filter(|e| {
                let name = e.file_name().to_string_lossy().to_string();
                !name.starts_with('.') && !name.eq_ignore_ascii_case("readme.md")
            }).count();
        }

        let mut voice_models_count = 0;
        let mut total_size_bytes = 0u64;

        fn dir_size(dir: &Path, count_bins: &mut usize) -> u64 {
            let mut total = 0;
            if let Ok(entries) = fs::read_dir(dir) {
                for entry in entries.flatten() {
                    let path = entry.path();
                    if path.is_file() {
                        if let Ok(meta) = path.metadata() {
                            total += meta.len();
                            if path.extension().map(|e| e == "bin").unwrap_or(false) {
                                *count_bins += 1;
                            }
                        }
                    } else if path.is_dir() {
                        total += dir_size(&path, count_bins);
                    }
                }
            }
            total
        }

        total_size_bytes += dir_size(root, &mut voice_models_count);

        StorageInfo {
            root_path: root.to_string_lossy().to_string(),
            is_custom,
            notes_path: Self::notes_dir(root).to_string_lossy().to_string(),
            history_path: Self::history_dir(root).to_string_lossy().to_string(),
            extensions_path: ext_dir.to_string_lossy().to_string(),
            voice_models_path: voice_dir.to_string_lossy().to_string(),
            ai_models_path: ai_dir.to_string_lossy().to_string(),
            notes_count,
            clipboard_count,
            voice_history_count,
            extensions_count,
            voice_models_count,
            total_size_bytes,
        }
    }

    /// Cross-platform helper to open/reveal a directory in Finder / Explorer / File Manager
    pub fn reveal_path(path: &Path) -> Result<(), String> {
        if !path.exists() {
            let _ = fs::create_dir_all(path);
        }

        #[cfg(target_os = "macos")]
        {
            std::process::Command::new("open")
                .arg(path)
                .spawn()
                .map_err(|e| format!("Failed to open path: {}", e))?;
        }

        #[cfg(target_os = "windows")]
        {
            std::process::Command::new("explorer")
                .arg(path)
                .spawn()
                .map_err(|e| format!("Failed to open path: {}", e))?;
        }

        #[cfg(target_os = "linux")]
        {
            std::process::Command::new("xdg-open")
                .arg(path)
                .spawn()
                .map_err(|e| format!("Failed to open path: {}", e))?;
        }

        Ok(())
    }
}
