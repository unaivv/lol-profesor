fn main() {
    // Embed .env variables at compile time so production builds have API keys baked in.
    // Runtime env vars always take precedence (dotenvy still runs first in dev).
    if let Ok(content) = std::fs::read_to_string("../.env") {
        for line in content.lines() {
            let line = line.trim();
            if line.is_empty() || line.starts_with('#') {
                continue;
            }
            if let Some((key, value)) = line.split_once('=') {
                println!("cargo:rustc-env={}={}", key.trim(), value.trim());
            }
        }
    }
    tauri_build::build()
}
