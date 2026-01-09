# Analyse des bugs du système de comptage - 3 janvier 2026

## Problèmes identifiés

### 1. ⚠️ **Bug critique : Remise à zéro involontaire**

**Localisation :** `src/bot.js` lignes 12802-12810

**Problème :**
Le système ignore silencieusement les messages contenant des lettres OU sans chiffres, mais **ne les supprime pas**. Ces messages restent visibles dans le channel et peuvent perturber la séquence de comptage.

```javascript
// Code actuel (lignes 12804-12810)
if (/[a-zA-Z]/.test(raw)) {
  return;  // ← Ignore mais ne supprime pas le message
}
if (!/\d/.test(onlyDigitsAndOps)) {
  return;  // ← Ignore mais ne supprime pas le message
}
```

**Conséquence :** Les utilisateurs peuvent écrire n'importe quoi dans le channel de comptage, ce qui :
- Pollue le channel
- Rend difficile de suivre la progression
- Peut créer de la confusion sur le numéro attendu

### 2. ⚠️ **Absence de protection du channel**

**Problème :**
Actuellement, le bot n'empêche pas les messages non-numériques dans les channels de comptage. Il les ignore simplement, mais ils restent visibles.

**Solution requise :**
- Supprimer automatiquement tout message qui n'est pas un calcul valide
- Informer l'utilisateur (via message éphémère ou DM) que seuls les calculs sont autorisés

### 3. ⚠️ **Limitation : Un seul channel de comptage partagé**

**Localisation :** `src/storage/jsonStore.js` lignes 1749-1754

**Problème actuel :**
```javascript
function ensureCountingShape(g) {
  if (!g.counting || typeof g.counting !== 'object') g.counting = {};
  const c = g.counting;
  if (!Array.isArray(c.channels)) c.channels = [];  // ← Array de channels
  if (typeof c.allowFormulas !== 'boolean') c.allowFormulas = true;
  if (!c.state || typeof c.state !== 'object') c.state = { current: 0, lastUserId: '' };  // ← UN SEUL state partagé !
  // ...
}
```

**Le problème :** Tous les channels configurés partagent le **même état** (`state: { current: 0, lastUserId: '' }`).

Si vous configurez 2 channels :
- Channel #comptage-1 : devrait compter 1, 2, 3...
- Channel #comptage-2 : devrait compter 1, 2, 3...

**Mais actuellement :**
- Quelqu'un écrit "1" dans #comptage-1 → state.current = 1
- Quelqu'un écrit "2" dans #comptage-2 → state.current = 2
- Quelqu'un écrit "3" dans #comptage-1 → state.current = 3
- **Résultat : Les deux channels comptent ensemble au lieu de séparément !**

### 4. ⚠️ **Bug potentiel : Race condition sur l'état**

**Localisation :** `src/bot.js` lignes 12848-12860

Le code récupère l'état, le modifie, puis le sauvegarde. Si deux personnes postent en même temps, il peut y avoir une race condition qui fait perdre des données.

## Solutions à implémenter

### Solution 1 : Suppression des messages invalides
- Ajouter `message.delete()` pour les messages non-valides
- Optionnellement : envoyer un DM à l'utilisateur pour expliquer

### Solution 2 : Protection stricte du channel
- Supprimer immédiatement tout message qui n'est pas un calcul valide
- Ajouter une réaction ❌ avant suppression (feedback visuel)

### Solution 3 : Support de channels multiples indépendants
**Architecture proposée :**
```javascript
// Au lieu de :
g.counting = {
  channels: ['123', '456'],
  state: { current: 0, lastUserId: '' }  // ← UN state pour TOUS
}

// Utiliser :
g.counting = {
  channels: {
    '123': {  // channelId
      allowFormulas: true,
      state: { current: 0, lastUserId: '' },
      achievedNumbers: []
    },
    '456': {  // autre channelId
      allowFormulas: true,
      state: { current: 0, lastUserId: '' },
      achievedNumbers: []
    }
  }
}
```

### Solution 4 : Protection contre race conditions
Utiliser un système de lock ou de queue pour garantir que les modifications d'état sont séquentielles.

## Plan d'action

1. ✅ Créer backup complet
2. 🔄 Modifier `ensureCountingShape` pour supporter plusieurs channels
3. 🔄 Migrer les données existantes vers le nouveau format
4. 🔄 Adapter la logique de comptage pour traiter chaque channel séparément
5. 🔄 Ajouter suppression automatique des messages invalides
6. 🔄 Tester les correctifs

---

**Note importante :** Ces modifications nécessitent une migration de données. Le bot doit être arrêté pendant la migration pour éviter toute perte de données.
