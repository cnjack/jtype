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
use desktop::MobileImport;
#[cfg(mobile)]
use mobile::MobileImport;

pub trait MobileImportExt<R: Runtime> {
    fn mobile_import(&self) -> &MobileImport<R>;
}

impl<R: Runtime, T: Manager<R>> MobileImportExt<R> for T {
    fn mobile_import(&self) -> &MobileImport<R> {
        self.state::<MobileImport<R>>().inner()
    }
}

pub fn init<R: Runtime>() -> TauriPlugin<R> {
    Builder::new("mobile-import")
        .setup(|app, api| {
            #[cfg(mobile)]
            let mobile_import = mobile::init(app, api)?;
            #[cfg(desktop)]
            let mobile_import = desktop::init(app, api)?;
            app.manage(mobile_import);
            Ok(())
        })
        .build()
}
