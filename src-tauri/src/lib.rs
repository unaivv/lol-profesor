mod tray;
mod error;
mod config;
mod models;
mod db;
mod api;
mod commands;

use std::num::NonZeroUsize;
use lru::LruCache;
use tauri::Manager;

pub struct AppState {
    pub db: r2d2::Pool<r2d2_sqlite::SqliteConnectionManager>,
    pub riot_client: api::riot_client::RiotApiClient,
    pub groq_api_key: Option<String>,
    pub cache: tokio::sync::RwLock<LruCache<String, String>>,
    pub config: config::Config,
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    env_logger::init();

    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_notification::init())
        .setup(|app| {
            tray::setup_tray(app)?;

            // Dev: load .env from project root
            dotenvy::dotenv().ok();
            // Prod: load .env bundled as Tauri resource (Contents/Resources/.env)
            if let Ok(env_path) = app.path().resolve(".env", tauri::path::BaseDirectory::Resource) {
                dotenvy::from_path(&env_path).ok();
            }

            // Load config
            let config = config::Config::load();

            // Setup database
            let app_data_dir = app.path().app_data_dir()?;
            std::fs::create_dir_all(&app_data_dir)?;
            let db_path = app_data_dir.join("lol-professor.db");
            let db = db::setup_pool(&db_path).map_err(|e| {
                log::error!("Failed to setup database pool: {}", e);
                Box::new(std::io::Error::new(
                    std::io::ErrorKind::Other,
                    e.to_string(),
                )) as Box<dyn std::error::Error>
            })?;
            db::run_migrations(&db).map_err(|e| {
                log::error!("Failed to run database migrations: {}", e);
                Box::new(std::io::Error::new(
                    std::io::ErrorKind::Other,
                    e.to_string(),
                )) as Box<dyn std::error::Error>
            })?;

            // Setup clients
            let riot_client = api::riot_client::RiotApiClient::new(
                config.regional_url.clone(),
                config.global_url.clone(),
                config.riot_api_key.clone(),
            );
            let groq_api_key = config.groq_api_key.clone();

            // Setup LRU cache
            let lru_capacity = config.lru_capacity;
            let cache = tokio::sync::RwLock::new(LruCache::new(
                NonZeroUsize::new(lru_capacity).unwrap_or(NonZeroUsize::new(500).unwrap()),
            ));

            let state = AppState {
                db,
                riot_client,
                groq_api_key,
                cache,
                config,
            };
            app.manage(state);

            // On macOS use native decorations (traffic lights)
            #[cfg(target_os = "macos")]
            if let Some(window) = app.get_webview_window("main") {
                let _ = window.set_decorations(true);
            }

            // Hide to tray on close
            if let Some(window) = app.get_webview_window("main") {
                let window_clone = window.clone();
                window.on_window_event(move |event| {
                    if let tauri::WindowEvent::CloseRequested { api, .. } = event {
                        api.prevent_close();
                        let _ = window_clone.hide();
                    }
                });
            }

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::player::get_summoner,
            commands::player::get_comprehensive_player,
            commands::player::get_player_by_puuid,
            commands::matches::get_match_history,
            commands::matches::get_match_details,
            commands::matches::get_match_timeline,
            commands::stats::get_ranked_stats,
            commands::stats::get_mastery,
            commands::live::get_live_game,
            commands::analysis::analyze_match,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
