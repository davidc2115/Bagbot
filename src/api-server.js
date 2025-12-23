// API Server pour l'application Android - Intégré au Bot Discord
// Ce serveur remplace le dashboard comme intermédiaire

const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const multer = require('multer');

// Importer les fonctions du bot
const { 
  readConfig, 
  writeConfig,
  getLevelsConfig,
  updateLevelsConfig,
  getEconomyConfig,
  updateEconomyConfig,
  getTruthDareConfig,
  updateTruthDareConfig
} = require('./storage/jsonStore');

const app = express();
const PORT = 33003; // Port différent du dashboard

// Middleware
app.use(cors());
app.use(express.json());

// Logger middleware
app.use((req, res, next) => {
  console.log(`📥 [BOT-API] ${req.method} ${req.path}`);
  next();
});

// Configuration
const GUILD = process.env.GUILD_ID || '1360897918504271882';
const FOUNDER_ID = process.env.FOUNDER_ID || '943487722738311219';

// Token storage (simplifié - en production utiliser une vraie DB)
const appTokens = new Map();

// ========== AUTHENTIFICATION ==========

// Fonction pour vérifier si un utilisateur est admin/fondateur
async function checkUserPermissions(userId, client) {
  try {
    if (userId === FOUNDER_ID) {
      return { isFounder: true, isAdmin: true };
    }
    
    const guild = client.guilds.cache.get(GUILD);
    if (!guild) return { isFounder: false, isAdmin: false };
    
    const member = await guild.members.fetch(userId).catch(() => null);
    if (!member) return { isFounder: false, isAdmin: false };
    
    const isAdmin = member.permissions.has('Administrator');
    return { isFounder: false, isAdmin };
  } catch (error) {
    console.error('[API] Error checking permissions:', error);
    return { isFounder: false, isAdmin: false };
  }
}

// Middleware d'authentification avec persistance améliorée
async function requireAuth(req, res, next) {
  const authHeader = req.headers['authorization'];
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No token' });
  }
  
  const token = authHeader.substring(7);
  const userData = appTokens.get('token_' + token);
  
  if (!userData) {
    return res.status(401).json({ error: 'Invalid token' });
  }
  
  // Vérifier les permissions en temps réel (admin retiré = déconnexion automatique)
  const client = req.app.locals.client;
  if (client) {
    try {
      const permissions = await checkUserPermissions(userData.userId, client);
      
      // Si l'utilisateur n'est plus admin/fondateur, invalider le token
      if (!permissions.isAdmin && !permissions.isFounder) {
        appTokens.delete('token_' + token);
        return res.status(401).json({ 
          error: 'Access revoked',
          message: 'Votre accès a été révoqué. Veuillez vous reconnecter.'
        });
      }
      
      // Mettre à jour les permissions dans userData
      userData.isAdmin = permissions.isAdmin;
      userData.isFounder = permissions.isFounder;
    } catch (error) {
      console.error('[API] Error checking permissions:', error);
    }
  }
  
  // Mettre à jour le timestamp pour garder la session active
  userData.timestamp = Date.now();
  
  // Plus d'expiration de token - seule la révocation du rôle admin déconnecte
  // (Anciennement: expiration après 24h)
  
  req.userData = userData;
  next();
}

// ========== ENDPOINTS ==========

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'bot-api', timestamp: new Date().toISOString() });
});

// ========== OAUTH DISCORD ==========

function generateToken() {
  return Buffer.from(`${Date.now()}-${Math.random()}`).toString('base64');
}

// Mobile OAuth start
app.get('/auth/mobile/start', (req, res) => {
  const OAUTH_CLIENT_ID = process.env.DISCORD_OAUTH_CLIENT_ID || process.env.CLIENT_ID || '1414216173809307780';
  const REDIRECT_URI = encodeURIComponent('http://88.174.155.230:33003/auth/mobile/callback');
  const app_redirect = req.query.app_redirect || 'bagbot://auth';
  
  const state = generateToken().substring(0, 16);
  appTokens.set('state_' + state, { app_redirect, timestamp: Date.now() });
  
  const discordAuthUrl = `https://discord.com/api/oauth2/authorize?client_id=${OAUTH_CLIENT_ID}&redirect_uri=${REDIRECT_URI}&response_type=code&scope=identify&state=${state}`;
  
  console.log('[BOT-API] Mobile auth started');
  res.redirect(discordAuthUrl);
});

// Mobile OAuth callback
app.get('/auth/mobile/callback', async (req, res) => {
  const { code, state } = req.query;
  
  if (!code || !state) {
    return res.status(400).send('Missing code or state');
  }
  
  const stateData = appTokens.get('state_' + state);
  if (!stateData) {
    return res.status(400).send('Invalid state');
  }
  
  const app_redirect = stateData.app_redirect;
  appTokens.delete('state_' + state);
  
  try {
    const OAUTH_CLIENT_ID = process.env.DISCORD_OAUTH_CLIENT_ID || '1414216173809307780';
    const OAUTH_CLIENT_SECRET = process.env.DISCORD_OAUTH_CLIENT_SECRET || '_LnfeJDT77TZ3qcBs7SsjFOcT_nvWB-o';
    const REDIRECT_URI = 'http://88.174.155.230:33003/auth/mobile/callback';
    
    // Échanger code contre access token
    const https = require('https');
    const tokenData = await new Promise((resolve, reject) => {
      const postData = new URLSearchParams({
        client_id: OAUTH_CLIENT_ID,
        client_secret: OAUTH_CLIENT_SECRET,
        grant_type: 'authorization_code',
        code,
        redirect_uri: REDIRECT_URI
      }).toString();
      
      const options = {
        hostname: 'discord.com',
        port: 443,
        path: '/api/oauth2/token',
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Content-Length': Buffer.byteLength(postData)
        }
      };
      
      const req = https.request(options, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          try {
            resolve(JSON.parse(data));
          } catch (e) {
            reject(new Error('Failed to parse token response'));
          }
        });
      });
      
      req.on('error', reject);
      req.write(postData);
      req.end();
    });
    
    if (!tokenData.access_token) {
      throw new Error('No access token received');
    }
    
    // Récupérer infos utilisateur
    const userData = await new Promise((resolve, reject) => {
      const options = {
        hostname: 'discord.com',
        port: 443,
        path: '/api/users/@me',
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${tokenData.access_token}`
        }
      };
      
      const req = https.request(options, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          try {
            resolve(JSON.parse(data));
          } catch (e) {
            reject(new Error('Failed to parse user response'));
          }
        });
      });
      
      req.on('error', reject);
      req.end();
    });
    
    // Vérifier permissions
    const permissions = await checkUserPermissions(userData.id, req.app.locals.client);
    
    if (!permissions.isAdmin && !permissions.isFounder) {
      return res.send(`
        <html><body style="font-family: Arial; text-align: center; padding: 50px;">
          <h1>❌ Accès refusé</h1>
          <p>Vous devez être administrateur du serveur.</p>
        </body></html>
      `);
    }
    
    // Créer token app
    const appToken = generateToken();
    appTokens.set('token_' + appToken, {
      userId: userData.id,
      username: userData.username,
      discriminator: userData.discriminator,
      avatar: userData.avatar,
      isFounder: permissions.isFounder,
      isAdmin: permissions.isAdmin,
      timestamp: Date.now()
    });
    
    console.log(`[BOT-API] User authenticated: ${userData.username} (${userData.id})`);
    
    // Rediriger vers l'app
    const redirectUrl = `${app_redirect}?token=${appToken}`;
    res.redirect(redirectUrl);
    
  } catch (error) {
    console.error('[BOT-API] OAuth error:', error);
    res.status(500).send(`Authentication failed: ${error.message}`);
  }
});

// GET /api/me - Infos utilisateur
app.get('/api/me', requireAuth, (req, res) => {
  res.json({
    userId: req.userData.userId,
    username: req.userData.username,
    discriminator: req.userData.discriminator,
    avatar: req.userData.avatar,
    isFounder: req.userData.isFounder,
    isAdmin: req.userData.isAdmin
  });
});

// DEBUG: Liste des tokens actifs (temporaire)
app.get('/api/debug/tokens', (req, res) => {
  const tokens = [];
  for (const [key, data] of appTokens.entries()) {
    if (key.startsWith('token_')) {
      tokens.push({
        username: data.username,
        userId: data.userId,
        age: Math.floor((Date.now() - data.timestamp) / 1000) + 's',
        isFounder: data.isFounder,
        isAdmin: data.isAdmin
      });
    }
  }
  res.json({ count: tokens.length, tokens });
});

// Login endpoint (temporaire - nécessite Discord OAuth pour production)
app.post('/auth/login', async (req, res) => {
  const { userId, username } = req.body;
  
  if (!userId) {
    return res.status(400).json({ error: 'userId required' });
  }
  
  // Vérifier permissions
  const permissions = await checkUserPermissions(userId, req.app.locals.client);
  
  if (!permissions.isAdmin && !permissions.isFounder) {
    return res.status(403).json({ error: 'Unauthorized - Admin required' });
  }
  
  // Créer token
  const token = Buffer.from(`${userId}-${Date.now()}`).toString('base64');
  const userData = {
    userId,
    username: username || 'User',
    timestamp: Date.now(),
    isFounder: permissions.isFounder,
    isAdmin: permissions.isAdmin
  };
  
  appTokens.set('token_' + token, userData);
  
  res.json({ 
    success: true, 
    token,
    user: userData
  });
});

// GET /api/bot/status - Statut du bot Discord (PUBLIC)
app.get('/api/bot/status', async (req, res) => {
  try {
    const client = req.app.locals.client;
    
    if (!client || !client.isReady()) {
      return res.json({
        status: 'offline',
        message: 'Bot Discord non connecté',
        timestamp: new Date().toISOString()
      });
    }
    
    const guild = client.guilds.cache.get(GUILD);
    if (!guild) {
      return res.json({
        status: 'offline',
        message: 'Serveur Discord non trouvé',
        timestamp: new Date().toISOString()
      });
    }
    
    // Statistiques basiques
    const botUser = client.user;
    const uptime = Math.floor(client.uptime / 1000); // en secondes
    const memberCount = guild.memberCount;
    const channelCount = guild.channels.cache.size;
    
    res.json({
      status: 'online',
      bot: {
        username: botUser.username,
        id: botUser.id,
        avatar: botUser.displayAvatarURL(),
        uptime: uptime
      },
      guild: {
        name: guild.name,
        id: guild.id,
        memberCount: memberCount,
        channelCount: channelCount
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('[BOT-API] Error in /api/bot/status:', error);
    res.status(500).json({
      status: 'error',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// GET /api/configs - Récupérer toute la config (PUBLIC pour compatibilité)
app.get('/api/configs', async (req, res) => {
  try {
    const config = await readConfig();
    const guildConfig = config.guilds[GUILD] || {};
    
    // Filtrer pour ne garder que les membres actuels du serveur (avec timeout)
    try {
      const guild = req.app.locals.client.guilds.cache.get(GUILD);
      if (guild) {
        // Fetch avec timeout de 3 secondes
        await Promise.race([
          guild.members.fetch(),
          new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 3000))
        ]);
        
        const currentMemberIds = guild.members.cache.map(m => m.id);
        console.log(`[API] Filtrage avec ${currentMemberIds.length} membres actuels`);
        
        // Filtrer économie
        if (guildConfig.economy && guildConfig.economy.balances) {
          const filtered = {};
          for (const [uid, data] of Object.entries(guildConfig.economy.balances)) {
            if (currentMemberIds.includes(uid)) filtered[uid] = data;
          }
          guildConfig.economy.balances = filtered;
        }
        
        // Filtrer niveaux
        if (guildConfig.levels && guildConfig.levels.users) {
          const filtered = {};
          for (const [uid, data] of Object.entries(guildConfig.levels.users)) {
            if (currentMemberIds.includes(uid)) filtered[uid] = data;
          }
          guildConfig.levels.users = filtered;
        }
      }
    } catch (filterError) {
      console.warn('[API] Member filtering skipped:', filterError.message);
      // Continue sans filtrage si timeout ou erreur
    }
    
    res.json(guildConfig);
  } catch (error) {
    console.error('[API] Error in /api/configs:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /api/configs/:section - Mettre à jour une section
app.put('/api/configs/:section', requireAuth, async (req, res) => {
  const { section } = req.params;
  const updates = req.body;
  
  console.log(`📝 [BOT-API] PUT /api/configs/${section} by ${req.userData?.username || 'unknown'}`);
  console.log(`📝 [BOT-API] Headers:`, JSON.stringify(req.headers, null, 2));
  
  try {
    console.log(`📝 [BOT-API] Update section '${section}' by ${req.userData.username}`);
    console.log(`📝 [BOT-API] Updates:`, JSON.stringify(updates, null, 2));
    
    const config = await readConfig();
    
    if (!config.guilds) config.guilds = {};
    if (!config.guilds[GUILD]) config.guilds[GUILD] = {};
    if (!config.guilds[GUILD][section]) config.guilds[GUILD][section] = {};
    
    // Merger
    config.guilds[GUILD][section] = { ...config.guilds[GUILD][section], ...updates };
    
    console.log(`📝 [BOT-API] Config APRÈS merge:`, JSON.stringify(config.guilds[GUILD][section], null, 2));
    
    // Sauvegarder
    await writeConfig(config);
    
    // Déclencher le reload du bot via signal file
    const signalPath = path.join(__dirname, '../data/config-updated.signal');
    try {
      fs.writeFileSync(signalPath, Date.now().toString(), 'utf8');
      console.log(`🔄 [BOT-API] Config reload signal sent`);
    } catch (signalError) {
      console.warn('[BOT-API] Could not write reload signal:', signalError.message);
    }
    
    console.log(`✅ [BOT-API] Config section '${section}' updated successfully`);
    
    res.json({ 
      success: true, 
      section, 
      config: config.guilds[GUILD][section] 
    });
  } catch (error) {
    console.error('[BOT-API] Error updating config:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/dashboard/stats - Statistiques du serveur (PUBLIC)
app.get('/api/dashboard/stats', async (req, res) => {
  try {
    const guild = req.app.locals.client.guilds.cache.get(GUILD);
    if (!guild) {
      return res.status(404).json({ error: 'Guild not found' });
    }
    
    console.log('[BOT-API] Fetching members for stats...');
    
    // Essayer de fetch les membres avec timeout
    try {
      await Promise.race([
        guild.members.fetch(),
        new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 5000))
      ]);
    } catch (fetchError) {
      console.warn('[BOT-API] Member fetch failed, using cache:', fetchError.message);
    }
    
    const members = guild.members.cache;
    const totalMembers = members.size;
    const totalBots = members.filter(m => m.user.bot).size;
    const totalHumans = totalMembers - totalBots;
    const onlineMembers = members.filter(m => m.presence?.status === 'online').size;
    
    console.log(`[BOT-API] Stats: ${totalMembers} membres (${totalBots} bots, ${totalHumans} humains)`);
    
    const config = await readConfig();
    const guildConfig = config.guilds[GUILD] || {};
    
    const economyCount = Object.keys(guildConfig.economy?.balances || {}).length;
    const levelsCount = Object.keys(guildConfig.levels?.users || {}).length;
    
    res.json({
      totalMembers,
      totalBots,
      totalHumans,
      onlineMembers,
      economyCount,
      levelsCount
    });
  } catch (error) {
    console.error('[BOT-API] Error in stats:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/discord/members - Liste des membres (PUBLIC)
app.get('/api/discord/members', async (req, res) => {
  try {
    const guild = req.app.locals.client.guilds.cache.get(GUILD);
    if (!guild) {
      return res.status(404).json({ error: 'Guild not found' });
    }
    
    await guild.members.fetch();
    
    const members = {};
    const roles = {};
    
    guild.members.cache.forEach(member => {
      members[member.id] = member.user.username;
      roles[member.id] = member.roles.cache.map(r => r.id);
    });
    
    res.json({ members, roles });
  } catch (error) {
    console.error('[BOT-API] Error fetching members:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/discord/channels - Liste des channels (PUBLIC)
app.get('/api/discord/channels', async (req, res) => {
  try {
    const guild = req.app.locals.client.guilds.cache.get(GUILD);
    if (!guild) {
      return res.status(404).json({ error: 'Guild not found' });
    }
    
    const channels = {};
    guild.channels.cache.forEach(channel => {
      channels[channel.id] = channel.name;
    });
    
    res.json(channels);
  } catch (error) {
    console.error('[BOT-API] Error fetching channels:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/discord/roles - Liste des rôles (PUBLIC)
app.get('/api/discord/roles', async (req, res) => {
  try {
    const guild = req.app.locals.client.guilds.cache.get(GUILD);
    if (!guild) {
      return res.status(404).json({ error: 'Guild not found' });
    }
    
    const roles = {};
    guild.roles.cache.forEach(role => {
      roles[role.id] = role.name;
    });
    
    res.json(roles);
  } catch (error) {
    console.error('[BOT-API] Error fetching roles:', error);
    res.status(500).json({ error: error.message });
  }
});

// ========== STAFF CHAT ==========

const staffMessages = [];

// ========== CHAT STAFF AMÉLIORÉ ==========

// Configurer multer pour les uploads staff chat
const staffChatStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadsDir = path.join(__dirname, '../data/staff-uploads');
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const uniqueName = `${Date.now()}-${file.originalname}`;
    cb(null, uniqueName);
  }
});

const staffChatUpload = multer({
  storage: staffChatStorage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB max
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|webp|mp4|mov|avi|pdf/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Type de fichier non supporté'));
    }
  }
});

// GET messages (avec option de filtrer par room pour chat privé)
app.get('/api/staff/chat/messages', requireAuth, (req, res) => {
  try {
    const { room } = req.query; // "global" ou "user-{userId1}-{userId2}"
    console.log(`📥 [BOT-API] GET /api/staff/chat/messages?room=${room || 'global'}`);
    
    let filtered = staffMessages;
    if (room && room !== 'global') {
      filtered = staffMessages.filter(m => m.room === room);
    } else {
      // Par défaut, afficher les messages globaux
      filtered = staffMessages.filter(m => !m.room || m.room === 'global');
    }
    
    res.json({ messages: filtered });
  } catch (error) {
    console.error('[BOT-API] Error fetching staff messages:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST message texte (avec support room pour chat privé)
app.post('/api/staff/chat/send', requireAuth, express.json(), (req, res) => {
  try {
    const { userId, username, message, room, commandType, commandData } = req.body;
    console.log(`📥 [BOT-API] POST /api/staff/chat/send from ${username} (room: ${room || 'global'})`);
    
    if (!message || !userId || !username) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    
    const newMessage = {
      id: Date.now().toString(),
      userId,
      username,
      message,
      room: room || 'global',
      timestamp: new Date().toISOString(),
      type: commandType || 'text', // 'text', 'command', 'attachment'
      commandData: commandData || null
    };
    
    staffMessages.push(newMessage);
    
    // Garder seulement les 200 derniers messages
    if (staffMessages.length > 200) {
      staffMessages.shift();
    }
    
    res.json({ success: true, message: newMessage });
  } catch (error) {
    console.error('[BOT-API] Error sending staff message:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST upload image/video/fichier
app.post('/api/staff/chat/upload', requireAuth, staffChatUpload.single('file'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }
    
    const { userId, username, room } = req.body;
    console.log(`📥 [BOT-API] POST /api/staff/chat/upload from ${username} - ${req.file.originalname}`);
    
    const newMessage = {
      id: Date.now().toString(),
      userId,
      username,
      message: req.file.originalname,
      room: room || 'global',
      timestamp: new Date().toISOString(),
      type: 'attachment',
      attachmentUrl: `/api/staff/chat/file/${req.file.filename}`,
      attachmentType: req.file.mimetype.startsWith('image') ? 'image' : 
                      req.file.mimetype.startsWith('video') ? 'video' : 'file'
    };
    
    staffMessages.push(newMessage);
    
    if (staffMessages.length > 200) {
      staffMessages.shift();
    }
    
    res.json({ success: true, message: newMessage });
  } catch (error) {
    console.error('[BOT-API] Error uploading staff file:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET fichier staff
app.get('/api/staff/chat/file/:filename', (req, res) => {
  try {
    const filepath = path.join(__dirname, '../data/staff-uploads', req.params.filename);
    if (!fs.existsSync(filepath)) {
      return res.status(404).send('File not found');
    }
    res.sendFile(filepath);
  } catch (error) {
    console.error('[BOT-API] Error serving staff file:', error);
    res.status(500).send('Error serving file');
  }
});

// GET liste des admins en ligne (pour chat privé)
app.get('/api/staff/online', requireAuth, (req, res) => {
  try {
    // Récupérer la liste des sessions actives
    const onlineAdmins = sessions.map(s => ({
      userId: s.userId,
      username: s.username,
      lastActivity: s.lastActivity
    }));
    
    res.json({ admins: onlineAdmins });
  } catch (error) {
    console.error('[BOT-API] Error fetching online admins:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ========== MUSIQUE ==========

// Configuration multer
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadsDir = path.join(__dirname, '../data/uploads');
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const timestamp = Date.now();
    const sanitized = file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_');
    cb(null, `${timestamp}-${sanitized}`);
  }
});
const upload = multer({ storage, limits: { fileSize: 50 * 1024 * 1024 } });

app.get('/api/music/uploads', requireAuth, (req, res) => {
  try {
    const uploadsDir = path.join(__dirname, '../data/uploads');
    console.log('[BOT-API] Looking for uploads in:', uploadsDir);
    
    if (!fs.existsSync(uploadsDir)) {
      console.log('[BOT-API] Uploads dir not found, creating...');
      fs.mkdirSync(uploadsDir, { recursive: true });
      return res.json({ files: [] });
    }
    
    const allFiles = fs.readdirSync(uploadsDir);
    console.log(`[BOT-API] Found ${allFiles.length} total files in uploads`);
    
    const files = allFiles.filter(file => {
      const ext = path.extname(file).toLowerCase();
      return ['.mp3', '.wav', '.m4a', '.ogg', '.flac', '.webm'].includes(ext);
    });
    
    console.log(`[BOT-API] Returning ${files.length} audio files`);
    res.json({ files });
  } catch (error) {
    console.error('[BOT-API] Error listing uploads:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/music/upload', requireAuth, upload.single('file'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }
    
    console.log(`✅ [BOT-API] Audio uploaded: ${req.file.filename}`);
    res.json({ 
      success: true, 
      filename: req.file.filename,
      originalName: req.file.originalname,
      size: req.file.size
    });
  } catch (error) {
    console.error('[BOT-API] Error uploading audio:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/api/music/stream/:filename', (req, res) => {
  try {
    // Décoder le nom de fichier (+ devient espace, %20 aussi)
    let filename = decodeURIComponent(req.params.filename.replace(/\+/g, ' '));
    const filepath = path.join(__dirname, '../data/uploads', filename);
    
    console.log('📥 [BOT-API] Streaming request for:', filename);
    console.log('[BOT-API] Full path:', filepath);
    console.log('[BOT-API] File exists:', fs.existsSync(filepath));
    
    if (!fs.existsSync(filepath)) {
      console.error('❌ [BOT-API] File not found:', filepath);
      return res.status(404).json({ error: 'File not found' });
    }
    
    const stat = fs.statSync(filepath);
    console.log('✅ [BOT-API] File size:', stat.size, 'bytes');
    
    res.sendFile(filepath);
  } catch (error) {
    console.error('[BOT-API] Error streaming file:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ========== ADMIN ==========

// GET /api/admin/sessions - Membres connectés avec rôles Discord
app.get('/api/admin/sessions', requireAuth, async (req, res) => {
  try {
    const client = req.app.locals.client;
    const guild = client?.guilds.cache.get(GUILD);
    
    const sessions = [];
    for (const [key, data] of appTokens.entries()) {
      if (key.startsWith('token_')) {
        // Récupérer les rôles Discord de l'utilisateur
        let roles = [];
        try {
          if (guild) {
            const member = await guild.members.fetch(data.userId).catch(() => null);
            if (member) {
              roles = member.roles.cache.map(r => r.id).filter(id => id !== guild.id);
            }
          }
        } catch (e) {
          console.warn(`[BOT-API] Could not fetch roles for ${data.userId}:`, e.message);
        }
        
        sessions.push({
          userId: data.userId,
          username: data.username,
          discriminator: data.discriminator || '0',
          avatar: data.avatar,
          isAdmin: data.isAdmin || false,
          isFounder: data.isFounder || false,
          roles: roles, // Ajouter les rôles Discord
          connectedAt: new Date(data.timestamp).toISOString(),
          lastActivity: new Date(data.timestamp).toISOString(),
          isOnline: true
        });
      }
    }
    
    console.log(`[BOT-API] Returning ${sessions.length} sessions with roles`);
    res.json({ sessions, count: sessions.length });
  } catch (error) {
    console.error('[BOT-API] Error in /api/admin/sessions:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/admin/allowed-users - Liste des utilisateurs autorisés
app.get('/api/admin/allowed-users', requireAuth, (req, res) => {
  try {
    const appConfigPath = path.join(__dirname, '../data/app-config.json');
    let allowedUsers = [];
    
    if (fs.existsSync(appConfigPath)) {
      const appConfig = JSON.parse(fs.readFileSync(appConfigPath, 'utf8'));
      allowedUsers = appConfig.allowedUsers || [];
    }
    
    res.json({ allowedUsers, count: allowedUsers.length });
  } catch (error) {
    console.error('[BOT-API] Error in /api/admin/allowed-users:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/admin/allowed-users - Ajouter un utilisateur autorisé
app.post('/api/admin/allowed-users', requireAuth, express.json(), async (req, res) => {
  try {
    if (!req.userData.isFounder) {
      return res.status(403).json({ error: 'Founder only' });
    }
    
    const { userId, username } = req.body;
    if (!userId) {
      return res.status(400).json({ error: 'userId required' });
    }
    
    const appConfigPath = path.join(__dirname, '../data/app-config.json');
    let appConfig = { allowedUsers: [] };
    
    if (fs.existsSync(appConfigPath)) {
      appConfig = JSON.parse(fs.readFileSync(appConfigPath, 'utf8'));
    }
    
    if (!appConfig.allowedUsers) appConfig.allowedUsers = [];
    
    // Vérifier si déjà présent
    if (appConfig.allowedUsers.some(u => u.userId === userId)) {
      return res.status(400).json({ error: 'User already allowed' });
    }
    
    appConfig.allowedUsers.push({ userId, username: username || 'Unknown', addedAt: new Date().toISOString() });
    fs.writeFileSync(appConfigPath, JSON.stringify(appConfig, null, 2), 'utf8');
    
    console.log(`✅ [BOT-API] User ${userId} added to allowed list`);
    res.json({ success: true, allowedUsers: appConfig.allowedUsers });
  } catch (error) {
    console.error('[BOT-API] Error adding allowed user:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /api/admin/allowed-users/:userId - Retirer un utilisateur autorisé
app.delete('/api/admin/allowed-users/:userId', requireAuth, (req, res) => {
  try {
    if (!req.userData.isFounder) {
      return res.status(403).json({ error: 'Founder only' });
    }
    
    const { userId } = req.params;
    const appConfigPath = path.join(__dirname, '../data/app-config.json');
    
    if (!fs.existsSync(appConfigPath)) {
      return res.status(404).json({ error: 'No config found' });
    }
    
    let appConfig = JSON.parse(fs.readFileSync(appConfigPath, 'utf8'));
    if (!appConfig.allowedUsers) appConfig.allowedUsers = [];
    
    const initialLength = appConfig.allowedUsers.length;
    appConfig.allowedUsers = appConfig.allowedUsers.filter(u => u.userId !== userId);
    
    if (appConfig.allowedUsers.length === initialLength) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    fs.writeFileSync(appConfigPath, JSON.stringify(appConfig, null, 2), 'utf8');
    
    console.log(`✅ [BOT-API] User ${userId} removed from allowed list`);
    res.json({ success: true, allowedUsers: appConfig.allowedUsers });
  } catch (error) {
    console.error('[BOT-API] Error removing allowed user:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/admin/app-config - Configuration de l'app
app.get('/api/admin/app-config', requireAuth, (req, res) => {
  try {
    const appConfigPath = path.join(__dirname, '../data/app-config.json');
    let appConfig = { dashboardUrl: 'http://88.174.155.230:33002' };
    
    if (fs.existsSync(appConfigPath)) {
      appConfig = JSON.parse(fs.readFileSync(appConfigPath, 'utf8'));
    }
    
    res.json(appConfig);
  } catch (error) {
    console.error('[BOT-API] Error reading app-config:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/admin/app-config - Mettre à jour la configuration
app.post('/api/admin/app-config', requireAuth, express.json(), (req, res) => {
  try {
    if (!req.userData.isFounder && !req.userData.isAdmin) {
      return res.status(403).json({ error: 'Admin only' });
    }
    
    const appConfigPath = path.join(__dirname, '../data/app-config.json');
    let appConfig = {};
    
    if (fs.existsSync(appConfigPath)) {
      appConfig = JSON.parse(fs.readFileSync(appConfigPath, 'utf8'));
    }
    
    // Merge updates
    appConfig = { ...appConfig, ...req.body };
    fs.writeFileSync(appConfigPath, JSON.stringify(appConfig, null, 2), 'utf8');
    
    console.log(`✅ [BOT-API] App config updated by ${req.userData.username}`);
    res.json({ success: true, config: appConfig });
  } catch (error) {
    console.error('[BOT-API] Error updating app-config:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/admin/logs/:service - Logs PM2
app.get('/api/admin/logs/:service', requireAuth, (req, res) => {
  try {
    if (!req.userData.isFounder && !req.userData.isAdmin) {
      return res.status(403).json({ error: 'Admin only' });
    }
    
    const { service } = req.params;
    const { exec } = require('child_process');
    
    exec(`pm2 logs ${service} --lines 100 --nostream`, (error, stdout, stderr) => {
      if (error) {
        console.error(`[BOT-API] Error fetching logs for ${service}:`, error);
        return res.status(500).json({ error: 'Failed to fetch logs' });
      }
      
      res.json({ logs: stdout || stderr || 'No logs available' });
    });
  } catch (error) {
    console.error('[BOT-API] Error in /api/admin/logs:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/admin/restart/:service - Redémarrer un service PM2
app.post('/api/admin/restart/:service', requireAuth, express.json(), (req, res) => {
  try {
    if (!req.userData.isFounder && !req.userData.isAdmin) {
      return res.status(403).json({ error: 'Admin only' });
    }
    
    const { service } = req.params;
    const { exec } = require('child_process');
    
    console.log(`🔄 [BOT-API] Restarting ${service} by ${req.userData.username}`);
    
    exec(`pm2 restart ${service}`, (error, stdout, stderr) => {
      if (error) {
        console.error(`[BOT-API] Error restarting ${service}:`, error);
        return res.status(500).json({ error: 'Failed to restart service' });
      }
      
      console.log(`✅ [BOT-API] ${service} restarted successfully`);
      res.json({ success: true, message: `${service} restarted` });
    });
  } catch (error) {
    console.error('[BOT-API] Error in /api/admin/restart:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ========== PLAYLISTS ==========

// GET /api/music/playlists - Liste des playlists
app.get('/api/music/playlists', requireAuth, (req, res) => {
  try {
    const playlistsPath = path.join(__dirname, '../data/playlists.json');
    const oldPlaylistsDir = path.join(__dirname, '../data/playlists');
    let playlists = [];
    
    // Nouveau format
    if (fs.existsSync(playlistsPath)) {
      const content = fs.readFileSync(playlistsPath, 'utf8');
      try {
        playlists = JSON.parse(content);
      } catch (e) {
        console.error('[BOT-API] Error parsing playlists.json:', e.message);
      }
    }
    
    // Ancien format (fichiers individuels)
    if (fs.existsSync(oldPlaylistsDir)) {
      const files = fs.readdirSync(oldPlaylistsDir).filter(f => f.endsWith('.json'));
      files.forEach(file => {
        try {
          const content = JSON.parse(fs.readFileSync(path.join(oldPlaylistsDir, file), 'utf8'));
          // Convertir ancien → nouveau
          if (content.tracks && !content.songs) {
            content.songs = content.tracks.map((t, idx) => ({
              id: t.filename || t.url || `track-${idx}`,
              filename: t.filename || null,
              title: t.title || t.filename || 'Sans titre',
              url: t.url || null,
              author: t.author || null,
              duration: t.duration || null,
              addedAt: t.addedAt || Date.now()
            })).filter(s => s.filename || s.url); // Garder seulement les tracks valides
            delete content.tracks;
          }
          if (!content.id) content.id = file.replace('.json', '');
          playlists.push(content);
        } catch (e) {
          console.error(`[BOT-API] Error reading playlist ${file}:`, e.message);
        }
      });
    }
    
    res.json({ playlists, count: playlists.length });
  } catch (error) {
    console.error('[BOT-API] Error in /api/music/playlists:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/music/playlists - Créer une playlist
app.post('/api/music/playlists', requireAuth, express.json(), (req, res) => {
  try {
    const { name } = req.body;
    if (!name) {
      return res.status(400).json({ error: 'Name required' });
    }
    
    const playlistsPath = path.join(__dirname, '../data/playlists.json');
    let playlists = [];
    
    if (fs.existsSync(playlistsPath)) {
      playlists = JSON.parse(fs.readFileSync(playlistsPath, 'utf8'));
    }
    
    const newPlaylist = {
      id: Date.now().toString(),
      name,
      songs: [],
      createdAt: new Date().toISOString()
    };
    
    playlists.push(newPlaylist);
    fs.writeFileSync(playlistsPath, JSON.stringify(playlists, null, 2), 'utf8');
    
    console.log(`✅ [BOT-API] Playlist created: ${name}`);
    res.json({ success: true, playlist: newPlaylist });
  } catch (error) {
    console.error('[BOT-API] Error creating playlist:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/music/playlists/:id/songs - Ajouter une musique
app.post('/api/music/playlists/:id/songs', requireAuth, express.json(), (req, res) => {
  try {
    const { id } = req.params;
    const { filename, title } = req.body;
    
    if (!filename) {
      return res.status(400).json({ error: 'Filename required' });
    }
    
    const playlistsPath = path.join(__dirname, '../data/playlists.json');
    if (!fs.existsSync(playlistsPath)) {
      return res.status(404).json({ error: 'No playlists found' });
    }
    
    let playlists = JSON.parse(fs.readFileSync(playlistsPath, 'utf8'));
    const playlist = playlists.find(p => p.id === id);
    
    if (!playlist) {
      return res.status(404).json({ error: 'Playlist not found' });
    }
    
    const song = {
      id: Date.now().toString(),
      filename,
      title: title || filename,
      addedAt: new Date().toISOString()
    };
    
    if (!playlist.songs) playlist.songs = [];
    playlist.songs.push(song);
    
    fs.writeFileSync(playlistsPath, JSON.stringify(playlists, null, 2), 'utf8');
    
    console.log(`✅ [BOT-API] Song added to playlist ${playlist.name}: ${filename}`);
    res.json({ success: true, song, playlist });
  } catch (error) {
    console.error('[BOT-API] Error adding song:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /api/music/playlists/:id/songs/:songId - Retirer une musique
app.delete('/api/music/playlists/:id/songs/:songId', requireAuth, (req, res) => {
  try {
    const { id, songId } = req.params;
    
    const playlistsPath = path.join(__dirname, '../data/playlists.json');
    if (!fs.existsSync(playlistsPath)) {
      return res.status(404).json({ error: 'No playlists found' });
    }
    
    let playlists = JSON.parse(fs.readFileSync(playlistsPath, 'utf8'));
    const playlist = playlists.find(p => p.id === id);
    
    if (!playlist || !playlist.songs) {
      return res.status(404).json({ error: 'Playlist or songs not found' });
    }
    
    const initialLength = playlist.songs.length;
    playlist.songs = playlist.songs.filter(s => s.id !== songId);
    
    if (playlist.songs.length === initialLength) {
      return res.status(404).json({ error: 'Song not found' });
    }
    
    fs.writeFileSync(playlistsPath, JSON.stringify(playlists, null, 2), 'utf8');
    
    console.log(`✅ [BOT-API] Song removed from playlist ${playlist.name}`);
    res.json({ success: true, playlist });
  } catch (error) {
    console.error('[BOT-API] Error removing song:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /api/music/playlists/:id - Supprimer une playlist
app.delete('/api/music/playlists/:id', requireAuth, (req, res) => {
  try {
    const { id } = req.params;
    const playlistsPath = path.join(__dirname, '../data/playlists.json');
    
    if (!fs.existsSync(playlistsPath)) {
      return res.status(404).json({ error: 'No playlists found' });
    }
    
    let playlists = JSON.parse(fs.readFileSync(playlistsPath, 'utf8'));
    const initialLength = playlists.length;
    playlists = playlists.filter(p => p.id !== id);
    
    if (playlists.length === initialLength) {
      return res.status(404).json({ error: 'Playlist not found' });
    }
    
    fs.writeFileSync(playlistsPath, JSON.stringify(playlists, null, 2), 'utf8');
    
    console.log(`✅ [BOT-API] Playlist deleted: ${id}`);
    res.json({ success: true });
  } catch (error) {
    console.error('[BOT-API] Error deleting playlist:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ========== ENDPOINTS MANQUANTS POUR COMPATIBILITÉ APP ANDROID ==========

// POST /api/economy - Sauvegarder config économie (utilise PUT /api/configs/economy)
app.post('/api/economy', requireAuth, express.json(), async (req, res) => {
  try {
    const config = await readConfig();
    if (!config.guilds) config.guilds = {};
    if (!config.guilds[GUILD]) config.guilds[GUILD] = {};
    config.guilds[GUILD].economy = { ...config.guilds[GUILD].economy, ...req.body };
    await writeConfig(config);
    res.json({ success: true, config: config.guilds[GUILD].economy });
  } catch (error) {
    console.error('[BOT-API] Error in /api/economy:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/welcome - Récupérer config welcome
app.get('/api/welcome', async (req, res) => {
  try {
    const config = await readConfig();
    const welcome = config.guilds?.[GUILD]?.welcome || {};
    res.json({ welcome });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/welcome - Sauvegarder config welcome
app.post('/api/welcome', requireAuth, express.json(), async (req, res) => {
  try {
    const config = await readConfig();
    if (!config.guilds) config.guilds = {};
    if (!config.guilds[GUILD]) config.guilds[GUILD] = {};
    config.guilds[GUILD].welcome = { ...config.guilds[GUILD].welcome, ...req.body.welcome };
    await writeConfig(config);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/goodbye - Récupérer config goodbye
app.get('/api/goodbye', async (req, res) => {
  try {
    const config = await readConfig();
    const goodbye = config.guilds?.[GUILD]?.goodbye || {};
    res.json({ goodbye });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/goodbye - Sauvegarder config goodbye
app.post('/api/goodbye', requireAuth, express.json(), async (req, res) => {
  try {
    const config = await readConfig();
    if (!config.guilds) config.guilds = {};
    if (!config.guilds[GUILD]) config.guilds[GUILD] = {};
    config.guilds[GUILD].goodbye = { ...config.guilds[GUILD].goodbye, ...req.body.goodbye };
    await writeConfig(config);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/inactivity - Récupérer config inactivity
app.get('/api/inactivity', async (req, res) => {
  try {
    const config = await readConfig();
    const inactivity = config.guilds?.[GUILD]?.inactivity || {};
    res.json(inactivity);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/inactivity - Sauvegarder config inactivity
app.post('/api/inactivity', requireAuth, express.json(), async (req, res) => {
  try {
    const config = await readConfig();
    if (!config.guilds) config.guilds = {};
    if (!config.guilds[GUILD]) config.guilds[GUILD] = {};
    config.guilds[GUILD].inactivity = { ...config.guilds[GUILD].inactivity, ...req.body };
    await writeConfig(config);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/inactivity/reset/:userId - Reset inactivité d'un membre
app.post('/api/inactivity/reset/:userId', requireAuth, (req, res) => {
  res.json({ success: true, message: 'Reset inactivity not implemented' });
});

// POST /api/inactivity/add-all-members - Ajouter tous les membres au tracking
app.post('/api/inactivity/add-all-members', requireAuth, (req, res) => {
  res.json({ success: true, message: 'Add all members not implemented' });
});

// GET /api/truthdare/:mode - Récupérer config truthdare
app.get('/api/truthdare/:mode', async (req, res) => {
  try {
    const { mode } = req.params;
    const config = await readConfig();
    const truthdare = config.guilds?.[GUILD]?.truthdare?.[mode] || { channels: [], prompts: [] };
    res.json(truthdare);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// DELETE /api/truthdare/:mode/channels/:channelId - Supprimer un channel
app.delete('/api/truthdare/:mode/channels/:channelId', requireAuth, async (req, res) => {
  try {
    const { mode, channelId } = req.params;
    const config = await readConfig();
    if (config.guilds?.[GUILD]?.truthdare?.[mode]?.channels) {
      config.guilds[GUILD].truthdare[mode].channels = 
        config.guilds[GUILD].truthdare[mode].channels.filter(id => id !== channelId);
      await writeConfig(config);
    }
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/truthdare/:mode/channels - Ajouter channel truth/dare
app.post('/api/truthdare/:mode/channels', requireAuth, express.json(), async (req, res) => {
  try {
    const { mode } = req.params;
    const config = await readConfig();
    if (!config.guilds) config.guilds = {};
    if (!config.guilds[GUILD]) config.guilds[GUILD] = {};
    if (!config.guilds[GUILD].truthdare) config.guilds[GUILD].truthdare = {};
    if (!config.guilds[GUILD].truthdare[mode]) config.guilds[GUILD].truthdare[mode] = { channels: [] };
    
    const channels = config.guilds[GUILD].truthdare[mode].channels || [];
    if (req.body.channelId && !channels.includes(req.body.channelId)) {
      channels.push(req.body.channelId);
    }
    config.guilds[GUILD].truthdare[mode].channels = channels;
    
    await writeConfig(config);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// DELETE /api/truthdare/:mode/:id - Supprimer un prompt
app.delete('/api/truthdare/:mode/:id', requireAuth, async (req, res) => {
  try {
    const { mode, id } = req.params;
    const config = await readConfig();
    if (config.guilds?.[GUILD]?.truthdare?.[mode]?.prompts) {
      config.guilds[GUILD].truthdare[mode].prompts = 
        config.guilds[GUILD].truthdare[mode].prompts.filter(p => p.id !== id);
      await writeConfig(config);
    }
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// PUT /api/truthdare/:mode/:id - Modifier un prompt
app.put('/api/truthdare/:mode/:id', requireAuth, express.json(), async (req, res) => {
  try {
    const { mode, id } = req.params;
    const config = await readConfig();
    if (config.guilds?.[GUILD]?.truthdare?.[mode]?.prompts) {
      const prompts = config.guilds[GUILD].truthdare[mode].prompts;
      const index = prompts.findIndex(p => p.id === id);
      if (index !== -1 && req.body.text) {
        prompts[index].text = req.body.text;
        await writeConfig(config);
      }
    }
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/truthdare/:mode - Ajouter un prompt
app.post('/api/truthdare/:mode', requireAuth, express.json(), async (req, res) => {
  try {
    const { mode } = req.params;
    const config = await readConfig();
    if (!config.guilds) config.guilds = {};
    if (!config.guilds[GUILD]) config.guilds[GUILD] = {};
    if (!config.guilds[GUILD].truthdare) config.guilds[GUILD].truthdare = {};
    if (!config.guilds[GUILD].truthdare[mode]) config.guilds[GUILD].truthdare[mode] = { prompts: [] };
    
    // Normaliser le type: 'v' -> 'verite', 'a' -> 'action'
    let type = req.body.type || 'v';
    if (type === 'v' || type === 'vérité') type = 'verite';
    if (type === 'a') type = 'action';
    
    const newPrompt = {
      id: Date.now().toString(),
      type: type,
      text: req.body.text || '',
      addedAt: new Date().toISOString()
    };
    
    config.guilds[GUILD].truthdare[mode].prompts = config.guilds[GUILD].truthdare[mode].prompts || [];
    config.guilds[GUILD].truthdare[mode].prompts.push(newPrompt);
    
    await writeConfig(config);
    res.json({ success: true, prompt: newPrompt });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/actions/gifs - Sauvegarder GIFs d'actions
app.post('/api/actions/gifs', requireAuth, express.json(), async (req, res) => {
  try {
    const config = await readConfig();
    if (!config.guilds) config.guilds = {};
    if (!config.guilds[GUILD]) config.guilds[GUILD] = {};
    if (!config.guilds[GUILD].economy) config.guilds[GUILD].economy = {};
    if (!config.guilds[GUILD].economy.actions) config.guilds[GUILD].economy.actions = {};
    
    // Merger les GIFs
    for (const [action, gifs] of Object.entries(req.body)) {
      if (!config.guilds[GUILD].economy.actions[action]) {
        config.guilds[GUILD].economy.actions[action] = {};
      }
      config.guilds[GUILD].economy.actions[action].gifs = gifs;
    }
    
    await writeConfig(config);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/actions/messages - Sauvegarder messages d'actions
app.post('/api/actions/messages', requireAuth, express.json(), async (req, res) => {
  try {
    const config = await readConfig();
    if (!config.guilds) config.guilds = {};
    if (!config.guilds[GUILD]) config.guilds[GUILD] = {};
    if (!config.guilds[GUILD].economy) config.guilds[GUILD].economy = {};
    if (!config.guilds[GUILD].economy.actions) config.guilds[GUILD].economy.actions = {};
    
    // Merger les messages
    for (const [action, messages] of Object.entries(req.body)) {
      if (!config.guilds[GUILD].economy.actions[action]) {
        config.guilds[GUILD].economy.actions[action] = {};
      }
      config.guilds[GUILD].economy.actions[action].messages = messages;
    }
    
    await writeConfig(config);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /backups - Lister les backups
app.get('/backups', (req, res) => {
  try {
    const backupsDir = path.join(__dirname, '../data/backups');
    if (!fs.existsSync(backupsDir)) {
      return res.json({ backups: [] });
    }
    
    const guildBackupsDir = path.join(backupsDir, `guild-${GUILD}`);
    if (!fs.existsSync(guildBackupsDir)) {
      return res.json({ backups: [] });
    }
    
    const files = fs.readdirSync(guildBackupsDir)
      .filter(f => f.endsWith('.json'))
      .map(f => {
        const stats = fs.statSync(path.join(guildBackupsDir, f));
        
        // Lire le fichier pour compter les utilisateurs
        let userCount = 0;
        try {
          const content = fs.readFileSync(path.join(guildBackupsDir, f), 'utf8');
          const data = JSON.parse(content);
          if (data.economy?.balances) {
            userCount = Object.keys(data.economy.balances).length;
          }
        } catch (e) {
          // Ignore errors reading backup
        }
        
        return {
          filename: f,
          size: stats.size,
          sizeKB: Math.round(stats.size / 1024),
          created: stats.birthtime.toISOString(),
          date: new Date(stats.birthtime).toLocaleString('fr-FR'),
          users: userCount
        };
      })
      .sort((a, b) => new Date(b.created) - new Date(a.created));
    
    res.json({ backups: files });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /backup - Créer un backup
app.post('/backup', requireAuth, async (req, res) => {
  try {
    const config = await readConfig();
    const backupsDir = path.join(__dirname, '../data/backups', `guild-${GUILD}`);
    if (!fs.existsSync(backupsDir)) {
      fs.mkdirSync(backupsDir, { recursive: true });
    }
    
    const filename = `config-${new Date().toISOString().replace(/:/g, '-')}.json`;
    const filepath = path.join(backupsDir, filename);
    fs.writeFileSync(filepath, JSON.stringify(config.guilds[GUILD], null, 2));
    
    res.json({ success: true, filename });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /restore - Restaurer un backup
app.post('/restore', requireAuth, express.json(), async (req, res) => {
  try {
    const { filename } = req.body;
    if (!filename) {
      return res.status(400).json({ error: 'Filename required' });
    }
    
    const backupPath = path.join(__dirname, '../data/backups', `guild-${GUILD}`, filename);
    if (!fs.existsSync(backupPath)) {
      return res.status(404).json({ error: 'Backup not found' });
    }
    
    const backupData = JSON.parse(fs.readFileSync(backupPath, 'utf8'));
    const config = await readConfig();
    config.guilds[GUILD] = backupData;
    await writeConfig(config);
    
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/music - Récupérer config musique
app.get('/api/music', async (req, res) => {
  try {
    const config = await readConfig();
    const music = config.guilds?.[GUILD]?.music || {};
    res.json(music);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// DELETE /api/music/upload/:filename - Supprimer un upload
app.delete('/api/music/upload/:filename', requireAuth, (req, res) => {
  try {
    const { filename } = req.params;
    const filepath = path.join(__dirname, '../data/uploads', filename);
    if (fs.existsSync(filepath)) {
      fs.unlinkSync(filepath);
      res.json({ success: true });
    } else {
      res.status(404).json({ error: 'File not found' });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// DELETE /api/music/playlist/:id - Supprimer une playlist
app.delete('/api/music/playlist/:id', requireAuth, (req, res) => {
  try {
    const { id } = req.params;
    const playlistsPath = path.join(__dirname, '../data/playlists.json');
    
    if (fs.existsSync(playlistsPath)) {
      let playlists = JSON.parse(fs.readFileSync(playlistsPath, 'utf8'));
      playlists = playlists.filter(p => p.id !== id);
      fs.writeFileSync(playlistsPath, JSON.stringify(playlists, null, 2));
      res.json({ success: true });
    } else {
      res.status(404).json({ error: 'No playlists found' });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /bot/control - Contrôler le bot (restart/deploy)
app.post('/bot/control', requireAuth, express.json(), (req, res) => {
  const { action } = req.body;
  res.json({ success: true, message: `Bot control action '${action}' received` });
});

// ========== SYSTÈME & MAINTENANCE ==========

// GET /api/system/stats - Statistiques système
app.get('/api/system/stats', requireAuth, async (req, res) => {
  try {
    const os = require('os');
    const { execSync } = require('child_process');
    
    // Mémoire
    const totalMem = os.totalmem();
    const freeMem = os.freemem();
    const usedMem = totalMem - freeMem;
    const memUsagePercent = ((usedMem / totalMem) * 100).toFixed(1);
    
    // CPU
    const cpus = os.cpus();
    const cpuModel = cpus[0].model;
    const cpuCores = cpus.length;
    
    // Uptime
    const uptime = os.uptime();
    const uptimeDays = Math.floor(uptime / 86400);
    const uptimeHours = Math.floor((uptime % 86400) / 3600);
    const uptimeMinutes = Math.floor((uptime % 3600) / 60);
    
    // Disque
    let diskInfo = { total: 0, used: 0, free: 0, usagePercent: 0 };
    try {
      const dfOutput = execSync('df -h / | tail -1').toString();
      const parts = dfOutput.split(/\s+/);
      diskInfo = {
        total: parts[1],
        used: parts[2],
        free: parts[3],
        usagePercent: parts[4]
      };
    } catch (e) {
      console.error('[SYSTEM] Error getting disk info:', e.message);
    }
    
    // Backups
    const BACKUP_DIR = path.join(__dirname, '../data/backups');
    let backupCount = 0;
    let backupTotalSize = 0;
    try {
      if (fs.existsSync(BACKUP_DIR)) {
        const backupFiles = fs.readdirSync(BACKUP_DIR).filter(f => f.endsWith('.json'));
        backupCount = backupFiles.length;
        backupFiles.forEach(file => {
          try {
            const stats = fs.statSync(path.join(BACKUP_DIR, file));
            backupTotalSize += stats.size;
          } catch (e) {}
        });
      }
    } catch (e) {
      console.error('[SYSTEM] Error reading backups:', e.message);
    }
    
    // Logs
    const LOG_DIR = path.join(__dirname, '../logs');
    let logCount = 0;
    let logTotalSize = 0;
    try {
      if (fs.existsSync(LOG_DIR)) {
        const logFiles = fs.readdirSync(LOG_DIR);
        logCount = logFiles.length;
        logFiles.forEach(file => {
          try {
            const stats = fs.statSync(path.join(LOG_DIR, file));
            logTotalSize += stats.size;
          } catch (e) {}
        });
      }
    } catch (e) {
      console.error('[SYSTEM] Error reading logs:', e.message);
    }
    
    // Cache (data.json, backup files, etc.)
    const DATA_DIR = path.join(__dirname, '../data');
    let cacheSize = 0;
    try {
      if (fs.existsSync(DATA_DIR)) {
        const files = fs.readdirSync(DATA_DIR).filter(f => f.endsWith('.json') && !f.includes('backup'));
        files.forEach(file => {
          try {
            const stats = fs.statSync(path.join(DATA_DIR, file));
            cacheSize += stats.size;
          } catch (e) {}
        });
      }
    } catch (e) {
      console.error('[SYSTEM] Error reading cache:', e.message);
    }
    
    // Fichiers temporaires
    const TEMP_DIRS = [
      path.join(__dirname, '../public/uploads/temp'),
      path.join(__dirname, '../public/uploads/staff-chat'),
      '/tmp'
    ];
    let tempFileCount = 0;
    let tempTotalSize = 0;
    TEMP_DIRS.forEach(dir => {
      try {
        if (fs.existsSync(dir)) {
          const files = fs.readdirSync(dir);
          files.forEach(file => {
            try {
              const filePath = path.join(dir, file);
              const stats = fs.statSync(filePath);
              if (stats.isFile()) {
                tempFileCount++;
                tempTotalSize += stats.size;
              }
            } catch (e) {}
          });
        }
      } catch (e) {}
    });
    
    res.json({
      memory: {
        total: totalMem,
        free: freeMem,
        used: usedMem,
        usagePercent: parseFloat(memUsagePercent),
        totalGB: (totalMem / 1024 / 1024 / 1024).toFixed(2),
        usedGB: (usedMem / 1024 / 1024 / 1024).toFixed(2),
        freeGB: (freeMem / 1024 / 1024 / 1024).toFixed(2)
      },
      cpu: {
        model: cpuModel,
        cores: cpuCores
      },
      uptime: {
        seconds: uptime,
        formatted: `${uptimeDays}j ${uptimeHours}h ${uptimeMinutes}m`
      },
      disk: diskInfo,
      backups: {
        count: backupCount,
        totalSize: backupTotalSize,
        totalSizeMB: (backupTotalSize / 1024 / 1024).toFixed(2)
      },
      logs: {
        count: logCount,
        totalSize: logTotalSize,
        totalSizeMB: (logTotalSize / 1024 / 1024).toFixed(2)
      },
      cache: {
        totalSize: cacheSize,
        totalSizeMB: (cacheSize / 1024 / 1024).toFixed(2)
      },
      temp: {
        count: tempFileCount,
        totalSize: tempTotalSize,
        totalSizeMB: (tempTotalSize / 1024 / 1024).toFixed(2)
      }
    });
  } catch (error) {
    console.error('[SYSTEM] Error getting system stats:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/system/cleanup/logs - Nettoyer les anciens logs
app.post('/api/system/cleanup/logs', requireAuth, async (req, res) => {
  try {
    const LOG_DIR = path.join(__dirname, '../logs');
    let deletedCount = 0;
    let freedSpace = 0;
    
    if (fs.existsSync(LOG_DIR)) {
      const logFiles = fs.readdirSync(LOG_DIR);
      const now = Date.now();
      const SEVEN_DAYS = 7 * 24 * 60 * 60 * 1000;
      
      for (const file of logFiles) {
        try {
          const filePath = path.join(LOG_DIR, file);
          const stats = fs.statSync(filePath);
          
          // Supprimer les logs de plus de 7 jours
          if (now - stats.mtimeMs > SEVEN_DAYS) {
            freedSpace += stats.size;
            fs.unlinkSync(filePath);
            deletedCount++;
          }
        } catch (e) {
          console.error(`[SYSTEM] Error deleting log ${file}:`, e.message);
        }
      }
    }
    
    res.json({
      success: true,
      deletedCount,
      freedSpace,
      freedSpaceMB: (freedSpace / 1024 / 1024).toFixed(2)
    });
  } catch (error) {
    console.error('[SYSTEM] Error cleaning logs:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/system/cleanup/backups - Nettoyer les anciens backups
app.post('/api/system/cleanup/backups', requireAuth, async (req, res) => {
  try {
    const BACKUP_DIR = path.join(__dirname, '../data/backups');
    let deletedCount = 0;
    let freedSpace = 0;
    
    if (fs.existsSync(BACKUP_DIR)) {
      const backupFiles = fs.readdirSync(BACKUP_DIR)
        .filter(f => f.endsWith('.json'))
        .map(f => ({
          name: f,
          path: path.join(BACKUP_DIR, f),
          mtime: fs.statSync(path.join(BACKUP_DIR, f)).mtimeMs,
          size: fs.statSync(path.join(BACKUP_DIR, f)).size
        }))
        .sort((a, b) => b.mtime - a.mtime);
      
      // Garder les 10 backups les plus récents, supprimer le reste
      const toDelete = backupFiles.slice(10);
      
      for (const backup of toDelete) {
        try {
          freedSpace += backup.size;
          fs.unlinkSync(backup.path);
          deletedCount++;
        } catch (e) {
          console.error(`[SYSTEM] Error deleting backup ${backup.name}:`, e.message);
        }
      }
    }
    
    res.json({
      success: true,
      deletedCount,
      keptCount: 10,
      freedSpace,
      freedSpaceMB: (freedSpace / 1024 / 1024).toFixed(2)
    });
  } catch (error) {
    console.error('[SYSTEM] Error cleaning backups:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/system/cleanup/temp - Nettoyer les fichiers temporaires
app.post('/api/system/cleanup/temp', requireAuth, async (req, res) => {
  try {
    const TEMP_DIRS = [
      path.join(__dirname, '../public/uploads/temp'),
      path.join(__dirname, '../public/uploads/staff-chat')
    ];
    
    let deletedCount = 0;
    let freedSpace = 0;
    const now = Date.now();
    const ONE_DAY = 24 * 60 * 60 * 1000;
    
    for (const dir of TEMP_DIRS) {
      if (fs.existsSync(dir)) {
        const files = fs.readdirSync(dir);
        
        for (const file of files) {
          try {
            const filePath = path.join(dir, file);
            const stats = fs.statSync(filePath);
            
            // Supprimer les fichiers de plus de 1 jour
            if (stats.isFile() && now - stats.mtimeMs > ONE_DAY) {
              freedSpace += stats.size;
              fs.unlinkSync(filePath);
              deletedCount++;
            }
          } catch (e) {
            console.error(`[SYSTEM] Error deleting temp file ${file}:`, e.message);
          }
        }
      }
    }
    
    res.json({
      success: true,
      deletedCount,
      freedSpace,
      freedSpaceMB: (freedSpace / 1024 / 1024).toFixed(2)
    });
  } catch (error) {
    console.error('[SYSTEM] Error cleaning temp files:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/system/cleanup/all - Nettoyer tout
app.post('/api/system/cleanup/all', requireAuth, async (req, res) => {
  try {
    const results = {
      logs: { deletedCount: 0, freedSpaceMB: '0' },
      backups: { deletedCount: 0, freedSpaceMB: '0' },
      temp: { deletedCount: 0, freedSpaceMB: '0' }
    };
    
    // Nettoyer logs
    try {
      const logsResp = await fetch(`http://localhost:${PORT}/api/system/cleanup/logs`, {
        method: 'POST',
        headers: {
          'Authorization': req.headers['authorization']
        }
      });
      const logsData = await logsResp.json();
      if (logsData.success) {
        results.logs = { 
          deletedCount: logsData.deletedCount, 
          freedSpaceMB: logsData.freedSpaceMB 
        };
      }
    } catch (e) {
      console.error('[SYSTEM] Error in cleanup logs:', e.message);
    }
    
    // Nettoyer backups
    try {
      const backupsResp = await fetch(`http://localhost:${PORT}/api/system/cleanup/backups`, {
        method: 'POST',
        headers: {
          'Authorization': req.headers['authorization']
        }
      });
      const backupsData = await backupsResp.json();
      if (backupsData.success) {
        results.backups = { 
          deletedCount: backupsData.deletedCount, 
          freedSpaceMB: backupsData.freedSpaceMB 
        };
      }
    } catch (e) {
      console.error('[SYSTEM] Error in cleanup backups:', e.message);
    }
    
    // Nettoyer temp
    try {
      const tempResp = await fetch(`http://localhost:${PORT}/api/system/cleanup/temp`, {
        method: 'POST',
        headers: {
          'Authorization': req.headers['authorization']
        }
      });
      const tempData = await tempResp.json();
      if (tempData.success) {
        results.temp = { 
          deletedCount: tempData.deletedCount, 
          freedSpaceMB: tempData.freedSpaceMB 
        };
      }
    } catch (e) {
      console.error('[SYSTEM] Error in cleanup temp:', e.message);
    }
    
    const totalFreedMB = parseFloat(results.logs.freedSpaceMB) + 
                        parseFloat(results.backups.freedSpaceMB) + 
                        parseFloat(results.temp.freedSpaceMB);
    
    res.json({
      success: true,
      results,
      totalFreedMB: totalFreedMB.toFixed(2),
      totalDeletedCount: results.logs.deletedCount + 
                        results.backups.deletedCount + 
                        results.temp.deletedCount
    });
  } catch (error) {
    console.error('[SYSTEM] Error in cleanup all:', error);
    res.status(500).json({ error: error.message });
  }
});

// ========== FONCTION D'INITIALISATION ==========

function startApiServer(client) {
  // Stocker le client Discord pour l'utiliser dans les routes
  app.locals.client = client;
  
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`✅ [BOT-API] Server running on port ${PORT}`);
    console.log(`✅ [BOT-API] Guild ID: ${GUILD}`);
    console.log(`✅ [BOT-API] Access: http://0.0.0.0:${PORT}`);
  });
  
  return app;
}

module.exports = { startApiServer };

// Si lancé directement (pas importé), démarrer en standalone
if (require.main === module) {
  console.log('🚀 [BOT-API] Starting in standalone mode...');
  const { Client, GatewayIntentBits } = require('discord.js');
  
  const client = new Client({
    intents: [
      GatewayIntentBits.Guilds,
      GatewayIntentBits.GuildMembers,
      GatewayIntentBits.GuildMessages
    ]
  });
  
  const token = process.env.DISCORD_TOKEN || process.env.BOT_TOKEN;
  if (!token) {
    console.error('❌ [BOT-API] No Discord token found in environment variables');
    process.exit(1);
  }
  client.login(token)
    .then(() => {
      console.log('✅ [BOT-API] Discord client ready');
      startApiServer(client);
    })
    .catch(err => {
      console.error('❌ [BOT-API] Failed to connect to Discord:', err);
      process.exit(1);
    });
}
