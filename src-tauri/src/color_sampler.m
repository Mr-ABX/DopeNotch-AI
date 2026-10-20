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
        pid_t myPid = [[NSRunningApplication currentApplication] processIdentifier];
        if (front && [front processIdentifier] != myPid) {
            g_previous_app = front;
        } else if (!g_previous_app || [g_previous_app isTerminated]) {
            // Fallback: look for the most recently active regular application
            NSArray<NSRunningApplication *> *apps = [[NSWorkspace sharedWorkspace] runningApplications];
            for (NSRunningApplication *app in apps) {
                if ([app activationPolicy] == NSApplicationActivationPolicyRegular &&
                    [app processIdentifier] != myPid &&
                    ![app isTerminated] &&
                    ![app isHidden]) {
                    g_previous_app = app;
                    break;
                }
            }
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

        // Yield focus to the recorded target application
        pid_t myPid = [[NSRunningApplication currentApplication] processIdentifier];
        NSRunningApplication *target = (g_previous_app && ![g_previous_app isTerminated] && [g_previous_app processIdentifier] != myPid) 
            ? g_previous_app 
            : nil;

        if (!target) {
            NSArray<NSRunningApplication *> *apps = [[NSWorkspace sharedWorkspace] runningApplications];
            for (NSRunningApplication *app in apps) {
                if ([app activationPolicy] == NSApplicationActivationPolicyRegular &&
                    [app processIdentifier] != myPid &&
                    ![app isTerminated] &&
                    ![app isHidden]) {
                    target = app;
                    break;
                }
            }
        }

        if (target) {
            [target activateWithOptions:NSApplicationActivateIgnoringOtherApps];
        }

        // Give the target app enough time to gain true OS focus before sending Cmd+V
        usleep(140000); // 140ms

        CGEventSourceRef source = CGEventSourceCreate(kCGEventSourceStateCombinedSessionState);

        CGEventRef event_down = CGEventCreateKeyboardEvent(source, 0x09, true); // 0x09 = ANSI 'v'
        if (event_down) {
            CGEventSetFlags(event_down, kCGEventFlagMaskCommand);
            CGEventPost(kCGHIDEventTap, event_down);
            CFRelease(event_down);
        }

        usleep(35000); // 35ms

        CGEventRef event_up = CGEventCreateKeyboardEvent(source, 0x09, false);
        if (event_up) {
            CGEventSetFlags(event_up, kCGEventFlagMaskCommand);
            CGEventPost(kCGHIDEventTap, event_up);
            CFRelease(event_up);
        }

        if (source) {
            CFRelease(source);
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

        // Yield focus to the recorded target application
        pid_t myPid = [[NSRunningApplication currentApplication] processIdentifier];
        NSRunningApplication *target = (g_previous_app && ![g_previous_app isTerminated] && [g_previous_app processIdentifier] != myPid) 
            ? g_previous_app 
            : nil;

        if (!target) {
            NSArray<NSRunningApplication *> *apps = [[NSWorkspace sharedWorkspace] runningApplications];
            for (NSRunningApplication *app in apps) {
                if ([app activationPolicy] == NSApplicationActivationPolicyRegular &&
                    [app processIdentifier] != myPid &&
                    ![app isTerminated] &&
                    ![app isHidden]) {
                    target = app;
                    break;
                }
            }
        }

        if (target) {
            [target activateWithOptions:NSApplicationActivateIgnoringOtherApps];
        }

        usleep(140000); // 140ms

        CGEventSourceRef source = CGEventSourceCreate(kCGEventSourceStateCombinedSessionState);

        CGEventRef event_down = CGEventCreateKeyboardEvent(source, 0x09, true);
        if (event_down) {
            CGEventSetFlags(event_down, kCGEventFlagMaskCommand);
            CGEventPost(kCGHIDEventTap, event_down);
            CFRelease(event_down);
        }

        usleep(35000); // 35ms

        CGEventRef event_up = CGEventCreateKeyboardEvent(source, 0x09, false);
        if (event_up) {
            CGEventSetFlags(event_up, kCGEventFlagMaskCommand);
            CGEventPost(kCGHIDEventTap, event_up);
            CFRelease(event_up);
        }

        if (source) {
            CFRelease(source);
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

#import <Vision/Vision.h>

char* perform_screen_ocr(void) {
    @autoreleasepool {
        NSString *tempPath = [NSTemporaryDirectory() stringByAppendingPathComponent:@"dopenotch_ocr_grab.png"];
        [[NSFileManager defaultManager] removeItemAtPath:tempPath error:nil];
        
        NSTask *task = [[NSTask alloc] init];
        [task setLaunchPath:@"/usr/sbin/screencapture"];
        [task setArguments:@[@"-i", tempPath]];
        [task launch];
        [task waitUntilExit];
        
        if (![[NSFileManager defaultManager] fileExistsAtPath:tempPath]) {
            return NULL;
        }
        
        NSImage *image = [[NSImage alloc] initWithContentsOfFile:tempPath];
        [[NSFileManager defaultManager] removeItemAtPath:tempPath error:nil];
        if (!image) return NULL;
        
        CGImageRef cgImage = [image CGImageForProposedRect:NULL context:NULL hints:NULL];
        if (!cgImage) return NULL;
        
        __block NSMutableString *extractedText = [NSMutableString string];
        
        VNRecognizeTextRequest *request = [[VNRecognizeTextRequest alloc] initWithCompletionHandler:^(VNRequest * _Nonnull req, NSError * _Nullable error) {
            if (error) return;
            for (VNRecognizedTextObservation *obs in req.results) {
                NSArray<VNRecognizedText *> *topCandidates = [obs topCandidates:1];
                if (topCandidates.count > 0) {
                    if (extractedText.length > 0) {
                        [extractedText appendString:@"\n"];
                    }
                    [extractedText appendString:topCandidates.firstObject.string];
                }
            }
        }];
        request.recognitionLevel = VNRequestTextRecognitionLevelAccurate;
        request.usesLanguageCorrection = YES;
        
        VNImageRequestHandler *handler = [[VNImageRequestHandler alloc] initWithCGImage:cgImage options:@{}];
        NSError *error = nil;
        [handler performRequests:@[request] error:&error];
        
        if (extractedText.length == 0) return NULL;
        
        return strdup([extractedText UTF8String]);
    }
}

char* check_grammar_native(const char *input_text) {
    @autoreleasepool {
        if (!input_text || strlen(input_text) == 0) return NULL;
        NSString *text = [NSString stringWithUTF8String:input_text];
        if (!text) return NULL;
        
        NSSpellChecker *checker = [NSSpellChecker sharedSpellChecker];
        NSInteger length = [text length];
        if (length == 0) return strdup("No text provided.");
        
        NSTextCheckingTypes types = NSTextCheckingTypeGrammar | NSTextCheckingTypeSpelling;
        NSArray<NSTextCheckingResult *> *results = [checker checkString:text
                                                                  range:NSMakeRange(0, length)
                                                                  types:types
                                                                options:nil
                                                 inSpellDocumentWithTag:0
                                                            orthography:nil
                                                              wordCount:nil];
        
        if (!results || results.count == 0) {
            return strdup("✨ Clean! No spelling or grammar issues detected.");
        }
        
        NSMutableArray *issues = [NSMutableArray array];
        for (NSTextCheckingResult *res in results) {
            NSString *snippet = [text substringWithRange:res.range];
            if (res.resultType == NSTextCheckingTypeGrammar) {
                NSString *desc = @"Grammar or style suggestion";
                if (res.grammarDetails && res.grammarDetails.count > 0) {
                    NSDictionary *det = res.grammarDetails.firstObject;
                    desc = det[@"NSGrammarUserDescription"] ?: desc;
                    NSArray *corr = det[@"NSGrammarCorrections"];
                    if (corr && corr.count > 0) {
                        desc = [desc stringByAppendingFormat:@" (Try: %@)", [corr componentsJoinedByString:@", "]];
                    }
                }
                [issues addObject:[NSString stringWithFormat:@"• \"%@\" — %@", snippet, desc]];
            } else if (res.resultType == NSTextCheckingTypeSpelling) {
                NSArray *guesses = [checker guessesForWordRange:res.range inString:text language:nil inSpellDocumentWithTag:0];
                NSString *corrStr = (guesses && guesses.count > 0) 
                    ? [NSString stringWithFormat:@"(Suggestions: %@)", [[guesses subarrayWithRange:NSMakeRange(0, MIN(guesses.count, (NSUInteger)3))] componentsJoinedByString:@", "]]
                    : @"";
                [issues addObject:[NSString stringWithFormat:@"• Spelling: \"%@\" %@", snippet, corrStr]];
            }
        }
        
        if (issues.count == 0) {
            return strdup("✨ Clean! No spelling or grammar issues detected.");
        }
        
        NSString *report = [issues componentsJoinedByString:@"\n"];
        return strdup([report UTF8String]);
    }
}

char* capture_screen_as_base64(void) {
    @autoreleasepool {
        NSString *tempPath = [NSTemporaryDirectory() stringByAppendingPathComponent:@"dopenotch_loupe_frame.jpg"];
        [[NSFileManager defaultManager] removeItemAtPath:tempPath error:nil];
        
        NSTask *task = [[NSTask alloc] init];
        [task setLaunchPath:@"/usr/sbin/screencapture"];
        [task setArguments:@[@"-x", @"-t", @"jpg", tempPath]];
        [task launch];
        [task waitUntilExit];
        
        NSData *data = [NSData dataWithContentsOfFile:tempPath];
        [[NSFileManager defaultManager] removeItemAtPath:tempPath error:nil];
        if (!data || [data length] == 0) return NULL;
        
        NSString *b64 = [data base64EncodedStringWithOptions:0];
        if (!b64) return NULL;
        
        NSString *dataUrl = [NSString stringWithFormat:@"data:image/jpeg;base64,%@", b64];
        return strdup([dataUrl UTF8String]);
    }
}

bool copy_file_path_to_pasteboard(const char* file_path) {
    if (!file_path) return false;
    @autoreleasepool {
        NSString *path = [NSString stringWithUTF8String:file_path];
        if (!path || ![[NSFileManager defaultManager] fileExistsAtPath:path]) {
            return false;
        }
        NSURL *fileUrl = [NSURL fileURLWithPath:path];
        if (!fileUrl) return false;
        
        NSPasteboard *pb = [NSPasteboard generalPasteboard];
        [pb clearContents];
        return [pb writeObjects:@[fileUrl]];
    }
}



