// settings.rs - App settings persistence

use serde::{Deserialize, Serialize};
use std::path::PathBuf;
use anyhow::Result;

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AppSettings {
    pub hotkey: String,
    pub model: WhisperModel,
    pub voxcoder_mode: bool,
    pub auto_paste: bool,
    pub sound_effects: bool,
    pub language: String,
    pub input_device: String,
    pub cloud_provider: CloudProvider,
    pub gemini_api_key: String,
    pub groq_api_key: String,
    pub deepgram_api_key: String,
    pub show_dock_icon: bool,
    pub live_streaming: bool,
    pub ai_rewrite: bool,
    #[serde(default)]
    pub custom_vocabulary: String,
    #[serde(default)]
    pub tray_icon_style: TrayIconStyle,
    #[serde(default)]
    pub system_prompt: String,
    #[serde(default)]
    pub local_assistant_model: String,
    #[serde(default)]
    pub experimental_wake_word: bool,
    #[serde(default)]
    pub operating_mode: OperatingMode,
    #[serde(default)]
    pub assistant_hotkey: String,
    #[serde(default)]
    pub wake_word: String,
    #[serde(default)]
    pub widget_notch_enabled: bool,
    #[serde(default)]
    pub widget_pet_enabled: bool,
    #[serde(default)]
    pub gemma_model: Option<GemmaModel>,
    #[serde(default = "default_true")]
    pub auto_update_check: bool,
    #[serde(default)]
    pub visibility_mode: VisibilityMode,
    #[serde(default)]
    pub notch_style: NotchStyle,
    #[serde(default)]
    pub activation_mode: ActivationMode,
    #[serde(default)]
    pub visualizer_style: VisualizerStyle,
    #[serde(default)]
    pub storage_directory: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq, Hash, Default)]
#[serde(rename_all = "lowercase")]
pub enum VisualizerStyle {
    #[default]
    Wave,
    Bars,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq, Hash, Default)]
#[serde(rename_all = "lowercase")]
pub enum ActivationMode {
    #[default]
    Toggle,
    Hold,
}

fn default_true() -> bool {
    true
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq, Hash, Default)]
#[serde(rename_all = "lowercase")]
pub enum VisibilityMode {
    AlwaysOn,
    #[default]
    AutoHidden,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq, Hash, Default)]
#[serde(rename_all = "lowercase")]
pub enum NotchStyle {
    #[default]
    DynamicIsland,
    Macbook,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq, Hash)]
#[serde(rename_all = "lowercase")]
pub enum CloudProvider {
    Local,
    Gemini,
    Groq,
    Deepgram,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq, Hash, Default)]
#[serde(rename_all = "lowercase")]
pub enum OperatingMode {
    #[default]
    Dictation,
    Assistant,
    Hybrid,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq, Hash)]
#[serde(rename_all = "lowercase")]
pub enum GemmaModel {
    E2B,
    E4B,
}

impl GemmaModel {
    pub fn as_str(&self) -> &'static str {
        match self {
            GemmaModel::E2B => "e2b",
            GemmaModel::E4B => "e4b",
        }
    }
    
    pub fn repo_id(&self) -> &'static str {
        match self {
            GemmaModel::E2B => "google/gemma-4-E2B-it-assistant",
            GemmaModel::E4B => "google/gemma-4-E4B-it-assistant",
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq, Hash)]
pub enum WhisperModel {
    #[serde(rename = "tiny.en")]
    TinyEn,
    #[serde(rename = "tiny")]
    Tiny,
    #[serde(rename = "base.en")]
    BaseEn,
    #[serde(rename = "base")]
    Base,
    #[serde(rename = "small.en")]
    SmallEn,
    #[serde(rename = "small")]
    Small,
    #[serde(rename = "medium.en")]
    MediumEn,
    #[serde(rename = "medium")]
    Medium,
    #[serde(rename = "large-v3-turbo")]
    LargeV3Turbo,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq, Hash, Default)]
#[serde(rename_all = "lowercase")]
pub enum TrayIconStyle {
    #[default]
    Color,
    Flat,
}

impl WhisperModel {
    pub fn filename(&self) -> &'static str {
        match self {
            WhisperModel::TinyEn => "ggml-tiny.en.bin",
            WhisperModel::Tiny => "ggml-tiny.bin",
            WhisperModel::BaseEn => "ggml-base.en.bin",
            WhisperModel::Base => "ggml-base.bin",
            WhisperModel::SmallEn => "ggml-small.en.bin",
            WhisperModel::Small => "ggml-small.bin",
            WhisperModel::MediumEn => "ggml-medium.en.bin",
            WhisperModel::Medium => "ggml-medium.bin",
            WhisperModel::LargeV3Turbo => "ggml-large-v3-turbo.bin",
        }
    }

    pub fn download_url(&self) -> String {
        let base = "https://huggingface.co/ggerganov/whisper.cpp/resolve/main";
        format!("{}/{}", base, self.filename())
    }

    pub fn as_str(&self) -> &'static str {
        match self {
            WhisperModel::TinyEn => "tiny.en",
            WhisperModel::Tiny => "tiny",
            WhisperModel::BaseEn => "base.en",
            WhisperModel::Base => "base",
            WhisperModel::SmallEn => "small.en",
            WhisperModel::Small => "small",
            WhisperModel::MediumEn => "medium.en",
            WhisperModel::Medium => "medium",
            WhisperModel::LargeV3Turbo => "large-v3-turbo",
        }
    }

    pub fn is_multilingual(&self) -> bool {
        match self {
            WhisperModel::TinyEn | WhisperModel::BaseEn | WhisperModel::SmallEn | WhisperModel::MediumEn => false,
            WhisperModel::Tiny | WhisperModel::Base | WhisperModel::Small | WhisperModel::Medium | WhisperModel::LargeV3Turbo => true,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct VoiceHistoryItem {
    pub id: String,
    pub text: String,
    pub timestamp: i64,
    pub date_str: String,
    pub model: String,
}

impl Default for AppSettings {
    fn default() -> Self {
        Self {
            hotkey: "Option+Space".to_string(),
            model: WhisperModel::Base,
            voxcoder_mode: false,
            auto_paste: true,
            sound_effects: true,
            language: "en".to_string(),
            input_device: "default".to_string(),
            cloud_provider: CloudProvider::Local,
            gemini_api_key: "".to_string(),
            groq_api_key: "".to_string(),
            deepgram_api_key: "".to_string(),
            show_dock_icon: false,
            live_streaming: false,
            ai_rewrite: false,
            custom_vocabulary: "".to_string(),
            tray_icon_style: TrayIconStyle::Color,
            system_prompt: "You are a helpful assistant. Be concise.".to_string(),
            local_assistant_model: "".to_string(),
            experimental_wake_word: false,
            operating_mode: OperatingMode::Dictation,
            assistant_hotkey: "Control+Option+Space".to_string(),
            wake_word: "hey dopenotch".to_string(),
            widget_notch_enabled: true,
            widget_pet_enabled: false,
            gemma_model: None,
            auto_update_check: true,
            visibility_mode: VisibilityMode::AutoHidden,
            notch_style: NotchStyle::DynamicIsland,
            activation_mode: ActivationMode::Toggle,
            visualizer_style: VisualizerStyle::Wave,
            storage_directory: None,
        }
    }
}

impl AppSettings {
    pub fn config_path() -> PathBuf {
        let base = dirs::config_dir().unwrap_or_else(|| PathBuf::from("."));
        let dopenotch_cfg = base.join("DopeNotch").join("settings.json");
        if dopenotch_cfg.exists() {
            return dopenotch_cfg;
        }
        let murmur_cfg = base.join("Murmur").join("settings.json");
        if murmur_cfg.exists() {
            return murmur_cfg;
        }
        let _ = std::fs::create_dir_all(base.join("DopeNotch"));
        dopenotch_cfg
    }

    /// Resolves the unified storage root for this settings instance (~/Documents/DopeNotch by default)
    pub fn storage_root(&self) -> PathBuf {
        crate::storage::DopeNotchStorage::get_root(self.storage_directory.as_deref())
    }

    /// Resolves default storage root (~/Documents/DopeNotch)
    pub fn default_storage_root() -> PathBuf {
        crate::storage::DopeNotchStorage::get_root(None)
    }

    /// Returns the voice models directory in unified storage
    pub fn models_dir() -> PathBuf {
        let root = Self::default_storage_root();
        let voice_dir = crate::storage::DopeNotchStorage::voice_models_dir(&root);
        let _ = std::fs::create_dir_all(&voice_dir);
        voice_dir
    }

    pub fn get_models_dir(&self) -> PathBuf {
        let voice_dir = crate::storage::DopeNotchStorage::voice_models_dir(&self.storage_root());
        let _ = std::fs::create_dir_all(&voice_dir);
        voice_dir
    }

    pub fn load_or_default() -> Self {
        let path = Self::config_path();
        if path.exists() {
            match std::fs::read_to_string(&path) {
                Ok(contents) => {
                    let mut s: AppSettings = serde_json::from_str(&contents).unwrap_or_default();
                    if s.hotkey.trim().is_empty() {
                        s.hotkey = "Option+Space".to_string();
                    }
                    s
                }
                Err(_) => Self::default(),
            }
        } else {
            Self::default()
        }
    }

    pub fn save(&self) -> Result<()> {
        let path = Self::config_path();
        if let Some(parent) = path.parent() {
            std::fs::create_dir_all(parent)?;
        }
        let json = serde_json::to_string_pretty(self)?;
        std::fs::write(path, json)?;
        Ok(())
    }

    pub fn model_path(&self, model: &WhisperModel) -> PathBuf {
        let filename = model.filename();
        
        // 1. Primary: check unified ~/Documents/DopeNotch/models/voice/
        let unified_path = crate::storage::DopeNotchStorage::voice_models_dir(&self.storage_root()).join(filename);
        if unified_path.exists() {
            return unified_path;
        }

        // 2. Fallback: check legacy directories
        let base = dirs::data_dir().unwrap_or_else(|| PathBuf::from("."));
        let dopenotch_path = base.join("DopeNotch").join("models").join(filename);
        if dopenotch_path.exists() {
            return dopenotch_path;
        }
        
        let murmur_path = base.join("Murmur").join("models").join(filename);
        if murmur_path.exists() {
            return murmur_path;
        }

        let config_base = dirs::config_dir().unwrap_or_else(|| PathBuf::from("."));
        let dopenotch_cfg = config_base.join("DopeNotch").join("models").join(filename);
        if dopenotch_cfg.exists() {
            return dopenotch_cfg;
        }

        let murmur_cfg = config_base.join("Murmur").join("models").join(filename);
        if murmur_cfg.exists() {
            return murmur_cfg;
        }

        // Default to unified path for future downloads
        unified_path
    }

    pub fn is_model_downloaded(&self, model: &WhisperModel) -> bool {
        let p = self.model_path(model);
        if let Ok(meta) = std::fs::metadata(&p) {
            let min_bytes: u64 = match model {
                WhisperModel::TinyEn | WhisperModel::Tiny => 70_000_000,
                WhisperModel::BaseEn | WhisperModel::Base => 140_000_000,
                WhisperModel::SmallEn | WhisperModel::Small => 450_000_000,
                WhisperModel::MediumEn | WhisperModel::Medium => 1_400_000_000,
                WhisperModel::LargeV3Turbo => 1_500_000_000,
            };
            meta.len() >= min_bytes
        } else {
            false
        }
    }

    pub fn history_path(&self) -> PathBuf {
        let unified = crate::storage::DopeNotchStorage::voice_history_file(&self.storage_root());
        if unified.exists() {
            return unified;
        }

        // Legacy fallback
        let base = dirs::data_dir().unwrap_or_else(|| PathBuf::from("."));
        let murmur_hist = base.join("Murmur").join("models").join("history.json");
        if murmur_hist.exists() {
            return murmur_hist;
        }

        unified
    }

    pub fn static_history_path() -> PathBuf {
        let root = Self::default_storage_root();
        crate::storage::DopeNotchStorage::voice_history_file(&root)
    }

    pub fn load_history() -> Vec<VoiceHistoryItem> {
        let path = Self::static_history_path();
        if path.exists() {
            if let Ok(content) = std::fs::read_to_string(&path) {
                if let Ok(items) = serde_json::from_str::<Vec<VoiceHistoryItem>>(&content) {
                    return items;
                }
            }
        }

        // Try legacy path
        let base = dirs::data_dir().unwrap_or_else(|| PathBuf::from("."));
        let murmur_hist = base.join("Murmur").join("models").join("history.json");
        if murmur_hist.exists() {
            if let Ok(content) = std::fs::read_to_string(&murmur_hist) {
                if let Ok(items) = serde_json::from_str::<Vec<VoiceHistoryItem>>(&content) {
                    return items;
                }
            }
        }

        Vec::new()
    }

    pub fn save_history(items: &[VoiceHistoryItem]) -> Result<()> {
        let path = Self::static_history_path();
        if let Some(parent) = path.parent() {
            let _ = std::fs::create_dir_all(parent);
        }
        let json = serde_json::to_string_pretty(items)?;
        std::fs::write(path, json)?;
        Ok(())
    }

    pub fn gemma_model_path(&self, model: &GemmaModel) -> PathBuf {
        let mut path = self.get_models_dir();
        path.push("gemma");
        path.push(model.as_str());
        path
    }

    pub fn is_gemma_model_downloaded(&self, model: &GemmaModel) -> bool {
        let path = self.gemma_model_path(model);
        path.join("model.safetensors").exists()
    }
}
