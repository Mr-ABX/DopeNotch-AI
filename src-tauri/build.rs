fn main() {
    #[cfg(target_os = "macos")]
    {
        println!("cargo:rerun-if-changed=src/color_sampler.m");
        cc::Build::new()
            .file("src/color_sampler.m")
            .flag("-fobjc-arc")
            .compile("color_sampler");
        println!("cargo:rustc-link-lib=framework=AppKit");
        println!("cargo:rustc-link-lib=framework=Foundation");
        println!("cargo:rustc-link-lib=framework=AVFoundation");
        println!("cargo:rustc-link-lib=framework=Vision");
    }

    tauri_build::build()
}
