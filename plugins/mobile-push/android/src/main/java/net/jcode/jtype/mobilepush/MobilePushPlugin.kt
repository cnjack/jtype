package net.jcode.jtype.mobilepush

import android.app.Activity
import android.Manifest
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.os.Build
import android.webkit.WebView
import app.tauri.PermissionState
import app.tauri.annotation.Command
import app.tauri.annotation.Permission
import app.tauri.annotation.PermissionCallback
import app.tauri.annotation.TauriPlugin
import app.tauri.plugin.Invoke
import app.tauri.plugin.JSObject
import app.tauri.plugin.Plugin
import com.google.firebase.FirebaseApp
import com.google.firebase.messaging.FirebaseMessaging
import java.lang.ref.WeakReference

@TauriPlugin(
  permissions = [
    Permission(
      strings = [Manifest.permission.POST_NOTIFICATIONS],
      alias = "notifications",
    ),
  ],
)
class MobilePushPlugin(private val activity: Activity) : Plugin(activity) {
  companion object {
    private const val PREFERENCES_NAME = "net.jcode.jtype.mobilepush"
    private const val PENDING_ROUTE_KEY = "pendingRoute"
    private const val PENDING_REFRESH_KEY = "pendingRefresh"
    private val refreshLock = Any()
    private var current = WeakReference<MobilePushPlugin>(null)

    internal fun emitRegistrationChanged(identifier: String) {
      current.get()?.completeRegistration(identifier)
    }

    internal fun recordRefresh(context: Context) {
      synchronized(refreshLock) {
        context.getSharedPreferences(PREFERENCES_NAME, Context.MODE_PRIVATE)
          .edit()
          .putBoolean(PENDING_REFRESH_KEY, true)
          .commit()
      }
      current.get()?.let { plugin ->
        plugin.activity.runOnUiThread {
          plugin.trigger("refreshRequested", JSObject().apply { put("pending", true) })
        }
      }
    }

    internal fun registrationPayload(identifier: String): JSObject = JSObject().apply {
      put("available", true)
      put("platform", "android")
      put("provider", "fcm")
      put("environment", "production")
      put("identifierKind", "fid")
      put("identifier", identifier)
    }

    internal fun unavailablePayload(reason: String): JSObject = JSObject().apply {
      put("available", false)
      put("platform", "android")
      put("provider", "fcm")
      put("environment", "production")
      put("reason", reason)
    }

    internal fun canonicalRoute(raw: String?): String? {
      if (raw.isNullOrBlank() || raw.length > 4096) return null
      val uri = runCatching { Uri.parse(raw) }.getOrNull() ?: return null
      val accepted = when (uri.scheme?.lowercase()) {
        "jtype" -> uri.host == "open" && uri.path == "/document"
        "https" -> uri.host == "jtype.nightc.com" && uri.path == "/open/document"
        else -> false
      }
      if (!accepted || uri.fragment != null || uri.userInfo != null || uri.port != -1) return null
      val names = uri.queryParameterNames
      if (names != setOf("workspaceId", "path")) return null
      val workspaceIds = uri.getQueryParameters("workspaceId")
      val paths = uri.getQueryParameters("path")
      if (workspaceIds.size != 1 || paths.size != 1 || workspaceIds[0].isBlank() || paths[0].isBlank()) return null
      return raw
    }
  }

  private var pendingRegistration: Invoke? = null

  override fun load(webView: WebView) {
    current = WeakReference(this)
    super.load(webView)
  }

  override fun onNewIntent(intent: Intent) {
    canonicalRoute(intent.dataString ?: intent.getStringExtra(JTypeFirebaseMessagingService.ROUTE_EXTRA))?.let { route ->
      activity.getSharedPreferences(PREFERENCES_NAME, Activity.MODE_PRIVATE)
        .edit()
        .putString(PENDING_ROUTE_KEY, route)
        .apply()
      trigger("notificationAction", JSObject().apply { put("routeUrl", route) })
    }
  }

  @Command
  fun registration(invoke: Invoke) {
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU &&
      getPermissionState("notifications") != PermissionState.GRANTED
    ) {
      requestPermissionForAlias("notifications", invoke, "notificationPermissionResult")
      return
    }
    startRegistration(invoke)
  }

  @PermissionCallback
  fun notificationPermissionResult(invoke: Invoke) {
    if (getPermissionState("notifications") != PermissionState.GRANTED) {
      invoke.resolve(unavailablePayload("notificationPermissionDenied"))
      return
    }
    startRegistration(invoke)
  }

  private fun startRegistration(invoke: Invoke) {
    if (pendingRegistration != null) {
      invoke.resolve(unavailablePayload("registrationInProgress"))
      return
    }
    val firebase = FirebaseApp.getApps(activity).firstOrNull() ?: FirebaseApp.initializeApp(activity)
    if (firebase == null) {
      invoke.resolve(unavailablePayload("missingFirebaseConfiguration"))
      return
    }
    pendingRegistration = invoke
    FirebaseMessaging.getInstance().register().addOnFailureListener {
      activity.runOnUiThread { resolveUnavailable("identifierUnavailable") }
    }
    activity.window.decorView.postDelayed({ resolveUnavailable("identifierUnavailable") }, 10_000)
  }

  private fun completeRegistration(identifier: String) {
    if (identifier.isBlank()) return
    activity.runOnUiThread {
      val payload = registrationPayload(identifier)
      pendingRegistration?.resolve(payload)
      pendingRegistration = null
      trigger("registrationChanged", payload)
    }
  }

  private fun resolveUnavailable(reason: String) {
    pendingRegistration?.resolve(unavailablePayload(reason))
    pendingRegistration = null
  }

  @Command
  fun takePendingRoute(invoke: Invoke) {
    val intent = activity.intent
    val preferences = activity.getSharedPreferences(PREFERENCES_NAME, Activity.MODE_PRIVATE)
    val route = canonicalRoute(preferences.getString(PENDING_ROUTE_KEY, null))
      ?: canonicalRoute(intent?.dataString ?: intent?.getStringExtra(JTypeFirebaseMessagingService.ROUTE_EXTRA))
    preferences.edit().remove(PENDING_ROUTE_KEY).apply()
    if (route != null) {
      intent?.data = null
      intent?.removeExtra(JTypeFirebaseMessagingService.ROUTE_EXTRA)
    }
    invoke.resolve(JSObject().apply { put("routeUrl", route) })
  }

  @Command
  fun takePendingRefresh(invoke: Invoke) {
    val preferences = activity.getSharedPreferences(PREFERENCES_NAME, Activity.MODE_PRIVATE)
    val pending = synchronized(refreshLock) {
      val value = preferences.getBoolean(PENDING_REFRESH_KEY, false)
      preferences.edit().remove(PENDING_REFRESH_KEY).commit()
      value
    }
    invoke.resolve(JSObject().apply { put("pending", pending) })
  }
}
