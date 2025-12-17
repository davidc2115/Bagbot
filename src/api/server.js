const express = require('express');
const cors = require('cors');
const crypto = require('crypto');
const axios = require('axios');

/**
 * API REST pour gérer le bot Discord depuis l'application Android
 * Cette API nécessite une authentification Discord OAuth2
 */
class BotAPIServer {
  constructor(client) {
    this.client = client;
    this.app = express();
    this.port = process.env.API_PORT || 33001;
    this.sessions = new Map(); // sessionToken -> { userId, username, expiresAt }
    
    // Configuration OAuth2 Discord
    this.DISCORD_CLIENT_ID = process.env.CLIENT_ID;
    this.DISCORD_CLIENT_SECRET = process.env.DISCORD_CLIENT_SECRET;
    this.DISCORD_REDIRECT_URI = process.env.API_REDIRECT_URI || 'http://localhost:33001/auth/callback';
    
    this.setupMiddleware();
    this.setupRoutes();
  }

  setupMiddleware() {
    // CORS pour permettre les requêtes depuis l'app Android
    this.app.use(cors({
      origin: '*',
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
      allowedHeaders: ['Content-Type', 'Authorization']
    }));
    
    this.app.use(express.json());
    this.app.use(express.urlencoded({ extended: true }));
    
    // Middleware de logging
    this.app.use((req, res, next) => {
      console.log(`[API] ${req.method} ${req.path}`);
      next();
    });
  }

  // Middleware d'authentification
  requireAuth = (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Token d\'authentification manquant' });
    }

    const token = authHeader.substring(7);
    const session = this.sessions.get(token);

    if (!session) {
      return res.status(401).json({ error: 'Session invalide' });
    }

    if (Date.now() > session.expiresAt) {
      this.sessions.delete(token);
      return res.status(401).json({ error: 'Session expirée' });
    }

    req.userId = session.userId;
    req.username = session.username;
    next();
  };

  setupRoutes() {
    // ========== AUTHENTIFICATION ==========
    
    // Endpoint pour obtenir l'URL d'authentification Discord
    this.app.get('/auth/discord/url', (req, res) => {
      const state = crypto.randomBytes(16).toString('hex');
      const authUrl = `https://discord.com/api/oauth2/authorize?client_id=${this.DISCORD_CLIENT_ID}&redirect_uri=${encodeURIComponent(this.DISCORD_REDIRECT_URI)}&response_type=code&scope=identify%20guilds&state=${state}`;
      
      res.json({ url: authUrl, state });
    });

    // Callback OAuth2 Discord
    this.app.post('/auth/discord/callback', async (req, res) => {
      const { code } = req.body;
      
      if (!code) {
        return res.status(400).json({ error: 'Code d\'autorisation manquant' });
      }

      try {
        // Échanger le code contre un access token
        const tokenResponse = await axios.post('https://discord.com/api/oauth2/token', new URLSearchParams({
          client_id: this.DISCORD_CLIENT_ID,
          client_secret: this.DISCORD_CLIENT_SECRET,
          grant_type: 'authorization_code',
          code: code,
          redirect_uri: this.DISCORD_REDIRECT_URI
        }), {
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
        });

        const { access_token } = tokenResponse.data;

        // Récupérer les informations de l'utilisateur
        const userResponse = await axios.get('https://discord.com/api/users/@me', {
          headers: { Authorization: `Bearer ${access_token}` }
        });

        const user = userResponse.data;

        // Créer une session
        const sessionToken = crypto.randomBytes(32).toString('hex');
        const expiresAt = Date.now() + (7 * 24 * 60 * 60 * 1000); // 7 jours

        this.sessions.set(sessionToken, {
          userId: user.id,
          username: `${user.username}#${user.discriminator}`,
          avatar: user.avatar,
          expiresAt
        });

        res.json({
          token: sessionToken,
          user: {
            id: user.id,
            username: user.username,
            discriminator: user.discriminator,
            avatar: user.avatar
          }
        });
      } catch (error) {
        console.error('[API] Erreur d\'authentification:', error.response?.data || error.message);
        res.status(500).json({ error: 'Erreur d\'authentification' });
      }
    });

    // Déconnexion
    this.app.post('/auth/logout', this.requireAuth, (req, res) => {
      const token = req.headers.authorization.substring(7);
      this.sessions.delete(token);
      res.json({ success: true });
    });

    // ========== INFORMATIONS DU BOT ==========
    
    // Statistiques générales du bot
    this.app.get('/bot/stats', this.requireAuth, (req, res) => {
      const stats = {
        guilds: this.client.guilds.cache.size,
        users: this.client.guilds.cache.reduce((acc, guild) => acc + guild.memberCount, 0),
        channels: this.client.channels.cache.size,
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        ping: this.client.ws.ping,
        version: '2.0.0'
      };

      res.json(stats);
    });

    // Liste des serveurs
    this.app.get('/bot/guilds', this.requireAuth, (req, res) => {
      const guilds = this.client.guilds.cache.map(guild => ({
        id: guild.id,
        name: guild.name,
        icon: guild.icon ? `https://cdn.discordapp.com/icons/${guild.id}/${guild.icon}.png` : null,
        memberCount: guild.memberCount,
        ownerId: guild.ownerId
      }));

      res.json({ guilds });
    });

    // Informations d'un serveur spécifique
    this.app.get('/bot/guilds/:guildId', this.requireAuth, async (req, res) => {
      const { guildId } = req.params;
      const guild = this.client.guilds.cache.get(guildId);

      if (!guild) {
        return res.status(404).json({ error: 'Serveur non trouvé' });
      }

      try {
        const owner = await guild.fetchOwner();
        
        res.json({
          id: guild.id,
          name: guild.name,
          icon: guild.icon ? `https://cdn.discordapp.com/icons/${guild.id}/${guild.icon}.png` : null,
          memberCount: guild.memberCount,
          owner: {
            id: owner.user.id,
            username: owner.user.username,
            discriminator: owner.user.discriminator
          },
          channels: guild.channels.cache.size,
          roles: guild.roles.cache.size,
          createdAt: guild.createdAt
        });
      } catch (error) {
        res.status(500).json({ error: 'Erreur lors de la récupération des informations' });
      }
    });

    // ========== COMMANDES ==========
    
    // Liste des commandes disponibles
    this.app.get('/bot/commands', this.requireAuth, (req, res) => {
      const commands = this.client.commands.map(cmd => ({
        name: cmd.data?.name || cmd.name,
        description: cmd.data?.description || cmd.description || 'Aucune description',
        options: cmd.data?.options || []
      }));

      res.json({ commands });
    });

    // Exécuter une commande (simulation)
    this.app.post('/bot/commands/execute', this.requireAuth, async (req, res) => {
      const { guildId, channelId, commandName, options } = req.body;

      if (!guildId || !channelId || !commandName) {
        return res.status(400).json({ error: 'Paramètres manquants' });
      }

      const guild = this.client.guilds.cache.get(guildId);
      if (!guild) {
        return res.status(404).json({ error: 'Serveur non trouvé' });
      }

      const channel = guild.channels.cache.get(channelId);
      if (!channel) {
        return res.status(404).json({ error: 'Salon non trouvé' });
      }

      res.json({
        success: true,
        message: `Commande ${commandName} envoyée avec succès`,
        note: 'L\'exécution réelle nécessiterait une interaction Discord'
      });
    });

    // ========== ÉCONOMIE ==========
    
    // Récupérer les données économie d'un serveur
    this.app.get('/bot/economy/:guildId', this.requireAuth, async (req, res) => {
      try {
        const { guildId } = req.params;
        const { getEconomyConfig, getEconomyUser } = require('../storage/jsonStore');
        
        const config = await getEconomyConfig(guildId);
        
        res.json({
          enabled: config?.enabled || false,
          currency: config?.currency || 'pièces'
        });
      } catch (error) {
        res.status(500).json({ error: 'Erreur lors de la récupération des données' });
      }
    });

    // Top économie d'un serveur
    this.app.get('/bot/economy/:guildId/top', this.requireAuth, async (req, res) => {
      try {
        const { guildId } = req.params;
        const { getEconomyUser } = require('../storage/jsonStore');
        
        // Cette fonctionnalité nécessiterait une implémentation plus complète
        // pour récupérer tous les utilisateurs d'un serveur
        res.json({
          message: 'Fonctionnalité en développement',
          top: []
        });
      } catch (error) {
        res.status(500).json({ error: 'Erreur lors de la récupération du classement' });
      }
    });

    // ========== MODÉRATION ==========
    
    // Logs de modération récents
    this.app.get('/bot/moderation/:guildId/logs', this.requireAuth, async (req, res) => {
      try {
        const { guildId } = req.params;
        
        res.json({
          message: 'Fonctionnalité en développement',
          logs: []
        });
      } catch (error) {
        res.status(500).json({ error: 'Erreur lors de la récupération des logs' });
      }
    });

    // Bannir un utilisateur
    this.app.post('/bot/moderation/:guildId/ban', this.requireAuth, async (req, res) => {
      const { guildId } = req.params;
      const { userId, reason } = req.body;

      if (!userId) {
        return res.status(400).json({ error: 'ID utilisateur manquant' });
      }

      const guild = this.client.guilds.cache.get(guildId);
      if (!guild) {
        return res.status(404).json({ error: 'Serveur non trouvé' });
      }

      try {
        await guild.members.ban(userId, { reason: reason || 'Banni via l\'application mobile' });
        res.json({ success: true, message: 'Utilisateur banni avec succès' });
      } catch (error) {
        res.status(500).json({ error: 'Erreur lors du bannissement', details: error.message });
      }
    });

    // Kick un utilisateur
    this.app.post('/bot/moderation/:guildId/kick', this.requireAuth, async (req, res) => {
      const { guildId } = req.params;
      const { userId, reason } = req.body;

      if (!userId) {
        return res.status(400).json({ error: 'ID utilisateur manquant' });
      }

      const guild = this.client.guilds.cache.get(guildId);
      if (!guild) {
        return res.status(404).json({ error: 'Serveur non trouvé' });
      }

      try {
        const member = await guild.members.fetch(userId);
        await member.kick(reason || 'Kick via l\'application mobile');
        res.json({ success: true, message: 'Utilisateur expulsé avec succès' });
      } catch (error) {
        res.status(500).json({ error: 'Erreur lors de l\'expulsion', details: error.message });
      }
    });

    // ========== MUSIQUE ==========
    
    // État du player musique
    this.app.get('/bot/music/:guildId/status', this.requireAuth, (req, res) => {
      const { guildId } = req.params;
      
      try {
        const { player } = require('../music/music-manager');
        
        if (!player) {
          return res.json({ playing: false, queue: [] });
        }

        const queue = player.nodes.get(guildId);
        
        if (!queue || !queue.isPlaying()) {
          return res.json({ playing: false, queue: [] });
        }

        res.json({
          playing: true,
          current: {
            title: queue.currentTrack?.title || 'Inconnu',
            author: queue.currentTrack?.author || 'Inconnu',
            duration: queue.currentTrack?.duration || 0,
            url: queue.currentTrack?.url || ''
          },
          queue: queue.tracks.map(track => ({
            title: track.title,
            author: track.author,
            duration: track.duration
          })),
          volume: queue.node.volume,
          paused: queue.node.isPaused()
        });
      } catch (error) {
        res.json({ playing: false, queue: [], error: error.message });
      }
    });

    // Contrôles de musique
    this.app.post('/bot/music/:guildId/control', this.requireAuth, async (req, res) => {
      const { guildId } = req.params;
      const { action } = req.body; // play, pause, resume, skip, stop

      if (!action) {
        return res.status(400).json({ error: 'Action manquante' });
      }

      try {
        const { player } = require('../music/music-manager');
        
        if (!player) {
          return res.status(500).json({ error: 'Player non initialisé' });
        }

        const queue = player.nodes.get(guildId);
        
        if (!queue) {
          return res.status(404).json({ error: 'Aucune file d\'attente active' });
        }

        switch (action) {
          case 'pause':
            queue.node.pause();
            break;
          case 'resume':
            queue.node.resume();
            break;
          case 'skip':
            queue.node.skip();
            break;
          case 'stop':
            queue.delete();
            break;
          default:
            return res.status(400).json({ error: 'Action invalide' });
        }

        res.json({ success: true, message: `Action ${action} exécutée` });
      } catch (error) {
        res.status(500).json({ error: 'Erreur lors du contrôle', details: error.message });
      }
    });

    // ========== SANTÉ & MONITORING ==========
    
    // Health check
    this.app.get('/health', (req, res) => {
      res.json({
        status: 'ok',
        uptime: process.uptime(),
        timestamp: Date.now(),
        bot: {
          ready: this.client.isReady(),
          guilds: this.client.guilds.cache.size
        }
      });
    });

    // Route par défaut
    this.app.get('/', (req, res) => {
      res.json({
        name: 'Bagbot API',
        version: '1.0.0',
        status: 'running',
        endpoints: [
          '/auth/discord/url',
          '/auth/discord/callback',
          '/bot/stats',
          '/bot/guilds',
          '/bot/commands',
          '/health'
        ]
      });
    });

    // Gestion des erreurs 404
    this.app.use((req, res) => {
      res.status(404).json({ error: 'Endpoint non trouvé' });
    });

    // Gestion globale des erreurs
    this.app.use((err, req, res, next) => {
      console.error('[API] Erreur:', err);
      res.status(500).json({ error: 'Erreur interne du serveur' });
    });
  }

  start() {
    return new Promise((resolve, reject) => {
      try {
        this.server = this.app.listen(this.port, '0.0.0.0', () => {
          console.log(`[API] ✅ Serveur API démarré sur le port ${this.port}`);
          console.log(`[API] 📱 L'application Android peut maintenant se connecter`);
          resolve();
        });

        this.server.on('error', (error) => {
          console.error('[API] ❌ Erreur lors du démarrage du serveur:', error);
          reject(error);
        });
      } catch (error) {
        reject(error);
      }
    });
  }

  stop() {
    if (this.server) {
      this.server.close();
      console.log('[API] Serveur API arrêté');
    }
  }
}

module.exports = BotAPIServer;
