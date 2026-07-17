package net.jcode.jtype.mobileshare

import android.app.Activity
import android.content.ClipData
import android.content.Intent
import androidx.core.content.FileProvider
import app.tauri.annotation.Command
import app.tauri.annotation.InvokeArg
import app.tauri.annotation.TauriPlugin
import app.tauri.plugin.Invoke
import app.tauri.plugin.JSObject
import app.tauri.plugin.Plugin
import java.io.File
import java.util.UUID
import java.util.concurrent.TimeUnit

class MobileShareFileProvider : FileProvider()

@InvokeArg
class ShareMarkdownArgs {
    lateinit var fileName: String
    lateinit var content: String
}

@TauriPlugin
class MobileSharePlugin(private val activity: Activity) : Plugin(activity) {
    @Command
    fun shareMarkdown(invoke: Invoke) {
        val args = try {
            invoke.parseArgs(ShareMarkdownArgs::class.java)
        } catch (error: Exception) {
            invoke.reject("Invalid Markdown share request: ${error.message}")
            return
        }

        Thread {
            var shareDirectory: File? = null
            try {
                val shareRoot = File(activity.cacheDir, "jtype-shares")
                clearExpiredShares(shareRoot)
                shareDirectory = File(shareRoot, UUID.randomUUID().toString())
                check(shareDirectory.mkdirs()) { "Could not create the share cache directory" }
                val sharedFile = File(shareDirectory, safeMarkdownName(args.fileName))
                sharedFile.writeText(args.content, Charsets.UTF_8)
                val uri = FileProvider.getUriForFile(
                    activity,
                    "${activity.packageName}.mobile-share.fileprovider",
                    sharedFile,
                )
                val sendIntent = Intent(Intent.ACTION_SEND).apply {
                    type = "text/markdown"
                    putExtra(Intent.EXTRA_STREAM, uri)
                    clipData = ClipData.newRawUri(sharedFile.name, uri)
                    addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
                }

                activity.runOnUiThread {
                    try {
                        val chooser = Intent.createChooser(sendIntent, "Share Markdown").apply {
                            putExtra(
                                Intent.EXTRA_EXCLUDE_COMPONENTS,
                                arrayOf(activity.componentName),
                            )
                        }
                        activity.startActivity(chooser)
                        invoke.resolve(JSObject().put("launched", true))
                    } catch (error: Exception) {
                        shareDirectory.deleteRecursively()
                        invoke.reject("Unable to open system sharing: ${error.message}")
                    }
                }
            } catch (error: Exception) {
                shareDirectory?.deleteRecursively()
                invoke.reject("Unable to share Markdown: ${error.message}")
            }
        }.start()
    }

    private fun clearExpiredShares(root: File) {
        val cutoff = System.currentTimeMillis() - TimeUnit.DAYS.toMillis(1)
        root.listFiles()?.filter { it.lastModified() < cutoff }?.forEach(File::deleteRecursively)
    }

    private fun safeMarkdownName(candidate: String): String {
        val leaf = candidate
            .substringAfterLast('/')
            .substringAfterLast('\\')
            .replace(Regex("[\\u0000-\\u001f]"), "_")
            .trim()
            .ifEmpty { "JType Note.md" }
        val safeLeaf = if (leaf == "." || leaf == "..") "JType Note.md" else leaf
        return if (safeLeaf.matches(Regex(".*\\.(md|markdown|mdown|mkd)$", RegexOption.IGNORE_CASE))) {
            safeLeaf
        } else {
            "$safeLeaf.md"
        }
    }
}
