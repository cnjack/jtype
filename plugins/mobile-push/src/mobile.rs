use serde::de::DeserializeOwned;
use tauri::{
    plugin::{PluginApi, PluginHandle},
    AppHandle, Runtime,
};

#[cfg(target_os = "ios")]
tauri::ios_plugin_binding!(init_plugin_mobile_push);

pub fn init<R: Runtime, C: DeserializeOwned>(
    _app: &AppHandle<R>,
    api: PluginApi<R, C>,
) -> crate::Result<MobilePush<R>> {
    #[cfg(target_os = "android")]
    let handle = api.register_android_plugin("net.jcode.jtype.mobilepush", "MobilePushPlugin")?;
    #[cfg(target_os = "ios")]
    let handle = api.register_ios_plugin(init_plugin_mobile_push)?;
    Ok(MobilePush(handle))
}

pub struct MobilePush<R: Runtime>(#[allow(dead_code)] PluginHandle<R>);
