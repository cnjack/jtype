use serde::de::DeserializeOwned;
use tauri::{plugin::PluginApi, AppHandle, Runtime};

use crate::models::*;

pub fn init<R: Runtime, C: DeserializeOwned>(
    app: &AppHandle<R>,
    _api: PluginApi<R, C>,
) -> crate::Result<MobileInteraction<R>> {
    Ok(MobileInteraction(app.clone()))
}

pub struct MobileInteraction<R: Runtime>(AppHandle<R>);

impl<R: Runtime> MobileInteraction<R> {
    pub fn perform_haptic(&self, _style: HapticStyle) -> crate::Result<HapticResult> {
        let _ = &self.0;
        Err(crate::Error::Unsupported)
    }
}
