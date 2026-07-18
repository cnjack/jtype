package net.jcode.jtype

import android.content.res.Configuration
import android.os.Bundle
import android.webkit.WebView
import androidx.activity.enableEdgeToEdge
import kotlin.math.roundToInt

class MainActivity : TauriActivity() {
  private var appWebView: WebView? = null

  override fun onCreate(savedInstanceState: Bundle?) {
    enableEdgeToEdge()
    super.onCreate(savedInstanceState)
  }

  override fun onWebViewCreate(webView: WebView) {
    super.onWebViewCreate(webView)
    appWebView = webView
    applySystemFontScale(webView, resources.configuration)
  }

  override fun onConfigurationChanged(newConfig: Configuration) {
    super.onConfigurationChanged(newConfig)
    appWebView?.let { applySystemFontScale(it, newConfig) }
  }

  private fun applySystemFontScale(webView: WebView, configuration: Configuration) {
    // Android WebView does not automatically apply the user's system font
    // scale to CSS rem units. textZoom keeps the shared React layout and DOM
    // intact while allowing app chrome and document text to follow the system
    // accessibility setting. Only pathological vendor values are bounded.
    val scale = configuration.fontScale.coerceIn(0.85f, 2.0f)
    webView.settings.textZoom = (scale * 100f).roundToInt()
  }
}
