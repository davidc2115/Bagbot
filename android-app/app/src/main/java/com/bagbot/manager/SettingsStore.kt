package com.bagbot.manager

import android.content.Context
import android.content.SharedPreferences

class SettingsStore {
  private val prefs: SharedPreferences by lazy {
    AppContext.get()
      .getSharedPreferences("bagbot_manager", Context.MODE_PRIVATE)
  }

  fun getBaseUrl(): String = prefs.getString("baseUrl", "") ?: ""
  fun setBaseUrl(v: String) {
    prefs.edit().putString("baseUrl", v).apply()
  }

  fun getToken(): String = prefs.getString("token", "") ?: ""
  fun setToken(v: String) {
    prefs.edit().putString("token", v).apply()
  }
}

