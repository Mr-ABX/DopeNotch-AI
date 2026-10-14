fn main() {
    #[cfg(target_os = "macos")]
    {
        cc::Build::new()
            .file("src/color_sampler.m")
            .flag("-fobjc-arc")
            .compile("color_sampler");
        println!("cargo:rustc-link-lib=framework=AppKit");
        println!("cargo:rustc-link-lib=framework=Foundation");
        println!("cargo:rustc-link-lib=framework=AVFoundation");
    }

    tauri_build::build()
}
