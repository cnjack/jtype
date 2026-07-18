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
use desktop::MobileInteraction;
#[cfg(mobile)]
use mobile::MobileInteraction;

pub trait MobileInteractionExt<R: Runtime> {
    fn mobile_interaction(&self) -> &MobileInteraction<R>;
}

impl<R: Runtime, T: Manager<R>> MobileInteractionExt<R> for T {
    fn mobile_interaction(&self) -> &MobileInteraction<R> {
        self.state::<MobileInteraction<R>>().inner()
    }
}

pub fn init<R: Runtime>() -> TauriPlugin<R> {
    Builder::new("mobile-interaction")
        .setup(|app, api| {
            #[cfg(mobile)]
            let mobile_interaction = mobile::init(app, api)?;
            #[cfg(desktop)]
            let mobile_interaction = desktop::init(app, api)?;
            app.manage(mobile_interaction);
            Ok(())
        })
        .build()
}
