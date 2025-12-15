package com.bagbot.manager

import kotlinx.serialization.json.Json
import kotlinx.serialization.json.JsonElement
import kotlinx.serialization.json.jsonObject

object JsonUtil {
  private val json = Json { ignoreUnknownKeys = true }

  fun parseObject(text: String) {
    val el: JsonElement = json.parseToJsonElement(text)
    // throws if not object
    el.jsonObject
  }
}

