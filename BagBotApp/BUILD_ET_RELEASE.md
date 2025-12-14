# 🚀 GUIDE COMPLET - Build & Release APK

## 📋 RÉSUMÉ RAPIDE

Votre code est **poussé sur GitHub** ✅  
Maintenant il faut **builder l'APK** et créer la **release**

---

## 🎯 ÉTAPES À SUIVRE

### 1️⃣ Connexion à Expo (Une seule fois)

```bash
cd /workspace/BagBotApp
eas login
```

**Si vous n'avez pas de compte :**
- Allez sur https://expo.dev
- Créez un compte gratuit (email + mot de passe)
- Revenez et connectez-vous avec `eas login`

---

### 2️⃣ Lancer le Build

**Option A - Script Automatique (RECOMMANDÉ) :**
```bash
cd /workspace/BagBotApp
./launch-build.sh
```

**Option B - Commande Manuelle :**
```bash
cd /workspace/BagBotApp
eas build --platform android --profile production
```

---

### 3️⃣ Surveiller le Build

Le build prend **10-20 minutes**. Vous pouvez :

**A. Suivre en ligne de commande :**
```bash
# Voir la liste des builds
eas build:list

# Voir les détails du dernier build
eas build:view --latest
```

**B. Suivre sur le Web (MIEUX) :**
1. Allez sur https://expo.dev
2. Connectez-vous avec votre compte
3. Cliquez sur votre projet "bagbotapp"
4. Allez dans l'onglet "Builds"
5. Vous verrez le build en cours avec :
   - État : in progress → finished
   - Durée estimée
   - Logs en temps réel
   - Lien de téléchargement une fois terminé

---

### 4️⃣ Télécharger l'APK

Une fois le build **terminé** :

**Option A - Depuis le Web :**
1. Sur expo.dev → Builds
2. Cliquez sur le build terminé
3. Cliquez sur "Download"
4. Sauvegardez le fichier APK

**Option B - En ligne de commande :**
```bash
eas build:download --latest
```

L'APK sera téléchargé dans le dossier courant.

---

### 5️⃣ Créer une GitHub Release

Une fois l'APK téléchargé :

```bash
# 1. Créer un tag
git tag -a v1.1.0 -m "Release v1.1.0 - Chat Staff + Server Monitoring"
git push origin v1.1.0

# 2. Créer la release avec gh CLI
gh release create v1.1.0 \
  --title "BAG Bot Dashboard Mobile v1.1.0" \
  --notes "## ✨ Nouveautés v1.1.0

- 💬 **Chat Staff** - Communication interne entre membres
- 📊 **Monitoring Serveur** - Stats temps réel + gestion à distance
- 🔄 Actions : Redémarrer dashboard, bot, vider cache, reboot serveur
- 🎨 Interface réorganisée avec nouveaux onglets

## 📱 Installation
1. Téléchargez le fichier APK ci-dessous
2. Activez 'Sources inconnues' sur Android
3. Installez l'APK
4. Connectez-vous à votre serveur

## 📊 Changements
- 11 écrans (9 + 2 nouveaux)
- 38 endpoints API (30 + 8 nouveaux)
- 4,700+ lignes de code

## 🔗 Liens
- Documentation : [MISES_A_JOUR_v1.1.md](MISES_A_JOUR_v1.1.md)
- Guide utilisateur : [GUIDE_UTILISATEUR.md](GUIDE_UTILISATEUR.md)" \
  path/to/downloaded/app-release.apk
```

---

## 📊 SURVEILLANCE DU BUILD

### États du Build

| État | Signification | Action |
|------|---------------|--------|
| **pending** | En attente | Patientez |
| **in-progress** | En cours | Surveillez les logs |
| **finished** | ✅ Réussi | Téléchargez l'APK |
| **errored** | ❌ Échec | Vérifiez les logs d'erreur |

### Temps de Build

- **Préparation :** 1-2 minutes
- **Compilation :** 8-15 minutes
- **Finalisation :** 1-2 minutes
- **TOTAL :** 10-20 minutes

### Que fait le Build ?

1. ✅ Installe les dépendances
2. ✅ Compile le code React Native
3. ✅ Génère le code Android natif
4. ✅ Build l'APK avec Gradle
5. ✅ Signe l'APK automatiquement
6. ✅ Upload l'APK sur Expo CDN

---

## 🔗 RÉCUPÉRER LE LIEN DE LA RELEASE

### Après la création de la Release GitHub :

```bash
# Obtenir l'URL de la release
gh release view v1.1.0 --json url --jq .url

# Obtenir le lien de téléchargement de l'APK
gh release view v1.1.0 --json assets --jq '.assets[0].url'
```

**Le lien sera au format :**
```
https://github.com/mel805/Bagbot/releases/download/v1.1.0/app-release.apk
```

---

## 📱 DISTRIBUER L'APK

### Méthode 1 : GitHub Release (RECOMMANDÉ)
- Lien permanent
- Téléchargement direct
- Tracking des téléchargements
- Versioning automatique

**Lien à partager :**
```
https://github.com/mel805/Bagbot/releases/tag/v1.1.0
```

### Méthode 2 : Expo Build URL
- Lien temporaire (30 jours)
- Accès immédiat après build
- Pas besoin de release GitHub

**Obtenir le lien :**
```bash
eas build:view --latest --json | grep -o '"url":"[^"]*"' | cut -d'"' -f4
```

### Méthode 3 : Installation Directe
```bash
# Sur un appareil Android connecté en USB
adb install app-release.apk
```

---

## ⚠️ RÉSOLUTION DE PROBLÈMES

### Build Failed

**Erreur : "Invalid credentials"**
```bash
# Reconnectez-vous
eas logout
eas login
```

**Erreur : "Project not configured"**
```bash
# Configurez le projet
eas build:configure
```

**Erreur : "Dependencies issue"**
```bash
# Réinstallez les dépendances
rm -rf node_modules
npm install --legacy-peer-deps
```

### Build trop long (>30 min)

- Vérifiez sur expo.dev si le build est bloqué
- Annulez et relancez : `eas build --platform android --profile production --clear-cache`

### APK introuvable après build

```bash
# Téléchargez manuellement
eas build:download --latest --output ./bag-bot-v1.1.0.apk
```

---

## 💡 COMMANDES UTILES

```bash
# Vérifier que vous êtes connecté
eas whoami

# Voir tous vos builds
eas build:list

# Voir les détails d'un build spécifique
eas build:view [BUILD_ID]

# Télécharger un build
eas build:download --id [BUILD_ID]

# Annuler un build en cours
eas build:cancel

# Voir la configuration EAS
cat eas.json
```

---

## 📝 CHECKLIST COMPLÈTE

- [ ] Code poussé sur GitHub ✅ (FAIT)
- [ ] Compte Expo créé
- [ ] EAS CLI installé ✅ (FAIT)
- [ ] Connexion à Expo (`eas login`)
- [ ] Build lancé (`eas build --platform android --profile production`)
- [ ] Build surveillé (expo.dev ou `eas build:list`)
- [ ] APK téléchargé
- [ ] Tag Git créé (`git tag v1.1.0`)
- [ ] Release GitHub créée (`gh release create`)
- [ ] APK uploadé sur la release
- [ ] Lien de release obtenu
- [ ] APK distribué à l'équipe

---

## 🎯 RÉSULTAT ATTENDU

Après avoir suivi toutes les étapes, vous aurez :

1. ✅ **APK compilé** (bag-bot-dashboard-v1.1.0.apk)
2. ✅ **Release GitHub** (https://github.com/mel805/Bagbot/releases/tag/v1.1.0)
3. ✅ **Lien de téléchargement** permanent
4. ✅ **APK distribuable** à votre équipe

**Taille APK :** ~50-60 MB  
**Version :** 1.1.0  
**Package :** com.bagbot.dashboard

---

## 🚀 LANCEMENT RAPIDE

**Si vous voulez tout faire en une commande :**

```bash
cd /workspace/BagBotApp && ./launch-build.sh
```

Puis suivez les instructions à l'écran !

---

## 📞 EN CAS DE PROBLÈME

**Si le build échoue :**
1. Vérifiez les logs sur expo.dev
2. Lisez l'erreur complète
3. Consultez la documentation : https://docs.expo.dev/build/setup/

**Si vous êtes bloqué :**
- Les logs du build contiennent toutes les informations
- La plupart des erreurs sont liées aux dépendances
- Solution : `rm -rf node_modules && npm install --legacy-peer-deps`

---

**Bonne compilation ! 🚀**

*Une fois le build terminé, vous aurez le lien de téléchargement de l'APK*
