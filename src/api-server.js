// API Server pour l'application Android - Intégré au Bot Discord
// Ce serveur remplace le dashboard comme intermédiaire

const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const fsp = fs.promises;
const multer = require('multer');
const listLocalBackups = require('./helpers/listLocalBackups');
const crypto = require('crypto');

// Importer les fonctions du bot
const { 
  readConfig, 
  writeConfig,
  getLevelsConfig,
  updateLevelsConfig,
  getEconomyConfig,
  getEconomyUser,
  setEconomyUser,
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

// Active sessions (for "membres connectés" / online staff)
// userId -> { userId, username, avatar, isAdmin, isFounder, isAllowed, lastActivity }
const activeSessions = new Map();
const ACTIVE_SESSION_TTL_MS = 15 * 60 * 1000;

// Permissions cache to avoid hitting Discord API on every request
const permissionsCache = new Map(); // userId -> { data, checkedAt }
const PERMISSIONS_CACHE_TTL_MS = 2 * 60 * 1000;

function touchActiveSession(userData) {
  try {
    if (!userData || !userData.userId) return;
    const uid = String(userData.userId);
    const now = Date.now();
    activeSessions.set(uid, {
      userId: uid,
      username: userData.username || 'User',
      avatar: userData.avatar || null,
      isAdmin: Boolean(userData.isAdmin),
      isFounder: Boolean(userData.isFounder),
      isAllowed: Boolean(userData.isAllowed),
      lastActivity: now,
    });
  } catch (_) {}
}

function getOnlineSessions() {
  const now = Date.now();
  const out = [];
  for (const s of activeSessions.values()) {
    if (!s || !s.userId) continue;
    if ((now - (s.lastActivity || 0)) <= ACTIVE_SESSION_TTL_MS) out.push(s);
  }
  return out;
}

async function getAllowedUsersList() {
  try {
    const appConfigPath = path.join(__dirname, '../data/app-config.json');
    if (!fs.existsSync(appConfigPath)) return [];
    const appConfig = JSON.parse(fs.readFileSync(appConfigPath, 'utf8'));
    const list = appConfig.allowedUsers || [];
    if (!Array.isArray(list)) return [];
    return list
      .map((it) => {
        if (!it) return null;
        if (typeof it === 'string') return it;
        if (typeof it === 'object' && typeof it.userId === 'string') return it.userId;
        return null;
      })
      .filter(Boolean)
      .map(String);
  } catch (_) {
    return [];
  }
}

function base64UrlEncode(input) {
  return Buffer.from(input)
    .toString('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
}

function base64UrlDecodeToString(input) {
  const pad = input.length % 4 ? '='.repeat(4 - (input.length % 4)) : '';
  const b64 = (input + pad).replace(/-/g, '+').replace(/_/g, '/');
  return Buffer.from(b64, 'base64').toString('utf8');
}

async function loadOrCreateAppTokenSecret() {
  const env = process.env.APP_TOKEN_SECRET;
  if (env && String(env).trim().length >= 16) return String(env).trim();

  const dataDir = path.join(__dirname, '../data');
  const secretPath = path.join(dataDir, 'app-token-secret.txt');
  await fsp.mkdir(dataDir, { recursive: true }).catch(() => {});

  try {
    const existing = await fsp.readFile(secretPath, 'utf8');
    const s = String(existing || '').trim();
    if (s.length >= 16) return s;
  } catch (_) {}

  const secret = base64UrlEncode(crypto.randomBytes(48));
  try {
    await fsp.writeFile(secretPath, secret + '\n', { encoding: 'utf8', mode: 0o600 });
  } catch (_) {}
  return secret;
}

let APP_TOKEN_SECRET_PROMISE = null;
function getAppTokenSecret() {
  if (!APP_TOKEN_SECRET_PROMISE) APP_TOKEN_SECRET_PROMISE = loadOrCreateAppTokenSecret();
  return APP_TOKEN_SECRET_PROMISE;
}

async function issueAppToken(payload) {
  const secret = await getAppTokenSecret();
  const header = { alg: 'HS256', typ: 'JWT' };
  const nowSec = Math.floor(Date.now() / 1000);
  const expSec = nowSec + (90 * 24 * 60 * 60); // 90 jours
  const body = { ...payload, iat: nowSec, exp: expSec };
  const encodedHeader = base64UrlEncode(JSON.stringify(header));
  const encodedBody = base64UrlEncode(JSON.stringify(body));
  const data = `${encodedHeader}.${encodedBody}`;
  const sig = crypto.createHmac('sha256', secret).update(data).digest('base64')
    .replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
  return `${data}.${sig}`;
}

async function verifyAppToken(token) {
  const secret = await getAppTokenSecret();
  const parts = String(token || '').split('.');
  if (parts.length !== 3) return null;
  const [h, p, s] = parts;
  const data = `${h}.${p}`;
  const expected = crypto.createHmac('sha256', secret).update(data).digest('base64')
    .replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
  if (!crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(String(s)))) return null;
  let payload = null;
  try { payload = JSON.parse(base64UrlDecodeToString(p)); } catch (_) { return null; }
  const nowSec = Math.floor(Date.now() / 1000);
  if (!payload || typeof payload !== 'object') return null;
  if (typeof payload.exp !== 'number' || payload.exp <= nowSec) return null;
  return payload;
}

// ========== AUTHENTIFICATION ==========

// Fonction pour vérifier si un utilisateur est admin/fondateur
async function checkUserPermissions(userId, client) {
  try {
    if (userId === FOUNDER_ID) {
      return { isFounder: true, isAdmin: true, isAllowed: true, username: 'Founder', discriminator: '0', avatar: null };
    }
    
    const guild = client.guilds.cache.get(GUILD);
    if (!guild) return { isFounder: false, isAdmin: false, isAllowed: false, username: null, discriminator: null, avatar: null };
    
    const member = await guild.members.fetch(userId).catch(() => null);
    if (!member) return { isFounder: false, isAdmin: false, isAllowed: false, username: null, discriminator: null, avatar: null };
    
    const isAdmin = member.permissions.has('Administrator');
    const allowedUsers = await getAllowedUsersList();
    const isAllowed = allowedUsers.includes(String(userId));
    return {
      isFounder: false,
      isAdmin,
      isAllowed,
      username: member.user?.username || null,
      discriminator: member.user?.discriminator || null,
      avatar: member.user?.avatar || null,
    };
  } catch (error) {
    console.error('[API] Error checking permissions:', error);
    return { isFounder: false, isAdmin: false, isAllowed: false, username: null, discriminator: null, avatar: null };
  }
}

async function getCachedPermissions(userId, client) {
  const key = String(userId);
  const cached = permissionsCache.get(key);
  if (cached && (Date.now() - cached.checkedAt) < PERMISSIONS_CACHE_TTL_MS) return cached.data;
  const data = await checkUserPermissions(key, client);
  permissionsCache.set(key, { data, checkedAt: Date.now() });
  return data;
}

// Middleware d'authentification (token persistant + vérification admin en temps réel)
async function requireAuth(req, res, next) {
  const authHeader = req.headers['authorization'];
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No token' });
  }
  
  const token = authHeader.substring(7);
  const payload = await verifyAppToken(token);
  if (!payload || !payload.userId) {
    return res.status(401).json({ error: 'Invalid token' });
  }

  const userId = String(payload.userId);
  const client = req.app.locals.client;

  if (!client) {
    return res.status(503).json({ error: 'Discord client unavailable' });
  }

  const permissions = await getCachedPermissions(userId, client);

  // Si l'utilisateur n'est plus admin/fondateur/autorisé => accès révoqué (app doit vider le token)
  if (!permissions.isAdmin && !permissions.isFounder && !permissions.isAllowed) {
    return res.status(401).json({
      error: 'NOT_AUTHORIZED',
      message: 'Votre accès a été révoqué (vous n’êtes pas autorisé).',
    });
  }

  req.userData = {
    userId,
    username: permissions.username || payload.username || 'User',
    discriminator: permissions.discriminator || payload.discriminator || '0',
    avatar: permissions.avatar || payload.avatar || null,
    isFounder: Boolean(permissions.isFounder),
    isAdmin: Boolean(permissions.isAdmin),
    isAllowed: Boolean(permissions.isAllowed),
    timestamp: Date.now(),
  };

  touchActiveSession(req.userData);
  next();
}

function requireDiscordAdmin(req, res, next) {
  if (!req.userData?.isFounder && !req.userData?.isAdmin) {
    return res.status(403).json({ error: 'ADMIN_ONLY' });
  }
  next();
}

function requireFounder(req, res, next) {
  if (!req.userData?.isFounder) return res.status(403).json({ error: 'FOUNDER_ONLY' });
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
    
    if (!permissions.isAdmin && !permissions.isFounder && !permissions.isAllowed) {
      return res.send(`
        <html><body style="font-family: Arial; text-align: center; padding: 50px;">
          <h1>❌ Accès refusé</h1>
          <p>Vous devez être administrateur du serveur (ou membre autorisé).</p>
        </body></html>
      `);
    }
    
    // Créer token app
    const appToken = await issueAppToken({
      userId: userData.id,
      username: userData.username,
      discriminator: userData.discriminator,
      avatar: userData.avatar,
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
    isAdmin: req.userData.isAdmin,
    isAllowed: req.userData.isAllowed
  });
});

// DEBUG: Liste des tokens actifs (temporaire)
app.get('/api/debug/tokens', (req, res) => {
  // Les tokens sont désormais stateless (signés), donc rien à lister côté serveur.
  res.json({ count: 0, tokens: [] });
});

// Login endpoint (temporaire - nécessite Discord OAuth pour production)
app.post('/auth/login', async (req, res) => {
  const { userId, username } = req.body;
  
  if (!userId) {
    return res.status(400).json({ error: 'userId required' });
  }
  
  // Vérifier permissions
  const permissions = await checkUserPermissions(userId, req.app.locals.client);
  
  if (!permissions.isAdmin && !permissions.isFounder && !permissions.isAllowed) {
    return res.status(403).json({ error: 'Unauthorized - Admin or allowed required' });
  }
  
  // Créer token
  const token = await issueAppToken({
    userId,
    username: username || permissions.username || 'User',
    discriminator: permissions.discriminator || '0',
    avatar: permissions.avatar || null,
  });
  const userData = {
    userId,
    username: username || permissions.username || 'User',
    timestamp: Date.now(),
    isFounder: permissions.isFounder,
    isAdmin: permissions.isAdmin
  };
  
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

    // IMPORTANT (fix "Actions = seulement work"):
    // /api/configs lisait le JSON brut, sans appliquer ensureEconomyShape().
    // Or c'est ensureEconomyShape() qui injecte la liste complète e.actions.enabled.
    // On reconstruit donc une économie "shape" (sans l'écrire sur disque).
    try {
      guildConfig.economy = await getEconomyConfig(GUILD);
    } catch (e) {
      console.warn('[API] getEconomyConfig failed (fallback to raw):', e?.message || e);
    }
    
    // Filtrer pour ne garder que les membres actuels du serveur
    // IMPORTANT: ne pas faire de guild.members.fetch() ici (trop lourd, peut provoquer des crashs/timeout).
    try {
      const guild = req.app.locals.client.guilds.cache.get(GUILD);
      if (guild) {
        const currentMemberIds = new Set(guild.members.cache.map(m => m.id));
        console.log(`[API] Filtrage avec ${currentMemberIds.size} membres (cache Discord)`);
        
        // Filtrer économie
        if (guildConfig.economy && guildConfig.economy.balances) {
          const filtered = {};
          for (const [uid, data] of Object.entries(guildConfig.economy.balances)) {
            if (currentMemberIds.has(uid)) filtered[uid] = data;
          }
          guildConfig.economy.balances = filtered;
        }
        
        // Filtrer niveaux
        if (guildConfig.levels && guildConfig.levels.users) {
          const filtered = {};
          for (const [uid, data] of Object.entries(guildConfig.levels.users)) {
            if (currentMemberIds.has(uid)) filtered[uid] = data;
          }
          guildConfig.levels.users = filtered;
        }

        // Compat: certains schémas utilisent levels.data
        if (guildConfig.levels && guildConfig.levels.data) {
          const filtered = {};
          for (const [uid, data] of Object.entries(guildConfig.levels.data)) {
            if (currentMemberIds.has(uid)) filtered[uid] = data;
          }
          guildConfig.levels.data = filtered;
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
app.put('/api/configs/:section', requireAuth, requireDiscordAdmin, async (req, res) => {
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

// GET /api/discord/admins - Liste des ADMINS uniquement (exclut bots et membres simples)
app.get('/api/discord/admins', async (req, res) => {
  try {
    const guild = req.app.locals.client.guilds.cache.get(GUILD);
    if (!guild) {
      return res.status(404).json({ error: 'Guild not found' });
    }
    
    await guild.members.fetch();
    
    // Récupérer la config pour les staffRoleIds
    const config = await readConfig();
    const guildConfig = config.guilds?.[GUILD] || {};
    const staffRoleIds = guildConfig.staffRoleIds || [];
    
    const admins = {};
    const roles = {};
    
    guild.members.cache.forEach(member => {
      // Exclure les bots
      if (member.user.bot) {
        return;
      }
      
      // Vérifier si le membre est admin
      const isFounder = member.id === FOUNDER_ID;
      const hasAdminPermission = member.permissions.has('Administrator');
      const hasStaffRole = member.roles.cache.some(role => staffRoleIds.includes(role.id));
      
      // Inclure uniquement les admins/staff
      if (isFounder || hasAdminPermission || hasStaffRole) {
        admins[member.id] = member.user.username;
        roles[member.id] = member.roles.cache.map(r => r.id);
      }
    });
    
    res.json({ members: admins, roles });
  } catch (error) {
    console.error('[BOT-API] Error fetching admins:', error);
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

let staffMessages = [];

// Persist staff chat so conversations survive restarts.
// Stored on disk to avoid impacting config.json stability.
const STAFF_CHAT_STORE_PATH = path.join(__dirname, '../data/staff-chat-messages.json');

function normalizeRoom(room) {
  const r = String(room || 'global').trim();
  return r.length ? r : 'global';
}

function isGlobalRoom(room) {
  const r = normalizeRoom(room);
  return r === 'global' || r === 'room-global' || r === 'all';
}

function normalizeMessage(m) {
  if (!m || typeof m !== 'object') return null;
  const id = String(m.id || '').trim();
  const userId = String(m.userId || '').trim();
  const username = String(m.username || '').trim() || 'Inconnu';
  const message = String(m.message || '');
  const room = normalizeRoom(m.room);
  const timestamp = String(m.timestamp || new Date().toISOString());
  const type = String(m.type || 'text');
  const commandData = (m.commandData === undefined ? null : m.commandData);
  const attachmentUrl = m.attachmentUrl ? String(m.attachmentUrl) : undefined;
  const attachmentType = m.attachmentType ? String(m.attachmentType) : undefined;
  if (!id || !userId) return null;
  return {
    id,
    userId,
    username,
    message,
    room,
    timestamp,
    type,
    commandData,
    ...(attachmentUrl ? { attachmentUrl } : {}),
    ...(attachmentType ? { attachmentType } : {}),
  };
}

function enforceStaffChatCaps(targetRoom) {
  // Keep up to 200 messages per room.
  const room = normalizeRoom(targetRoom);
  let count = 0;
  for (const msg of staffMessages) if (normalizeRoom(msg.room) === room) count++;
  if (count <= 200) return;
  let toRemove = count - 200;
  // Remove oldest in that room (array order is append-only).
  staffMessages = staffMessages.filter((m) => {
    if (toRemove <= 0) return true;
    if (normalizeRoom(m.room) === room) {
      toRemove--;
      return false;
    }
    return true;
  });
  // Also keep a reasonable global cap to avoid uncontrolled growth.
  if (staffMessages.length > 2000) staffMessages = staffMessages.slice(-2000);
}

function persistStaffChatToDisk() {
  try {
    const dir = path.dirname(STAFF_CHAT_STORE_PATH);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    const tmp = STAFF_CHAT_STORE_PATH + '.tmp';
    fs.writeFileSync(tmp, JSON.stringify({ messages: staffMessages }, null, 2), 'utf8');
    try { fs.renameSync(tmp, STAFF_CHAT_STORE_PATH); } catch (_) { fs.writeFileSync(STAFF_CHAT_STORE_PATH, JSON.stringify({ messages: staffMessages }, null, 2), 'utf8'); }
  } catch (e) {
    try { console.warn('[BOT-API] staff chat persist failed:', e?.message || e); } catch (_) {}
  }
}

function loadStaffChatFromDisk() {
  try {
    if (!fs.existsSync(STAFF_CHAT_STORE_PATH)) return;
    const raw = fs.readFileSync(STAFF_CHAT_STORE_PATH, 'utf8');
    const parsed = JSON.parse(raw);
    const list = Array.isArray(parsed?.messages) ? parsed.messages : [];
    const normalized = list.map(normalizeMessage).filter(Boolean);
    // Keep deterministic order; newest at end.
    staffMessages = normalized.slice(-2000);
    console.log(`[BOT-API] staff chat loaded: ${staffMessages.length} messages from disk`);
  } catch (e) {
    try { console.warn('[BOT-API] staff chat load failed:', e?.message || e); } catch (_) {}
  }
}

// Load on startup
loadStaffChatFromDisk();

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
    const r = normalizeRoom(room);
    if (!isGlobalRoom(r)) filtered = staffMessages.filter(m => normalizeRoom(m.room) === r);
    else filtered = staffMessages.filter(m => isGlobalRoom(m.room));
    
    res.json({ messages: filtered });
  } catch (error) {
    console.error('[BOT-API] Error fetching staff messages:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST clear conversation (global or private room)
app.post('/api/staff/chat/clear', requireAuth, express.json(), (req, res) => {
  try {
    const room = normalizeRoom(req.body?.room || req.query?.room || 'global');
    const before = staffMessages.length;
    if (isGlobalRoom(room)) {
      staffMessages = staffMessages.filter(m => !isGlobalRoom(m.room));
    } else {
      staffMessages = staffMessages.filter(m => normalizeRoom(m.room) !== room);
    }
    persistStaffChatToDisk();
    const removed = before - staffMessages.length;
    res.json({ success: true, room, removed });
  } catch (error) {
    console.error('[BOT-API] Error clearing staff messages:', error);
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
    
    const newMessage = normalizeMessage({
      id: Date.now().toString(),
      userId,
      username,
      message,
      room: room || 'global',
      timestamp: new Date().toISOString(),
      type: commandType || 'text', // 'text', 'command', 'attachment'
      commandData: commandData || null
    });
    if (!newMessage) return res.status(400).json({ error: 'Invalid message payload' });

    staffMessages.push(newMessage);
    enforceStaffChatCaps(newMessage.room);
    persistStaffChatToDisk();
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
    
    const newMessage = normalizeMessage({
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
    });
    if (!newMessage) return res.status(400).json({ error: 'Invalid message payload' });

    staffMessages.push(newMessage);
    enforceStaffChatCaps(newMessage.room);
    persistStaffChatToDisk();
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
    const online = getOnlineSessions().map(s => ({
      userId: s.userId,
      username: s.username,
      lastActivity: new Date(s.lastActivity).toISOString(),
      isAdmin: Boolean(s.isAdmin),
      isFounder: Boolean(s.isFounder),
      isAllowed: Boolean(s.isAllowed),
    }));
    res.json({ admins: online });
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
app.get('/api/admin/sessions', requireAuth, requireFounder, async (req, res) => {
  try {
    const client = req.app.locals.client;
    const guild = client?.guilds.cache.get(GUILD);
    
    const sessions = [];
    const online = getOnlineSessions();
    for (const data of online) {
      // Récupérer les rôles Discord de l'utilisateur
      let roles = [];
      try {
        if (guild) {
          const member = await guild.members.fetch(data.userId).catch(() => null);
          if (member) roles = member.roles.cache.map(r => r.id).filter(id => id !== guild.id);
        }
      } catch (e) {
        console.warn(`[BOT-API] Could not fetch roles for ${data.userId}:`, e.message);
      }
      
      sessions.push({
        userId: data.userId,
        username: data.username,
        discriminator: '0',
        avatar: data.avatar,
        isAdmin: Boolean(data.isAdmin),
        isFounder: Boolean(data.isFounder),
        isAllowed: Boolean(data.isAllowed),
        roles: roles, // Ajouter les rôles Discord
        connectedAt: new Date(data.lastActivity || Date.now()).toISOString(),
        lastActivity: new Date(data.lastActivity || Date.now()).toISOString(),
        isOnline: true
      });
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
app.post('/api/economy', requireAuth, requireDiscordAdmin, express.json(), async (req, res) => {
  try {
    const config = await readConfig();
    if (!config.guilds) config.guilds = {};
    if (!config.guilds[GUILD]) config.guilds[GUILD] = {};
    const prevEco = config.guilds[GUILD].economy || {};
    const patch = (req.body && typeof req.body === 'object') ? req.body : {};
    const nextEco = { ...prevEco, ...patch };

    // Important: ne pas écraser entièrement la boutique quand l'app envoie un patch partiel
    // (sinon `roles`/`grants` peuvent disparaître).
    if (patch.shop && typeof patch.shop === 'object' && !Array.isArray(patch.shop)) {
      nextEco.shop = { ...(prevEco.shop || {}), ...(patch.shop || {}) };
    }

    config.guilds[GUILD].economy = nextEco;
    await writeConfig(config);
    res.json({ success: true, config: config.guilds[GUILD].economy });
  } catch (error) {
    console.error('[BOT-API] Error in /api/economy:', error);
    res.status(500).json({ error: error.message });
  }
});

// ========== BOUTIQUE (ACHAT VIA APP ANDROID) ==========

function parseOptionEmoji(raw) {
  const s = String(raw || '').trim();
  if (!s) return null;
  const m = s.match(/^<a?:([A-Za-z0-9_]+):(\d+)>$/);
  if (m) {
    return { id: m[2], name: m[1], animated: s.startsWith('<a:') };
  }
  // unicode emoji or short string
  if (s.length <= 4) return s;
  return null;
}

async function calculateShopPriceForUser(guild, userId, basePrice) {
  const eco = await getEconomyConfig(guild.id);
  const userEco = await getEconomyUser(guild.id, userId);

  let totalDeltaPercent = 0;

  // Booster discount
  try {
    const b = eco.booster || {};
    const member = await guild.members.fetch(userId).catch(() => null);
    const isNitroBooster = Boolean(member?.premiumSince || member?.premiumSinceTimestamp);
    const boosterRoleIds = Array.isArray(b.roles) ? b.roles.map(String) : [];
    const hasBoosterRole = member ? boosterRoleIds.some((rid) => member.roles?.cache?.has(rid)) : false;
    const isBooster = isNitroBooster || hasBoosterRole;
    if (b.enabled && isBooster && Number(b.shopPriceMult) > 0) {
      const boosterMult = Number(b.shopPriceMult);
      const boosterDeltaPercent = -((1 - boosterMult) * 100);
      totalDeltaPercent += boosterDeltaPercent;
    }
  } catch (_) {}

  // Karma discount (same logic as bot.js for shop prices)
  const karmaModifiers = eco.karmaModifiers?.shop;
  const userCharm = Number(userEco.charm || 0);
  const userPerversion = Number(userEco.perversion || 0);
  let karmaPercent = 0;
  if (Array.isArray(karmaModifiers)) {
    karmaPercent = karmaModifiers.reduce((acc, rule) => {
      try {
        const expr = String(rule.condition || '')
          .toLowerCase()
          .replace(/charm/g, String(userCharm))
          .replace(/perversion/g, String(userPerversion));
        if (!/^[0-9+\-*/%<>=!&|().\s]+$/.test(expr)) return acc;
        // eslint-disable-next-line no-eval
        const ok = !!eval(expr);
        return ok ? acc + Number(rule.percent || 0) : acc;
      } catch (_) {
        return acc;
      }
    }, 0);
  }
  totalDeltaPercent += karmaPercent;

  const finalMultiplier = Math.max(0, 1 + totalDeltaPercent / 100);
  return Math.max(0, Math.floor(Number(basePrice || 0) * finalMultiplier));
}

// GET /api/shop/catalog - Catalogue boutique + solde utilisateur
app.get('/api/shop/catalog', requireAuth, async (req, res) => {
  try {
    const client = req.app.locals.client;
    if (!client || !client.isReady?.()) return res.status(503).json({ error: 'Discord client unavailable' });
    const guild = client.guilds.cache.get(GUILD);
    if (!guild) return res.status(404).json({ error: 'Guild not found' });

    const userId = String(req.userData?.userId || '').trim();
    if (!userId) return res.status(401).json({ error: 'NOT_AUTHENTICATED' });

    const eco = await getEconomyConfig(guild.id);
    const u = await getEconomyUser(guild.id, userId);
    const currency = eco.currency?.name || 'BAG$';

    const roles = [];
    for (const r of (eco.shop?.roles || [])) {
      const roleId = String(r.roleId || '').trim();
      if (!roleId) continue;
      const durationDays = Number(r.durationDays || 0);
      const basePrice = Number(r.price || 0);
      const finalPrice = await calculateShopPriceForUser(guild, userId, basePrice);
      const roleName = guild.roles.cache.get(roleId)?.name || r.name || roleId;
      roles.push({ roleId, roleName, durationDays, basePrice, finalPrice });
    }

    const items = [];
    for (const it of (eco.shop?.items || [])) {
      const id = String(it.id || '').trim();
      if (!id) continue;
      const name = String(it.name || id);
      const emoji = String(it.emoji || '🎁');
      const basePrice = Number(it.price || 0);
      const finalPrice = await calculateShopPriceForUser(guild, userId, basePrice);
      items.push({ id, name, emoji, emojiParsed: parseOptionEmoji(emoji), basePrice, finalPrice });
    }

    res.json({
      currency,
      balance: Number(u.amount || 0),
      roles,
      items,
      me: { userId, charm: Number(u.charm || 0), perversion: Number(u.perversion || 0) }
    });
  } catch (error) {
    console.error('[BOT-API] Error in /api/shop/catalog:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/shop/buy - Acheter un rôle (permanent ou temporaire) via l'app
app.post('/api/shop/buy', requireAuth, express.json(), async (req, res) => {
  try {
    const client = req.app.locals.client;
    if (!client || !client.isReady?.()) return res.status(503).json({ error: 'Discord client unavailable' });
    const guild = client.guilds.cache.get(GUILD);
    if (!guild) return res.status(404).json({ error: 'Guild not found' });

    const userId = String(req.userData?.userId || '').trim();
    if (!userId) return res.status(401).json({ error: 'NOT_AUTHENTICATED' });

    const type = String(req.body?.type || '').trim();
    if (type !== 'role') return res.status(400).json({ error: 'type must be role' });

    const roleId = String(req.body?.roleId || '').trim();
    const durationDays = Math.max(0, Number(req.body?.durationDays || 0));
    if (!roleId) return res.status(400).json({ error: 'roleId required' });

    const eco = await getEconomyConfig(guild.id);
    const entry = (eco.shop?.roles || []).find(r => String(r.roleId) === String(roleId) && Number(r.durationDays || 0) === durationDays);
    if (!entry) return res.status(404).json({ error: 'ROLE_UNAVAILABLE' });

    const basePrice = Number(entry.price || 0);
    const finalPrice = await calculateShopPriceForUser(guild, userId, basePrice);

    const u = await getEconomyUser(guild.id, userId);
    const balance = Number(u.amount || 0);
    if (balance < finalPrice) return res.status(400).json({ error: 'INSUFFICIENT_FUNDS', balance, price: finalPrice });

    u.amount = balance - finalPrice;
    await setEconomyUser(guild.id, userId, u);

    // Grant role
    const member = await guild.members.fetch(userId).catch(() => null);
    if (member) {
      await member.roles.add(roleId).catch(() => null);
    }

    // Track temporary grants in config (same format as bot.js)
    if (durationDays > 0) {
      const eco2 = await getEconomyConfig(guild.id);
      const grants = { ...(eco2.shop?.grants || {}) };
      grants[`${userId}:${roleId}`] = { userId, roleId, expiresAt: Date.now() + durationDays * 24 * 60 * 60 * 1000 };
      eco2.shop = { ...(eco2.shop || {}), grants };
      await updateEconomyConfig(guild.id, eco2);
    }

    res.json({
      success: true,
      balance: Number(u.amount || 0),
      price: finalPrice,
      roleId,
      durationDays
    });
  } catch (error) {
    console.error('[BOT-API] Error in /api/shop/buy:', error);
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

// GET /api/inactivity - Récupérer config inactivity (depuis autokick.inactivityKick)
app.get('/api/inactivity', async (req, res) => {
  try {
    const config = await readConfig();
    const autokick = config.guilds?.[GUILD]?.autokick || {};
    const inactivity = autokick.inactivityKick || {
      enabled: false,
      delayDays: 30,
      excludedRoleIds: [],
      inactiveRoleId: null,
      trackActivity: true
    };
    const tracking = autokick.inactivityTracking || {};
    
    // Retourner les données avec le tracking
    res.json({
      enabled: inactivity.enabled,
      delayDays: inactivity.delayDays || 30,
      excludedRoleIds: inactivity.excludedRoleIds || [],
      inactiveRoleId: inactivity.inactiveRoleId || null,
      trackActivity: inactivity.trackActivity !== false,
      tracking: tracking
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/inactivity - Sauvegarder config inactivity (dans autokick.inactivityKick)
app.post('/api/inactivity', requireAuth, express.json(), async (req, res) => {
  try {
    const config = await readConfig();
    if (!config.guilds) config.guilds = {};
    if (!config.guilds[GUILD]) config.guilds[GUILD] = {};
    if (!config.guilds[GUILD].autokick) config.guilds[GUILD].autokick = {};
    if (!config.guilds[GUILD].autokick.inactivityKick) {
      config.guilds[GUILD].autokick.inactivityKick = {};
    }
    
    // Mettre à jour les valeurs
    config.guilds[GUILD].autokick.inactivityKick = {
      ...config.guilds[GUILD].autokick.inactivityKick,
      ...req.body
    };
    
    await writeConfig(config);

    // Déclencher le reload du bot (même comportement que /api/configs/:section)
    const signalPath = path.join(__dirname, '../data/config-updated.signal');
    try {
      fs.writeFileSync(signalPath, Date.now().toString(), 'utf8');
      console.log(`🔄 [BOT-API] Config reload signal sent (inactivity)`);
    } catch (signalError) {
      console.warn('[BOT-API] Could not write reload signal (inactivity):', signalError.message);
    }
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/inactivity/reset/:userId - Reset inactivité d'un membre
app.post('/api/inactivity/reset/:userId', requireAuth, async (req, res) => {
  try {
    const { userId } = req.params;
    const config = await readConfig();
    
    if (!config.guilds?.[GUILD]?.autokick?.inactivityTracking) {
      return res.json({ success: true, message: 'No tracking data found' });
    }
    
    if (config.guilds[GUILD].autokick.inactivityTracking[userId]) {
      config.guilds[GUILD].autokick.inactivityTracking[userId].lastActivity = Date.now();
      delete config.guilds[GUILD].autokick.inactivityTracking[userId].plannedInactive;
      delete config.guilds[GUILD].autokick.inactivityTracking[userId].graceWarningUntil;
      await writeConfig(config);
    }
    
    res.json({ success: true, message: 'Inactivity reset for user ' + userId });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/inactivity/add-all-members - Ajouter tous les membres au tracking
app.post('/api/inactivity/add-all-members', requireAuth, async (req, res) => {
  try {
    const client = req.app.locals.client;
    if (!client) {
      return res.status(503).json({ error: 'Bot client not available' });
    }
    
    const guild = client.guilds.cache.get(GUILD);
    if (!guild) {
      return res.status(404).json({ error: 'Guild not found' });
    }
    
    await guild.members.fetch();
    
    const config = await readConfig();
    if (!config.guilds) config.guilds = {};
    if (!config.guilds[GUILD]) config.guilds[GUILD] = {};
    if (!config.guilds[GUILD].autokick) config.guilds[GUILD].autokick = {};
    if (!config.guilds[GUILD].autokick.inactivityTracking) {
      config.guilds[GUILD].autokick.inactivityTracking = {};
    }
    
    let addedCount = 0;
    const now = Date.now();
    
    guild.members.cache.forEach(member => {
      if (!member.user.bot) {
        if (!config.guilds[GUILD].autokick.inactivityTracking[member.id]) {
          config.guilds[GUILD].autokick.inactivityTracking[member.id] = {
            lastActivity: now
          };
          addedCount++;
        }
      }
    });
    
    await writeConfig(config);
    res.json({ success: true, message: `Added ${addedCount} members to tracking`, total: Object.keys(config.guilds[GUILD].autokick.inactivityTracking).length });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ========== COUNTING ==========
// POST /api/counting - Gérer les actions de comptage
app.post('/api/counting', requireAuth, express.json(), async (req, res) => {
  try {
    const { action, data } = req.body;
    const config = await readConfig();
    
    if (!config.guilds?.[GUILD]?.counting) {
      config.guilds[GUILD].counting = {
        enabled: false,
        channelId: '',
        currentNumber: 0,
        lastUserId: '',
        highScore: 0
      };
    }
    
    switch (action) {
      case 'reset':
        config.guilds[GUILD].counting.currentNumber = 0;
        config.guilds[GUILD].counting.lastUserId = '';
        await writeConfig(config);
        res.json({ success: true, message: 'Comptage réinitialisé' });
        break;
      
      case 'setChannel':
        config.guilds[GUILD].counting.channelId = data?.channelId || '';
        await writeConfig(config);
        res.json({ success: true, message: 'Channel configuré' });
        break;
      
      case 'toggle':
        config.guilds[GUILD].counting.enabled = !config.guilds[GUILD].counting.enabled;
        await writeConfig(config);
        res.json({ 
          success: true, 
          enabled: config.guilds[GUILD].counting.enabled,
          message: config.guilds[GUILD].counting.enabled ? 'Comptage activé' : 'Comptage désactivé'
        });
        break;
      
      default:
        res.status(400).json({ error: 'Action non reconnue. Actions disponibles: reset, setChannel, toggle' });
    }
  } catch (error) {
    console.error('[API] Error in /api/counting:', error);
    res.status(500).json({ error: 'Erreur interne du serveur' });
  }
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

// ========== MOT CACHE (mobile) ==========
// Endpoints utilisés par l'app Android (MotCacheScreen)
function buildMotCacheProgress(motCache, userId) {
  const targetWord = String(motCache?.targetWord || '').toUpperCase().trim();
  const enabled = !!motCache?.enabled && !!targetWord;
  if (!enabled) return { active: false };

  const letters = (motCache?.collections?.[userId] || []).map(String);
  const wordDisplay = targetWord
    .split('')
    .map((ch) => (letters.includes(ch) ? ch : '_'))
    .join(' ');

  const wordLength = targetWord.length || 0;
  const letterCount = letters.length;
  const progress = wordLength > 0 ? Math.round((letterCount / wordLength) * 100) : 0;

  return {
    active: true,
    wordDisplay,
    letters,
    letterCount,
    wordLength,
    progress
  };
}

async function handleMotCacheMyProgress(req, res) {
  try {
    const userId = req.userData?.userId;
    const config = await readConfig();
    const guildConfig = config.guilds?.[GUILD] || {};
    const motCache = guildConfig.motCache || {};
    return res.json(buildMotCacheProgress(motCache, userId));
  } catch (error) {
    console.error('[BOT-API] Error in motcache my-progress:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

async function handleMotCacheGuess(req, res) {
  try {
    const userId = req.userData?.userId;
    const username = req.userData?.username || 'Unknown';
    const guess = String(req.body?.guess || '').toUpperCase().trim();
    if (!guess) return res.status(400).json({ success: false, message: 'guess required' });

    const config = await readConfig();
    if (!config.guilds) config.guilds = {};
    if (!config.guilds[GUILD]) config.guilds[GUILD] = {};

    const guildConfig = config.guilds[GUILD];
    const motCache = guildConfig.motCache || {};
    const targetWord = String(motCache?.targetWord || '').toUpperCase().trim();

    if (!motCache.enabled || !targetWord) {
      return res.json({ success: false, message: "Le jeu n'est pas actif.", correct: false });
    }

    if (guess === targetWord) {
      const reward = Number(motCache.rewardAmount || 5000) || 0;

      // Ajouter la récompense à l'économie
      if (!guildConfig.economy) guildConfig.economy = { balances: {} };
      if (!guildConfig.economy.balances) guildConfig.economy.balances = {};
      if (!guildConfig.economy.balances[userId]) guildConfig.economy.balances[userId] = { amount: 0, money: 0 };
      guildConfig.economy.balances[userId].amount = Number(guildConfig.economy.balances[userId].amount || 0) + reward;
      guildConfig.economy.balances[userId].money = Number(guildConfig.economy.balances[userId].money || 0) + reward;

      // Enregistrer le gagnant + reset du jeu
      if (!motCache.winners) motCache.winners = [];
      motCache.winners.push({ userId, username, word: motCache.targetWord, date: Date.now(), reward });
      motCache.collections = {};
      motCache.targetWord = '';
      motCache.enabled = false;

      guildConfig.motCache = motCache;
      await writeConfig(config, 'motcache');

      return res.json({ success: true, correct: true, reward });
    }

    return res.json({ success: true, correct: false, message: "Ce n'est pas le bon mot." });
  } catch (error) {
    console.error('[BOT-API] Error in motcache guess:', error);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
}

// /api/motcache/*
app.get('/api/motcache/my-progress', requireAuth, handleMotCacheMyProgress);
app.post('/api/motcache/guess', requireAuth, express.json(), handleMotCacheGuess);
// Backward compatibility: /api/mot-cache/*
app.get('/api/mot-cache/my-progress', requireAuth, handleMotCacheMyProgress);
app.post('/api/mot-cache/guess', requireAuth, express.json(), handleMotCacheGuess);

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
    if (!config.guilds[GUILD].economy.actions.gifs || typeof config.guilds[GUILD].economy.actions.gifs !== 'object') {
      config.guilds[GUILD].economy.actions.gifs = {};
    }
    
    // Merger les GIFs
    for (const [action, gifs] of Object.entries(req.body)) {
      if (!action) continue;
      const safe = (gifs && typeof gifs === 'object') ? gifs : { success: [], fail: [] };
      config.guilds[GUILD].economy.actions.gifs[action] = safe;
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
    if (!config.guilds[GUILD].economy.actions.messages || typeof config.guilds[GUILD].economy.actions.messages !== 'object') {
      config.guilds[GUILD].economy.actions.messages = {};
    }
    
    // Merger les messages (support zones)
    for (const [action, messages] of Object.entries(req.body)) {
      if (!action) continue;
      if (!messages || typeof messages !== 'object') continue;

      const existing = (config.guilds[GUILD].economy.actions.messages[action] && typeof config.guilds[GUILD].economy.actions.messages[action] === 'object')
        ? config.guilds[GUILD].economy.actions.messages[action]
        : { success: [], fail: [] };

      // Update top-level success/fail if provided
      if (Array.isArray(messages.success)) existing.success = messages.success;
      if (Array.isArray(messages.fail)) existing.fail = messages.fail;

      // Update zones if provided
      if (messages.zones && typeof messages.zones === 'object') {
        if (!existing.zones || typeof existing.zones !== 'object') existing.zones = {};
        for (const [zoneKey, zoneMsg] of Object.entries(messages.zones)) {
          if (!zoneKey) continue;
          if (!zoneMsg || typeof zoneMsg !== 'object') continue;
          const z = (existing.zones[zoneKey] && typeof existing.zones[zoneKey] === 'object')
            ? existing.zones[zoneKey]
            : { success: [], fail: [] };
          if (Array.isArray(zoneMsg.success)) z.success = zoneMsg.success;
          if (Array.isArray(zoneMsg.fail)) z.fail = zoneMsg.fail;
          existing.zones[zoneKey] = z;
        }
      }

      config.guilds[GUILD].economy.actions.messages[action] = existing;
    }
    
    await writeConfig(config);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/actions/zones?actionKey=... - Récupérer les zones d'une action
app.get('/api/actions/zones', requireAuth, async (req, res) => {
  try {
    const actionKey = String(req.query.actionKey || '').trim();
    if (!actionKey) return res.status(400).json({ error: 'actionKey required' });

    const config = await readConfig();
    const eco = config.guilds?.[GUILD]?.economy || {};
    const zones = eco.actions?.config?.[actionKey]?.zones;
    const list = Array.isArray(zones) ? zones.filter(Boolean).map(String) : [];

    res.json({ actionKey, zones: list });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/actions/zones - Ajouter / Renommer / Supprimer une zone
app.post('/api/actions/zones', requireAuth, express.json(), async (req, res) => {
  try {
    const actionKey = String(req.body?.actionKey || '').trim();
    const op = String(req.body?.op || '').trim(); // add|rename|delete

    if (!actionKey) return res.status(400).json({ error: 'actionKey required' });
    if (!op) return res.status(400).json({ error: 'op required' });

    const config = await readConfig();
    if (!config.guilds) config.guilds = {};
    if (!config.guilds[GUILD]) config.guilds[GUILD] = {};
    if (!config.guilds[GUILD].economy) config.guilds[GUILD].economy = {};
    const eco = config.guilds[GUILD].economy;
    if (!eco.actions) eco.actions = {};
    if (!eco.actions.config || typeof eco.actions.config !== 'object') eco.actions.config = {};
    if (!eco.actions.config[actionKey] || typeof eco.actions.config[actionKey] !== 'object') eco.actions.config[actionKey] = {};
    if (!Array.isArray(eco.actions.config[actionKey].zones)) eco.actions.config[actionKey].zones = [];

    if (!eco.actions.messages || typeof eco.actions.messages !== 'object') eco.actions.messages = {};
    if (!eco.actions.messages[actionKey] || typeof eco.actions.messages[actionKey] !== 'object') {
      eco.actions.messages[actionKey] = { success: [], fail: [] };
    }
    if (!eco.actions.messages[actionKey].zones || typeof eco.actions.messages[actionKey].zones !== 'object') {
      eco.actions.messages[actionKey].zones = {};
    }

    const zones = eco.actions.config[actionKey].zones;
    const msgZones = eco.actions.messages[actionKey].zones;

    if (op === 'add') {
      const zone = String(req.body?.zone || '').trim();
      if (!zone) return res.status(400).json({ error: 'zone required' });
      if (!zones.includes(zone)) zones.push(zone);
    } else if (op === 'rename') {
      const from = String(req.body?.from || '').trim();
      const to = String(req.body?.to || '').trim();
      if (!from || !to) return res.status(400).json({ error: 'from/to required' });
      eco.actions.config[actionKey].zones = zones.map((z) => (z === from ? to : z));

      // migrate messages zones
      if (msgZones && msgZones[from]) {
        if (!msgZones[to]) {
          msgZones[to] = msgZones[from];
        } else {
          const a = msgZones[to] || {};
          const b = msgZones[from] || {};
          a.success = Array.isArray(a.success) ? a.success : [];
          a.fail = Array.isArray(a.fail) ? a.fail : [];
          const bSucc = Array.isArray(b.success) ? b.success : [];
          const bFail = Array.isArray(b.fail) ? b.fail : [];
          a.success = Array.from(new Set([...a.success, ...bSucc]));
          a.fail = Array.from(new Set([...a.fail, ...bFail]));
          msgZones[to] = a;
        }
        try { delete msgZones[from]; } catch (_) {}
      }
    } else if (op === 'delete') {
      const zone = String(req.body?.zone || '').trim();
      if (!zone) return res.status(400).json({ error: 'zone required' });
      eco.actions.config[actionKey].zones = zones.filter((z) => z !== zone);
      try { delete msgZones[zone]; } catch (_) {}
    } else {
      return res.status(400).json({ error: 'invalid op' });
    }

    await writeConfig(config);
    const out = Array.isArray(eco.actions.config[actionKey].zones) ? eco.actions.config[actionKey].zones : [];
    res.json({ success: true, actionKey, zones: out });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/discord/emojis - Liste des emojis du serveur (pour l'app Android)
app.get('/api/discord/emojis', requireAuth, async (req, res) => {
  try {
    const client = req.app.locals.client;
    if (!client || !client.isReady?.()) {
      return res.status(503).json({ error: 'Discord client unavailable' });
    }
    const guild = client.guilds.cache.get(GUILD);
    if (!guild) return res.status(404).json({ error: 'Guild not found' });

    const emojis = await guild.emojis.fetch().catch(() => null);
    const arr = [];
    if (emojis) {
      for (const e of emojis.values()) {
        const id = String(e.id || '');
        const name = String(e.name || '');
        const animated = Boolean(e.animated);
        const url = (typeof e.imageURL === 'function') ? (e.imageURL({ extension: 'png', size: 64 }) || '') : '';
        const raw = animated ? `<a:${name}:${id}>` : `<:${name}:${id}>`;
        arr.push({ id, name, animated, url, raw });
      }
    }
    arr.sort((a, b) => a.name.localeCompare(b.name));
    res.json({ emojis: arr });
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

// GET /api/backups - Liste unifiée des backups (Android)
app.get('/api/backups', requireAuth, async (req, res) => {
  try {
    const list = await listLocalBackups(String(GUILD));
    const safe = list.map((b) => {
      const filename = b.filename || '';
      const type = b.type || 'other';
      const timestamp = b.timestamp || '';
      const size = typeof b.size === 'number' ? b.size : 0;
      const displayName = b.displayName || filename;

      // Restauration via l'API actuelle uniquement pour les backups per-guild (config-*.json)
      const canRestore = Boolean(
        b.fullPath &&
        String(b.fullPath).includes(`guild-${String(GUILD)}`) &&
        String(filename).toLowerCase().startsWith('config-')
      );

      return { filename, type, timestamp, size, displayName, canRestore };
    });

    res.json({ backups: safe });
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

    // Anti-spam: si un backup a été créé très récemment, ne pas en recréer un.
    // (Certaines UIs peuvent déclencher plusieurs requêtes à la suite.)
    const RECENT_WINDOW_MS = 60 * 1000; // 1 minute
    try {
      const entries = fs.readdirSync(backupsDir)
        .filter((f) => f && f.endsWith('.json') && f.startsWith('config-'))
        .map((f) => {
          const p = path.join(backupsDir, f);
          try { return { f, mtimeMs: fs.statSync(p).mtimeMs }; } catch (_) { return null; }
        })
        .filter(Boolean)
        .sort((a, b) => b.mtimeMs - a.mtimeMs);

      const latest = entries[0];
      if (latest && (Date.now() - latest.mtimeMs) < RECENT_WINDOW_MS) {
        return res.json({ success: true, skipped: true, filename: latest.f });
      }
    } catch (_) {}
    
    const filename = `config-${new Date().toISOString().replace(/:/g, '-')}.json`;
    const filepath = path.join(backupsDir, filename);
    fs.writeFileSync(filepath, JSON.stringify(config.guilds[GUILD], null, 2));

    // Rétention simple: garder uniquement les 50 derniers backups "config-*"
    try {
      const keep = 50;
      const entries = fs.readdirSync(backupsDir)
        .filter((f) => f && f.endsWith('.json') && f.startsWith('config-'))
        .map((f) => {
          const p = path.join(backupsDir, f);
          try { return { f, mtimeMs: fs.statSync(p).mtimeMs }; } catch (_) { return null; }
        })
        .filter(Boolean)
        .sort((a, b) => b.mtimeMs - a.mtimeMs);

      const toDelete = entries.slice(keep);
      for (const e of toDelete) {
        try { fs.unlinkSync(path.join(backupsDir, e.f)); } catch (_) {}
      }
    } catch (_) {}
    
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
