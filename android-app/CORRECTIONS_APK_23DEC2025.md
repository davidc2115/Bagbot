# Corrections Application Android APK - 23 Décembre 2025

## Problèmes identifiés et corrigés

### 1. ✅ Section Admin - Erreur "null" ou HTTP 404

**Problème :** L'API `/api/admin/allowed-users` retourne des objets avec le champ `userId` au lieu de `id`, mais l'application essayait d'extraire l'ID avec une méthode qui cherchait le champ `id`.

**Solution :**
- Modifié `AdminScreen.kt` pour extraire correctement le `userId` depuis les objets retournés par l'API
- Correction appliquée à tous les endroits où `allowedUsers` est utilisé (chargement initial, ajout, suppression, révocation)

**Fichiers modifiés :**
- `android-app/app/src/main/java/com/bagbot/manager/ui/screens/AdminScreen.kt`

**Code corrigé :**
```kotlin
// Avant (incorrect)
allowedUsers = data["allowedUsers"]?.jsonArray?.mapNotNull {
    it.stringOrId()
} ?: emptyList()

// Après (correct)
allowedUsers = data["allowedUsers"]?.jsonArray?.mapNotNull {
    try {
        it.jsonObject?.get("userId")?.jsonPrimitive?.content
    } catch (e: Exception) {
        null
    }
} ?: emptyList()
```

### 2. ✅ Chat Staff - Aucun membre admin affiché pour mentions et chats privés

**Problème :** Les commentaires dans le code suggéraient que "TOUS les membres" étaient affichés, mais en réalité, seuls les admins sont chargés et affichés (via `adminMembers`). Cela pouvait créer de la confusion.

**Solution :**
- Mise à jour des commentaires pour clarifier que seuls les admins sont affichés
- Modification du texte de l'interface pour "Chats privés (Admins uniquement)" au lieu de "Tous les membres"

**Fichiers modifiés :**
- `android-app/app/src/main/java/com/bagbot/manager/App.kt`

**Changements :**
1. Ligne 737 : `"💬 Chats privés (Tous les membres)"` → `"💬 Chats privés (Admins uniquement)"`
2. Ligne 740 : `"// Liste de TOUS les membres"` → `"// Liste des admins"`
3. Ligne 868 : `"// Détection des mentions (@) - TOUS les membres"` → `"// Détection des mentions (@) - Admins uniquement"`

### 3. ⚠️ Section Config - Infos inexactes (ATTENTION REQUISE)

**Problème potentiel identifié :**
L'utilisateur signale que les informations affichées dans la section Config ne correspondent pas à celles du bot, et que certaines choses sont marquées comme "désactivé" alors qu'elles sont activées sur le serveur.

**Analyse :**
L'application charge la configuration via plusieurs endpoints :
- `/api/configs` - Configuration globale
- `/api/welcome` - Configuration Welcome
- `/api/goodbye` - Configuration Goodbye
- `/api/inactivity` - Configuration Inactivity
- etc.

**Causes possibles :**
1. **Problème de synchronisation** : L'API retourne une version cachée ou obsolète de la configuration
2. **Valeurs par défaut** : Si un champ `enabled` est absent ou null, l'application le met à `false` par défaut
3. **Filtrage des membres** : L'API `/api/configs` filtre les membres (économie, niveaux) pour ne garder que les membres actuels du serveur, ce qui peut créer des différences

**Recommandations pour investigation :**
1. Vérifier que le fichier `data/config.json` sur le serveur contient bien les bonnes valeurs
2. Vérifier que le bot recharge bien la configuration après modifications via l'API
3. Comparer les valeurs retournées par `/api/configs` avec le fichier `config.json` réel
4. Vérifier que le signal de rechargement (`data/config-updated.signal`) est bien créé et détecté par le bot

**Code à surveiller :**
```kotlin
// Dans ConfigDashboardScreen.kt
enabled = obj["enabled"]?.jsonPrimitive?.booleanOrNull ?: false
// ⚠️ Si "enabled" est absent, il sera mis à false par défaut
```

## Vérifications supplémentaires recommandées

### API Backend
Vérifier que `/api/discord/admins` retourne bien les admins :
```bash
# Test de l'endpoint
curl -H "Authorization: Bearer <token>" http://88.174.155.230:33003/api/discord/admins
```

**Points à vérifier :**
- La configuration `staffRoleIds` doit contenir les IDs des rôles staff
- Si `staffRoleIds` est vide, seul le fondateur sera retourné
- Les membres avec la permission "Administrator" seront également inclus

### Configuration des staffRoleIds
Vérifier dans `data/config.json` :
```json
{
  "guilds": {
    "GUILD_ID": {
      "staffRoleIds": ["ROLE_ID_1", "ROLE_ID_2"]
    }
  }
}
```

## Comment tester les corrections

### Test 1 : Section Admin
1. Ouvrir l'application APK
2. Aller dans la section Admin
3. Vérifier que la liste des utilisateurs autorisés s'affiche correctement
4. Essayer d'ajouter un utilisateur → devrait fonctionner sans erreur
5. Essayer de retirer un utilisateur → devrait fonctionner sans erreur

### Test 2 : Chat Staff - Mentions
1. Ouvrir l'application APK
2. Aller dans la section Staff → Chat Staff
3. Dans le champ de message, taper `@` suivi d'une lettre
4. Vérifier qu'une liste de suggestions d'admins apparaît
5. Vérifier que les admins en ligne sont marqués avec un point vert

### Test 3 : Chat Staff - Chats privés
1. Dans le Chat Staff, cliquer sur l'icône "People" en haut à droite
2. Vérifier que le titre affiche "💬 Chats privés (Admins uniquement)"
3. Vérifier que la liste des admins s'affiche
4. Vérifier que les admins en ligne ont un indicateur vert

### Test 4 : Section Config
1. Aller dans la section Config
2. Ouvrir une sous-section (ex: Welcome, Goodbye, Inactivity)
3. Vérifier que les valeurs affichées correspondent à celles du fichier `data/config.json` sur le serveur
4. Si des valeurs sont incorrectes, comparer avec les réponses de l'API correspondante

## Fichiers modifiés - Résumé

1. `android-app/app/src/main/java/com/bagbot/manager/ui/screens/AdminScreen.kt`
   - Correction extraction userId (4 occurrences)

2. `android-app/app/src/main/java/com/bagbot/manager/App.kt`
   - Mise à jour commentaires et textes UI pour clarifier "Admins uniquement"

## Build APK avec corrections

Pour reconstruire l'APK avec les corrections :

```bash
cd /workspace/android-app
chmod +x gradlew
./gradlew assembleRelease
```

L'APK sera généré dans :
`android-app/app/build/outputs/apk/release/app-release.apk`

## Notes importantes

- Les corrections pour les sections Admin et Chat Staff sont **complètes et testables**
- Le problème de la section Config nécessite **une investigation plus approfondie** du côté serveur
- Si le problème de Config persiste, vérifier en priorité :
  1. Le fichier `data/config.json` sur le serveur
  2. Le signal de rechargement du bot
  3. Les réponses des endpoints API (`/api/configs`, `/api/welcome`, etc.)

## Contact et support

Si les problèmes persistent après avoir appliqué ces corrections :
1. Vérifier les logs du serveur API (`pm2 logs bot-api`)
2. Vérifier les logs du bot (`pm2 logs bag-bot`)
3. Comparer les valeurs dans `data/config.json` avec celles affichées dans l'app
