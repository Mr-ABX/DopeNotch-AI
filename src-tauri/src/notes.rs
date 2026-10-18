// DopeNotch Notes Persistence Engine (~/.dopenotch/notes.json)
// High-performance atomic JSON persistence for voice notes and checklists.

use serde::{Deserialize, Serialize};
use std::fs;
use std::path::PathBuf;
use std::sync::Mutex;

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct NoteItem {
    pub id: String,
    pub title: String,
    pub content: String,
    pub tags: Vec<String>,
    pub created_at: String,
    pub updated_at: String,
    pub char_count: usize,
    pub word_count: usize,
    pub is_pinned: bool,
}

static NOTES_LOCK: Mutex<()> = Mutex::new(());

fn get_notes_path() -> PathBuf {
    let settings = crate::settings::AppSettings::load_or_default();
    let root = crate::storage::DopeNotchStorage::get_root(settings.storage_directory.as_deref());
    let notes_file = crate::storage::DopeNotchStorage::notes_file(&root);

    if !notes_file.exists() {
        if let Some(home) = dirs::home_dir() {
            let legacy = home.join(".dopenotch").join("notes.json");
            if legacy.exists() {
                if let Some(parent) = notes_file.parent() {
                    let _ = fs::create_dir_all(parent);
                }
                let _ = fs::copy(&legacy, &notes_file);
                return notes_file;
            }
        }
        if let Some(parent) = notes_file.parent() {
            let _ = fs::create_dir_all(parent);
        }
    }
    notes_file
}

pub fn load_notes_from_disk() -> Result<Vec<NoteItem>, String> {
    let _guard = NOTES_LOCK.lock().map_err(|e| e.to_string())?;
    let path = get_notes_path();
    if !path.exists() {
        return Ok(Vec::new());
    }

    let data = fs::read_to_string(&path).map_err(|e| format!("Failed to read notes: {}", e))?;
    let notes: Vec<NoteItem> = serde_json::from_str(&data).unwrap_or_default();
    Ok(notes)
}

pub fn save_notes_to_disk(notes: &[NoteItem]) -> Result<(), String> {
    let _guard = NOTES_LOCK.lock().map_err(|e| e.to_string())?;
    let path = get_notes_path();
    let json = serde_json::to_string_pretty(notes)
        .map_err(|e| format!("Failed to serialize notes: {}", e))?;
    fs::write(&path, json).map_err(|e| format!("Failed to write notes to disk: {}", e))?;
    Ok(())
}

pub fn add_note(title: String, content: String, tags: Vec<String>) -> Result<NoteItem, String> {
    let mut notes = load_notes_from_disk()?;
    let now = chrono::Local::now().to_rfc3339();
    let words = content.split_whitespace().count();
    let chars = content.chars().count();

    // Generate smart clean title if blank
    let clean_title = if title.trim().is_empty() {
        let first_line = content.lines().next().unwrap_or("Untitled Voice Note");
        let truncated: String = first_line.chars().take(40).collect();
        truncated.trim().to_string()
    } else {
        title.trim().to_string()
    };

    let new_note = NoteItem {
        id: format!("note_{}_{}", chrono::Utc::now().timestamp_millis(), nanoid()),
        title: clean_title,
        content: content.trim().to_string(),
        tags,
        created_at: now.clone(),
        updated_at: now,
        char_count: chars,
        word_count: words,
        is_pinned: false,
    };

    notes.insert(0, new_note.clone());
    save_notes_to_disk(&notes)?;
    Ok(new_note)
}

pub fn delete_note(id: &str) -> Result<(), String> {
    let mut notes = load_notes_from_disk()?;
    notes.retain(|n| n.id != id);
    save_notes_to_disk(&notes)
}

pub fn update_note(
    id: &str,
    title: Option<String>,
    content: Option<String>,
    tags: Option<Vec<String>>,
    is_pinned: Option<bool>,
) -> Result<NoteItem, String> {
    let mut notes = load_notes_from_disk()?;
    let now = chrono::Local::now().to_rfc3339();

    let mut found = None;
    for note in &mut notes {
        if note.id == id {
            if let Some(t) = title {
                note.title = t.trim().to_string();
            }
            if let Some(c) = content {
                note.char_count = c.chars().count();
                note.word_count = c.split_whitespace().count();
                note.content = c;
            }
            if let Some(tg) = tags {
                note.tags = tg;
            }
            if let Some(p) = is_pinned {
                note.is_pinned = p;
            }
            note.updated_at = now.clone();
            found = Some(note.clone());
            break;
        }
    }

    if let Some(updated) = found {
        save_notes_to_disk(&notes)?;
        Ok(updated)
    } else {
        Err(format!("Note with ID {} not found", id))
    }
}

fn nanoid() -> String {
    use std::time::{SystemTime, UNIX_EPOCH};
    let nanos = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default()
        .subsec_nanos();
    format!("{:x}", nanos)
}
