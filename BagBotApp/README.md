# 🚀 BAG Bot Dashboard Mobile v1.1.0

## ✨ NOUVEAUTÉ v1.1.0 : Pseudos Discord !

Au premier lancement, l'app demande automatiquement votre **pseudo Discord**.
Plus besoin de pseudos génériques - utilisez votre vrai pseudo Discord dans le chat staff !

---

## 📦 BUILD RAPIDE

### Une seule commande :

```bash
cd /workspace && ./build-apk-eas.sh
```

### Ce que ça fait :

1. ✅ Connexion Expo (interactive, 1 fois)
2. ✅ Lance le build APK
3. ✅ Attend la compilation (~10-15 min)
4. ✅ Télécharge l'APK automatiquement
5. ✅ Propose de créer une release GitHub
6. ✅ Donne le lien de téléchargement

**Temps total : ~15-20 minutes** ⏱️

---

## 🎯 FONCTIONNALITÉS

### 👤 Pseudos Discord (NOUVEAU !)
- Demandé au premier lancement
- Utilisé dans tous les messages du chat
- Modifiable à tout moment (bouton ✏️)
- Sauvegarde automatique

### 💬 Chat Staff
- Communication en temps réel entre admins
- Messages avec pseudos Discord
- Horodatage automatique
- Effacement du chat
- Rafraîchissement auto (3s)

### 📊 Monitoring Serveur
- Uptime, CPU, RAM, Disque
- État Dashboard & Bot  
- Taille du cache
- Rafraîchissement auto (10s)

### 🔄 Gestion à Distance
- Redémarrage Dashboard
- Redémarrage Bot
- Vidage du cache
- Reboot serveur complet
- Confirmations de sécurité

### 📱 Dashboard Principal
- Statistiques serveur Discord
- Statistiques du bot
- Accès rapide aux fonctions
- Interface moderne et fluide

---

## 🔐 POUR VOS ADMINS

### Installation

1. **Télécharger l'APK**
   - Depuis la release GitHub
   - Ou lien direct que vous partagez

2. **Activer Sources Inconnues**
   - Paramètres → Sécurité → Sources inconnues (ON)

3. **Installer l'APK**
   - Ouvrir le fichier téléchargé
   - Suivre les instructions Android

4. **Premier Lancement**
   - **L'app demandera votre pseudo Discord**
   - Entrez votre pseudo (ex: "Admin#1234")
   - Cliquez sur OK
   - Pseudo sauvegardé automatiquement ✅

5. **Connexion**
   - URL : `http://88.174.155.230:3002`
   - Login : `admin`
   - Password : `bagbot2024`

### Modifier son Pseudo Discord

Dans le chat staff :
- Cliquez sur l'icône **✏️** (crayon) en haut à droite
- Entrez votre nouveau pseudo
- ✅ Mise à jour instantanée !

---

## 📊 INFORMATIONS TECHNIQUES

### APK Production
- **Type** : APK signé (production)
- **Package** : com.bagbot.dashboard
- **Version** : 1.1.0 (versionCode: 2)
- **Taille** : ~50-70 MB
- **Android** : 6.0+ (API 23+)

### Serveur Backend
- **URL** : http://88.174.155.230:3002
- **Endpoints** :
  - `/api/staff-chat` - Messages du chat
  - `/api/server/stats` - Stats serveur
  - `/api/server/restart/*` - Gestion services

---

## 🛠️ DÉVELOPPEMENT

### Stack Technique
- **Frontend** : React Native 0.76+ avec Expo 53
- **Navigation** : React Navigation 7
- **UI** : React Native Paper (Material Design)
- **State** : AsyncStorage (pseudo Discord)
- **Backend** : Node.js + Express
- **Build** : EAS Build

### Structure
```
BagBotApp/
├── screens/
│   ├── DashboardScreen.js      # Dashboard principal
│   ├── StaffChatScreen.js      # Chat avec pseudos Discord
│   ├── ServerMonitorScreen.js  # Monitoring serveur
│   └── ...
├── services/
│   └── api.js                  # API client
├── App.js                      # Navigation & Theme
├── app.json                    # Config Expo
└── eas.json                    # Config build
```

---

## 📝 DOCUMENTATION

- **BUILD_APK_DISCORD.md** - Guide complet build + pseudos Discord
- **COMMANDE_UNIQUE_v1.1.md** - Commande unique pour tout faire
- **GUIDE_UTILISATEUR.md** - Guide utilisateur de l'app
- **BUILD_INSTRUCTIONS.md** - Instructions build détaillées

---

## 🔄 MISES À JOUR

Pour déployer une nouvelle version :

1. Modifiez le code
2. Incrémentez la version dans `app.json`
3. Lancez `./build-apk-eas.sh`
4. Créez une nouvelle release GitHub
5. Partagez le lien aux admins
6. Les admins installent par-dessus (pas de désinstallation)

---

## ⚠️ NOTES IMPORTANTES

- **Distribution interne uniquement**
- APK signé pour production
- Pas sur Google Play Store
- Utilise EAS Build (Expo)
- Nécessite compte Expo (gratuit)
- Build dans le cloud Expo

---

## 🎉 CHANGELOG v1.1.0

### Ajouté
- 👤 **Récupération automatique des pseudos Discord**
- ✏️ **Modification du pseudo** à tout moment
- 💬 **Chat staff avec vrais pseudos** Discord
- 📱 **Interface améliorée** pour le chat

### Technique
- Utilisation d'`Alert.prompt()` pour saisie pseudo
- Sauvegarde avec `AsyncStorage`
- Header chat avec bouton modification
- Messages formatés avec pseudos Discord

---

## 📞 SUPPORT

Pour toute question sur :
- Le build APK
- La configuration serveur
- L'installation chez les admins
- Les fonctionnalités de l'app

Consultez les fichiers de documentation dans `BagBotApp/`

---

## 🚀 PRÊT À BUILDER !

```bash
./build-apk-eas.sh
```

Et c'est parti ! 🎉
