# 🎯 Accès au Dashboard BAG Bot Manager - CONFIGURATION FINALE

## ✅ DASHBOARD OPÉRATIONNEL ET ACCESSIBLE

Le dashboard est maintenant correctement configuré et accessible !

## 🌐 Adresse d'accès OFFICIELLE

### 👉 **http://88.174.155.230:33002** 👈

## 📍 URLs disponibles

| Service | URL |
|---------|-----|
| **Dashboard principal** | http://88.174.155.230:33002 |
| **Dashboard (alias /dash)** | http://88.174.155.230:33002/dash |
| **Dashboard Musique** | http://88.174.155.230:33002/music |
| **API Health Check** | http://88.174.155.230:33002/health |
| **API Configuration** | http://88.174.155.230:33002/api/configs |

## ✅ État actuel

```
✅ Serveur : EN COURS D'EXÉCUTION
✅ Port : 33002
✅ IP : 88.174.155.230
✅ Configuration : /workspace/data/config.json
✅ Version : v2.8
✅ API : OPÉRATIONNELLE
✅ Interface : ACCESSIBLE
```

## 🔧 Configuration

### Serveur
- **Port** : 33002 (configurable via variable `DASHBOARD_PORT`)
- **Hôte** : 0.0.0.0 (écoute sur toutes les interfaces)
- **Fichier config** : /workspace/data/config.json

### Variables d'environnement
Fichier `/workspace/.env` :
```bash
DISCORD_TOKEN=YOUR_DISCORD_BOT_TOKEN_HERE  # ⚠️ À configurer
GUILD_ID=1360897918504271882
CLIENT_ID=1414216173809307780
FORCE_GUILD_ID=1360897918504271882
DASHBOARD_PORT=33002
```

## 🚀 Comment y accéder

### Option 1 : Navigateur web
Ouvrir simplement : **http://88.174.155.230:33002**

### Option 2 : Depuis le terminal (test)
```bash
# Test de santé
curl http://88.174.155.230:33002/health

# Test API
curl http://88.174.155.230:33002/api/configs
```

## 📱 Sections disponibles

Une fois connecté au dashboard, vous avez accès à :

1. **📊 Dashboard** - Vue d'ensemble générale
2. **💰 Économie** - Gestion de la monnaie et des actions
3. **🎫 Tickets** - Système de tickets support
4. **📈 Niveaux** - Système XP et levels
5. **🎲 Action/Vérité** - Gestion des prompts (SFW/NSFW)
6. **🔢 Comptage** - Configuration des salons de comptage
7. **👋 Welcome/Goodbye** - Messages de bienvenue
8. **🔐 Confessions** - Système de confessions anonymes
9. **⏰ Inactivité** - Tracking et auto-kick
10. **🎵 Musique** - Playlists et uploads audio

## 🔑 Authentification

### État actuel : ⚠️ Aucune authentification

Le dashboard est actuellement **accessible sans mot de passe**. 

### Pour sécuriser (recommandé)

1. **Option 1 : Firewall** (bloquer l'accès externe)
   ```bash
   sudo ufw deny 33002
   sudo ufw allow from votre_ip_autorisée to any port 33002
   ```

2. **Option 2 : Ajouter un mot de passe**
   - Ajouter dans `/workspace/.env` : `DASHBOARD_PASSWORD=votre_mot_de_passe`
   - Implémenter le middleware d'authentification (voir documentation technique)

## ⚠️ Important : Configuration du DISCORD_TOKEN

Pour afficher les **noms réels** des membres, salons et rôles :

1. Obtenir votre token sur https://discord.com/developers/applications
2. Modifier `/workspace/.env` :
   ```bash
   DISCORD_TOKEN=votre_vrai_token_ici
   ```
3. Redémarrer le serveur :
   ```bash
   pkill -f 'node.*server-v2'
   cd /workspace/dashboard-v2
   DASHBOARD_PORT=33002 node server-v2.js &
   ```

**Sans token Discord** : Le dashboard fonctionne mais affiche des IDs au lieu des noms.

## 🔄 Gestion du serveur

### Démarrage manuel
```bash
cd /workspace/dashboard-v2
DASHBOARD_PORT=33002 node server-v2.js &
```

### Avec PM2 (démarrage automatique)
```bash
# Modifier ecosystem.config.js pour ajouter DASHBOARD_PORT=33002
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

### Vérifier l'état
```bash
# Processus en cours
ps aux | grep 'node.*server-v2'

# Port ouvert
netstat -tuln | grep 33002

# Test de santé
curl http://88.174.155.230:33002/health
```

### Logs
```bash
# Logs en direct
tail -f /tmp/dashboard-33002.log

# Avec PM2
pm2 logs dashboard
```

### Arrêt/Redémarrage
```bash
# Arrêter
pkill -f 'node.*server-v2'

# Ou avec PM2
pm2 stop dashboard

# Redémarrer
cd /workspace/dashboard-v2
DASHBOARD_PORT=33002 node server-v2.js &

# Ou avec PM2
pm2 restart dashboard
```

## 🛠️ Dépannage

### Le dashboard ne répond pas
1. Vérifier que le serveur tourne : `ps aux | grep server-v2`
2. Vérifier le port : `netstat -tuln | grep 33002`
3. Consulter les logs : `cat /tmp/dashboard-33002.log`
4. Tester localement : `curl http://localhost:33002/health`

### Erreur de connexion depuis l'extérieur
1. Vérifier que le firewall autorise le port 33002
2. Vérifier que le serveur écoute sur 0.0.0.0 (pas seulement localhost)
3. Tester depuis le serveur lui-même : `curl http://88.174.155.230:33002/health`

### Les noms Discord ne s'affichent pas
1. Vérifier que `DISCORD_TOKEN` est configuré dans `.env`
2. Vérifier que le token est valide (pas "YOUR_DISCORD_BOT_TOKEN_HERE")
3. Regarder les logs : doit afficher "✓ Discord token chargé" sans erreur 401

## 📁 Fichiers de configuration

```
/workspace/
├── .env                          # Variables d'environnement ⚠️
│   └── DASHBOARD_PORT=33002      # Port configuré
│   └── DISCORD_TOKEN=...         # À configurer
├── data/
│   └── config.json               # Configuration bot ✅
├── dashboard-v2/
│   ├── server-v2.js              # Serveur (port 33002) ✅
│   └── index.html                # Interface web ✅
└── ecosystem.config.js           # Configuration PM2
```

## 🎉 C'est prêt !

Vous pouvez maintenant accéder au dashboard à l'adresse :

### 🌟 **http://88.174.155.230:33002** 🌟

### Prochaines étapes :
1. ⚠️ Configurer le `DISCORD_TOKEN` pour une expérience complète
2. 🔒 Sécuriser le dashboard (firewall ou mot de passe)
3. 🔄 Configurer PM2 pour le démarrage automatique
4. 🎯 Profiter de toutes les fonctionnalités !

---

**Date de configuration** : 17 décembre 2025  
**Port** : 33002  
**IP publique** : 88.174.155.230  
**Status** : ✅ **OPÉRATIONNEL**  

## 📚 Documentation supplémentaire

- `README_DASHBOARD.md` - Vue d'ensemble
- `DASHBOARD_CONNEXION_RESOLUTION.md` - Détails techniques
- `COMMENT_UTILISER_DASHBOARD.md` - Guide d'utilisation complet
