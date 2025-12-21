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

// Middleware d'authentification
function requireAuth(req, res, next) {
  const authHeader = req.headers['authorization'];
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No token' });
  }
  
  const token = authHeader.substring(7);
  const userData = appTokens.get('token_' + token);
  
  if (!userData) {
    return res.status(401).json({ error: 'Invalid token' });
  }
  
  if (Date.now() - userData.timestamp > 24 * 60 * 60 * 1000) {
    appTokens.delete('token_' + token);
    return res.status(401).json({ error: 'Token expired' });
  }
  
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

// GET /api/configs - Récupérer toute la config
app.get('/api/configs', requireAuth, async (req, res) => {
  try {
    const config = await readConfig();
    const guildConfig = config.guilds[GUILD] || {};
    
    // Filtrer pour ne garder que les membres actuels du serveur
    const guild = req.app.locals.client.guilds.cache.get(GUILD);
    if (guild) {
      await guild.members.fetch();
      const currentMemberIds = guild.members.cache.map(m => m.id);
      
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

// GET /api/dashboard/stats - Statistiques du serveur
app.get('/api/dashboard/stats', requireAuth, async (req, res) => {
  try {
    const guild = req.app.locals.client.guilds.cache.get(GUILD);
    if (!guild) {
      return res.status(404).json({ error: 'Guild not found' });
    }
    
    await guild.members.fetch();
    
    const members = guild.members.cache;
    const totalMembers = members.size;
    const totalBots = members.filter(m => m.user.bot).size;
    const totalHumans = totalMembers - totalBots;
    const onlineMembers = members.filter(m => m.presence?.status === 'online').size;
    
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

// GET /api/discord/members - Liste des membres
app.get('/api/discord/members', requireAuth, async (req, res) => {
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

// GET /api/discord/channels - Liste des channels
app.get('/api/discord/channels', requireAuth, async (req, res) => {
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

// GET /api/discord/roles - Liste des rôles
app.get('/api/discord/roles', requireAuth, async (req, res) => {
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
    if (!fs.existsSync(uploadsDir)) {
      return res.json({ files: [] });
    }
    
    const files = fs.readdirSync(uploadsDir).filter(file => {
      const ext = path.extname(file).toLowerCase();
      return ['.mp3', '.wav', '.m4a', '.ogg', '.flac', '.webm'].includes(ext);
    });
    
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
    const { filename } = req.params;
    const filepath = path.join(__dirname, '../data/uploads', filename);
    
    if (!fs.existsSync(filepath)) {
      return res.status(404).json({ error: 'File not found' });
    }
    
    res.sendFile(filepath);
  } catch (error) {
    console.error('[BOT-API] Error streaming file:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ========== FONCTION D'INITIALISATION ==========

function startApiServer(client) {
  // Stocker le client Discord pour l'utiliser dans les routes
  app.locals.client = client;
  
  app.listen(PORT, () => {
    console.log(`✅ [BOT-API] Server running on port ${PORT}`);
    console.log(`✅ [BOT-API] Guild ID: ${GUILD}`);
    console.log(`✅ [BOT-API] Access: http://localhost:${PORT}`);
  });
  
  return app;
}

module.exports = { startApiServer };
