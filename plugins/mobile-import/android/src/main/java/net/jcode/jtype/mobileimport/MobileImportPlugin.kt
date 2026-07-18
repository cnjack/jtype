package net.jcode.jtype.mobileimport

import android.app.Activity
import android.content.pm.ApplicationInfo
import android.content.Intent
import android.net.Uri
import android.provider.DocumentsContract
import android.provider.DocumentsContract.Document
import android.provider.OpenableColumns
import android.webkit.MimeTypeMap
import androidx.activity.result.ActivityResult
import app.tauri.annotation.ActivityCallback
import app.tauri.annotation.Command
import app.tauri.annotation.InvokeArg
import app.tauri.annotation.TauriPlugin
import app.tauri.plugin.Invoke
import app.tauri.plugin.JSObject
import app.tauri.plugin.Plugin
import java.io.File
import java.io.InputStream
import java.util.Locale
import java.util.UUID

@InvokeArg
class MaterializeArgs {
    lateinit var source: String
}

@InvokeArg
class MirrorDirectoryArgs {
    lateinit var sourceReference: String
    lateinit var mirrorRootPath: String
}

@InvokeArg
class DirectoryAccessArgs {
    lateinit var sourceReference: String
}

@InvokeArg
class DirectoryChangeArgs {
    lateinit var sourceReference: String
    lateinit var mirrorRootPath: String
    lateinit var relativePath: String
    lateinit var kind: String
}

@InvokeArg
class DebugDirectoryFaultArgs {
    var failAfterOperations: Long = 0
    lateinit var kind: String
}

private data class DebugDirectoryFault(
    var remainingOperations: Long,
    val kind: String,
)

private data class DocumentNode(
    val documentId: String,
    val displayName: String,
    val mimeType: String,
    val flags: Int,
)

private data class MirrorStats(
    var files: Long = 0,
    var directories: Long = 0,
    var bytes: Long = 0,
    var latestModified: Long = 0,
    var entries: Long = 0,
)

@TauriPlugin
class MobileImportPlugin(private val activity: Activity) : Plugin(activity) {
    private var debugDirectoryFault: DebugDirectoryFault? = null

    @Command
    fun selectDirectory(invoke: Invoke) {
        try {
            val intent = Intent(Intent.ACTION_OPEN_DOCUMENT_TREE).apply {
                addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
                addFlags(Intent.FLAG_GRANT_WRITE_URI_PERMISSION)
                addFlags(Intent.FLAG_GRANT_PERSISTABLE_URI_PERMISSION)
                addFlags(Intent.FLAG_GRANT_PREFIX_URI_PERMISSION)
            }
            startActivityForResult(invoke, intent, "selectDirectoryResult")
        } catch (error: Exception) {
            invoke.reject("Unable to open the Android folder picker: ${error.message}")
        }
    }

    @ActivityCallback
    fun selectDirectoryResult(invoke: Invoke, result: ActivityResult) {
        try {
            if (result.resultCode == Activity.RESULT_CANCELED) {
                invoke.reject("Folder picker cancelled")
                return
            }
            check(result.resultCode == Activity.RESULT_OK) { "Folder picker failed" }
            val resultIntent = result.data ?: error("Folder picker returned no result")
            val treeUri = resultIntent.data ?: error("Folder picker returned no directory")
            check(treeUri.scheme == "content") { "The selected folder is not a document provider tree" }

            val grantFlags = resultIntent.flags and (
                Intent.FLAG_GRANT_READ_URI_PERMISSION or Intent.FLAG_GRANT_WRITE_URI_PERMISSION
            )
            check(grantFlags and Intent.FLAG_GRANT_READ_URI_PERMISSION != 0) {
                "The selected folder did not grant read access"
            }
            activity.contentResolver.takePersistableUriPermission(treeUri, grantFlags)

            val metadata = rootMetadata(treeUri)
            val persisted = activity.contentResolver.persistedUriPermissions
                .firstOrNull { it.uri == treeUri }
                ?: error("The folder permission was not persisted")
            val readOnly = isReadOnly(persisted.isWritePermission, metadata.second)

            invoke.resolve(
                JSObject()
                    .put("sourceReference", treeUri.toString())
                    .put("sourceIdentity", treeUri.toString())
                    .put("displayName", safeFileName(metadata.first))
                    .put("readOnly", readOnly),
            )
        } catch (error: Exception) {
            invoke.reject("Unable to retain access to the selected folder: ${error.message}")
        }
    }

    @Command
    fun directoryAccess(invoke: Invoke) {
        val args = try {
            invoke.parseArgs(DirectoryAccessArgs::class.java)
        } catch (error: Exception) {
            invoke.reject("Invalid external vault access request: ${error.message}")
            return
        }

        val treeUri = Uri.parse(args.sourceReference)
        if (treeUri.scheme != "content") {
            resolveDirectoryAccess(invoke, "error", true)
            return
        }
        val persisted = activity.contentResolver.persistedUriPermissions
            .firstOrNull { it.uri == treeUri && it.isReadPermission }
        if (persisted == null) {
            resolveDirectoryAccess(invoke, "authorizationRequired", true)
            return
        }

        try {
            val metadata = rootMetadataOrNull(treeUri)
            if (metadata == null) {
                resolveDirectoryAccess(invoke, "sourceUnavailable", true)
                return
            }
            resolveDirectoryAccess(
                invoke,
                "ready",
                isReadOnly(persisted.isWritePermission, metadata.second),
            )
        } catch (_: SecurityException) {
            resolveDirectoryAccess(invoke, "authorizationRequired", true)
        } catch (_: java.io.FileNotFoundException) {
            resolveDirectoryAccess(invoke, "sourceUnavailable", true)
        } catch (_: Exception) {
            resolveDirectoryAccess(invoke, "error", true)
        }
    }

    @Command
    fun releaseDirectoryAccess(invoke: Invoke) {
        val args = try {
            invoke.parseArgs(DirectoryAccessArgs::class.java)
        } catch (error: Exception) {
            invoke.reject("Invalid external vault release request: ${error.message}")
            return
        }

        try {
            val treeUri = Uri.parse(args.sourceReference)
            val persisted = activity.contentResolver.persistedUriPermissions
                .firstOrNull { it.uri == treeUri }
            if (persisted == null) {
                invoke.resolve(JSObject().put("released", false))
                return
            }
            var releaseFlags = 0
            if (persisted.isReadPermission) {
                releaseFlags = releaseFlags or Intent.FLAG_GRANT_READ_URI_PERMISSION
            }
            if (persisted.isWritePermission) {
                releaseFlags = releaseFlags or Intent.FLAG_GRANT_WRITE_URI_PERMISSION
            }
            activity.contentResolver.releasePersistableUriPermission(treeUri, releaseFlags)
            invoke.resolve(JSObject().put("released", true))
        } catch (error: Exception) {
            invoke.reject("Unable to release external vault access: ${error.message}")
        }
    }

    @Command
    fun mirrorDirectory(invoke: Invoke) {
        val args = try {
            invoke.parseArgs(MirrorDirectoryArgs::class.java)
        } catch (error: Exception) {
            invoke.reject("Invalid external vault request: ${error.message}")
            return
        }

        Thread {
            try {
                val treeUri = Uri.parse(args.sourceReference)
                check(treeUri.scheme == "content") { "External vault source must be a content URI" }
                val permission = activity.contentResolver.persistedUriPermissions
                    .firstOrNull { it.uri == treeUri }
                    ?: error("Authorization for the selected folder is no longer available")
                check(permission.isReadPermission) { "The selected folder is not readable" }

                val dataRoot = File(activity.applicationInfo.dataDir).canonicalFile
                val externalRoot = File(dataRoot, "vaults/external").canonicalFile
                val mirrorRoot = File(args.mirrorRootPath).canonicalFile
                check(mirrorRoot.path.startsWith(externalRoot.path + File.separator)) {
                    "External vault mirrors must stay in app-private storage"
                }
                check(!mirrorRoot.exists()) { "The external vault mirror already exists" }
                val parent = mirrorRoot.parentFile ?: error("The mirror path has no parent")
                check(parent.mkdirs() || parent.isDirectory) { "Could not create the mirror parent directory" }

                val stage = File(parent, ".${mirrorRoot.name}.importing-${UUID.randomUUID()}")
                val stats = try {
                    check(stage.mkdirs()) { "Could not create the mirror staging directory" }
                    MirrorStats().also { mirrorStats ->
                        copyChildren(
                            treeUri,
                            DocumentsContract.getTreeDocumentId(treeUri),
                            stage,
                            mirrorStats,
                            0,
                        )
                        check(stage.renameTo(mirrorRoot)) { "Could not activate the imported vault mirror" }
                    }
                } catch (error: Exception) {
                    stage.deleteRecursively()
                    throw error
                }

                val sourceRevision = "${stats.latestModified}:${stats.entries}:${stats.bytes}"
                invoke.resolve(
                    JSObject()
                        .put("files", stats.files)
                        .put("directories", stats.directories)
                        .put("bytes", stats.bytes)
                        .put("sourceRevision", sourceRevision),
                )
            } catch (error: Exception) {
                invoke.reject("Unable to import the selected vault: ${error.message}")
            }
        }.start()
    }

    @Command
    fun applyDirectoryChange(invoke: Invoke) {
        val args = try {
            invoke.parseArgs(DirectoryChangeArgs::class.java)
        } catch (error: Exception) {
            invoke.reject("Invalid external vault write-back request: ${error.message}")
            return
        }

        Thread {
            try {
                val treeUri = Uri.parse(args.sourceReference)
                check(treeUri.scheme == "content") { "External vault source must be a content URI" }
                val permission = activity.contentResolver.persistedUriPermissions
                    .firstOrNull { it.uri == treeUri }
                    ?: error("Authorization for the selected folder is no longer available")
                check(permission.isReadPermission && permission.isWritePermission) {
                    "The selected folder is not writable"
                }
                applyDebugDirectoryFaultIfNeeded(treeUri)

                val dataRoot = File(activity.applicationInfo.dataDir).canonicalFile
                val externalRoot = File(dataRoot, "vaults/external").canonicalFile
                val mirrorRoot = File(args.mirrorRootPath).canonicalFile
                check(mirrorRoot.path.startsWith(externalRoot.path + File.separator)) {
                    "External vault mirrors must stay in app-private storage"
                }
                check(mirrorRoot.isDirectory) { "The external vault mirror is unavailable" }

                val segments = validatedRelativeSegments(args.relativePath)
                val rootDocumentId = DocumentsContract.getTreeDocumentId(treeUri)
                val rootMetadata = rootMetadata(treeUri)
                val root = DocumentNode(
                    documentId = rootDocumentId,
                    displayName = rootMetadata.first,
                    mimeType = Document.MIME_TYPE_DIR,
                    flags = rootMetadata.second,
                )
                val result = when (args.kind) {
                    "upsertDirectory" -> {
                        val (_, created) = ensureDirectoryPath(treeUri, root, segments)
                        created to 0L
                    }
                    "upsertFile" -> {
                        val localFile = File(mirrorRoot, args.relativePath).canonicalFile
                        check(localFile.path.startsWith(mirrorRoot.path + File.separator)) {
                            "External vault write-back path escaped its mirror"
                        }
                        check(localFile.isFile) { "The mirror file is unavailable" }
                        val parentSegments = segments.dropLast(1)
                        val fileName = segments.last()
                        val (parent, _) = ensureDirectoryPath(treeUri, root, parentSegments)
                        val existing = findChild(treeUri, parent.documentId, fileName)
                        check(existing?.mimeType != Document.MIME_TYPE_DIR) {
                            "A source directory already exists at ${args.relativePath}"
                        }
                        val document = existing ?: createDocument(
                            treeUri,
                            parent,
                            mimeTypeFor(fileName),
                            fileName,
                        )
                        check(document.flags and Document.FLAG_SUPPORTS_WRITE != 0) {
                            "The source document is not writable: ${args.relativePath}"
                        }
                        val documentUri = documentUri(treeUri, document.documentId)
                        val bytes = localFile.inputStream().use { input ->
                            activity.contentResolver.openOutputStream(documentUri, "rwt").use { output ->
                                checkNotNull(output) { "The source document can not be opened for writing" }
                                input.copyTo(output)
                            }
                        }
                        true to bytes
                    }
                    "delete" -> {
                        val document = resolveDocumentPath(treeUri, root, segments)
                        if (document == null) {
                            false to 0L
                        } else {
                            check(document.flags and Document.FLAG_SUPPORTS_DELETE != 0) {
                                "The source document can not be deleted: ${args.relativePath}"
                            }
                            check(DocumentsContract.deleteDocument(
                                activity.contentResolver,
                                documentUri(treeUri, document.documentId),
                            )) { "The source document was not deleted: ${args.relativePath}" }
                            true to 0L
                        }
                    }
                    else -> error("Unsupported external vault write-back operation")
                }

                invoke.resolve(
                    JSObject()
                        .put("changed", result.first)
                        .put("bytes", result.second),
                )
            } catch (error: Exception) {
                invoke.reject("Unable to write back the external vault: ${error.message}")
            }
        }.start()
    }

    @Command
    fun configureDebugDirectoryFault(invoke: Invoke) {
        val args = try {
            invoke.parseArgs(DebugDirectoryFaultArgs::class.java)
        } catch (error: Exception) {
            invoke.reject("Invalid external vault debug fault request: ${error.message}")
            return
        }

        try {
            check(activity.applicationInfo.flags and ApplicationInfo.FLAG_DEBUGGABLE != 0) {
                "External vault fault injection is unavailable in release builds"
            }
            check(args.failAfterOperations >= 0) { "The debug fault operation count is invalid" }
            synchronized(this) {
                debugDirectoryFault = when (args.kind) {
                    "clear" -> null
                    "permissionRevoked", "diskFull" -> DebugDirectoryFault(
                        remainingOperations = args.failAfterOperations,
                        kind = args.kind,
                    )
                    else -> error("Unsupported external vault debug fault")
                }
            }
            invoke.resolve(JSObject().put("configured", args.kind != "clear"))
        } catch (error: Exception) {
            invoke.reject("Unable to configure the external vault debug fault: ${error.message}")
        }
    }

    @Command
    fun materialize(invoke: Invoke) {
        val args = try {
            invoke.parseArgs(MaterializeArgs::class.java)
        } catch (error: Exception) {
            invoke.reject("Invalid external file reference: ${error.message}")
            return
        }

        Thread {
            var importDirectory: File? = null
            try {
                val uri = Uri.parse(args.source)
                val displayName = when (uri.scheme?.lowercase()) {
                    "content" -> queryDisplayName(uri)
                    "file" -> uri.path?.let(::File)?.name
                    else -> File(args.source).name
                }
                val fileName = safeFileName(displayName)
                importDirectory = File(
                    activity.cacheDir,
                    "jtype-imports/${UUID.randomUUID()}",
                )
                check(importDirectory.mkdirs()) { "Could not create the import cache directory" }
                val target = File(importDirectory, fileName)

                openSource(uri, args.source).use { input ->
                    target.outputStream().use { output -> input.copyTo(output) }
                }

                invoke.resolve(JSObject().put("path", target.absolutePath))
            } catch (error: Exception) {
                importDirectory?.deleteRecursively()
                invoke.reject("Unable to import external file: ${error.message}")
            }
        }.start()
    }

    private fun openSource(uri: Uri, source: String): InputStream =
        when (uri.scheme?.lowercase()) {
            "content" -> activity.contentResolver.openInputStream(uri)
                ?: error("The selected content can not be opened")
            "file" -> File(uri.path ?: error("The selected file URL has no path")).inputStream()
            else -> File(source).inputStream()
        }

    private fun applyDebugDirectoryFaultIfNeeded(treeUri: Uri) {
        val fault = synchronized(this) {
            val configured = debugDirectoryFault ?: return
            if (configured.remainingOperations > 0) {
                configured.remainingOperations -= 1
                return
            }
            debugDirectoryFault = null
            configured
        }
        when (fault.kind) {
            "permissionRevoked" -> {
                val persisted = activity.contentResolver.persistedUriPermissions
                    .firstOrNull { it.uri == treeUri }
                if (persisted != null) {
                    var flags = 0
                    if (persisted.isReadPermission) {
                        flags = flags or Intent.FLAG_GRANT_READ_URI_PERMISSION
                    }
                    if (persisted.isWritePermission) {
                        flags = flags or Intent.FLAG_GRANT_WRITE_URI_PERMISSION
                    }
                    activity.contentResolver.releasePersistableUriPermission(treeUri, flags)
                }
                throw SecurityException("Persisted directory access was revoked by a debug fault")
            }
            "diskFull" -> throw java.io.IOException("No space left on device (debug fault)")
            else -> error("Unsupported external vault debug fault")
        }
    }

    private fun queryDisplayName(uri: Uri): String? {
        val projection = arrayOf(OpenableColumns.DISPLAY_NAME)
        return activity.contentResolver.query(uri, projection, null, null, null)?.use { cursor ->
            if (!cursor.moveToFirst()) return@use null
            val index = cursor.getColumnIndex(OpenableColumns.DISPLAY_NAME)
            if (index < 0) null else cursor.getString(index)
        }
    }

    private fun rootMetadata(treeUri: Uri): Pair<String, Int> =
        rootMetadataOrNull(treeUri) ?: error("The selected folder provider returned no metadata")

    private fun rootMetadataOrNull(treeUri: Uri): Pair<String, Int>? {
        val rootDocumentUri = DocumentsContract.buildDocumentUriUsingTree(
            treeUri,
            DocumentsContract.getTreeDocumentId(treeUri),
        )
        val projection = arrayOf(Document.COLUMN_DISPLAY_NAME, Document.COLUMN_FLAGS)
        return activity.contentResolver.query(rootDocumentUri, projection, null, null, null)?.use { cursor ->
            if (!cursor.moveToFirst()) return@use null
            val nameIndex = cursor.getColumnIndex(Document.COLUMN_DISPLAY_NAME)
            val flagsIndex = cursor.getColumnIndex(Document.COLUMN_FLAGS)
            val fallbackName = DocumentsContract.getTreeDocumentId(treeUri)
                .substringAfterLast(':')
                .substringAfterLast('/')
                .ifBlank { "External vault" }
            val name = if (nameIndex >= 0 && !cursor.isNull(nameIndex)) cursor.getString(nameIndex) else fallbackName
            val flags = if (flagsIndex >= 0 && !cursor.isNull(flagsIndex)) cursor.getInt(flagsIndex) else 0
            name to flags
        }
    }

    private fun isReadOnly(hasPersistedWritePermission: Boolean, documentFlags: Int): Boolean {
        val rootSupportsWrite = documentFlags and (
            Document.FLAG_DIR_SUPPORTS_CREATE or Document.FLAG_SUPPORTS_WRITE
        ) != 0
        return !hasPersistedWritePermission || !rootSupportsWrite
    }

    private fun resolveDirectoryAccess(invoke: Invoke, state: String, readOnly: Boolean) {
        invoke.resolve(
            JSObject()
                .put("state", state)
                .put("readOnly", readOnly),
        )
    }

    private fun validatedRelativeSegments(relativePath: String): List<String> {
        check(relativePath.isNotBlank()) { "External vault write-back path is empty" }
        check(!relativePath.contains('\\')) { "External vault write-back path is invalid" }
        val segments = relativePath.split('/')
        check(segments.size <= MAX_DEPTH + 1) { "External vault write-back path is too deep" }
        for (segment in segments) {
            check(segment.isNotBlank() && segment != "." && segment != "..") {
                "External vault write-back path is invalid"
            }
            check(safeFileName(segment) == segment) { "External vault write-back name is unsafe" }
            check(segment.lowercase(Locale.ROOT) !in RESERVED_DIRECTORIES) {
                "Reserved directories can not be written back"
            }
        }
        return segments
    }

    private fun ensureDirectoryPath(
        treeUri: Uri,
        root: DocumentNode,
        segments: List<String>,
    ): Pair<DocumentNode, Boolean> {
        var current = root
        var finalCreated = false
        for ((index, segment) in segments.withIndex()) {
            val existing = findChild(treeUri, current.documentId, segment)
            if (existing != null) {
                check(existing.mimeType == Document.MIME_TYPE_DIR) {
                    "A source file blocks directory ${segments.take(index + 1).joinToString("/")}"
                }
                current = existing
                continue
            }
            current = createDocument(
                treeUri,
                current,
                Document.MIME_TYPE_DIR,
                segment,
            )
            finalCreated = index == segments.lastIndex
        }
        return current to finalCreated
    }

    private fun resolveDocumentPath(
        treeUri: Uri,
        root: DocumentNode,
        segments: List<String>,
    ): DocumentNode? {
        var current = root
        for ((index, segment) in segments.withIndex()) {
            val child = findChild(treeUri, current.documentId, segment) ?: return null
            if (index < segments.lastIndex && child.mimeType != Document.MIME_TYPE_DIR) return null
            current = child
        }
        return current
    }

    private fun findChild(treeUri: Uri, parentDocumentId: String, name: String): DocumentNode? {
        val childrenUri = DocumentsContract.buildChildDocumentsUriUsingTree(treeUri, parentDocumentId)
        val projection = arrayOf(
            Document.COLUMN_DOCUMENT_ID,
            Document.COLUMN_DISPLAY_NAME,
            Document.COLUMN_MIME_TYPE,
            Document.COLUMN_FLAGS,
        )
        val cursor = activity.contentResolver.query(childrenUri, projection, null, null, null)
            ?: error("The source directory can not be enumerated")
        return cursor.use {
            val idIndex = it.getColumnIndexOrThrow(Document.COLUMN_DOCUMENT_ID)
            val nameIndex = it.getColumnIndexOrThrow(Document.COLUMN_DISPLAY_NAME)
            val mimeIndex = it.getColumnIndexOrThrow(Document.COLUMN_MIME_TYPE)
            val flagsIndex = it.getColumnIndex(Document.COLUMN_FLAGS)
            var match: DocumentNode? = null
            while (it.moveToNext()) {
                if (it.getString(nameIndex) != name) continue
                check(match == null) { "The source contains duplicate entry names" }
                match = DocumentNode(
                    documentId = it.getString(idIndex),
                    displayName = name,
                    mimeType = it.getString(mimeIndex),
                    flags = if (flagsIndex >= 0 && !it.isNull(flagsIndex)) it.getInt(flagsIndex) else 0,
                )
            }
            match
        }
    }

    private fun createDocument(
        treeUri: Uri,
        parent: DocumentNode,
        mimeType: String,
        name: String,
    ): DocumentNode {
        check(parent.mimeType == Document.MIME_TYPE_DIR) { "The source parent is not a directory" }
        check(parent.flags and Document.FLAG_DIR_SUPPORTS_CREATE != 0) {
            "The source directory does not support create"
        }
        val createdUri = DocumentsContract.createDocument(
            activity.contentResolver,
            documentUri(treeUri, parent.documentId),
            mimeType,
            name,
        ) ?: error("The source document was not created")
        return queryDocument(createdUri) ?: error("The created source document returned no metadata")
    }

    private fun queryDocument(uri: Uri): DocumentNode? {
        val projection = arrayOf(
            Document.COLUMN_DOCUMENT_ID,
            Document.COLUMN_DISPLAY_NAME,
            Document.COLUMN_MIME_TYPE,
            Document.COLUMN_FLAGS,
        )
        return activity.contentResolver.query(uri, projection, null, null, null)?.use { cursor ->
            if (!cursor.moveToFirst()) return@use null
            val idIndex = cursor.getColumnIndexOrThrow(Document.COLUMN_DOCUMENT_ID)
            val nameIndex = cursor.getColumnIndexOrThrow(Document.COLUMN_DISPLAY_NAME)
            val mimeIndex = cursor.getColumnIndexOrThrow(Document.COLUMN_MIME_TYPE)
            val flagsIndex = cursor.getColumnIndex(Document.COLUMN_FLAGS)
            DocumentNode(
                documentId = cursor.getString(idIndex),
                displayName = cursor.getString(nameIndex),
                mimeType = cursor.getString(mimeIndex),
                flags = if (flagsIndex >= 0 && !cursor.isNull(flagsIndex)) cursor.getInt(flagsIndex) else 0,
            )
        }
    }

    private fun documentUri(treeUri: Uri, documentId: String): Uri =
        DocumentsContract.buildDocumentUriUsingTree(treeUri, documentId)

    private fun mimeTypeFor(name: String): String {
        val extension = name.substringAfterLast('.', "").lowercase(Locale.ROOT)
        if (extension == "md" || extension == "markdown") return "text/markdown"
        return MimeTypeMap.getSingleton().getMimeTypeFromExtension(extension)
            ?: "application/octet-stream"
    }

    private fun copyChildren(
        treeUri: Uri,
        parentDocumentId: String,
        targetDirectory: File,
        stats: MirrorStats,
        depth: Int,
    ) {
        check(depth <= MAX_DEPTH) { "The selected vault exceeds the maximum folder depth" }
        val childrenUri = DocumentsContract.buildChildDocumentsUriUsingTree(treeUri, parentDocumentId)
        val projection = arrayOf(
            Document.COLUMN_DOCUMENT_ID,
            Document.COLUMN_DISPLAY_NAME,
            Document.COLUMN_MIME_TYPE,
            Document.COLUMN_LAST_MODIFIED,
            Document.COLUMN_SIZE,
            Document.COLUMN_FLAGS,
        )
        val children = mutableListOf<Array<Any?>>()
        activity.contentResolver.query(childrenUri, projection, null, null, null)?.use { cursor ->
            val idIndex = cursor.getColumnIndexOrThrow(Document.COLUMN_DOCUMENT_ID)
            val nameIndex = cursor.getColumnIndexOrThrow(Document.COLUMN_DISPLAY_NAME)
            val mimeIndex = cursor.getColumnIndexOrThrow(Document.COLUMN_MIME_TYPE)
            val modifiedIndex = cursor.getColumnIndex(Document.COLUMN_LAST_MODIFIED)
            val sizeIndex = cursor.getColumnIndex(Document.COLUMN_SIZE)
            val flagsIndex = cursor.getColumnIndex(Document.COLUMN_FLAGS)
            while (cursor.moveToNext()) {
                check(stats.entries + children.size.toLong() < MAX_ENTRIES) {
                    "The selected vault contains too many entries"
                }
                children += arrayOf(
                    cursor.getString(idIndex),
                    cursor.getString(nameIndex),
                    cursor.getString(mimeIndex),
                    if (modifiedIndex >= 0 && !cursor.isNull(modifiedIndex)) cursor.getLong(modifiedIndex) else 0L,
                    if (sizeIndex >= 0 && !cursor.isNull(sizeIndex)) cursor.getLong(sizeIndex) else 0L,
                    if (flagsIndex >= 0 && !cursor.isNull(flagsIndex)) cursor.getInt(flagsIndex) else 0,
                )
            }
        } ?: error("The selected folder can not be enumerated")

        val names = mutableSetOf<String>()
        for (child in children) {
            stats.entries += 1
            check(stats.entries <= MAX_ENTRIES) { "The selected vault contains too many entries" }
            val documentId = child[0] as String
            val name = safeFileName(child[1] as String?)
            val mimeType = child[2] as String
            val lastModified = child[3] as Long
            val flags = child[5] as Int
            check(names.add(name)) { "The selected folder contains duplicate file names" }
            stats.latestModified = maxOf(stats.latestModified, lastModified)

            if (mimeType == Document.MIME_TYPE_DIR) {
                if (name.lowercase(Locale.ROOT) in RESERVED_DIRECTORIES) continue
                val childTarget = File(targetDirectory, name)
                check(childTarget.mkdir()) { "Could not create mirror folder $name" }
                stats.directories += 1
                copyChildren(treeUri, documentId, childTarget, stats, depth + 1)
                continue
            }

            check(flags and Document.FLAG_VIRTUAL_DOCUMENT == 0) {
                "Virtual document $name can not be mirrored"
            }
            val documentUri = DocumentsContract.buildDocumentUriUsingTree(treeUri, documentId)
            val target = File(targetDirectory, name)
            var copiedBytes = 0L
            activity.contentResolver.openInputStream(documentUri).use { input ->
                checkNotNull(input) { "Document $name can not be opened" }
                target.outputStream().use { output ->
                    copiedBytes = input.copyTo(output)
                }
            }
            if (lastModified > 0) target.setLastModified(lastModified)
            stats.files += 1
            stats.bytes += copiedBytes
        }
    }

    private fun safeFileName(candidate: String?): String {
        val leaf = candidate
            ?.substringAfterLast('/')
            ?.substringAfterLast('\\')
            ?.replace(Regex("[\\u0000-\\u001f]"), "_")
            ?.trim()
            .orEmpty()
        return if (leaf.isEmpty() || leaf == "." || leaf == "..") "imported-file" else leaf
    }

    companion object {
        private const val MAX_DEPTH = 64
        private const val MAX_ENTRIES = 50_000L
        private val RESERVED_DIRECTORIES = setOf(".jtype", ".git", "node_modules", "target")
    }
}
