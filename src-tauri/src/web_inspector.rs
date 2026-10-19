// DopeNotch Web Inspector & Asset Extractor Engine (100% On-Device)
// Scrapes target website or local HTML file for color palettes, SVGs, images, typography, and meta tags.

use regex::Regex;
use serde::{Deserialize, Serialize};
use std::collections::HashSet;
use std::path::Path;

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct WebInspectionResult {
    pub url: String,
    pub title: String,
    pub description: String,
    pub og_image: Option<String>,
    pub favicon: Option<String>,
    pub colors: Vec<String>,
    pub images: Vec<String>,
    pub svgs: Vec<String>,
    pub fonts: Vec<String>,
    pub total_assets_count: usize,
}

#[cfg(target_os = "macos")]
pub fn get_frontmost_browser_url() -> Option<String> {
    // Queries frontmost active browser tab via macOS AppleScript (Chrome, Safari, Arc, Brave, Edge)
    let script = r#"
    tell application "System Events"
        set frontApp to name of first application process whose frontmost is true
    end tell
    if frontApp is "Google Chrome" then
        tell application "Google Chrome" to return URL of active tab of front window
    else if frontApp is "Safari" then
        tell application "Safari" to return URL of current tab of front window
    else if frontApp is "Arc" then
        tell application "Arc" to return URL of active tab of front window
    else if frontApp is "Brave Browser" then
        tell application "Brave Browser" to return URL of active tab of front window
    else if frontApp is "Microsoft Edge" then
        tell application "Microsoft Edge" to return URL of active tab of front window
    else
        return ""
    end if
    "#;

    let output = std::process::Command::new("osascript")
        .arg("-e")
        .arg(script)
        .output()
        .ok()?;

    if output.status.success() {
        let res = String::from_utf8_lossy(&output.stdout).trim().to_string();
        if !res.is_empty() && (res.starts_with("http://") || res.starts_with("https://")) {
            return Some(res);
        }
    }
    None
}

#[cfg(not(target_os = "macos"))]
pub fn get_frontmost_browser_url() -> Option<String> {
    None
}

pub async fn inspect_url(target: &str) -> Result<WebInspectionResult, String> {
    let raw = target.trim();
    let mut resolved_url = raw.to_string();

    // 1. If target is empty or "active", snatch frontmost browser URL
    if raw.is_empty() || raw.eq_ignore_ascii_case("active") {
        if let Some(active_url) = get_frontmost_browser_url() {
            resolved_url = active_url;
        } else {
            return Err("No active browser URL detected. Open Safari, Chrome, Arc, or enter a URL (e.g. /inspect https://linear.app)".to_string());
        }
    }

    // 2. Check if local HTML file path
    let is_local_file = resolved_url.starts_with("file://")
        || resolved_url.ends_with(".html")
        || resolved_url.ends_with(".htm")
        || Path::new(&resolved_url).exists();

    let (html, base_url) = if is_local_file {
        let clean_path = resolved_url.trim_start_matches("file://");
        let path = Path::new(clean_path);
        if !path.exists() {
            return Err(format!("Local file not found: {}", clean_path));
        }
        let content = std::fs::read_to_string(path)
            .map_err(|e| format!("Failed to read local file: {}", e))?;
        (content, format!("file://{}", clean_path))
    } else {
        // Web URL
        if !resolved_url.starts_with("http://") && !resolved_url.starts_with("https://") {
            resolved_url = format!("https://{}", resolved_url);
        }

        let client = reqwest::Client::builder()
            .user_agent("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36")
            .timeout(std::time::Duration::from_secs(12))
            .build()
            .map_err(|e| format!("Failed to build HTTP client: {}", e))?;

        let resp = client
            .get(&resolved_url)
            .send()
            .await
            .map_err(|e| format!("Failed to reach {}: {}", resolved_url, e))?;

        let body = resp
            .text()
            .await
            .map_err(|e| format!("Failed to read response body: {}", e))?;

        (body, resolved_url.clone())
    };

    // 3. Extract Page Title
    let title_regex = Regex::new(r"(?i)<title[^>]*>(.*?)</title>").unwrap();
    let title = title_regex
        .captures(&html)
        .and_then(|cap| cap.get(1))
        .map(|m| m.as_str().trim().to_string())
        .unwrap_or_else(|| {
            if is_local_file {
                Path::new(&base_url)
                    .file_name()
                    .and_then(|n| n.to_str())
                    .unwrap_or("Local HTML Document")
                    .to_string()
            } else {
                base_url.clone()
            }
        });

    // 4. Extract Meta Description
    let desc_regex = Regex::new(r#"(?i)<meta[^>]+(?:name|property)=["'](?:description|og:description)["'][^>]+content=["']([^"']*)["']"#).unwrap();
    let description = desc_regex
        .captures(&html)
        .and_then(|cap| cap.get(1))
        .map(|m| m.as_str().trim().to_string())
        .unwrap_or_default();

    // 5. Extract OpenGraph Image
    let og_image_regex = Regex::new(r#"(?i)<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']*)["']"#).unwrap();
    let og_image = og_image_regex
        .captures(&html)
        .and_then(|cap| cap.get(1))
        .map(|m| resolve_url(&base_url, m.as_str()));

    // 6. Extract Favicon
    let favicon_regex = Regex::new(r#"(?i)<link[^>]+rel=["'](?:shortcut\s+)?icon["'][^>]+href=["']([^"']*)["']"#).unwrap();
    let favicon = favicon_regex
        .captures(&html)
        .and_then(|cap| cap.get(1))
        .map(|m| resolve_url(&base_url, m.as_str()))
        .or_else(|| {
            if !is_local_file {
                if let Ok(parsed) = reqwest::Url::parse(&base_url) {
                    return Some(format!("{}://{}/favicon.ico", parsed.scheme(), parsed.host_str().unwrap_or("")));
                }
            }
            None
        });

    // 7. Extract Colors (Hex values)
    let color_regex = Regex::new(r"#([0-9a-fA-F]{6}|[0-9a-fA-F]{3})\b").unwrap();
    let mut colors_set = HashSet::new();
    for cap in color_regex.captures_iter(&html) {
        if let Some(m) = cap.get(0) {
            let hex = m.as_str().to_lowercase();
            colors_set.insert(hex);
        }
    }
    let colors: Vec<String> = colors_set.into_iter().take(28).collect();

    // 8. Extract Images (<img src>, <img srcset>, background-image)
    let img_regex = Regex::new(r#"(?i)<img[^>]+src=["']([^"']+)["']"#).unwrap();
    let mut images_set = HashSet::new();
    for cap in img_regex.captures_iter(&html) {
        if let Some(m) = cap.get(1) {
            let src = m.as_str().trim();
            if !src.starts_with("data:") && !src.ends_with(".svg") {
                images_set.insert(resolve_url(&base_url, src));
            }
        }
    }

    // CSS background images
    let bg_regex = Regex::new(r#"(?i)url\(["']?([^"')]+?\.(?:png|jpg|jpeg|webp|gif))["']?\)"#).unwrap();
    for cap in bg_regex.captures_iter(&html) {
        if let Some(m) = cap.get(1) {
            let src = m.as_str().trim();
            if !src.starts_with("data:") {
                images_set.insert(resolve_url(&base_url, src));
            }
        }
    }
    let images: Vec<String> = images_set.into_iter().take(30).collect();

    // 9. Extract SVGs (embedded <svg> blocks and linked .svg URLs)
    let svg_regex = Regex::new(r#"(?i)(?:<svg[^>]*>.*?</svg>|src=["']([^"']+\.svg(?:[?#][^"']*)?)["'])"#).unwrap();
    let mut svgs_set = HashSet::new();
    for cap in svg_regex.captures_iter(&html) {
        if let Some(m) = cap.get(1) {
            svgs_set.insert(resolve_url(&base_url, m.as_str()));
        } else if let Some(m) = cap.get(0) {
            let svg_content = m.as_str().trim();
            if svg_content.len() < 3500 && svg_content.starts_with("<svg") {
                svgs_set.insert(svg_content.to_string());
            }
        }
    }
    let svgs: Vec<String> = svgs_set.into_iter().take(24).collect();

    // 10. Extract Font Families
    let font_regex = Regex::new(r#"(?i)font-family:\s*([^;}]+)"#).unwrap();
    let mut fonts_set = HashSet::new();
    for cap in font_regex.captures_iter(&html) {
        if let Some(m) = cap.get(1) {
            let font = m.as_str().trim().replace(['\'', '"'], "");
            for item in font.split(',') {
                let clean = item.trim();
                if !clean.is_empty() && clean.len() < 32 {
                    fonts_set.insert(clean.to_string());
                }
            }
        }
    }
    let fonts: Vec<String> = fonts_set.into_iter().take(12).collect();

    let total = colors.len() + images.len() + svgs.len() + fonts.len();

    Ok(WebInspectionResult {
        url: base_url,
        title,
        description,
        og_image,
        favicon,
        colors,
        images,
        svgs,
        fonts,
        total_assets_count: total,
    })
}

fn resolve_url(base: &str, relative: &str) -> String {
    let clean = relative.trim();
    if clean.starts_with("http://") || clean.starts_with("https://") || clean.starts_with("file://") {
        return clean.to_string();
    }
    if clean.starts_with("//") {
        return format!("https:{}", clean);
    }

    if let Ok(base_parsed) = reqwest::Url::parse(base) {
        if let Ok(joined) = base_parsed.join(clean) {
            return joined.to_string();
        }
    }

    clean.to_string()
}
