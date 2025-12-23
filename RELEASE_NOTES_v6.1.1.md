# 🔧 Release Notes - BagBot Manager v6.1.1

## 📅 Date: 23 Décembre 2025

## 🐛 Correctifs Critiques

### ⏰ Inactivité - Affichage Corrigé
**Problème résolu:**
- ❌ Affichait toujours "désactivé" même si activé sur le serveur
- ❌ Aucun membre en surveillance visible

**Solution:**
- ✅ Structure de données corrigée: utilise maintenant `autokick.inactivityKick`
- ✅ Affiche correctement le statut: "✅ Activé" ou "❌ Désactivé"
- ✅ Affiche "⏰ Kick après X jours"
- ✅ Affiche "👥 Surveillés: X membres"

**Détails techniques:**
```kotlin
// AVANT: Cherchait dans "inactivity" (inexistant)
sectionData["enabled"]

// APRÈS: Cherche dans "autokick.inactivityKick" (correct)
sectionData["autokick"]["inactivityKick"]["enabled"]
```

### 👥 Gestion des Accès - Erreur Null Corrigée
**Problème résolu:**
- ❌ Affichait "Erreur: null"
- ❌ Utilisateurs affichés comme "membre inconnu"
- ❌ Impossible de sélectionner des membres

**Solution:**
- ✅ Extraction correcte des userId depuis les objets API
- ✅ Support des deux formats: objets `{userId, username}` et strings simples
- ✅ Logs d'erreur améliorés pour débogage
- ✅ Affichage correct des noms de membres

**Détails techniques:**
```kotlin
// AVANT: utilisait it.stringOrId() qui cherchait "id"
it.stringOrId()

// APRÈS: extrait correctement "userId" des objets
when {
    element is JsonObject -> element["userId"]?.safeString()
    element is JsonPrimitive -> element.safeString()
    else -> null
}
```

### ⚙️ Système - Erreur 404 Corrigée
**Problème résolu:**
- ❌ Erreur `HTTP 404: Cannot POST /api/counting`

**Solution:**
- ✅ Route POST /api/counting créée dans le backend
- ✅ Actions disponibles: `reset`, `setChannel`, `toggle`
- ✅ L'onglet Système fonctionne maintenant correctement

## ✨ Améliorations

### 🎨 Splash Screen Amélioré
**Changements:**
- 🖼️ **Image en plein écran** avec effet de zoom doux
- 🎭 Utilise `ContentScale.Crop` pour remplir tout l'écran
- 🌑 Fond noir avec overlay semi-transparent
- ✨ Animation plus subtile (1.0 → 1.05 au lieu de 0.9 → 1.1)
- ⏱️ Durée de 2.5 secondes conservée

**Rendu:**
- L'image personnalisée remplit tout l'écran
- Texte "BAG Bot Manager" par-dessus en blanc
- Indicateur de chargement en bas
- Design moderne et élégant

## 📦 Fichiers Modifiés

### Backend
- `src/api-server.js` - Ajout route POST /api/counting

### Application Android
- `android-app/app/src/main/java/com/bagbot/manager/App.kt`
  - Correction structure inactivité (autokick.inactivityKick)
  - Amélioration affichage des informations
  - Correction chargement/sauvegarde config autokick

- `android-app/app/src/main/java/com/bagbot/manager/ui/screens/AdminScreen.kt`
  - Correction extraction userId depuis objets API
  - Logs d'erreur améliorés
  - Support multi-format pour allowedUsers

- `android-app/app/src/main/java/com/bagbot/manager/ui/screens/SplashScreen.kt`
  - Image en plein écran avec ContentScale.Crop
  - Overlay semi-transparent
  - Animation améliorée

- `android-app/app/build.gradle.kts`
  - Version: 6.1.0 → **6.1.1**
  - VersionCode: 6100 → **6101**

## 🔧 Changements Techniques

### Structure des Données Inactivité

**Backend (api-server.js):**
```javascript
GET /api/configs retourne:
{
  autokick: {
    enabled: boolean,
    delayMs: number,
    inactivityKick: {
      enabled: boolean,
      delayDays: number,
      excludedRoleIds: [],
      trackActivity: boolean
    },
    inactivityTracking: {
      [userId]: {
        lastActivity: timestamp,
        plannedInactive: {...}
      }
    }
  }
}
```

**Frontend (App.kt):**
```kotlin
// Accès correct:
val autokick = sectionData["autokick"]
val inactivityKick = autokick["inactivityKick"]
val enabled = inactivityKick["enabled"]
val delayDays = inactivityKick["delayDays"]
val trackedCount = autokick["inactivityTracking"].size
```

### API Allowed Users

**Backend retourne:**
```json
{
  "allowedUsers": [
    { "userId": "123", "username": "User1", "addedAt": "..." },
    { "userId": "456", "username": "User2", "addedAt": "..." }
  ],
  "count": 2
}
```

**Frontend extrait:**
```kotlin
element["userId"]?.safeString()  // Au lieu de it.stringOrId()
```

## 📊 Tests Recommandés

### Test 1: Inactivité ⏰
1. ✓ Ouvrir Config > Modération & Sécurité
2. ✓ Cliquer sur "🦶 Auto-kick & Inactivité"
3. ✓ Vérifier le statut: "✅ Activé" ou "❌ Désactivé"
4. ✓ Vérifier "⏰ Kick après X jours"
5. ✓ Vérifier "👥 Surveillés: X membres"

### Test 2: Gestion des Accès 👥
1. ✓ Ouvrir Admin > Gestion des Accès
2. ✓ Vérifier qu'il n'y a PAS d'erreur "null"
3. ✓ Vérifier que les noms de membres s'affichent correctement
4. ✓ Ajouter un utilisateur
5. ✓ Retirer un utilisateur

### Test 3: Système ⚙️
1. ✓ Ouvrir Admin > Système
2. ✓ Vérifier qu'il n'y a PAS d'erreur 404
3. ✓ Les statistiques s'affichent correctement

### Test 4: Splash Screen 🎨
1. ✓ Fermer et relancer l'application
2. ✓ Vérifier que l'image remplit tout l'écran
3. ✓ Vérifier l'effet de zoom doux
4. ✓ Vérifier le texte blanc visible par-dessus

## 🎯 Résumé des Problèmes Résolus

| Problème | Status | Détails |
|----------|--------|---------|
| ⏰ Inactivité toujours "désactivé" | ✅ **Corrigé** | Structure autokick.inactivityKick |
| 👥 Gestion accès "Erreur: null" | ✅ **Corrigé** | Extraction userId corrigée |
| 👥 Membres affichés comme "inconnu" | ✅ **Corrigé** | Format API supporté |
| ⚙️ Erreur 404 POST /api/counting | ✅ **Corrigé** | Route créée backend |
| 🎨 Image splash petit format | ✅ **Amélioré** | Plein écran avec crop |

## ⚠️ Notes Importantes

1. **Structure Inactivité:**
   - L'inactivité est stockée dans `autokick.inactivityKick` (pas directement dans `inactivity`)
   - La section s'appelle maintenant "🦶 Auto-kick & Inactivité" dans l'app

2. **API Allowed Users:**
   - Retourne des objets avec `userId` (pas `id`)
   - Support ajouté pour les deux formats (objet et string)

3. **Splash Screen:**
   - Image en plein écran avec `ContentScale.Crop`
   - Fond noir avec overlay pour meilleure lisibilité du texte

## 🚀 Installation

L'APK sera généré automatiquement via GitHub Actions lors du tag `v6.1.1`.

**Téléchargement:** https://github.com/mel805/Bagbot/releases/tag/v6.1.1

## 📝 Compatibilité

- Pas de breaking changes
- Compatible avec toutes les versions précédentes
- Nécessite backend avec route POST /api/counting

---

**Version:** 6.1.1 (versionCode 6101)  
**Changements:** 3 bugs critiques corrigés + splash screen amélioré  
**Type:** Correctif (Patch)
