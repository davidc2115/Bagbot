package com.bagbot.manager

import okhttp3.*
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.RequestBody.Companion.toRequestBody
import java.io.IOException

class ApiClient(private val store: SettingsStore) {
    private val client = OkHttpClient()
    private val jsonMediaType = "application/json; charset=utf-8".toMediaType()
    
    private fun authHeader(): String? = store.getToken()?.let { "Bearer $it" }

    private fun maybeClearTokenOnAuthFailure(httpCode: Int, errorBody: String) {
        if (httpCode == 401 || httpCode == 403) {
            // Le serveur révoque l'accès si l'utilisateur n'est plus admin.
            // Dans ce cas on déconnecte localement.
            store.clearToken()
        }
    }
    
    fun getJson(path: String): String {
        val url = "${store.getBaseUrl()}$path"
        val request = Request.Builder()
            .url(url)
            .apply { authHeader()?.let { addHeader("Authorization", it) } }
            .build()
        
        val response = client.newCall(request).execute()
        if (!response.isSuccessful) {
            val errorBody = response.body?.string() ?: ""
            maybeClearTokenOnAuthFailure(response.code, errorBody)
            throw IOException("HTTP ${response.code}: $errorBody")
        }
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
        if (!response.isSuccessful) {
            val errorBody = response.body?.string() ?: ""
            maybeClearTokenOnAuthFailure(response.code, errorBody)
            throw IOException("HTTP ${response.code}: $errorBody")
        }
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
        if (!response.isSuccessful) {
            val errorBody = response.body?.string() ?: ""
            maybeClearTokenOnAuthFailure(response.code, errorBody)
            throw IOException("HTTP ${response.code}: $errorBody")
        }
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
        if (!response.isSuccessful) {
            val errorBody = response.body?.string() ?: ""
            maybeClearTokenOnAuthFailure(response.code, errorBody)
            throw IOException("HTTP ${response.code}: $errorBody")
        }
        return response.body?.string() ?: "{}"
    }
    
    fun uploadFile(path: String, fileName: String, fileBytes: ByteArray, fieldName: String = "file"): String {
        val url = "${store.getBaseUrl()}$path"
        
        val requestBody = MultipartBody.Builder()
            .setType(MultipartBody.FORM)
            .addFormDataPart(
                fieldName,
                fileName,
                fileBytes.toRequestBody("audio/*".toMediaType())
            )
            .build()
        
        val request = Request.Builder()
            .url(url)
            .post(requestBody)
            .apply { authHeader()?.let { addHeader("Authorization", it) } }
            .build()
        
        val response = client.newCall(request).execute()
        if (!response.isSuccessful) {
            val errorBody = response.body?.string() ?: ""
            maybeClearTokenOnAuthFailure(response.code, errorBody)
            throw IOException("HTTP ${response.code}: $errorBody")
        }
        return response.body?.string() ?: "{}"
    }

}
