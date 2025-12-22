# Changelog - Version 5.9.10

**Date**: 22 Décembre 2025

## 🐛 Corrections de Bugs

### 1. Correction du placeholder URL (33002 → 33003)

**Fichier**: `app/src/main/java/com/bagbot/manager/App.kt`

**Problème**: L'application affichait l'ancien port 33002 dans le placeholder du champ URL du Dashboard au lieu du nouveau port 33003.

**Solution**: Mise à jour du placeholder à la ligne 3636 pour afficher le bon port.

```kotlin
// AVANT
placeholder = { Text("http://88.174.155.230:33002") }

// APRÈS
placeholder = { Text("http://88.174.155.230:33003") }
```

### 2. Correction de l'erreur JsonObject dans la configuration Mot-Caché

**Fichier**: `app/src/main/java/com/bagbot/manager/ui/screens/ConfigDashboardScreen.kt`

**Problème**: Erreur `Element class kotlinx.serialization.json.JsonObject (Kotlin reflection is not available) is not a JsonPrimitive` lors de la configuration de l'URL dans la section admin.

Cette erreur se produisait car les champs `letterNotificationChannel` et `notificationChannel` pouvaient être retournés par l'API soit comme:
- Une chaîne simple (JsonPrimitive): `"123456789"`
- Un objet JSON (JsonObject): `{"id": "123456789", "name": "..."}`

**Solution**: Ajout d'une fonction helper `strOrId()` qui gère les deux cas:

```kotlin
// Nouvelle fonction helper
private fun JsonObject.strOrId(key: String): String? {
    val element = this[key] ?: return null
    return element.jsonPrimitive?.contentOrNull ?: element.jsonObject?.get("id")?.jsonPrimitive?.contentOrNull
}

// Utilisation
var letterNotifChannel by remember { mutableStateOf(motCache?.strOrId("letterNotificationChannel")) }
var winnerNotifChannel by remember { mutableStateOf(motCache?.strOrId("notificationChannel")) }
```

La fonction essaie d'abord de lire la valeur comme une chaîne simple, et si c'est un objet, elle extrait le champ "id".

## 📦 Détails Techniques

### Fichiers Modifiés

1. **App.kt** (ligne 3636)
   - Correction du placeholder URL

2. **ConfigDashboardScreen.kt** (lignes 265-276, 3483-3484)
   - Ajout de la fonction helper `strOrId()`
   - Utilisation de `strOrId()` pour les champs de canaux de notification

3. **build.gradle.kts**
   - Mise à jour `versionCode`: 599 → 5910
   - Mise à jour `versionName`: "5.9.9" → "5.9.10"

## 🔄 Migration

Cette version est rétrocompatible avec les versions précédentes. Aucune action spécifique n'est requise lors de la mise à jour.

## 📱 Installation

Pour compiler l'APK:

```bash
cd android-app
./gradlew clean assembleRelease
```

L'APK sera disponible dans:
```
app/build/outputs/apk/release/app-release.apk
```

## ✅ Tests Recommandés

Avant de distribuer l'application:

1. ✅ Vérifier que le placeholder affiche bien 33003
2. ✅ Tester la configuration Mot-Caché dans la section Admin
3. ✅ Vérifier que la sauvegarde des canaux de notification fonctionne
4. ✅ Tester avec différents types de réponses API (chaîne simple vs objet)

---

*Version précédente: 5.9.9*
*Prochaine version prévue: 5.9.11*
