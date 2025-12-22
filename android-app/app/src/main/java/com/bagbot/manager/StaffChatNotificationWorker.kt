package com.bagbot.manager

import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.os.Build
import android.util.Log
import androidx.core.app.NotificationCompat
import androidx.core.app.NotificationManagerCompat
import androidx.work.CoroutineWorker
import androidx.work.WorkerParameters
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext

/**
 * Worker pour vérifier les nouveaux messages du chat staff en arrière-plan
 * S'exécute périodiquement même quand l'app est fermée
 */
class StaffChatNotificationWorker(
    context: Context,
    params: WorkerParameters
) : CoroutineWorker(context, params) {
    
    private val TAG = "StaffChatWorker"
    private val CHANNEL_ID = "staff_chat_channel"
    private val PREFS_NAME = "bagbot_prefs"
    
    override suspend fun doWork(): Result = withContext(Dispatchers.IO) {
        try {
            Log.d(TAG, "Worker started - checking for new messages")
            
            // Récupérer les préférences
            val prefs = applicationContext.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
            val token = prefs.getString("jwt_token", null)
            val lastMessageId = prefs.getString("last_message_id", null)
            
            if (token == null) {
                Log.d(TAG, "No token found, skipping")
                return@withContext Result.success()
            }
            
            // Créer le canal de notification
            createNotificationChannel()
            
            // Récupérer les messages (simulé - à implémenter avec votre API)
            // Dans une vraie implémentation, vous appelleriez votre API ici
            // val api = ApiClient(prefs.getString("server_url", "http://88.174.155.230:33003") ?: "")
            // val response = api.getJson("/api/staff/chat/messages?room=global")
            
            // Pour l'instant, on retourne success
            // TODO: Implémenter l'appel API et la vérification des nouveaux messages
            
            Log.d(TAG, "Worker completed successfully")
            Result.success()
        } catch (e: Exception) {
            Log.e(TAG, "Worker error: ${e.message}", e)
            Result.retry()
        }
    }
    
    private fun createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val name = "Chat Staff"
            val descriptionText = "Notifications pour les nouveaux messages du chat staff"
            val importance = NotificationManager.IMPORTANCE_HIGH
            val channel = NotificationChannel(CHANNEL_ID, name, importance).apply {
                description = descriptionText
                enableVibration(true)
                enableLights(true)
            }
            
            val notificationManager = applicationContext.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
            notificationManager.createNotificationChannel(channel)
        }
    }
    
    private fun sendNotification(senderName: String, message: String) {
        try {
            val intent = Intent(applicationContext, MainActivity::class.java).apply {
                flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TASK
            }
            
            val pendingIntent = PendingIntent.getActivity(
                applicationContext,
                0,
                intent,
                PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT
            )
            
            val builder = NotificationCompat.Builder(applicationContext, CHANNEL_ID)
                .setSmallIcon(android.R.drawable.ic_dialog_email)
                .setContentTitle("💬 Chat Staff - $senderName")
                .setContentText(message)
                .setPriority(NotificationCompat.PRIORITY_HIGH)
                .setAutoCancel(true)
                .setContentIntent(pendingIntent)
                .setDefaults(NotificationCompat.DEFAULT_ALL)
            
            val notificationManager = NotificationManagerCompat.from(applicationContext)
            try {
                notificationManager.notify(System.currentTimeMillis().toInt(), builder.build())
                Log.d(TAG, "Notification sent successfully")
            } catch (e: SecurityException) {
                Log.e(TAG, "Permission notification refusée: ${e.message}")
            }
        } catch (e: Exception) {
            Log.e(TAG, "Erreur envoi notification: ${e.message}", e)
        }
    }
}
