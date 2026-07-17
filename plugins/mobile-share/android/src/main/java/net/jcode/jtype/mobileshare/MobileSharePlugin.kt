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
import java.util.concurrent.TimeUnit

class MobileShareFileProvider : FileProvider()

@InvokeArg
class ShareFileArgs {
    lateinit var filePath: String
    lateinit var mimeType: String
}

@TauriPlugin
class MobileSharePlugin(private val activity: Activity) : Plugin(activity) {
    @Command
    fun shareFile(invoke: Invoke) {
        val args = try {
            invoke.parseArgs(ShareFileArgs::class.java)
        } catch (error: Exception) {
            invoke.reject("Invalid file share request: ${error.message}")
            return
        }

        Thread {
            var shareDirectory: File? = null
            try {
                require(args.mimeType == "text/markdown" || args.mimeType == "application/pdf") {
                    "Unsupported shared file type"
                }
                val shareRoot = File(activity.cacheDir, "jtype-shares").canonicalFile
                clearExpiredShares(shareRoot)
                val sharedFile = File(args.filePath).canonicalFile
                val sharePrefix = "${shareRoot.path}${File.separator}"
                require(sharedFile.isFile && sharedFile.path.startsWith(sharePrefix)) {
                    "Shared files must come from the JType share cache"
                }
                shareDirectory = sharedFile.parentFile
                val uri = FileProvider.getUriForFile(
                    activity,
                    "${activity.packageName}.mobile-share.fileprovider",
                    sharedFile,
                )
                val sendIntent = Intent(Intent.ACTION_SEND).apply {
                    type = args.mimeType
                    putExtra(Intent.EXTRA_STREAM, uri)
                    clipData = ClipData.newRawUri(sharedFile.name, uri)
                    addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
                }

                activity.runOnUiThread {
                    try {
                        val chooserTitle = if (args.mimeType == "application/pdf") "Share PDF" else "Share Markdown"
                        val chooser = Intent.createChooser(sendIntent, chooserTitle).apply {
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
                invoke.reject("Unable to share file: ${error.message}")
            }
        }.start()
    }

    private fun clearExpiredShares(root: File) {
        val cutoff = System.currentTimeMillis() - TimeUnit.DAYS.toMillis(1)
        root.listFiles()?.filter { it.lastModified() < cutoff }?.forEach(File::deleteRecursively)
    }
}
