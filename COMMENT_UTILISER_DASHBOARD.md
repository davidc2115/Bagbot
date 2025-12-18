# Comment utiliser le Dashboard BAG Bot Manager

## ✅ État actuel : OPÉRATIONNEL

Le dashboard est maintenant **fonctionnel et accessible** !

## 🚀 Accès au Dashboard

### URL d'accès
- **Local** : http://localhost:3002
- **Réseau** : http://82.67.65.98:3002 (si le port est ouvert)

### Pages disponibles
- **Dashboard principal** : http://localhost:3002/ ou http://localhost:3002/dash
- **Dashboard musique** : http://localhost:3002/music
- **Health check** : http://localhost:3002/health

## 📋 Fonctionnalités disponibles

### ✅ Sections opérationnelles
1. **Dashboard général** - Vue d'ensemble du bot
2. **Économie** - Gestion de la monnaie virtuelle et des actions
3. **Tickets** - Configuration du système de tickets
4. **Niveaux/Levels** - Système d'XP et de niveaux
5. **Action/Vérité** - Gestion des prompts SFW et NSFW
6. **Comptage** - Configuration des salons de comptage
7. **Welcome/Goodbye** - Messages de bienvenue et d'au revoir
8. **Confessions** - Système de confessions anonymes
9. **Inactivité** - Tracking et gestion de l'inactivité des membres
10. **Musique** - Gestion des playlists et uploads audio

### ⚠️ Fonctionnalités limitées (sans DISCORD_TOKEN)
Les fonctionnalités suivantes nécessitent un token Discord valide :
- Liste des salons Discord (affichage des noms)
- Liste des membres du serveur (affichage des pseudos réels)
- Liste des rôles Discord
- Synchronisation en temps réel avec Discord

**Actuellement** : Ces données sont vides ou affichent des IDs au lieu des noms.

## 🔧 Configuration requise pour fonctionnalités complètes

### 1. Créer/Modifier le fichier .env

Éditer le fichier `/workspace/.env` (déjà créé en template) :

```bash
# Remplacer YOUR_DISCORD_BOT_TOKEN_HERE par votre vrai token
DISCORD_TOKEN=MTQxNDIxNjE3MzgwOTMwNzc4MA.votre_token_ici.xyz123
GUILD_ID=1360897918504271882
CLIENT_ID=1414216173809307780
FORCE_GUILD_ID=1360897918504271882

# Optionnel : Protéger le dashboard par mot de passe
# DASHBOARD_PASSWORD=votre_mot_de_passe_securise
```

### 2. Redémarrer le serveur

```bash
# Arrêter le serveur actuel
pkill -f 'node.*server-v2'

# Redémarrer avec les nouvelles variables
cd /workspace/dashboard-v2
node server-v2.js &
```

Ou utiliser PM2 (recommandé) :
```bash
pm2 start ecosystem.config.js
pm2 save
```

## 🎯 Comment obtenir le DISCORD_TOKEN

1. Aller sur https://discord.com/developers/applications
2. Sélectionner votre application bot (ou en créer une)
3. Aller dans l'onglet "Bot"
4. Cliquer sur "Reset Token" ou "Copy" pour copier le token
5. ⚠️ **NE JAMAIS partager ce token publiquement**

## 🛡️ Sécurité

### État actuel : ⚠️ NON SÉCURISÉ
- **Aucune authentification configurée**
- Toute personne avec accès au port 3002 peut modifier la configuration

### Pour sécuriser le dashboard

#### Option 1 : Firewall (recommandé pour usage local)
```bash
# Bloquer l'accès externe au port 3002
sudo ufw deny 3002
sudo ufw allow from 127.0.0.1 to any port 3002
```

#### Option 2 : Mot de passe (recommandé pour accès distant)
Voir la section "Ajouter une authentification" dans `DASHBOARD_CONNEXION_RESOLUTION.md`

#### Option 3 : Reverse proxy avec HTTPS
Configurer nginx avec SSL pour protéger les communications.

## 📊 Utilisation du Dashboard

### Économie
- Modifier le nom de la monnaie virtuelle
- Gérer les soldes des membres
- Configurer les actions et leurs récompenses
- Uploader des GIFs pour les actions

### Tickets
- Créer des catégories de tickets
- Configurer les panneaux de création de tickets
- Définir les rôles du staff

### Niveaux
- Configurer les points XP par message
- Configurer les points XP par minute en vocal
- Ajuster la courbe de progression des niveaux

### Action/Vérité
- Ajouter/modifier/supprimer des prompts SFW
- Ajouter/modifier/supprimer des prompts NSFW
- Configurer les salons autorisés

### Inactivité
- Activer/désactiver le kick automatique
- Définir le délai d'inactivité (en jours)
- Exclure certains rôles du tracking
- Réinitialiser l'inactivité d'un membre manuellement

### Musique
- Créer des playlists personnalisées
- Uploader des fichiers audio (MP3)
- Ajouter des liens YouTube/Spotify (téléchargement automatique)
- Gérer les pistes et les playlists

## 🔍 Vérification de l'état

### Vérifier si le serveur tourne
```bash
# Vérifier le processus
ps aux | grep 'node.*server-v2'

# Vérifier le port
netstat -tuln | grep 3002

# Tester l'API
curl http://localhost:3002/health
```

### Logs du serveur
```bash
# Avec PM2
pm2 logs dashboard

# Ou consulter les logs sauvegardés
tail -f /home/bagbot/.pm2/logs/dashboard-out.log
tail -f /home/bagbot/.pm2/logs/dashboard-error.log
```

## 🐛 Dépannage

### Le dashboard ne charge pas
1. Vérifier que le serveur tourne : `ps aux | grep server-v2`
2. Vérifier les logs : `pm2 logs dashboard` ou consulter `/tmp/dashboard.log`
3. Tester l'endpoint de santé : `curl http://localhost:3002/health`

### Les noms Discord n'apparaissent pas
1. Vérifier que `DISCORD_TOKEN` est défini dans `.env`
2. Vérifier que le token est valide
3. Redémarrer le serveur après avoir modifié `.env`

### Erreur 401 Unauthorized
1. Le système d'authentification est activé
2. Vérifier le paramètre `DASHBOARD_PASSWORD` dans `.env`
3. Fournir le mot de passe dans l'URL : `?key=votre_mot_de_passe`

### Le bot ne répond pas aux commandes
- Le dashboard est séparé du bot
- Vérifier que le bot est démarré : `pm2 list`
- Démarrer le bot : `pm2 start bagbot`

## 📁 Fichiers importants

- **Config bot** : `/workspace/data/config.json`
- **Serveur dashboard** : `/workspace/dashboard-v2/server-v2.js`
- **Interface** : `/workspace/dashboard-v2/index.html`
- **Variables d'env** : `/workspace/.env`
- **PM2 config** : `/workspace/ecosystem.config.js`

## 🔄 Sauvegarde et restauration

### Sauvegarder la configuration
Le fichier `/workspace/data/config.json` contient toute la configuration. Sauvegarder ce fichier régulièrement.

### Via le dashboard
Le dashboard offre des fonctionnalités de backup/restore dans certaines sections.

## 📞 Support

Pour plus d'informations sur la résolution des problèmes, consulter :
- `DASHBOARD_CONNEXION_RESOLUTION.md` - Détails de la résolution
- Logs du serveur : `/tmp/dashboard.log` ou `/home/bagbot/.pm2/logs/`

---

**Status** : ✅ Dashboard opérationnel
**Version** : v2.8
**Port** : 3002
**Config** : `/workspace/data/config.json`
