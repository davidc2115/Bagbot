# 🔍 Diagnostic: Problème de connexion Application Android

## ✅ Problème identifié

L'application Android **ne peut pas se connecter** parce que :

### 🚨 Cause principale : API mobile non démarrée

L'API REST pour l'application Android (port **3001**) n'est **PAS en cours d'exécution**.

## 🔎 Vérifications effectuées

### 1. ✅ Application Android trouvée
- Emplacement : `/workspace/android-app/`
- Structure : Complète et fonctionnelle
- Configuration : Correcte (permissions réseau, cleartext autorisé)

### 2. ✅ API REST trouvée
- Emplacement : `/workspace/src/api/server.js`
- Port configuré : **3001**
- Authentification : OAuth2 Discord

### 3. ❌ API non démarrée
```bash
# Test effectué :
netstat -tuln | grep 3001
# Résultat : Port 3001 not listening
```

### 4. ❌ Bot Discord non démarré
```bash
# Test effectué :
ps aux | grep 'node.*bot.js'
# Résultat : Aucun processus trouvé
```

## 📋 Architecture du système

### Deux systèmes distincts :

#### 1. Dashboard Web (✅ OPÉRATIONNEL)
- **Port** : 33002
- **URL** : http://88.174.155.230:33002
- **Serveur** : `/workspace/dashboard-v2/server-v2.js`
- **Usage** : Gestion du bot depuis navigateur web
- **Status** : ✅ EN COURS D'EXÉCUTION

#### 2. API Mobile (❌ NON DÉMARRÉE)
- **Port** : 3001
- **URL** : http://88.174.155.230:3001
- **Serveur** : `/workspace/src/api/server.js`
- **Usage** : Gestion du bot depuis application Android
- **Status** : ❌ ARRÊTÉE
- **Raison** : Le bot Discord doit être démarré pour lancer l'API

## 🔧 Solution requise

Pour que l'application Android fonctionne, il faut :

### Étape 1 : Configurer les variables d'environnement ✅

Fichier `/workspace/.env` mis à jour avec :
```env
# Discord Bot Configuration
DISCORD_TOKEN=YOUR_DISCORD_BOT_TOKEN_HERE
GUILD_ID=1360897918504271882
CLIENT_ID=1414216173809307780

# API Mobile pour l'application Android
API_PORT=3001
DISCORD_CLIENT_SECRET=YOUR_CLIENT_SECRET_HERE
API_REDIRECT_URI=http://88.174.155.230:3001/auth/callback

# Dashboard
DASHBOARD_PORT=33002
```

### Étape 2 : Obtenir le Client Secret Discord ⚠️

**IMPORTANT** : Vous devez obtenir votre `DISCORD_CLIENT_SECRET` :

1. Aller sur https://discord.com/developers/applications
2. Sélectionner votre application bot
3. Onglet "OAuth2" → "General"
4. Copier le **Client Secret**
5. Remplacer `YOUR_CLIENT_SECRET_HERE` dans `/workspace/.env`

### Étape 3 : Configurer les redirections OAuth2 ⚠️

Dans le Discord Developer Portal :
1. Onglet "OAuth2" → "Redirects"
2. Ajouter ces URLs :
   ```
   http://88.174.155.230:3001/auth/callback
   http://localhost:3001/auth/callback
   bagbot://oauth
   ```
3. Sauvegarder

### Étape 4 : Démarrer le bot Discord

Le bot lancera automatiquement l'API mobile :

```bash
cd /workspace

# Option 1 : Démarrage simple (test)
node src/bot.js

# Option 2 : Avec PM2 (recommandé)
pm2 start src/bot.js --name bagbot
pm2 save

# Option 3 : En arrière-plan
nohup node src/bot.js > bot.log 2>&1 &
```

### Étape 5 : Vérifier que l'API fonctionne

```bash
# Attendre quelques secondes puis tester
curl http://88.174.155.230:3001/health

# Réponse attendue :
# {"status":"ok","uptime":...,"timestamp":...,"bot":{"ready":true,"guilds":X}}
```

## 📱 Configuration de l'application Android

### URL à utiliser dans l'app
```
http://88.174.155.230:3001
```

**Note** : Port **3001** (pas 33002)

### Processus de connexion

1. **Ouvrir l'app** sur Android
2. **Configuration initiale** : Entrer `http://88.174.155.230:3001`
3. **Connexion Discord** : 
   - Cliquer sur "Se connecter avec Discord"
   - Navigateur s'ouvre
   - Autoriser l'application
   - Retour automatique vers l'app
4. **Dashboard** : Accès complet aux fonctionnalités

### Endpoints API disponibles

| Endpoint | Méthode | Auth | Description |
|----------|---------|------|-------------|
| `/health` | GET | ❌ | Vérifier l'état |
| `/auth/discord/url` | GET | ❌ | Obtenir URL OAuth |
| `/auth/discord/callback` | POST | ❌ | Callback OAuth |
| `/auth/logout` | POST | ✅ | Déconnexion |
| `/bot/stats` | GET | ✅ | Stats générales |
| `/bot/guilds` | GET | ✅ | Liste serveurs |
| `/bot/guilds/:id` | GET | ✅ | Détails serveur |
| `/bot/commands` | GET | ✅ | Liste commandes |
| `/bot/economy/:guildId` | GET | ✅ | Config économie |
| `/bot/economy/:guildId/top` | GET | ✅ | Top économie |
| `/bot/moderation/:guildId/logs` | GET | ✅ | Logs modération |
| `/bot/moderation/:guildId/ban` | POST | ✅ | Bannir |
| `/bot/moderation/:guildId/kick` | POST | ✅ | Expulser |
| `/bot/music/:guildId/status` | GET | ✅ | Statut musique |
| `/bot/music/:guildId/control` | POST | ✅ | Contrôler musique |

## 🐛 Dépannage

### Le bot ne démarre pas

**Vérifier le token Discord** :
```bash
echo $DISCORD_TOKEN
# Ne doit PAS être "YOUR_DISCORD_BOT_TOKEN_HERE"
```

**Vérifier les logs** :
```bash
tail -f bot.log
# ou
pm2 logs bagbot
```

### L'API ne démarre pas avec le bot

**Erreur commune** : `DISCORD_CLIENT_SECRET` manquant

Le bot affichera :
```
[API] ⚠️  Erreur lors du démarrage de l'API: ...
[API] Le bot continuera de fonctionner sans l'API mobile
```

**Solution** : Configurer `DISCORD_CLIENT_SECRET` dans `.env`

### L'app affiche "Network Error"

1. **Vérifier que l'API répond** :
   ```bash
   curl http://88.174.155.230:3001/health
   ```

2. **Vérifier le firewall** :
   ```bash
   sudo ufw status
   # Si actif, autoriser le port 3001 :
   sudo ufw allow 3001/tcp
   ```

3. **Vérifier l'URL dans l'app** : 
   - Doit être `http://88.174.155.230:3001`
   - Pas de trailing slash
   - Port 3001 (pas 33002)

### OAuth ne fonctionne pas

**Vérifier les redirections Discord** :
- Developer Portal → OAuth2 → Redirects
- Doit contenir : `http://88.174.155.230:3001/auth/callback`

**Vérifier les variables** :
```bash
cd /workspace
grep -E "DISCORD_CLIENT_SECRET|API_REDIRECT_URI" .env
```

## 📊 Checklist complète

### Configuration
- [ ] `DISCORD_TOKEN` configuré (valeur réelle, pas placeholder)
- [ ] `DISCORD_CLIENT_SECRET` configuré
- [ ] `CLIENT_ID` configuré
- [ ] `API_PORT=3001` configuré
- [ ] `API_REDIRECT_URI` configuré avec la bonne IP

### Discord Developer Portal
- [ ] Client Secret copié
- [ ] Redirections OAuth2 ajoutées
- [ ] Bot créé et token obtenu

### Serveur
- [ ] Dépendances npm installées (`npm install`)
- [ ] Port 3001 ouvert dans le firewall
- [ ] Bot Discord démarré
- [ ] API répond sur http://88.174.155.230:3001/health

### Application Android
- [ ] APK compilé ou Android Studio configuré
- [ ] App installée sur l'appareil
- [ ] URL configurée : `http://88.174.155.230:3001`
- [ ] Connexion Discord testée

## ✅ Résumé

### Système actuel

| Composant | Status | Port | URL |
|-----------|--------|------|-----|
| **Dashboard Web** | ✅ Running | 33002 | http://88.174.155.230:33002 |
| **API Mobile** | ❌ Stopped | 3001 | http://88.174.155.230:3001 |
| **Bot Discord** | ❌ Stopped | - | - |
| **App Android** | ✅ Prête | - | Attend connexion API |

### Actions requises

1. ⚠️ **Configurer DISCORD_TOKEN** dans `.env` (valeur réelle)
2. ⚠️ **Configurer DISCORD_CLIENT_SECRET** dans `.env`
3. ⚠️ **Configurer redirections OAuth2** sur Discord
4. ⚠️ **Démarrer le bot Discord** : `pm2 start src/bot.js --name bagbot`
5. ✅ **Tester l'API** : `curl http://88.174.155.230:3001/health`
6. ✅ **Ouvrir l'app Android** et configurer l'URL

---

**Une fois ces étapes complétées, l'application Android pourra se connecter ! 🚀**

## 📞 Prochaines étapes

1. Obtenir le `DISCORD_CLIENT_SECRET`
2. Mettre à jour `/workspace/.env`
3. Démarrer le bot : `pm2 start src/bot.js --name bagbot`
4. Tester : `curl http://88.174.155.230:3001/health`
5. Ouvrir l'app Android et se connecter !
