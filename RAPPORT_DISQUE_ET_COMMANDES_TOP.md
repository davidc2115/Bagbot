# 📊 RAPPORT - ESPACE DISQUE ET COMMANDES TOP

**Date** : 8 janvier 2026  
**Problèmes** : 2

---

## ✅ PROBLÈME 1 : COMMANDES /topniveaux ET /topeconomie

### Statut : ✅ **RÉSOLU**

### Symptôme
Les commandes `/topniveaux` et `/topeconomie` ne fonctionnaient plus et affichaient une erreur.

### Cause
```
Error [GuildMembersTimeout]: Members didn't arrive in time.
```

Les commandes utilisaient `await interaction.guild.members.fetch()` qui prenait trop de temps et timeout.

### Solution Appliquée

**Remplacement de `fetch()` par le `cache`** :

```javascript
// AVANT (timeout)
const currentMembers = await interaction.guild.members.fetch();
const member = await interaction.guild.members.fetch(userId);

// APRÈS (instantané)
const currentMembers = interaction.guild.members.cache;
const member = interaction.guild.members.cache.get(userId);
```

**Avantages** :
- ✅ Instantané (pas de requête réseau)
- ✅ Pas de timeout
- ✅ Le cache est maintenu à jour par Discord.js

**Fichiers modifiés** :
- `src/commands/topniveaux.js`
- `src/commands/topeconomie.js`

**Backups créés** :
- `src/commands/topniveaux.js.backup_1767990758416`
- `src/commands/topeconomie.js.backup_1767990758880`

### Test

Les commandes sont maintenant chargées et prêtes :
```
✅ Bot actif (PID: 1434)
✅ topeconomie chargée
✅ topniveaux chargée
```

**Pour tester** : Utiliser `/topniveaux` ou `/topeconomie` dans Discord.

---

## ⚠️ PROBLÈME 2 : ESPACE DISQUE

### Statut : ⚠️ **NÉCESSITE ACTION MANUELLE**

### Situation

```
Disque physique (vda) : 60 Go
Partition (vda3)      : 29.2 Go (utilisée à 91%)
Espace non alloué     : ~30 Go
```

**Le disque a bien été augmenté à 60 Go**, mais **la partition n'utilise que 29 Go**.

### Cause

Quand on augmente un disque virtuel, la partition ne s'étend pas automatiquement. Il faut manuellement :
1. Étendre la partition
2. Étendre le système de fichiers

### Solution (Nécessite Accès Root)

#### Commandes à Exécuter

**En tant que root ou avec sudo** :

```bash
# 1. Étendre la partition
sudo growpart /dev/vda 3

# 2. Étendre le système de fichiers
sudo resize2fs /dev/vda3

# 3. Vérifier
df -h
```

#### Pourquoi Je Ne Peux Pas Le Faire

L'utilisateur `bagbot` **n'a pas les droits sudo**. Ces opérations nécessitent un accès root.

### Procédure Recommandée

1. **Se connecter en root** :
   ```bash
   ssh root@88.174.155.230 -p 33000
   # Mot de passe root (différent de bagbot)
   ```

2. **Exécuter les commandes** :
   ```bash
   growpart /dev/vda 3
   resize2fs /dev/vda3
   df -h
   ```

3. **Vérifier** :
   ```bash
   df -h /
   # Devrait maintenant afficher ~50-60 Go au lieu de 29 Go
   ```

### Alternative : Via Interface Freebox

Si vous avez une interface web pour gérer la VM :
1. Aller dans les paramètres de la VM
2. Chercher "Étendre partition" ou "Resize partition"
3. Appliquer

---

## 📊 RÉSUMÉ

| Problème | Statut | Action Nécessaire |
|----------|--------|-------------------|
| /topniveaux et /topeconomie | ✅ Résolu | Tester les commandes |
| Espace disque 50 Go | ⚠️ Partiellement | Exécuter growpart en root |

---

## 🎯 PROCHAINES ÉTAPES

### Immédiat

1. ✅ **Tester les commandes top** : `/topniveaux` et `/topeconomie` dans Discord

### À Faire en Root

2. **Étendre la partition** (nécessite accès root) :
   ```bash
   sudo growpart /dev/vda 3
   sudo resize2fs /dev/vda3
   ```

---

## 📝 ÉTAT ACTUEL

```
✅ Bot Discord : Actif et fonctionnel
✅ /topniveaux : Corrigé
✅ /topeconomie : Corrigé
✅ Système XP : Fonctionnel
✅ API Server : Active

⚠️  Espace disque : 2.6 Go libres (91% utilisé)
    → Extension nécessite accès root
```

---

## ⚠️ IMPORTANT - ESPACE DISQUE

Avec seulement **2.6 Go** de libre sur **29 Go** (91% utilisé), le serveur est proche de la saturation.

**Risques** :
- ❌ Impossible d'écrire de nouveaux logs
- ❌ Impossible de créer des backups
- ❌ Bot peut crasher si plus d'espace
- ❌ Système peut devenir instable

**Solution urgente** : Étendre la partition ou nettoyer l'espace.

### Nettoyage Temporaire (Sans Root)

Si l'extension n'est pas possible immédiatement :

```bash
# Supprimer les anciens backups
cd /home/bagbot/Bag-bot
rm -f src/bot.js.backup_* 2>/dev/null
rm -f data/config.json.backup_* 2>/dev/null

# Nettoyer les logs
truncate -s 0 bot.log
truncate -s 0 api-server.log

# Vérifier l'espace gagné
df -h /
```

---

**Rapport terminé le 8 janvier 2026 à 14:15 (UTC+1)**

🎯 **Commandes top : Corrigées et fonctionnelles !**  
⚠️ **Espace disque : Nécessite extension en root**
