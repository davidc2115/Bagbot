# 🔄 Nouveau Système de Backup & Nettoyage - Implémenté

📅 **Date** : 22 Décembre 2025, 23:44  
✅ **Statut** : Opérationnel

---

## 🎯 Objectifs Accomplis

### 1. ✅ Nettoyage Automatique des Utilisateurs Partis
Les utilisateurs qui ont quitté le serveur sont maintenant automatiquement supprimés des données.

### 2. ✅ Système de Sauvegarde Horaire
- Sauvegarde toutes les heures
- Rétention de 3 jours (72 heures)
- Suppression automatique des anciens backups

---

## 📋 Fonctionnalités

### 🧹 Nettoyage Automatique

**Quand ?**
- **Automatique** : Tous les jours à **3h du matin**
- **Manuel** : Via la commande `/cleanup` (admin uniquement)

**Que nettoie-t-il ?**
- `economy.balances` : Soldes BAG$ des utilisateurs partis
- `stats` : XP et niveaux des utilisateurs partis
- `geo.locations` : Localisations des utilisateurs partis
- `inactivity.members` : Données d'inactivité
- `truthdare.participants` : Participants action/vérité

**Sécurité** :
- Vérifie en temps réel qui est sur le serveur via l'API Discord
- Ne supprime QUE les utilisateurs absents
- Log détaillé de chaque suppression

### 💾 Système de Backup Horaire

**Fréquence**
- **Automatique** : Toutes les heures (au démarrage du bot + chaque heure)
- Premier backup : Immédiat au démarrage

**Rétention**
- Conservation : **72 heures** (3 jours)
- Nettoyage automatique : **Toutes les 6 heures**

**Localisation**
```
/home/bagbot/Bag-bot/data/backups/hourly/
```

**Format des fichiers**
```
backup-2025-12-22T22-44-22.json
```

**Structure des backups**
```json
{
  "_meta": {
    "created_at": "2025-12-22T22:44:22.102Z",
    "created_timestamp": 1766443462102,
    "guilds": 1,
    "users": 412,
    "version": "1.0",
    "retention_hours": 72
  },
  "guilds": { ... },
  "economy": { ... }
}
```

**Sécurités**
- ⚠️ **Bloque** la sauvegarde si < 10 utilisateurs détectés
- ✅ **Vérifie** la structure avant chaque backup
- 💾 **Crée** un backup de sécurité avant toute restauration

---

## 🎮 Commandes Disponibles

### `/cleanup` (Admin uniquement)

Nettoie manuellement les données des utilisateurs qui ont quitté.

**Retour :**
```
🧹 Nettoyage des Données

📊 Utilisateurs vérifiés: 450
🗑️  Utilisateurs supprimés: 38
👥 Membres actuels: 412

📝 Exemples d'utilisateurs supprimés:
• @User123 (economy.balances) - 5000 BAG$
• @User456 (stats) - 1500 XP
• @User789 (geo.locations) - Paris, France
```

### `/restore` (Admin uniquement)

Restaure depuis un backup (fonctionne avec les nouveaux backups horaires)

**Améliorations** :
- Affiche maintenant le **nombre d'utilisateurs** dans chaque backup
- ⚠️ **Avertit** si un backup contient < 50 utilisateurs
- 🔴 **Bloque** la restauration si < 10 utilisateurs
- 💾 Crée un backup de sécurité avant restore

---

## 📊 Statistiques Actuelles

### Premier Backup Créé
```
✅ Sauvegarde créée
   Fichier: backup-2025-12-22T22-44-22.json
   Taille: 570.26 KB
   Serveurs: 1
   Utilisateurs: 412
   Durée: 746ms
```

### Nettoyage Programmé
```
Nettoyage automatique programmé pour 23 Déc 2025 03:00:00
```

---

## 🔧 Fichiers Créés

### Nouveaux Fichiers
1. **`src/utils/userCleanup.js`**
   - Logique de nettoyage des utilisateurs
   - Fonctions: `cleanLeftUsers()`, `cleanAllGuilds()`

2. **`src/storage/hourlyBackupSystem.js`**
   - Système de backup horaire
   - Gestion automatique des anciens backups

3. **`src/commands/cleanup.js`**
   - Commande slash `/cleanup`
   - Interface pour nettoyage manuel

### Fichiers Modifiés
1. **`src/bot.js`**
   - Intégration du système de backup horaire au démarrage
   - Programmation du nettoyage quotidien à 3h

---

## 🚀 Fonctionnement en Production

### Au Démarrage du Bot
```
[Bot] Storage initialized
[Bot] ✅ Système de backup horaire démarré (rétention: 3 jours)
[HourlyBackup] 🚀 Démarrage du système de sauvegarde horaire
[HourlyBackup] Rétention: 72h (3 jours)
[HourlyBackup] ✅ Système démarré
[HourlyBackup] ✅ Sauvegarde créée
[Bot] Nettoyage automatique programmé pour 23 Déc 2025 03:00:00
```

### Toutes les Heures
```
[HourlyBackup] ✅ Sauvegarde créée
   Fichier: backup-2025-12-22T23-00-00.json
   Taille: 570.45 KB
   Serveurs: 1
   Utilisateurs: 415
```

### Toutes les 6 Heures
```
[HourlyBackup] 🧹 Nettoyage des anciens backups...
   Conservés: 18 backups
   Supprimés: 5 backups
```

### Tous les Jours à 3h
```
[Bot] === NETTOYAGE AUTOMATIQUE DES UTILISATEURS ===
[UserCleanup] Démarrage nettoyage pour ServerName (1234567890)
[UserCleanup] 425 membres actuels sur le serveur
[UserCleanup] Vérification de 450 utilisateurs dans economy
[UserCleanup] ✅ Nettoyage terminé:
   Utilisateurs vérifiés: 450
   Utilisateurs supprimés: 25
   Membres actuels: 425
```

---

## 📈 Avantages

### Performance
- ✅ Base de données plus légère
- ✅ Moins de données inutiles
- ✅ Recherches plus rapides

### Sécurité
- ✅ Backups réguliers et fiables
- ✅ Rétention courte (pas de surcharge disque)
- ✅ Protection contre restaurations dangereuses

### Maintenance
- ✅ Automatique - aucune intervention requise
- ✅ Logs détaillés pour suivi
- ✅ Nettoyage automatique des vieux backups

---

## 🔍 Vérification

### Voir les Backups Actuels
```bash
ls -lh /home/bagbot/Bag-bot/data/backups/hourly/
```

### Compter les Backups
```bash
ls /home/bagbot/Bag-bot/data/backups/hourly/ | wc -l
```

### Voir les Métadonnées d'un Backup
```bash
jq "._meta" /home/bagbot/Bag-bot/data/backups/hourly/backup-2025-12-22T22-44-22.json
```

### Logs du Système
```bash
pm2 logs bagbot --lines 100 | grep -E "HourlyBackup|UserCleanup|Cleanup"
```

---

## ⚙️ Configuration

### Modifier la Rétention
Dans `src/storage/hourlyBackupSystem.js` :
```javascript
this.retentionHours = 72; // 3 jours (modifiable)
```

### Modifier l'Heure de Nettoyage
Dans `src/bot.js` :
```javascript
next3AM.setHours(3, 0, 0, 0); // 3h du matin (modifiable)
```

### Modifier la Fréquence de Backup
Dans `src/storage/hourlyBackupSystem.js` :
```javascript
60 * 60 * 1000  // 1 heure (modifiable)
```

---

## 🆘 En Cas de Problème

### Restaurer Manuellement
1. Arrêter le bot : `pm2 stop bagbot`
2. Copier le backup : 
   ```bash
   cp /home/bagbot/Bag-bot/data/backups/hourly/backup-XXXX.json /home/bagbot/Bag-bot/data/config.json
   ```
3. Redémarrer : `pm2 start bagbot`

### Désactiver le Système de Backup
Commenter les lignes dans `src/bot.js` :
```javascript
// global.hourlyBackupSystem = new HourlyBackupSystem();
// global.hourlyBackupSystem.start();
```

### Désactiver le Nettoyage Automatique
Commenter l'appel dans `src/bot.js` :
```javascript
// scheduleDailyCleanup();
```

---

## 📝 Notes Importantes

1. **Les backups horaires sont DIFFÉRENTS des backups externes**
   - Hourly : `/data/backups/hourly/` (72h)
   - External : `/data/backups/external-hourly/` (plus longue rétention)

2. **Le nettoyage est SÉCURISÉ**
   - Vérifie en temps réel via Discord API
   - Ne supprime QUE les utilisateurs absents
   - Logs détaillés de chaque action

3. **Les backups sont VALIDÉS**
   - Vérifie le nombre d'utilisateurs
   - Bloque si trop peu d'utilisateurs
   - Crée un backup de sécurité avant restore

---

## ✅ Résumé

| Fonctionnalité | Fréquence | Statut |
|----------------|-----------|--------|
| Backup automatique | Toutes les heures | ✅ Actif |
| Nettoyage backups | Toutes les 6h | ✅ Actif |
| Nettoyage users | Quotidien (3h) | ✅ Programmé |
| Commande /cleanup | Manuel | ✅ Disponible |
| Rétention backups | 3 jours (72h) | ✅ Configuré |

---

**🎉 Système opérationnel et testé !**

Premier backup créé : `backup-2025-12-22T22-44-22.json` (570 KB, 412 users)  
Prochain nettoyage : 23 Décembre 2025 à 03:00  
Prochain backup : Dans 1 heure
