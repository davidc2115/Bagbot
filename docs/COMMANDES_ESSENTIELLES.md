# ⚡ Commandes Essentielles - BAG Bot v4.1.0

## 🚀 Démarrage Rapide

### Option 1 : Script Interactif (Recommandé)

```bash
./start.sh
```

**Fonctionnalités du script** :
- Installation automatique de PM2
- Vérification des dépendances
- Menu interactif
- Gestion complète des services

### Option 2 : Démarrage Manuel

```bash
# Backend
cd /workspace/backend
npm install
node server.js

# Bot (dans un autre terminal)
cd /workspace/src
node bot.js
```

### Option 3 : Avec PM2 (Production)

```bash
# Backend
cd /workspace/backend
pm2 start server.js --name bagbot-backend

# Bot
cd /workspace/src
pm2 start bot.js --name bagbot

# Sauvegarder la config
pm2 save
pm2 startup
```

---

## 🔧 Gestion des Services

### PM2 - Commandes Principales

```bash
# Status de tous les services
pm2 status

# Logs en temps réel
pm2 logs

# Logs d'un service spécifique
pm2 logs bagbot-backend
pm2 logs bagbot

# Redémarrer un service
pm2 restart bagbot-backend
pm2 restart bagbot

# Arrêter un service
pm2 stop bagbot-backend
pm2 stop bagbot

# Supprimer un service
pm2 delete bagbot-backend
pm2 delete bagbot

# Monitoring en temps réel
pm2 monit

# Informations détaillées
pm2 show bagbot-backend
```

### PM2 - Gestion Multiple

```bash
# Redémarrer tous les services
pm2 restart all

# Arrêter tous les services
pm2 stop all

# Supprimer tous les services
pm2 delete all

# Recharger tous les services
pm2 reload all
```

---

## 🧪 Tests et Vérifications

### Backend API

```bash
# Health check
curl http://localhost:3002/

# Status du bot
curl http://localhost:3002/api/bot/status

# Test avec token (remplacer YOUR_TOKEN)
curl http://localhost:3002/api/me \
  -H "Authorization: Bearer YOUR_TOKEN"

# Test endpoint admin
curl http://localhost:3002/api/admin/app-users \
  -H "Authorization: Bearer YOUR_FOUNDER_TOKEN"
```

### Vérifier les Ports

```bash
# Vérifier que le port 3002 est utilisé
netstat -tulpn | grep 3002

# Voir tous les ports utilisés par Node
netstat -tulpn | grep node

# Tuer un processus sur le port 3002 (si bloqué)
lsof -ti:3002 | xargs kill -9
```

### Vérifier les Processus

```bash
# Processus Node.js actifs
ps aux | grep node

# Processus PM2
ps aux | grep PM2
```

---

## 📦 Installation et Configuration

### Installation Initiale

```bash
# Cloner le projet
git clone <repo-url>
cd workspace

# Installer les dépendances globales
npm install -g pm2

# Installer les dépendances du bot
npm install

# Installer les dépendances du backend
cd backend
npm install
cp .env.example .env
nano .env  # Éditer avec vos tokens
```

### Configuration Backend

**Fichier** : `/workspace/backend/.env`

```env
DISCORD_TOKEN=votre_bot_token
GUILD_ID=votre_guild_id
CLIENT_ID=votre_client_id
CLIENT_SECRET=votre_client_secret
PORT=3002
NODE_ENV=production
```

### Configuration Bot

**Fichier** : `/workspace/data/config.json`

Structure :
```json
{
  "guilds": {
    "VOTRE_GUILD_ID": {
      "staffRoleIds": ["role_id_1", "role_id_2"],
      "dashboardUrl": "http://votre-ip:3002",
      ...
    }
  }
}
```

---

## 📱 Application Android

### Build APK

```bash
cd /workspace/android-app
./gradlew assembleRelease
```

**APK généré** : `app/build/outputs/apk/release/app-release.apk`

### Installation sur Appareil

```bash
# Via ADB
adb install -r app/build/outputs/apk/release/app-release.apk

# Vérifier les appareils connectés
adb devices

# Logs de l'app
adb logcat | grep BAG_APP
```

### Configuration App

Dans l'application :
1. Aller dans "Configuration"
2. URL du Backend : `http://votre-ip:3002`
3. Se connecter avec Discord

---

## 🗄️ Gestion des Données

### Sauvegardes

```bash
# Sauvegarder config.json
cp /workspace/data/config.json /workspace/data/backups/config-$(date +%Y%m%d-%H%M%S).json

# Sauvegarder tout le dossier data
tar -czf backup-data-$(date +%Y%m%d).tar.gz /workspace/data/

# Restaurer une sauvegarde
tar -xzf backup-data-YYYYMMDD.tar.gz
```

### Logs

```bash
# Backend logs
tail -f /workspace/backend/logs/out.log
tail -f /workspace/backend/logs/err.log

# PM2 logs
pm2 logs --lines 100

# Exporter les logs
pm2 logs bagbot-backend > logs-backend.txt
```

---

## 🔍 Dépannage

### Backend ne démarre pas

```bash
# Vérifier les logs d'erreur
pm2 logs bagbot-backend --err

# Vérifier le fichier .env
cat /workspace/backend/.env

# Vérifier les permissions
ls -la /workspace/backend/
ls -la /workspace/data/

# Corriger les permissions
chmod -R 755 /workspace/backend/
chmod -R 755 /workspace/data/

# Tester manuellement
cd /workspace/backend
node server.js
```

### Bot ne se connecte pas

```bash
# Vérifier le token
grep DISCORD_TOKEN /workspace/backend/.env

# Vérifier les logs
pm2 logs bagbot

# Vérifier la connexion Internet
ping discord.com

# Redémarrer le bot
pm2 restart bagbot
```

### App Android erreur connexion

```bash
# Vérifier que le backend répond
curl http://votre-ip:3002/

# Vérifier CORS
curl -I http://votre-ip:3002/api/me \
  -H "Origin: bagbot://auth"

# Vérifier les logs backend
pm2 logs bagbot-backend | grep CORS
```

### Port 3002 déjà utilisé

```bash
# Trouver le processus
lsof -i:3002

# Tuer le processus
lsof -ti:3002 | xargs kill -9

# Ou changer le port dans .env
nano /workspace/backend/.env
# PORT=3003
```

---

## 🔄 Mise à Jour

### Mise à jour du Code

```bash
# Sauvegarder la config
cp /workspace/data/config.json /tmp/config-backup.json

# Arrêter les services
pm2 stop all

# Mettre à jour le code
git pull

# Réinstaller les dépendances si nécessaire
cd /workspace/backend
npm install

cd /workspace
npm install

# Restaurer la config
cp /tmp/config-backup.json /workspace/data/config.json

# Redémarrer
pm2 restart all
```

### Rollback (Retour Arrière)

```bash
# Arrêter les services
pm2 stop all

# Revenir à la version précédente
git checkout <commit-hash>

# Réinstaller les dépendances
npm install
cd backend && npm install

# Redémarrer
pm2 restart all
```

---

## 📊 Monitoring

### Monitoring Temps Réel

```bash
# PM2 Monitoring
pm2 monit

# Utilisation CPU/RAM
htop

# Utilisation disque
df -h

# Utilisation mémoire
free -h
```

### Statistiques PM2

```bash
# Infos d'un processus
pm2 show bagbot-backend

# Utilisation mémoire
pm2 list

# Logs des 100 dernières lignes
pm2 logs --lines 100
```

---

## 🔒 Sécurité

### Firewall (UFW)

```bash
# Activer UFW
sudo ufw enable

# Autoriser SSH
sudo ufw allow 22

# Autoriser le port backend
sudo ufw allow 3002

# Voir les règles
sudo ufw status

# Bloquer une IP
sudo ufw deny from <IP>
```

### Mise à Jour Tokens

```bash
# Éditer .env
nano /workspace/backend/.env

# Redémarrer les services
pm2 restart all

# Vérifier les logs
pm2 logs
```

---

## 📚 Commandes de Référence

### Git

```bash
# Status
git status

# Voir les modifications
git diff

# Committer
git add .
git commit -m "Description"

# Pousser
git push

# Voir l'historique
git log --oneline -10
```

### NPM

```bash
# Installer les dépendances
npm install

# Installer un package
npm install <package>

# Mettre à jour les packages
npm update

# Voir les packages installés
npm list

# Voir les packages outdated
npm outdated
```

---

## 🆘 Support

### Documentation

- 📖 [Récapitulatif Final](docs/RECAPITULATIF_FINAL.md)
- 🏗️ [Architecture](docs/SEPARATION_COMPLETE.md)
- 📱 [App Android](docs/ANDROID_APP_MODIFICATIONS.md)
- 🔄 [Migration](docs/GUIDE_MIGRATION.md)
- 🧪 [Tests](docs/GUIDE_TEST_COMPLET.md)
- 🚀 [Déploiement](backend/DEPLOYMENT.md)

### Logs Utiles

```bash
# Tout voir
pm2 logs

# Backend uniquement
pm2 logs bagbot-backend

# Bot uniquement
pm2 logs bagbot

# Erreurs uniquement
pm2 logs --err

# 200 dernières lignes
pm2 logs --lines 200

# Suivre en temps réel
pm2 logs --lines 0
```

---

## ✅ Checklist de Déploiement

- [ ] Node.js 18+ installé
- [ ] PM2 installé globalement
- [ ] Dépendances backend installées
- [ ] Dépendances bot installées
- [ ] Fichier .env configuré
- [ ] Port 3002 accessible
- [ ] Firewall configuré
- [ ] Backend démarre sans erreur
- [ ] Bot se connecte à Discord
- [ ] App Android testée
- [ ] Dashboard web accessible
- [ ] Sauvegardes configurées
- [ ] Monitoring en place

---

**Version** : 4.1.0  
**Dernière MAJ** : 20 Décembre 2025
