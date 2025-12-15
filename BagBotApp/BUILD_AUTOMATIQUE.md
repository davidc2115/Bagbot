# 🚀 Build Automatique de l'APK - BAG Bot Dashboard

## ✨ Méthode Recommandée : GitHub Actions (AUTOMATIQUE)

Un workflow GitHub Actions a été configuré pour compiler automatiquement l'APK.

### 📋 Étapes Simples

#### 1. Créer un Tag de Version

```bash
cd /workspace
git add .
git commit -m "Prepare release v1.1.1"
git tag v1.1.1
git push origin v1.1.1
```

#### 2. Le Build se Lance Automatiquement

- GitHub Actions détecte le nouveau tag
- Compile l'APK (10-15 minutes)
- Crée une release avec l'APK attaché

#### 3. Télécharger l'APK

- Allez sur https://github.com/mel805/Bagbot/releases
- Téléchargez le fichier `bagbot-dashboard-v1.1.1.apk`

### 🎯 Avantages

- ✅ Aucune configuration locale nécessaire
- ✅ Build reproductible et fiable
- ✅ APK automatiquement signé
- ✅ Publication automatique sur GitHub
- ✅ Pas besoin de compte Expo

---

## 🔧 Alternative : Build Local avec EAS (MANUEL)

Si vous préférez compiler localement :

### Prérequis

```bash
# Installer EAS CLI
npm install -g eas-cli

# Se connecter (créez un compte gratuit sur expo.dev si nécessaire)
eas login
```

### Build

```bash
cd /workspace/BagBotApp

# Configurer le projet (première fois seulement)
eas build:configure

# Lancer le build
eas build --platform android --profile production
```

**Temps:** 10-20 minutes  
**Résultat:** Lien de téléchargement de l'APK sur expo.dev

---

## 📱 Alternative : Build Local avec Gradle (AVANCÉ)

Pour les développeurs expérimentés avec Android Studio installé :

### Prérequis

- Android Studio
- Android SDK (API 35)
- Build Tools 35.0.0
- Java JDK 17+

### Build

```bash
cd /workspace/BagBotApp

# Installer les dépendances
npm install

# Prébuild natif
npx expo prebuild --platform android --clean

# Compiler l'APK
cd android
./gradlew assembleRelease
```

**Résultat:** `android/app/build/outputs/apk/release/app-release.apk`

---

## 🎉 Méthode la Plus Simple

**Utilisez GitHub Actions!** C'est la méthode la plus simple et la plus fiable.

1. Créez un tag git
2. Attendez 15 minutes
3. Téléchargez l'APK depuis les releases

Aucune configuration locale, aucune dépendance à installer!

---

## 🐛 Problèmes Courants

### Le workflow GitHub Actions ne démarre pas

- Vérifiez que le fichier `.github/workflows/build-android.yml` existe
- Vérifiez que le tag a bien été poussé: `git push origin --tags`
- Allez dans Actions > Build Android APK pour voir les logs

### Build EAS échoue

```bash
# Nettoyer et recommencer
eas build --platform android --profile production --clear-cache
```

### Build Gradle échoue

```bash
# Nettoyer complètement
cd /workspace/BagBotApp
rm -rf android node_modules
npm install
npx expo prebuild --platform android --clean
cd android && ./gradlew clean && ./gradlew assembleRelease
```

---

## 📞 Support

En cas de problème:

1. Vérifiez les logs GitHub Actions
2. Consultez https://docs.expo.dev/build/setup/
3. Ouvrez une issue sur GitHub

---

**Recommandation:** Utilisez GitHub Actions pour un build automatique et sans tracas! 🎊
