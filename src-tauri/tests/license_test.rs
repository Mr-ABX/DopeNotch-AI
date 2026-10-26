use dopenotch_lib::license::{activate_license, LicenseData};

#[test]
fn test_license_defaults() {
    let default_lic = LicenseData::default();
    assert_eq!(default_lic.tier, "community");
    assert!(!default_lic.is_pro);
    assert!(default_lic.key.is_empty());
    assert_eq!(default_lic.limit_activations, Some(1));
}

#[tokio::test]
async fn test_empty_key_activation_fails_gracefully() {
    let result = activate_license("   ".to_string(), None).await;
    assert!(result.is_err());
    let err = result.unwrap_err();
    assert!(err.contains("cannot be empty"));
}

#[tokio::test]
async fn test_invalid_key_polar_api_handling() {
    // Calling Polar with a bogus test key should return an error gracefully without panic
    let result = activate_license("DOPE-FAKE-KEY-TEST-9999".to_string(), Some("Test Device".to_string())).await;
    assert!(result.is_err());
    let err = result.unwrap_err();
    assert!(err.contains("Polar License Activation Failed") || err.contains("Network error"));
}

#[test]
fn test_license_serialization_roundtrip() {
    let lic = LicenseData {
        key: "DOPE-CORE-TEST-1234".to_string(),
        tier: "core".to_string(),
        is_pro: true,
        activation_id: Some("act_123".to_string()),
        customer_email: Some("test@example.com".to_string()),
        customer_name: Some("Test User".to_string()),
        activated_at: Some("2026-10-26T00:00:00Z".to_string()),
        limit_activations: Some(2),
    };

    let serialized = serde_json::to_string(&lic).expect("Failed to serialize");
    let deserialized: LicenseData = serde_json::from_str(&serialized).expect("Failed to deserialize");

    assert_eq!(deserialized.key, "DOPE-CORE-TEST-1234");
    assert_eq!(deserialized.tier, "core");
    assert!(deserialized.is_pro);
    assert_eq!(deserialized.customer_email.as_deref(), Some("test@example.com"));
    assert_eq!(deserialized.limit_activations, Some(2));
}
