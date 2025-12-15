# 🚀 BUILD APK LOCAL v1.1.0 - AVEC PSEUDO DISCORD

## ✨ NOUVEAUTÉ : Récupération Pseudo Discord

Au premier lancement de l'app, chaque admin devra :
1. **Entrer son pseudo Discord** (ex: "JohnDoe#1234")
2. Le pseudo sera **automatiquement sauvegardé**
3. Utilisé pour **tous les messages** du chat staff

### Modifier son pseudo

Dans le chat staff :
- Cliquez sur l'icône **✏️ crayon** en haut à droite
- Entrez votre nouveau pseudo Discord
- ✅ Mise à jour instantanée !

---

## 📦 BUILD LOCAL (SANS EXPO ACCOUNT)

### Commande Unique

```bash
cd /workspace && ./build-apk-local.sh
```

### Ce que fait le script :

1. **Installation dépendances** (npm install)
2. **Génération projet Android** (expo prebuild)
3. **Compilation APK debug** (gradlew assembleDebug)
4. **Création release GitHub** (optionnel, vous décidez)

---

## 📱 TYPE DE BUILD

**APK Debug (Non signé)**
- ✅ Parfait pour distribution interne
- ✅ Pas besoin de compte Expo
- ✅ Pas besoin de signature Google Play
- ✅ Installation directe sur Android
- ⚠️ Nécessite "Sources inconnues" activées

---

## 🎯 DISTRIBUTION AUX ADMINS

### Méthode 1 : GitHub Release (automatique)

Le script vous proposera de créer une release GitHub automatiquement.

**Avantages :**
- Lien de téléchargement propre
- Historique des versions
- Notes de release incluses

### Méthode 2 : Distribution directe

APK généré à :
```
/workspace/BagBotApp/bag-bot-dashboard-v1.1.0-debug.apk
```

Partagez directement ce fichier avec vos admins via :
- Discord
- Email
- Drive/Dropbox
- USB

---

## 📋 INSTRUCTIONS POUR LES ADMINS

### Installation

1. **Télécharger l'APK**
   - Depuis la release GitHub ou lien direct

2. **Activer Sources Inconnues**
   - Paramètres → Sécurité → Sources inconnues (ON)
   - Ou lors de l'installation, Android proposera d'activer

3. **Installer l'APK**
   - Ouvrir le fichier APK téléchargé
   - Suivre les instructions
   - Appuyer sur "Installer"

4. **Premier Lancement**
   - L'app demandera votre **pseudo Discord**
   - Entrez-le (ex: "Admin#1234")
   - Cliquez sur OK
   - ✅ Prêt à utiliser !

5. **Connexion au serveur**
   - URL : `http://88.174.155.230:3002`
   - Login : `admin`
   - Password : `bagbot2024`

---

## 🔧 DÉTAILS TECHNIQUES

### Configuration APK

```json
{
  "name": "BAG Bot Dashboard",
  "package": "com.bagbot.dashboard",
  "version": "1.1.0",
  "versionCode": 2,
  "buildType": "debug"
}
```

### Taille approximative
- APK : ~50-70 MB
- Installation : ~100-150 MB

### Compatibilité
- Android 6.0+ (API 23+)
- Architectures : ARM, ARM64, x86, x86_64

---

## ⚠️ DÉPANNAGE

### "L'application n'a pas pu être installée"
- Vérifiez que "Sources inconnues" est activé
- Désinstallez l'ancienne version si présente
- Réessayez l'installation

### "App se ferme au démarrage"
- Vérifiez votre connexion internet
- Vérifiez que le serveur (88.174.155.230:3002) est accessible
- Redémarrez l'app

### "Impossible de se connecter"
- Vérifiez l'URL du serveur dans les paramètres
- Vérifiez vos identifiants (admin / bagbot2024)
- Vérifiez que le dashboard est démarré sur le serveur

---

## 🔄 MISES À JOUR

Pour mettre à jour l'app chez les admins :

1. Rebuild avec le script
2. Incrémentez la version dans `app.json`
3. Distribuez le nouvel APK
4. Les admins doivent **simplement installer par-dessus**
   (pas besoin de désinstaller l'ancienne version)

---

## 📊 FONCTIONNALITÉS v1.1.0

### Chat Staff 💬
- Messages en temps réel
- Pseudo Discord automatique
- Modification du pseudo à tout moment
- Horodatage des messages
- Effacement du chat

### Monitoring Serveur 📊
- Uptime serveur
- CPU / RAM / Disque
- État Dashboard & Bot
- Taille du cache

### Gestion à Distance 🔄
- Redémarrage Dashboard
- Redémarrage Bot
- Vidage du cache
- Reboot serveur complet

### Dashboard Principal 📱
- Statistiques serveur
- Statistiques bot
- Accès rapide aux fonctions
- Interface moderne

---

## ✅ CHECKLIST PRÉ-DISTRIBUTION

Avant de distribuer l'APK à vos admins :

- [ ] APK généré avec succès
- [ ] Testé l'installation sur un appareil Android
- [ ] Testé la connexion au serveur
- [ ] Testé l'entrée du pseudo Discord
- [ ] Testé le chat staff
- [ ] Testé le monitoring
- [ ] Release GitHub créée (optionnel)
- [ ] Instructions envoyées aux admins

---

## 🎉 C'EST PRÊT !

Votre APK est prêt pour la distribution interne à vos admins ! 🚀

**Aucun compte Expo requis ✅**
**Aucune signature Google Play requise ✅**
**Distribution complètement privée ✅**
