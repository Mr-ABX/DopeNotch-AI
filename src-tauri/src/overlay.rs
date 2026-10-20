// overlay.rs - Controls overlay and settings window visibility

use tauri::{AppHandle, Manager};
use crate::settings::AppSettings;

#[cfg(target_os = "macos")]
#[repr(C)]
#[derive(Clone, Copy)]
pub struct NSPoint { pub x: f64, pub y: f64 }

#[cfg(target_os = "macos")]
#[repr(C)]
#[derive(Clone, Copy)]
pub struct NSSize { pub width: f64, pub height: f64 }

#[cfg(target_os = "macos")]
#[repr(C)]
#[derive(Clone, Copy)]
pub struct NSRect { pub origin: NSPoint, pub size: NSSize }

#[cfg(target_os = "macos")]
unsafe impl objc2::Encode for NSPoint {
    const ENCODING: objc2::Encoding = objc2::Encoding::Struct(
        "CGPoint",
        &[<f64 as objc2::Encode>::ENCODING, <f64 as objc2::Encode>::ENCODING],
    );
}

#[cfg(target_os = "macos")]
unsafe impl objc2::Encode for NSSize {
    const ENCODING: objc2::Encoding = objc2::Encoding::Struct(
        "CGSize",
        &[<f64 as objc2::Encode>::ENCODING, <f64 as objc2::Encode>::ENCODING],
    );
}

#[cfg(target_os = "macos")]
unsafe impl objc2::Encode for NSRect {
    const ENCODING: objc2::Encoding = objc2::Encoding::Struct(
        "CGRect",
        &[<NSPoint as objc2::Encode>::ENCODING, <NSSize as objc2::Encode>::ENCODING],
    );
}

/// Show the top notch visualizer window
pub fn show_visualizer(app: &AppHandle, _settings: &AppSettings) {
    if let Some(window) = app.get_webview_window("notch") {
        // Show window first so window is initialized by Tauri
        let _ = window.show();

        #[cfg(target_os = "macos")]
        {
            use objc2::msg_send;
            use objc2::runtime::{AnyObject, AnyClass, Sel};
            use objc2::ffi::{class_replaceMethod, object_setClass, objc_getClass};

            unsafe extern "C" fn unconstrained_constrain_frame_rect(
                _this: *mut AnyObject,
                _cmd: Sel,
                frame_rect: NSRect,
                _screen: *mut AnyObject,
            ) -> NSRect {
                frame_rect
            }

            unsafe extern "C" fn can_become_key(
                _this: *mut AnyObject,
                _cmd: Sel,
            ) -> bool {
                true
            }

            let window_clone = window.clone();
            let _ = app.run_on_main_thread(move || {
                if let Ok(ns_win) = window_clone.ns_window() {
                    let ns_win = ns_win as *mut AnyObject;
                    unsafe {
                        // Turn the NSWindow into an NSPanel
                        let panel_class = objc_getClass(b"NSPanel\0".as_ptr() as *const _);
                        if !panel_class.is_null() {
                            object_setClass(ns_win as *mut _, panel_class as *mut _);
                            
                            // NSPanel specific behaviors
                            let _: () = msg_send![ns_win, setFloatingPanel: true];
                            let _: () = msg_send![ns_win, setWorksWhenModal: true];
                        }

                        // Level 25 = kCGStatusWindowLevel (floats on top of all windows and menu bar, but strictly BELOW kCGDraggingWindowLevel 500 so dragged files stay visibly on top of the notch)
                        let _: () = msg_send![ns_win, setLevel: 25i64];
                        
                        // CanJoinAllSpaces(1) | Stationary(16) | IgnoresCycle(64) | FullScreenAuxiliary(256) = 337
                        let _: () = msg_send![ns_win, setCollectionBehavior: 337u64];

                        // 0 = NSWindowStyleMaskBorderless (allows panel to become key window without nonactivating lock)
                        let _: () = msg_send![ns_win, setStyleMask: 0u64];

                        // CRITICAL: Disable macOS native rectangular window shadow completely so
                        // the custom rounded notch does not cast a sharp square/pointy shadow box!
                        let _: () = msg_send![ns_win, setHasShadow: false];
                        let _: () = msg_send![ns_win, invalidateShadow];

                        // Ensure transparent background
                        let color_cls = objc_getClass(b"NSColor\0".as_ptr() as *const _);
                        if !color_cls.is_null() {
                            let clear_color: *mut AnyObject = msg_send![color_cls as *mut AnyObject, clearColor];
                            let _: () = msg_send![ns_win, setBackgroundColor: clear_color];
                            let _: () = msg_send![ns_win, setOpaque: false];
                        }
                        
                        // Bring it to the absolute front
                        let _: () = msg_send![ns_win, orderFrontRegardless];

                        // Override constrainFrameRect:toScreen: so Cocoa won't clamp Y to visibleFrame (below menu bar)
                        let class: *const AnyClass = msg_send![ns_win, class];
                        let sel_name = b"constrainFrameRect:toScreen:\0";
                        let sel_ptr = objc2::ffi::sel_registerName(sel_name.as_ptr() as *const _);
                        let types = b"{CGRect={CGPoint=dd}{CGSize=dd}}@:{CGRect={CGPoint=dd}{CGSize=dd}}@\0";
                        let imp: unsafe extern "C-unwind" fn() = std::mem::transmute(
                            unconstrained_constrain_frame_rect as unsafe extern "C" fn(*mut AnyObject, Sel, NSRect, *mut AnyObject) -> NSRect
                        );
                        class_replaceMethod(
                            class as *mut _,
                            sel_ptr.unwrap(),
                            imp,
                            types.as_ptr() as *const _,
                        );

                        // Allow NSPanel to become key window and main window so search input receives keyboard focus
                        let sel_can_key = objc2::ffi::sel_registerName(b"canBecomeKeyWindow\0".as_ptr() as *const _);
                        let imp_key: unsafe extern "C-unwind" fn() = std::mem::transmute(
                            can_become_key as unsafe extern "C" fn(*mut AnyObject, Sel) -> bool
                        );
                        class_replaceMethod(
                            class as *mut _,
                            sel_can_key.unwrap(),
                            imp_key,
                            b"B@:\0".as_ptr() as *const _,
                        );

                        let sel_can_main = objc2::ffi::sel_registerName(b"canBecomeMainWindow\0".as_ptr() as *const _);
                        class_replaceMethod(
                            class as *mut _,
                            sel_can_main.unwrap(),
                            imp_key,
                            b"B@:\0".as_ptr() as *const _,
                        );

                        // Get full screen frame (NOT visibleFrame — visibleFrame excludes menu bar)
                        let screen: *mut AnyObject = msg_send![ns_win, screen];
                        if !screen.is_null() {
                            let screen_frame: NSRect = msg_send![screen, frame];

                            // Idle/Recording notch: 280px window width (supports 160px idle and 220px recording + ears), 28px tall flush with menu bar
                            let win_w = 280.0_f64;
                            let win_h = 28.0_f64;

                            let target_frame = NSRect {
                                origin: NSPoint {
                                    x: screen_frame.origin.x + (screen_frame.size.width - win_w) / 2.0,
                                    y: screen_frame.origin.y + screen_frame.size.height - win_h,
                                },
                                size: NSSize {
                                    width: win_w,
                                    height: win_h,
                                },
                            };

                            let _: () = msg_send![ns_win, setFrame: target_frame, display: true];
                        }
                    }
                }
            });
        }

        #[cfg(not(target_os = "macos"))]
        {
            let monitor = app.primary_monitor().ok().flatten()
                .or_else(|| window.primary_monitor().ok().flatten());

            if let Some(monitor) = monitor {
                let scale = monitor.scale_factor();
                let screen_w = monitor.size().width as f64 / scale;
                let x = (screen_w - target_w) / 2.0;

                let target_x = (x * scale) as i32;
                let _ = window.set_position(tauri::PhysicalPosition::new(target_x, 0));
                let _ = window.set_size(tauri::LogicalSize::new(target_w, target_h));
                let _ = window.set_always_on_top(true);
            }
        }
    }
}

/// Hide the notch visualizer window if the setting is AutoHidden, or shrink to idle size
pub fn hide_visualizers(app: &AppHandle, settings: &AppSettings) {
    if settings.visibility_mode == crate::settings::VisibilityMode::AlwaysOn {
        resize_notch(app, false, None, None);
        return; // Keep small idle notch visible
    }

    if let Some(window) = app.get_webview_window("notch") {
        resize_notch(app, false, None, None);
        let _ = window.hide();
    }
}

/// Set macOS Dock application icon at runtime so raw binaries and dev builds show the DopeNotch icon instead of the terminal 'exec' icon
pub fn set_dock_icon() {
    #[cfg(target_os = "macos")]
    {
        use objc2::msg_send;
        use objc2::runtime::AnyObject;

        let icon_bytes = include_bytes!("../icons/icon.png");

        unsafe {
            let app_cls = objc2::ffi::objc_getClass(b"NSApplication\0".as_ptr() as *const _);
            if app_cls.is_null() {
                return;
            }
            let ns_app: *mut AnyObject = msg_send![app_cls as *mut AnyObject, sharedApplication];
            if ns_app.is_null() {
                return;
            }

            let data_cls = objc2::ffi::objc_getClass(b"NSData\0".as_ptr() as *const _);
            if data_cls.is_null() {
                return;
            }
            let ns_data: *mut AnyObject = msg_send![
                data_cls as *mut AnyObject,
                dataWithBytes: icon_bytes.as_ptr() as *const std::ffi::c_void,
                length: icon_bytes.len()
            ];
            if ns_data.is_null() {
                return;
            }

            let img_cls = objc2::ffi::objc_getClass(b"NSImage\0".as_ptr() as *const _);
            if img_cls.is_null() {
                return;
            }
            let alloc_img: *mut AnyObject = msg_send![img_cls as *mut AnyObject, alloc];
            let ns_img: *mut AnyObject = msg_send![alloc_img, initWithData: ns_data];
            if ns_img.is_null() {
                return;
            }

            let _: () = msg_send![ns_app, setApplicationIconImage: ns_img];

            let dock_tile: *mut AnyObject = msg_send![ns_app, dockTile];
            if !dock_tile.is_null() {
                let _: () = msg_send![dock_tile, display];
            }
        }
    }
}

/// Apply macOS dark title bar styling matching the window background color (#09090b)
pub fn apply_macos_window_styling(window: &tauri::WebviewWindow) {
    #[cfg(target_os = "macos")]
    {
        use objc2::msg_send;
        use objc2::runtime::AnyObject;

        if let Ok(ns_win) = window.ns_window() {
            let ns_win = ns_win as *mut AnyObject;
            unsafe {
                // 1. Make the title bar transparent so window background shows through
                let _: () = msg_send![ns_win, setTitlebarAppearsTransparent: true];

                // 2. Set NSWindow background color to matching dark window background (#09090b)
                // sRGB values for #09090b: r = 9/255 = 0.0353, g = 9/255 = 0.0353, b = 11/255 = 0.0431
                let color_cls = objc2::ffi::objc_getClass(b"NSColor\0".as_ptr() as *const _);
                if !color_cls.is_null() {
                    let bg_color: *mut AnyObject = msg_send![
                        color_cls as *mut AnyObject,
                        colorWithSRGBRed: 0.0353f64,
                        green: 0.0353f64,
                        blue: 0.0431f64,
                        alpha: 1.0f64
                    ];
                    let _: () = msg_send![ns_win, setBackgroundColor: bg_color];
                }

                // 3. Set dark appearance (NSAppearanceNameDarkAqua)
                let appearance_cls = objc2::ffi::objc_getClass(b"NSAppearance\0".as_ptr() as *const _);
                if !appearance_cls.is_null() {
                    let str_cls = objc2::ffi::objc_getClass(b"NSString\0".as_ptr() as *const _);
                    let dark_aqua: *mut AnyObject = msg_send![str_cls as *mut AnyObject, stringWithUTF8String: b"NSAppearanceNameDarkAqua\0".as_ptr()];
                    let appearance: *mut AnyObject = msg_send![appearance_cls as *mut AnyObject, appearanceNamed: dark_aqua];
                    if !appearance.is_null() {
                        let _: () = msg_send![ns_win, setAppearance: appearance];
                    }
                }
            }
        }
    }
}

/// Show the settings panel window
pub fn show_settings_window(app: &AppHandle) {
    if let Some(window) = app.get_webview_window("settings") {
        apply_macos_window_styling(&window);
        set_dock_icon();
        let _ = window.show();
        let _ = window.set_focus();
        let _ = window.center();
    }
}

/// Toggle tray popover (for now, opens settings — can be enhanced with a tray popup)
pub fn toggle_tray_popover(app: &AppHandle) {
    if let Some(window) = app.get_webview_window("settings") {
        if window.is_visible().unwrap_or(false) {
            let _ = window.hide();
        } else {
            show_settings_window(app);
        }
    }
}

/// Resize the notch window dynamically between idle and expanded modes
pub fn resize_notch(app: &AppHandle, expanded: bool, width: Option<f64>, height: Option<f64>) {
    if let Some(window) = app.get_webview_window("notch") {
        let (content_w, content_h) = if expanded {
            (width.unwrap_or(860.0_f64), height.unwrap_or(250.0_f64))
        } else {
            (160.0_f64, 28.0_f64)
        };

        // Canvas margins:
        // Expanded: +80px width (40px each side for ears & CSS shadow diffusion), +40px height at bottom
        // Idle: +40px width (20px each side for concave fillet ears), exact 28px height flush with menu bar
        let (target_w, target_h) = if expanded {
            (content_w + 80.0, content_h + 40.0)
        } else {
            (280.0, 28.0)
        };

        #[cfg(target_os = "macos")]
        {
            use objc2::msg_send;
            use objc2::runtime::AnyObject;

            let window_clone = window.clone();
            let _ = app.run_on_main_thread(move || {
                if let Ok(ns_win) = window_clone.ns_window() {
                    let ns_win = ns_win as *mut AnyObject;
                    unsafe {
                        // CRITICAL: Ensure macOS native square window shadow is disabled
                        let _: () = msg_send![ns_win, setHasShadow: false];
                        let _: () = msg_send![ns_win, invalidateShadow];

                        // Ensure transparent background
                        let color_cls = objc2::ffi::objc_getClass(b"NSColor\0".as_ptr() as *const _);
                        if !color_cls.is_null() {
                            let clear_color: *mut AnyObject = msg_send![color_cls as *mut AnyObject, clearColor];
                            let _: () = msg_send![ns_win, setBackgroundColor: clear_color];
                            let _: () = msg_send![ns_win, setOpaque: false];
                        }

                        let screen: *mut AnyObject = msg_send![ns_win, screen];
                        if !screen.is_null() {
                            let screen_frame: NSRect = msg_send![screen, frame];
                            let target_frame = NSRect {
                                origin: NSPoint {
                                    x: screen_frame.origin.x + (screen_frame.size.width - target_w) / 2.0,
                                    y: screen_frame.origin.y + screen_frame.size.height - target_h,
                                },
                                size: NSSize {
                                    width: target_w,
                                    height: target_h,
                                },
                            };
                            let _: () = msg_send![ns_win, setFrame: target_frame, display: true, animate: false];
                            let _: () = msg_send![ns_win, setHasShadow: false];
                            let _: () = msg_send![ns_win, invalidateShadow];
                        }

                        if expanded {
                            extern "C" {
                                fn record_target_application();
                            }
                            record_target_application();

                            // Keep window in front without stealing active drag focus from Finder/Figma
                            let _: () = msg_send![ns_win, orderFrontRegardless];
                        } else {
                            let _: () = msg_send![ns_win, orderFrontRegardless];
                        }
                    }
                }
            });
        }

        #[cfg(not(target_os = "macos"))]
        {
            if let Ok(Some(monitor)) = window.primary_monitor() {
                let screen_size = monitor.size();
                let scale = monitor.scale_factor();
                let x = ((screen_size.width as f64 / scale) - target_w) / 2.0;
                let _ = window.set_size(tauri::LogicalSize::new(target_w, target_h));
                let _ = window.set_position(tauri::LogicalPosition::new(x, 0.0));
            }
        }
    }
}

/// Show the fullscreen transparent pixel ruler overlay
pub fn show_ruler_overlay(app: &AppHandle) {
    if let Some(window) = app.get_webview_window("ruler") {
        #[cfg(target_os = "macos")]
        {
            use objc2::msg_send;
            use objc2::runtime::AnyObject;
            use objc2::ffi::{object_setClass, objc_getClass};

            let window_clone = window.clone();
            let _ = app.run_on_main_thread(move || {
                if let Ok(ns_win) = window_clone.ns_window() {
                    let ns_win = ns_win as *mut AnyObject;
                    unsafe {
                        let panel_class = objc_getClass(b"NSPanel\0".as_ptr() as *const _);
                        if !panel_class.is_null() {
                            object_setClass(ns_win as *mut _, panel_class as *mut _);
                            let _: () = msg_send![ns_win, setFloatingPanel: true];
                            let _: () = msg_send![ns_win, setWorksWhenModal: true];
                        }

                        // Level 25 = kCGStatusWindowLevel (floats on top of all windows, but below drag layer 500)
                        let _: () = msg_send![ns_win, setLevel: 25i64];
                        let _: () = msg_send![ns_win, setCollectionBehavior: 337u64];
                        let _: () = msg_send![ns_win, setStyleMask: 0u64];
                        let _: () = msg_send![ns_win, setHasShadow: false];
                        let _: () = msg_send![ns_win, invalidateShadow];

                        // Set 100% transparent background
                        let color_cls = objc_getClass(b"NSColor\0".as_ptr() as *const _);
                        if !color_cls.is_null() {
                            let clear_color: *mut AnyObject = msg_send![color_cls as *mut AnyObject, clearColor];
                            let _: () = msg_send![ns_win, setBackgroundColor: clear_color];
                            let _: () = msg_send![ns_win, setOpaque: false];
                        }

                        // Size to fill the active screen
                        let screen: *mut AnyObject = msg_send![ns_win, screen];
                        if !screen.is_null() {
                            let screen_frame: NSRect = msg_send![screen, frame];
                            let _: () = msg_send![ns_win, setFrame: screen_frame, display: true];
                        }

                        let _: () = msg_send![ns_win, orderFrontRegardless];
                        let _: () = msg_send![ns_win, makeKeyAndOrderFront: std::ptr::null_mut::<AnyObject>()];

                        let app_cls = objc_getClass(b"NSApplication\0".as_ptr() as *const _);
                        if !app_cls.is_null() {
                            let ns_app: *mut AnyObject = msg_send![app_cls as *mut AnyObject, sharedApplication];
                            if !ns_app.is_null() {
                                let _: () = msg_send![ns_app, activateIgnoringOtherApps: true];
                            }
                        }
                    }
                }
            });
        }

        #[cfg(not(target_os = "macos"))]
        {
            if let Ok(Some(monitor)) = window.primary_monitor() {
                let _ = window.set_size(monitor.size());
                let _ = window.set_position(tauri::PhysicalPosition::new(0, 0));
            }
        }

        let _ = window.show();
        let _ = window.set_focus();
        let _ = tauri::Emitter::emit(app, "dopenotch://ruler-activated", ());
    }
}

/// Hide the ruler overlay window
pub fn hide_ruler_overlay(app: &AppHandle) {
    if let Some(window) = app.get_webview_window("ruler") {
        let _ = window.hide();
        let _ = tauri::Emitter::emit(app, "dopenotch://ruler-deactivated", ());
    }
}

/// Toggle the ruler overlay window
pub fn toggle_ruler_overlay(app: &AppHandle) {
    if let Some(window) = app.get_webview_window("ruler") {
        if window.is_visible().unwrap_or(false) {
            hide_ruler_overlay(app);
        } else {
            show_ruler_overlay(app);
        }
    }
}
