# ⚡ Démarrage Ultra-Rapide - Application Android BagBot

## 🎯 En 5 Minutes Chrono !

### Étape 1️⃣ : Configuration (2 min)

```bash
cd /workspace

# Lancer le script de configuration automatique
chmod +x setup-android-api.sh
./setup-android-api.sh
```

### Étape 2️⃣ : Récupérer le Client Secret Discord (1 min)

1. Ouvrez https://discord.com/developers/applications
2. Sélectionnez votre application bot
3. Allez dans **OAuth2** → **General**
4. Copiez le **Client Secret**
5. Collez-le dans `.env` :

```bash
nano .env
# Ajoutez cette ligne :
DISCORD_CLIENT_SECRET=votre_secret_ici
```

### Étape 3️⃣ : Configurer les Redirects OAuth2 (30 sec)

Dans Discord Developer Portal :
- OAuth2 → Redirects
- Ajoutez ces 2 URLs :
  ```
  http://VOTRE_IP:3001/auth/callback
  bagbot://oauth
  ```
  (Remplacez VOTRE_IP par l'IP de votre serveur, ex: 192.168.1.100)

### Étape 4️⃣ : Démarrer le Bot + API (30 sec)

```bash
# Démarrage simple
node src/bot.js

# OU avec PM2 (recommandé)
pm2 start src/bot.js --name bagbot
pm2 save
```

✅ Vous devriez voir :
```
Login succeeded
[API] ✅ Serveur API démarré sur le port 3001
[API] 📱 L'application Android peut maintenant se connecter
```

### Étape 5️⃣ : Tester l'API (10 sec)

```bash
curl http://localhost:3001/health
```

✅ Réponse attendue :
```json
{"status":"ok","uptime":123.45,"bot":{"ready":true,"guilds":5}}
```

---

## 📱 Compiler l'Application Android

### Avec Android Studio (Recommandé) ⭐

```bash
# 1. Ouvrez Android Studio
# 2. File > Open > Sélectionnez "android-app"
# 3. Attendez la synchronisation Gradle (5-10 min la première fois)
# 4. Cliquez sur ▶️ Run
```

### En Ligne de Commande

```bash
cd android-app

# Donner les permissions
chmod +x gradlew

# Compiler l'APK
./gradlew assembleDebug

# L'APK sera dans :
# app/build/outputs/apk/debug/app-debug.apk
```

---

## 🚀 Première Utilisation de l'App

### 1. Configuration du Serveur

Entrez l'URL de votre serveur :
```
http://192.168.1.100:3001
```
(Remplacez par votre IP)

### 2. Connexion Discord

Cliquez sur **"Se connecter avec Discord"**

### 3. C'est Parti ! 🎉

Vous êtes maintenant sur le Dashboard avec :
- 📊 Statistiques en temps réel
- 🏠 Liste des serveurs
- 🎵 Contrôle de la musique
- 🛡️ Actions de modération
- 📝 Commandes du bot

---

## 🆘 Problèmes Courants

### ❌ L'API ne démarre pas

```bash
# Vérifiez que cors est installé
npm list cors

# Si non installé :
npm install --save cors
```

### ❌ L'app ne se connecte pas

1. Vérifiez que vous êtes sur le même WiFi
2. Testez l'API depuis le navigateur de votre téléphone :
   ```
   http://VOTRE_IP:3001/health
   ```
3. Sur émulateur Android, utilisez : `http://10.0.2.2:3001`

### ❌ OAuth ne fonctionne pas

1. Vérifiez `DISCORD_CLIENT_SECRET` dans `.env`
2. Vérifiez les redirects dans Discord Developer Portal
3. Redémarrez le bot : `pm2 restart bagbot`

---

## 📚 Documentation Complète

| Fichier | Description |
|---------|-------------|
| `MOBILE_APP_README.md` | Présentation générale et guide rapide |
| `ANDROID_APP_GUIDE.md` | Guide d'installation détaillé |
| `android-app/README.md` | Documentation technique |
| `RESUME_CREATION_APP.md` | Récapitulatif complet de création |

---

## ✅ Checklist

- [ ] Script `setup-android-api.sh` exécuté
- [ ] `DISCORD_CLIENT_SECRET` ajouté dans `.env`
- [ ] Redirects OAuth2 configurés sur Discord
- [ ] Bot démarré avec l'API (port 3001)
- [ ] Health check répond : `curl http://localhost:3001/health`
- [ ] Application Android compilée
- [ ] URL du serveur configurée dans l'app
- [ ] Authentification Discord réussie
- [ ] Dashboard affiche les statistiques

---

## 🎉 Vous êtes Prêt !

Vous avez maintenant une application Android complète pour gérer votre bot Discord ! 🚀📱

### Commandes Utiles

```bash
# Démarrer le bot
node src/bot.js

# Voir les logs
pm2 logs bagbot

# Redémarrer le bot
pm2 restart bagbot

# Tester l'API
curl http://localhost:3001/health

# Compiler l'app
cd android-app && ./gradlew assembleDebug
```

---

**Besoin d'aide ?** Consultez `ANDROID_APP_GUIDE.md` pour plus de détails !

🎊 **Profitez de votre nouvelle app mobile !** 🎊
