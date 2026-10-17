// DopeNotch Web Inspector & Asset Extractor Engine (100% On-Device)
// Scrapes target website for color palettes, SVGs, images, typography, and meta tags.

use regex::Regex;
use serde::{Deserialize, Serialize};
use std::collections::HashSet;

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct WebInspectionResult {
    pub url: String,
    pub title: String,
    pub description: String,
    pub og_image: Option<String>,
    pub colors: Vec<String>,
    pub images: Vec<String>,
    pub svgs: Vec<String>,
    pub fonts: Vec<String>,
    pub total_assets_count: usize,
}

pub async fn inspect_url(target_url: &str) -> Result<WebInspectionResult, String> {
    let mut normalized = target_url.trim().to_string();
    if !normalized.starts_with("http://") && !normalized.starts_with("https://") {
        normalized = format!("https://{}", normalized);
    }

    let client = reqwest::Client::builder()
        .user_agent("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36")
        .timeout(std::time::Duration::from_secs(12))
        .build()
        .map_err(|e| format!("Failed to build HTTP client: {}", e))?;

    let resp = client
        .get(&normalized)
        .send()
        .await
        .map_err(|e| format!("Failed to reach {}: {}", normalized, e))?;

    let html = resp
        .text()
        .await
        .map_err(|e| format!("Failed to read response body: {}", e))?;

    // 1. Extract Page Title
    let title_regex = Regex::new(r"(?i)<title[^>]*>(.*?)</title>").unwrap();
    let title = title_regex
        .captures(&html)
        .and_then(|cap| cap.get(1))
        .map(|m| m.as_str().trim().to_string())
        .unwrap_or_else(|| normalized.clone());

    // 2. Extract Meta Description
    let desc_regex = Regex::new(r#"(?i)<meta[^>]+(?:name|property)=["'](?:description|og:description)["'][^>]+content=["']([^"']*)["']"#).unwrap();
    let description = desc_regex
        .captures(&html)
        .and_then(|cap| cap.get(1))
        .map(|m| m.as_str().trim().to_string())
        .unwrap_or_default();

    // 3. Extract OpenGraph Image
    let og_image_regex = Regex::new(r#"(?i)<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']*)["']"#).unwrap();
    let og_image = og_image_regex
        .captures(&html)
        .and_then(|cap| cap.get(1))
        .map(|m| resolve_url(&normalized, m.as_str()));

    // 4. Extract Colors (Hex values)
    let color_regex = Regex::new(r"#([0-9a-fA-F]{6}|[0-9a-fA-F]{3})\b").unwrap();
    let mut colors_set = HashSet::new();
    for cap in color_regex.captures_iter(&html) {
        if let Some(m) = cap.get(0) {
            let hex = m.as_str().to_lowercase();
            // Filter out common non-brand pure black/white/gray if too many
            colors_set.insert(hex);
        }
    }
    let colors: Vec<String> = colors_set.into_iter().take(24).collect();

    // 5. Extract Images
    let img_regex = Regex::new(r#"(?i)<img[^>]+src=["']([^"']+)["']"#).unwrap();
    let mut images_set = HashSet::new();
    for cap in img_regex.captures_iter(&html) {
        if let Some(m) = cap.get(1) {
            let src = m.as_str();
            if !src.starts_with("data:") {
                images_set.insert(resolve_url(&normalized, src));
            }
        }
    }
    let images: Vec<String> = images_set.into_iter().take(20).collect();

    // 6. Extract SVG elements / URLs
    let svg_regex = Regex::new(r#"(?i)(?:<svg[^>]*>.*?</svg>|src=["']([^"']+\.svg(?:[?#][^"']*)?)["'])"#).unwrap();
    let mut svgs_set = HashSet::new();
    for cap in svg_regex.captures_iter(&html) {
        if let Some(m) = cap.get(1) {
            svgs_set.insert(resolve_url(&normalized, m.as_str()));
        } else if let Some(m) = cap.get(0) {
            let svg_content = m.as_str();
            if svg_content.len() < 2500 {
                svgs_set.insert(svg_content.to_string());
            }
        }
    }
    let svgs: Vec<String> = svgs_set.into_iter().take(15).collect();

    // 7. Extract Font Families
    let font_regex = Regex::new(r#"(?i)font-family:\s*([^;}]+)"#).unwrap();
    let mut fonts_set = HashSet::new();
    for cap in font_regex.captures_iter(&html) {
        if let Some(m) = cap.get(1) {
            let font = m.as_str().trim().replace(['\'', '"'], "");
            fonts_set.insert(font);
        }
    }
    let fonts: Vec<String> = fonts_set.into_iter().take(8).collect();

    let total = colors.len() + images.len() + svgs.len() + fonts.len();

    Ok(WebInspectionResult {
        url: normalized,
        title,
        description,
        og_image,
        colors,
        images,
        svgs,
        fonts,
        total_assets_count: total,
    })
}

fn resolve_url(base: &str, relative: &str) -> String {
    if relative.starts_with("http://") || relative.starts_with("https://") {
        return relative.to_string();
    }
    if relative.starts_with("//") {
        return format!("https:{}", relative);
    }

    if let Ok(base_parsed) = reqwest::Url::parse(base) {
        if let Ok(joined) = base_parsed.join(relative) {
            return joined.to_string();
        }
    }

    relative.to_string()
}
