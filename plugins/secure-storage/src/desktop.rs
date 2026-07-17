use serde::de::DeserializeOwned;
use tauri::{plugin::PluginApi, AppHandle, Runtime};

use crate::models::*;

pub fn init<R: Runtime, C: DeserializeOwned>(
    app: &AppHandle<R>,
    _api: PluginApi<R, C>,
) -> crate::Result<SecureStorage<R>> {
    Ok(SecureStorage(app.clone()))
}

/// Access to the secure-storage APIs.
pub struct SecureStorage<R: Runtime>(AppHandle<R>);

impl<R: Runtime> SecureStorage<R> {
    pub fn get_secret(&self, _key: impl Into<String>) -> crate::Result<SecretResponse> {
        Err(crate::Error::Unsupported)
    }

    pub fn set_secret(
        &self,
        _key: impl Into<String>,
        _value: impl Into<String>,
    ) -> crate::Result<SecretResponse> {
        Err(crate::Error::Unsupported)
    }

    pub fn delete_secret(&self, _key: impl Into<String>) -> crate::Result<SecretResponse> {
        Err(crate::Error::Unsupported)
    }
}
