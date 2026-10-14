#import <AppKit/AppKit.h>
#import <Foundation/Foundation.h>
#import <AVFoundation/AVFoundation.h>

typedef void (*ColorCallback)(const char *hex_str, void *context);
typedef void (*PermissionCallback)(bool granted, void *context);

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
    Class captureClass = NSClassFromString(@"AVCaptureDevice");
    if (captureClass != nil) {
        AVAuthorizationStatus status = [AVCaptureDevice authorizationStatusForMediaType:AVMediaTypeAudio];
        // 0: NotDetermined, 1: Restricted, 2: Denied, 3: Authorized
        return (int)status;
    }
    return 3;
}

void request_mic_permission(PermissionCallback callback, void *context) {
    Class captureClass = NSClassFromString(@"AVCaptureDevice");
    if (captureClass != nil) {
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

