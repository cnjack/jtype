package net.jcode.jtype.mobilepush

import android.Manifest
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Intent
import android.content.pm.PackageManager
import android.net.Uri
import android.os.Build
import androidx.core.app.NotificationCompat
import androidx.core.content.ContextCompat
import com.google.firebase.messaging.FirebaseMessagingService
import com.google.firebase.messaging.RemoteMessage

class JTypeFirebaseMessagingService : FirebaseMessagingService() {
  companion object {
    const val ROUTE_EXTRA = "net.jcode.jtype.push.ROUTE"
    private const val CHANNEL_ID = "jtype-collaboration"
    private const val NOTIFICATION_ID = 1_245_467_472
  }

  override fun onRegistered(installationId: String) {
    MobilePushPlugin.emitRegistrationChanged(installationId)
  }

  override fun onMessageReceived(message: RemoteMessage) {
    val route = MobilePushPlugin.canonicalRoute(message.data["routeUrl"]) ?: return
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU &&
      ContextCompat.checkSelfPermission(this, Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED
    ) return

    val launchIntent = packageManager.getLaunchIntentForPackage(packageName) ?: return
    launchIntent.action = Intent.ACTION_VIEW
    launchIntent.data = Uri.parse(route)
    launchIntent.putExtra(ROUTE_EXTRA, route)
    launchIntent.addFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP or Intent.FLAG_ACTIVITY_SINGLE_TOP)
    val pendingIntent = PendingIntent.getActivity(
      this,
      NOTIFICATION_ID,
      launchIntent,
      PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
    )

    val manager = getSystemService(NotificationManager::class.java)
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
      manager.createNotificationChannel(
        NotificationChannel(CHANNEL_ID, "Collaboration updates", NotificationManager.IMPORTANCE_DEFAULT).apply {
          description = "Changes to documents in connected cloud workspaces"
          enableVibration(true)
        },
      )
    }

    val title = message.data["title"]?.take(120)?.ifBlank { null } ?: "JType collaboration update"
    val body = message.data["body"]?.take(512)?.ifBlank { null } ?: "Open the changed document."
    val icon = applicationInfo.icon.takeIf { it != 0 } ?: android.R.drawable.ic_dialog_info
    val notification = NotificationCompat.Builder(this, CHANNEL_ID)
      .setSmallIcon(icon)
      .setContentTitle(title)
      .setContentText(body)
      .setStyle(NotificationCompat.BigTextStyle().bigText(body))
      .setAutoCancel(true)
      .setVisibility(NotificationCompat.VISIBILITY_PRIVATE)
      .setContentIntent(pendingIntent)
      .build()
    manager.notify(NOTIFICATION_ID, notification)
  }
}
