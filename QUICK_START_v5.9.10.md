# ⚡ Quick Start - Version 5.9.10

**Date**: 22 Décembre 2025  
**Dépôt**: https://github.com/mel805/Bagbot

---

## 🎯 Déploiement Complet en 2 Commandes

### 1️⃣ Déployer les Commandes Discord (dont `/mot-cache`)

```bash
cd /workspace
bash deploy-discord-commands-direct.sh
```

**⏱️ Durée**: 2 minutes + 10 minutes de synchronisation Discord

---

### 2️⃣ Créer la Release Android v5.9.10

```bash
cd /workspace
bash create-release-v5.9.10.sh
```

**⏱️ Durée**: 1 minute + 7 minutes de compilation automatique sur GitHub

---

## 🔗 Lien de la Release

Une fois le script exécuté, la release sera disponible ici:

### 🎯 https://github.com/mel805/Bagbot/releases/tag/v5.9.10

**L'APK sera téléchargeable directement depuis cette page !**

---

## 📥 Téléchargement Direct de l'APK

Après la compilation (7 minutes), l'APK sera disponible à:

```
https://github.com/mel805/Bagbot/releases/download/v5.9.10/BagBot-Manager-v5.9.10.apk
```

---

## ✅ Que Fait Chaque Script ?

### Script 1: `deploy-discord-commands-direct.sh`

1. ✅ Se connecte à la Freebox via SSH
2. ✅ Déploie toutes les commandes Discord (~94 commandes)
3. ✅ Inclut la commande `/mot-cache`
4. ✅ Vérifie que le déploiement a réussi

**Résultat**: La commande `/mot-cache` sera disponible sur Discord après 10 minutes

---

### Script 2: `create-release-v5.9.10.sh`

1. ✅ Vérifie l'état Git
2. ✅ Crée un tag `v5.9.10`
3. ✅ Pousse le tag vers GitHub
4. ✅ Déclenche le workflow GitHub Actions
5. ✅ GitHub compile l'APK automatiquement (7 min)
6. ✅ GitHub crée la release avec l'APK

**Résultat**: Une release GitHub avec l'APK prêt à télécharger

---

## 🐛 Corrections Incluses dans v5.9.10

### 1. URL Placeholder (33002 → 33003)
- ✅ Les admins voient maintenant le bon port dans l'application

### 2. Erreur JsonObject Résolue
- ✅ Plus de crash lors de la configuration Mot-Caché
- ✅ Nouvelle fonction `strOrId()` pour gérer les formats API

### 3. Commande Discord `/mot-cache`
- ✅ Vérifiée et prête à être déployée

---

## 📊 Timeline Complète

| Étape | Action | Durée | Commande |
|-------|--------|-------|----------|
| 1 | Déployer Discord | 2 min | `bash deploy-discord-commands-direct.sh` |
| 2 | Sync Discord | 10 min | (Automatique) |
| 3 | Créer Release | 1 min | `bash create-release-v5.9.10.sh` |
| 4 | Build GitHub | 7 min | (Automatique) |
| 5 | Télécharger APK | 1 min | Depuis GitHub |
| **TOTAL** | | **~21 min** | |

---

## 🔍 Vérifications Rapides

### Vérifier le déploiement Discord
```bash
ssh -p 33000 bagbot@88.174.155.230 'cd /home/bagbot/Bag-bot && node verify-commands.js'
```

### Vérifier le workflow GitHub
```
https://github.com/mel805/Bagbot/actions
```

### Tester la commande Discord
1. Attendre 10 minutes après le déploiement
2. Ouvrir Discord
3. Taper `/mot-cache`
4. ✅ La commande apparaît

---

## 📱 Distribution de l'APK

Une fois l'APK téléchargé depuis GitHub:

1. ✅ Tester sur un appareil Android
2. ✅ Vérifier que le placeholder affiche 33003
3. ✅ Tester la config Mot-Caché (pas d'erreur)
4. ✅ Distribuer aux utilisateurs

---

## 🎉 C'est Tout !

**Deux commandes suffisent pour tout déployer:**

```bash
# Discord
bash deploy-discord-commands-direct.sh

# Android
bash create-release-v5.9.10.sh
```

**Puis:**
- 📥 Télécharger l'APK: https://github.com/mel805/Bagbot/releases/tag/v5.9.10
- 🎮 Tester `/mot-cache` sur Discord

---

**Questions ?** Consultez: `INSTRUCTIONS_DEPLOIEMENT_V5.9.10.md`
