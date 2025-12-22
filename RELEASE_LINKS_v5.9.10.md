# 🔗 Liens de la Release v5.9.10

**Dépôt GitHub**: https://github.com/mel805/Bagbot

---

## 📦 Release Android v5.9.10

### 🎯 Lien Direct de la Release
```
https://github.com/mel805/Bagbot/releases/tag/v5.9.10
```

### 📥 Téléchargement Direct de l'APK
```
https://github.com/mel805/Bagbot/releases/download/v5.9.10/BagBot-Manager-v5.9.10.apk
```

---

## 📊 Suivi du Workflow

### GitHub Actions
```
https://github.com/mel805/Bagbot/actions
```

### Workflow Build Android APK
```
https://github.com/mel805/Bagbot/actions/workflows/build-android.yml
```

---

## 🚀 Pour Créer la Release

### Méthode 1: Script Automatisé (Recommandé)
```bash
cd /workspace
bash create-release-v5.9.10.sh
```

### Méthode 2: Commandes Manuelles
```bash
cd /workspace

# Créer le tag
git tag -a v5.9.10 -m "Release v5.9.10 - Fixes URL & JsonObject"

# Pousser le tag
git push origin v5.9.10
```

---

## ⏱️ Timeline

| Étape | Durée | Lien |
|-------|-------|------|
| Push du tag | Instantané | - |
| Workflow GitHub Actions | 5-7 min | [Actions](https://github.com/mel805/Bagbot/actions) |
| Release créée | Automatique | [Release v5.9.10](https://github.com/mel805/Bagbot/releases/tag/v5.9.10) |

**Total: ~7 minutes** après avoir poussé le tag

---

## 📱 APK Details

- **Nom**: `BagBot-Manager-v5.9.10.apk`
- **Version**: 5.9.10 (versionCode: 5910)
- **Taille**: ~15-25 MB
- **Min SDK**: Android 8.0 (API 26)
- **Target SDK**: Android 14 (API 34)

---

## ✨ Ce qui est inclus dans cette Release

### 🐛 Corrections Critiques

1. **URL Placeholder Fixé**
   - Port 33002 → 33003
   - Fichier: `App.kt` ligne 3636

2. **Erreur JsonObject Résolue**
   - Nouvelle fonction `strOrId()` pour gérer les deux formats API
   - Fichier: `ConfigDashboardScreen.kt`
   - Plus de crash lors de la config Mot-Caché

3. **Canaux de Notification**
   - Support du format string: `"123456789"`
   - Support du format object: `{"id": "123456789", ...}`

### 📋 Fichiers Modifiés

- `android-app/app/src/main/java/com/bagbot/manager/App.kt`
- `android-app/app/src/main/java/com/bagbot/manager/ui/screens/ConfigDashboardScreen.kt`
- `android-app/app/build.gradle.kts`
- `.github/workflows/build-android.yml`

---

## 🎮 Commande Discord `/mot-cache`

### Déploiement

Pour déployer la commande Discord:

```bash
cd /workspace
bash deploy-discord-commands-direct.sh
```

### Vérification

```bash
ssh -p 33000 bagbot@88.174.155.230 'cd /home/bagbot/Bag-bot && node verify-commands.js'
```

### Test

1. Attendre 10 minutes après le déploiement
2. Ouvrir Discord
3. Taper `/mot-cache`
4. ✅ La commande apparaît

---

## 📞 Support

Pour toute question ou problème:

1. Consulter: `INSTRUCTIONS_DEPLOIEMENT_V5.9.10.md`
2. Vérifier les logs: `pm2 logs bagbot`
3. Consulter les Actions GitHub: https://github.com/mel805/Bagbot/actions

---

**Créé le**: 22 Décembre 2025  
**Status**: ⏳ En attente du push du tag

Une fois le tag `v5.9.10` poussé, la release sera automatiquement créée à:
### 🎯 https://github.com/mel805/Bagbot/releases/tag/v5.9.10
