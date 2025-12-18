# BagBot Manager - Application Android

Application Android pour gérer intégralement votre bot Discord BagBot depuis votre smartphone.

## 🚀 Fonctionnalités

### ✅ Gestion Complète du Bot
- **Dashboard en temps réel** : Statistiques du bot (serveurs, utilisateurs, uptime, ping)
- **Gestion des serveurs** : Voir tous les serveurs où le bot est présent
- **Liste des commandes** : Accès à toutes les commandes disponibles du bot

### 🎵 Contrôle Musical
- Voir la musique en cours de lecture
- Contrôler la lecture (play, pause, skip, stop)
- Voir la file d'attente
- Gérer le volume

### 🛡️ Modération
- Expulser des utilisateurs
- Bannir des utilisateurs
- Gérer les actions de modération depuis votre téléphone

### 🔐 Authentification Sécurisée
- Connexion via Discord OAuth2
- Aucun mot de passe stocké localement
- Session sécurisée avec tokens

## 📋 Prérequis

### Sur votre serveur (Freebox/VM Debian)
1. Node.js v18 ou supérieur
2. Le bot Discord BagBot doit être en cours d'exécution
3. L'API REST doit être activée (port 3001 par défaut)
4. Variables d'environnement configurées :
   - `DISCORD_TOKEN` : Token du bot Discord
   - `CLIENT_ID` : ID client Discord
   - `DISCORD_CLIENT_SECRET` : Secret client Discord OAuth2
   - `API_PORT` : Port de l'API (3001 par défaut)

### Sur votre appareil Android
- Android 8.0 (API 26) ou supérieur
- Connexion Internet
- Accès réseau au serveur hébergeant le bot

## 🔧 Installation

### 1. Configuration du Serveur API

Le serveur API est déjà intégré au bot. Pour le démarrer :

```bash
cd /workspace
npm install
node src/bot.js
```

L'API sera automatiquement lancée sur le port 3001.

### 2. Variables d'Environnement

Créez ou modifiez le fichier `.env` à la racine du projet :

```env
# Configuration Discord
DISCORD_TOKEN=votre_token_discord
CLIENT_ID=votre_client_id
DISCORD_CLIENT_SECRET=votre_client_secret

# Configuration API
API_PORT=3001
API_REDIRECT_URI=http://votre-ip:3001/auth/callback
```

### 3. Configuration du Client OAuth2 Discord

1. Allez sur [Discord Developer Portal](https://discord.com/developers/applications)
2. Sélectionnez votre application
3. Dans "OAuth2" → "Redirects", ajoutez :
   - `http://VOTRE_IP:3001/auth/callback`
   - `bagbot://oauth`

### 4. Compilation de l'Application Android

#### Option A : Avec Android Studio (Recommandé)
1. Ouvrez Android Studio
2. Ouvrez le dossier `android-app`
3. Attendez la synchronisation Gradle
4. Connectez votre appareil Android ou lancez un émulateur
5. Cliquez sur "Run" (▶️)

#### Option B : En ligne de commande
```bash
cd android-app
./gradlew assembleDebug
# L'APK sera dans app/build/outputs/apk/debug/
```

## 📱 Utilisation

### Premier Lancement

1. **Configuration du Serveur**
   - Entrez l'URL de votre serveur : `http://VOTRE_IP:3001`
   - L'application vérifiera automatiquement la connexion
   - Exemple : `http://192.168.1.100:3001`

2. **Connexion Discord**
   - Cliquez sur "Se connecter avec Discord"
   - Autorisez l'application dans votre navigateur
   - Vous serez automatiquement redirigé vers l'app

3. **Dashboard**
   - Vous verrez les statistiques en temps réel du bot
   - Accédez aux différentes fonctionnalités via les boutons

### Navigation

#### 📊 Dashboard
- Statistiques en temps réel
- Nombre de serveurs et utilisateurs
- Uptime du bot
- Ping

#### 🏠 Serveurs
- Liste de tous les serveurs
- Accès rapide aux contrôles de musique
- Accès aux outils de modération

#### 📝 Commandes
- Liste complète des commandes disponibles
- Description de chaque commande
- Options requises et optionnelles

#### 🎵 Musique
- Titre en cours de lecture
- Contrôles : Play, Pause, Skip, Stop
- File d'attente
- Durée des pistes

#### 🛡️ Modération
- Expulser un utilisateur
- Bannir un utilisateur
- Historique des actions (à venir)

#### ⚙️ Paramètres
- Modifier l'URL du serveur
- Se déconnecter
- Informations sur l'app

## 🔒 Sécurité

### Réseau
- Utilisez **HTTPS** en production (avec certificat SSL)
- Configurez un pare-feu pour limiter l'accès à l'API
- Utilisez un VPN pour accéder à votre serveur depuis l'extérieur

### Authentification
- Les tokens de session expirent après 7 jours
- Aucun mot de passe n'est stocké sur l'appareil
- Utilisation de OAuth2 pour l'authentification

### Recommandations
```bash
# Limitez l'accès à l'API dans votre firewall
sudo ufw allow from 192.168.1.0/24 to any port 3001

# Ou utilisez un reverse proxy avec Nginx
sudo apt install nginx
# Configurez SSL avec Let's Encrypt
```

## 🌐 Accès depuis l'Extérieur

### Option 1 : VPN (Recommandé)
Utilisez WireGuard ou OpenVPN pour créer un tunnel sécurisé vers votre réseau local.

### Option 2 : Redirection de Port
1. Configurez votre Freebox pour rediriger le port 3001
2. Utilisez votre IP publique dans l'app
3. ⚠️ **Activez HTTPS obligatoirement**

### Option 3 : Cloudflare Tunnel
```bash
# Installez cloudflared
curl -L https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64.deb -o cloudflared.deb
sudo dpkg -i cloudflared.deb

# Créez un tunnel
cloudflared tunnel create bagbot-api
cloudflared tunnel route dns bagbot-api api.votredomaine.com
```

## 🐛 Dépannage

### L'application ne se connecte pas
1. Vérifiez que le bot est en cours d'exécution
2. Vérifiez l'URL du serveur (doit inclure `http://` ou `https://`)
3. Testez l'API depuis un navigateur : `http://VOTRE_IP:3001/health`
4. Vérifiez que votre appareil est sur le même réseau

### Erreur d'authentification Discord
1. Vérifiez que `DISCORD_CLIENT_SECRET` est configuré
2. Vérifiez les redirects OAuth2 dans le Developer Portal
3. Vérifiez que `API_REDIRECT_URI` correspond à votre configuration

### L'API ne démarre pas
```bash
# Vérifiez les logs
tail -f restart-log.txt

# Vérifiez que le port n'est pas déjà utilisé
netstat -tlnp | grep 3001

# Testez manuellement
curl http://localhost:3001/health
```

## 📝 Structure du Projet

```
android-app/
├── app/
│   ├── src/main/
│   │   ├── java/com/bagbot/manager/
│   │   │   ├── data/
│   │   │   │   ├── api/          # Client API Retrofit
│   │   │   │   ├── models/       # Modèles de données
│   │   │   │   └── repository/   # Repository pattern
│   │   │   ├── ui/
│   │   │   │   ├── navigation/   # Navigation Compose
│   │   │   │   ├── screens/      # Écrans de l'app
│   │   │   │   └── theme/        # Thème Material Design
│   │   │   ├── BagBotApp.kt
│   │   │   └── MainActivity.kt
│   │   ├── res/
│   │   │   ├── values/           # Ressources (strings, themes)
│   │   │   └── xml/              # Configuration backup
│   │   └── AndroidManifest.xml
│   └── build.gradle.kts
├── build.gradle.kts
└── settings.gradle.kts
```

## 🛠️ Technologies Utilisées

### Backend (API)
- **Node.js** - Runtime JavaScript
- **Express** - Framework web
- **Discord.js** - Intégration Discord
- **Axios** - Client HTTP

### Android App
- **Kotlin** - Langage de programmation
- **Jetpack Compose** - UI moderne
- **Material Design 3** - Design system
- **Retrofit** - Client HTTP
- **Coroutines** - Asynchrone
- **DataStore** - Stockage local
- **Navigation Compose** - Navigation

## 🔄 Mises à Jour

Pour mettre à jour le bot et l'API :

```bash
cd /workspace
git pull
npm install
pm2 restart bagbot  # Si vous utilisez PM2
```

Pour l'application Android, recompilez simplement l'APK.

## 📄 Licence

Ce projet est fourni tel quel pour votre usage personnel.

## 👥 Support

Pour toute question ou problème :
1. Vérifiez la section Dépannage
2. Consultez les logs du bot : `tail -f restart-log.txt`
3. Vérifiez les logs Android via Logcat

## 🎯 Roadmap

### Version 1.1 (À venir)
- [ ] Notifications push pour les événements importants
- [ ] Widget Android pour les stats du bot
- [ ] Mode sombre/clair
- [ ] Support multilingue (EN/FR)
- [ ] Gestion avancée de l'économie
- [ ] Historique des actions de modération

### Version 1.2
- [ ] Graphiques de statistiques
- [ ] Planification de commandes
- [ ] Backup/Restore depuis l'app
- [ ] Gestion des rôles
- [ ] Logs en temps réel

## ⚡ Performance

### Optimisations Recommandées
- L'application utilise un cache local pour les données
- Les statistiques se rafraîchissent automatiquement toutes les 10 secondes
- La musique se rafraîchit toutes les 5 secondes
- Utilisez une connexion WiFi stable pour une meilleure expérience

## 🙏 Remerciements

Merci d'utiliser BagBot Manager !

---

**Note** : Cette application est conçue pour fonctionner avec le bot Discord BagBot. Assurez-vous que le bot est correctement configuré et en cours d'exécution avant d'utiliser l'application mobile.
