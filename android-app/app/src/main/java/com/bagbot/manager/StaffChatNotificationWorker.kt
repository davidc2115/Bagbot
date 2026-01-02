package com.bagbot.manager

import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.os.Build
import android.util.Log
import androidx.core.app.NotificationCompat
import androidx.work.CoroutineWorker
import androidx.work.WorkerParameters
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.jsonArray
import kotlinx.serialization.json.jsonObject
import kotlinx.serialization.json.jsonPrimitive

class StaffChatNotificationWorker(
    private val context: Context,
    params: WorkerParameters
) : CoroutineWorker(context, params) {

    companion object {
        private const val TAG = "StaffChatWorker"
        private const val CHANNEL_ID = "staff_chat_notifications"
        private const val CHANNEL_NAME = "Messages Staff"
        private const val NOTIFICATION_ID = 1001
        private const val PREFS_NAME = "staff_chat_prefs"
        private const val LAST_MESSAGE_ID_KEY = "last_message_id"
    }

    override suspend fun doWork(): Result {
        return withContext(Dispatchers.IO) {
            try {
                Log.d(TAG, "Checking for new staff messages...")
                
                // Créer le canal de notification
                createNotificationChannel()
                
                // Initialiser SettingsStore et vérifier le token
                SettingsStore.init(context)
                val settingsStore = SettingsStore
                val token = settingsStore.getToken()
                
                if (token == null) {
                    Log.d(TAG, "No auth token, skipping notification check")
                    return@withContext Result.success()
                }
                
                // Récupérer les messages
                val api = ApiClient(settingsStore)
                val response = api.getJson("/api/staff-chat/messages")
                val json = Json { ignoreUnknownKeys = true }
                val data = json.parseToJsonElement(response).jsonObject
                val messages = data["messages"]?.jsonArray ?: return@withContext Result.success()
                
                if (messages.isEmpty()) {
                    return@withContext Result.success()
                }
                
                // Récupérer le dernier message ID stocké
                val chatPrefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
                val lastMessageId = chatPrefs.getString(LAST_MESSAGE_ID_KEY, null)
                
                // Vérifier s'il y a de nouveaux messages
                val latestMessage = messages.first().jsonObject
                val latestMessageId = latestMessage["id"]?.jsonPrimitive?.content
                
                if (latestMessageId != null && latestMessageId != lastMessageId) {
                    // Nouveau message détecté
                    val username = latestMessage["username"]?.jsonPrimitive?.content ?: "Membre Staff"
                    val content = latestMessage["content"]?.jsonPrimitive?.content ?: "Nouveau message"
                    
                    // Sauvegarder le nouvel ID
                    chatPrefs.edit().putString(LAST_MESSAGE_ID_KEY, latestMessageId).apply()
                    
                    // Afficher la notification
                    showNotification(username, content)
                    
                    Log.d(TAG, "New staff message from $username")
                }
                
                Result.success()
            } catch (e: Exception) {
                Log.e(TAG, "Error checking staff messages", e)
                Result.failure()
            }
        }
    }

    private fun createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val importance = NotificationManager.IMPORTANCE_HIGH
            val channel = NotificationChannel(CHANNEL_ID, CHANNEL_NAME, importance).apply {
                description = "Notifications pour les messages du chat staff"
                enableVibration(true)
                enableLights(true)
            }
            val notificationManager = context.getSystemService(NotificationManager::class.java)
            notificationManager?.createNotificationChannel(channel)
        }
    }

    private fun showNotification(username: String, content: String) {
        val intent = Intent(context, MainActivity::class.java).apply {
            flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TASK
            putExtra("open_staff_chat", true)
        }
        
        val pendingIntent = PendingIntent.getActivity(
            context,
            0,
            intent,
            PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT
        )

        val notification = NotificationCompat.Builder(context, CHANNEL_ID)
            .setSmallIcon(android.R.drawable.ic_dialog_email)
            .setContentTitle("💬 $username")
            .setContentText(content)
            .setPriority(NotificationCompat.PRIORITY_HIGH)
            .setCategory(NotificationCompat.CATEGORY_MESSAGE)
            .setAutoCancel(true)
            .setContentIntent(pendingIntent)
            .setVibrate(longArrayOf(0, 500, 250, 500))
            .build()

        val notificationManager = context.getSystemService(NotificationManager::class.java)
        notificationManager?.notify(NOTIFICATION_ID, notification)
    }
}
