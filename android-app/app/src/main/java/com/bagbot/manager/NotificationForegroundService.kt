package com.bagbot.manager

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.Context
import android.content.Intent
import android.os.Build
import android.os.Handler
import android.os.IBinder
import android.os.Looper
import android.os.PowerManager
import android.util.Log
import androidx.core.app.NotificationCompat
import androidx.core.app.NotificationManagerCompat
import kotlinx.coroutines.*
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.jsonArray
import kotlinx.serialization.json.jsonObject
import java.io.IOException

/**
 * Service de premier plan pour vérifier les messages du chat staff
 * Permet des vérifications plus fréquentes que WorkManager (toutes les 2 minutes)
 */
class NotificationForegroundService : Service() {
    
    private val TAG = "NotifForegroundService"
    private val SERVICE_CHANNEL_ID = "notification_service_channel"
    private val CHAT_CHANNEL_ID = "staff_chat_channel"
    private val NOTIFICATION_ID = 1001
    private val CHECK_INTERVAL_MS = 2 * 60 * 1000L // 2 minutes
    private val PREFS_NAME = "bagbot_staff_chat_notifications"
    
    private var serviceJob: Job? = null
    private val serviceScope = CoroutineScope(Dispatchers.IO + SupervisorJob())
    private var wakeLock: PowerManager.WakeLock? = null
    private val handler = Handler(Looper.getMainLooper())
    private var isRunning = false
    
    companion object {
        fun start(context: Context) {
            val intent = Intent(context, NotificationForegroundService::class.java)
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                context.startForegroundService(intent)
            } else {
                context.startService(intent)
            }
        }
        
        fun stop(context: Context) {
            context.stopService(Intent(context, NotificationForegroundService::class.java))
        }
        
        fun isRunning(context: Context): Boolean {
            val manager = context.getSystemService(Context.ACTIVITY_SERVICE) as android.app.ActivityManager
            for (service in manager.getRunningServices(Int.MAX_VALUE)) {
                if (NotificationForegroundService::class.java.name == service.service.className) {
                    return true
                }
            }
            return false
        }
    }
    
    override fun onBind(intent: Intent?): IBinder? = null
    
    override fun onCreate() {
        super.onCreate()
        Log.d(TAG, "Service created")
        
        // Acquérir un wake lock partiel pour garder le CPU actif
        val powerManager = getSystemService(Context.POWER_SERVICE) as PowerManager
        wakeLock = powerManager.newWakeLock(
            PowerManager.PARTIAL_WAKE_LOCK,
            "BagBotManager::NotificationService"
        ).apply {
            setReferenceCounted(false)
        }
    }
    
    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        Log.d(TAG, "Service started")
        
        createServiceNotificationChannel()
        createChatNotificationChannel()
        
        val notification = createServiceNotification()
        startForeground(NOTIFICATION_ID, notification)
        
        if (!isRunning) {
            isRunning = true
            startCheckingLoop()
        }
        
        return START_STICKY
    }
    
    override fun onDestroy() {
        Log.d(TAG, "Service destroyed")
        isRunning = false
        serviceJob?.cancel()
        wakeLock?.let {
            if (it.isHeld) it.release()
        }
        handler.removeCallbacksAndMessages(null)
        super.onDestroy()
    }
    
    private fun startCheckingLoop() {
        serviceJob = serviceScope.launch {
            while (isActive && isRunning) {
                try {
                    // Acquérir wake lock pendant la vérification
                    wakeLock?.acquire(30000) // 30 secondes max
                    
                    checkForNewMessages()
                } catch (e: Exception) {
                    Log.e(TAG, "Error in check loop: ${e.message}", e)
                } finally {
                    wakeLock?.let {
                        if (it.isHeld) it.release()
                    }
                }
                
                delay(CHECK_INTERVAL_MS)
            }
        }
    }
    
    private suspend fun checkForNewMessages() {
        try {
            Log.d(TAG, "Checking for new messages...")
            
            SettingsStore.init(applicationContext)
            val store = SettingsStore.getInstance()
            val api = ApiClient(store)
            val json = Json { ignoreUnknownKeys = true; coerceInputValues = true }
            
            val token = store.getToken()
            if (token.isNullOrBlank()) {
                Log.d(TAG, "No token - stopping service")
                stopSelf()
                return
            }
            
            val prefs = applicationContext.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
            val lastSeenId = prefs.getLong("last_seen_message_id", 0L)
            
            // Qui suis-je ?
            val meJson = api.getJson("/api/me")
            val meObj = json.parseToJsonElement(meJson).jsonObject
            val myUserId = meObj["userId"]?.safeStringOrEmpty()
            val myUsername = (meObj["username"]?.safeString() ?: "").trim()
            
            // Charger les messages
            val response = api.getJson("/api/staff/chat/messages?room=global")
            val data = json.parseToJsonElement(response).jsonObject
            val msgs = data["messages"]?.jsonArray ?: kotlinx.serialization.json.JsonArray(emptyList())
            
            var maxId = lastSeenId
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
                
                sendChatNotification(username, message, mention)
                newCount++
                if (idLong > maxId) maxId = idLong
            }
            
            if (maxId > lastSeenId) {
                prefs.edit().putLong("last_seen_message_id", maxId).apply()
            }
            
            Log.d(TAG, "Check completed - $newCount new messages")
            
        } catch (e: IOException) {
            val msg = e.message ?: ""
            if (msg.contains("HTTP 401") || msg.contains("HTTP 403") || msg.contains("NOT_ADMIN")) {
                Log.d(TAG, "Token invalid - stopping service")
                try {
                    SettingsStore.getInstance().clearToken()
                } catch (_: Exception) {}
                stopSelf()
                return
            }
            Log.e(TAG, "IO error: ${e.message}")
        } catch (e: Exception) {
            Log.e(TAG, "Error: ${e.message}", e)
        }
    }
    
    private fun createServiceNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(
                SERVICE_CHANNEL_ID,
                "Service de notifications",
                NotificationManager.IMPORTANCE_LOW
            ).apply {
                description = "Service en arrière-plan pour les notifications en temps réel"
                setShowBadge(false)
            }
            
            val manager = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
            manager.createNotificationChannel(channel)
        }
    }
    
    private fun createChatNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(
                CHAT_CHANNEL_ID,
                "Chat Staff",
                NotificationManager.IMPORTANCE_HIGH
            ).apply {
                description = "Notifications pour les nouveaux messages du chat staff"
                enableVibration(true)
                enableLights(true)
            }
            
            val manager = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
            manager.createNotificationChannel(channel)
        }
    }
    
    private fun createServiceNotification(): Notification {
        val intent = Intent(this, MainActivity::class.java)
        val pendingIntent = PendingIntent.getActivity(
            this, 0, intent,
            PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT
        )
        
        return NotificationCompat.Builder(this, SERVICE_CHANNEL_ID)
            .setContentTitle("BagBot Manager")
            .setContentText("Notifications actives")
            .setSmallIcon(android.R.drawable.ic_dialog_info)
            .setContentIntent(pendingIntent)
            .setOngoing(true)
            .setPriority(NotificationCompat.PRIORITY_LOW)
            .setCategory(NotificationCompat.CATEGORY_SERVICE)
            .build()
    }
    
    private fun sendChatNotification(senderName: String, message: String, isMention: Boolean) {
        try {
            val intent = Intent(this, MainActivity::class.java).apply {
                flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TASK
            }
            
            val pendingIntent = PendingIntent.getActivity(
                this, 0, intent,
                PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT
            )
            
            val notification = NotificationCompat.Builder(this, CHAT_CHANNEL_ID)
                .setSmallIcon(android.R.drawable.ic_dialog_email)
                .setContentTitle(if (isMention) "🔔 Mention - $senderName" else "💬 Chat Staff - $senderName")
                .setContentText(message)
                .setPriority(if (isMention) NotificationCompat.PRIORITY_MAX else NotificationCompat.PRIORITY_HIGH)
                .setAutoCancel(true)
                .setContentIntent(pendingIntent)
                .setCategory(NotificationCompat.CATEGORY_MESSAGE)
                .setDefaults(NotificationCompat.DEFAULT_ALL)
                .build()
            
            val manager = NotificationManagerCompat.from(this)
            try {
                manager.notify(System.currentTimeMillis().toInt(), notification)
            } catch (e: SecurityException) {
                Log.e(TAG, "Permission notification refused: ${e.message}")
            }
        } catch (e: Exception) {
            Log.e(TAG, "Error sending notification: ${e.message}", e)
        }
    }
}
