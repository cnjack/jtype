use tauri::{
    plugin::{Builder, TauriPlugin},
    Manager, Runtime,
};

#[cfg(desktop)]
mod desktop;
#[cfg(mobile)]
mod mobile;

mod error;

pub use error::{Error, Result};

#[cfg(desktop)]
use desktop::MobilePush;
#[cfg(mobile)]
use mobile::MobilePush;

pub trait MobilePushExt<R: Runtime> {
    fn mobile_push(&self) -> &MobilePush<R>;
}

impl<R: Runtime, T: Manager<R>> MobilePushExt<R> for T {
    fn mobile_push(&self) -> &MobilePush<R> {
        self.state::<MobilePush<R>>().inner()
    }
}

pub fn init<R: Runtime>() -> TauriPlugin<R> {
    Builder::new("mobile-push")
        .setup(|app, api| {
            #[cfg(mobile)]
            let mobile_push = mobile::init(app, api)?;
            #[cfg(desktop)]
            let mobile_push = desktop::init(app, api)?;
            app.manage(mobile_push);
            Ok(())
        })
        .build()
}
