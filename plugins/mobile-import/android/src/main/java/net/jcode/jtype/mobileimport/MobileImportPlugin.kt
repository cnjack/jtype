package net.jcode.jtype.mobileimport

import android.app.Activity
import android.net.Uri
import android.provider.OpenableColumns
import app.tauri.annotation.Command
import app.tauri.annotation.InvokeArg
import app.tauri.annotation.TauriPlugin
import app.tauri.plugin.Invoke
import app.tauri.plugin.JSObject
import app.tauri.plugin.Plugin
import java.io.File
import java.io.InputStream
import java.util.UUID

@InvokeArg
class MaterializeArgs {
    lateinit var source: String
}

@TauriPlugin
class MobileImportPlugin(private val activity: Activity) : Plugin(activity) {
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

    private fun queryDisplayName(uri: Uri): String? {
        val projection = arrayOf(OpenableColumns.DISPLAY_NAME)
        return activity.contentResolver.query(uri, projection, null, null, null)?.use { cursor ->
            if (!cursor.moveToFirst()) return@use null
            val index = cursor.getColumnIndex(OpenableColumns.DISPLAY_NAME)
            if (index < 0) null else cursor.getString(index)
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
}
