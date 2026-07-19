use serde::de::DeserializeOwned;
use tauri::{plugin::PluginApi, AppHandle, Runtime};

pub fn init<R: Runtime, C: DeserializeOwned>(
    app: &AppHandle<R>,
    _api: PluginApi<R, C>,
) -> crate::Result<MobilePush<R>> {
    Ok(MobilePush(app.clone()))
}

pub struct MobilePush<R: Runtime>(#[allow(dead_code)] AppHandle<R>);
