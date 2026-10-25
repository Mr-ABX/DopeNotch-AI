// transcriber.rs - Whisper.cpp inference via whisper-rs

use anyhow::{anyhow, Result};
use std::path::PathBuf;
use whisper_rs::{FullParams, SamplingStrategy, WhisperContext, WhisperContextParameters};

use crate::settings::{AppSettings, WhisperModel};

pub struct TranscriberState {
    pub context: Option<WhisperContext>,
    pub model: WhisperModel,
}

impl TranscriberState {
    pub fn new(model: &WhisperModel) -> Self {
        Self {
            context: None,
            model: model.clone(),
        }
    }

    pub fn load_model(&mut self, model_path: &PathBuf) -> Result<()> {
        log::info!("Loading Whisper model from {:?}", model_path);
        
        // Explicitly drop the old context to free RAM before loading the new one
        self.context = None;

        if !model_path.exists() {
            return Err(anyhow!("Model file not found: {:?}", model_path));
        }

        let mut params = WhisperContextParameters::default();
        params.use_gpu(false);
        let ctx = WhisperContext::new_with_params(
            model_path.to_str().ok_or_else(|| anyhow!("Invalid model path"))?,
            params,
        ).map_err(|e| anyhow!("Failed to load Whisper model: {}", e))?;

        self.context = Some(ctx);
        log::info!("Whisper model loaded successfully on CPU");
        Ok(())
    }

    /// Transcribe audio samples (f32, 16kHz mono) to text
    pub fn transcribe(&self, audio: &[f32], language: &str, _voxcoder_mode: bool) -> Result<String> {
        let ctx = self.context.as_ref()
            .ok_or_else(|| anyhow!("Whisper model not loaded"))?;

        // Use Greedy search (best_of: 1) across all models: 5x faster, CPU-friendly, low RAM usage
        let mut params = FullParams::new(SamplingStrategy::Greedy { best_of: 1 });

        let lang_opt = if language.is_empty() || language == "auto" {
            None
        } else {
            Some(language)
        };
        params.set_language(lang_opt);
        params.set_translate(false);
        params.set_print_special(false);
        params.set_print_progress(false);
        params.set_print_realtime(false);
        params.set_print_timestamps(false);
        params.set_token_timestamps(false);
        params.set_n_threads(num_cpus::get().min(4) as i32);
        params.set_no_context(true);

        let mut state = ctx.create_state()
            .map_err(|e| anyhow!("Failed to create Whisper state: {}", e))?;

        state.full(params, audio)
            .map_err(|e| anyhow!("Whisper inference failed: {}", e))?;

        // Collect segments
        let num_segments = state.full_n_segments()
            .map_err(|e| anyhow!("Failed to get segments: {}", e))?;

        let mut transcript = String::new();
        for i in 0..num_segments {
            let segment = state.full_get_segment_text(i)
                .map_err(|e| anyhow!("Failed to get segment text: {}", e))?;
            
            // Filter out common hallucinations caused by silence
            let cleaned = segment
                .replace("[BLANK_AUDIO]", "")
                .replace("[ Silence ]", "")
                .replace("(silence)", "")
                .replace("[Silence]", "")
                .replace("(clicks)", "");
                
            transcript.push_str(&cleaned);
        }

        Ok(transcript.trim().to_string())
    }

    pub fn is_loaded(&self) -> bool {
        self.context.is_some()
    }
}

/// Ensure Whisper model is loaded, loading it if necessary
pub fn ensure_model_loaded(
    transcriber: &mut TranscriberState,
    settings: &AppSettings,
) -> Result<()> {
    if !transcriber.is_loaded() || transcriber.model != settings.model {
        let mut target_model = settings.model.clone();
        let mut model_path = settings.model_path(&target_model);

        if !model_path.exists() {
            // Find any available downloaded model so transcription NEVER breaks!
            let fallback_candidates = [
                WhisperModel::BaseEn,
                WhisperModel::SmallEn,
                WhisperModel::TinyEn,
                WhisperModel::Base,
                WhisperModel::Small,
                WhisperModel::Tiny,
                WhisperModel::MediumEn,
                WhisperModel::Medium,
                WhisperModel::LargeV3Turbo,
            ];
            let mut found = false;
            for candidate in &fallback_candidates {
                let p = settings.model_path(candidate);
                if p.exists() {
                    log::warn!(
                        "Selected model {:?} not downloaded yet ({:?}). Seamlessly using available model {:?} ({:?})",
                        target_model, model_path, candidate, p
                    );
                    target_model = candidate.clone();
                    model_path = p;
                    found = true;
                    break;
                }
            }
            if !found {
                return Err(anyhow!(
                    "No downloaded Whisper model found in {:?}. Please open Settings -> AI Model to download one.",
                    AppSettings::models_dir()
                ));
            }
        }

        transcriber.load_model(&model_path)?;
        transcriber.model = target_model;
    }
    Ok(())
}

fn encode_wav(audio: &[f32]) -> Result<Vec<u8>> {
    let mut cursor = std::io::Cursor::new(Vec::new());
    let spec = hound::WavSpec {
        channels: 1,
        sample_rate: 16000,
        bits_per_sample: 16,
        sample_format: hound::SampleFormat::Int,
    };
    let mut writer = hound::WavWriter::new(&mut cursor, spec)?;
    for &sample in audio {
        // Convert f32 [-1.0, 1.0] to i16
        let amplitude = (sample * i16::MAX as f32) as i16;
        writer.write_sample(amplitude)?;
    }
    writer.finalize()?;
    Ok(cursor.into_inner())
}

async fn transcribe_gemini(wav_bytes: &[u8], api_key: &str) -> Result<String> {
    use base64::{Engine as _, engine::general_purpose::STANDARD as base64_std};
    
    let encoded_audio = base64_std.encode(wav_bytes);
    let url = format!("https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key={}", api_key);
    
    let body = serde_json::json!({
        "contents": [{
            "parts": [
                { "text": "You are a highly accurate audio transcription tool. Please transcribe the provided audio accurately. Output ONLY the raw transcription text, no formatting, no conversational filler, no markdown." },
                {
                    "inline_data": {
                        "mime_type": "audio/wav",
                        "data": encoded_audio
                    }
                }
            ]
        }]
    });

    let client = reqwest::Client::new();
    let res = client.post(&url)
        .header("Content-Type", "application/json")
        .json(&body)
        .send()
        .await?;

    if !res.status().is_success() {
        let err_text = res.text().await.unwrap_or_default();
        return Err(anyhow!("Gemini API error: {}", err_text));
    }

    let json: serde_json::Value = res.json().await?;
    let text = json["candidates"][0]["content"]["parts"][0]["text"].as_str()
        .ok_or_else(|| anyhow!("Invalid Gemini response format"))?;

    Ok(text.trim().to_string())
}

async fn transcribe_groq(wav_bytes: &[u8], api_key: &str, language: &str) -> Result<String> {
    let url = "https://api.groq.com/openai/v1/audio/transcriptions";
    
    let part = reqwest::multipart::Part::bytes(wav_bytes.to_vec())
        .file_name("audio.wav")
        .mime_str("audio/wav")?;

    let form = reqwest::multipart::Form::new()
        .part("file", part)
        .text("model", "whisper-large-v3")
        .text("language", language.to_string())
        .text("response_format", "json");

    let client = reqwest::Client::new();
    let res = client.post(url)
        .header("Authorization", format!("Bearer {}", api_key))
        .multipart(form)
        .send()
        .await?;

    if !res.status().is_success() {
        let err_text = res.text().await.unwrap_or_default();
        return Err(anyhow!("Groq API error: {}", err_text));
    }

    let json: serde_json::Value = res.json().await?;
    let text = json["text"].as_str()
        .ok_or_else(|| anyhow!("Invalid Groq response format"))?;

    Ok(text.trim().to_string())
}

async fn transcribe_deepgram(wav_bytes: &[u8], api_key: &str) -> Result<String> {
    let url = "https://api.deepgram.com/v1/listen?model=nova-2&smart_format=true";
    let client = reqwest::Client::new();
    let res = client.post(url)
        .header("Authorization", format!("Token {}", api_key))
        .header("Content-Type", "audio/wav")
        .body(wav_bytes.to_vec())
        .send()
        .await?;

    if !res.status().is_success() {
        let err_text = res.text().await.unwrap_or_default();
        return Err(anyhow!("Deepgram API error: {}", err_text));
    }

    let json: serde_json::Value = res.json().await?;
    let text = json["results"]["channels"][0]["alternatives"][0]["transcript"].as_str()
        .unwrap_or_default();

    Ok(text.trim().to_string())
}

pub async fn transcribe_hybrid(
    audio: &[f32],
    settings: &AppSettings,
    transcriber_mutex: &std::sync::Arc<std::sync::Mutex<TranscriberState>>
) -> Result<String> {
    let cloud_mode = match settings.cloud_provider {
        crate::settings::CloudProvider::Gemini => {
            if !settings.gemini_api_key.is_empty() {
                Some("gemini")
            } else {
                None
            }
        },
        crate::settings::CloudProvider::Groq => {
            if !settings.groq_api_key.is_empty() {
                Some("groq")
            } else {
                None
            }
        },
        crate::settings::CloudProvider::Deepgram => {
            if !settings.deepgram_api_key.is_empty() {
                Some("deepgram")
            } else {
                None
            }
        },
        crate::settings::CloudProvider::Local => None,
    };

    let mut final_text = match encode_wav(audio) {
        Ok(wav_bytes) if cloud_mode.is_some() => {
            let mode = cloud_mode.unwrap();
            let cloud_result = if mode == "gemini" {
                log::info!("Attempting Gemini cloud transcription");
                transcribe_gemini(&wav_bytes, &settings.gemini_api_key).await
            } else if mode == "deepgram" {
                log::info!("Attempting Deepgram cloud transcription");
                transcribe_deepgram(&wav_bytes, &settings.deepgram_api_key).await
            } else {
                log::info!("Attempting Groq cloud transcription");
                transcribe_groq(&wav_bytes, &settings.groq_api_key, &settings.language).await
            };

            match cloud_result {
                Ok(text) => text,
                Err(e) => {
                    log::warn!("Cloud API failed, falling back to Local Whisper: {}", e);
                    log::info!("Using Local Whisper.cpp for transcription");
                    let mut ts = transcriber_mutex.lock().unwrap();
                    ensure_model_loaded(&mut ts, settings)?;
                    ts.transcribe(audio, &settings.language, settings.voxcoder_mode)?
                }
            }
        }
        _ => {
            log::info!("Using Local Whisper.cpp for transcription");
            let mut ts = transcriber_mutex.lock().unwrap();
            ensure_model_loaded(&mut ts, settings)?;
            ts.transcribe(audio, &settings.language, settings.voxcoder_mode)?
        }
    };

    if settings.ai_rewrite {
        log::info!("AI Rewrite is enabled. Polishing transcript...");
        match rewrite_transcript(&final_text, settings).await {
            Ok(polished) => final_text = polished,
            Err(e) => log::warn!("AI Rewrite failed, using original transcript: {}", e),
        }
    }

    Ok(final_text)
}

async fn rewrite_transcript(text: &str, settings: &AppSettings) -> Result<String> {
    if !settings.groq_api_key.is_empty() {
        let url = "https://api.groq.com/openai/v1/chat/completions";
        let body = serde_json::json!({
            "model": "llama3-8b-8192",
            "messages": [
                {
                    "role": "system",
                    "content": "You are a transcript polisher. Fix any grammatical errors, spelling mistakes, or weird stutters in the provided text. Maintain the original meaning perfectly. ONLY output the corrected text, without any conversational filler."
                },
                {
                    "role": "user",
                    "content": text
                }
            ],
            "temperature": 0.3
        });

        let client = reqwest::Client::new();
        let res = client.post(url)
            .header("Authorization", format!("Bearer {}", settings.groq_api_key))
            .header("Content-Type", "application/json")
            .json(&body)
            .send()
            .await?;

        if !res.status().is_success() {
            let err_text = res.text().await.unwrap_or_default();
            return Err(anyhow!("Groq rewrite error: {}", err_text));
        }

        let json: serde_json::Value = res.json().await?;
        let rewritten = json["choices"][0]["message"]["content"].as_str()
            .ok_or_else(|| anyhow!("Invalid Groq rewrite response format"))?;
            
        return Ok(rewritten.trim().to_string());
    } else if !settings.gemini_api_key.is_empty() {
        let url = format!("https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key={}", settings.gemini_api_key);
        let body = serde_json::json!({
            "contents": [{
                "parts": [{ "text": format!("You are a transcript polisher. Fix any grammatical errors, spelling mistakes, or weird stutters in the following text. Maintain the original meaning perfectly. ONLY output the corrected text, without any conversational filler, intro, or markdown formatting.\n\nText to polish:\n{}", text) }]
            }],
            "generationConfig": {
                "temperature": 0.3
            }
        });

        let client = reqwest::Client::new();
        let res = client.post(&url)
            .header("Content-Type", "application/json")
            .json(&body)
            .send()
            .await?;

        if !res.status().is_success() {
            let err_text = res.text().await.unwrap_or_default();
            return Err(anyhow!("Gemini rewrite error: {}", err_text));
        }

        let json: serde_json::Value = res.json().await?;
        let rewritten = json["candidates"][0]["content"]["parts"][0]["text"].as_str()
            .ok_or_else(|| anyhow!("Invalid Gemini rewrite response format"))?;
            
        return Ok(rewritten.trim().to_string());
    }

    Ok(text.to_string())
}
