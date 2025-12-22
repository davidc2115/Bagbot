# 🚀 Instructions de Déploiement - Version 5.9.10

**Date**: 22 Décembre 2025  
**Status**: ✅ Prêt pour déploiement

---

## 📋 Résumé des Corrections

### ✅ Application Android v5.9.10

**Problème 1**: URL bloquée sur 33002
- ✅ **Corrigé**: Placeholder mis à jour vers 33003

**Problème 2**: Erreur JsonObject dans la config admin
- ✅ **Corrigé**: Nouvelle fonction `strOrId()` ajoutée

**Fichiers modifiés**:
- `android-app/app/src/main/java/com/bagbot/manager/App.kt`
- `android-app/app/src/main/java/com/bagbot/manager/ui/screens/ConfigDashboardScreen.kt`
- `android-app/app/build.gradle.kts` (version 5.9.9 → 5.9.10)
- `.github/workflows/build-android.yml` (release notes mis à jour)

### ✅ Commande Discord `/mot-cache`

**Problème**: Commande non accessible
- ✅ **Vérifié**: Le fichier `src/commands/mot-cache.js` existe et est syntaxiquement correct
- ⏳ **Action requise**: Déployer les commandes sur le serveur Discord

---

## 🎯 Étape 1: Déployer les Commandes Discord

### Option A: Via Script Automatisé (Recommandé)

J'ai créé un script pour vous:

```bash
cd /workspace
bash deploy-discord-commands-direct.sh
```

Le script va:
1. Se connecter à la Freebox via SSH (il vous demandera le mot de passe)
2. Déployer toutes les commandes Discord (~94 commandes)
3. Vérifier que le déploiement a réussi

**⏱️ Durée**: 2 minutes + 10 minutes de synchronisation Discord

### Option B: Manuellement via SSH

Si vous préférez le faire manuellement:

```bash
ssh -p 33000 bagbot@88.174.155.230
cd /home/bagbot/Bag-bot
node deploy-commands.js
```

### ✅ Vérification

Après le déploiement:

```bash
ssh -p 33000 bagbot@88.174.155.230 'cd /home/bagbot/Bag-bot && node verify-commands.js'
```

**Résultat attendu**:
```
📊 État actuel des commandes Discord
================================================================================
🌐 Commandes GLOBALES (MP): 47
🏰 Commandes GUILD (Serveur): 46
✅ AUCUN DOUBLON - Tout est OK !
```

### 🎮 Test sur Discord

1. Attendez **10 minutes** après le déploiement
2. Ouvrez Discord (redémarrez l'application si elle était déjà ouverte)
3. Tapez `/mot-cache` dans un canal
4. La commande devrait apparaître dans l'autocomplétion ✅

---

## 🎯 Étape 2: Créer la Release Android v5.9.10

### Option A: Via Script Automatisé (Recommandé)

J'ai créé un script qui va tout faire automatiquement:

```bash
cd /workspace
bash create-release-v5.9.10.sh
```

Le script va:
1. ✅ Vérifier l'état du dépôt Git
2. ✅ Créer un tag annotated `v5.9.10`
3. ✅ Pousser le tag vers GitHub
4. ✅ Déclencher le workflow GitHub Actions
5. ✅ Compiler l'APK Android (automatiquement)
6. ✅ Créer une release GitHub avec l'APK

**⏱️ Durée totale**: 
- Script: 1 minute
- Workflow GitHub: 5-10 minutes

### Option B: Manuellement

Si vous préférez le faire manuellement:

```bash
cd /workspace

# 1. Créer le tag
git tag -a v5.9.10 -m "Release v5.9.10 - Fixes URL & JsonObject"

# 2. Pousser le tag
git push origin v5.9.10
```

Cela déclenchera automatiquement le workflow GitHub Actions.

---

## 🔗 Liens de Suivi

### GitHub Actions

Après avoir poussé le tag, surveillez le workflow ici:
```
https://github.com/VOTRE_USERNAME/VOTRE_REPO/actions
```

Le workflow s'appelle: **"Build Android APK"**

### Page des Releases

Une fois le workflow terminé, la release sera disponible ici:
```
https://github.com/VOTRE_USERNAME/VOTRE_REPO/releases/tag/v5.9.10
```

L'APK sera nommé: **`BagBot-Manager-v5.9.10.apk`**

---

## 📊 Timeline Complète

| Étape | Action | Durée | Statut |
|-------|--------|-------|--------|
| **1** | Corrections code Android | - | ✅ Terminé |
| **2** | Déploiement Discord | 2 min | ⏳ À faire |
| **3** | Synchronisation Discord | 10 min | ⏳ Automatique |
| **4** | Création tag Git | 1 min | ⏳ À faire |
| **5** | Workflow GitHub Actions | 7 min | ⏳ Automatique |
| **6** | Release GitHub créée | - | ⏳ Automatique |
| **7** | Test commande Discord | 2 min | ⏳ À faire |
| **8** | Téléchargement APK | 1 min | ⏳ À faire |
| **9** | Distribution APK | Variable | ⏳ À faire |
| **TOTAL** | | **~23 min** | |

---

## ✅ Checklist de Déploiement

### Phase 1: Commandes Discord
- [ ] Exécuter `deploy-discord-commands-direct.sh` OU se connecter en SSH
- [ ] Déployer les commandes (`node deploy-commands.js`)
- [ ] Vérifier le déploiement (`node verify-commands.js`)
- [ ] Attendre 10 minutes
- [ ] Tester `/mot-cache` sur Discord

### Phase 2: Application Android
- [ ] Exécuter `create-release-v5.9.10.sh` OU créer le tag manuellement
- [ ] Vérifier que le workflow GitHub Actions démarre
- [ ] Attendre la fin de la compilation (~7 minutes)
- [ ] Vérifier que la release est créée sur GitHub
- [ ] Télécharger l'APK depuis GitHub

### Phase 3: Distribution
- [ ] Tester l'APK sur un appareil Android
- [ ] Vérifier que le placeholder affiche 33003
- [ ] Tester la configuration Mot-Caché (section Admin)
- [ ] Vérifier que les canaux se sauvent sans erreur
- [ ] Distribuer l'APK aux utilisateurs

---

## 🐛 Dépannage

### Problème: La commande Discord n'apparaît toujours pas

**Solution 1**: Attendre plus longtemps
- Discord peut prendre jusqu'à 15 minutes pour synchroniser

**Solution 2**: Vider le cache Discord
- Windows: Supprimer `%AppData%\Discord\Cache`
- Mac: Supprimer `~/Library/Application Support/Discord/Cache`
- Linux: Supprimer `~/.config/discord/Cache`

**Solution 3**: Redémarrer le bot
```bash
ssh -p 33000 bagbot@88.174.155.230
pm2 restart bagbot
```

### Problème: Le workflow GitHub échoue

**Solution 1**: Vérifier les logs
- Aller sur la page Actions GitHub
- Cliquer sur le workflow qui a échoué
- Lire les logs pour identifier l'erreur

**Solution 2**: Ré-exécuter le workflow
- Cliquer sur "Re-run all jobs" sur la page du workflow

### Problème: L'APK ne se compile pas

**Vérifier**:
- [ ] Java 17 est installé
- [ ] Android SDK 34 est disponible
- [ ] Le fichier `bagbot-release.jks` existe dans `android-app/`

---

## 📞 Support

Si vous rencontrez des problèmes:

1. **Logs Discord Bot**:
   ```bash
   ssh -p 33000 bagbot@88.174.155.230
   pm2 logs bagbot --lines 100
   ```

2. **Logs GitHub Actions**:
   - Aller sur la page Actions de votre dépôt
   - Cliquer sur le workflow concerné

3. **Vérification des fichiers**:
   ```bash
   cd /workspace
   git status
   git log --oneline -5
   ```

---

## 📄 Documentation Créée

Pour référence future:

1. **CHANGELOG_v5.9.10.md** - Changelog détaillé des corrections
2. **GUIDE_DEPLOIEMENT_MOT_CACHE.md** - Guide spécifique pour la commande mot-cache
3. **CORRECTIONS_22DEC2025_V5.9.10.md** - Résumé complet des modifications
4. **create-release-v5.9.10.sh** - Script automatisé pour créer la release
5. **deploy-discord-commands-direct.sh** - Script automatisé pour déployer Discord
6. **INSTRUCTIONS_DEPLOIEMENT_V5.9.10.md** - Ce document

---

## 🎉 Commandes Rapides

### Tout Déployer en Une Fois

```bash
# 1. Discord
bash deploy-discord-commands-direct.sh

# 2. Android (attendre la fin de Discord)
bash create-release-v5.9.10.sh

# 3. Vérifier Discord (après 10 minutes)
ssh -p 33000 bagbot@88.174.155.230 'cd /home/bagbot/Bag-bot && node verify-commands.js'
```

### Vérification Complète

```bash
# Vérifier le statut Git
git status

# Vérifier les tags
git tag -l "v5.9*"

# Vérifier les commandes Discord
ssh -p 33000 bagbot@88.174.155.230 'cd /home/bagbot/Bag-bot && node verify-commands.js'

# Vérifier le workflow GitHub
gh run list --limit 5  # (si vous avez gh CLI installé)
```

---

**Auteur**: Cursor AI Assistant  
**Date**: 22 Décembre 2025  
**Version**: 5.9.10  

**Status**: ✅ Prêt pour déploiement

---

## 🎯 Résumé en 3 Commandes

```bash
# 1️⃣ Déployer Discord (2 min + 10 min sync)
bash deploy-discord-commands-direct.sh

# 2️⃣ Créer la Release Android (1 min + 7 min build)
bash create-release-v5.9.10.sh

# 3️⃣ Obtenir le lien de la release
echo "https://github.com/$(git config --get remote.origin.url | sed 's/.*github.com[:/]\(.*\)\.git/\1/')/releases/tag/v5.9.10"
```

**C'est tout ! 🚀**
