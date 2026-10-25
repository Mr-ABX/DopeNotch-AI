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

pub fn save_license(license: &LicenseData) {
    let path = license_file_path();
    if let Some(parent) = path.parent() {
        let _ = fs::create_dir_all(parent);
    }
    if let Ok(json) = serde_json::to_string_pretty(license) {
        let _ = fs::write(path, json);
    }
}

pub fn is_pro_active() -> bool {
    load_license().is_pro
}

pub fn get_license_tier() -> String {
    load_license().tier
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

    let client = reqwest::Client::new();
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
    let status = json["license_key"]["status"].as_str().unwrap_or("granted");

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

    save_license(&license_data);
    Ok(license_data)
}

/// Deactivate the current license from this Mac
pub async fn deactivate_license() -> Result<LicenseData, String> {
    let current = load_license();
    if !current.is_pro || current.key.is_empty() {
        return Ok(LicenseData::default());
    }

    if let Some(act_id) = &current.activation_id {
        let client = reqwest::Client::new();
        let _ = client
            .post("https://api.polar.sh/v1/customer-portal/license-keys/deactivate")
            .header("Content-Type", "application/json")
            .json(&serde_json::json!({
                "key": current.key,
                "organization_id": POLAR_ORGANIZATION_ID,
                "activation_id": act_id,
            }))
            .send()
            .await;
    }

    let reset_license = LicenseData::default();
    save_license(&reset_license);
    Ok(reset_license)
}
