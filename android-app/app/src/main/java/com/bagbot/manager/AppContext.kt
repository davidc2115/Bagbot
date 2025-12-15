package com.bagbot.manager

import android.app.Application

class AppContext : Application() {
  override fun onCreate() {
    super.onCreate()
    instance = this
  }

  companion object {
    @Volatile private var instance: AppContext? = null
    fun get(): AppContext = instance
      ?: throw IllegalStateException("AppContext not initialized")
  }
}

