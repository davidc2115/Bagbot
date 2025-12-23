# 🚀 Instructions Build & Release v5.9.18

## 📋 Vue d'ensemble

Cette version (5.9.18) contient les modifications suivantes :
- ✅ Retrait de l'onglet "Mot-Caché" de la navigation
- ✅ Retrait de la vignette "JSON Brut" dans Config
- ✅ Interface Android simplifiée

## 🛠️ Build de l'APK sur le Serveur

### Connexion au Serveur

```bash
ssh -p 33000 bagbot@88.174.155.230
cd /home/bagbot/Bag-bot
```

### Pull des Modifications

```bash
git pull origin main
```

### Build APK

```bash
cd android-app
./BUILD_APK.sh
```

**Durée estimée:** 5-10 minutes

**Résultat:** L'APK sera créé dans `BagBot-Manager-APK/BagBot-Manager-v5.9.18-android.apk`

---

## 📦 Création de la Release GitHub

### Méthode 1 : Script Automatique (Recommandé)

```bash
cd /home/bagbot/Bag-bot
./BUILD_AND_RELEASE_v5.9.18.sh
```

Ce script va :
1. ✅ Builder l'APK Android
2. ✅ Créer un commit avec les changements
3. ✅ Créer le tag v5.9.18
4. ✅ Pusher sur GitHub
5. ✅ Créer la release GitHub avec l'APK

---

### Méthode 2 : Manuelle

#### 1. Builder l'APK (voir ci-dessus)

#### 2. Créer le commit

```bash
git add android-app/app/build.gradle.kts
git add android-app/BUILD_APK.sh
git add android-app/app/src/main/java/com/bagbot/manager/App.kt
git add android-app/app/src/main/java/com/bagbot/manager/ui/screens/ConfigDashboardScreen.kt
git add BagBot-Manager-APK/BagBot-Manager-v5.9.18-android.apk

git commit -m "release: Android v5.9.18 - Interface simplifiée"
```

#### 3. Créer le tag

```bash
git tag -a v5.9.18 -m "Release v5.9.18 - Interface Android Simplifiée

🧹 Nettoyage Interface
- Retrait onglet Mot-Caché de la navigation
- Retrait vignette JSON Brut de Config
- Interface plus épurée

✅ Fonctionnalités Confirmées
- Autocomplétion @ fonctionnelle
- Conversations privées fonctionnelles

Version: 5.9.18
Version Code: 5918
"
```

#### 4. Push sur GitHub

```bash
git push origin main
git push origin v5.9.18
```

#### 5. Créer la release GitHub

**Avec GitHub CLI (`gh`) :**

```bash
gh release create v5.9.18 \
  BagBot-Manager-APK/BagBot-Manager-v5.9.18-android.apk \
  --title "BagBot Manager v5.9.18 - Interface Simplifiée" \
  --notes "## 🧹 Nettoyage Interface

- ✅ Retrait onglet Mot-Caché
- ✅ Retrait vignette JSON Brut
- ✅ Interface simplifiée

## ✅ Fonctionnalités

- Autocomplétion @ fonctionnelle
- Conversations privées fonctionnelles

## 📦 Installation

\`\`\`bash
adb install -r BagBot-Manager-v5.9.18-android.apk
\`\`\`
"
```

**Ou manuellement sur GitHub :**

1. Aller sur : `https://github.com/VOTRE_USERNAME/Bag-bot/releases/new`
2. Choisir le tag : `v5.9.18`
3. Titre : `BagBot Manager v5.9.18 - Interface Simplifiée`
4. Description : Copier depuis le fichier `CHANGELOG_v5.9.18.md` (à créer)
5. Uploader l'APK : `BagBot-Manager-APK/BagBot-Manager-v5.9.18-android.apk`
6. Publier la release

---

## 🔗 Obtenir le Lien de la Release

### Avec GitHub CLI

```bash
gh release view v5.9.18 --json url -q .url
```

### Manuellement

Format : `https://github.com/VOTRE_USERNAME/Bag-bot/releases/tag/v5.9.18`

---

## 📱 Distribution de l'APK

### Téléchargement Direct

L'APK sera disponible sur :
- GitHub Release : `https://github.com/VOTRE_USERNAME/Bag-bot/releases/tag/v5.9.18`
- URL directe : `https://github.com/VOTRE_USERNAME/Bag-bot/releases/download/v5.9.18/BagBot-Manager-v5.9.18-android.apk`

### Installation

1. **Sur Android :**
   - Télécharger l'APK depuis GitHub
   - Ouvrir le fichier
   - Autoriser "Sources inconnues" si demandé
   - Installer

2. **Via ADB (développement) :**
   ```bash
   adb install -r BagBot-Manager-v5.9.18-android.apk
   ```

---

## ✅ Checklist Complète

- [ ] Se connecter au serveur (SSH)
- [ ] Pull des modifications (`git pull origin main`)
- [ ] Build APK (`cd android-app && ./BUILD_APK.sh`)
- [ ] Vérifier APK créé (`ls -lh BagBot-Manager-APK/`)
- [ ] Créer commit + tag
- [ ] Push sur GitHub
- [ ] Créer release GitHub
- [ ] Tester téléchargement APK
- [ ] Tester installation sur Android
- [ ] Vérifier modifications (onglets retirés)

---

## 🎯 Commandes Rapides (Copy-Paste)

```bash
# Connexion + Build + Release (tout-en-un)
ssh -p 33000 bagbot@88.174.155.230 << 'EOF'
cd /home/bagbot/Bag-bot
git pull origin main
./BUILD_AND_RELEASE_v5.9.18.sh
EOF
```

---

## 📊 Informations Version

| Propriété | Valeur |
|-----------|--------|
| **Version** | 5.9.18 |
| **Version Code** | 5918 |
| **Min SDK** | 26 (Android 8.0) |
| **Target SDK** | 34 (Android 14) |
| **Taille APK** | ~15 MB |
| **Date** | 23 Décembre 2025 |

---

## 📚 Documentation Associée

- `MODIFICATIONS_ANDROID_23DEC2025.md` - Détails des modifications
- `RESUME_FINAL_JOURNEE_23DEC2025.md` - Résumé complet de la journée
- `COMMANDES_RAPIDES_23DEC2025.txt` - Commandes utiles
- `BUILD_AND_RELEASE_v5.9.18.sh` - Script automatique

---

## 💡 Dépannage

### Erreur "SDK location not found"

**Solution :** S'assurer que `ANDROID_HOME` est configuré sur le serveur :

```bash
echo $ANDROID_HOME
# Doit afficher : /path/to/android/sdk
```

Si vide, configurer :

```bash
export ANDROID_HOME=/usr/lib/android-sdk  # ou votre chemin
echo "export ANDROID_HOME=/usr/lib/android-sdk" >> ~/.bashrc
```

### Erreur "gh: command not found"

**Solution :** GitHub CLI pas installé. Créer la release manuellement via l'interface web.

### APK non signé

**Solution :** Vérifier que `bagbot-release.jks` existe dans `android-app/`

```bash
ls -l android-app/bagbot-release.jks
```

---

## 🎉 Félicitations !

Une fois la release créée, vous pouvez :

1. **Partager le lien** avec vos utilisateurs
2. **Tester l'APK** sur un dispositif Android
3. **Vérifier les modifications** (onglets retirés)

---

*Instructions créées le 23 Décembre 2025*
