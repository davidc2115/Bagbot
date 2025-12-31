package com.bagbot.manager

import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.os.Build
import android.util.Log
import androidx.core.app.NotificationCompat
import androidx.core.app.NotificationManagerCompat
import androidx.work.Constraints
import androidx.work.CoroutineWorker
import androidx.work.ExistingPeriodicWorkPolicy
import androidx.work.ExistingWorkPolicy
import androidx.work.NetworkType
import androidx.work.OneTimeWorkRequestBuilder
import androidx.work.PeriodicWorkRequestBuilder
import androidx.work.WorkerParameters
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.jsonArray
import kotlinx.serialization.json.jsonObject
import java.io.IOException
import java.util.concurrent.TimeUnit

/**
 * Worker pour vérifier les nouveaux messages du chat staff en arrière-plan
 * S'exécute périodiquement même quand l'app est fermée
 */
class StaffChatNotificationWorker(
    context: Context,
    params: WorkerParameters
) : CoroutineWorker(context, params) {
    
    private val TAG = "StaffChatWorker"
    
    companion object {
        private const val UNIQUE_PERIODIC_NAME = "staff_chat_notifications_periodic"
        private const val UNIQUE_ONCE_NAME = "staff_chat_notifications_once"
        
        fun schedule(context: Context) {
            val constraints = Constraints.Builder()
                .setRequiredNetworkType(NetworkType.CONNECTED)
                .build()
            
            // Run ASAP once (useful after login)
            val once = OneTimeWorkRequestBuilder<StaffChatNotificationWorker>()
                .setConstraints(constraints)
                .build()
            
            androidx.work.WorkManager.getInstance(context).enqueueUniqueWork(
                UNIQUE_ONCE_NAME,
                ExistingWorkPolicy.REPLACE,
                once
            )
            
            // Then poll periodically (min 15 min on Android)
            val periodic = PeriodicWorkRequestBuilder<StaffChatNotificationWorker>(15, TimeUnit.MINUTES)
                .setConstraints(constraints)
                .build()
            
            androidx.work.WorkManager.getInstance(context).enqueueUniquePeriodicWork(
                UNIQUE_PERIODIC_NAME,
                ExistingPeriodicWorkPolicy.UPDATE,
                periodic
            )
        }
    }
    
    override suspend fun doWork(): Result = withContext(Dispatchers.IO) {
        try {
            Log.d(TAG, "Worker started - checking for new messages")
            
            // Init store (worker can run in a cold process)
            SettingsStore.init(applicationContext)
            val store = SettingsStore.getInstance()
            val api = ApiClient(store)
            val json = Json { ignoreUnknownKeys = true; coerceInputValues = true }
            
            // Token required
            val token = store.getToken()
            if (token.isNullOrBlank()) {
                Log.d(TAG, "No token found, skipping")
                return@withContext Result.success()
            }
            
            // Récupérer les préférences worker (pour dédup)
            val prefs = applicationContext.getSharedPreferences(StaffChatNotifications.PREFS_NAME, Context.MODE_PRIVATE)
            val lastSeenId = prefs.getLong(StaffChatNotifications.KEY_LAST_SEEN_MESSAGE_ID, 0L)
            
            // Créer le canal de notification
            StaffChatNotifications.createChannel(applicationContext)
            
            // Qui suis-je ? (pour filtrer ses propres messages + détecter ping)
            val meJson = api.getJson("/api/me")
            val meObj = json.parseToJsonElement(meJson).jsonObject
            val myUserId = meObj["userId"].safeStringOrEmpty()
            val myUsername = (meObj["username"]?.safeString() ?: "").trim()
            
            // Charger les messages globaux
            val response = api.getJson("/api/staff/chat/messages?room=global")
            val data = json.parseToJsonElement(response).jsonObject
            val msgs = data["messages"]?.jsonArray ?: kotlinx.serialization.json.JsonArray(emptyList())
            
            // Filtrer les nouveaux messages (id = Date.now().toString() côté backend)
            var maxId = lastSeenId
            var any = false
            var anyMention = false
            var lastSender = ""
            var lastMessage = ""
            var newCount = 0
            
            for (m in msgs) {
                val obj = m.jsonObject
                val idStr = obj["id"].safeStringOrEmpty()
                val idLong = idStr.toLongOrNull() ?: continue
                if (idLong <= lastSeenId) continue
                
                val userId = obj["userId"].safeStringOrEmpty()
                if (userId == myUserId) {
                    if (idLong > maxId) maxId = idLong
                    continue
                }
                
                val username = obj["username"].safeString() ?: "Inconnu"
                val message = obj["message"].safeStringOrEmpty()
                
                val mention = run {
                    val m = message.lowercase()
                    if (m.contains("@everyone") || m.contains("@here")) return@run true
                    if (myUsername.isBlank()) return@run false
                    m.contains("@${myUsername.lowercase()}")
                }

                any = true
                newCount += 1
                anyMention = anyMention || mention
                lastSender = username
                lastMessage = message
                if (idLong > maxId) maxId = idLong
            }
            
            if (maxId > lastSeenId) {
                prefs.edit().putLong(StaffChatNotifications.KEY_LAST_SEEN_MESSAGE_ID, maxId).apply()
            }

            if (any) {
                sendNotification(
                    myUserId = myUserId,
                    room = "global",
                    maxId = maxId,
                    senderName = lastSender,
                    message = if (newCount >= 2) "📩 $newCount nouveaux messages • $lastMessage" else lastMessage,
                    isMention = anyMention
                )
            }
            
            Log.d(TAG, "Worker completed successfully (new=$any, lastSeenId=$maxId)")
            
            Result.success()
        } catch (e: IOException) {
            // Si le serveur révoque le token (plus admin / token invalide),
            // on déconnecte et on stoppe le worker.
            val msg = e.message ?: ""
            if (msg.contains("HTTP 401") || msg.contains("HTTP 403") || msg.contains("NOT_ADMIN") || msg.contains("NOT_AUTHORIZED")) {
                try {
                    SettingsStore.init(applicationContext)
                    val store = SettingsStore.getInstance()
                    store.clearToken()
                } catch (_: Exception) {}
                try {
                    androidx.work.WorkManager.getInstance(applicationContext).cancelUniqueWork(UNIQUE_PERIODIC_NAME)
                    androidx.work.WorkManager.getInstance(applicationContext).cancelUniqueWork(UNIQUE_ONCE_NAME)
                } catch (_: Exception) {}
                return@withContext Result.success()
            }
            Log.e(TAG, "Worker IO error: ${e.message}", e)
            Result.retry()
        } catch (e: Exception) {
            Log.e(TAG, "Worker error: ${e.message}", e)
            Result.retry()
        }
    }
    
    private fun sendNotification(
        myUserId: String,
        room: String,
        maxId: Long,
        senderName: String,
        message: String,
        isMention: Boolean
    ) {
        try {
            val deepLink: Uri = StaffChatNotifications.buildDeepLink(room = room, maxId = maxId)
            val intent = Intent(Intent.ACTION_VIEW, deepLink, applicationContext, MainActivity::class.java).apply {
                flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TASK
            }
            
            val pendingIntent = PendingIntent.getActivity(
                applicationContext,
                0,
                intent,
                PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT
            )

            // Personalisation du titre (par utilisateur)
            SettingsStore.init(applicationContext)
            val store = SettingsStore.getInstance()
            val title = StaffChatNotifications.buildContentTitle(
                store = store,
                userId = myUserId,
                senderName = senderName,
                isMention = isMention
            )

            val notification = StaffChatNotifications.buildNotification(
                context = applicationContext,
                title = title,
                text = message,
                isMention = isMention,
                pendingIntent = pendingIntent
            )
            
            val notificationManager = NotificationManagerCompat.from(applicationContext)
            try {
                notificationManager.notify(StaffChatNotifications.NOTIFICATION_ID, notification)
                Log.d(TAG, "Notification sent successfully")
            } catch (e: SecurityException) {
                Log.e(TAG, "Permission notification refusée: ${e.message}")
            }
        } catch (e: Exception) {
            Log.e(TAG, "Erreur envoi notification: ${e.message}", e)
        }
    }
}
