use std::path::PathBuf;
use whisper_rs::{WhisperContext, WhisperContextParameters};

#[test]
fn test_whisper_context_loads() {
    let mut model_path = dirs::data_local_dir().unwrap_or_else(|| PathBuf::from("."));
    model_path.push("Murmur");
    model_path.push("models");
    model_path.push("ggml-base.bin");

    // Only test loading if the actual model file exists, is readable, and is not empty (> 1MB)
    let is_valid = match std::fs::File::open(&model_path) {
        Ok(file) => match file.metadata() {
            Ok(meta) => meta.len() > 1_000_000,
            Err(_) => false,
        },
        Err(_) => false,
    };

    if !is_valid {
        println!("Base whisper model not accessible or downloaded yet, skipping test.");
        return;
    }

    let params = WhisperContextParameters::default();
    let context_result = WhisperContext::new_with_params(&model_path.to_string_lossy(), params);
    
    assert!(context_result.is_ok(), "Failed to load whisper context! Model file might be corrupted or whisper-rs bindings are failing.");
    println!("Successfully loaded Whisper Context!");
}
