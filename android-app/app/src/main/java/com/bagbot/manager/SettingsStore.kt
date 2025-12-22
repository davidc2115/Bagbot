package com.bagbot.manager

import android.content.Context
import android.content.SharedPreferences

class SettingsStore private constructor(context: Context) {
    private val prefs: SharedPreferences = context.getSharedPreferences("bagbot_settings", Context.MODE_PRIVATE)
    
    companion object {
        @Volatile
        private var instance: SettingsStore? = null
        
        private const val CURRENT_VERSION = 5912 // Version 5.9.12
        
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
    
    init {
        // Migration automatique de l'URL lors de la mise à jour
        migrateIfNeeded()
    }
    
    private fun migrateIfNeeded() {
        val lastVersion = prefs.getInt("app_version", 0)
        
        if (lastVersion < CURRENT_VERSION) {
            android.util.Log.d("SettingsStore", "Migration détectée: v$lastVersion -> v$CURRENT_VERSION")
            
            // Migration de l'URL 33002 vers 33003
            val currentUrl = prefs.getString("base_url", "")
            if (currentUrl != null && currentUrl.contains(":33002")) {
                val newUrl = currentUrl.replace(":33002", ":33003")
                android.util.Log.d("SettingsStore", "🔄 Migration URL: $currentUrl -> $newUrl")
                prefs.edit()
                    .putString("base_url", newUrl)
                    .putInt("app_version", CURRENT_VERSION)
                    .putBoolean("url_migrated", true)
                    .apply()
                
                // Forcer la déconnexion pour que l'utilisateur se reconnecte avec la bonne URL
                clearToken()
                android.util.Log.d("SettingsStore", "⚠️ Token supprimé - reconnexion nécessaire")
            } else {
                // Pas de migration d'URL nécessaire, juste mettre à jour la version
                prefs.edit().putInt("app_version", CURRENT_VERSION).apply()
            }
        }
    }
    
    fun getBaseUrl(): String {
        val url = prefs.getString("base_url", "http://88.174.155.230:33003") ?: "http://88.174.155.230:33003"
        // Double sécurité : si l'URL contient encore 33002, la corriger
        return if (url.contains(":33002")) {
            val correctedUrl = url.replace(":33002", ":33003")
            setBaseUrl(correctedUrl)
            correctedUrl
        } else {
            url
        }
    }
    
    fun setBaseUrl(url: String) = prefs.edit().putString("base_url", url).apply()
    
    fun getToken(): String? = prefs.getString("token", null)
    fun setToken(token: String) = prefs.edit().putString("token", token).apply()
    fun clearToken() = prefs.edit().remove("token").apply()
    
    fun wasUrlMigrated(): Boolean = prefs.getBoolean("url_migrated", false)
    fun clearMigrationFlag() = prefs.edit().putBoolean("url_migrated", false).apply()
    
    fun resetToDefaults() {
        prefs.edit()
            .putString("base_url", "http://88.174.155.230:33003")
            .putInt("app_version", CURRENT_VERSION)
            .remove("url_migrated")
            .apply()
        clearToken()
    }
    
    fun clear() = prefs.edit().clear().apply()
}
