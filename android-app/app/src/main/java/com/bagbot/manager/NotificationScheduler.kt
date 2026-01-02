package com.bagbot.manager

import android.content.Context
import androidx.work.ExistingPeriodicWorkPolicy
import androidx.work.PeriodicWorkRequestBuilder
import androidx.work.WorkManager
import java.util.concurrent.TimeUnit

object NotificationScheduler {
    private const val WORK_NAME = "staff_chat_notifications"
    
    fun scheduleNotifications(context: Context) {
        val workRequest = PeriodicWorkRequestBuilder<StaffChatNotificationWorker>(
            15, // Vérifier toutes les 15 minutes (minimum Android)
            TimeUnit.MINUTES
        ).build()
        
        WorkManager.getInstance(context).enqueueUniquePeriodicWork(
            WORK_NAME,
            ExistingPeriodicWorkPolicy.KEEP, // Garder le travail existant
            workRequest
        )
    }
    
    fun cancelNotifications(context: Context) {
        WorkManager.getInstance(context).cancelUniqueWork(WORK_NAME)
    }
}
