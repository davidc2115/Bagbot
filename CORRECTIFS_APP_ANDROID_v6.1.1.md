# 🔧 Correctifs Application Android v6.1.1

## 📋 Problèmes Identifiés

### 1. ⏰ Inactivité - Affichage incorrect
**Symptômes:**
- Affiche toujours "désactivé" même si activé
- Aucun membre en surveillance visible

**Cause:**
- Incohérence dans les noms de propriétés: `kickAfterDays` vs `thresholdDays`
- Manque d'affichage du statut activé/désactivé
- Pas d'affichage des membres trackés

**Fichiers concernés:**
- `android-app/app/src/main/java/com/bagbot/manager/App.kt` (lignes 3540-3545, 4300-4333, 4615-4641)

### 2. 💬 Chat Staff - Pas d'autocomplétion @
**Symptômes:**
- Pas de suggestions de membres lors de la saisie de @
- Le placeholder mentionne @ mais la fonctionnalité n'existe pas

**Cause:**
- Fonctionnalité d'autocomplétion non implémentée

**Fichiers concernés:**
- `android-app/app/src/main/java/com/bagbot/manager/App.kt` (ligne 945-959)

### 3. 💬 Chat Staff - Chat privé invisible
**Symptômes:**
- Seul le chat global est visible
- Pas de sélection de membres pour chat privé

**Cause:**
- Le code existe (lignes 716-770) mais peut-être que les `members` ne contiennent pas les admins
- Besoin de vérifier ce qui est passé comme paramètre `members`

**Fichiers concernés:**
- `android-app/app/src/main/java/com/bagbot/manager/App.kt` (StaffChatScreen)

### 4. 👥 Gestion des Accès - Erreur null
**Symptômes:**
- "Erreur: null" affiché
- Pas de choix de membre possible
- Utilisateur affiché comme "membre inconnu"

**Cause:**
- Problème avec la récupération ou l'affichage des membres
- Peut-être une erreur dans l'API `/api/admin/allowed-users`

**Fichiers concernés:**
- `android-app/app/src/main/java/com/bagbot/manager/ui/screens/AdminScreen.kt` (lignes 48-61, 172-177, 376-378)

### 5. ⚙️ Système - Erreur 404 POST /api/counting
**Symptômes:**
```
X Erreur: HTTP 404:<!DOCTYPE html>
<pre>Cannot POST /api/counting</pre>
```

**Cause:**
- Route `/api/counting` n'existe pas dans le backend

**Fichiers concernés:**
- Backend: `/workspace/src/api-server.js` (route manquante)
- Frontend peut-être dans l'onglet Système

---

## 🔧 Solutions Proposées

### Solution 1: Corriger l'Inactivité

#### A) Backend - Vérifier la structure des données
Checker dans `/workspace/src/storage/jsonStore.js` la structure exacte de `inactivity`:
- Est-ce `kickAfterDays` ou `thresholdDays` ?
- Y a-t-il un champ `enabled` ?
- Y a-t-il une liste de `trackedUsers` ?

#### B) Frontend - Mise à jour App.kt (ligne 3540-3545)
```kotlin
"inactivity" -> {
    val obj = sectionData.jsonObject
    val enabled = obj["enabled"]?.jsonPrimitive?.booleanOrNull ?: false
    val kickAfterDays = obj["kickAfterDays"]?.jsonPrimitive?.intOrNull
    val thresholdDays = obj["thresholdDays"]?.jsonPrimitive?.intOrNull
    val days = kickAfterDays ?: thresholdDays
    val trackedCount = obj["trackedUsers"]?.jsonObject?.size ?: 0
    
    keyInfos.add("🔔 Statut" to if (enabled) "✅ Activé" else "❌ Désactivé")
    if (days != null) {
        keyInfos.add("⏰ Kick après" to "$days jours")
    }
    if (trackedCount > 0) {
        keyInfos.add("👥 Membres surveillés" to "$trackedCount membres")
    }
}
```

#### C) Frontend - Mise à jour de l'éditeur (ligne 4300-4333, 4615-4641)
Ajouter un switch pour activer/désactiver et afficher les membres trackés.

### Solution 2: Ajouter l'autocomplétion @ dans Chat Staff

#### Nouveau composant MentionTextField
```kotlin
@Composable
fun MentionTextField(
    value: String,
    onValueChange: (String) -> Unit,
    members: Map<String, String>,
    modifier: Modifier = Modifier,
    placeholder: @Composable (() -> Unit)? = null,
    enabled: Boolean = true
) {
    var showSuggestions by remember { mutableStateOf(false) }
    var suggestions by remember { mutableStateOf<List<Pair<String, String>>>(emptyList()) }
    var cursorPosition by remember { mutableStateOf(0) }
    
    // Détectersi @ est tapé
    LaunchedEffect(value) {
        val lastAtIndex = value.lastIndexOf('@')
        if (lastAtIndex >= 0) {
            val searchText = value.substring(lastAtIndex + 1).takeWhile { !it.isWhitespace() }
            if (searchText.length > 0) {
                suggestions = members.filter { (_, name) ->
                    name.contains(searchText, ignoreCase = true)
                }.toList().take(5)
                showSuggestions = suggestions.isNotEmpty()
            } else {
                showSuggestions = false
            }
        } else {
            showSuggestions = false
        }
    }
    
    Column {
        OutlinedTextField(
            value = value,
            onValueChange = onValueChange,
            modifier = modifier,
            placeholder = placeholder,
            enabled = enabled,
            maxLines = 4
        )
        
        if (showSuggestions) {
            Card(
                modifier = Modifier.fillMaxWidth(),
                colors = CardDefaults.cardColors(containerColor = Color(0xFF2A2A2A))
            ) {
                Column {
                    suggestions.forEach { (memberId, memberName) ->
                        TextButton(
                            onClick = {
                                val lastAtIndex = value.lastIndexOf('@')
                                val newText = value.substring(0, lastAtIndex) + "@$memberName "
                                onValueChange(newText)
                                showSuggestions = false
                            },
                            modifier = Modifier.fillMaxWidth()
                        ) {
                            Text("@$memberName", color = Color.White)
                        }
                    }
                }
            }
        }
    }
}
```

### Solution 3: Chat Privé - Vérifier les membres passés

Le code du chat privé existe déjà (lignes 716-770 de App.kt). Le problème est probablement que `members` ne contient pas les admins.

**Vérifier dans le code où StaffChatScreen est appelé:**
```kotlin
// Doit être:
StaffChatScreen(api, json, scope, snackbar, adminMembers, userInfo)
// Et NON:
StaffChatScreen(api, json, scope, snackbar, members, userInfo)
```

### Solution 4: Gestion des Accès - Corriger l'erreur null

#### A) Backend - Vérifier la route `/api/admin/allowed-users`
S'assurer qu'elle renvoie correctement les données.

#### B) Frontend - Améliorer la gestion d'erreur
```kotlin
LaunchedEffect(Unit) {
    isLoading = true
    try {
        val response = api.getJson("/api/admin/allowed-users")
        val data = json.parseToJsonElement(response).jsonObject
        allowedUsers = data["allowedUsers"]?.jsonArray?.mapNotNull {
            it.stringOrId()
        } ?: emptyList()
    } catch (e: Exception) {
        Log.e("AdminScreen", "Error loading allowed users", e)
        onShowSnackbar("❌ Erreur chargement: ${e.message ?: "Unknown"}")
    } finally {
        isLoading = false
    }
}
```

### Solution 5: Ajouter la route POST /api/counting au backend

#### A) Dans `/workspace/src/api-server.js`
```javascript
// ========== COUNTING ==========
app.post('/api/counting', requireAuth, express.json(), async (req, res) => {
  try {
    const { action, data } = req.body;
    
    // Actions possibles: reset, increment, etc.
    switch (action) {
      case 'reset':
        // Logique de reset du comptage
        res.json({ success: true, message: 'Comptage réinitialisé' });
        break;
      
      case 'increment':
        // Logique d'incrémentation
        res.json({ success: true, message: 'Comptage incrémenté' });
        break;
      
      default:
        res.status(400).json({ error: 'Action non reconnue' });
    }
  } catch (error) {
    console.error('[API] Error in /api/counting:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});
```

---

## 📝 Plan d'Action

### Priorité 1 (Critique)
1. ✅ Corriger l'inactivité (affichage + statut)
2. ✅ Corriger la route POST /api/counting
3. ✅ Corriger la gestion des accès (erreur null)

### Priorité 2 (Important)
4. ✅ Vérifier et corriger le chat privé (members)
5. ✅ Ajouter l'autocomplétion @ dans chat staff

### Priorité 3 (Amélioration)
6. Tests complets de toutes les fonctionnalités
7. Mise à jour de la documentation

---

## 🧪 Tests à Effectuer

### Test Inactivité
1. ✓ Activer l'inactivité avec un seuil de X jours
2. ✓ Vérifier que le statut affiche "✅ Activé"
3. ✓ Vérifier que le nombre de jours s'affiche
4. ✓ Vérifier que le nombre de membres trackés s'affiche

### Test Chat Staff
1. ✓ Ouvrir le chat staff
2. ✓ Taper @ et vérifier les suggestions
3. ✓ Sélectionner un membre dans les suggestions
4. ✓ Cliquer sur l'icône "People" pour voir les chats privés
5. ✓ Créer un chat privé avec un admin
6. ✓ Vérifier que les messages privés fonctionnent

### Test Gestion des Accès
1. ✓ Ouvrir Admin > Gestion des Accès
2. ✓ Vérifier qu'il n'y a pas d'erreur "null"
3. ✓ Vérifier que les membres s'affichent correctement
4. ✓ Ajouter un utilisateur
5. ✓ Retirer un utilisateur

### Test Système
1. ✓ Ouvrir Admin > Système
2. ✓ Vérifier qu'il n'y a pas d'erreur 404
3. ✓ Vérifier que les stats s'affichent
4. ✓ Tester les nettoyages

---

## 📦 Fichiers à Modifier

### Backend
- [ ] `/workspace/src/api-server.js` - Ajouter route POST /api/counting

### Frontend Android
- [ ] `/workspace/android-app/app/src/main/java/com/bagbot/manager/App.kt`
  - Ligne 3540-3560: Corriger affichage inactivité (keyInfos)
  - Ligne 4300-4373: Corriger éditeur inactivité
  - Ligne 4615-4641: Corriger UI éditeur inactivité
  - Ligne 945-959: Remplacer OutlinedTextField par MentionTextField
  - Ajouter nouveau composable MentionTextField

- [ ] `/workspace/android-app/app/src/main/java/com/bagbot/manager/ui/screens/AdminScreen.kt`
  - Ligne 48-61: Améliorer gestion d'erreur
  - Ligne 377: Améliorer affichage "Utilisateur inconnu"

---

## 🚀 Déploiement

Après corrections:
1. Commit des changements
2. Push vers GitHub
3. Nouveau tag v6.1.1
4. Build APK via GitHub Actions
5. Tests sur appareil réel
6. Release finale

---

**Date:** 23 Décembre 2025  
**Version cible:** 6.1.1
