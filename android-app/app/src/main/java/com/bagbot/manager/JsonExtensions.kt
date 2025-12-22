package com.bagbot.manager

import kotlinx.serialization.json.*

/**
 * Extensions JSON sécurisées pour éviter les erreurs "Kotlin reflection is not available"
 * Ces fonctions gèrent à la fois les JsonPrimitive et les JsonObject
 */

// Helper pour extraire une chaîne de manière sécurisée
fun JsonElement?.safeString(): String? {
    if (this == null) return null
    return try {
        this.jsonPrimitive?.contentOrNull ?: this.jsonObject?.get("id")?.jsonPrimitive?.contentOrNull
    } catch (e: Exception) {
        null
    }
}

// Helper pour extraire un int de manière sécurisée
fun JsonElement?.safeInt(): Int? {
    if (this == null) return null
    return try {
        this.jsonPrimitive?.intOrNull
    } catch (e: Exception) {
        null
    }
}

// Helper pour extraire un long de manière sécurisée
fun JsonElement?.safeLong(): Long? {
    if (this == null) return null
    return try {
        this.jsonPrimitive?.longOrNull
    } catch (e: Exception) {
        null
    }
}

// Helper pour extraire un boolean de manière sécurisée
fun JsonElement?.safeBoolean(): Boolean? {
    if (this == null) return null
    return try {
        this.jsonPrimitive?.booleanOrNull
    } catch (e: Exception) {
        null
    }
}

// Helper pour extraire un double de manière sécurisée
fun JsonElement?.safeDouble(): Double? {
    if (this == null) return null
    return try {
        this.jsonPrimitive?.doubleOrNull
    } catch (e: Exception) {
        null
    }
}

// Helper pour convertir JsonElement en String (non nullable)
fun JsonElement?.safeStringOrEmpty(): String {
    return this.safeString() ?: ""
}

// Helper pour convertir JsonElement en Int (non nullable)
fun JsonElement?.safeIntOrZero(): Int {
    return this.safeInt() ?: 0
}

// Helper pour convertir JsonElement en Boolean (non nullable)
fun JsonElement?.safeBooleanOrFalse(): Boolean {
    return this.safeBoolean() ?: false
}

// Extensions pour JsonObject avec fallback
fun JsonObject?.safeGet(key: String): JsonElement? {
    return try {
        this?.get(key)
    } catch (e: Exception) {
        null
    }
}

fun JsonObject?.safeGetString(key: String): String? {
    return try {
        this?.get(key).safeString()
    } catch (e: Exception) {
        null
    }
}

fun JsonObject?.safeGetInt(key: String): Int? {
    return try {
        this?.get(key).safeInt()
    } catch (e: Exception) {
        null
    }
}

fun JsonObject?.safeGetBoolean(key: String): Boolean? {
    return try {
        this?.get(key).safeBoolean()
    } catch (e: Exception) {
        null
    }
}

// Extension pour obtenir un array de strings de manière sécurisée
fun JsonArray?.safeStringList(): List<String> {
    if (this == null) return emptyList()
    return try {
        this.mapNotNull { it.safeString() }
    } catch (e: Exception) {
        emptyList()
    }
}

// Extension pour obtenir un array d'objets de manière sécurisée
fun JsonArray?.safeObjectList(): List<JsonObject> {
    if (this == null) return emptyList()
    return try {
        this.mapNotNull { 
            try {
                it.jsonObject
            } catch (e: Exception) {
                null
            }
        }
    } catch (e: Exception) {
        emptyList()
    }
}
