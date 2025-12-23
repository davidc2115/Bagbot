# 🎯 Système de Monitoring et Maintenance - App Android

**Date:** 23 Décembre 2025  
**Version:** 6.0.0  
**Commit:** 498c441  
**Branche:** cursor/p-kin-compilation-6-0-0-c791

---

## 📋 Vue d'Ensemble

L'application Android BagBot Manager dispose maintenant d'un **système complet de monitoring et de maintenance** accessible dans l'onglet Admin. Cette fonctionnalité permet de surveiller l'état du serveur et de maintenir le bot en bon état de fonctionnement directement depuis votre téléphone.

---

## ✨ Fonctionnalités Ajoutées

### 1. 📊 **Monitoring Système**

#### **Mémoire RAM**
- Affichage de l'usage en temps réel
- Total, utilisé, libre (en GB)
- Pourcentage d'utilisation
- Barre de progression colorée :
  - 🟢 Vert : < 70%
  - 🟠 Orange : 70-90%
  - 🔴 Rouge : > 90%

#### **Processeur (CPU)**
- Nombre de cœurs
- Modèle du processeur
- Temps de fonctionnement (uptime)

#### **Disque**
- Espace total
- Espace utilisé
- Espace libre
- Pourcentage d'utilisation
- Barre de progression colorée

---

### 2. 📁 **Gestion des Fichiers**

#### **Backups**
- 📊 Nombre de fichiers de backup
- 💾 Taille totale en MB
- 🧹 Bouton de nettoyage
- ✅ Garde les 10 backups les plus récents
- ❌ Supprime automatiquement les plus anciens

#### **Logs**
- 📊 Nombre de fichiers de logs
- 💾 Taille totale en MB
- 🧹 Bouton de nettoyage
- ✅ Garde les logs récents
- ❌ Supprime les logs de plus de 7 jours

#### **Fichiers Temporaires**
- 📊 Nombre de fichiers temporaires
- 💾 Taille totale en MB
- 🧹 Bouton de nettoyage
- ✅ Nettoie uploads temporaires
- ❌ Supprime les fichiers de plus de 1 jour

#### **Cache**
- 📊 Affichage de la taille du cache
- 💾 Fichiers de configuration actifs
- ℹ️ Information uniquement (pas de nettoyage)

---

### 3. 🧹 **Fonctions de Maintenance**

#### **Nettoyage Individuel**
Chaque catégorie (backups, logs, temp) possède son propre bouton :
- ⚡ Nettoyage ciblé
- ⏱️ Indicateur de chargement pendant le traitement
- ✅ Message de confirmation avec détails
- 📊 Affiche : nombre de fichiers supprimés + espace libéré

#### **Nettoyage Complet**
Bouton rouge "Tout Nettoyer" :
- 🗑️ Nettoie logs, backups ET fichiers temporaires
- ⚠️ Dialogue de confirmation obligatoire
- 📊 Rapport complet après nettoyage
- ✨ Actualisation automatique des statistiques

#### **Sécurité**
- ⚠️ Dialogue de confirmation pour chaque action
- 🔒 Impossible de cliquer deux fois (désactivé pendant traitement)
- 🔄 Actualisation automatique après chaque opération

---

## 🔧 Backend (API)

### Nouveaux Endpoints

#### 1. **GET /api/system/stats**
Récupère toutes les statistiques système :

```json
{
  "memory": {
    "total": 16106127360,
    "free": 4294967296,
    "used": 11811160064,
    "usagePercent": 73.3,
    "totalGB": "15.00",
    "usedGB": "11.00",
    "freeGB": "4.00"
  },
  "cpu": {
    "model": "Intel(R) Core(TM) i7-9750H",
    "cores": 12
  },
  "uptime": {
    "seconds": 345678,
    "formatted": "4j 0h 1m"
  },
  "disk": {
    "total": "233G",
    "used": "128G",
    "free": "93G",
    "usagePercent": "58%"
  },
  "backups": {
    "count": 15,
    "totalSize": 524288000,
    "totalSizeMB": "500.00"
  },
  "logs": {
    "count": 42,
    "totalSize": 104857600,
    "totalSizeMB": "100.00"
  },
  "cache": {
    "totalSize": 10485760,
    "totalSizeMB": "10.00"
  },
  "temp": {
    "count": 87,
    "totalSize": 209715200,
    "totalSizeMB": "200.00"
  }
}
```

#### 2. **POST /api/system/cleanup/logs**
Nettoie les logs anciens (> 7 jours)

**Réponse :**
```json
{
  "success": true,
  "deletedCount": 15,
  "freedSpace": 52428800,
  "freedSpaceMB": "50.00"
}
```

#### 3. **POST /api/system/cleanup/backups**
Garde les 10 backups les plus récents, supprime le reste

**Réponse :**
```json
{
  "success": true,
  "deletedCount": 5,
  "keptCount": 10,
  "freedSpace": 104857600,
  "freedSpaceMB": "100.00"
}
```

#### 4. **POST /api/system/cleanup/temp**
Nettoie les fichiers temporaires (> 1 jour)

**Réponse :**
```json
{
  "success": true,
  "deletedCount": 45,
  "freedSpace": 157286400,
  "freedSpaceMB": "150.00"
}
```

#### 5. **POST /api/system/cleanup/all**
Nettoie tout en une seule fois

**Réponse :**
```json
{
  "success": true,
  "results": {
    "logs": { "deletedCount": 15, "freedSpaceMB": "50.00" },
    "backups": { "deletedCount": 5, "freedSpaceMB": "100.00" },
    "temp": { "deletedCount": 45, "freedSpaceMB": "150.00" }
  },
  "totalFreedMB": "300.00",
  "totalDeletedCount": 65
}
```

---

## 📱 Interface Android

### Navigation

1. Ouvrir l'application BagBot Manager
2. Aller dans l'onglet **Admin**
3. Sélectionner l'onglet **⚙️ Système**

### Structure de l'Écran

```
┌─────────────────────────────────────┐
│  ⚙️ Système & Maintenance   🔄      │
│  Monitoring et nettoyage            │
└─────────────────────────────────────┘

┌─────────────────────────────────────┐
│  💾 Mémoire RAM                     │
│  ████████░░░░ 73%                   │
│  11.00 GB utilisés                  │
│  Total: 15.00 GB                    │
└─────────────────────────────────────┘

┌─────────────────────────────────────┐
│  💻 Processeur & Uptime             │
│  CPU: 12 cœurs                      │
│  Uptime: 4j 0h 1m                   │
└─────────────────────────────────────┘

┌─────────────────────────────────────┐
│  💿 Disque                          │
│  ████████████░░ 58%                 │
│  Utilisé: 128G    58%               │
│  Total: 233G | Libre: 93G          │
└─────────────────────────────────────┘

━━━━ Gestion des Fichiers ━━━━

┌─────────────────────────────────────┐
│  🔄 Backups         [🧹 Nettoyer]   │
│  15 fichiers                        │
│  500.00 MB                          │
│  Garde les 10 plus récents          │
└─────────────────────────────────────┘

┌─────────────────────────────────────┐
│  📄 Logs            [🧹 Nettoyer]   │
│  42 fichiers                        │
│  100.00 MB                          │
│  Supprime les logs > 7 jours        │
└─────────────────────────────────────┘

┌─────────────────────────────────────┐
│  🗑️ Fichiers Temporaires            │
│  87 fichiers        [🧹 Nettoyer]   │
│  200.00 MB                          │
│  Supprime les fichiers > 1 jour     │
└─────────────────────────────────────┘

┌─────────────────────────────────────┐
│  🗄️ Cache                           │
│  10.00 MB                           │
│  Fichiers de configuration actifs   │
└─────────────────────────────────────┘

┌─────────────────────────────────────┐
│  ⚠️ Nettoyage Complet               │
│  Nettoie logs, backups et fichiers  │
│  temporaires                        │
│                                     │
│  [🗑️ Tout Nettoyer]                 │
└─────────────────────────────────────┘
```

---

## ✅ Bénéfices

### 🛡️ **Prévention de la Corruption**
- Nettoyage régulier évite l'accumulation de fichiers corrompus
- Surveillance de l'espace disque
- Détection précoce des problèmes de mémoire

### ⚡ **Performance**
- Libération d'espace disque
- Suppression des fichiers temporaires inutiles
- Garde seulement les backups nécessaires

### 🔧 **Maintenance Simplifiée**
- Pas besoin d'accès SSH
- Interface intuitive depuis le téléphone
- Actions en un clic avec confirmation

### 📊 **Visibilité**
- État du système en temps réel
- Alertes visuelles (couleurs)
- Suivi de l'évolution des ressources

---

## 🧪 Tests Recommandés

### Test 1 : Monitoring

1. Ouvrir l'onglet Système
2. Vérifier l'affichage des statistiques
3. Cliquer sur le bouton 🔄 Refresh
4. Vérifier que les données se mettent à jour

### Test 2 : Nettoyage Logs

1. Cliquer sur "Nettoyer" dans la carte Logs
2. Confirmer dans le dialogue
3. Vérifier le message de succès
4. Vérifier que le nombre de logs diminue

### Test 3 : Nettoyage Backups

1. Cliquer sur "Nettoyer" dans la carte Backups
2. Confirmer dans le dialogue
3. Vérifier que seuls 10 backups restent
4. Vérifier l'espace libéré

### Test 4 : Nettoyage Complet

1. Cliquer sur "Tout Nettoyer"
2. Lire le message de confirmation
3. Confirmer l'action
4. Vérifier le rapport complet
5. Vérifier que toutes les stats sont mises à jour

---

## 📝 Notes Techniques

### Sécurité

- ✅ Tous les endpoints nécessitent une authentification (`requireAuth`)
- ✅ Seuls les admins peuvent accéder à ces fonctions
- ✅ Confirmations obligatoires avant toute action destructive
- ✅ Les fichiers critiques (configuration active) ne sont jamais supprimés

### Optimisations

- ⚡ Chargement asynchrone des statistiques
- ⚡ Actualisation automatique après nettoyage
- ⚡ Indicateurs visuels pendant le traitement
- ⚡ Gestion d'erreurs robuste

### Limitations

- 🔒 Cache (data.json actif) : affichage uniquement, pas de nettoyage
- ⏱️ Statistiques disque : utilise la commande `df` (Linux uniquement)
- 📊 Backups : garde toujours 10 fichiers minimum

---

## 🔄 Déploiement

### Sur le Serveur de Production

```bash
cd /home/bagbot/Bag-bot
git pull origin main
pm2 restart bagbot
```

### Installation de l'APK

1. **Télécharger** l'APK v6.0.0 depuis la release GitHub
2. **Transférer** sur votre appareil Android
3. **Installer** (autoriser sources inconnues si nécessaire)
4. **Ouvrir** l'application
5. **Se connecter** via Discord OAuth
6. **Accéder** à Admin > Système

---

## 📊 Fichiers Modifiés

```
src/api-server.js                               (+330 lignes)
└── Nouveaux endpoints API system/*

android-app/app/src/main/java/                  (+661 lignes)
com/bagbot/manager/ui/screens/AdminScreen.kt
└── Nouvel onglet SystemTab avec UI complète

BagBot-Manager-APK/
BagBot-Manager-v6.0.0-android.apk              (recompilé)
└── APK mis à jour avec nouvelles fonctionnalités
```

---

## 🎉 Conclusion

Le système de monitoring et maintenance est maintenant **pleinement fonctionnel** dans l'application Android. Les administrateurs peuvent :

- ✅ **Surveiller** l'état du serveur en temps réel
- ✅ **Nettoyer** les fichiers inutiles
- ✅ **Prévenir** les corruptions et bugs
- ✅ **Maintenir** le bot en bon état
- ✅ **Gérer** tout depuis leur téléphone

Cette fonctionnalité améliore significativement la stabilité et la maintenabilité du bot BagBot ! 🚀

---

*Documentation créée le 23 Décembre 2025*
