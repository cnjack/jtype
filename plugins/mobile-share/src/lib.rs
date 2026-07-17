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
use desktop::MobileShare;
#[cfg(mobile)]
use mobile::MobileShare;

pub trait MobileShareExt<R: Runtime> {
    fn mobile_share(&self) -> &MobileShare<R>;
}

impl<R: Runtime, T: Manager<R>> MobileShareExt<R> for T {
    fn mobile_share(&self) -> &MobileShare<R> {
        self.state::<MobileShare<R>>().inner()
    }
}

pub fn init<R: Runtime>() -> TauriPlugin<R> {
    Builder::new("mobile-share")
        .setup(|app, api| {
            #[cfg(mobile)]
            let mobile_share = mobile::init(app, api)?;
            #[cfg(desktop)]
            let mobile_share = desktop::init(app, api)?;
            app.manage(mobile_share);
            Ok(())
        })
        .build()
}
