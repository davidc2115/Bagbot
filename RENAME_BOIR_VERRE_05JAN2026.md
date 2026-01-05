# ✅ Renommage boire → boir-verre + Déploiement - 5 janvier 2026

**Date :** 5 janvier 2026 16:14:29  
**Statut :** ✅ Renommé et déployé  
**Bot :** En ligne (PID: 386021)  
**Sauvegarde :** backup_rename_boir_verre_20260105_161429

---

## 🎯 Demande

1. Renommer la commande de `/boire` à `/boir-verre`
2. La commande n'apparaissait pas sur le serveur Discord

---

## ✅ Modifications appliquées

### 1. Fichier renommé

**Avant :** `src/commands/boire.js`  
**Après :** `src/commands/boir-verre.js`

### 2. Nom de la commande modifié

```javascript
// Avant
.setName('boire')

// Après
.setName('boir-verre')
```

### 3. Handler mis à jour dans bot.js

```javascript
// Avant
if (interaction.commandName === 'boire') {
  return handleEconomyAction(interaction, 'boire');
}

// Après
if (interaction.commandName === 'boir-verre') {
  return handleEconomyAction(interaction, 'boire');
}
```

**Note :** Le handler appelle toujours `'boire'` comme clé interne car c'est le nom dans la configuration (jsonStore.js, config.json). Seul le nom de la commande Discord a changé.

---

## 🚀 Déploiement des commandes Discord

**Problème identifié :** Les commandes slash n'avaient pas été déployées sur Discord.

**Solution appliquée :**
- Exécuté le script `deploy-batch-guild.js` sur le serveur
- Toutes les commandes ont été déployées sur la guilde
- ✅ `boir-verre` confirmé dans la liste des commandes déployées

**Résultat du déploiement :**
```
✅ boir-verre (boir-verre.js)
```

100 commandes chargées et déployées sur le serveur Discord.

---

## 🧪 Tests à effectuer

### Sur Discord

1. **Tapez `/` dans le chat**
   - La liste des commandes doit s'afficher
   - Cherchez `/boir-verre`
   - ✅ La commande doit apparaître

2. **Testez la commande :**
```
/boir-verre @quelqu'un
/boir-verre @quelqu'un type:Bière
```

**Résultat attendu :**
- ✅ La commande fonctionne
- ✅ Autocomplete pour `type` avec 12 boissons
- ✅ Messages aléatoires affichés
- ✅ Récompenses : 5-15 BAG$ + 2 charme + 8 XP

---

### Dans /config

```
/config → Économie → Actions → Boire un verre
```

**Vérifications :**
- ✅ L'action "boire" (clé interne) apparaît toujours
- ✅ Tous les paramètres sont visibles
- ✅ Modifiable

**Note :** Dans `/config`, l'action s'appelle toujours "boire" (c'est la clé interne). Seule la commande slash Discord s'appelle maintenant `/boir-verre`.

---

### Dans l'app Android

```
Économie → Actions → 🍺 Boire un verre
```

**Vérifications :**
- ✅ L'action apparaît toujours
- ✅ Label : "🍺 Boire un verre"
- ✅ Tous les paramètres visibles

**Note :** L'app Android utilise la clé interne "boire", donc pas de changement visible dans l'app.

---

## 📋 Qu'est-ce qui a changé et ce qui reste pareil ?

### ✅ Ce qui a changé

| Élément | Avant | Après |
|---------|-------|-------|
| Fichier de commande | `boire.js` | `boir-verre.js` |
| Nom de la commande Discord | `/boire` | `/boir-verre` |
| Commande visible sur Discord | ❌ Non déployée | ✅ Déployée |

### ✅ Ce qui reste pareil

| Élément | Valeur |
|---------|--------|
| Clé interne (jsonStore, config.json) | `boire` |
| Handler dans handleEconomyAction | `'boire'` |
| Label dans /config | "boire un verre" |
| Label dans l'app Android | "🍺 Boire un verre" |
| Paramètres (argent, karma, XP, etc.) | Inchangés |

---

## 🔍 Pourquoi la commande n'apparaissait pas ?

**Cause :** Les commandes slash Discord doivent être **déployées** sur Discord pour être visibles.

Les commandes slash ne sont pas automatiquement visibles juste en créant le fichier. Il faut :
1. Créer le fichier de commande (✅ fait)
2. Le bot doit charger la commande au démarrage (✅ fait)
3. **Déployer les commandes sur l'API Discord** (❌ manquait)

**Solution :** Exécution du script `deploy-batch-guild.js` qui enregistre toutes les commandes auprès de Discord.

**Résultat :** La commande `/boir-verre` est maintenant visible dans la liste des commandes Discord.

---

## 📦 Sauvegarde

**Localisation :** `/home/bagbot/Bag-bot/backups/backup_rename_boir_verre_20260105_161429`

Contient :
- `src/commands/` (avec l'ancien `boire.js`)
- `src/bot.js` (avec l'ancien handler)

**Restaurer si besoin :**
```bash
ssh -p 33000 bagbot@88.174.155.230
cd /home/bagbot/Bag-bot
cp -r backups/backup_rename_boir_verre_20260105_161429/commands/* src/commands/
cp backups/backup_rename_boir_verre_20260105_161429/bot.js src/
pkill -f 'node.*bot.js'
nohup node src/bot.js > bot.log 2>&1 &
# Puis redéployer les commandes :
node deploy-batch-guild.js
```

---

## ✅ Vérifications finales

**Sur la Freebox :**
- ✅ Bot en ligne (PID: 386021)
- ✅ Fichier `boir-verre.js` présent
- ✅ Ancien fichier `boire.js` supprimé
- ✅ bot.js mis à jour
- ✅ Commandes déployées sur Discord

**Sur Discord :**
- ✅ Commande `/boir-verre` visible dans la liste
- 🧪 À tester : Exécution de la commande

**Dans /config et l'app Android :**
- ✅ Aucun changement (utilisent la clé interne "boire")

---

## 🎓 Leçon apprise

**Important :** Quand on crée une nouvelle commande slash :

1. ✅ Créer le fichier dans `src/commands/`
2. ✅ Ajouter le handler dans `bot.js`
3. ✅ Redémarrer le bot
4. ✅ **DÉPLOYER LES COMMANDES DISCORD** avec un script de déploiement

Sans l'étape 4, la commande existe dans le code mais n'est **pas visible** sur Discord !

---

**🍺 La commande /boir-verre est maintenant disponible sur Discord ! Testez-la ! 🍺**
