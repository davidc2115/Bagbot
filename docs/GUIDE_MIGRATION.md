# 🔄 Guide de Migration - Vers Backend Unifié

## 📌 Vue d'Ensemble

Ce guide vous aide à migrer de l'architecture monolithique (`dashboard-v2/server-v2.js`) vers la nouvelle architecture séparée (`backend/server.js`).

## ⚠️ Avant de Commencer

### Sauvegarde

```bash
# Créer une sauvegarde complète
cd /workspace
tar -czf backup-avant-migration-$(date +%Y%m%d).tar.gz \
  dashboard-v2/ \
  data/ \
  src/ \
  android-app/

# Vérifier la sauvegarde
ls -lh backup-avant-migration-*.tar.gz
```

### Vérifications

- [ ] Backup effectué et vérifié
- [ ] Bot Discord arrêté proprement
- [ ] Dashboard web arrêté
- [ ] Aucune session active dans l'app mobile

## 🚀 Étape 1 : Préparer le Backend

### 1.1 Installer les Dépendances

```bash
cd /workspace/backend
npm install
```

**Vérifier** :
```bash
ls node_modules/ | wc -l
# Devrait afficher au moins 50 packages
```

### 1.2 Créer le fichier .env

```bash
cp .env.example .env
nano .env
```

**Contenu minimal** :
```env
DISCORD_TOKEN=votre_bot_token
GUILD_ID=votre_guild_id
CLIENT_ID=votre_client_id
CLIENT_SECRET=votre_client_secret
PORT=3002
NODE_ENV=production
```

**⚠️ Important** : Utiliser les MÊMES valeurs que dans l'ancien système.

### 1.3 Vérifier les Chemins

Le backend doit pouvoir accéder à `/workspace/data/` :

```bash
# Vérifier que data/ existe
ls -la /workspace/data/

# Devrait contenir :
# - config.json
# - playlists/
# - uploads/
# - backups/ (optionnel)
```

Si `data/` n'existe pas :
```bash
mkdir -p /workspace/data/{playlists,uploads,backups}
cp /workspace/dashboard-v2/data/* /workspace/data/
```

## 🔧 Étape 2 : Tester le Nouveau Backend

### 2.1 Test de Démarrage

```bash
cd /workspace/backend
node server.js
```

**Logs attendus** :
```
[INFO] 📦 Configuration chargée
[INFO] 🚀 Serveur démarré sur le port 3002
[INFO] ✅ Membres Discord récupérés: [N]
```

**Si erreur** :
- Vérifier le `.env`
- Vérifier que le port 3002 est libre : `netstat -tulpn | grep 3002`
- Vérifier les permissions sur `data/` : `chmod -R 755 /workspace/data/`

### 2.2 Test API Basique

Dans un autre terminal :
```bash
curl http://localhost:3002/
# Devrait retourner du HTML
```

### 2.3 Arrêter le Test

```bash
# Ctrl+C dans le terminal du serveur
```

## 🔄 Étape 3 : Arrêter l'Ancien Système

### 3.1 Identifier les Processus

```bash
# Avec PM2
pm2 list

# Ou sans PM2
ps aux | grep node
```

### 3.2 Arrêter les Services

**Avec PM2** :
```bash
# Arrêter le dashboard
pm2 stop dashboard-v2
pm2 delete dashboard-v2

# Arrêter le bot (on le redémarrera après)
pm2 stop bagbot
```

**Sans PM2** :
```bash
# Trouver et tuer les processus
pkill -f server-v2.js
pkill -f bot.js
```

### 3.3 Vérifier

```bash
netstat -tulpn | grep 3002
# Ne devrait rien afficher
```

## ✨ Étape 4 : Démarrer le Nouveau Backend

### 4.1 Mode Production avec PM2

```bash
cd /workspace/backend

# Démarrer le backend
pm2 start server.js --name bagbot-backend

# Vérifier
pm2 logs bagbot-backend --lines 20
```

**Logs attendus** :
```
✅ Serveur démarré sur le port 3002
✅ Membres Discord récupérés: [N]
```

### 4.2 Configuration PM2

Pour une configuration avancée :

```bash
# Créer ecosystem.config.js
cat > ecosystem.config.js << 'EOF'
module.exports = {
  apps: [
    {
      name: 'bagbot-backend',
      script: './server.js',
      instances: 1,
      exec_mode: 'fork',
      watch: false,
      max_memory_restart: '500M',
      env: {
        NODE_ENV: 'production',
        PORT: 3002
      },
      error_file: './logs/err.log',
      out_file: './logs/out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z'
    }
  ]
};
EOF

# Créer le dossier logs
mkdir -p logs

# Redémarrer avec la config
pm2 delete bagbot-backend
pm2 start ecosystem.config.js
```

## 🤖 Étape 5 : Redémarrer le Bot Discord

```bash
cd /workspace/src

# Avec PM2
pm2 start bot.js --name bagbot

# Vérifier les logs
pm2 logs bagbot --lines 20
```

**Vérifier** :
- Bot apparaît en ligne sur Discord
- Commande `/dashboard` fonctionne

## 📱 Étape 6 : Mettre à Jour l'Application Android

### 6.1 Vérifier la Configuration

Dans l'app Android, l'URL du backend doit être :
- Production : `http://82.67.65.98:3002` (ou votre IP)
- Local : `http://localhost:3002`

### 6.2 Installer la Nouvelle Version

Si vous avez déjà compilé l'APK 4.1.0 :

```bash
# Sur votre appareil Android
adb install -r /workspace/android-app/app/build/outputs/apk/release/app-release.apk
```

Sinon, recompilez :
```bash
cd /workspace/android-app
./gradlew assembleRelease
```

### 6.3 Tester la Connexion

1. Ouvrir l'app
2. Se connecter
3. Vérifier que l'écran d'accueil s'affiche correctement

**Logs backend attendus** :
```
[Auth] Token généré pour [USER_ID]
✅ [Auto-Auth] [USERNAME] (Admin) ajouté automatiquement
```

## 🌐 Étape 7 : Vérifier le Dashboard Web

### 7.1 Accès Dashboard

Ouvrir dans un navigateur :
```
http://votre-ip:3002/
```

### 7.2 Test de Connexion

1. Cliquer sur "Se connecter"
2. Autoriser l'application Discord
3. Vérifier l'accès au dashboard

## ✅ Étape 8 : Validation Complète

### 8.1 Checklist de Validation

- [ ] Backend démarre sans erreur
- [ ] Bot Discord en ligne
- [ ] Commande `/dashboard` fonctionne
- [ ] Application Android se connecte
- [ ] Dashboard web accessible
- [ ] Auto-détection des admins fonctionne
- [ ] Section utilisateurs visible (fondateur)
- [ ] Suppression d'utilisateur fonctionne

### 8.2 Test Complet

Suivre le guide :
```bash
cat /workspace/docs/GUIDE_TEST_COMPLET.md
```

## 🔐 Étape 9 : Sécuriser

### 9.1 Firewall

```bash
# Autoriser uniquement le port 3002
sudo ufw allow 3002/tcp
sudo ufw enable
```

### 9.2 CORS en Production

Éditer `/workspace/backend/server.js` :

```javascript
app.use(cors({
  origin: [
    'http://votre-ip:3002',      // Votre serveur
    'https://dashboard.com',      // Si domaine
    'bagbot://auth'               // App mobile
  ],
  credentials: true
}));
```

Puis redémarrer :
```bash
pm2 restart bagbot-backend
```

## 📊 Étape 10 : Monitoring

### 10.1 PM2 Monitoring

```bash
# Status
pm2 status

# Logs en temps réel
pm2 logs

# Monitoring temps réel
pm2 monit
```

### 10.2 Sauvegarder la Config PM2

```bash
pm2 save
pm2 startup
# Suivre les instructions affichées
```

## 🆘 Dépannage

### Problème : Backend ne démarre pas

**Solution** :
```bash
# Vérifier les logs
pm2 logs bagbot-backend --err

# Vérifier le port
netstat -tulpn | grep 3002

# Tester manuellement
node server.js
```

### Problème : Bot ne se connecte pas

**Solution** :
```bash
# Vérifier le token Discord
grep DISCORD_TOKEN /workspace/backend/.env

# Vérifier les logs bot
pm2 logs bagbot

# Vérifier config.json
cat /workspace/data/config.json | jq .
```

### Problème : App Android erreur connexion

**Solutions** :
1. Vérifier l'URL dans les paramètres de l'app
2. Vérifier que le backend répond : `curl http://votre-ip:3002/api/me`
3. Vérifier CORS : logs backend
4. Réinstaller l'app

### Problème : Admins pas auto-détectés

**Solution** :
```bash
# Vérifier staffRoleIds dans config.json
cat /workspace/data/config.json | jq '.guilds["VOTRE_GUILD_ID"].staffRoleIds'

# Si vide, configurer via dashboard ou manuellement
```

## 🔄 Rollback (Retour Arrière)

Si problème majeur :

```bash
# Arrêter le nouveau backend
pm2 stop bagbot-backend
pm2 delete bagbot-backend

# Restaurer la sauvegarde
cd /workspace
tar -xzf backup-avant-migration-YYYYMMDD.tar.gz

# Redémarrer l'ancien système
cd dashboard-v2
pm2 start server-v2.js --name dashboard-v2

# Redémarrer le bot
cd /workspace/src
pm2 restart bagbot
```

## 📝 Post-Migration

### Nettoyage (Optionnel)

Après avoir validé que tout fonctionne pendant 1 semaine :

```bash
# Archiver l'ancien dashboard
cd /workspace
tar -czf dashboard-v2-archive-$(date +%Y%m%d).tar.gz dashboard-v2/

# Déplacer vers archives
mkdir -p archives
mv dashboard-v2-archive-*.tar.gz archives/

# Optionnel : supprimer l'ancien dossier
# rm -rf dashboard-v2/
```

### Documentation

Mettre à jour la documentation interne :
- URLs des services
- Nouveaux endpoints
- Procédures de déploiement

## 🎯 Résumé

**Avant** :
- `dashboard-v2/server-v2.js` (monolithique)
- Dashboard et API mélangés

**Après** :
- `backend/server.js` (API pure)
- Dashboard séparé
- Architecture modulaire
- Auto-détection admins
- Gestion utilisateurs depuis l'app

## ✅ Migration Réussie !

Si tous les tests passent, félicitations ! 🎉

**Avantages obtenus** :
- ✅ Architecture propre et maintenable
- ✅ Scaling facilité
- ✅ Auto-détection des admins
- ✅ Gestion centralisée des utilisateurs
- ✅ CORS configuré correctement
- ✅ Logs structurés
- ✅ Monitoring PM2

**Support** :
- Documentation : `/workspace/docs/`
- Guide de test : `GUIDE_TEST_COMPLET.md`
- Architecture : `SEPARATION_COMPLETE.md`

---

**Version** : 1.0.0  
**Date** : 20 Décembre 2025  
**Auteur** : BAG Bot Team
