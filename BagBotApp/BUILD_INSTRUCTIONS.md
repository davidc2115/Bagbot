# 🔧 Instructions de Build APK - BAG Bot Dashboard

## 🎯 Objectif
Générer un fichier APK installable sur Android à partir du code source.

## 📋 Pré-requis

### Logiciels Nécessaires
- Node.js 18+ ✅ (Installé)
- npm ✅ (Installé)
- Git ✅ (Installé)
- Compte Expo (gratuit) pour EAS Build

### Vérification
```bash
node --version  # v22.21.1 ✅
npm --version   # 10.9.4 ✅
```

## 🚀 Méthode 1 : EAS Build (RECOMMANDÉ)

### Avantages
- ✅ Pas besoin d'Android Studio
- ✅ Build dans le cloud
- ✅ APK signé automatiquement
- ✅ Support professionnel

### Étapes

#### 1. Installation EAS CLI
```bash
npm install -g eas-cli
```

#### 2. Connexion Expo
```bash
# Créez un compte sur https://expo.dev si vous n'en avez pas
eas login

# Ou inscrivez-vous
eas register
```

#### 3. Configuration du Projet
```bash
cd /workspace/BagBotApp

# Configuration initiale (une seule fois)
eas build:configure
```

#### 4. Génération de l'APK
```bash
# Build production
eas build --platform android --profile production

# Suivez les instructions à l'écran
# Choisissez :
# - Build type: apk
# - Auto submit: No
```

#### 5. Téléchargement
- Attendez la fin du build (10-20 minutes)
- L'URL de téléchargement s'affichera dans le terminal
- Ou allez sur https://expo.dev/accounts/[votre-compte]/projects/bagbotapp/builds

### Commandes Utiles
```bash
# Voir l'historique des builds
eas build:list

# Build avec canal spécifique
eas build --platform android --profile production --channel production

# Build de développement
eas build --platform android --profile development
```

## 🏗️ Méthode 2 : Build Local avec Android Studio

### Pré-requis Additionnels
- Android Studio installé
- Android SDK configuré
- Java JDK 11+

### Étapes

#### 1. Préparer le Projet
```bash
cd /workspace/BagBotApp
npm install
npx expo prebuild --platform android
```

#### 2. Ouvrir dans Android Studio
```bash
# Ouvrir le dossier android/ dans Android Studio
cd android
```

#### 3. Configuration
1. Ouvrir Android Studio
2. File → Open → Sélectionner `/workspace/BagBotApp/android`
3. Attendre la synchronisation Gradle
4. Build → Generate Signed Bundle / APK
5. Choisir APK
6. Créer ou sélectionner un keystore
7. Build Release

#### 4. Récupérer l'APK
```
android/app/build/outputs/apk/release/app-release.apk
```

## 📦 Méthode 3 : Expo Build (Ancien)

### Note
⚠️ Cette méthode est obsolète mais fonctionne encore

```bash
cd /workspace/BagBotApp
expo build:android

# Choisissez :
# - Build type: apk
# - Keystore: Generate new ou Upload existing

# Attendez et téléchargez l'APK
```

## 🎨 Méthode 4 : Build Optimisé (Production)

### Configuration Avancée
```bash
cd /workspace/BagBotApp

# Créer un build optimisé
eas build \
  --platform android \
  --profile production \
  --clear-cache \
  --no-wait

# Options :
# --clear-cache : Nettoie le cache
# --no-wait : Ne pas attendre la fin (email de notification)
# --local : Build en local (nécessite Docker)
```

## 📝 Profils de Build

Le fichier `eas.json` contient 3 profils :

### 1. Development
```json
"development": {
  "developmentClient": true,
  "distribution": "internal",
  "android": { "buildType": "apk" }
}
```
- Build de développement avec hot reload
- Non optimisé, plus gros

### 2. Preview
```json
"preview": {
  "distribution": "internal",
  "android": { "buildType": "apk" }
}
```
- Build de test interne
- Optimisé mais pas signé pour le store

### 3. Production
```json
"production": {
  "android": { "buildType": "apk" }
}
```
- Build final optimisé
- Prêt pour distribution
- **UTILISEZ CELUI-CI** ✅

## 🔐 Signature de l'APK

### Automatique (EAS)
EAS gère automatiquement la signature

### Manuelle
```bash
# Créer un keystore
keytool -genkey -v -keystore my-release-key.keystore \
  -alias my-key-alias -keyalg RSA -keysize 2048 -validity 10000

# Signer l'APK
jarsigner -verbose -sigalg SHA1withRSA -digestalg SHA1 \
  -keystore my-release-key.keystore app-release-unsigned.apk my-key-alias

# Aligner l'APK
zipalign -v 4 app-release-unsigned.apk app-release.apk
```

## ✅ Vérification de l'APK

### Informations APK
```bash
# Voir les détails
aapt dump badging app-release.apk

# Vérifier la signature
jarsigner -verify -verbose -certs app-release.apk
```

### Test sur Émulateur
```bash
# Installer sur émulateur
adb install app-release.apk

# Voir les logs
adb logcat | grep ReactNative
```

## 📊 Optimisation de l'APK

### Réduire la Taille
```bash
# Dans app.json, ajouter :
"android": {
  "enableProguardInReleaseBuilds": true,
  "enableShrinkResourcesInReleaseBuilds": true
}
```

### Bundle au lieu d'APK
```bash
# Générer un AAB (Android App Bundle) pour le Play Store
eas build --platform android --profile production
# Dans eas.json, changez "buildType": "aab"
```

## 🐛 Dépannage

### Erreur "Gradle Build Failed"
```bash
cd /workspace/BagBotApp
rm -rf node_modules
npm install
npx expo prebuild --clean
```

### Erreur "SDK Not Found"
```bash
# Définir ANDROID_HOME
export ANDROID_HOME=$HOME/Android/Sdk
export PATH=$PATH:$ANDROID_HOME/emulator
export PATH=$PATH:$ANDROID_HOME/tools
export PATH=$PATH:$ANDROID_HOME/tools/bin
export PATH=$PATH:$ANDROID_HOME/platform-tools
```

### Build EAS Échoue
```bash
# Nettoyer et recommencer
eas build --platform android --profile production --clear-cache
```

### APK Trop Gros
```bash
# Activer le split par ABI
# Dans eas.json :
"android": {
  "buildType": "apk",
  "gradleCommand": ":app:assembleRelease",
  "splits": ["armeabi-v7a", "arm64-v8a", "x86", "x86_64"]
}
```

## 📱 Distribution

### Option 1 : Direct Download
1. Hébergez l'APK sur un serveur web
2. Partagez le lien de téléchargement
3. Les utilisateurs téléchargent et installent

### Option 2 : Google Play Store
1. Créez un compte développeur Google Play ($25 unique)
2. Générez un AAB avec EAS
3. Uploadez sur Play Console
4. Suivez le processus de review

### Option 3 : Internal Distribution
```bash
# Via EAS Submit
eas submit --platform android --latest
```

## 📦 Résultat Final

Après le build, vous obtiendrez :

```
app-release.apk
├── Taille: 50-60 MB
├── Package: com.bagbot.dashboard
├── Version: 1.0.0
├── Min SDK: Android 5.0
└── Target SDK: Android 14
```

## ⚡ Commande Rapide Tout-en-Un

```bash
#!/bin/bash
cd /workspace/BagBotApp
npm install
eas build --platform android --profile production --auto-submit
```

## 🎉 Succès !

Une fois le build terminé :
1. ✅ Téléchargez l'APK
2. ✅ Transférez sur un appareil Android
3. ✅ Installez (activez "Sources inconnues")
4. ✅ Lancez l'application
5. ✅ Connectez-vous au serveur
6. ✅ Profitez ! 🎊

---

**Temps estimé de build :** 10-20 minutes  
**Taille APK finale :** 50-60 MB  
**Compatibilité :** Android 5.0+

---

*Pour toute question, consultez : https://docs.expo.dev/build/setup/*
