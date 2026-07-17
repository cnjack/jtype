use serde::de::DeserializeOwned;
use tauri::{
    plugin::{PluginApi, PluginHandle},
    AppHandle, Runtime,
};

use crate::models::*;

#[cfg(target_os = "ios")]
tauri::ios_plugin_binding!(init_plugin_mobile_import);

pub fn init<R: Runtime, C: DeserializeOwned>(
    _app: &AppHandle<R>,
    api: PluginApi<R, C>,
) -> crate::Result<MobileImport<R>> {
    #[cfg(target_os = "android")]
    let handle =
        api.register_android_plugin("net.jcode.jtype.mobileimport", "MobileImportPlugin")?;
    #[cfg(target_os = "ios")]
    let handle = api.register_ios_plugin(init_plugin_mobile_import)?;
    Ok(MobileImport(handle))
}

pub struct MobileImport<R: Runtime>(PluginHandle<R>);

impl<R: Runtime> MobileImport<R> {
    pub fn materialize(&self, source: impl Into<String>) -> crate::Result<MaterializedFile> {
        self.0
            .run_mobile_plugin(
                "materialize",
                MaterializeRequest {
                    source: source.into(),
                },
            )
            .map_err(Into::into)
    }
}
