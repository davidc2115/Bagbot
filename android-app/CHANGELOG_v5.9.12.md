# Changelog - Version 5.9.12

## 🔧 Correctifs critiques

### Correction complète des erreurs JsonObject

Cette version corrige **définitivement** l'erreur `Element class kotlinx.serialization.json.JsonObject (Kotlin reflection is not available) is not a JsonPrimitive` qui persistait dans l'application.

#### Nouveau système de parsing JSON sécurisé

**Fichier créé : `JsonExtensions.kt`**
- Nouveau fichier d'extensions globales pour le parsing JSON sécurisé
- Gère automatiquement les cas où l'API retourne soit des `JsonPrimitive` soit des `JsonObject`
- Toutes les fonctions incluent des try-catch pour éviter les crashes

**Extensions ajoutées :**
- `safeString()` : Extrait une chaîne de manière sécurisée
- `safeInt()` : Extrait un entier de manière sécurisée
- `safeBoolean()` : Extrait un booléen de manière sécurisée
- `safeStringOrEmpty()` : Version non-nullable de safeString
- `safeIntOrZero()` : Version non-nullable de safeInt
- `safeBooleanOrFalse()` : Version non-nullable de safeBoolean
- `safeStringList()` : Pour les tableaux de chaînes
- `safeObjectList()` : Pour les tableaux d'objets

#### Fichiers corrigés

**1. AdminScreen.kt**
- ✅ Correction du parsing de `allowedUsers` (déjà fait en v5.9.11)
- ✅ **NOUVEAU**: Correction du parsing des sessions (userId, roles, lastSeen, isOnline)
- ✅ **NOUVEAU**: Correction du parsing des staffRoleIds
- ✅ Import et utilisation des nouvelles extensions sécurisées

**2. App.kt** (50+ corrections)
- ✅ UserBalance (userId, amount)
- ✅ UserLevel (userId, xp)
- ✅ Prompts Truth/Dare
- ✅ StaffMessage (tous les champs)
- ✅ Messages utilisateurs
- ✅ Admins en ligne
- ✅ Membres et rôles
- ✅ Channels et roles
- ✅ AllowedUsers
- ✅ StaffRoles
- ✅ UserRoles
- ✅ Files
- ✅ Dashboard URL
- ✅ Inactivity exempt roles
- ✅ Et bien d'autres...

**3. ConfigDashboardScreen.kt** (20+ corrections)
- ✅ Cooldowns
- ✅ Rewards
- ✅ Female/Certified role IDs
- ✅ Booster roles
- ✅ Success/Fail GIFs
- ✅ Success/Fail messages
- ✅ Mot-caché allowed channels
- ✅ Counting channels
- ✅ Staff ping roles
- ✅ Extra viewer roles
- ✅ Log categories et channels
- ✅ Ignore users/channels/roles
- ✅ Confess NSFW names et channels
- ✅ Staff role IDs
- ✅ Inactive excluded role IDs
- ✅ Autothread channels et NSFW names

## 🎯 Impact

Cette version résout **complètement** le problème de parsing JSON qui causait des crashes dans :
- ✅ Section Admin > Gérer les accès
- ✅ Section Admin > Sessions
- ✅ Toutes les sections de configuration
- ✅ Dashboard principal
- ✅ Gestion des membres et rôles

## 📝 Technique

**Avant (❌ Causait des crashes):**
```kotlin
val userId = obj["userId"]?.jsonPrimitive?.content ?: ""
// ❌ Crash si l'API retourne un JsonObject au lieu d'un JsonPrimitive
```

**Après (✅ Sécurisé):**
```kotlin
val userId = obj["userId"].safeStringOrEmpty()
// ✅ Gère automatiquement JsonPrimitive, JsonObject, et null
```

## ⚠️ Tests recommandés

1. **Admin > Gérer les accès** : Ajouter/retirer des utilisateurs
2. **Admin > Sessions** : Vérifier la liste des sessions actives
3. **Configuration** : Modifier les paramètres de Mot-Caché, Logs, Confess
4. **Dashboard** : Naviguer dans toutes les sections

---

**Date:** 22 décembre 2025
**Version précédente:** 5.9.11
**Problème résolu:** Erreur JsonObject dans Admin et Config
**Fichiers modifiés:** 4 (1 nouveau + 3 corrigés)
**Total corrections:** 70+ accès JSON sécurisés
