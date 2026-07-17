use serde::de::DeserializeOwned;
use tauri::{plugin::PluginApi, AppHandle, Runtime};

use crate::models::*;

pub fn init<R: Runtime, C: DeserializeOwned>(
    app: &AppHandle<R>,
    _api: PluginApi<R, C>,
) -> crate::Result<MobileShare<R>> {
    Ok(MobileShare(app.clone()))
}

pub struct MobileShare<R: Runtime>(AppHandle<R>);

impl<R: Runtime> MobileShare<R> {
    pub fn share_markdown(
        &self,
        _file_name: impl Into<String>,
        _content: impl Into<String>,
    ) -> crate::Result<ShareLaunch> {
        Err(crate::Error::Unsupported)
    }
}
