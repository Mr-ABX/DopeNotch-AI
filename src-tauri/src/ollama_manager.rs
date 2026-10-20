// ollama_manager.rs - Seamless, Zero-Config Local LLM Background Server for DopeNotch
// Automatically detects and launches local Ollama runtime so the user never has to open a terminal or external app.

use serde::Serialize;
use std::path::PathBuf;
use std::process::{Command, Stdio};
use std::time::Duration;

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct OllamaEngineStatus {
    pub is_running: bool,
    pub is_installed: bool,
    pub binary_path: Option<String>,
    pub models: Vec<String>,
    pub message: String,
}

pub struct OllamaManager;

impl OllamaManager {
    /// Detects candidate locations for the Ollama binary
    pub fn find_binary() -> Option<PathBuf> {
        let mut candidates = Vec::new();

        // 1. Check portable user directory ~/Documents/DopeNotch/bin/ollama (First priority!)
        if let Some(doc_dir) = dirs::document_dir() {
            candidates.push(doc_dir.join("DopeNotch").join("bin").join("ollama"));
            candidates.push(doc_dir.join("DopeNotch").join("bin").join("ollama.exe"));
        }

        // 2. Check bundled inside macOS .app Resources or MacOS folder
        if let Ok(exe_path) = std::env::current_exe() {
            if let Some(exe_dir) = exe_path.parent() {
                candidates.push(exe_dir.join("ollama"));
                if let Some(app_bundle) = exe_dir.parent() {
                    candidates.push(app_bundle.join("Resources").join("ollama"));
                }
            }
        }

        // 3. System candidate locations
        candidates.push(PathBuf::from("/usr/local/bin/ollama"));
        candidates.push(PathBuf::from("/opt/homebrew/bin/ollama"));
        candidates.push(PathBuf::from("/Applications/Ollama.app/Contents/Resources/ollama"));

        for cand in &candidates {
            if cand.exists() && cand.is_file() {
                return Some(cand.clone());
            }
        }

        // Check PATH via which
        #[cfg(unix)]
        {
            if let Ok(output) = Command::new("which").arg("ollama").output() {
                if output.status.success() {
                    let s = String::from_utf8_lossy(&output.stdout).trim().to_string();
                    if !s.is_empty() {
                        let p = PathBuf::from(&s);
                        if p.exists() {
                            return Some(p);
                        }
                    }
                }
            }
        }

        None
    }

    /// Fast check whether Ollama server is responding on 127.0.0.1:11434
    pub async fn is_server_running() -> bool {
        let client = reqwest::Client::builder()
            .timeout(Duration::from_millis(600))
            .build();

        if let Ok(client) = client {
            if let Ok(res) = client.get("http://127.0.0.1:11434/api/tags").send().await {
                return res.status().is_success();
            }
        }
        false
    }

    /// Ensures the local Ollama server is running in the background.
    /// If not running, spawns it as a detached process.
    pub async fn ensure_running() -> Result<bool, String> {
        if Self::is_server_running().await {
            return Ok(true);
        }

        let binary = match Self::find_binary() {
            Some(b) => b,
            None => {
                return Err("Ollama binary not found. Please install Ollama from https://ollama.ai".to_string());
            }
        };

        log::info!("Starting background Ollama daemon via {:?}", binary);

        // Spawn detached process with models pointing to ~/Documents/DopeNotch/models/ai
        let mut cmd = Command::new(&binary);
        cmd.arg("serve")
            .env("OLLAMA_ORIGINS", "*");

        if let Some(doc_dir) = dirs::document_dir() {
            let ai_models_dir = doc_dir.join("DopeNotch").join("models").join("ai");
            let _ = std::fs::create_dir_all(&ai_models_dir);
            cmd.env("OLLAMA_MODELS", &ai_models_dir);
        }

        let spawn_res = cmd
            .stdout(Stdio::null())
            .stderr(Stdio::null())
            .spawn();

        if let Err(e) = spawn_res {
            return Err(format!("Failed to spawn Ollama daemon: {}", e));
        }

        // Wait up to 3.5 seconds for port 11434 to open
        for _ in 0..15 {
            tokio::time::sleep(Duration::from_millis(250)).await;
            if Self::is_server_running().await {
                log::info!("Ollama daemon is now active and responding on 127.0.0.1:11434");
                return Ok(true);
            }
        }

        Err("Ollama daemon spawned but did not respond on port 11434 in time.".to_string())
    }

    /// Get detailed status and list of installed models
    pub async fn get_status() -> OllamaEngineStatus {
        let is_running = Self::is_server_running().await;
        let binary = Self::find_binary();
        let is_installed = binary.is_some();
        let binary_path = binary.map(|b| b.to_string_lossy().to_string());

        let mut models = Vec::new();
        let message = if is_running {
            "Ready & Connected".to_string()
        } else if is_installed {
            "Offline (Click to Auto-Start)".to_string()
        } else {
            "Not Installed".to_string()
        };

        if is_running {
            // Fetch models
            let client = reqwest::Client::builder()
                .timeout(Duration::from_secs(2))
                .build();
            if let Ok(c) = client {
                if let Ok(res) = c.get("http://127.0.0.1:11434/api/tags").send().await {
                    if let Ok(val) = res.json::<serde_json::Value>().await {
                        if let Some(list) = val.get("models").and_then(|m| m.as_array()) {
                            for item in list {
                                if let Some(name) = item.get("name").and_then(|n| n.as_str()) {
                                    models.push(name.to_string());
                                }
                            }
                        }
                    }
                }
            }
        }

        OllamaEngineStatus {
            is_running,
            is_installed,
            binary_path,
            models,
            message,
        }
    }
}
