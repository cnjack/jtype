//! Object storage for binary assets (images), behind the `object_store` trait.
//!
//! The S3-compatible backend (RustFS) is never exposed to clients directly —
//! every read is proxied by the web service (`/assets/...`). Backends:
//!   * `AmazonS3`        — production (RustFS / S3), when `JTYPED_STORAGE_ENDPOINT` is set
//!   * `LocalFileSystem` — local dev fallback
//!   * `InMemory`        — integration tests (`build_router` default)

use std::sync::{Arc, RwLock};

use bytes::Bytes;
use object_store::{path::Path as ObjPath, ObjectStore, PutPayload};

use crate::error::AppError;

/// Shared, cloneable handle to the active object store.
pub type DynStore = Arc<dyn ObjectStore>;

/// A hot-swappable object-store handle. The active backend can be replaced at
/// runtime (e.g. when an admin changes storage settings) without a restart:
/// readers clone the inner `DynStore` out under a brief read lock, so in-flight
/// requests keep the backend they started with and new requests see the swap.
pub type SharedStore = Arc<RwLock<DynStore>>;

/// Wrap a store in a hot-swappable handle.
pub fn shared(store: DynStore) -> SharedStore {
    Arc::new(RwLock::new(store))
}

/// Resolved object-storage configuration. Built by the `settings` layer from
/// (DB override → environment → default); this module only consumes it.
#[derive(Debug, Clone, Default)]
pub struct StorageConfig {
    /// S3-compatible endpoint. Empty selects the local filesystem backend.
    pub endpoint: String,
    pub bucket: String,
    pub access_key: String,
    pub secret_key: String,
    pub region: String,
    pub local_dir: String,
}

/// In-memory store — used by integration tests so they need no real S3.
pub fn in_memory() -> DynStore {
    Arc::new(object_store::memory::InMemory::new())
}

pub const DEFAULT_BUCKET: &str = "jtype-content";
pub const DEFAULT_REGION: &str = "us-east-1";
pub const DEFAULT_LOCAL_DIR: &str = "./.jtype-storage";

fn local_dir_or_default(cfg: &StorageConfig) -> String {
    if cfg.local_dir.trim().is_empty() {
        DEFAULT_LOCAL_DIR.to_string()
    } else {
        cfg.local_dir.clone()
    }
}

/// Build the storage backend from an explicit config, returning an error
/// instead of falling back. Used when applying admin settings so a broken
/// config is surfaced rather than silently downgraded.
pub fn try_build(cfg: &StorageConfig) -> Result<DynStore, String> {
    if !cfg.endpoint.trim().is_empty() {
        return build_s3(cfg).map_err(|e| format!("S3 backend init failed: {e}"));
    }
    let dir = local_dir_or_default(cfg);
    std::fs::create_dir_all(&dir)
        .map_err(|e| format!("cannot create local storage dir {dir}: {e}"))?;
    object_store::local::LocalFileSystem::new_with_prefix(&dir)
        .map(|s| Arc::new(s) as DynStore)
        .map_err(|e| format!("local storage backend failed: {e}"))
}

/// Build the storage backend from a config, falling back to local and then to
/// in-memory on failure. Used at startup, where the server must come up even if
/// a configured backend is unreachable.
pub fn from_config(cfg: &StorageConfig) -> DynStore {
    match try_build(cfg) {
        Ok(store) => {
            if cfg.endpoint.trim().is_empty() {
                println!(
                    "storage: using local filesystem backend at {}",
                    local_dir_or_default(cfg)
                );
            } else {
                println!("storage: using S3-compatible backend at {}", cfg.endpoint);
            }
            store
        }
        Err(e) => {
            eprintln!("storage: {e}; using in-memory");
            in_memory()
        }
    }
}

fn build_s3(cfg: &StorageConfig) -> Result<DynStore, object_store::Error> {
    let bucket = if cfg.bucket.trim().is_empty() {
        DEFAULT_BUCKET.to_string()
    } else {
        cfg.bucket.clone()
    };
    let region = if cfg.region.trim().is_empty() {
        DEFAULT_REGION.to_string()
    } else {
        cfg.region.clone()
    };
    let allow_http = cfg.endpoint.starts_with("http://");
    let store = object_store::aws::AmazonS3Builder::new()
        .with_endpoint(&cfg.endpoint)
        .with_bucket_name(bucket)
        .with_access_key_id(&cfg.access_key)
        .with_secret_access_key(&cfg.secret_key)
        .with_region(region)
        .with_allow_http(allow_http)
        // RustFS / MinIO need path-style addressing, not virtual-hosted.
        .with_virtual_hosted_style_request(false)
        .build()?;
    Ok(Arc::new(store))
}

/// Round-trip a tiny object to verify the backend is actually writable and
/// readable (credentials, bucket, permissions). Used before committing new
/// admin settings so a bad config is rejected instead of silently breaking
/// uploads.
pub async fn probe(store: &DynStore) -> Result<(), AppError> {
    let key = ".jtype-probe/connectivity-check";
    put(store, key, Bytes::from_static(b"ok")).await?;
    get(store, key).await?;
    delete(store, key).await?;
    Ok(())
}

// ── Thin async helpers over the trait ─────────────────────────────────────────

pub async fn put(store: &DynStore, key: &str, bytes: Bytes) -> Result<(), AppError> {
    store
        .put(&ObjPath::from(key), PutPayload::from(bytes))
        .await
        .map_err(|e| AppError::Server(format!("storage put failed: {e}")))?;
    Ok(())
}

pub async fn get(store: &DynStore, key: &str) -> Result<Bytes, AppError> {
    let res = store
        .get(&ObjPath::from(key))
        .await
        .map_err(|e| match e {
            object_store::Error::NotFound { .. } => AppError::NotFound,
            other => AppError::Server(format!("storage get failed: {other}")),
        })?;
    res.bytes()
        .await
        .map_err(|e| AppError::Server(format!("storage read failed: {e}")))
}

pub async fn delete(store: &DynStore, key: &str) -> Result<(), AppError> {
    match store.delete(&ObjPath::from(key)).await {
        Ok(()) => Ok(()),
        Err(object_store::Error::NotFound { .. }) => Ok(()),
        Err(e) => Err(AppError::Server(format!("storage delete failed: {e}"))),
    }
}

// ── Image type sniffing ───────────────────────────────────────────────────────

/// A recognised, allow-listed raster image type. SVG is intentionally excluded
/// (inline SVG can carry script — a same-origin XSS vector for published sites).
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct ImageKind {
    pub content_type: &'static str,
    pub ext: &'static str,
}

/// Detect an allow-listed image type from its magic bytes, ignoring any
/// client-supplied Content-Type. Returns `None` for anything else.
pub fn sniff_image(bytes: &[u8]) -> Option<ImageKind> {
    if bytes.len() < 12 {
        return None;
    }
    // PNG
    if bytes.starts_with(&[0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]) {
        return Some(ImageKind { content_type: "image/png", ext: "png" });
    }
    // JPEG
    if bytes.starts_with(&[0xFF, 0xD8, 0xFF]) {
        return Some(ImageKind { content_type: "image/jpeg", ext: "jpg" });
    }
    // GIF
    if bytes.starts_with(b"GIF87a") || bytes.starts_with(b"GIF89a") {
        return Some(ImageKind { content_type: "image/gif", ext: "gif" });
    }
    // WEBP: "RIFF"...."WEBP"
    if &bytes[0..4] == b"RIFF" && &bytes[8..12] == b"WEBP" {
        return Some(ImageKind { content_type: "image/webp", ext: "webp" });
    }
    // AVIF / HEIF-style: "....ftyp<brand>"
    if &bytes[4..8] == b"ftyp" {
        let brand = &bytes[8..12];
        if brand == b"avif" || brand == b"avis" {
            return Some(ImageKind { content_type: "image/avif", ext: "avif" });
        }
    }
    None
}

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn in_memory_round_trip() {
        let store = in_memory();
        let key = "assets/ws/abc.png";
        put(&store, key, Bytes::from_static(b"hello-bytes")).await.unwrap();
        let got = get(&store, key).await.unwrap();
        assert_eq!(&got[..], b"hello-bytes");
        delete(&store, key).await.unwrap();
        assert!(matches!(get(&store, key).await, Err(AppError::NotFound)));
        // delete of a missing key is a no-op
        delete(&store, key).await.unwrap();
    }

    #[test]
    fn sniff_known_types() {
        let mut png = vec![0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A];
        png.extend_from_slice(&[0; 8]);
        assert_eq!(sniff_image(&png).unwrap().content_type, "image/png");

        let mut jpg = vec![0xFF, 0xD8, 0xFF, 0xE0];
        jpg.extend_from_slice(&[0; 8]);
        assert_eq!(sniff_image(&jpg).unwrap().ext, "jpg");

        let mut webp = b"RIFF\0\0\0\0WEBPVP8 ".to_vec();
        webp.extend_from_slice(&[0; 4]);
        assert_eq!(sniff_image(&webp).unwrap().content_type, "image/webp");

        // GIF
        let mut gif = b"GIF89a".to_vec();
        gif.extend_from_slice(&[0; 8]);
        assert_eq!(sniff_image(&gif).unwrap().ext, "gif");

        // Not an image (e.g. an SVG or text) is rejected.
        assert!(sniff_image(b"<svg xmlns=\"http://www.w3.org/2000/svg\"></svg>").is_none());
        assert!(sniff_image(b"plain text content here").is_none());
        assert!(sniff_image(b"tiny").is_none());
    }
}
