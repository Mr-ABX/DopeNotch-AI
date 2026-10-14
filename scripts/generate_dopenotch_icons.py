import os
import sys
import shutil
import subprocess
from PIL import Image, ImageDraw

def generate_icons():
    base_dir = os.path.dirname(os.path.abspath(__file__))
    murmur_dir = os.path.abspath(os.path.join(base_dir, ".."))
    landing_dir = os.path.abspath(os.path.join(murmur_dir, "..", "landing page"))
    src_logo = os.path.join(landing_dir, "public", "logo.png")
    icons_dir = os.path.join(murmur_dir, "src-tauri", "icons")

    print(f"Reading source logo from: {src_logo}")
    raw_img = Image.open(src_logo).convert("RGBA")

    # 1. Create master 1024x1024 icon with standard Apple macOS squircle framing
    # Target inner dimension is 860x860, leaving 82px margin on all sides.
    master_size = 1024
    inner_size = 860
    resized_logo = raw_img.resize((inner_size, inner_size), Image.Resampling.LANCZOS)
    master = Image.new("RGBA", (master_size, master_size), (0, 0, 0, 0))
    offset = (master_size - inner_size) // 2
    master.paste(resized_logo, (offset, offset), resized_logo)

    # 2. Build Apple .iconset directory
    iconset_dir = "/tmp/dopenotch_release.iconset"
    if os.path.exists(iconset_dir):
        shutil.rmtree(iconset_dir)
    os.makedirs(iconset_dir, exist_ok=True)

    iconset_specs = [
        ("icon_16x16.png", 16),
        ("icon_16x16@2x.png", 32),
        ("icon_32x32.png", 32),
        ("icon_32x32@2x.png", 64),
        ("icon_128x128.png", 128),
        ("icon_128x128@2x.png", 256),
        ("icon_256x256.png", 256),
        ("icon_256x256@2x.png", 512),
        ("icon_512x512.png", 512),
        ("icon_512x512@2x.png", 1024),
    ]

    for fname, dim in iconset_specs:
        scaled = master.resize((dim, dim), Image.Resampling.LANCZOS)
        scaled.save(os.path.join(iconset_dir, fname), "PNG")

    # Convert .iconset to .icns using macOS iconutil
    icns_dest = os.path.join(icons_dir, "icon.icns")
    res = subprocess.run(["iconutil", "-c", "icns", iconset_dir, "-o", icns_dest], capture_output=True, text=True)
    if res.returncode != 0:
        print(f"Error running iconutil: {res.stderr}")
        sys.exit(1)
    print(f"Generated {icns_dest} ({os.path.getsize(icns_dest)} bytes)")

    # 3. Generate individual PNGs required by Tauri
    png_specs = [
        ("32x32.png", 32),
        ("64x64.png", 64),
        ("128x128.png", 128),
        ("128x128@2x.png", 256),
        ("icon.png", 512),
        ("Square30x30Logo.png", 30),
        ("Square44x44Logo.png", 44),
        ("Square71x71Logo.png", 71),
        ("Square89x89Logo.png", 89),
        ("Square107x107Logo.png", 107),
        ("Square142x142Logo.png", 142),
        ("Square150x150Logo.png", 150),
        ("Square284x284Logo.png", 284),
        ("Square310x310Logo.png", 310),
        ("StoreLogo.png", 50),
    ]

    for fname, dim in png_specs:
        scaled = master.resize((dim, dim), Image.Resampling.LANCZOS)
        dest = os.path.join(icons_dir, fname)
        scaled.save(dest, "PNG")
        print(f"Generated {dest} ({dim}x{dim})")

    # 4. Generate multi-resolution Windows ICO
    ico_dest = os.path.join(icons_dir, "icon.ico")
    master.save(
        ico_dest,
        format="ICO",
        sizes=[(16, 16), (24, 24), (32, 32), (48, 48), (64, 64), (128, 128), (256, 256)]
    )
    print(f"Generated {ico_dest}")

    # 5. Generate Menu Bar / Tray Icons
    # Color tray icon: 64x64 crisp version of master
    tray_color = master.resize((64, 64), Image.Resampling.LANCZOS)
    tray_color.save(os.path.join(icons_dir, "tray.png"), "PNG")
    tray_color.save(os.path.join(icons_dir, "tray-icon.png"), "PNG")

    # Flat monochrome template tray icon:
    # High-contrast silhouette: notch pill + subtle outer squircle border or notch shape
    # Using the alpha mask of the resized logo to create pure white/black template
    tray_flat = Image.new("RGBA", (64, 64), (0, 0, 0, 0))
    draw = ImageDraw.Draw(tray_flat)
    # Draw sleek rounded notch pill in center (representing DopeNotch)
    # 64x64 canvas, notch pill from x=16 to 48, y=14 to 34 (height 20, radius 10)
    draw.rounded_rectangle([(14, 18), (50, 46)], radius=9, outline=(0, 0, 0, 255), width=3)
    # Inner dynamic notch bar
    draw.rounded_rectangle([(22, 24), (42, 32)], radius=4, fill=(0, 0, 0, 255))
    tray_flat.save(os.path.join(icons_dir, "tray-flat.png"), "PNG")
    print("Generated tray icons")

    # 6. Update frontend assets
    shutil.copyfile(src_logo, os.path.join(murmur_dir, "public", "logo.png"))
    shutil.copyfile(src_logo, os.path.join(murmur_dir, "src", "assets", "logo.png"))
    
    # Composite master onto dark backdrop for JPEG
    jpeg_bg = Image.new("RGB", (master_size, master_size), (22, 22, 24))
    jpeg_bg.paste(master, (0, 0), master)
    jpeg_bg.save(os.path.join(murmur_dir, "public", "logo.jpg"), "JPEG", quality=95)
    jpeg_bg.save(os.path.join(icons_dir, "source_icon.jpg"), "JPEG", quality=95)

    print("All icons successfully updated to official Amber DopeNotch branding!")

if __name__ == "__main__":
    generate_icons()
