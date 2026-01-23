package com.bagbot.manager

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.util.Log

/**
 * Receiver pour redémarrer les notifications après un reboot du téléphone
 */
class BootReceiver : BroadcastReceiver() {
    
    private val TAG = "BootReceiver"
    
    override fun onReceive(context: Context, intent: Intent) {
        if (intent.action == Intent.ACTION_BOOT_COMPLETED ||
            intent.action == Intent.ACTION_LOCKED_BOOT_COMPLETED ||
            intent.action == "android.intent.action.QUICKBOOT_POWERON" ||
            intent.action == "com.htc.intent.action.QUICKBOOT_POWERON") {
            
            Log.d(TAG, "Boot completed - starting notification service")
            
            try {
                // Initialiser les stores
                SettingsStore.init(context)
                val store = SettingsStore.getInstance()
                
                // Vérifier si l'utilisateur est connecté
                val token = store.getToken()
                if (!token.isNullOrBlank()) {
                    // Démarrer le WorkManager pour les notifications
                    StaffChatNotificationWorker.schedule(context)
                    
                    // Démarrer le service de premier plan si activé
                    if (store.isNotificationServiceEnabled()) {
                        NotificationForegroundService.start(context)
                    }
                    
                    Log.d(TAG, "Notification services started successfully")
                } else {
                    Log.d(TAG, "No token found - skipping notification start")
                }
            } catch (e: Exception) {
                Log.e(TAG, "Error starting notification services: ${e.message}", e)
            }
        }
    }
}
