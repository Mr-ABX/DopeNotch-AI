#import <AppKit/AppKit.h>
#import <Foundation/Foundation.h>
#import <AVFoundation/AVFoundation.h>
#import <Carbon/Carbon.h>
#import <unistd.h>

typedef void (*ColorCallback)(const char *hex_str, void *context);
typedef void (*PermissionCallback)(bool granted, void *context);

static NSRunningApplication *g_previous_app = nil;

void sample_screen_color(ColorCallback callback, void *context) {
    dispatch_async(dispatch_get_main_queue(), ^{
        Class samplerClass = NSClassFromString(@"NSColorSampler");
        if (samplerClass != nil) {
            NSColorSampler *sampler = [[samplerClass alloc] init];
            [sampler showSamplerWithSelectionHandler:^(NSColor * _Nullable selectedColor) {
                if (selectedColor) {
                    NSColor *srgbColor = [selectedColor colorUsingColorSpace:[NSColorSpace sRGBColorSpace]];
                    if (srgbColor) {
                        int r = (int)round([srgbColor redComponent] * 255.0);
                        int g = (int)round([srgbColor greenComponent] * 255.0);
                        int b = (int)round([srgbColor blueComponent] * 255.0);
                        char hex[10];
                        snprintf(hex, sizeof(hex), "#%02X%02X%02X", r, g, b);
                        if (callback) {
                            callback(hex, context);
                        }
                        return;
                    }
                }
                if (callback) {
                    callback("", context);
                }
            }];
        } else {
            if (callback) {
                callback("", context);
            }
        }
    });
}

int check_mic_permission_status() {
    Class avClass = NSClassFromString(@"AVCaptureDevice");
    if (avClass && [avClass respondsToSelector:@selector(authorizationStatusForMediaType:)]) {
        NSInteger status = [AVCaptureDevice authorizationStatusForMediaType:AVMediaTypeAudio];
        return (int)status;
    }
    return 3;
}

void request_mic_permission(PermissionCallback callback, void *context) {
    Class avClass = NSClassFromString(@"AVCaptureDevice");
    if (avClass && [avClass respondsToSelector:@selector(requestAccessForMediaType:completionHandler:)]) {
        [AVCaptureDevice requestAccessForMediaType:AVMediaTypeAudio completionHandler:^(BOOL granted) {
            if (callback) {
                callback(granted ? true : false, context);
            }
        }];
    } else {
        if (callback) {
            callback(true, context);
        }
    }
}

// Record the active frontmost application before DopeNotch gains focus
void record_target_application() {
    @autoreleasepool {
        NSRunningApplication *front = [[NSWorkspace sharedWorkspace] frontmostApplication];
        NSString *myBundle = [[NSBundle mainBundle] bundleIdentifier];
        if (front && myBundle && ![[front bundleIdentifier] isEqualToString:myBundle]) {
            g_previous_app = front;
        }
    }
}

// Paste text into the target application by yielding focus and synthesizing Cmd+V
bool paste_text_to_target_app(const char *text) {
    @autoreleasepool {
        if (!text) return false;
        NSString *nsText = [NSString stringWithUTF8String:text];
        if (!nsText) return false;

        NSPasteboard *pb = [NSPasteboard generalPasteboard];
        [pb clearContents];
        [pb setString:nsText forType:NSPasteboardTypeString];

        if (g_previous_app) {
            [g_previous_app activateWithOptions:NSApplicationActivateIgnoringOtherApps];
        } else {
            [NSApp hide:nil];
        }

        // Wait 70ms for the target application to gain active focus
        usleep(70000);

        CGEventRef event_down = CGEventCreateKeyboardEvent(NULL, 0x09, true); // 0x09 = ANSI 'v'
        if (!event_down) return false;
        CGEventSetFlags(event_down, kCGEventFlagMaskCommand);
        CGEventPost(kCGHIDEventTap, event_down);
        CFRelease(event_down);

        usleep(25000);

        CGEventRef event_up = CGEventCreateKeyboardEvent(NULL, 0x09, false);
        if (event_up) {
            CGEventSetFlags(event_up, kCGEventFlagMaskCommand);
            CGEventPost(kCGHIDEventTap, event_up);
            CFRelease(event_up);
        }

        return true;
    }
}

// Paste image data into the target application by yielding focus and synthesizing Cmd+V
bool paste_image_to_target_app(const char *base64_data) {
    @autoreleasepool {
        if (!base64_data) return false;
        const char *prefix = "data:image/png;base64,";
        const char *raw_b64 = base64_data;
        if (strncmp(base64_data, prefix, strlen(prefix)) == 0) {
            raw_b64 = base64_data + strlen(prefix);
        }
        NSString *nsB64 = [NSString stringWithUTF8String:raw_b64];
        if (!nsB64) return false;
        NSData *imgData = [[NSData alloc] initWithBase64EncodedString:nsB64 options:NSDataBase64DecodingIgnoreUnknownCharacters];
        if (!imgData) return false;

        NSPasteboard *pb = [NSPasteboard generalPasteboard];
        [pb clearContents];
        [pb setData:imgData forType:NSPasteboardTypePNG];
        [pb setData:imgData forType:NSPasteboardTypeTIFF];

        if (g_previous_app) {
            [g_previous_app activateWithOptions:NSApplicationActivateIgnoringOtherApps];
        } else {
            [NSApp hide:nil];
        }

        usleep(70000);

        CGEventRef event_down = CGEventCreateKeyboardEvent(NULL, 0x09, true);
        if (!event_down) return false;
        CGEventSetFlags(event_down, kCGEventFlagMaskCommand);
        CGEventPost(kCGHIDEventTap, event_down);
        CFRelease(event_down);

        usleep(25000);

        CGEventRef event_up = CGEventCreateKeyboardEvent(NULL, 0x09, false);
        if (event_up) {
            CGEventSetFlags(event_up, kCGEventFlagMaskCommand);
            CGEventPost(kCGHIDEventTap, event_up);
            CFRelease(event_up);
        }

        return true;
    }
}

long get_system_pasteboard_change_count() {
    @autoreleasepool {
        return [[NSPasteboard generalPasteboard] changeCount];
    }
}

// Returns a base64-encoded thumbnail data URL for image on pasteboard, or NULL if none
char* get_pasteboard_image_as_base64() {
    @autoreleasepool {
        NSPasteboard *pb = [NSPasteboard generalPasteboard];
        NSData *data = nil;

        if ([[pb types] containsObject:NSPasteboardTypePNG]) {
            data = [pb dataForType:NSPasteboardTypePNG];
        } else if ([[pb types] containsObject:NSPasteboardTypeTIFF]) {
            data = [pb dataForType:NSPasteboardTypeTIFF];
        } else if ([[pb types] containsObject:NSFilenamesPboardType]) {
            NSArray *files = [pb propertyListForType:NSFilenamesPboardType];
            if (files && [files count] > 0) {
                NSString *first = [files firstObject];
                NSString *ext = [[first pathExtension] lowercaseString];
                if ([ext isEqualToString:@"png"] || [ext isEqualToString:@"jpg"] ||
                    [ext isEqualToString:@"jpeg"] || [ext isEqualToString:@"webp"] ||
                    [ext isEqualToString:@"gif"]) {
                    data = [NSData dataWithContentsOfFile:first];
                }
            }
        }

        if (!data || [data length] == 0) return NULL;

        NSImage *image = [[NSImage alloc] initWithData:data];
        if (!image) return NULL;

        NSSize originalSize = [image size];
        if (originalSize.width <= 0 || originalSize.height <= 0) return NULL;

        CGFloat maxDim = 400.0;
        CGFloat scale = 1.0;
        if (originalSize.width > maxDim || originalSize.height > maxDim) {
            scale = maxDim / MAX(originalSize.width, originalSize.height);
        }
        NSSize newSize = NSMakeSize(round(originalSize.width * scale), round(originalSize.height * scale));

        NSImage *thumbImage = [[NSImage alloc] initWithSize:newSize];
        [thumbImage lockFocus];
        [image drawInRect:NSMakeRect(0, 0, newSize.width, newSize.height)
                 fromRect:NSZeroRect
                operation:NSCompositingOperationCopy
                 fraction:1.0];
        [thumbImage unlockFocus];

        NSBitmapImageRep *rep = [[NSBitmapImageRep alloc] initWithData:[thumbImage TIFFRepresentation]];
        NSData *pngData = [rep representationUsingType:NSBitmapImageFileTypePNG properties:@{}];
        if (!pngData) return NULL;

        NSString *b64 = [pngData base64EncodedStringWithOptions:0];
        if (!b64) return NULL;

        NSString *dataUrl = [NSString stringWithFormat:@"data:image/png;base64,%@", b64];
        const char *cStr = [dataUrl UTF8String];
        return strdup(cStr);
    }
}

void free_c_string(char *s) {
    if (s) free(s);
}
