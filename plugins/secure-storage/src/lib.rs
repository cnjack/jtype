use tauri::{
    plugin::{Builder, TauriPlugin},
    Manager, Runtime,
};

pub use models::*;

#[cfg(desktop)]
mod desktop;
#[cfg(mobile)]
mod mobile;

mod error;
mod models;

pub use error::{Error, Result};

#[cfg(desktop)]
use desktop::SecureStorage;
#[cfg(mobile)]
use mobile::SecureStorage;

/// Extensions to [`tauri::App`], [`tauri::AppHandle`] and [`tauri::Window`] to access the secure-storage APIs.
pub trait SecureStorageExt<R: Runtime> {
    fn secure_storage(&self) -> &SecureStorage<R>;
}

impl<R: Runtime, T: Manager<R>> crate::SecureStorageExt<R> for T {
    fn secure_storage(&self) -> &SecureStorage<R> {
        self.state::<SecureStorage<R>>().inner()
    }
}

/// Initializes the plugin.
pub fn init<R: Runtime>() -> TauriPlugin<R> {
    Builder::new("secure-storage")
        .setup(|app, api| {
            #[cfg(mobile)]
            let secure_storage = mobile::init(app, api)?;
            #[cfg(desktop)]
            let secure_storage = desktop::init(app, api)?;
            app.manage(secure_storage);
            Ok(())
        })
        .build()
}
