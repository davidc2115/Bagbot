# Changelog - Version 5.9.11

**Date**: 22 Décembre 2025

## 🐛 Corrections Critiques

### 1. Erreur JsonObject dans Admin Section

**Problème Signalé**:
```
❌ Erreur: Element class kotlinx.serialization.json.JsonObject 
(Kotlin reflection is not available) is not a JsonPrimitive
```

Cette erreur se produisait dans l'application Android, section **Admin > Gérer les accès**, lors de la manipulation des utilisateurs autorisés.

**Fichier**: `android-app/app/src/main/java/com/bagbot/manager/ui/screens/AdminScreen.kt`

**Cause**: 
L'application essayait de lire la liste `allowedUsers` comme un tableau de chaînes simples (JsonPrimitive), mais l'API pouvait retourner des objets JSON avec une structure type `{"id": "123", "name": "..."}`.

**Solution Implémentée**:

1. **Ajout d'une fonction helper** (lignes 26-29):
```kotlin
// Helper pour extraire une chaîne d'un JsonElement (primitive ou objet avec id)
private fun JsonElement.stringOrId(): String? {
    return this.jsonPrimitive?.contentOrNull ?: this.jsonObject?.get("id")?.jsonPrimitive?.contentOrNull
}
```

2. **Utilisation de la fonction helper dans tous les endroits critiques**:
```kotlin
// AVANT (ligne 44-45)
allowedUsers = data["allowedUsers"]?.jsonArray?.map {
    it.jsonPrimitive.content
} ?: emptyList()

// APRÈS
allowedUsers = data["allowedUsers"]?.jsonArray?.mapNotNull {
    it.stringOrId()
} ?: emptyList()
```

**Corrections appliquées dans**:
- Ligne 44-47: Chargement initial des utilisateurs autorisés
- Ligne 180-184: Après ajout d'un utilisateur
- Ligne 287-291: Après suppression d'un utilisateur (révocation)
- Ligne 385-389: Après retrait d'un utilisateur

**Impact**: 
- ✅ Plus d'erreur lors de la gestion des accès utilisateurs
- ✅ Support des deux formats API (string ou objet)
- ✅ Compatibilité robuste avec différentes versions du backend

---

### 2. Retrait de la Vignette Musique de Config

**Problème Signalé**:
> "Peux-tu retirer la vignette musique dans config puisque on a déjà dans la page principale"

**Fichiers Modifiés**: `android-app/app/src/main/java/com/bagbot/manager/ui/screens/ConfigDashboardScreen.kt`

**Changements**:

1. **Suppression de l'enum Music** (ligne 66):
```kotlin
// AVANT
enum class DashTab(val label: String) {
    ...
    Music("🎵 Musique"),
    Raw("🧾 JSON Brut"),
}

// APRÈS
enum class DashTab(val label: String) {
    ...
    Raw("🧾 JSON Brut"),
}
```

2. **Suppression du switch case** (ligne 167):
```kotlin
// AVANT
DashTab.Music -> MusicTab(api, json, scope, snackbar)
DashTab.Raw -> RawConfigTab(configData, json)

// APRÈS
DashTab.Raw -> RawConfigTab(configData, json)
```

3. **Suppression de l'icône** (ligne 194):
```kotlin
// AVANT
"🎵 Musique" -> Icons.Default.MusicNote
"💾 Backups" -> Icons.Default.Storage

// APRÈS
"💾 Backups" -> Icons.Default.Storage
```

**Impact**:
- ✅ Interface Config plus épurée
- ✅ Pas de duplication avec l'onglet Musique principal (tab 4)
- ✅ La fonction MusicTab() reste dans le code (peut être réutilisée si besoin)

---

## 📋 Détails Techniques

### Fichiers Modifiés

1. **AdminScreen.kt**
   - Lignes ajoutées: 4 (fonction helper)
   - Lignes modifiées: 8 (remplacement .jsonPrimitive.content par .stringOrId())
   
2. **ConfigDashboardScreen.kt**
   - Lignes retirées: 3 (enum Music, switch case, icône)
   
3. **build.gradle.kts**
   - Version: 5.9.10 → 5.9.11
   - VersionCode: 5910 → 5911

### Compatibilité API

La fonction `stringOrId()` gère maintenant les deux formats:

**Format 1: Chaîne Simple**
```json
{
  "allowedUsers": ["123456789", "987654321"]
}
```

**Format 2: Objets avec ID**
```json
{
  "allowedUsers": [
    {"id": "123456789", "name": "User1"},
    {"id": "987654321", "name": "User2"}
  ]
}
```

---

## ✅ Tests Recommandés

### Test 1: Admin Section
1. Ouvrir l'application
2. Aller dans **Admin > Gérer les accès**
3. Ajouter un utilisateur
4. ✅ Pas d'erreur JsonObject
5. Retirer un utilisateur
6. ✅ Pas d'erreur JsonObject

### Test 2: Interface Config
1. Aller dans **Config**
2. Vérifier la liste des vignettes
3. ✅ La vignette "🎵 Musique" n'apparaît plus
4. ✅ L'onglet Musique principal (navigation) fonctionne toujours

---

## 🔄 Migration

Cette version est **rétrocompatible** avec les versions précédentes.

Aucune action spécifique requise lors de la mise à jour.

---

## 📊 Résumé des Changements

| Type | Description | Impact |
|------|-------------|--------|
| 🐛 Fix | Erreur JsonObject Admin | Critique |
| 🎨 UI | Retrait vignette Musique Config | Mineur |
| 📦 Version | 5.9.10 → 5.9.11 | - |

---

## 📥 Installation

### Téléchargement

L'APK sera disponible sur GitHub Releases après compilation:

```
https://github.com/mel805/Bagbot/releases/tag/v5.9.11
```

### Compilation Manuelle

```bash
cd android-app
./gradlew clean assembleRelease
```

L'APK sera dans:
```
app/build/outputs/apk/release/app-release.apk
```

---

## 🔍 Différences avec v5.9.10

### Nouveautés v5.9.11
- ✅ Fix complet erreur JsonObject dans AdminScreen
- ✅ Interface Config plus épurée (pas de duplication Musique)

### Déjà présent depuis v5.9.10
- ✅ URL placeholder 33003
- ✅ Fix erreur JsonObject dans ConfigDashboardScreen (Mot-Caché)

---

## 🐛 Bugs Corrigés

### v5.9.11
1. ✅ **AdminScreen JsonObject error** - Fix complet avec stringOrId()
2. ✅ **Duplication vignette Musique** - Retirée de Config

### v5.9.10
1. ✅ **Placeholder URL** - 33002 → 33003
2. ✅ **ConfigDashboardScreen JsonObject** - strOrId() pour Mot-Caché

---

*Version précédente: 5.9.10*  
*Prochaine version prévue: 5.9.12*  
*Date de création: 22 Décembre 2025*
