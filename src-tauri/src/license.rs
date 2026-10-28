// license.rs - Polar.sh License Key Verification and Entitlements Engine
use serde::{Deserialize, Serialize};
use std::fs;
use std::path::PathBuf;

pub const POLAR_ORGANIZATION_ID: &str = "8fca378f-73ca-4452-b277-5dc37837c74e";

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LicenseData {
    pub key: String,
    pub tier: String, // "community" | "core" | "forever"
    pub is_pro: bool,
    pub activation_id: Option<String>,
    pub customer_email: Option<String>,
    pub customer_name: Option<String>,
    pub activated_at: Option<String>,
    pub limit_activations: Option<u32>,
}

impl Default for LicenseData {
    fn default() -> Self {
        Self {
            key: String::new(),
            tier: "community".to_string(),
            is_pro: false,
            activation_id: None,
            customer_email: None,
            customer_name: None,
            activated_at: None,
            limit_activations: Some(1),
        }
    }
}

pub fn license_file_path() -> PathBuf {
    let root = crate::storage::DopeNotchStorage::get_root(None);
    root.join("license.json")
}

pub fn load_license() -> LicenseData {
    let path = license_file_path();
    if let Ok(content) = fs::read_to_string(&path) {
        if let Ok(data) = serde_json::from_str::<LicenseData>(&content) {
            return data;
        }
    }
    LicenseData::default()
}

pub fn save_license(license: &LicenseData) -> Result<(), String> {
    let path = license_file_path();
    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent).map_err(|e| format!("Failed to create storage directory: {}", e))?;
    }
    let json = serde_json::to_string_pretty(license).map_err(|e| format!("Failed to serialize license: {}", e))?;
    fs::write(&path, json).map_err(|e| format!("Failed to write license file to {:?}: {}", path, e))?;
    Ok(())
}

pub fn is_pro_active() -> bool {
    load_license().is_pro
}

pub fn get_license_tier() -> String {
    load_license().tier
}

/// Centralized clipboard and speech history cap
pub fn get_max_history() -> usize {
    if is_pro_active() {
        5000 // Pro tier has 5,000 clips (practical unlimited)
    } else {
        25 // Community tier capped at 25 clips
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct DailyDictationUsage {
    pub date: String,
    pub seconds_used: u64,
}

pub fn dictation_usage_file_path() -> PathBuf {
    let root = crate::storage::DopeNotchStorage::get_root(None);
    root.join("daily_dictation.json")
}

pub fn get_today_dictation_seconds() -> u64 {
    let today = chrono::Local::now().format("%Y-%m-%d").to_string();
    let path = dictation_usage_file_path();
    if let Ok(content) = fs::read_to_string(&path) {
        if let Ok(usage) = serde_json::from_str::<DailyDictationUsage>(&content) {
            if usage.date == today {
                return usage.seconds_used;
            }
        }
    }
    0
}

pub fn add_dictation_seconds(seconds: u64) {
    if is_pro_active() {
        return; // Pro tier is unlimited
    }
    let today = chrono::Local::now().format("%Y-%m-%d").to_string();
    let current_sec = get_today_dictation_seconds();
    let new_usage = DailyDictationUsage {
        date: today,
        seconds_used: current_sec.saturating_add(seconds),
    };
    let path = dictation_usage_file_path();
    if let Ok(json) = serde_json::to_string_pretty(&new_usage) {
        let _ = fs::write(path, json);
    }
}

/// Validate the current license key and activation ID against Polar.sh
/// Returns true if valid. If offline or network unreachable, falls back to local cache gracefully.
pub async fn validate_license_remote() -> Result<bool, String> {
    let mut current = load_license();
    if !current.is_pro || current.key.is_empty() {
        return Ok(false);
    }

    let client = match reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(8))
        .build()
    {
        Ok(c) => c,
        Err(_) => reqwest::Client::new(),
    };

    let mut body = serde_json::json!({
        "key": current.key,
        "organization_id": POLAR_ORGANIZATION_ID,
    });

    if let Some(act_id) = &current.activation_id {
        body["activation_id"] = serde_json::json!(act_id);
    }

    let res = match client
        .post("https://api.polar.sh/v1/customer-portal/license-keys/validate")
        .header("Content-Type", "application/json")
        .json(&body)
        .send()
        .await
    {
        Ok(r) => r,
        Err(e) => {
            log::warn!("Offline or network error validating license with Polar: {}. Allowing offline grace.", e);
            return Ok(true); // Graceful offline usage
        }
    };

    if !res.status().is_success() {
        let status = res.status();
        log::warn!("License validation failed on Polar with status {}. Deactivating local entitlement.", status);
        current.is_pro = false;
        let _ = save_license(&current);
        return Ok(false);
    }

    let json: serde_json::Value = res.json().await.map_err(|e| e.to_string())?;
    let status = json["status"].as_str().unwrap_or("invalid");
    if status == "granted" {
        Ok(true)
    } else {
        log::warn!("License status is '{}', revoking pro entitlement.", status);
        current.is_pro = false;
        let _ = save_license(&current);
        Ok(false)
    }
}

/// Activate a Polar License Key on this Mac
pub async fn activate_license(key: String, label: Option<String>) -> Result<LicenseData, String> {
    let clean_key = key.trim().to_string();
    if clean_key.is_empty() {
        return Err("License key cannot be empty".to_string());
    }

    let device_label = label.unwrap_or_else(|| {
        let user = std::env::var("USER").unwrap_or_else(|_| "User".to_string());
        format!("{}'s Mac", user)
    });

    let client = match reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(12))
        .build()
    {
        Ok(c) => c,
        Err(_) => reqwest::Client::new(),
    };

    let res = client
        .post("https://api.polar.sh/v1/customer-portal/license-keys/activate")
        .header("Content-Type", "application/json")
        .json(&serde_json::json!({
            "key": clean_key,
            "organization_id": POLAR_ORGANIZATION_ID,
            "label": device_label,
        }))
        .send()
        .await
        .map_err(|e| format!("Network error contacting Polar license server: {}", e))?;

    if !res.status().is_success() {
        let status = res.status();
        let err_body: serde_json::Value = res.json().await.unwrap_or_default();
        let detail = err_body["detail"]
            .as_str()
            .or_else(|| err_body["error"].as_str())
            .unwrap_or("Invalid or expired license key");

        return Err(format!("Polar License Activation Failed ({}): {}", status, detail));
    }

    let json: serde_json::Value = res
        .json()
        .await
        .map_err(|e| format!("Failed to parse license response: {}", e))?;

    let activation_id = json["id"].as_str().map(|s| s.to_string());
    let customer_email = json["license_key"]["customer"]["email"].as_str().map(|s| s.to_string());
    let customer_name = json["license_key"]["customer"]["name"].as_str().map(|s| s.to_string());
    let limit_activations = json["license_key"]["limit_activations"].as_u64().map(|n| n as u32);
    let status = json["license_key"]["status"].as_str().unwrap_or("invalid");

    if status != "granted" {
        return Err(format!("License key is not active (status: {})", status));
    }

    // Determine tier from key prefix or metadata
    let tier = if clean_key.starts_with("DOPE-FVR") {
        "forever".to_string()
    } else {
        "core".to_string()
    };

    let license_data = LicenseData {
        key: clean_key,
        tier,
        is_pro: true,
        activation_id,
        customer_email,
        customer_name,
        activated_at: Some(chrono::Utc::now().to_rfc3339()),
        limit_activations,
    };

    save_license(&license_data)?;
    Ok(license_data)
}

/// Deactivate the current license from this Mac
pub async fn deactivate_license(force: bool) -> Result<LicenseData, String> {
    let current = load_license();
    if !current.is_pro || current.key.is_empty() {
        return Ok(LicenseData::default());
    }

    if let Some(act_id) = &current.activation_id {
        let client = match reqwest::Client::builder()
            .timeout(std::time::Duration::from_secs(10))
            .build()
        {
            Ok(c) => c,
            Err(_) => reqwest::Client::new(),
        };

        let res = client
            .post("https://api.polar.sh/v1/customer-portal/license-keys/deactivate")
            .header("Content-Type", "application/json")
            .json(&serde_json::json!({
                "key": current.key,
                "organization_id": POLAR_ORGANIZATION_ID,
                "activation_id": act_id,
            }))
            .send()
            .await;

        match res {
            Ok(r) if r.status().is_success() => {
                log::info!("Successfully released activation on Polar.sh");
            }
            Ok(r) => {
                let status = r.status();
                if !force {
                    return Err(format!(
                        "Failed to release activation on Polar server (status: {}). Local license preserved to prevent seat lock. Retry deactivation or choose Force.",
                        status
                    ));
                }
            }
            Err(e) => {
                if !force {
                    return Err(format!(
                        "Network error contacting Polar server ({}). Local license preserved to prevent seat lock. Please check your internet connection and try again.",
                        e
                    ));
                }
            }
        }
    }

    let reset_license = LicenseData::default();
    save_license(&reset_license)?;
    Ok(reset_license)
}
