# 📱 Instructions Finales - APK BagBot Manager v2.0

## ✅ TOUT EST PRÊT !

Le code a été poussé vers GitHub et la compilation de l'APK est en cours.

## 📥 TÉLÉCHARGEMENT DE L'APK

### Étape 1 : Accéder à GitHub Releases

Ouvrez cette URL dans votre navigateur :

**https://github.com/mel805/Bagbot/releases/tag/android-v2.0**

### Étape 2 : Attendre la compilation

Le workflow GitHub Actions est en train de compiler l'APK.  
⏱️ Temps estimé : **5 à 10 minutes**

Vous pouvez suivre la progression ici :  
**https://github.com/mel805/Bagbot/actions**

### Étape 3 : Télécharger l'APK

Une fois le workflow terminé :
1. Rafraîchir la page des releases
2. Descendre jusqu'à "Assets"
3. Cliquer sur **bagbot-manager-v2.0.apk** pour télécharger

---

## 📱 INSTALLATION DE L'APK

### Sur votre appareil Android

1. **Transférer l'APK** sur votre téléphone (via USB, email, cloud, etc.)

2. **Autoriser les sources inconnues**
   - Paramètres → Sécurité → Sources inconnues
   - Ou lors de l'installation, autoriser depuis cette source

3. **Installer l'APK**
   - Ouvrir le fichier APK
   - Suivre les instructions
   - Autoriser les permissions (Internet, Réseau)

4. **Ouvrir l'application**
   - Chercher "BagBot Manager" dans vos apps
   - Lancer l'application

---

## ⚙️ CONFIGURATION SERVEUR (OBLIGATOIRE)

### Avant d'utiliser l'app, configurer le serveur :

#### 1. Obtenir les tokens Discord

**Bot Token** :
1. https://discord.com/developers/applications
2. Votre application → Bot
3. Copier le Token

**Client Secret** :
1. Même page → OAuth2 → General
2. Copier le Client Secret

#### 2. Éditer `/workspace/.env`

```bash
# Depuis le serveur
nano /workspace/.env
```

Ajouter/modifier ces lignes :
```env
DISCORD_TOKEN=votre_vrai_token_bot
DISCORD_CLIENT_SECRET=votre_vrai_client_secret
CLIENT_ID=1414216173809307780
GUILD_ID=1360897918504271882

API_PORT=33001
API_REDIRECT_URI=http://88.174.155.230:33001/auth/callback
```

**⚠️ Remplacer les valeurs YOUR_... par vos vraies valeurs !**

#### 3. Configurer OAuth2 sur Discord

1. Retour sur https://discord.com/developers/applications
2. Votre application → OAuth2 → Redirects
3. Cliquer "Add Redirect"
4. Ajouter ces 3 URLs :

```
http://88.174.155.230:33001/auth/callback
http://localhost:33001/auth/callback
bagbot://oauth
```

5. **Sauvegarder**

#### 4. Ouvrir le port 33001 (firewall)

```bash
sudo ufw allow 33001/tcp
sudo ufw status
```

#### 5. Démarrer le bot

```bash
cd /workspace

# Avec PM2 (recommandé pour redémarrage automatique)
pm2 start src/bot.js --name bagbot
pm2 save

# OU en direct pour tester
node src/bot.js
```

Vous devriez voir dans les logs :
```
Login succeeded
[API] ✅ Serveur API démarré sur le port 33001
[API] 📱 L'application Android peut maintenant se connecter
```

#### 6. Tester l'API

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

Si vous voyez cette réponse, **l'API fonctionne !** ✅

---

## 📱 PREMIÈRE UTILISATION DE L'APP

### Configuration initiale

1. **Ouvrir l'app** BagBot Manager
2. **Écran de configuration** apparaît
3. **Entrer l'URL** : `http://88.174.155.230:33001`
4. **Cliquer "Continuer"**
5. L'app teste la connexion

### Connexion Discord

1. **Cliquer "Se connecter avec Discord"**
2. Votre navigateur s'ouvre avec la page Discord
3. **Autoriser l'application**
4. Vous êtes redirigé vers l'app
5. **Connexion réussie !** 🎉

### Utilisation

Une fois connecté, vous avez accès à :

- 📊 **Dashboard** - Stats en temps réel du bot
- 🎮 **Serveurs** - Liste de vos serveurs Discord
- 💬 **Commandes** - Liste des commandes disponibles
- 🎵 **Musique** - Contrôle de la musique (play/pause/skip/stop)
- 🔨 **Modération** - Bannir, expulser des membres
- ⚙️ **Paramètres** - Configuration de l'app

---

## 🐛 DÉPANNAGE

### L'app affiche "Network Error"

#### Vérification 1 : API démarre-t-elle ?
```bash
ps aux | grep 'node.*bot.js'
```
Si rien, démarrer le bot : `pm2 start src/bot.js --name bagbot`

#### Vérification 2 : API écoute-t-elle sur le bon port ?
```bash
netstat -tuln | grep 33001
```
Devrait afficher : `:::33001 ... LISTEN`

#### Vérification 3 : API répond-elle ?
```bash
curl http://88.174.155.230:33001/health
```
Devrait retourner du JSON

#### Vérification 4 : Firewall autorise-t-il le port ?
```bash
sudo ufw status
sudo ufw allow 33001/tcp
```

#### Vérification 5 : URL correcte dans l'app ?
URL doit être **exactement** : `http://88.174.155.230:33001`
- Pas de trailing slash `/`
- Port **33001** (pas 3001, pas 33002)
- `http://` (pas `https://`)

### OAuth Discord ne fonctionne pas

#### Vérifier DISCORD_CLIENT_SECRET
```bash
cd /workspace
grep DISCORD_CLIENT_SECRET .env
```
Ne doit PAS être "YOUR_CLIENT_SECRET_HERE"

#### Vérifier les redirections Discord
Developer Portal → OAuth2 → Redirects doit contenir :
```
http://88.174.155.230:33001/auth/callback
bagbot://oauth
```

#### Vérifier les logs du bot
```bash
pm2 logs bagbot | grep -i oauth
```

### L'app crash au démarrage

1. **Vérifier la version Android** : Android 8.0 minimum
2. **Réinstaller l'app** : Désinstaller puis réinstaller
3. **Vider le cache** : Paramètres app → Stockage → Vider le cache
4. **Vérifier les permissions** : Paramètres app → Autorisations → Internet

### Le workflow GitHub échoue

1. **Voir les logs** : https://github.com/mel805/Bagbot/actions
2. **Cliquer sur le workflow** qui a échoué
3. **Lire les erreurs**
4. Si problème de build, **déclencher manuellement** :
   - Actions → Build Android APK → Run workflow
   - Sélectionner branche `android-v2.0`
   - Version : `2.0`
   - Run workflow

---

## 📊 RÉCAPITULATIF

### Ce qui a été fait

| Action | Status |
|--------|--------|
| API mise à jour (port 33001) | ✅ |
| Version app v2.0 | ✅ |
| Workflow GitHub créé | ✅ |
| Code commit et poussé | ✅ |
| Tag créé | ✅ |
| Compilation lancée | ✅ |

### Ce qu'il reste à faire

| Action | Priorité |
|--------|----------|
| Configurer DISCORD_TOKEN | 🔴 CRITIQUE |
| Configurer DISCORD_CLIENT_SECRET | 🔴 CRITIQUE |
| Ajouter redirections OAuth2 | 🔴 CRITIQUE |
| Démarrer le bot | 🔴 CRITIQUE |
| Télécharger l'APK depuis GitHub | 🟡 Attendre build |
| Installer l'app | 🟡 Après téléchargement |
| Ouvrir le port 33001 | 🟡 Si firewall actif |

---

## 🎯 ORDRE DES ACTIONS

### 1️⃣ Pendant que l'APK compile (maintenant)

```bash
# Configurer .env
nano /workspace/.env
# → Remplacer YOUR_DISCORD_BOT_TOKEN_HERE
# → Remplacer YOUR_CLIENT_SECRET_HERE

# Configurer Discord OAuth2
# → Aller sur Discord Developer Portal
# → Ajouter les redirections

# Démarrer le bot
pm2 start src/bot.js --name bagbot
pm2 save

# Tester
curl http://88.174.155.230:33001/health

# Ouvrir le port
sudo ufw allow 33001/tcp
```

### 2️⃣ Quand l'APK est prêt (5-10 min)

```bash
# Télécharger depuis GitHub Releases
# → https://github.com/mel805/Bagbot/releases/tag/android-v2.0

# Installer sur Android
# → Transférer l'APK
# → Installer

# Configurer l'app
# → URL : http://88.174.155.230:33001

# Se connecter
# → OAuth Discord
# → Profiter !
```

---

## 📞 SI BESOIN D'AIDE

### Logs du serveur
```bash
pm2 logs bagbot
# ou
tail -f /workspace/bot.log
```

### État de l'API
```bash
# Processus
ps aux | grep bot.js

# Port
netstat -tuln | grep 33001

# Test
curl http://88.174.155.230:33001/health
```

### Workflow GitHub
https://github.com/mel805/Bagbot/actions

---

## 🎉 C'EST PRÊT !

**L'APK sera disponible ici dans quelques minutes** :

# 👉 https://github.com/mel805/Bagbot/releases/tag/android-v2.0 👈

Une fois téléchargé :
1. ✅ Installer l'APK
2. ✅ Configurer : `http://88.174.155.230:33001`
3. ✅ Se connecter
4. 🎊 Profiter !

---

**Version** : 2.0  
**Port API** : 33001  
**Date** : 17 décembre 2025  
**Repository** : mel805/Bagbot  
**Tag** : android-v2.0  
**Status** : ✅ PRÊT (compilation en cours)
