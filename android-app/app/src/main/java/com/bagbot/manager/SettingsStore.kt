package com.bagbot.manager

import android.content.Context
import android.content.SharedPreferences

class SettingsStore private constructor(context: Context) {
    private val prefs: SharedPreferences = context.getSharedPreferences("bagbot_settings", Context.MODE_PRIVATE)
    
    companion object {
        @Volatile
        private var instance: SettingsStore? = null
        
        fun getInstance(context: Context? = null): SettingsStore {
            return instance ?: synchronized(this) {
                instance ?: context?.let { SettingsStore(it.applicationContext) }
                    ?.also { instance = it }
                    ?: throw IllegalStateException("SettingsStore not initialized")
            }
        }
        
        fun init(context: Context) {
            getInstance(context)
        }
    }
    
    fun getBaseUrl(): String = prefs.getString("base_url", "") ?: ""
    fun setBaseUrl(url: String) = prefs.edit().putString("base_url", url).apply()
    
    fun getToken(): String? = prefs.getString("token", null)
    fun setToken(token: String) = prefs.edit().putString("token", token).apply()
    fun clearToken() = prefs.edit().remove("token").apply()
    
    fun clear() = prefs.edit().clear().apply()
}
