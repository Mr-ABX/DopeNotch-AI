// Window Snapping & Tile Manager (macOS & Windows)
// Enables Raycast / Rectangle-grade window snapping directly from DopeNotch (/left, /right, /max, /center, /tl, /tr, /bl, /br).

use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct WindowRect {
    pub x: i32,
    pub y: i32,
    pub width: i32,
    pub height: i32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SnapResult {
    pub layout: String,
    pub target_app: String,
    pub rect: WindowRect,
}

/// Computes the target window rectangle given usable screen bounds and layout ID.
pub fn compute_snap_rect(
    layout: &str,
    screen_x: i32,
    screen_y: i32,
    usable_width: i32,
    usable_height: i32,
) -> Result<WindowRect, String> {
    let normalized = layout.trim().to_lowercase();
    let half_w = usable_width / 2;
    let half_h = usable_height / 2;

    match normalized.as_str() {
        "left" | "left-half" | "l" => Ok(WindowRect {
            x: screen_x,
            y: screen_y,
            width: half_w,
            height: usable_height,
        }),
        "right" | "right-half" | "r" => Ok(WindowRect {
            x: screen_x + half_w,
            y: screen_y,
            width: usable_width - half_w,
            height: usable_height,
        }),
        "top" | "top-half" | "t" => Ok(WindowRect {
            x: screen_x,
            y: screen_y,
            width: usable_width,
            height: half_h,
        }),
        "bottom" | "bottom-half" | "b" => Ok(WindowRect {
            x: screen_x,
            y: screen_y + half_h,
            width: usable_width,
            height: usable_height - half_h,
        }),
        "max" | "maximize" | "full" => Ok(WindowRect {
            x: screen_x,
            y: screen_y,
            width: usable_width,
            height: usable_height,
        }),
        "almost-max" | "almost" => {
            let w = (usable_width as f64 * 0.90).round() as i32;
            let h = (usable_height as f64 * 0.90).round() as i32;
            Ok(WindowRect {
                x: screen_x + (usable_width - w) / 2,
                y: screen_y + (usable_height - h) / 2,
                width: w,
                height: h,
            })
        }
        "center" | "c" => {
            let w = (usable_width as f64 * 0.72).round() as i32;
            let h = (usable_height as f64 * 0.80).round() as i32;
            Ok(WindowRect {
                x: screen_x + (usable_width - w) / 2,
                y: screen_y + (usable_height - h) / 2,
                width: w,
                height: h,
            })
        }
        "tl" | "top-left" => Ok(WindowRect {
            x: screen_x,
            y: screen_y,
            width: half_w,
            height: half_h,
        }),
        "tr" | "top-right" => Ok(WindowRect {
            x: screen_x + half_w,
            y: screen_y,
            width: usable_width - half_w,
            height: half_h,
        }),
        "bl" | "bottom-left" => Ok(WindowRect {
            x: screen_x,
            y: screen_y + half_h,
            width: half_w,
            height: usable_height - half_h,
        }),
        "br" | "bottom-right" => Ok(WindowRect {
            x: screen_x + half_w,
            y: screen_y + half_h,
            width: usable_width - half_w,
            height: usable_height - half_h,
        }),
        "left-third" => {
            let third = usable_width / 3;
            Ok(WindowRect {
                x: screen_x,
                y: screen_y,
                width: third,
                height: usable_height,
            })
        }
        "center-third" => {
            let third = usable_width / 3;
            Ok(WindowRect {
                x: screen_x + third,
                y: screen_y,
                width: third,
                height: usable_height,
            })
        }
        "right-third" => {
            let third = usable_width / 3;
            Ok(WindowRect {
                x: screen_x + third * 2,
                y: screen_y,
                width: usable_width - third * 2,
                height: usable_height,
            })
        }
        _ => Err(format!("Unknown window snap layout: {}", layout)),
    }
}

/// Snaps the active foreground OS window to the requested layout.
pub fn snap_active_window(layout: &str) -> Result<SnapResult, String> {
    #[cfg(target_os = "macos")]
    {
        snap_active_window_macos(layout)
    }

    #[cfg(target_os = "windows")]
    {
        snap_active_window_windows(layout)
    }

    #[cfg(not(any(target_os = "macos", target_os = "windows")))]
    {
        let rect = compute_snap_rect(layout, 0, 28, 1920, 1052)?;
        Ok(SnapResult {
            layout: layout.to_string(),
            target_app: "Active Window".to_string(),
            rect,
        })
    }
}

#[cfg(target_os = "macos")]
fn snap_active_window_macos(layout: &str) -> Result<SnapResult, String> {
    use std::process::Command;

    // Step 1: Query desktop screen bounds via Finder (fallback to 1920x1080)
    let bounds_output = Command::new("osascript")
        .arg("-e")
        .arg("tell application \"Finder\" to get bounds of window of desktop")
        .output()
        .ok();

    let (mut screen_w, mut screen_h) = (1920, 1080);
    if let Some(out) = bounds_output {
        if out.status.success() {
            let s = String::from_utf8_lossy(&out.stdout);
            let nums: Vec<i32> = s
                .trim()
                .split(',')
                .filter_map(|p| p.trim().parse::<i32>().ok())
                .collect();
            if nums.len() == 4 && nums[2] > 400 && nums[3] > 300 {
                screen_w = nums[2];
                screen_h = nums[3];
            }
        }
    }

    // Reserve 28px for macOS top menu bar and 52px for Dock margin unless full screen
    let menu_bar_h = 28;
    let usable_h = (screen_h - menu_bar_h).max(300);
    let rect = compute_snap_rect(layout, 0, menu_bar_h, screen_w, usable_h)?;

    // Step 2: Position and resize the frontmost non-DopeNotch window using System Events
    let apple_script = format!(
        r#"
tell application "System Events"
    set frontProc to first application process whose frontmost is true
    set procName to name of frontProc
    if procName contains "DopeNotch" or procName contains "dopenotch" or procName contains "murmur" then
        set visible of frontProc to false
        delay 0.08
        set frontProc to first application process whose frontmost is true
        set procName to name of frontProc
    end if
    tell frontProc
        if (count of windows) > 0 then
            set position of front window to {{{x}, {y}}}
            set size of front window to {{{w}, {h}}}
        end if
    end tell
    return procName
end tell
"#,
        x = rect.x,
        y = rect.y,
        w = rect.width,
        h = rect.height
    );

    let output = Command::new("osascript")
        .arg("-e")
        .arg(&apple_script)
        .output()
        .map_err(|e| format!("Failed to run osascript: {}", e))?;

    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr);
        return Err(format!("Accessibility permission required to snap windows ({})", stderr.trim()));
    }

    let target_app = String::from_utf8_lossy(&output.stdout).trim().to_string();

    Ok(SnapResult {
        layout: layout.to_string(),
        target_app: if target_app.is_empty() {
            "Active Window".to_string()
        } else {
            target_app
        },
        rect,
    })
}

#[cfg(target_os = "windows")]
fn snap_active_window_windows(layout: &str) -> Result<SnapResult, String> {
    use std::process::Command;

    let rect = compute_snap_rect(layout, 0, 0, 1920, 1040)?;
    let ps_script = format!(
        r#"
Add-Type @"
using System;
using System.Runtime.InteropServices;
public class WinSnap {{
    [DllImport("user32.dll")] public static extern IntPtr GetForegroundWindow();
    [DllImport("user32.dll")] public static extern bool MoveWindow(IntPtr hWnd, int X, int Y, int nWidth, int nHeight, bool bRepaint);
    [DllImport("user32.dll")] public static extern bool ShowWindow(IntPtr hWnd, int nCmdShow);
}}
"@
Add-Type -AssemblyName System.Windows.Forms
$screen = [System.Windows.Forms.Screen]::PrimaryScreen.WorkingArea
$hwnd = [WinSnap]::GetForegroundWindow()
[WinSnap]::ShowWindow($hwnd, 9) | Out-Null
[WinSnap]::MoveWindow($hwnd, {x}, {y}, {w}, {h}, $true) | Out-Null
Write-Output "Active Window"
"#,
        x = rect.x,
        y = rect.y,
        w = rect.width,
        h = rect.height
    );

    let output = Command::new("powershell")
        .args(["-NoProfile", "-Command", &ps_script])
        .output()
        .map_err(|e| format!("Failed to snap window on Windows: {}", e))?;

    if !output.status.success() {
        return Err("Failed to snap window on Windows".to_string());
    }

    Ok(SnapResult {
        layout: layout.to_string(),
        target_app: "Active Window".to_string(),
        rect,
    })
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_compute_snap_rect_halves_and_quarters() {
        let left = compute_snap_rect("left", 0, 28, 1920, 1000).unwrap();
        assert_eq!(left, WindowRect { x: 0, y: 28, width: 960, height: 1000 });

        let right = compute_snap_rect("right", 0, 28, 1920, 1000).unwrap();
        assert_eq!(right, WindowRect { x: 960, y: 28, width: 960, height: 1000 });

        let br = compute_snap_rect("br", 0, 28, 1920, 1000).unwrap();
        assert_eq!(br, WindowRect { x: 960, y: 528, width: 960, height: 500 });

        let max = compute_snap_rect("max", 0, 28, 1920, 1000).unwrap();
        assert_eq!(max, WindowRect { x: 0, y: 28, width: 1920, height: 1000 });
    }

    #[test]
    fn test_compute_snap_rect_center() {
        let center = compute_snap_rect("center", 0, 28, 1000, 1000).unwrap();
        assert_eq!(center.width, 720);
        assert_eq!(center.height, 800);
        assert_eq!(center.x, 140);
        assert_eq!(center.y, 128);
    }
}
