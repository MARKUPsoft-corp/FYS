#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
  tauri::Builder::default()
    .setup(|app| {
      // Plugin de logging
      if cfg!(debug_assertions) {
        app.handle().plugin(
          tauri_plugin_log::Builder::default()
            .level(log::LevelFilter::Info)
            .build(),
        )?;
      }
      
      // Plugins pour mobile
      #[cfg(mobile)]
      {
        app.handle().plugin(tauri_plugin_notification::init())?;
        app.handle().plugin(tauri_plugin_barcode_scanner::init())?;
        app.handle().plugin(tauri_plugin_biometric::init())?;
        app.handle().plugin(tauri_plugin_geolocation::init())?;
      }
      
      // Plugins pour desktop et mobile
      app.handle().plugin(tauri_plugin_fs::init())?;
      app.handle().plugin(tauri_plugin_http::init())?;
      app.handle().plugin(tauri_plugin_sql::Builder::default().build())?;
      
      Ok(())
    })
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}

