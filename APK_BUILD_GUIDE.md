# 📱 Guide de Compilation APK BagBot Manager v2.0

## ✅ Configuration terminée !

L'APK sera compilé automatiquement par GitHub Actions.

## 🚀 Release créé

### Tag : `android-v2.0`
### Branche : `android-v2.0`

## 📥 Comment obtenir l'APK

### Option 1 : Via GitHub Releases (Automatique)

1. **Aller sur GitHub** : https://github.com/VOTRE_USER/VOTRE_REPO/releases
2. **Trouver la release** "android-v2.0"
3. **Télécharger l'APK** dans les "Assets"
4. **Installer** sur votre appareil Android

### Option 2 : Déclencher manuellement la compilation

Si la compilation automatique ne démarre pas :

1. Aller sur : https://github.com/VOTRE_USER/VOTRE_REPO/actions
2. Cliquer sur "Build Android APK"
3. Cliquer sur "Run workflow"
4. Sélectionner la branche `android-v2.0`
5. Entrer la version : `2.0`
6. Cliquer "Run workflow"

L'APK sera disponible dans :
- Les "Artifacts" du workflow (disponible 30 jours)
- ET dans une nouvelle release automatique

## ⚙️ Configuration requise pour utiliser l'APK

### 📱 Sur l'appareil Android

1. **Installer l'APK**
   - Android 8.0 (API 26) minimum requis
   - Autoriser l'installation depuis sources inconnues si nécessaire

2. **Configurer l'URL**
   - Au premier lancement, entrer : `http://88.174.155.230:33001`
   - Port **33001** (pas 3001, pas 33002)

3. **Se connecter avec Discord**
   - OAuth2 automatique
   - Autoriser l'application
   - Retour automatique vers l'app

### 🖥️ Sur le serveur

#### 1. Variables d'environnement

Éditer `/workspace/.env` :

```env
# Discord Bot
DISCORD_TOKEN=votre_token_bot
CLIENT_ID=1414216173809307780
GUILD_ID=1360897918504271882

# API Mobile (PORT 33001 !)
API_PORT=33001
DISCORD_CLIENT_SECRET=votre_client_secret
API_REDIRECT_URI=http://88.174.155.230:33001/auth/callback
```

#### 2. Discord Developer Portal

Ajouter dans OAuth2 → Redirects :
```
http://88.174.155.230:33001/auth/callback
http://localhost:33001/auth/callback
bagbot://oauth
```

#### 3. Démarrer le bot

Le bot lancera automatiquement l'API sur le port 33001 :

```bash
cd /workspace

# Avec PM2 (recommandé)
pm2 start src/bot.js --name bagbot
pm2 save

# Ou en direct
node src/bot.js
```

Vous devriez voir :
```
Login succeeded
[API] ✅ Serveur API démarré sur le port 33001
[API] 📱 L'application Android peut maintenant se connecter
```

#### 4. Tester l'API

```bash
curl http://88.174.155.230:33001/health
```

Réponse attendue :
```json
{
  "status": "ok",
  "uptime": 123.45,
  "timestamp": 1234567890,
  "bot": {
    "ready": true,
    "guilds": 5
  }
}
```

#### 5. Ouvrir le port (si firewall actif)

```bash
sudo ufw allow 33001/tcp
```

## 📊 Endpoints API disponibles

| Endpoint | Méthode | Auth | Description |
|----------|---------|------|-------------|
| `/health` | GET | ❌ | Vérifier l'état |
| `/auth/discord/url` | GET | ❌ | URL OAuth |
| `/auth/discord/callback` | POST | ❌ | Callback OAuth |
| `/bot/stats` | GET | ✅ | Stats générales |
| `/bot/guilds` | GET | ✅ | Liste serveurs |
| `/bot/commands` | GET | ✅ | Liste commandes |
| `/bot/economy/:guildId` | GET | ✅ | Config économie |
| `/bot/music/:guildId/status` | GET | ✅ | Statut musique |
| `/bot/moderation/:guildId/ban` | POST | ✅ | Bannir |

## 🎯 Fonctionnalités de l'app

### ✅ Disponibles

- 📊 Dashboard temps réel
- 🎮 Liste des serveurs Discord
- 💬 Liste des commandes
- 🎵 Contrôle de la musique (play/pause/skip/stop)
- 🔨 Actions de modération (ban/kick)
- 📈 Statistiques détaillées
- 🔄 Rafraîchissement automatique
- 🔐 Authentification Discord OAuth2

### 🚀 Version 2.0

- Port API changé de 3001 à **33001**
- Interface Material Design 3
- Navigation améliorée
- Performance optimisée
- Support Android 8.0+

## 🐛 Dépannage

### L'APK n'apparaît pas sur GitHub

1. Vérifier que le workflow s'est exécuté : `Actions` > `Build Android APK`
2. Vérifier les logs du workflow
3. L'APK est dans `Artifacts` même si la release échoue

### L'app ne se connecte pas

**Erreur "Network Error"**
- Vérifier que le bot est démarré : `ps aux | grep bot.js`
- Vérifier que l'API écoute : `netstat -tuln | grep 33001`
- Tester l'API : `curl http://88.174.155.230:33001/health`
- Vérifier l'URL dans l'app : doit être `http://88.174.155.230:33001`

**Erreur "Connection refused"**
- Vérifier le firewall : `sudo ufw status`
- Ouvrir le port : `sudo ufw allow 33001/tcp`
- Vérifier que l'appareil est sur le même réseau ou a accès à l'IP

**OAuth ne fonctionne pas**
- Vérifier `DISCORD_CLIENT_SECRET` dans `.env`
- Vérifier les redirections sur Discord Developer Portal
- Vérifier `API_REDIRECT_URI` dans `.env`

### Le bot démarre mais pas l'API

Vérifier les logs :
```bash
pm2 logs bagbot | grep API
```

Si vous voyez :
```
[API] ⚠️  Erreur lors du démarrage de l'API
```

Cela signifie que `DISCORD_CLIENT_SECRET` est manquant ou invalide.

## 📦 Structure du release

Quand le workflow termine, vous trouverez :

```
📦 Release android-v2.0
 ├── 📱 bagbot-manager-v2.0.apk (ou app-release-unsigned.apk)
 ├── 📄 Description complète
 ├── ⚙️ Instructions d'installation
 └── 🔧 Configuration serveur
```

## 📚 Documentation

- **Guide complet** : `/workspace/ANDROID_APP_GUIDE.md`
- **Configuration API** : `/workspace/android-app/API_CONFIG.txt`
- **Workflow GitHub** : `/.github/workflows/android-build.yml`

## ✅ Checklist

### Avant d'utiliser l'app

- [ ] APK téléchargé depuis GitHub Releases
- [ ] APK installé sur Android
- [ ] `.env` configuré avec les vraies valeurs
- [ ] Discord OAuth2 redirections ajoutées
- [ ] Bot démarré avec PM2
- [ ] API répond sur port 33001
- [ ] Firewall autorise le port 33001
- [ ] App configurée avec URL correcte
- [ ] Connexion Discord testée

## 🎉 C'est prêt !

Une fois l'APK téléchargé depuis GitHub et le serveur configuré :

1. ✅ Installer l'APK
2. ✅ Configurer : `http://88.174.155.230:33001`
3. ✅ Se connecter avec Discord
4. 🎊 Profiter !

---

**Version** : 2.0  
**Port API** : 33001  
**Android minimum** : 8.0 (API 26)  
**Tag GitHub** : android-v2.0  
**Date** : 17 décembre 2025
