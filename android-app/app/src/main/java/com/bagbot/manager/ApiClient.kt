package com.bagbot.manager

import okhttp3.*
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.RequestBody.Companion.toRequestBody
import java.io.IOException

class ApiClient(private val store: SettingsStore) {
    private val client = OkHttpClient()
    private val jsonMediaType = "application/json; charset=utf-8".toMediaType()
    
    private fun authHeader(): String? = store.getToken()?.let { "Bearer $it" }
    
    fun getJson(path: String): String {
        val url = "${store.getBaseUrl()}$path"
        val request = Request.Builder()
            .url(url)
            .apply { authHeader()?.let { addHeader("Authorization", it) } }
            .build()
        
        val response = client.newCall(request).execute()
        if (!response.isSuccessful) throw IOException("HTTP ${response.code}: ${response.body?.string()}")
        return response.body?.string() ?: "{}"
    }
    
    fun postJson(path: String, body: String): String {
        val url = "${store.getBaseUrl()}$path"
        val requestBody = body.toRequestBody(jsonMediaType)
        val request = Request.Builder()
            .url(url)
            .post(requestBody)
            .apply { authHeader()?.let { addHeader("Authorization", it) } }
            .build()
        
        val response = client.newCall(request).execute()
        if (!response.isSuccessful) throw IOException("HTTP ${response.code}: ${response.body?.string()}")
        return response.body?.string() ?: "{}"
    }
    
    fun putJson(path: String, body: String): String {
        val url = "${store.getBaseUrl()}$path"
        val requestBody = body.toRequestBody(jsonMediaType)
        val request = Request.Builder()
            .url(url)
            .put(requestBody)
            .apply { authHeader()?.let { addHeader("Authorization", it) } }
            .build()
        
        val response = client.newCall(request).execute()
        if (!response.isSuccessful) throw IOException("HTTP ${response.code}: ${response.body?.string()}")
        return response.body?.string() ?: "{}"
    }
    
    fun patchJson(path: String, body: String): String {
        val url = "${store.getBaseUrl()}$path"
        val requestBody = body.toRequestBody(jsonMediaType)
        val request = Request.Builder()
            .url(url)
            .patch(requestBody)
            .apply { authHeader()?.let { addHeader("Authorization", it) } }
            .build()
        
        val response = client.newCall(request).execute()
        if (!response.isSuccessful) throw IOException("HTTP ${response.code}: ${response.body?.string()}")
        return response.body?.string() ?: "{}"
    }
    
    fun deleteJson(path: String): String {
        val url = "${store.getBaseUrl()}$path"
        val request = Request.Builder()
            .url(url)
            .delete()
            .apply { authHeader()?.let { addHeader("Authorization", it) } }
            .build()
        
        val response = client.newCall(request).execute()
        if (!response.isSuccessful) throw IOException("HTTP ${response.code}: ${response.body?.string()}")
        return response.body?.string() ?: "{}"
    }

}
