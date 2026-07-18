use serde::de::DeserializeOwned;
use tauri::{
    plugin::{PluginApi, PluginHandle},
    AppHandle, Runtime,
};

use crate::models::*;

#[cfg(target_os = "ios")]
tauri::ios_plugin_binding!(init_plugin_mobile_interaction);

pub fn init<R: Runtime, C: DeserializeOwned>(
    _app: &AppHandle<R>,
    api: PluginApi<R, C>,
) -> crate::Result<MobileInteraction<R>> {
    #[cfg(target_os = "android")]
    let handle = api.register_android_plugin(
        "net.jcode.jtype.mobileinteraction",
        "MobileInteractionPlugin",
    )?;
    #[cfg(target_os = "ios")]
    let handle = api.register_ios_plugin(init_plugin_mobile_interaction)?;
    Ok(MobileInteraction(handle))
}

pub struct MobileInteraction<R: Runtime>(PluginHandle<R>);

impl<R: Runtime> MobileInteraction<R> {
    pub fn perform_haptic(&self, style: HapticStyle) -> crate::Result<HapticResult> {
        self.0
            .run_mobile_plugin("perform", HapticRequest { style })
            .map_err(Into::into)
    }
}
