# 📱 Guide de Compilation APK - v4.1.2

## ❌ Impossible de Compiler dans cet Environnement

**Raison** : SDK Android non installé (~3-5 GB)

**Solution** : Compilation locale sur votre machine

---

## 🖥️ Compilation Locale

### Prérequis

1. **Android Studio** installé
   - Télécharger : https://developer.android.com/studio
   - Inclut automatiquement le SDK Android

2. **Java JDK 17+**
   - Vérifier : `java -version`
   - Installer si nécessaire

---

## 📋 Étapes de Compilation

### Méthode 1 : Avec Android Studio (Recommandée)

1. **Ouvrir le projet**
   ```bash
   # Ouvrir Android Studio
   # File > Open > Sélectionner /workspace/android-app
   ```

2. **Attendre la synchronisation Gradle**
   - Android Studio va télécharger les dépendances
   - Peut prendre 2-5 minutes la première fois

3. **Compiler l'APK**
   ```
   Build > Build Bundle(s) / APK(s) > Build APK(s)
   ```

4. **Récupérer l'APK**
   ```
   Fichier généré dans :
   /workspace/android-app/app/build/outputs/apk/release/app-release.apk
   ```

---

### Méthode 2 : En Ligne de Commande

1. **Cloner/Télécharger le projet**
   ```bash
   git clone <votre-repo>
   cd android-app
   ```

2. **Compiler avec Gradlew**
   ```bash
   ./gradlew assembleRelease
   ```

3. **APK généré dans**
   ```
   app/build/outputs/apk/release/app-release.apk
   ```

---

## 🔐 Signature de l'APK

**Fichier de clés** : `/workspace/android-app/bagbot-release.jks`

**Configuration** (déjà dans `build.gradle.kts`) :
```kotlin
signingConfigs {
    create("release") {
        storeFile = file("../bagbot-release.jks")
        storePassword = "bagbot2024"
        keyAlias = "bagbot-key"
        keyPassword = "bagbot2024"
    }
}
```

**Sécurité** :
- ⚠️ Ces informations sont visibles dans le code
- ⚠️ À changer en production
- ✅ OK pour développement/test

---

## 📦 Récupérer l'APK Compilé

### Option 1 : Depuis le Serveur

Si vous compilez sur le serveur après installation du SDK :

```bash
# Créer un lien public
cd /workspace/android-app/app/build/outputs/apk/release
cp app-release.apk /var/www/html/downloads/bagbot-v4.1.2.apk

# Accès via :
# http://88.174.155.230/downloads/bagbot-v4.1.2.apk
```

### Option 2 : Téléchargement Direct

```bash
# Depuis le serveur vers votre machine
scp user@88.174.155.230:/workspace/android-app/app/build/outputs/apk/release/app-release.apk ./bagbot-v4.1.2.apk
```

---

## 🚀 Script de Compilation Automatique

Créez `compile-and-serve.sh` :

```bash
#!/bin/bash

echo "🔨 Compilation de l'APK..."
cd /workspace/android-app
./gradlew assembleRelease

if [ $? -eq 0 ]; then
    echo "✅ Compilation réussie!"
    
    # Copier vers dossier public
    mkdir -p /var/www/html/downloads
    cp app/build/outputs/apk/release/app-release.apk /var/www/html/downloads/bagbot-v4.1.2.apk
    
    echo "📦 APK disponible à :"
    echo "http://88.174.155.230/downloads/bagbot-v4.1.2.apk"
    
    # Afficher la taille
    ls -lh /var/www/html/downloads/bagbot-v4.1.2.apk
else
    echo "❌ Erreur de compilation"
fi
```

---

## 🔍 Dépannage

### Erreur : "SDK location not found"

**Solution** :
```bash
# Créer local.properties
echo "sdk.dir=/home/votre-user/Android/Sdk" > /workspace/android-app/local.properties

# OU définir ANDROID_HOME
export ANDROID_HOME=/home/votre-user/Android/Sdk
export PATH=$PATH:$ANDROID_HOME/tools:$ANDROID_HOME/platform-tools
```

### Erreur : "Java version incompatible"

**Solution** :
```bash
# Vérifier la version
java -version

# Installer Java 17 si nécessaire
sudo apt install openjdk-17-jdk
```

### Erreur : "Build failed with Kotlin error"

**Solution** :
```bash
# Nettoyer le cache Gradle
./gradlew clean

# Re-compiler
./gradlew assembleRelease
```

---

## 📊 Informations de Build

```
Version Name    : 4.1.2
Version Code    : 412
Min SDK         : 26 (Android 8.0)
Target SDK      : 34 (Android 14)
Taille estimée  : ~15-25 MB
```

---

## ✅ Checklist Avant Distribution

- [ ] APK compilé sans erreur
- [ ] Testé sur appareil physique
- [ ] Upload de musique fonctionne
- [ ] Lecteur audio fonctionne
- [ ] Onglets SFW/NSFW fonctionnent
- [ ] Staff chat opérationnel
- [ ] Configurations affichées correctement

---

## 🌐 Distribution

### Via HTTP (Recommandé pour test)

```bash
# Servir l'APK
python3 -m http.server 8080

# Accès depuis mobile :
# http://IP-SERVEUR:8080/app-release.apk
```

### Via GitHub Release

```bash
# Créer un release
gh release create v4.1.2 \
  --title "v4.1.2 - Music, SFW/NSFW, Fixes" \
  --notes "$(cat CHANGELOG.md)" \
  app/build/outputs/apk/release/app-release.apk
```

---

## 📱 Installation sur Mobile

1. **Activer sources inconnues**
   - Paramètres > Sécurité
   - Autoriser les sources inconnues

2. **Télécharger l'APK**
   - Via navigateur mobile
   - Scanner QR code du lien

3. **Installer**
   - Cliquer sur le fichier téléchargé
   - Accepter les permissions

---

**Version** : 4.1.2  
**Date** : 20 Décembre 2025  
**Note** : SDK Android requis pour compilation
