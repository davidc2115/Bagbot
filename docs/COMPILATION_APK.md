# 📱 Guide de Compilation APK - BAG Bot v4.1.1

## ⚠️ Information

Le SDK Android n'est pas disponible dans l'environnement cloud actuel. Voici comment compiler l'APK sur votre machine locale.

---

## 🔧 Prérequis

### Installer Android Studio
1. Télécharger Android Studio : https://developer.android.com/studio
2. Installer Android Studio
3. Ouvrir Android Studio et laisser le SDK se télécharger

### Vérifier l'Installation
```bash
# Sur Windows (PowerShell)
$env:ANDROID_HOME

# Sur Linux/Mac
echo $ANDROID_HOME
```

Si vide, configurer :
```bash
# Linux/Mac
export ANDROID_HOME=$HOME/Android/Sdk
export PATH=$PATH:$ANDROID_HOME/tools:$ANDROID_HOME/platform-tools

# Windows (Ajouter aux variables d'environnement système)
ANDROID_HOME=C:\Users\VotreNom\AppData\Local\Android\Sdk
```

---

## 📥 Cloner le Repository

```bash
git clone https://github.com/mel805/Bagbot.git
cd Bagbot
git checkout v4.1.1
```

---

## 🚀 Compilation de l'APK

### Option 1 : Avec Android Studio (Recommandé)

1. **Ouvrir le projet**
   - Android Studio > Open > Sélectionner `/android-app/`

2. **Attendre la synchronisation**
   - Gradle va télécharger les dépendances (quelques minutes)

3. **Compiler**
   - Menu : Build > Generate Signed Bundle / APK
   - Sélectionner "APK"
   - Si vous n'avez pas de keystore : Build > Build Bundle(s) / APK(s) > Build APK(s)

4. **Récupérer l'APK**
   - Emplacement : `android-app/app/build/outputs/apk/release/app-release-unsigned.apk`
   - Ou : `android-app/app/build/outputs/apk/debug/app-debug.apk`

---

### Option 2 : En Ligne de Commande

```bash
cd Bagbot/android-app

# Nettoyer
./gradlew clean

# Compiler en mode release (sans signature)
./gradlew assembleRelease

# Ou compiler en mode debug (plus rapide)
./gradlew assembleDebug
```

**APK généré** :
- Release : `app/build/outputs/apk/release/app-release-unsigned.apk`
- Debug : `app/build/outputs/apk/debug/app-debug.apk`

---

## 📲 Installation de l'APK

### Sur Émulateur Android Studio
```bash
# Démarrer l'émulateur depuis Android Studio
# Puis :
./gradlew installDebug
```

### Sur Appareil Physique

#### 1. Activer le Mode Développeur
- Paramètres > À propos du téléphone
- Taper 7 fois sur "Numéro de build"

#### 2. Activer le Débogage USB
- Paramètres > Options développeur > Débogage USB

#### 3. Connecter et Installer
```bash
# Vérifier la connexion
adb devices

# Installer
adb install -r app/build/outputs/apk/debug/app-debug.apk
```

#### 4. Ou Transférer Manuellement
- Copier l'APK sur le téléphone
- Ouvrir avec le gestionnaire de fichiers
- Installer (autoriser les sources inconnues si demandé)

---

## 🔑 Signature de l'APK (Production)

### Créer un Keystore
```bash
keytool -genkey -v -keystore bagbot.keystore -alias bagbot -keyalg RSA -keysize 2048 -validity 10000
```

### Configurer gradle.properties
Créer `android-app/gradle.properties` :
```properties
BAGBOT_KEYSTORE_FILE=../bagbot.keystore
BAGBOT_KEYSTORE_PASSWORD=votre_mot_de_passe
BAGBOT_KEY_ALIAS=bagbot
BAGBOT_KEY_PASSWORD=votre_mot_de_passe
```

### Configurer build.gradle.kts
Ajouter dans `android-app/app/build.gradle.kts` :
```kotlin
android {
    signingConfigs {
        create("release") {
            storeFile = file(project.property("BAGBOT_KEYSTORE_FILE") as String)
            storePassword = project.property("BAGBOT_KEYSTORE_PASSWORD") as String
            keyAlias = project.property("BAGBOT_KEY_ALIAS") as String
            keyPassword = project.property("BAGBOT_KEY_PASSWORD") as String
        }
    }
    buildTypes {
        getByName("release") {
            signingConfig = signingConfigs.getByName("release")
            // ...
        }
    }
}
```

### Compiler avec Signature
```bash
./gradlew assembleRelease
```

APK signé : `app/build/outputs/apk/release/app-release.apk`

---

## 🐛 Dépannage

### Erreur : SDK location not found
```bash
# Créer android-app/local.properties
echo "sdk.dir=/chemin/vers/Android/Sdk" > android-app/local.properties

# Exemple Windows
echo "sdk.dir=C:\\Users\\VotreNom\\AppData\\Local\\Android\\Sdk" > android-app/local.properties

# Exemple Linux/Mac
echo "sdk.dir=$HOME/Android/Sdk" > android-app/local.properties
```

### Erreur : Gradle version incompatible
```bash
cd android-app
./gradlew wrapper --gradle-version=8.5
```

### Erreur : Build Tools manquants
Dans Android Studio :
- Tools > SDK Manager > SDK Tools
- Cocher "Android SDK Build-Tools"
- Apply

### Erreur : Kotlin version incompatible
Vérifier dans `build.gradle.kts` :
```kotlin
plugins {
    kotlin("android") version "1.9.20"
}
```

---

## 📦 Fichiers Générés

Après compilation réussie :

```
android-app/app/build/outputs/apk/
├── debug/
│   └── app-debug.apk              (Non signé, pour dev)
└── release/
    ├── app-release-unsigned.apk   (Sans signature)
    └── app-release.apk            (Signé, si keystore configuré)
```

**Tailles approximatives** :
- Debug : ~15-20 MB
- Release non signé : ~8-10 MB
- Release signé : ~8-10 MB

---

## ✅ Vérification

Après installation, vérifier :

1. **Connexion**
   - L'app se connecte au backend
   - URL : http://votre-serveur:3002

2. **Icônes de Configuration**
   - Config > Cliquer sur un groupe
   - ✅ Icônes visibles sur chaque section

3. **Gestion Utilisateurs (Fondateur)**
   - Admin > Scroller après "URL du Dashboard"
   - ✅ Section "Utilisateurs de l'App" visible

4. **Détection Auto Admins**
   - Se connecter avec un compte admin Discord
   - ✅ Accès au chat staff automatique

---

## 📚 Ressources

- [Documentation Android](https://developer.android.com/studio/build/building-cmdline)
- [Gradle Build](https://developer.android.com/studio/build)
- [Signing APK](https://developer.android.com/studio/publish/app-signing)

---

## 🆘 Support

Si vous rencontrez des problèmes :
1. Vérifier les logs : `./gradlew assembleRelease --info`
2. Nettoyer : `./gradlew clean`
3. Supprimer `.gradle` : `rm -rf .gradle`
4. Invalider cache Android Studio : File > Invalidate Caches / Restart

---

## ⚡ Compilation Rapide (TL;DR)

```bash
# Cloner
git clone https://github.com/mel805/Bagbot.git
cd Bagbot/android-app

# Configurer SDK (si nécessaire)
echo "sdk.dir=$ANDROID_HOME" > local.properties

# Compiler
./gradlew assembleDebug

# Installer
adb install -r app/build/outputs/apk/debug/app-debug.apk
```

---

**Version** : 4.1.1  
**Date** : 20 Décembre 2025  
**Statut** : Prêt pour compilation
