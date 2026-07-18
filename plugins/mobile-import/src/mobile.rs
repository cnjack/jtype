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

    #[cfg(any(target_os = "android", target_os = "ios"))]
    pub fn select_directory(&self) -> crate::Result<SelectedDirectory> {
        self.0
            .run_mobile_plugin("selectDirectory", ())
            .map_err(Into::into)
    }

    #[cfg(any(target_os = "android", target_os = "ios"))]
    pub fn directory_access(
        &self,
        source_reference: impl Into<String>,
    ) -> crate::Result<DirectoryAccess> {
        self.0
            .run_mobile_plugin(
                "directoryAccess",
                DirectoryAccessRequest {
                    source_reference: source_reference.into(),
                },
            )
            .map_err(Into::into)
    }

    #[cfg(any(target_os = "android", target_os = "ios"))]
    pub fn release_directory_access(
        &self,
        source_reference: impl Into<String>,
    ) -> crate::Result<DirectoryPermissionRelease> {
        self.0
            .run_mobile_plugin(
                "releaseDirectoryAccess",
                DirectoryAccessRequest {
                    source_reference: source_reference.into(),
                },
            )
            .map_err(Into::into)
    }

    #[cfg(any(target_os = "android", target_os = "ios"))]
    pub fn mirror_directory(
        &self,
        source_reference: impl Into<String>,
        mirror_root_path: impl Into<String>,
    ) -> crate::Result<MirroredDirectory> {
        self.0
            .run_mobile_plugin(
                "mirrorDirectory",
                MirrorDirectoryRequest {
                    source_reference: source_reference.into(),
                    mirror_root_path: mirror_root_path.into(),
                },
            )
            .map_err(Into::into)
    }

    #[cfg(any(target_os = "android", target_os = "ios"))]
    pub fn apply_directory_change(
        &self,
        source_reference: impl Into<String>,
        mirror_root_path: impl Into<String>,
        relative_path: impl Into<String>,
        kind: DirectoryChangeKind,
    ) -> crate::Result<AppliedDirectoryChange> {
        self.0
            .run_mobile_plugin(
                "applyDirectoryChange",
                DirectoryChangeRequest {
                    source_reference: source_reference.into(),
                    mirror_root_path: mirror_root_path.into(),
                    relative_path: relative_path.into(),
                    kind,
                },
            )
            .map_err(Into::into)
    }

    #[cfg(target_os = "android")]
    pub fn configure_debug_directory_fault(
        &self,
        fail_after_operations: u64,
        kind: DebugDirectoryFaultKind,
    ) -> crate::Result<DebugDirectoryFaultConfiguration> {
        self.0
            .run_mobile_plugin(
                "configureDebugDirectoryFault",
                DebugDirectoryFaultRequest {
                    fail_after_operations,
                    kind,
                },
            )
            .map_err(Into::into)
    }
}
