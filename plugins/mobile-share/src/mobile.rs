use serde::de::DeserializeOwned;
use tauri::{
    plugin::{PluginApi, PluginHandle},
    AppHandle, Runtime,
};

use crate::models::*;

#[cfg(target_os = "ios")]
tauri::ios_plugin_binding!(init_plugin_mobile_share);

pub fn init<R: Runtime, C: DeserializeOwned>(
    _app: &AppHandle<R>,
    api: PluginApi<R, C>,
) -> crate::Result<MobileShare<R>> {
    #[cfg(target_os = "android")]
    let handle = api.register_android_plugin("net.jcode.jtype.mobileshare", "MobileSharePlugin")?;
    #[cfg(target_os = "ios")]
    let handle = api.register_ios_plugin(init_plugin_mobile_share)?;
    Ok(MobileShare(handle))
}

pub struct MobileShare<R: Runtime>(PluginHandle<R>);

impl<R: Runtime> MobileShare<R> {
    pub fn share_file(
        &self,
        file_path: impl Into<String>,
        mime_type: impl Into<String>,
    ) -> crate::Result<ShareLaunch> {
        self.0
            .run_mobile_plugin(
                "shareFile",
                ShareFileRequest {
                    file_path: file_path.into(),
                    mime_type: mime_type.into(),
                },
            )
            .map_err(Into::into)
    }
}
