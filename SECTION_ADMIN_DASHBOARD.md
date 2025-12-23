# 📊 Section Admin Dashboard - Documentation

**Date:** 23 Décembre 2025  
**Version:** v2.8+ Admin  
**Statut:** ✅ IMPLÉMENTÉ

---

## 🎯 Fonctionnalités Implémentées

### 1. Accès à la Section Admin

**Bouton dans le dashboard:** `⚙️ Admin`  
**Visible par:** Tous les administrateurs du serveur  
**Lien direct:** `http://VOTRE_IP:33002/#admin`

---

## 📊 Statistiques Affichées

### 1. 🧠 Mémoire RAM

**Carte principale:**
- Utilisation actuelle en MB
- Total alloué
- Barre de progression visuelle
- Pourcentage d'utilisation

**Détails complets:**
- **Heap Used**: Mémoire JavaScript utilisée
- **Heap Total**: Mémoire JavaScript totale allouée
- **RSS (Resident Set Size)**: Mémoire totale du processus
- **External**: Mémoire C++ liée à Node.js
- **Array Buffers**: Mémoire des buffers

**Utilité:**
- Détecter les fuites mémoire
- Voir si le bot a besoin d'un redémarrage
- Surveiller la performance

---

### 2. ⏱️ Uptime

**Informations:**
- Temps d'exécution formaté (ex: 2j 5h 30m 15s)
- Temps en secondes
- Mise à jour en temps réel

**Utilité:**
- Voir depuis combien de temps le bot tourne
- Vérifier la stabilité
- Planifier les maintenances

---

### 3. 💾 Backups

**Statistiques:**
- Nombre de backups horaires
- Espace disque utilisé (MB)
- Date et nom du dernier backup
- Taille du dernier backup

**Détails:**
- **Backups Horaires**: Créés toutes les heures, rétention 72h (3 jours)
- **Backups Externes**: Backups longue durée pour restaurations importantes
- Localisation: `/home/bagbot/Bag-bot/data/backups/`

**Utilité:**
- Vérifier que les sauvegardes fonctionnent
- Voir combien d'espace est utilisé
- Confirmer la date du dernier backup

---

### 4. ⚙️ Informations Processus

**Données:**
- PID (Process ID) du bot
- Version de Node.js
- Plateforme (linux, windows, etc.)

**Utilité:**
- Identifier le processus pour debug
- Vérifier la version de Node
- Informations système

---

## 🎛️ Actions Administrateur

### 1. 🔄 Redémarrer Bot

**Fonction:** Redémarre le bot via PM2  
**Durée:** 10-20 secondes d'indisponibilité  
**Confirmation:** Double confirmation de sécurité

**Utilisation:**
- Appliquer des modifications
- Résoudre des problèmes de mémoire
- Maintenance régulière

**Processus:**
1. Clic sur le bouton "Redémarrer Bot"
2. Confirmation de l'action
3. Redémarrage via PM2
4. Mise à jour automatique des stats après 10s

---

### 2. 🔄 Rafraîchir

**Fonction:** Recharge toutes les statistiques  
**Durée:** ~1 seconde  

**Utilisation:**
- Obtenir les données les plus récentes
- Vérifier après un redémarrage
- Surveillance continue

---

### 3. 📝 Voir Logs

**Fonction:** Affiche les 50 dernières lignes de logs du bot  
**Source:** Logs PM2 du processus `bagbot`  

**Contenu:**
- Messages du bot
- Erreurs éventuelles
- Actions importantes
- Système de monitoring

**Utilisation:**
- Diagnostiquer des problèmes
- Vérifier que tout fonctionne
- Voir les dernières actions

**Interface:**
- Affichage en mode console (monospace)
- Scrollable si nombreux logs
- Bouton "Fermer" pour masquer

---

### 4. 💾 Gérer Backups

**Fonction:** Redirige vers la section Backups complète  
**Accès:** Section existante du dashboard

**Fonctionnalités dans cette section:**
- Liste de tous les backups
- Restauration
- Suppression
- Détails de chaque backup

---

## 🔧 Routes API Utilisées

### GET `/api/admin/system-stats`

**Retourne:**
```json
{
  "success": true,
  "memory": {
    "heapUsed": "45.23",
    "heapTotal": "98.50",
    "rss": "120.45",
    "external": "2.34",
    "arrayBuffers": "0.50"
  },
  "uptime": {
    "seconds": 86400,
    "formatted": "1j 0h 0m 0s"
  },
  "pid": 12345,
  "platform": "linux",
  "nodeVersion": "v20.10.0"
}
```

---

### GET `/api/admin/backups-stats`

**Retourne:**
```json
{
  "success": true,
  "hourly": {
    "count": 48,
    "size": "27.50",
    "latest": {
      "name": "backup-2025-12-23T14-00-00.json",
      "date": "23/12/2025 14:00:00",
      "size": "570.26"
    },
    "oldest": {
      "name": "backup-2025-12-21T14-00-00.json",
      "date": "21/12/2025 14:00:00"
    }
  },
  "external": {
    "count": 15,
    "size": "8.50"
  }
}
```

---

### POST `/api/admin/restart-bot`

**Action:** Redémarre le bot via PM2  
**Commande:** `pm2 restart bagbot`

**Retourne:**
```json
{
  "success": true,
  "message": "Bot redémarré avec succès via PM2",
  "output": "..."
}
```

**Erreurs possibles:**
- PM2 non disponible
- Permissions insuffisantes
- Processus bagbot introuvable

---

### GET `/api/admin/recent-logs?lines=50`

**Paramètres:**
- `lines`: Nombre de lignes (défaut: 50)

**Action:** Récupère les logs via `pm2 logs bagbot --lines 50 --nostream --raw`

**Retourne:**
```json
{
  "success": true,
  "logs": "... contenu des logs ...",
  "timestamp": "2025-12-23T14:30:00.000Z"
}
```

---

## 🎨 Interface Visuelle

### Design

**Couleurs:**
- Mémoire: Orange/Tangerine (`#FF6B35`)
- Uptime: Vert (`#57F287`)
- Backups: Bleu Discord (`#5865F2`)
- Processus: Violet (`#9B59B6`)

**Style:**
- Cartes avec gradient
- Ombres portées
- Bordures subtiles
- Animations de transition

**Responsive:**
- Grid adaptatif
- Minimum 280px par carte
- S'adapte aux mobiles et tablettes

---

## 📱 Accès et Permissions

### Qui peut voir cette section ?

**Tous les administrateurs du serveur** ayant accès au dashboard.

La section est accessible via :
1. Clic sur le bouton `⚙️ Admin` dans la navigation
2. URL directe avec l'ancre `#admin`

### Sécurité

**Recommandations:**
- Limiter l'accès au dashboard (pare-feu, VPN, IP whitelist)
- Utiliser HTTPS en production
- Ne pas exposer le port 33002 publiquement
- Surveiller les accès aux logs

---

## 🔄 Utilisation Quotidienne

### Routine de Vérification (1 minute)

1. Ouvrir le dashboard → `⚙️ Admin`
2. Vérifier la mémoire (< 80% = OK)
3. Vérifier les backups (nombre et date récente)
4. Clic sur "Rafraîchir" si besoin

### En Cas de Problème

**Mémoire élevée (> 90%):**
1. Consulter les logs (`📝 Voir Logs`)
2. Redémarrer le bot si nécessaire

**Pas de backup récent:**
1. Vérifier les logs pour erreurs de backup
2. Vérifier l'espace disque sur le serveur
3. Vérifier le système de backup horaire

**Bot qui ne répond pas:**
1. Consulter les logs
2. Vérifier l'uptime
3. Redémarrer via le dashboard

---

## 🛠️ Maintenance

### Redémarrage Régulier

**Recommandé:** Une fois par semaine si l'uptime est > 7 jours

**Raisons:**
- Libérer la mémoire
- Appliquer des mises à jour
- Nettoyer les caches
- Maintenance préventive

**Procédure:**
1. Choisir un moment de faible activité
2. Avertir les utilisateurs (optionnel)
3. Dashboard → Admin → Redémarrer Bot
4. Attendre 10-20 secondes
5. Vérifier que tout fonctionne

---

## 📊 Interprétation des Métriques

### Mémoire RAM

| Utilisation | État | Action |
|------------|------|---------|
| < 50% | 🟢 Excellent | RAS |
| 50-70% | 🟡 Normal | Surveillance |
| 70-90% | 🟠 Attention | Surveiller de près |
| > 90% | 🔴 Critique | Redémarrer |

### Uptime

| Durée | État | Action |
|-------|------|---------|
| < 1j | 🟢 Normal | RAS |
| 1-7j | 🟢 Bon | RAS |
| 7-14j | 🟡 Considérer redémarrage | Optionnel |
| > 14j | 🟠 Redémarrage recommandé | Planifier |

### Backups

| Situation | État | Action |
|-----------|------|---------|
| > 24 backups | 🟢 Excellent | RAS |
| 12-24 backups | 🟢 Bon | RAS |
| 6-12 backups | 🟡 Attention | Vérifier système |
| < 6 backups | 🔴 Problème | Investiguer |

**Dernier backup:**
- < 2h : 🟢 Excellent
- 2-6h : 🟢 Normal
- 6-12h : 🟡 Attention
- > 12h : 🔴 Problème

---

## 🐛 Dépannage

### "Erreur lors du chargement des statistiques"

**Causes possibles:**
- Serveur dashboard non démarré
- Routes API non disponibles
- Problème réseau

**Solution:**
1. Vérifier que le serveur tourne : `pm2 status`
2. Redémarrer le dashboard : `pm2 restart dashboard`
3. Vérifier les logs du dashboard

---

### "Erreur: PM2 n'est pas disponible"

**Causes:**
- PM2 non installé
- PM2 non dans le PATH
- Permissions insuffisantes

**Solution:**
1. Vérifier PM2 : `pm2 --version`
2. Installer si besoin : `npm install -g pm2`
3. Redémarrer manuellement : `cd /home/bagbot/Bag-bot && pm2 restart bagbot`

---

### "Impossible de récupérer les logs"

**Causes:**
- PM2 non disponible
- Processus bagbot introuvable
- Logs vides

**Solution:**
1. Vérifier PM2 : `pm2 list`
2. Vérifier le nom du processus (doit être "bagbot")
3. Voir les logs manuellement : `pm2 logs bagbot`

---

## 📝 Fichiers Modifiés

### Backend (Serveur)

**Fichier:** `/workspace/dashboard-v2/server-v2.js`

**Routes ajoutées:**
- `GET /api/admin/system-stats` - Statistiques système
- `GET /api/admin/backups-stats` - Statistiques backups
- `POST /api/admin/restart-bot` - Redémarrage
- `GET /api/admin/recent-logs` - Logs récents

**Lignes ajoutées:** ~170 lignes

---

### Frontend (Dashboard)

**Fichier:** `/workspace/dashboard-v2/index.html`

**Modifications:**
1. **CSS** (ligne ~217): Style pour `.admin-btn.active`
2. **Navigation** (ligne ~452): Bouton "⚙️ Admin"
3. **HTML** (ligne ~2035): Section complète Admin
4. **Data** (ligne ~2355): Variables `adminStats`, `backupStats`, `showLogs`, etc.
5. **Methods** (ligne ~2747): Méthodes `loadAdminStats()`, `adminRestartBot()`, etc.

**Lignes ajoutées:** ~300 lignes

---

## 🎉 Résumé

**Ce qui a été ajouté:**
- ✅ Section Admin complète dans le dashboard
- ✅ Visualisation de la mémoire RAM (5 métriques)
- ✅ Affichage de l'uptime du bot
- ✅ Statistiques des backups (nombre, taille, dernier)
- ✅ Informations sur le processus (PID, Node version)
- ✅ Bouton redémarrage avec confirmation
- ✅ Affichage des logs récents (50 lignes)
- ✅ Boutons de rafraîchissement et navigation
- ✅ Messages de statut et retours visuels
- ✅ Design cohérent avec le reste du dashboard

**Accessible par:** Tous les administrateurs  
**Visible dans:** Dashboard V2 (port 33002)  
**Prêt à l'emploi:** Oui, après redémarrage du dashboard

---

## 🚀 Déploiement

### Étape 1: Redémarrer le Dashboard

```bash
ssh -p 33000 bagbot@88.174.155.230
cd /home/bagbot/Bag-bot/dashboard-v2
pm2 restart dashboard-v2
# OU si le nom est différent:
pm2 restart all
```

### Étape 2: Tester

1. Ouvrir le dashboard : `http://VOTRE_IP:33002`
2. Cliquer sur `⚙️ Admin`
3. Vérifier que les stats s'affichent
4. Tester le bouton "Rafraîchir"
5. Tester "Voir Logs"

### Étape 3: Utilisation

La section est maintenant prête à l'emploi !

---

*Documentation créée le 23 Décembre 2025*  
*Section Admin v1.0 - Dashboard v2.8+*
