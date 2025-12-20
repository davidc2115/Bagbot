# Backend API Unifié - BAG Bot

## Description

Backend API centralisé pour le bot Discord BAG, servant à la fois :
- Le dashboard web (frontend-web/)
- L'application Android mobile (android-app/)

## Installation

```bash
npm install express multer express-fileupload dotenv
```

## Démarrage

```bash
node server.js
```

Le serveur démarre sur le port **3002** par défaut.

## Structure

- `server.js` - Serveur Express principal
- `/data/` - Données partagées (config.json, playlists, uploads, backups)

## Endpoints API

### Authentification
- `GET /auth/mobile/start` - Démarrer l'auth OAuth Discord
- `GET /auth/mobile/callback` - Callback OAuth
- `GET /api/me` - Récupérer les infos de l'utilisateur connecté

### Discord
- `GET /api/discord/members` - Liste des membres
- `GET /api/discord/channels` - Liste des salons
- `GET /api/discord/roles` - Liste des rôles

### Configuration
- `GET /api/configs` - Configuration complète du serveur
- `POST /api/*` - Multiples endpoints pour modifier la config

### Admin
- `GET /api/admin/allowed-users` - Utilisateurs autorisés
- `GET /api/admin/app-users` - Utilisateurs avec détails
- `POST /api/admin/allowed-users` - Ajouter un utilisateur
- `POST /api/admin/allowed-users/remove` - Retirer un utilisateur
- `GET /api/admin/sessions` - Sessions actives
- `GET /api/admin/dashboard-url` - URL du dashboard
- `POST /api/admin/dashboard-url` - Configurer l'URL

### Musique
- `GET /api/music` - Liste playlists et uploads
- `POST /api/music/playlist/create` - Créer une playlist
- `DELETE /api/music/playlist/:guildId/:name` - Supprimer une playlist
- `POST /api/music/upload` - Upload un fichier audio
- `DELETE /api/music/upload/:filename` - Supprimer un fichier

### Bot
- `GET /api/bot/status` - Statut du bot
- `POST /api/bot/prepare-save` - Arrêter le bot pour sauvegarde
- `POST /api/bot/restart` - Redémarrer le bot

## Sécurité

- Authentification OAuth Discord
- Tokens Bearer pour l'API
- Vérifications de permissions (fondateur/admin)
- CORS configuré pour dashboard et app mobile

## Variables d'environnement

Créer un fichier `.env` :

```env
DISCORD_TOKEN=votre_bot_token
GUILD_ID=votre_guild_id
CLIENT_ID=votre_client_id
CLIENT_SECRET=votre_client_secret
```

## Déploiement

Le backend peut être déployé sur :
- VPS/Serveur dédié
- Heroku
- Railway
- DigitalOcean App Platform
- AWS EC2

## Notes

- Le backend partage le fichier `config.json` avec le bot Discord
- Les modifications sont instantanément visibles dans les deux interfaces
- Auto-détection et autorisation automatique des admins Discord
