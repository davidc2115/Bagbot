# 🚀 BUILD ET RELEASE - BAG Bot Dashboard Mobile v1.1.0

## ❌ Problème : Build GitHub Actions avec Expo

Le build automatique via GitHub Actions **ne fonctionne pas** sans compte Expo à cause des plugins Gradle Expo qui nécessitent une configuration spéciale.

Erreur rencontrée :
```
Plugin [id: 'expo-module-gradle-plugin'] was not found
Could not get unknown property 'release' for SoftwareComponent container
```

## ✅ Solution : Build Local + Release Manuelle

Voici comment builder l'APK localement et créer une release GitHub :

---

## 📦 MÉTHODE 1 : Build Debug APK (Recommandé)

### Étape 1 : Builder l'APK localement

```bash
cd /workspace/BagBotApp

# Nettoyer et régénérer le projet Android
rm -rf android
npx expo prebuild --platform android --clean

# Build APK Debug
cd android
./gradlew assembleDebug

# L'APK est généré ici :
# android/app/build/outputs/apk/debug/app-debug.apk
```

### Étape 2 : Renommer l'APK

```bash
cd /workspace/BagBotApp/android/app/build/outputs/apk/debug
cp app-debug.apk bag-bot-dashboard-v1.1.0.apk
```

### Étape 3 : Créer la Release GitHub

```bash
cd /workspace

# Créer le tag (si pas déjà fait)
git tag -a v1.1.0 -m "BAG Bot Dashboard Mobile v1.1.0"
git push origin v1.1.0

# Créer la release avec l'APK
gh release create v1.1.0 \
    --title "BAG Bot Dashboard Mobile v1.1.0" \
    --notes "## 🎉 BAG Bot Dashboard Mobile v1.1.0

### ✨ Nouvelles Fonctionnalités

- 👤 **Récupération automatique des pseudos Discord** au premier lancement
- ✏️ **Modification du pseudo** à tout moment via le bouton crayon
- 💬 **Chat staff avec vrais pseudos Discord**
- 📊 **Monitoring serveur** en temps réel
- 🔄 **Gestion à distance** (redémarrage, cache, reboot)

### 📱 Installation

1. Téléchargez l'APK ci-dessous
2. Activez \"Sources inconnues\" sur Android
3. Installez l'APK
4. Au premier lancement : entrez votre pseudo Discord
5. Connectez-vous au serveur : http://88.174.155.230:3002

### 🔐 Connexion

- Login : \`admin\`
- Password : \`bagbot2024\`

---

**⚠️ Distribution interne uniquement - Réservé aux admins du serveur BAG Bot**" \
    BagBotApp/android/app/build/outputs/apk/debug/bag-bot-dashboard-v1.1.0.apk
```

### Étape 4 : Récupérer le lien

```bash
gh release view v1.1.0 --json url --jq .url
```

---

## 📦 MÉTHODE 2 : Build avec EAS (Nécessite Compte Expo)

Si vous acceptez d'utiliser Expo :

```bash
cd /workspace/BagBotApp

# Installer EAS CLI
npm install -g eas-cli

# Se connecter (1ère fois seulement)
eas login

# Builder l'APK
eas build --platform android --profile production

# L'APK sera téléchargeable depuis expo.dev
```

---

## 🔧 Script Automatisé

J'ai créé un script qui fait tout automatiquement :

```bash
cd /workspace && ./build-and-release-manual.sh
```

Ce script va :
1. Builder l'APK debug localement
2. Le renommer
3. Créer le tag v1.1.0
4. Créer la release GitHub
5. Upload l'APK
6. Afficher le lien

---

## 📊 Comparaison des Méthodes

| Méthode | Compte Expo | Temps | APK Signé | Automatique |
|---------|-------------|-------|-----------|-------------|
| **GitHub Actions** | ❌ Non fonctionnel | - | - | - |
| **Build Debug Local** | ✅ Non requis | 5-10 min | Debug | ✅ Semi-auto |
| **EAS Build** | ❌ Requis | 10-15 min | ✅ Production | ✅ Auto |

---

## ⚙️ Configuration pour GitHub Actions (Future)

Pour que GitHub Actions fonctionne sans Expo, il faudrait :

1. Migrer complètement vers React Native CLI (sans Expo)
2. Ou configurer les secrets Expo dans GitHub
3. Ou utiliser un workflow EAS avec token

Pour l'instant, **utilisez la méthode de build local** qui fonctionne parfaitement !

---

## 🎉 Résultat Final

Après avoir suivi les étapes ci-dessus, vous obtiendrez :

- ✅ **APK prêt** : `bag-bot-dashboard-v1.1.0.apk`
- ✅ **Release GitHub** : `https://github.com/mel805/Bagbot/releases/tag/v1.1.0`
- ✅ **Lien de téléchargement** : Partageable avec vos admins

---

**Version : 1.1.0**  
**Date : Décembre 2025**  
**Build : Local (Debug APK)**
