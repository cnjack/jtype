use serde::de::DeserializeOwned;
use tauri::{plugin::PluginApi, AppHandle, Runtime};

use crate::models::*;

pub fn init<R: Runtime, C: DeserializeOwned>(
    app: &AppHandle<R>,
    _api: PluginApi<R, C>,
) -> crate::Result<MobileImport<R>> {
    Ok(MobileImport(app.clone()))
}

pub struct MobileImport<R: Runtime>(AppHandle<R>);

impl<R: Runtime> MobileImport<R> {
    pub fn materialize(&self, _source: impl Into<String>) -> crate::Result<MaterializedFile> {
        Err(crate::Error::Unsupported)
    }
}
