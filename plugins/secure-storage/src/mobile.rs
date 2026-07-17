use serde::de::DeserializeOwned;
use tauri::{
    plugin::{PluginApi, PluginHandle},
    AppHandle, Runtime,
};

use crate::models::*;

#[cfg(target_os = "ios")]
tauri::ios_plugin_binding!(init_plugin_secure_storage);

// initializes the Kotlin or Swift plugin classes
pub fn init<R: Runtime, C: DeserializeOwned>(
    _app: &AppHandle<R>,
    api: PluginApi<R, C>,
) -> crate::Result<SecureStorage<R>> {
    #[cfg(target_os = "android")]
    let handle =
        api.register_android_plugin("net.jcode.jtype.securestorage", "SecureStoragePlugin")?;
    #[cfg(target_os = "ios")]
    let handle = api.register_ios_plugin(init_plugin_secure_storage)?;
    Ok(SecureStorage(handle))
}

/// Access to the secure-storage APIs.
pub struct SecureStorage<R: Runtime>(PluginHandle<R>);

impl<R: Runtime> SecureStorage<R> {
    pub fn get_secret(&self, key: impl Into<String>) -> crate::Result<SecretResponse> {
        self.0
            .run_mobile_plugin("getSecret", SecretKeyRequest { key: key.into() })
            .map_err(Into::into)
    }

    pub fn set_secret(
        &self,
        key: impl Into<String>,
        value: impl Into<String>,
    ) -> crate::Result<SecretResponse> {
        self.0
            .run_mobile_plugin(
                "setSecret",
                SecretValueRequest {
                    key: key.into(),
                    value: value.into(),
                },
            )
            .map_err(Into::into)
    }

    pub fn delete_secret(&self, key: impl Into<String>) -> crate::Result<SecretResponse> {
        self.0
            .run_mobile_plugin("deleteSecret", SecretKeyRequest { key: key.into() })
            .map_err(Into::into)
    }
}
