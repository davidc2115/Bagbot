package com.bagbot.manager

import android.app.NotificationChannel
import android.app.NotificationManager
import android.content.Context
import android.net.Uri
import android.os.Build
import androidx.core.app.NotificationCompat
import androidx.core.app.NotificationManagerCompat

object StaffChatNotifications {
    const val CHANNEL_ID = "staff_chat_channel"

    // Shared prefs used by background worker + in-app chat screen
    const val PREFS_NAME = "bagbot_staff_chat_notifications"
    const val KEY_LAST_SEEN_MESSAGE_ID = "last_seen_message_id"

    // Use a stable ID so we can cancel/update it reliably.
    const val NOTIFICATION_ID = 2001

    fun createChannel(context: Context) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(
                CHANNEL_ID,
                "Chat Staff",
                NotificationManager.IMPORTANCE_HIGH
            ).apply {
                description = "Notifications pour les nouveaux messages du chat staff"
                enableVibration(true)
                enableLights(true)
            }
            val notificationManager =
                context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
            notificationManager.createNotificationChannel(channel)
        }
    }

    fun markSeen(context: Context, maxMessageId: Long) {
        context
            .getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
            .edit()
            .putLong(KEY_LAST_SEEN_MESSAGE_ID, maxMessageId)
            .apply()
    }

    fun cancel(context: Context) {
        NotificationManagerCompat.from(context).cancel(NOTIFICATION_ID)
    }

    fun buildDeepLink(room: String, maxId: Long): Uri {
        return Uri.parse("bagbot://staffchat?room=$room&seen=$maxId")
    }

    fun buildContentTitle(
        store: SettingsStore,
        userId: String,
        senderName: String,
        isMention: Boolean
    ): String {
        val base = store.getStaffChatNotificationTitle(userId)?.trim().orEmpty().ifBlank { "Chat Staff" }
        return if (isMention) "🔔 $base - $senderName" else "💬 $base - $senderName"
    }

    fun buildNotification(
        context: Context,
        title: String,
        text: String,
        isMention: Boolean,
        pendingIntent: android.app.PendingIntent
    ): android.app.Notification {
        return NotificationCompat.Builder(context, CHANNEL_ID)
            .setSmallIcon(android.R.drawable.ic_dialog_email)
            .setContentTitle(title)
            .setContentText(text)
            .setPriority(if (isMention) NotificationCompat.PRIORITY_MAX else NotificationCompat.PRIORITY_HIGH)
            .setAutoCancel(true)
            .setContentIntent(pendingIntent)
            .setCategory(NotificationCompat.CATEGORY_MESSAGE)
            .setDefaults(NotificationCompat.DEFAULT_ALL)
            .build()
    }
}

