package com.bagbot.manager

import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.RequestBody.Companion.toRequestBody

class ApiClient(private val store: SettingsStore) {
  private val client = OkHttpClient.Builder().build()
  private val json = "application/json; charset=utf-8".toMediaType()

  private fun baseUrl(): String {
    val b = store.getBaseUrl().trim().removeSuffix("/")
    if (b.isBlank()) throw IllegalStateException("Base URL not set")
    return b
  }

  private fun authHeader(): String {
    val t = store.getToken().trim()
    if (t.isBlank()) throw IllegalStateException("Not logged in")
    return "Bearer $t"
  }

  fun getJson(path: String): String {
    val req = Request.Builder()
      .url(baseUrl() + path)
      .addHeader("Authorization", authHeader())
      .addHeader("Accept", "application/json")
      .get()
      .build()
    client.newCall(req).execute().use { res ->
      val body = res.body?.string() ?: ""
      if (!res.isSuccessful) throw IllegalStateException("HTTP ${res.code}: $body")
      return body
    }
  }

  fun postJson(path: String, bodyJson: String): String {
    val req = Request.Builder()
      .url(baseUrl() + path)
      .addHeader("Authorization", authHeader())
      .addHeader("Accept", "application/json")
      .post(bodyJson.toRequestBody(json))
      .build()
    client.newCall(req).execute().use { res ->
      val body = res.body?.string() ?: ""
      if (!res.isSuccessful) throw IllegalStateException("HTTP ${res.code}: $body")
      return body
    }
  }

  fun putJson(path: String, bodyJson: String): String {
    val req = Request.Builder()
      .url(baseUrl() + path)
      .addHeader("Authorization", authHeader())
      .addHeader("Accept", "application/json")
      .put(bodyJson.toRequestBody(json))
      .build()
    client.newCall(req).execute().use { res ->
      val body = res.body?.string() ?: ""
      if (!res.isSuccessful) throw IllegalStateException("HTTP ${res.code}: $body")
      return body
    }
  }
}

