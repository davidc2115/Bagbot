# 🔥 ACTION REQUISE - Redémarrage du Bot

## Problème Identifié

Le code pour initialiser `actions.list` a été ajouté dans `src/storage/jsonStore.js` (v6.1.18), **MAIS** le serveur du bot Discord n'a **PAS été redémarré**.

Donc la fonction `ensureEconomyShape()` qui initialise `actions.list` utilise **toujours l'ancien code** qui ne contenait pas cette initialisation.

## Solution

**Vous DEVEZ redémarrer le bot serveur Discord** pour que le nouveau code s'applique.

### Méthode 1 : Redémarrage Manuel

```bash
# Sur votre serveur de production
pm2 restart bagbot
# OU
pm2 restart all
# OU si vous n'utilisez pas PM2
pkill -f "node.*bot.js" && nohup node src/bot.js &
```

### Méthode 2 : Utiliser le script safe-restart

```bash
cd /workspace
bash safe-restart-bot.sh
```

### Méthode 3 : Via le Dashboard/Bot

Si vous avez une commande `/bot restart` ou similaire dans votre bot Discord, utilisez-la.

## Vérification

Après le redémarrage, vous pouvez vérifier que `actions.list` est bien initialisée :

1. **Via l'endpoint debug** (j'ai ajouté) :
   ```
   GET https://votre-serveur/api/debug/actions
   ```
   
   Devrait retourner :
   ```json
   {
     "count": 56,
     "keys": ["branler", "calin", "caress", "caught", ...],
     "sample": [
       { "key": "daily", "label": "💰 Daily", "description": "..." },
       { "key": "work", "label": "💼 Travailler", "description": "..." },
       ...
     ]
   }
   ```

2. **Via l'application Android** :
   - Ouvrez l'app (v6.1.18)
   - Allez dans Config > Actions
   - Ouvrez le dropdown "Sélectionner une action"
   - ✅ Vous devriez voir les 56 actions avec leurs labels

## Script de Mise à Jour Forcée (Si Nécessaire)

Si après le redémarrage le problème persiste, vous pouvez **forcer la mise à jour** du fichier config.json en exécutant sur votre serveur de production :

```bash
cd /chemin/vers/bagbot
node force-update-actions-list.js
```

Ce script va :
1. Charger config.json
2. Ajouter toutes les actions dans `economy.actions.list`
3. Sauvegarder config.json

## Fichiers Modifiés

- ✅ `src/storage/jsonStore.js` : Initialisation de `actions.list` (v6.1.18)
- ✅ `src/api-server.js` : Endpoint debug `/api/debug/actions` (v6.1.19)
- ✅ `force-update-actions-list.js` : Script de mise à jour forcée (v6.1.19)

## État Actuel

| Composant | État | Action Requise |
|-----------|------|----------------|
| Code serveur | ✅ Déployé | ⚠️ **REDÉMARRAGE NÉCESSAIRE** |
| APK Android v6.1.18 | ✅ Disponible | ✅ Prêt à l'emploi |
| Configuration | ⚠️ Ancienne version | ⚠️ Sera mise à jour au redémarrage |

---

**RÉSUMÉ** : Le code est prêt. **Redémarrez simplement le bot** et tout fonctionnera! 🚀
