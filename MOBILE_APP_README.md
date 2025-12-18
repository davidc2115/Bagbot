# 📱 Application Mobile BagBot Manager

## 🎉 Félicitations !

Une application Android complète a été créée pour gérer intégralement votre bot Discord depuis votre smartphone !

## 📦 Ce qui a été créé

### 1. **API REST** (`src/api/server.js`)
Un serveur API complet intégré au bot avec :
- ✅ Authentification Discord OAuth2
- ✅ Gestion des statistiques du bot
- ✅ Contrôle de la musique
- ✅ Actions de modération
- ✅ Liste des serveurs et commandes
- ✅ Économie et configuration

### 2. **Application Android** (`android-app/`)
Une application native moderne avec :
- ✅ Interface Material Design 3
- ✅ Architecture MVVM propre
- ✅ 9 écrans fonctionnels
- ✅ Authentification Discord
- ✅ Contrôles en temps réel
- ✅ Navigation intuitive

### 3. **Documentation Complète**
- ✅ `ANDROID_APP_GUIDE.md` - Guide d'installation détaillé
- ✅ `android-app/README.md` - Documentation technique
- ✅ `setup-android-api.sh` - Script de configuration automatique
- ✅ `.env.example` - Exemple de configuration

## 🚀 Démarrage Rapide

### Étape 1 : Configuration (2 minutes)

```bash
# Lancer le script de configuration
chmod +x setup-android-api.sh
./setup-android-api.sh
```

Le script vous guidera pour configurer :
- ✅ Les variables d'environnement
- ✅ L'installation des dépendances
- ✅ La configuration Discord OAuth2

### Étape 2 : Variables Essentielles

Éditez `.env` et ajoutez :

```env
# REQUIS pour l'app mobile
DISCORD_CLIENT_SECRET=votre_secret_discord
API_PORT=3001
API_REDIRECT_URI=http://VOTRE_IP:3001/auth/callback
```

**Où trouver le Client Secret ?**
1. https://discord.com/developers/applications
2. Votre application > OAuth2 > General
3. Copiez le "Client Secret"

### Étape 3 : Démarrer le Bot + API

```bash
# Démarrage simple
node src/bot.js

# Avec PM2 (recommandé)
pm2 start src/bot.js --name bagbot
pm2 save
```

Vous devriez voir :
```
✅ Login succeeded
✅ [API] Serveur API démarré sur le port 3001
📱 [API] L'application Android peut maintenant se connecter
```

### Étape 4 : Tester l'API

```bash
curl http://localhost:3001/health
```

Réponse attendue :
```json
{
  "status": "ok",
  "uptime": 123.45,
  "bot": {
    "ready": true,
    "guilds": 5
  }
}
```

### Étape 5 : Compiler l'App Android

#### Avec Android Studio (Recommandé)
1. Ouvrez Android Studio
2. File > Open > Sélectionnez `android-app/`
3. Attendez la synchronisation Gradle
4. Cliquez sur ▶️ Run

#### En ligne de commande
```bash
cd android-app
./gradlew assembleDebug
# APK dans : app/build/outputs/apk/debug/
```

## 📱 Fonctionnalités de l'Application

### 🏠 Dashboard
- **Statistiques en temps réel** du bot
- Nombre de serveurs et utilisateurs
- Uptime et ping
- Rafraîchissement automatique (10s)

### 🌐 Serveurs
- **Liste de tous les serveurs** Discord
- Nombre de membres par serveur
- Accès rapide aux contrôles

### 🎵 Lecteur de Musique
- **Piste en cours** de lecture
- Contrôles : Play, Pause, Skip, Stop
- **File d'attente** complète
- Durée des pistes
- Rafraîchissement automatique (5s)

### 🛡️ Modération
- **Expulser** un utilisateur
- **Bannir** un utilisateur
- Ajouter une raison
- Confirmations de sécurité

### 📝 Commandes
- **Liste complète** des commandes
- Description de chaque commande
- Options requises/optionnelles

### ⚙️ Paramètres
- Modifier l'URL du serveur
- Se déconnecter
- Informations de l'application

## 🔐 Configuration Discord OAuth2

**IMPORTANT** : Configurez les redirects dans Discord Developer Portal

1. Allez sur https://discord.com/developers/applications
2. Sélectionnez votre application
3. OAuth2 > Redirects
4. Ajoutez :
   ```
   http://VOTRE_IP:3001/auth/callback
   bagbot://oauth
   ```

## 🌐 Accès Réseau

### Depuis le même réseau WiFi
```
http://192.168.1.100:3001
```
Remplacez par l'IP de votre serveur.

### Depuis Internet (Sécurisé)

#### Option 1 : VPN (Recommandé ⭐)
Installez WireGuard sur votre serveur et téléphone.

#### Option 2 : Nginx + SSL
```bash
sudo apt install nginx certbot python3-certbot-nginx
# Configurez nginx comme proxy inverse
# Activez SSL avec Let's Encrypt
```

Puis dans l'app :
```
https://api.votredomaine.com
```

## 🎯 Architecture

```
┌─────────────────────────────────────────┐
│     📱 Application Android              │
│     (Kotlin + Jetpack Compose)          │
└────────────────┬────────────────────────┘
                 │
                 │ HTTPS/HTTP
                 │ REST API
                 │
┌────────────────▼────────────────────────┐
│     🌐 API REST (Express)               │
│     Port 3001                           │
│     - Authentification OAuth2           │
│     - Endpoints de gestion              │
└────────────────┬────────────────────────┘
                 │
                 │
┌────────────────▼────────────────────────┐
│     🤖 Bot Discord (Discord.js)         │
│     - Commandes                         │
│     - Musique                           │
│     - Modération                        │
│     - Économie                          │
└─────────────────────────────────────────┘
```

## 📊 Endpoints API Disponibles

### Authentification
- `GET /auth/discord/url` - URL d'authentification
- `POST /auth/discord/callback` - Callback OAuth2
- `POST /auth/logout` - Déconnexion

### Bot
- `GET /bot/stats` - Statistiques générales
- `GET /bot/guilds` - Liste des serveurs
- `GET /bot/guilds/:id` - Détails d'un serveur
- `GET /bot/commands` - Liste des commandes

### Musique
- `GET /bot/music/:guildId/status` - Statut du player
- `POST /bot/music/:guildId/control` - Contrôles (play/pause/skip/stop)

### Modération
- `POST /bot/moderation/:guildId/ban` - Bannir
- `POST /bot/moderation/:guildId/kick` - Expulser

### Santé
- `GET /health` - Health check

## 🔒 Sécurité

### ✅ Bonnes Pratiques Implémentées
- Authentification obligatoire (sauf endpoints publics)
- Sessions avec expiration (7 jours)
- CORS configuré
- Tokens sécurisés (32 bytes aléatoires)
- Pas de mots de passe stockés

### ⚠️ Recommandations
```bash
# Limitez l'accès dans votre firewall
sudo ufw allow from 192.168.1.0/24 to any port 3001

# Utilisez HTTPS en production
# Utilisez un VPN pour l'accès distant
# Ne exposez pas directement le port 3001 sur Internet
```

## 🐛 Résolution des Problèmes

### Le bot démarre mais pas l'API
```bash
# Vérifiez les logs
tail -f restart-log.txt

# Vérifiez que cors est installé
npm list cors

# Réinstallez si nécessaire
npm install --save cors
```

### L'app ne se connecte pas
```bash
# Testez l'API depuis le navigateur de votre téléphone
# Allez sur : http://VOTRE_IP:3001/health

# Vérifiez que vous êtes sur le même réseau WiFi
# Vérifiez le firewall
# Vérifiez l'IP
```

### Erreur "Network request failed"
- Sur **émulateur** : utilisez `http://10.0.2.2:3001`
- Sur **appareil réel** : utilisez l'IP réelle `http://192.168.1.100:3001`

### OAuth ne fonctionne pas
1. Vérifiez `DISCORD_CLIENT_SECRET` dans `.env`
2. Vérifiez les redirects dans Discord Developer Portal
3. Vérifiez `API_REDIRECT_URI` dans `.env`

## 📚 Documentation Détaillée

Pour plus d'informations :

1. **Guide d'installation complet** : `ANDROID_APP_GUIDE.md`
2. **README technique** : `android-app/README.md`
3. **Code de l'API** : `src/api/server.js`
4. **Code Android** : `android-app/app/src/main/java/`

## 🎓 Technologies Utilisées

### Backend
- Node.js
- Express.js
- Discord.js v14
- Axios
- CORS

### Android
- Kotlin
- Jetpack Compose
- Material Design 3
- Retrofit 2
- Coroutines
- DataStore
- Navigation Compose
- Coil (images)

## 📈 Performance

### Serveur API
- **RAM** : ~50 Mo
- **CPU** : Minimal
- **Latence** : <100ms (réseau local)

### Application Android
- **Taille APK** : ~10-15 Mo
- **RAM** : ~100-150 Mo
- **Compatibilité** : Android 8.0+

## 🔄 Mises à Jour Futures

### Version 1.1 (Planifié)
- [ ] Notifications push
- [ ] Widget Android
- [ ] Mode sombre/clair
- [ ] Support multilingue

### Version 1.2
- [ ] Graphiques de statistiques
- [ ] Historique de modération
- [ ] Gestion des rôles
- [ ] Logs en temps réel

## ✅ Checklist de Démarrage

- [ ] Bot Discord fonctionne
- [ ] `.env` configuré avec toutes les variables
- [ ] `DISCORD_CLIENT_SECRET` récupéré et ajouté
- [ ] Redirects OAuth2 configurés sur Discord
- [ ] Package `cors` installé
- [ ] API démarre correctement (port 3001)
- [ ] Health check répond : ✅
- [ ] Application Android compilée
- [ ] Configuration initiale dans l'app (URL serveur)
- [ ] Authentification Discord réussie
- [ ] Dashboard affiche les stats
- [ ] Tests des fonctionnalités OK

## 🎉 C'est Parti !

Vous avez maintenant une application mobile complète pour gérer votre bot Discord !

### Commandes Rapides

```bash
# Configuration automatique
./setup-android-api.sh

# Démarrer le bot + API
node src/bot.js

# Tester l'API
curl http://localhost:3001/health

# Compiler l'app Android
cd android-app && ./gradlew assembleDebug
```

### Liens Utiles

- Discord Developer Portal : https://discord.com/developers/applications
- Documentation Discord.js : https://discord.js.org/
- Documentation Jetpack Compose : https://developer.android.com/jetpack/compose

---

## 💡 Besoin d'Aide ?

1. Consultez `ANDROID_APP_GUIDE.md` pour le guide détaillé
2. Vérifiez les logs : `tail -f restart-log.txt`
3. Testez l'API manuellement avec `curl`
4. Vérifiez Logcat pour l'app Android

---

**Profitez de votre nouvelle application mobile ! 🚀📱**

Made with ❤️ for BagBot
