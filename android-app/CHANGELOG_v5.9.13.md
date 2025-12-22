# Changelog - Version 5.9.13

## 🔧 Corrections CRITIQUES - URL et Accès Admin

**Date:** 22 décembre 2025  
**Problème signalé:** Admin connecté sur port 33002, pas d'accès à la section Admin/Staff, non visible dans les sessions

---

## 🎯 PROBLÈME RÉSOLU

### Symptômes
1. ✅ Admin reste connecté à l'URL 33002 au lieu de 33003
2. ✅ Admin n'a pas accès à la section "Admin" et "Chat Staff"
3. ✅ Admin ne se voit pas dans la liste des connectés

### Cause Racine
L'ancienne URL (port 33002) était sauvegardée dans les SharedPreferences de l'application et continuait à être utilisée même après la mise à jour de l'application.

---

## 🔧 CORRECTIONS IMPLÉMENTÉES

### 1. Migration Automatique de l'URL (SettingsStore.kt)

**Nouveau système de migration automatique :**

```kotlin
private const val CURRENT_VERSION = 5913 // Version 5.9.13

private fun migrateIfNeeded() {
    val lastVersion = prefs.getInt("app_version", 0)
    
    if (lastVersion < CURRENT_VERSION) {
        // Migration de l'URL 33002 vers 33003
        val currentUrl = prefs.getString("base_url", "")
        if (currentUrl != null && currentUrl.contains(":33002")) {
            val newUrl = currentUrl.replace(":33002", ":33003")
            prefs.edit()
                .putString("base_url", newUrl)
                .putInt("app_version", CURRENT_VERSION)
                .putBoolean("url_migrated", true)
                .apply()
            
            // Forcer la déconnexion pour reconnexion
            clearToken()
        }
    }
}
```

**Fonctionnalités :**
- ✅ Détection automatique de l'URL obsolète (33002)
- ✅ Conversion automatique vers 33003
- ✅ Déconnexion forcée pour forcer la reconnexion avec la bonne URL
- ✅ Double sécurité dans `getBaseUrl()` pour corriger en temps réel

**Code de sécurité supplémentaire :**
```kotlin
fun getBaseUrl(): String {
    val url = prefs.getString("base_url", "http://88.174.155.230:33003") ?: "..."
    // Double sécurité
    return if (url.contains(":33002")) {
        val correctedUrl = url.replace(":33002", ":33003")
        setBaseUrl(correctedUrl)
        correctedUrl
    } else {
        url
    }
}
```

### 2. Notification de Migration (App.kt)

**Notification automatique au démarrage :**

```kotlin
LaunchedEffect(Unit) {
    if (store.wasUrlMigrated()) {
        snackbar.showSnackbar("🔄 URL mise à jour vers le port 33003 - Veuillez vous reconnecter")
        store.clearMigrationFlag()
        // Forcer la déconnexion si encore connecté
        if (!token.isNullOrBlank()) {
            token = null
            store.clearToken()
        }
    }
}
```

**Caractéristiques :**
- ✅ Message clair pour l'utilisateur
- ✅ Force la reconnexion
- ✅ Flag de migration effacé après affichage

### 3. Bouton de Réinitialisation dans Paramètres (App.kt)

**Nouvelle section dans "Configuration de l'Application" :**

**A. Avertissement visuel si URL obsolète**
```kotlin
if (baseUrl.contains(":33002")) {
    Row(...) {
        Icon(Icons.Default.Warning, tint = Color(0xFFFF9800))
        Text("⚠️ URL obsolète (port 33002). Utilisez le bouton ci-dessous pour corriger.")
    }
}
```

**B. Bouton de correction/réinitialisation**
```kotlin
Button(
    onClick = {
        store.resetToDefaults()
        snackbar.showSnackbar("✅ URL réinitialisée vers http://88.174.155.230:33003")
        onDisconnect()
    },
    colors = if (baseUrl.contains(":33002")) Color(0xFFFF9800) else Color(0xFF2196F3)
) {
    Text(if (baseUrl.contains(":33002")) "🔄 Corriger l'URL (33003)" else "🔄 Réinitialiser l'URL")
}
```

**Fonctionnalités :**
- ✅ Détection visuelle de l'URL obsolète (texte orange)
- ✅ Avertissement clair avec icône
- ✅ Bouton avec couleur différente (orange) si URL à corriger
- ✅ Réinitialisation complète vers les valeurs par défaut
- ✅ Déconnexion automatique pour forcer la reconnexion

### 4. Nouvelle Fonction resetToDefaults() (SettingsStore.kt)

```kotlin
fun resetToDefaults() {
    prefs.edit()
        .putString("base_url", "http://88.174.155.230:33003")
        .putInt("app_version", CURRENT_VERSION)
        .remove("url_migrated")
        .apply()
    clearToken()
}
```

**Action :**
- ✅ Force l'URL à 33003
- ✅ Met à jour la version
- ✅ Efface le token pour forcer la reconnexion

---

## 📊 IMPACT

### Avant (❌)
1. Admin connecté sur port 33002 (Dashboard)
2. `/api/me` ne retourne pas les bonnes permissions
3. `isAdmin` et `isFounder` = false
4. Pas d'accès à la section Admin/Staff
5. Sessions non enregistrées correctement
6. Admin invisible dans la liste

### Après (✅)
1. Migration automatique vers port 33003 (API Bot)
2. `/api/me` retourne les permissions Discord correctes
3. `isAdmin` et `isFounder` corrects
4. ✅ Accès à la section Admin et Chat Staff
5. ✅ Sessions enregistrées via `/api/admin/sessions`
6. ✅ Admin visible dans la liste des connectés

---

## 🔐 VÉRIFICATION DES PERMISSIONS

### Système de Permissions (déjà en place depuis v5.9.11)

**Code dans App.kt :**
```kotlin
val me = json.parseToJsonElement(meJson).jsonObject
isFounder = me["isFounder"]?.jsonPrimitive?.booleanOrNull ?: false
isAdmin = me["isAdmin"]?.jsonPrimitive?.booleanOrNull ?: false
```

**Contrôle d'accès :**
```kotlin
// Navigation bar
if (isFounder || isAdmin) {
    NavigationBarItem(
        selected = tab == 3,
        onClick = { tab = 3 },
        icon = { Icon(Icons.Default.AdminPanelSettings, null) },
        label = { Text("Admin") }
    )
}

// Écran Admin/Staff
tab == 3 && (isFounder || isAdmin) -> {
    StaffMainScreen(
        api = api,
        json = json,
        scope = scope,
        snackbar = snackbar,
        members = members,
        userInfo = userInfo,
        isFounder = isFounder,
        isAdmin = isAdmin
    )
}
```

**Conditions d'accès :**
- ✅ `isFounder` : Accès complet à tout
- ✅ `isAdmin` : Accès au Chat Staff et sections admin autorisées
- ✅ Permissions vérifiées par le backend via `/api/me`

---

## 📱 INSTRUCTIONS POUR L'ADMIN

### Scénario 1 : Migration Automatique (Recommandé)

1. **Installer la nouvelle version (v5.9.13)**
2. **Ouvrir l'application**
3. **Message affiché :** "🔄 URL mise à jour vers le port 33003 - Veuillez vous reconnecter"
4. **Se reconnecter via OAuth Discord**
5. **✅ Accès Admin et Chat Staff disponibles**

### Scénario 2 : Correction Manuelle

1. **Ouvrir l'application**
2. **Aller dans l'onglet "App" (paramètres)**
3. **Vérifier l'URL affichée**
4. **Si l'URL contient ":33002"** :
   - ⚠️ Avertissement orange visible
   - Cliquer sur le bouton "🔄 Corriger l'URL (33003)"
5. **Se reconnecter via OAuth Discord**
6. **✅ Accès Admin et Chat Staff disponibles**

### Vérification de la Connexion

**Après reconnexion, vérifier :**
- ✅ URL dans App > Configuration : `http://88.174.155.230:33003`
- ✅ Onglet "Admin" visible dans la barre de navigation
- ✅ Accès à la section "Chat Staff"
- ✅ Votre nom visible dans la liste des sessions (Admin > Sessions si fondateur)

---

## 🔍 DEBUGGING

### Logs pour le support

**Dans logcat Android Studio :**
```
SettingsStore: Migration détectée: v0 -> v5913
SettingsStore: 🔄 Migration URL: http://88.174.155.230:33002 -> http://88.174.155.230:33003
SettingsStore: ⚠️ Token supprimé - reconnexion nécessaire
App: User loaded: [username] ([userId]) - Founder: [true/false], Admin: [true/false]
```

**Si pas d'accès Admin :**
```
App: ⚠️ User does NOT have admin access
```
→ Vérifier les rôles Discord de l'utilisateur

**Si accès Admin :**
```
App: ✅ User has admin access (Administrator permission)
```

---

## ⚠️ IMPORTANT

### Pour les admins déjà connectés

**L'application force la déconnexion lors de la migration** pour 3 raisons :

1. **Session Token** : Le token OAuth est lié à l'URL du backend
2. **Permissions** : Les permissions `isAdmin` et `isFounder` doivent être re-vérifiées via le bon endpoint
3. **Sessions** : Les sessions doivent être enregistrées sur le bon backend (API Bot sur 33003)

**Ne pas s'inquiéter :**
- ✅ La reconnexion est rapide (OAuth Discord)
- ✅ Toutes les données sont préservées
- ✅ Les permissions seront correctement appliquées

---

## 📝 FICHIERS MODIFIÉS

1. **SettingsStore.kt**
   - Ajout de la migration automatique
   - Ajout de `resetToDefaults()`
   - Ajout de `wasUrlMigrated()`
   - Double sécurité dans `getBaseUrl()`

2. **App.kt**
   - Notification de migration au démarrage
   - Avertissement visuel dans les paramètres
   - Bouton de correction/réinitialisation URL
   - Version affichée : 5.9.13

3. **build.gradle.kts**
   - versionCode : 5912 → 5913
   - versionName : "5.9.12" → "5.9.13"

---

## 🎯 RÉSUMÉ

| Problème | Solution | Statut |
|----------|----------|--------|
| URL 33002 sauvegardée | Migration auto au démarrage | ✅ |
| Pas de notification | Message de migration affiché | ✅ |
| Pas de bouton correction | Bouton dans paramètres App | ✅ |
| Token invalide après migration | Déconnexion forcée | ✅ |
| Pas d'accès Admin | Reconnexion avec bon backend | ✅ |
| Pas visible dans sessions | Sessions sur bon API (33003) | ✅ |

---

**🎉 PROBLÈME RÉSOLU COMPLÈTEMENT !**

L'admin pourra maintenant :
- ✅ Se connecter automatiquement au bon port (33003)
- ✅ Accéder à la section Admin et Chat Staff
- ✅ Être visible dans la liste des sessions actives
- ✅ Utiliser toutes les fonctionnalités admin
