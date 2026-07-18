package net.jcode.jtype.mobileinteraction

import android.app.Activity
import android.os.Build
import android.util.Log
import android.view.HapticFeedbackConstants
import app.tauri.annotation.Command
import app.tauri.annotation.InvokeArg
import app.tauri.annotation.TauriPlugin
import app.tauri.plugin.Invoke
import app.tauri.plugin.JSObject
import app.tauri.plugin.Plugin

@InvokeArg
class HapticArgs {
    lateinit var style: String
}

@TauriPlugin
class MobileInteractionPlugin(private val activity: Activity) : Plugin(activity) {
    @Command
    fun perform(invoke: Invoke) {
        val args = try {
            invoke.parseArgs(HapticArgs::class.java)
        } catch (error: Exception) {
            invoke.reject("Invalid haptic request: ${error.message}")
            return
        }

        activity.runOnUiThread {
            val feedback = when (args.style) {
                "selection" -> HapticFeedbackConstants.CLOCK_TICK
                "impact" -> HapticFeedbackConstants.CONTEXT_CLICK
                "success" -> if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
                    HapticFeedbackConstants.CONFIRM
                } else {
                    HapticFeedbackConstants.KEYBOARD_TAP
                }
                "warning" -> if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
                    HapticFeedbackConstants.REJECT
                } else {
                    HapticFeedbackConstants.LONG_PRESS
                }
                else -> {
                    invoke.reject("Unsupported haptic style: ${args.style}")
                    return@runOnUiThread
                }
            }
            val performed = activity.window.decorView.performHapticFeedback(feedback)
            Log.d("JTypeHaptics", "style=${args.style} performed=$performed")
            invoke.resolve(JSObject().put("performed", performed))
        }
    }
}
