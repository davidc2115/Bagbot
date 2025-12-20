require('dotenv').config({ path: require('path').join(__dirname, '.env') });
const express = require('express');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const https = require('https');
const fileUpload = require('express-fileupload');
const { processGifUrls } = require('./auto_download_discord_gifs');

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadsPath = path.join(__dirname, "../data/uploads");
    if (!fs.existsSync(uploadsPath)) fs.mkdirSync(uploadsPath, { recursive: true });
    cb(null, uploadsPath);
  },
  filename: (req, file, cb) => {
    const timestamp = Date.now();
    const ext = path.extname(file.originalname);
    const basename = path.basename(file.originalname, ext);
    cb(null, `${timestamp}-${basename}${ext}`);
  }
});
const upload = multer({ storage: storage, limits: { fileSize: 50 * 1024 * 1024 } });

const app = express();
// Middleware pour gérer les uploads de fichiers - DÉSACTIVÉ car conflit avec multer
// app.use(fileUpload({
//   limits: { fileSize: 50 * 1024 * 1024 }, // 50MB max
//   useTempFiles: false,
//   debug: false
// }));

const PORT = 33002;

app.use(express.json({limit: '50mb'}));
app.use(express.urlencoded({limit: '50mb', extended: true}));

// IMPORTANT: Routes spécifiques AVANT express.static pour éviter le cache

// Redirect old URLs to new dashboard
app.get(['/', '/index.html'], (req, res) => {
  res.set({
    'Cache-Control': 'no-store, no-cache, must-revalidate',
    'Pragma': 'no-cache',
    'Expires': '0',
    'Last-Modified': new Date().toUTCString()
  });
  // Servir directement index.html (dashboard principal)
  const htmlPath = path.join(__dirname, 'index.html');
  fs.readFile(htmlPath, 'utf8', (err, data) => {
    if (err) {
      res.status(500).send('Error loading dashboard');
    } else {
      res.type('html').send(data);
    }
  });
});

// Main dashboard on /dash
app.get('/dash', (req, res) => {
  res.set({
    'Cache-Control': 'no-store, no-cache, must-revalidate',
    'Pragma': 'no-cache',
    'Expires': '0',
    'Last-Modified': new Date().toUTCString()
  });
  // Force read from disk - no cache
  const htmlPath = path.join(__dirname, 'index.html');
  fs.readFile(htmlPath, 'utf8', (err, data) => {
    if (err) {
      res.status(500).send('Error loading dashboard');
    } else {
      res.type('html').send(data);
    }
  });
});

// Test cache page
app.get('/test-cache', (req, res) => {
  res.set({
    'Cache-Control': 'no-store, no-cache, must-revalidate',
    'Pragma': 'no-cache',
    'Expires': '0'
  });
  res.sendFile(path.join(__dirname, 'test-cache.html'));
});

// Music dashboard page
app.get("/music", (req, res) => {
  res.set({
    "Cache-Control": "no-store, no-cache, must-revalidate",
    "Pragma": "no-cache",
    "Expires": "0"
  });
  res.sendFile(path.join(__dirname, "music.html"));
});


// List backups
app.get('/backups', (req, res) => {
  try {
    if (!fs.existsSync(BACKUP_DIR)) {
      return res.json({ backups: [] });
    }
    
    const items = fs.readdirSync(BACKUP_DIR);
    const backups = [];
    
    for (const item of items) {
      // Filtrer les fichiers non pertinents
      if (item.startsWith('pre-restore-') || item.startsWith('td-queues-') || 
          item === 'auto-backup.log' || item === 'auto-restore.log' ||
          item === '_old_backups' || item === 'test-persistence.txt') {
        continue;
      }
      
      const itemPath = path.join(BACKUP_DIR, item);
      const stats = fs.statSync(itemPath);
      
      if (stats.isFile() && item.endsWith('.json')) {
        // Fichier JSON - afficher uniquement les vrais backups
        backups.push({
          filename: item,
          displayName: item,
          date: stats.mtime.toLocaleString('fr-FR'),
          size: (stats.size / 1024).toFixed(2) + ' KB',
          type: 'file',
          mtime: stats.mtime.getTime()
        });
      } else if (stats.isDirectory()) {
        // Répertoire de backup
        backups.push({
          filename: item,
          displayName: item,
          date: stats.mtime.toLocaleString('fr-FR'),
          size: 'Dossier',
          type: 'directory',
          mtime: stats.mtime.getTime()
        });
      }
    }
    
    // Trier par date de modification (plus récent en premier)
    backups.sort((a, b) => b.mtime - a.mtime);
    res.json({ backups });
  } catch (err) {
    console.error('Error listing backups:', err);
    res.json({ backups: [] });
  }
});

// Create backup
app.post('/backup', (req, res) => {
  try {
    if (!fs.existsSync(BACKUP_DIR)) {
      fs.mkdirSync(BACKUP_DIR, { recursive: true });
    }
    
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const filename = `backup-${timestamp}.json`;
    const backupPath = path.join(BACKUP_DIR, filename);
    
    const config = readConfig();
    fs.writeFileSync(backupPath, JSON.stringify(config, null, 2), 'utf8');
    
    res.json({ success: true, filename });
  } catch (err) {
    console.error('Error creating backup:', err);
    res.status(500).json({ error: 'Failed to create backup' });
  }
});

// Restore backup
app.post('/restore', (req, res) => {
  try {
    const { filename } = req.body;
    if (!filename) {
      return res.status(400).json({ error: 'Filename required' });
    }
    
    const backupPath = path.join(BACKUP_DIR, filename);
    if (!fs.existsSync(backupPath)) {
      return res.status(404).json({ error: 'Backup not found' });
    }
    
    const backupData = JSON.parse(fs.readFileSync(backupPath, 'utf8'));
    
    // Create a backup of current config before restoring
    const currentBackupPath = path.join(BACKUP_DIR, `pre-restore-${Date.now()}.json`);
    fs.writeFileSync(currentBackupPath, fs.readFileSync(CONFIG, 'utf8'));
    
    // Restore the backup
    fs.writeFileSync(CONFIG, JSON.stringify(backupData, null, 2), 'utf8');
    
    res.json({ success: true });
  } catch (err) {
    console.error('Error restoring backup:', err);
    res.status(500).json({ error: 'Failed to restore backup' });
  }
});

// Bot control
app.post('/bot/control', (req, res) => {
  try {
    const { action } = req.body;
    
    if (action === 'restart') {
      // Restart the bot using PM2
      exec('pm2 restart bagbot', (error, stdout, stderr) => {
        if (error) {
          console.error('Error restarting bot:', error);
        }
      });
      res.json({ success: true, message: 'Bot restart initiated' });
    } else if (action === 'deploy') {
      // Deploy commands
      exec('cd /home/bagbot/Bag-bot && node deploy-commands.js', (error, stdout, stderr) => {
        if (error) {
          console.error('Error deploying commands:', error);
        }
      });
      res.json({ success: true, message: 'Command deployment initiated' });
    } else {
      res.status(400).json({ error: 'Unknown action' });
    }
  } catch (err) {
    console.error('Error in bot control:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});


// Bot status info
app.get('/api/bot/status', (req, res) => {
  try {
    const { exec } = require('child_process');
    const fs = require('fs');
    const path = require('path');
    
    // Compter les commandes
    const commandsPath = path.join(__dirname, '../src/commands');
    let commandCount = 0;
    try {
      const files = fs.readdirSync(commandsPath);
      commandCount = files.filter(f => f.endsWith('.js')).length;
    } catch (err) {
      console.error('Error counting commands:', err);
    }
    
    // Obtenir le statut PM2
    exec('pm2 jlist', (error, stdout, stderr) => {
      let botStatus = 'unknown';
      let restarts = 0;
      let uptime = 0;
      
      if (!error && stdout) {
        try {
          const processes = JSON.parse(stdout);
          const bagbot = processes.find(p => p.name === 'bagbot');
          if (bagbot) {
            botStatus = bagbot.pm2_env.status;
            restarts = bagbot.pm2_env.restart_time || 0;
            uptime = bagbot.pm2_env.pm_uptime || 0;
          }
        } catch (err) {
          console.error('Error parsing PM2 data:', err);
        }
      }
      
      // Lire la version du package.json
      let version = '2.0.0';
      try {
        const packagePath = path.join(__dirname, '../package.json');
        const packageData = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
        version = packageData.version || '2.0.0';
      } catch (err) {
        console.error('Error reading package.json:', err);
      }
      
      res.json({
        status: botStatus,
        commandCount,
        restarts,
        uptime,
        version,
        dashboardVersion: 'v2.8'
      });
    });
  } catch (err) {
    console.error('Error getting bot status:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Route pour servir les GIFs hébergés localement
app.use('/gifs', express.static(path.join(__dirname, 'public/gifs')));

app.use(express.static('.'));


const CONFIG = path.join(__dirname, '../data/config.json');
const GUILD = process.env.GUILD_ID || '1360897918504271882';
const FOUNDER_ID = process.env.FOUNDER_ID || '661256714779426859';

console.log('🔧 Configuration serveur:');
console.log('📋 GUILD_ID:', GUILD);
console.log('👑 FOUNDER_ID:', FOUNDER_ID);
const BACKUP_DIR = '/var/data/backups';

// Discord API credentials
const DISCORD_TOKEN = process.env.DISCORD_TOKEN;

if (!DISCORD_TOKEN) {
  console.error('❌ DISCORD_TOKEN manquant dans .env');
} else {
  console.log('✓ Discord token chargé:', DISCORD_TOKEN.substring(0, 30) + '...');
}

// Cache for channel names
let channelsCache = null;
let cacheTime = 0;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

// Helper function to read config
function readConfig() {
  try {
    return JSON.parse(fs.readFileSync(CONFIG, 'utf8'));
  } catch (err) {
    console.error('Error reading config:', err);
    return { guilds: {} };
  }
}

// Helper function to write config
function writeConfig(data) {
  try {
    fs.writeFileSync(CONFIG, JSON.stringify(data, null, 2), 'utf8');
    return true;
  } catch (err) {
    console.error('Error writing config:', err);
    return false;
  }
}

// Fetch Discord channels
function fetchDiscordChannels() {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'discord.com',
      path: `/api/v10/guilds/${GUILD}/channels`,
      method: 'GET',
      headers: {
        'Authorization': `Bot ${DISCORD_TOKEN}`,
        'Content-Type': 'application/json'
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        if (res.statusCode === 200) {
          const channels = JSON.parse(data);
          const result = {};
          channels.forEach(ch => result[ch.id] = ch.name);
          resolve(result);
        } else {
          reject(new Error(`Discord API error: ${res.statusCode}`));
        }
      });
    });
    req.on('error', reject);
    req.end();
  });
}

// Fetch Discord roles
function fetchDiscordRoles() {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'discord.com',
      path: `/api/v10/guilds/${GUILD}/roles`,
      method: 'GET',
      headers: {
        'Authorization': `Bot ${DISCORD_TOKEN}`,
        'Content-Type': 'application/json'
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        if (res.statusCode === 200) {
          const roles = JSON.parse(data);
          const result = {};
          roles.forEach(role => result[role.id] = role.name);
          resolve(result);
        } else {
          reject(new Error(`Discord API error: ${res.statusCode}`));
        }
      });
    });
    req.on('error', reject);
    req.end();
  });
}

// Get channels with caching
async function getChannels() {
  const now = Date.now();
  if (channelsCache && (now - cacheTime) < CACHE_DURATION) {
    return channelsCache;
  }
  
  try {
    channelsCache = await fetchDiscordChannels();
    cacheTime = now;
    return channelsCache;
  } catch (err) {
    console.error('Error fetching channels:', err);
    return channelsCache || {};
  }
}

// Get roles with caching
let rolesCache = null;
let rolesCacheTime = 0;
async function getRoles() {
  const now = Date.now();
  if (rolesCache && (now - rolesCacheTime) < CACHE_DURATION) {
    return rolesCache;
  }
  
  try {
    rolesCache = await fetchDiscordRoles();
    rolesCacheTime = now;
    return rolesCache;
  } catch (err) {
    console.error('Error fetching roles:', err);
    return rolesCache || {};
  }
}

// Fetch Discord members with real names
async function fetchDiscordMembers() {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'discord.com',
      path: `/api/v10/guilds/${GUILD}/members?limit=1000`,
      method: 'GET',
      headers: {
        'Authorization': `Bot ${DISCORD_TOKEN}`,
        'Content-Type': 'application/json'
      }
    };
    
    https.get(options, (response) => {
      let data = '';
      response.on('data', chunk => data += chunk);
      response.on('end', () => {
        if (response.statusCode === 200) {
          const members = JSON.parse(data);
          const memberMap = {};
          const memberRolesMap = {};
          members.forEach(m => {
            // Prioriser: nick > global_name > username
            const displayName = m.nick || m.user?.global_name || m.user?.username || `User-${m.user?.id?.slice(-4)}`;
            memberMap[m.user?.id] = displayName;
            memberRolesMap[m.user?.id] = m.roles || [];
          });
          console.log('✅ Membres Discord récupérés:', Object.keys(memberMap).length);
          resolve({ names: memberMap, roles: memberRolesMap });
        } else {
          console.error('❌ Discord API error:', response.statusCode);
          reject(new Error(`Discord API error: ${response.statusCode}`));
        }
      });
    }).on('error', (err) => {
      console.error('❌ HTTPS request error:', err.message);
      reject(err);
    });
  });
}

// Get members with caching and fallback
let membersCache = null;
let membersCacheTime = 0;
async function getMembers() {
  const now = Date.now();
  if (membersCache && (now - membersCacheTime) < CACHE_DURATION) {
    console.log('🔄 Cache membres utilisé');
    return membersCache;
  }
  
  try {
    const fetchedData = await fetchDiscordMembers();
    // Rétro-compatibilité : si c'est le nouveau format avec names/roles
    if (fetchedData && fetchedData.names) {
      membersCache = fetchedData; // IMPORTANT: cacher TOUT l'objet (names + roles)
      membersCacheTime = now;
      return fetchedData; // Retourner tout l'objet pour avoir names ET roles
    } else {
      // Ancien format (juste les noms)
      const dataWithRoles = { names: fetchedData, roles: {} };
      membersCache = dataWithRoles;
      membersCacheTime = now;
      return dataWithRoles;
    }
  } catch (err) {
    console.error('⚠️ Erreur fetch membres Discord:', err.message);
    // Fallback: extraire depuis la config
    const config = readConfig();
    const guildConfig = config.guilds[GUILD] || {};
    const fallbackMap = {};
    
    if (guildConfig.economy && guildConfig.economy.balances) {
      Object.keys(guildConfig.economy.balances).forEach(userId => {
        if (!fallbackMap[userId]) fallbackMap[userId] = `User-${userId.slice(-4)}`;
      });
    }
    if (guildConfig.levels && guildConfig.levels.users) {
      Object.keys(guildConfig.levels.users).forEach(userId => {
        if (!fallbackMap[userId]) fallbackMap[userId] = `User-${userId.slice(-4)}`;
      });
    }
    
    console.log('⚠️ Fallback config utilisé:', Object.keys(fallbackMap).length, 'membres');
    return membersCache || fallbackMap;
  }
}

// Get full guild config - MAIN ENDPOINT FOR DASHBOARD
app.get('/api/configs', async (req, res) => {
  try {
    const config = readConfig();
    const guildConfig = config.guilds[GUILD] || {};
    
    // Récupérer les membres actuels du serveur
    const membersData = await getMembers();
    const currentMemberIds = Object.keys(membersData.names || membersData);
    
    // Filtrer économie pour ne garder que les membres actuels
    if (guildConfig.economy && guildConfig.economy.balances) {
      const filteredBalances = {};
      for (const [uid, data] of Object.entries(guildConfig.economy.balances)) {
        if (currentMemberIds.includes(uid)) {
          filteredBalances[uid] = data;
        }
      }
      guildConfig.economy.balances = filteredBalances;
      console.log(`[API] Économie filtrée: ${Object.keys(filteredBalances).length} membres actuels`);
    }
    
    // Filtrer niveaux/levels pour ne garder que les membres actuels
    if (guildConfig.levels && guildConfig.levels.users) {
      const filteredUsers = {};
      for (const [uid, data] of Object.entries(guildConfig.levels.users)) {
        if (currentMemberIds.includes(uid)) {
          filteredUsers[uid] = data;
        }
      }
      guildConfig.levels.users = filteredUsers;
      console.log(`[API] Niveaux/Levels.users filtrés: ${Object.keys(filteredUsers).length} membres actuels`);
    }
    if (guildConfig.niveaux) {
      const filteredNiveaux = {};
      for (const [uid, data] of Object.entries(guildConfig.niveaux)) {
        if (currentMemberIds.includes(uid)) {
          filteredNiveaux[uid] = data;
        }
      }
      guildConfig.niveaux = filteredNiveaux;
      console.log(`[API] Niveaux filtrés: ${Object.keys(filteredNiveaux).length} membres actuels`);
    }
    
    // Filtrer inactivité pour retirer exempts et ayant quitté
    if (guildConfig.autokick && guildConfig.autokick.inactivityTracking) {
      const excludedRoles = guildConfig.autokick.inactivityKick?.excludedRoleIds || [];
      const memberRoles = membersData.roles || {};
      console.log(`[API DEBUG] Excluded roles: ${excludedRoles.length}, Has memberRoles: ${Object.keys(memberRoles).length > 0}`);
      const filteredTracking = {};
      let exemptCount = 0;
      let leftCount = 0;
      for (const [uid, data] of Object.entries(guildConfig.autokick.inactivityTracking)) {
        if (!currentMemberIds.includes(uid)) {
          leftCount++;
          continue;
        }
        const roles = memberRoles[uid] || [];
        const hasExemptRole = excludedRoles.some(roleId => roles.includes(roleId));
        if (hasExemptRole) {
          exemptCount++;
          continue;
        }
        filteredTracking[uid] = data;
      }
      guildConfig.autokick.inactivityTracking = filteredTracking;
      console.log(`[API] Inactivité filtrée: ${Object.keys(filteredTracking).length} affichés (${exemptCount} exempts, ${leftCount} partis)`);
    }

    
    // Add channel names if requested
    if (req.query.include_channels === 'true') {
      const channels = await getChannels();
      guildConfig._channels = channels;
    }
    
    res.json(guildConfig);
  } catch (err) {
    console.error('Error in /api/configs:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get Discord channels
app.get('/api/discord/channels', async (req, res) => {
  try {
    const channels = await getChannels();
    res.json(channels);
  } catch (err) {
    console.error('Error fetching Discord channels:', err);
    res.status(500).json({ error: 'Failed to fetch channels' });
  }
});

// Get Discord roles
app.get('/api/discord/roles', async (req, res) => {
  try {
    const roles = await getRoles();
    res.json(roles);
  } catch (err) {
    console.error('Error fetching Discord roles:', err);
    res.status(500).json({ error: 'Failed to fetch roles' });
  }
});

// Get Discord members
app.get('/api/discord/members', async (req, res) => {
  try {
    const members = await getMembers();
    res.json(members);
  } catch (err) {
    console.error('Error in /api/discord/members:', err);
    res.status(500).json({ error: 'Failed to fetch members' });
  }
});

// Legacy endpoints for backward compatibility
app.get('/api/config', (req, res) => {
  try {
    const config = readConfig();
    res.json(config.guilds[GUILD] || {});
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/api/config/:section', (req, res) => {
  try {
    const config = readConfig();
    const section = req.params.section;
    res.json(config.guilds[GUILD]?.[section] || {});
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get inactivity config (format bot)
app.get('/api/inactivity', async (req, res) => {
  try {
    const config = readConfig();
    const autokick = config.guilds[GUILD]?.autokick || {};
    const inactivityKick = autokick.inactivityKick || {
      enabled: false,
      delayDays: 30,
      excludedRoleIds: [],
      inactiveRoleId: null // Rôle donné aux membres qui déclarent une inactivité
    };
    
    // Ajouter le tracking des membres
    const tracking = autokick.inactivityTracking || {};
    
    
    // FILTRER exempts et ayant quitté
    const membersData = await getMembers();
    const currentMemberIds = Object.keys(membersData.names || membersData);
    const excludedRoles = inactivityKick.excludedRoleIds || [];
    const memberRoles = membersData.roles || {};
    const filteredTracking = {};
    for (const [uid, data] of Object.entries(tracking)) {
      if (!currentMemberIds.includes(uid)) continue;
      const roles = memberRoles[uid] || [];
      if (excludedRoles.some(r => roles.includes(r))) continue;
      filteredTracking[uid] = data;
    }
    console.log(`[API /inactivity] ${Object.keys(filteredTracking).length} affichés`);
    
    res.json({
      ...inactivityKick,
      tracking: filteredTracking
    });
  } catch (err) {
    console.error('Error in /api/inactivity:', err);
    res.status(500).json({ error: 'Failed to fetch inactivity config' });
  }
});

// Update inactivity config (format bot)
app.post('/api/inactivity', (req, res) => {
  try {
    const config = readConfig();
    if (!config.guilds[GUILD]) config.guilds[GUILD] = {};
    if (!config.guilds[GUILD].autokick) config.guilds[GUILD].autokick = {};
    
    config.guilds[GUILD].autokick.inactivityKick = {
      enabled: !!req.body.enabled,
      delayDays: Number(req.body.delayDays) || 30,
      excludedRoleIds: Array.isArray(req.body.excludedRoleIds) ? req.body.excludedRoleIds : [],
      inactiveRoleId: req.body.inactiveRoleId || null
    };
    
    // Initialiser inactivityTracking si nécessaire
    if (!config.guilds[GUILD].autokick.inactivityTracking) {
      config.guilds[GUILD].autokick.inactivityTracking = {};
    }
    
    if (writeConfig(config)) {
      console.log('✅ Inactivity config updated');
      res.json({ success: true });
    } else {
      res.status(500).json({ error: 'Failed to save config' });
    }
  } catch (err) {
    console.error('Error in POST /api/inactivity:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Cleanup inactivity tracking - remove members who left
app.post('/api/inactivity/cleanup', (req, res) => {
  try {
    const { removeIds } = req.body;
    if (!Array.isArray(removeIds) || removeIds.length === 0) {
      return res.json({ success: true, removed: 0 });
    }
    
    const config = readConfig();
    if (!config.guilds[GUILD]) config.guilds[GUILD] = {};
    if (!config.guilds[GUILD].autokick) config.guilds[GUILD].autokick = {};
    if (!config.guilds[GUILD].autokick.inactivityTracking) {
      config.guilds[GUILD].autokick.inactivityTracking = {};
    }
    
    const tracking = config.guilds[GUILD].autokick.inactivityTracking;
    let removed = 0;
    
    for (const id of removeIds) {
      if (tracking[id]) {
        delete tracking[id];
        removed++;
      }
    }
    
    if (removed > 0 && writeConfig(config)) {
      console.log(`✅ Inactivity cleanup: ${removed} ancien(s) membre(s) retiré(s)`);
      res.json({ success: true, removed });
    } else {
      res.json({ success: true, removed: 0 });
    }
  } catch (err) {
    console.error('Error in POST /api/inactivity/cleanup:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Réinitialiser l inactivité d un membre spécifique
app.post("/api/inactivity/reset/:userId", (req, res) => {
  try {
    const { userId } = req.params;
    const config = readConfig();
    if (!config.guilds[GUILD]) config.guilds[GUILD] = {};
    if (!config.guilds[GUILD].autokick) config.guilds[GUILD].autokick = {};
    if (!config.guilds[GUILD].autokick.inactivityTracking) {
      config.guilds[GUILD].autokick.inactivityTracking = {};
    }
    const tracking = config.guilds[GUILD].autokick.inactivityTracking;
    if (!tracking[userId]) {
      return res.status(404).json({ error: "Member not tracked" });
    }
    tracking[userId].lastActivity = Date.now();
    if (writeConfig(config)) {
      console.log(`✅ Inactivité réinitialisée pour ${userId}`);
      res.json({ success: true, userId, lastActivity: tracking[userId].lastActivity });
    } else {
      res.status(500).json({ error: "Failed to save config" });
    }
  } catch (err) {
    console.error("Error in POST /api/inactivity/reset:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Ajouter automatiquement tous les membres au tracking  
app.post("/api/inactivity/add-all-members", async (req, res) => {
  try {
    const config = readConfig();
    if (!config.guilds[GUILD]) config.guilds[GUILD] = {};
    if (!config.guilds[GUILD].autokick) config.guilds[GUILD].autokick = {};
    if (!config.guilds[GUILD].autokick.inactivityTracking) {
      config.guilds[GUILD].autokick.inactivityTracking = {};
    }
    const tracking = config.guilds[GUILD].autokick.inactivityTracking;
    const membersData = await getMembers();
    const memberNames = membersData.names || membersData;
    const knownBots = ["BoobBot", "DISBOARD", "DraftBot", "Mudae", "Invite Tracker", "Counting", "Tickets", "UnoOnDisc", "Bagbot"];
    let added = 0;
    const now = Date.now();
    for (const [userId, name] of Object.entries(memberNames)) {
      const isBot = knownBots.some(bot => name.toLowerCase().includes(bot.toLowerCase()));
      if (isBot) continue;
      if (!tracking[userId]) {
        tracking[userId] = { lastActivity: now };
        added++;
      }
    }
    if (added > 0 && writeConfig(config)) {
      console.log(`✅ ${added} nouveau(x) membre(s) ajouté(s) au tracking`);
      res.json({ success: true, added });
    } else {
      res.json({ success: true, added: 0 });
    }
  } catch (err) {
    console.error("Error in POST /api/inactivity/add-all-members:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});



// Update economy settings
app.post('/api/economy', (req, res) => {
  try {
    const config = readConfig();
    if (!config.guilds[GUILD]) config.guilds[GUILD] = {};
    if (!config.guilds[GUILD].economy) config.guilds[GUILD].economy = {};
    
    if (req.body.settings) {
      config.guilds[GUILD].economy.settings = {
        ...config.guilds[GUILD].economy.settings,
        ...req.body.settings
      };
    }
    
    if (req.body.currency) {
      config.guilds[GUILD].economy.currency = {
        ...config.guilds[GUILD].economy.currency,
        ...req.body.currency
      };
    }
    
    console.log('💾 Appel writeConfig...');
    if (writeConfig(config)) {
      console.log('✅ writeConfig réussi');
      res.json({ success: true });
    } else {
      console.error('❌ writeConfig échoué');
      res.status(500).json({ error: 'Failed to save config' });
    }
  } catch (err) {
    console.error('Error updating economy:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update actions (GIFs, messages, config)
app.post('/api/actions', async (req, res) => {
  try {
    const { messages, config: actConfig } = req.body;
    let gifs = req.body.gifs;
    const config = readConfig();
    if (!config.guilds[GUILD]) config.guilds[GUILD] = {};
    if (!config.guilds[GUILD].economy) config.guilds[GUILD].economy = {};
    if (!config.guilds[GUILD].economy.actions) config.guilds[GUILD].economy.actions = {};
    
    // Update GIFs if provided
    if (gifs !== undefined) {
      // ⚠️ Traitement désactivé côté serveur - le client s'en charge déjà
      // console.log('📥 Traitement des GIFs Discord CDN...');
      // gifs = await processGifUrls(gifs);
      console.log('📥 Réception des GIFs (déjà traités par le client)');
      config.guilds[GUILD].economy.actions.gifs = gifs;
      console.log('✅ Actions GIFs updated (traités par le navigateur)');
    }
    
    // Update messages if provided
    if (messages !== undefined) {
      config.guilds[GUILD].economy.actions.messages = messages;
      console.log('✅ Actions messages updated');
    }
    
    // Update config if provided
    if (actConfig !== undefined) {
      config.guilds[GUILD].economy.actions.config = actConfig;
      console.log('✅ Actions config updated');
    }
    
    console.log('💾 Appel writeConfig...');
    if (writeConfig(config)) {
      console.log('✅ writeConfig réussi');
      res.json({ success: true });
    } else {
      console.error('❌ writeConfig échoué');
      res.status(500).json({ error: 'Failed to save config' });
    }
  } catch (err) {
    console.error('Error updating actions:', err);
    res.status(500).json({ error: 'Internal server error', message: err.message });
  }
});

// Update tickets configuration
app.post('/api/tickets', (req, res) => {
  try {
    console.log('📥 POST /api/tickets - Reçu:', Object.keys(req.body));
    const config = readConfig();
    console.log('📖 Config lue, guilds:', Object.keys(config.guilds || {}));
    if (!config.guilds[GUILD]) config.guilds[GUILD] = {};
    if (!config.guilds[GUILD].tickets) config.guilds[GUILD].tickets = {};
    
    // Update categories if provided
    if (req.body.categories !== undefined) {
      console.log('🔄 Mise à jour categories, nombre:', req.body.categories.length);
      console.log('🔍 Première catégorie showCertified:', req.body.categories[0]?.showCertified);
      config.guilds[GUILD].tickets.categories = req.body.categories;
      console.log('✅ Tickets categories updated');
    }
    
    // Update panel if provided
    if (req.body.panel !== undefined) {
      config.guilds[GUILD].tickets.panel = req.body.panel;
      console.log('✅ Tickets panel updated');
    }
    
    // Update config if provided
    if (req.body.config !== undefined) {
      config.guilds[GUILD].tickets.config = req.body.config;
      console.log('✅ Tickets config updated');
    }
    
    // Update other ticket settings if provided
    if (req.body.settings) {
      config.guilds[GUILD].tickets = {
        ...config.guilds[GUILD].tickets,
        ...req.body.settings
      };
      console.log('✅ Tickets settings updated');
    }
    
    console.log('💾 Appel writeConfig...');
    if (writeConfig(config)) {
      console.log('✅ writeConfig réussi');
      res.json({ success: true });
    } else {
      console.error('❌ writeConfig échoué');
      res.status(500).json({ error: 'Failed to save config' });
    }
  } catch (err) {
    console.error('Error updating tickets:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Reload bot config (arrête bot pendant sauvegarde, puis redémarre)
app.post('/api/bot/prepare-save', (req, res) => {
  const { exec } = require('child_process');
  console.log('🛑 Arrêt du bot pour sauvegarde config...');
  exec('pm2 stop bagbot', (err, stdout, stderr) => {
    if (err) {
      console.error('❌ Erreur arrêt bot:', err);
      return res.status(500).json({ error: 'Échec arrêt' });
    }
    console.log('✅ Bot arrêté, prêt pour sauvegarde');
    res.json({ success: true });
  });
});

app.post('/api/bot/finish-save', (req, res) => {
  const { exec } = require('child_process');
  console.log('▶️ Redémarrage du bot avec nouvelle config...');
  exec('pm2 restart bagbot', (err, stdout, stderr) => {
    if (err) {
      console.error('❌ Erreur redémarrage bot:', err);
      return res.status(500).json({ error: 'Échec redémarrage' });
    }
    console.log('✅ Bot redémarré avec config à jour');
    res.json({ success: true });
  });
});

// Update confess configuration
app.post('/api/confess', (req, res) => {
  try {
    const config = readConfig();
    if (!config.guilds[GUILD]) config.guilds[GUILD] = {};
    if (!config.guilds[GUILD].confess) config.guilds[GUILD].confess = {};
    
    // Update confess settings
    if (req.body.settings) {
      config.guilds[GUILD].confess = {
        ...config.guilds[GUILD].confess,
        ...req.body.settings
      };
    }
    
    console.log('💾 Appel writeConfig...');
    if (writeConfig(config)) {
      console.log('✅ writeConfig réussi');
      res.json({ success: true });
    } else {
      console.error('❌ writeConfig échoué');
      res.status(500).json({ error: 'Failed to save config' });
    }
  } catch (err) {
    console.error('Error updating confess:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Load welcome/goodbye routes
require('./welcome-routes')(app, readConfig, writeConfig, GUILD);

// ========== API MUSIQUE ==========

// GET /api/music - Récupérer les playlists et uploads
// POST /api/music/playlist - Créer/modifier une playlist
app.post('/api/music/playlist', (req, res) => {
  try {
    const { guildId, name, tracks } = req.body;
    const playlistsPath = path.join(__dirname, '../data/playlists');
    
    if (!fs.existsSync(playlistsPath)) {
      fs.mkdirSync(playlistsPath, { recursive: true });
    }
    
    const playlist = {
      name,
      guildId,
      tracks: tracks || [],
      createdAt: Date.now(),
      updatedAt: Date.now()
    };
    
    const filename = `${guildId}-${name.replace(/[^a-z0-9]/gi, '_')}.json`;
    fs.writeFileSync(path.join(playlistsPath, filename), JSON.stringify(playlist, null, 2));
    
    res.json({ ok: true, filename });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/music/upload - Upload un fichier audio

// DELETE /api/music/playlist/:guildId/:name
app.delete('/api/music/playlist/:guildId/:name', (req, res) => {
  try {
    const { guildId, name } = req.params;
    const playlistsPath = path.join(__dirname, '../data/playlists');
    const filename = `${guildId}-${name.replace(/[^a-z0-9]/gi, '_')}.json`;
    const filepath = path.join(playlistsPath, filename);
    
    if (fs.existsSync(filepath)) {
      fs.unlinkSync(filepath);
      res.json({ ok: true });
    } else {
      res.status(404).json({ error: 'Playlist non trouvée' });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});



// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ========== CONFIGURATION MULTER POUR UPLOADS ==========

app.get('/api/music', (req, res) => {
  try {
    const playlistsPath = path.join(__dirname, '../data/playlists');
    const uploadsPath = path.join(__dirname, '../data/uploads');
    
    const playlists = [];
    if (fs.existsSync(playlistsPath)) {
      fs.readdirSync(playlistsPath).forEach(file => {
        if (file.endsWith('.json')) {
          try {
            const data = JSON.parse(fs.readFileSync(path.join(playlistsPath, file), 'utf8'));
            playlists.push({
              name: data.name,
              guildId: data.guildId,
              trackCount: (data.tracks || []).length,
              updatedAt: data.updatedAt || Date.now()
            });
          } catch (e) {
            console.error(`Erreur lecture playlist ${file}:`, e);
          }
        }
      });
    }
    
    const uploads = [];
    let totalSize = 0;
    if (fs.existsSync(uploadsPath)) {
      fs.readdirSync(uploadsPath).forEach(file => {
        try {
          const stats = fs.statSync(path.join(uploadsPath, file));
          uploads.push({
            filename: file,
            size: stats.size,
            uploadedAt: stats.mtimeMs
          });
          totalSize += stats.size;
        } catch (e) {
          console.error(`Erreur stats ${file}:`, e);
        }
      });
    }
    
    res.json({ playlists, uploads, totalSize });
  } catch (error) {
    console.error('Erreur API /api/music:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/music/playlist/:guildId/:name - Détail d'une playlist
app.get('/api/music/playlist/:guildId/:name', (req, res) => {
  try {
    const { guildId, name } = req.params;
    const playlistsPath = path.join(__dirname, '../data/playlists');
    
    if (!fs.existsSync(playlistsPath)) {
      return res.status(404).json({ error: 'Aucune playlist' });
    }
    
    const files = fs.readdirSync(playlistsPath);
    const playlistFile = files.find(f => {
      try {
        const data = JSON.parse(fs.readFileSync(path.join(playlistsPath, f), 'utf8'));
        return data.guildId === guildId && data.name === name;
      } catch (e) {
        return false;
      }
    });
    
    if (playlistFile) {
      const data = JSON.parse(fs.readFileSync(path.join(playlistsPath, playlistFile), 'utf8'));
      res.json(data);
    } else {
      res.status(404).json({ error: 'Playlist non trouvée' });
    }
  } catch (error) {
    console.error('Erreur détail playlist:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/music/upload - Upload fichier audio
app.post('/api/music/upload', upload.single('audio'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Aucun fichier' });
    }
    console.log('Fichier uploadé:', req.file.filename);
    res.json({ ok: true, filename: req.file.filename });
  } catch (error) {
    console.error('Erreur upload:', error);
    res.status(500).json({ error: error.message });
  }
});

// DELETE /api/music/upload/:filename - Supprimer un fichier uploadé
app.delete('/api/music/upload/:filename', (req, res) => {
  try {
    const { filename } = req.params;
    const uploadsPath = path.join(__dirname, '../data/uploads');
    const filepath = path.join(uploadsPath, filename);
    
    if (fs.existsSync(filepath)) {
      fs.unlinkSync(filepath);
      console.log('Fichier supprimé:', filename);
      res.json({ success: true });
    } else {
      res.status(404).json({ error: 'Fichier non trouvé' });
    }
  } catch (error) {
    console.error('Erreur suppression fichier:', error);
    res.status(500).json({ error: error.message });
  }
});

// PUT /api/music/playlist/:guildId/:name - Renommer une playlist
app.put('/api/music/playlist/:guildId/:name', (req, res) => {
  try {
    const { guildId, name } = req.params;
    const { newName } = req.body;
    
    if (!newName || newName.trim() === '') {
      return res.status(400).json({ error: 'Nouveau nom requis' });
    }
    
    const playlistsPath = path.join(__dirname, '../data/playlists');
    const files = fs.readdirSync(playlistsPath);
    
    const playlistFile = files.find(f => {
      try {
        const data = JSON.parse(fs.readFileSync(path.join(playlistsPath, f), 'utf8'));
        return data.guildId === guildId && data.name === name;
      } catch (e) {
        return false;
      }
    });
    
    if (playlistFile) {
      const filepath = path.join(playlistsPath, playlistFile);
      const data = JSON.parse(fs.readFileSync(filepath, 'utf8'));
      
      // Vérifier qu'aucune autre playlist n'a ce nom
      const nameExists = files.some(f => {
        if (f === playlistFile) return false;
        try {
          const otherData = JSON.parse(fs.readFileSync(path.join(playlistsPath, f), 'utf8'));
          return otherData.guildId === guildId && otherData.name === newName.trim();
        } catch (e) {
          return false;
        }
      });
      
      if (nameExists) {
        return res.status(400).json({ error: 'Une playlist avec ce nom existe déjà' });
      }
      
      data.name = newName.trim();
      data.updatedAt = Date.now();
      
      const newFilename = `${guildId}-${newName.trim().replace(/[^a-zA-Z0-9-_]/g, '_')}.json`;
      const newFilepath = path.join(playlistsPath, newFilename);
      
      fs.writeFileSync(newFilepath, JSON.stringify(data, null, 2));
      if (filepath !== newFilepath) {
        fs.unlinkSync(filepath);
      }
      
      console.log(`Playlist renommée: ${name} -> ${newName}`);
      res.json({ success: true, playlist: data });
    } else {
      res.status(404).json({ error: 'Playlist non trouvée' });
    }
  } catch (error) {
    console.error('Erreur renommage playlist:', error);
    res.status(500).json({ error: error.message });
  }
});

// DELETE /api/music/playlist/:guildId/:name - Supprimer une playlist
app.delete('/api/music/playlist/:guildId/:name', (req, res) => {
  try {
    const { guildId, name } = req.params;
    const playlistsPath = path.join(__dirname, '../data/playlists');
    
    const files = fs.readdirSync(playlistsPath);
    const playlistFile = files.find(f => {
      try {
        const data = JSON.parse(fs.readFileSync(path.join(playlistsPath, f), 'utf8'));
        return data.guildId === guildId && data.name === name;
      } catch (e) {
        return false;
      }
    });
    
    if (playlistFile) {
      fs.unlinkSync(path.join(playlistsPath, playlistFile));
      console.log('Playlist supprimée:', name);
      res.json({ success: true });
    } else {
      res.status(404).json({ error: 'Playlist non trouvée' });
    }
  } catch (error) {
    console.error('Erreur suppression playlist:', error);
    res.status(500).json({ error: error.message });
  }
});

// DELETE /api/music/playlist/:guildId/:name/track/:index - Supprimer une piste
app.delete('/api/music/playlist/:guildId/:name/track/:index', (req, res) => {
  try {
    const { guildId, name, index } = req.params;
    const playlistsPath = path.join(__dirname, '../data/playlists');
    
    const files = fs.readdirSync(playlistsPath);
    const playlistFile = files.find(f => {
      try {
        const data = JSON.parse(fs.readFileSync(path.join(playlistsPath, f), 'utf8'));
        return data.guildId === guildId && data.name === name;
      } catch (e) {
        return false;
      }
    });
    
    if (playlistFile) {
      const filepath = path.join(playlistsPath, playlistFile);
      const data = JSON.parse(fs.readFileSync(filepath, 'utf8'));
      
      const trackIndex = parseInt(index);
      if (trackIndex >= 0 && trackIndex < data.tracks.length) {
        const removedTrack = data.tracks.splice(trackIndex, 1)[0];
        data.updatedAt = Date.now();
        
        fs.writeFileSync(filepath, JSON.stringify(data, null, 2));
        console.log(`Piste supprimée: ${removedTrack.title}`);
        res.json({ success: true });
      } else {
        res.status(404).json({ error: 'Piste non trouvée' });
      }
    } else {
      res.status(404).json({ error: 'Playlist non trouvée' });
    }
  } catch (error) {
    console.error('Erreur suppression piste:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/music/add-link - Télécharger et ajouter un lien YouTube/Spotify à une playlist
app.post('/api/music/add-link', async (req, res) => {
  try {
    const { link, playlistName, guildId } = req.body;
    
    if (!link || !playlistName || !guildId) {
      return res.status(400).json({ error: 'Paramètres manquants' });
    }
    
    console.log(`[Music Dashboard] Téléchargement ${link} pour playlist ${playlistName}`);
    
    const { spawn } = require('child_process');
    const uploadsPath = path.join(__dirname, '../data/uploads');
    
    // Créer le dossier uploads si nécessaire
    if (!fs.existsSync(uploadsPath)) {
      fs.mkdirSync(uploadsPath, { recursive: true });
    }
    
    // Générer un nom de fichier unique
    const timestamp = Date.now();
    const outputTemplate = path.join(uploadsPath, `${timestamp}-%(title)s.%(ext)s`);
    
    // Télécharger avec yt-dlp
    const ytdlpPath = '/home/bagbot/yt-dlp';
    const ytdlpArgs = [
      '--extract-audio',
      '--audio-format', 'mp3',
      '--audio-quality', '192k',
      '--output', outputTemplate,
      '--no-playlist',
      '--socket-timeout', '30',
      '--retries', '3',
      link
    ];
    
    const ytdlp = spawn(ytdlpPath, ytdlpArgs);
    let outputFile = null;
    let videoTitle = null;
    
    ytdlp.stdout.on('data', (data) => {
      const str = data.toString();
      console.log(`[yt-dlp] ${str}`);
      
      // Extraire le titre
      const titleMatch = str.match(/\[download\] Destination: (.+)/);
      if (titleMatch) {
        outputFile = path.basename(titleMatch[1].replace('.webm', '.mp3').replace('.m4a', '.mp3'));
      }
    });
    
    ytdlp.stderr.on('data', (data) => {
      console.error(`[yt-dlp stderr] ${data}`);
    });
    
    ytdlp.on('close', async (code) => {
      if (code === 0 && outputFile) {
        try {
          // Trouver le fichier téléchargé
          const files = fs.readdirSync(uploadsPath);
          const downloadedFile = files.find(f => f.startsWith(timestamp.toString()));
          
          if (!downloadedFile) {
            return res.status(500).json({ error: 'Fichier non trouvé après téléchargement' });
          }
          
          // Extraire le titre du nom de fichier
          videoTitle = downloadedFile.replace(/^\d+-/, '').replace(/\.(mp3|webm|m4a)$/, '');
          
          // Ajouter à la playlist
          const playlistsPath = path.join(__dirname, '../data/playlists');
          if (!fs.existsSync(playlistsPath)) {
            fs.mkdirSync(playlistsPath, { recursive: true });
          }
          
          // Chercher ou créer la playlist
          const playlistFiles = fs.readdirSync(playlistsPath);
          let playlistFile = playlistFiles.find(f => {
            try {
              const data = JSON.parse(fs.readFileSync(path.join(playlistsPath, f), 'utf8'));
              return data.guildId === guildId && data.name === playlistName;
            } catch (e) {
              return false;
            }
          });
          
          let playlist;
          if (playlistFile) {
            // Playlist existe
            playlist = JSON.parse(fs.readFileSync(path.join(playlistsPath, playlistFile), 'utf8'));
          } else {
            // Créer nouvelle playlist
            const safeFilename = playlistName.replace(/[^a-zA-Z0-9_-]/g, '_').toLowerCase();
            playlistFile = `${guildId}_${safeFilename}_${Date.now()}.json`;
            playlist = {
              name: playlistName,
              guildId: guildId,
              tracks: [],
              createdAt: Date.now(),
              updatedAt: Date.now()
            };
          }
          
          // Ajouter la piste
          playlist.tracks.push({
            title: videoTitle,
            source: 'upload',
            filename: downloadedFile,
            url: link,
            addedAt: Date.now()
          });
          playlist.updatedAt = Date.now();
          
          // Sauvegarder
          fs.writeFileSync(path.join(playlistsPath, playlistFile), JSON.stringify(playlist, null, 2));
          
          console.log(`[Music Dashboard] Fichier ${downloadedFile} ajouté à ${playlistName}`);
          res.json({ success: true, title: videoTitle, filename: downloadedFile });
          
        } catch (error) {
          console.error('[Music Dashboard] Erreur post-téléchargement:', error);
          res.status(500).json({ error: error.message });
        }
      } else {
        console.error(`[yt-dlp] Échec du téléchargement, code: ${code}`);
        res.status(500).json({ error: 'Échec du téléchargement' });
      }
    });
    
  } catch (error) {
    console.error('[Music Dashboard] Erreur add-link:', error);
    res.status(500).json({ error: error.message });
  }
});


// POST /api/music/playlist/create - Créer une nouvelle playlist
app.post('/api/music/playlist/create', (req, res) => {
  try {
    const { guildId, name } = req.body;
    
    if (!name || name.trim() === '') {
      return res.status(400).json({ error: 'Nom de playlist requis' });
    }
    
    const playlistsPath = path.join(__dirname, '../data/playlists');
    if (!fs.existsSync(playlistsPath)) {
      fs.mkdirSync(playlistsPath, { recursive: true });
    }
    
    // Vérifier qu'aucune playlist n'a ce nom
    const files = fs.readdirSync(playlistsPath);
    const nameExists = files.some(f => {
      try {
        const data = JSON.parse(fs.readFileSync(path.join(playlistsPath, f), 'utf8'));
        return data.guildId === guildId && data.name === name.trim();
      } catch (e) {
        return false;
      }
    });
    
    if (nameExists) {
      return res.status(400).json({ error: 'Une playlist avec ce nom existe déjà' });
    }
    
    const playlist = {
      name: name.trim(),
      guildId: guildId,
      tracks: [],
      createdAt: Date.now(),
      updatedAt: Date.now()
    };
    
    const filename = `${guildId}-${name.trim().replace(/[^a-zA-Z0-9-_]/g, '_')}.json`;
    const filepath = path.join(playlistsPath, filename);
    
    fs.writeFileSync(filepath, JSON.stringify(playlist, null, 2));
    console.log(`✅ Nouvelle playlist créée: ${name}`);
    res.json({ success: true, playlist });
  } catch (error) {
    console.error('Erreur création playlist:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/music/playlist/:guildId/:name/add - Ajouter une piste à une playlist
app.post('/api/music/playlist/:guildId/:name/add', (req, res) => {
  try {
    const { guildId, name } = req.params;
    const { filename, title, author, duration } = req.body;
    
    if (!filename) {
      return res.status(400).json({ error: 'Nom de fichier requis' });
    }
    
    const playlistsPath = path.join(__dirname, '../data/playlists');
    const files = fs.readdirSync(playlistsPath);
    
    const playlistFile = files.find(f => {
      try {
        const data = JSON.parse(fs.readFileSync(path.join(playlistsPath, f), 'utf8'));
        return data.guildId === guildId && data.name === name;
      } catch (e) {
        return false;
      }
    });
    
    if (playlistFile) {
      const filepath = path.join(playlistsPath, playlistFile);
      const data = JSON.parse(fs.readFileSync(filepath, 'utf8'));
      
      // Créer la piste avec les métadonnées
      const track = {
        title: title || filename.replace(/^\d+-/, '').replace(/\.[^.]+$/, ''),
        author: author || 'Artiste inconnu',
        filename: filename,
        duration: duration || '0:00',
        addedAt: Date.now()
      };
      
      data.tracks.push(track);
      data.updatedAt = Date.now();
      
      fs.writeFileSync(filepath, JSON.stringify(data, null, 2));
      console.log(`✅ Piste ajoutée à ${name}: ${track.title}`);
      res.json({ success: true, playlist: data });
    } else {
      res.status(404).json({ error: 'Playlist non trouvée' });
    }
  } catch (error) {
    console.error('Erreur ajout piste:', error);
    res.status(500).json({ error: error.message });
  }
});


// Charger le router add-link
require("./add-link-router")(app);



// ============ A/V (Action/Vérité) API Routes ============

// Get A/V prompts for a mode (sfw or nsfw)
app.get('/api/truthdare/:mode', (req, res) => {
  try {
    const { mode } = req.params;
    if (!['sfw', 'nsfw'].includes(mode)) {
      return res.status(400).json({ error: 'Mode must be sfw or nsfw' });
    }
    const config = readConfig();
    const guildConfig = config.guilds[GUILD] || {};
    const tdData = guildConfig.truthdare || { sfw: { prompts: [], channels: [] }, nsfw: { prompts: [], channels: [] } };
    res.json(tdData[mode] || { prompts: [], channels: [] });
  } catch (err) {
    console.error('Error in GET /api/truthdare/:mode:', err);
    res.status(500).json({ error: 'Failed to fetch truth/dare data' });
  }
});

// Add a new prompt
app.post('/api/truthdare/:mode', (req, res) => {
  try {
    const { mode } = req.params;
    const { type, text } = req.body;
    if (!['sfw', 'nsfw'].includes(mode)) {
      return res.status(400).json({ error: 'Mode must be sfw or nsfw' });
    }
    if (!type || !text) {
      return res.status(400).json({ error: 'Type and text are required' });
    }
    const config = readConfig();
    const guildConfig = config.guilds[GUILD] || {};
    if (!guildConfig.truthdare) {
      guildConfig.truthdare = { sfw: { prompts: [], channels: [] }, nsfw: { prompts: [], channels: [] } };
    }
    if (!guildConfig.truthdare[mode]) {
      guildConfig.truthdare[mode] = { prompts: [], channels: [] };
    }
    if (!guildConfig.truthdare[mode].prompts) {
      guildConfig.truthdare[mode].prompts = [];
    }
    const newId = Math.max(0, ...guildConfig.truthdare[mode].prompts.map(p => p.id || 0)) + 1;
    const newPrompt = { id: newId, type, text };
    guildConfig.truthdare[mode].prompts.push(newPrompt);
    config.guilds[GUILD] = guildConfig;
    writeConfig(config);
    console.log(`✅ Prompt A/V ${mode} ajouté: #${newId} (${type})`);
    res.json({ success: true, prompt: newPrompt });
  } catch (err) {
    console.error('Error in POST /api/truthdare/:mode:', err);
    res.status(500).json({ error: 'Failed to add prompt' });
  }
});

// Edit a prompt
app.patch('/api/truthdare/:mode/:id', (req, res) => {
  try {
    const { mode, id } = req.params;
    const { text } = req.body;
    if (!['sfw', 'nsfw'].includes(mode)) {
      return res.status(400).json({ error: 'Mode must be sfw or nsfw' });
    }
    if (!text) {
      return res.status(400).json({ error: 'Text is required' });
    }
    const config = readConfig();
    const guildConfig = config.guilds[GUILD] || {};
    if (!guildConfig.truthdare || !guildConfig.truthdare[mode] || !guildConfig.truthdare[mode].prompts) {
      return res.status(404).json({ error: 'No prompts found' });
    }
    const promptId = parseInt(id);
    const prompt = guildConfig.truthdare[mode].prompts.find(p => p.id === promptId);
    if (!prompt) {
      return res.status(404).json({ error: 'Prompt not found' });
    }
    prompt.text = text;
    config.guilds[GUILD] = guildConfig;
    writeConfig(config);
    console.log(`✅ Prompt A/V ${mode} modifié: #${promptId}`);
    res.json({ success: true, prompt });
  } catch (err) {
    console.error('Error in PATCH /api/truthdare/:mode/:id:', err);
    res.status(500).json({ error: 'Failed to edit prompt' });
  }
});

// Delete a prompt
app.delete('/api/truthdare/:mode/:id', (req, res) => {
  try {
    const { mode, id } = req.params;
    if (!['sfw', 'nsfw'].includes(mode)) {
      return res.status(400).json({ error: 'Mode must be sfw or nsfw' });
    }
    const config = readConfig();
    const guildConfig = config.guilds[GUILD] || {};
    if (!guildConfig.truthdare || !guildConfig.truthdare[mode] || !guildConfig.truthdare[mode].prompts) {
      return res.status(404).json({ error: 'No prompts found' });
    }
    const promptId = parseInt(id);
    const index = guildConfig.truthdare[mode].prompts.findIndex(p => p.id === promptId);
    if (index === -1) {
      return res.status(404).json({ error: 'Prompt not found' });
    }
    guildConfig.truthdare[mode].prompts.splice(index, 1);
    config.guilds[GUILD] = guildConfig;
    writeConfig(config);
    console.log(`✅ Prompt A/V ${mode} supprimé: #${promptId}`);
    res.json({ success: true });
  } catch (err) {
    console.error('Error in DELETE /api/truthdare/:mode/:id:', err);
    res.status(500).json({ error: 'Failed to delete prompt' });
  }
});

// Add a channel
app.post('/api/truthdare/:mode/channels', (req, res) => {
  try {
    const { mode } = req.params;
    const { channelId } = req.body;
    if (!['sfw', 'nsfw'].includes(mode)) {
      return res.status(400).json({ error: 'Mode must be sfw or nsfw' });
    }
    if (!channelId) {
      return res.status(400).json({ error: 'channelId is required' });
    }
    const config = readConfig();
    const guildConfig = config.guilds[GUILD] || {};
    if (!guildConfig.truthdare) {
      guildConfig.truthdare = { sfw: { prompts: [], channels: [] }, nsfw: { prompts: [], channels: [] } };
    }
    if (!guildConfig.truthdare[mode]) {
      guildConfig.truthdare[mode] = { prompts: [], channels: [] };
    }
    if (!guildConfig.truthdare[mode].channels) {
      guildConfig.truthdare[mode].channels = [];
    }
    if (!guildConfig.truthdare[mode].channels.includes(channelId)) {
      guildConfig.truthdare[mode].channels.push(channelId);
    }
    config.guilds[GUILD] = guildConfig;
    writeConfig(config);
    console.log(`✅ Channel A/V ${mode} ajouté: ${channelId}`);
    res.json({ success: true });
  } catch (err) {
    console.error('Error in POST /api/truthdare/:mode/channels:', err);
    res.status(500).json({ error: 'Failed to add channel' });
  }
});

// Delete a channel
app.delete('/api/truthdare/:mode/channels/:channelId', (req, res) => {
  try {
    const { mode, channelId } = req.params;
    if (!['sfw', 'nsfw'].includes(mode)) {
      return res.status(400).json({ error: 'Mode must be sfw or nsfw' });
    }
    const config = readConfig();
    const guildConfig = config.guilds[GUILD] || {};
    if (!guildConfig.truthdare || !guildConfig.truthdare[mode] || !guildConfig.truthdare[mode].channels) {
      return res.status(404).json({ error: 'No channels found' });
    }
    const index = guildConfig.truthdare[mode].channels.indexOf(channelId);
    if (index === -1) {
      return res.status(404).json({ error: 'Channel not found' });
    }
    guildConfig.truthdare[mode].channels.splice(index, 1);
    config.guilds[GUILD] = guildConfig;
    writeConfig(config);
    console.log(`✅ Channel A/V ${mode} supprimé: ${channelId}`);
    res.json({ success: true });
  } catch (err) {
    console.error('Error in DELETE /api/truthdare/:mode/channels/:channelId:', err);
    res.status(500).json({ error: 'Failed to delete channel' });
  }
});

// ============ Counting API Routes ============

// Get counting configuration
app.get('/api/counting', (req, res) => {
  try {
    const config = readConfig();
    const guildConfig = config.guilds[GUILD] || {};
    const counting = guildConfig.counting || { allowFormulas: false, state: {}, achievedNumbers: [] };
    res.json(counting);
  } catch (err) {
    console.error('Error in GET /api/counting:', err);
    res.status(500).json({ error: 'Failed to fetch counting config' });
  }
});

// Update counting configuration
app.post('/api/counting', (req, res) => {
  try {
    const { allowFormulas, channels } = req.body;
    const config = readConfig();
    const guildConfig = config.guilds[GUILD] || {};
    
    if (!guildConfig.counting) {
      guildConfig.counting = { allowFormulas: false, state: {}, achievedNumbers: [], channels: [] };
    }
    
    if (allowFormulas !== undefined) {
      guildConfig.counting.allowFormulas = allowFormulas;
    }
    if (channels !== undefined) {
      guildConfig.counting.channels = channels;
    }
    
    config.guilds[GUILD] = guildConfig;
    writeConfig(config);
    
    console.log(`✅ Counting config updated: allowFormulas=${allowFormulas}`);
    res.json({ success: true });
  } catch (err) {
    console.error('Error in POST /api/counting:', err);
    res.status(500).json({ error: 'Failed to update counting config' });
  }
});

// Add counting channel
app.post('/api/counting/channels', (req, res) => {
  try {
    const { channelId } = req.body;
    if (!channelId) {
      return res.status(400).json({ error: 'channelId is required' });
    }
    
    const config = readConfig();
    const guildConfig = config.guilds[GUILD] || {};
    
    if (!guildConfig.counting) {
      guildConfig.counting = { allowFormulas: false, state: {}, achievedNumbers: [], channels: [] };
    }
    if (!guildConfig.counting.channels) {
      guildConfig.counting.channels = [];
    }
    
    if (!guildConfig.counting.channels.includes(channelId)) {
      guildConfig.counting.channels.push(channelId);
    }
    
    config.guilds[GUILD] = guildConfig;
    writeConfig(config);
    
    console.log(`✅ Counting channel ajouté: ${channelId}`);
    res.json({ success: true });
  } catch (err) {
    console.error('Error in POST /api/counting/channels:', err);
    res.status(500).json({ error: 'Failed to add channel' });
  }
});

// Delete counting channel
app.delete('/api/counting/channels/:channelId', (req, res) => {
  try {
    const { channelId } = req.params;
    const config = readConfig();
    const guildConfig = config.guilds[GUILD] || {};
    
    if (!guildConfig.counting || !guildConfig.counting.channels) {
      return res.status(404).json({ error: 'No channels found' });
    }
    
    const index = guildConfig.counting.channels.indexOf(channelId);
    if (index === -1) {
      return res.status(404).json({ error: 'Channel not found' });
    }
    
    guildConfig.counting.channels.splice(index, 1);
    config.guilds[GUILD] = guildConfig;
    writeConfig(config);
    
    console.log(`✅ Counting channel supprimé: ${channelId}`);
    res.json({ success: true });
  } catch (err) {
    console.error('Error in DELETE /api/counting/channels/:channelId:', err);
    res.status(500).json({ error: 'Failed to delete channel' });
  }
});

// ============ Welcome API Routes ============

// Get welcome configuration
app.get('/api/welcome', (req, res) => {
  try {
    const config = readConfig();
    const guildConfig = config.guilds[GUILD] || {};
    const welcome = guildConfig.welcome || {
      enabled: false,
      channelId: '',
      message: '',
      embedEnabled: false,
      embedTitle: '',
      embedDescription: '',
      embedColor: '',
      embedFooter: '',
      sendEmbedInDM: false
    };
    res.json(welcome);
  } catch (err) {
    console.error('Error in GET /api/welcome:', err);
    res.status(500).json({ error: 'Failed to fetch welcome config' });
  }
});

// Update welcome configuration
app.post('/api/welcome', (req, res) => {
  try {
    const { welcome } = req.body;
    const config = readConfig();
    const guildConfig = config.guilds[GUILD] || {};
    
    guildConfig.welcome = welcome;
    config.guilds[GUILD] = guildConfig;
    writeConfig(config);
    
    console.log(`✅ Welcome config updated`);
    res.json({ success: true });
  } catch (err) {
    console.error('Error in POST /api/welcome:', err);
    res.status(500).json({ error: 'Failed to update welcome config' });
  }
});

// ============ Goodbye API Routes ============

// Get goodbye configuration
app.get('/api/goodbye', (req, res) => {
  try {
    const config = readConfig();
    const guildConfig = config.guilds[GUILD] || {};
    const goodbye = guildConfig.goodbye || {
      enabled: false,
      channelId: '',
      message: '',
      embedEnabled: false,
      embedTitle: '',
      embedDescription: '',
      embedColor: '',
      embedFooter: ''
    };
    res.json(goodbye);
  } catch (err) {
    console.error('Error in GET /api/goodbye:', err);
    res.status(500).json({ error: 'Failed to fetch goodbye config' });
  }
});

// Update goodbye configuration
app.post('/api/goodbye', (req, res) => {
  try {
    const { goodbye } = req.body;
    const config = readConfig();
    const guildConfig = config.guilds[GUILD] || {};
    
    guildConfig.goodbye = goodbye;
    config.guilds[GUILD] = guildConfig;
    writeConfig(config);
    
    console.log(`✅ Goodbye config updated`);
    res.json({ success: true });
  } catch (err) {
    console.error('Error in POST /api/goodbye:', err);
    res.status(500).json({ error: 'Failed to update goodbye config' });
  }
});

// ============ Page Routes ============

// Route pour la page principale
// Routes déplacées en haut du fichier pour éviter le cache


app.get("/api/proxy-image", async (req, res) => {
  try {
    const url = req.query.url;
    if (!url) return res.status(400).send("URL manquante");
    
    const https = require("https");
    const http = require("http");
    const urlObj = new URL(url);
    const protocol = urlObj.protocol === "https:" ? https : http;
    
    protocol.get(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        "Accept": "image/*"
      }
    }, (response) => {
      if (response.statusCode >= 300 && response.statusCode < 400 && response.headers.location) {
        return res.redirect(response.headers.location);
      }
      res.set("Content-Type", response.headers["content-type"] || "image/gif");
      res.set("Cache-Control", "public, max-age=86400");
      res.set("Access-Control-Allow-Origin", "*");
      response.pipe(res);
    }).on("error", (err) => {
      console.error("Erreur proxy:", err.message);
      res.status(500).send("Erreur chargement image");
    });
  } catch (error) {
    console.error("Erreur proxy-image:", error.message);
    res.status(500).send("Erreur serveur");
  }
});


// Route pour recevoir un GIF uploadé depuis le navigateur
app.post('/api/upload-gif-from-browser', async (req, res) => {
  try {
    if (!req.files || !req.files.gif) {
      return res.status(400).json({ error: 'No file uploaded' });
    }
    
    const gif = req.files.gif;
    const crypto = require('crypto');
    const hash = crypto.createHash('md5').update(Date.now().toString()).digest('hex').substring(0, 8);
    const filename = 'discord_' + hash + '.gif';
    const uploadPath = path.join(__dirname, 'public/gifs', filename);
    
    // Sauvegarder le fichier
    await gif.mv(uploadPath);
    
    const localUrl = 'http://82.67.65.98:3002/gifs/' + filename;
    console.log('✅ GIF uploadé depuis navigateur:', filename);
    
    res.json({ success: true, url: localUrl });
  } catch (error) {
    console.error('❌ Erreur upload navigateur:', error);
    res.status(500).json({ error: error.message });
  }
});


// ============================================
// ROUTES OAUTH POUR L'APPLICATION MOBILE
// ============================================

const crypto = require('crypto');

// Stockage des tokens en mémoire
const appTokens = new Map();

// Génération de token
function generateToken() {
  return crypto.randomBytes(32).toString('hex');
}

// Route de démarrage OAuth mobile
app.get('/auth/mobile/start', (req, res) => {
  const OAUTH_CLIENT_ID = process.env.DISCORD_OAUTH_CLIENT_ID || process.env.CLIENT_ID || '1414216173809307780';
  const REDIRECT_URI = encodeURIComponent('http://88.174.155.230:33002/auth/mobile/callback');
  const app_redirect = req.query.app_redirect || 'bagbot://auth';
  
  const state = generateToken().substring(0, 16);
  appTokens.set('state_' + state, { app_redirect, timestamp: Date.now() });
  
  const discordAuthUrl = `https://discord.com/api/oauth2/authorize?client_id=${OAUTH_CLIENT_ID}&redirect_uri=${REDIRECT_URI}&response_type=code&scope=identify&state=${state}`;
  
  console.log('🔐 Mobile auth started');
  res.redirect(discordAuthUrl);
});

// Callback OAuth Discord mobile
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
    const REDIRECT_URI = 'http://88.174.155.230:33002/auth/mobile/callback';
    
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
      
      const req = https.request(options, (response) => {
        let data = '';
        response.on('data', chunk => data += chunk);
        response.on('end', () => resolve(JSON.parse(data)));
      });
      req.on('error', reject);
      req.write(postData);
      req.end();
    });
    
    if (!tokenData.access_token) {
      throw new Error('No access token');
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
      
      const req = https.request(options, (response) => {
        let data = '';
        response.on('data', chunk => data += chunk);
        response.on('end', () => resolve(JSON.parse(data)));
      });
      req.on('error', reject);
      req.end();
    });
    
    // Générer token app
    const appToken = generateToken();
    appTokens.set('token_' + appToken, {
      userId: userData.id,
      username: userData.username,
      discriminator: userData.discriminator,
      avatar: userData.avatar,
      timestamp: Date.now()
    });
    
    console.log('✅ Mobile auth successful for', userData.username, '(' + userData.id + ')');
    
    const redirectUrl = `${app_redirect}?token=${appToken}`;
    
    res.send(`<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Connexion réussie</title>
  <style>
    body { 
      font-family: Arial, sans-serif; 
      display: flex; 
      align-items: center; 
      justify-content: center; 
      height: 100vh; 
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      margin: 0;
    }
    .container { text-align: center; }
    h1 { font-size: 2em; margin-bottom: 20px; }
    p { font-size: 1.2em; }
  </style>
</head>
<body>
  <div class="container">
    <h1>✅ Connexion réussie !</h1>
    <p>Redirection vers l'application...</p>
  </div>
  <script>
    setTimeout(() => {
      window.location.href = '${redirectUrl}';
    }, 1000);
  </script>
</body>
</html>`);
  } catch (error) {
    console.error('❌ OAuth error:', error);
    res.status(500).send('Authentication failed: ' + error.message);
  }
});

// Route /api/me
app.get('/api/me', (req, res) => {
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
  
  res.json({
    userId: userData.userId,
    username: userData.username,
    discriminator: userData.discriminator,
    avatar: userData.avatar
  });
});


// ============================================
// ROUTES API ADMIN - GESTION DES ACCÈS
// ============================================

// Stockage des utilisateurs autorisés (en mémoire - à remplacer par DB si nécessaire)
const allowedUsers = new Set([FOUNDER_ID]); // Fondateur par défaut

// GET /api/admin/allowed-users - Récupérer la liste
app.get('/api/admin/allowed-users', (req, res) => {
  const authHeader = req.headers['authorization'];
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No token' });
  }
  
  const token = authHeader.substring(7);
  const userData = appTokens.get('token_' + token);
  
  if (!userData || userData.userId !== FOUNDER_ID) {
    return res.status(403).json({ error: 'Forbidden - Admin only' });
  }
  
  res.json({ allowedUsers: Array.from(allowedUsers) });
});

// POST /api/admin/allowed-users - Ajouter un utilisateur
app.post('/api/admin/allowed-users', express.json(), (req, res) => {
  const authHeader = req.headers['authorization'];
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No token' });
  }
  
  const token = authHeader.substring(7);
  const userData = appTokens.get('token_' + token);
  
  if (!userData || userData.userId !== FOUNDER_ID) {
    return res.status(403).json({ error: 'Forbidden - Admin only' });
  }
  
  const { userId } = req.body;
  if (!userId) {
    return res.status(400).json({ error: 'Missing userId' });
  }
  
  allowedUsers.add(userId);
  console.log('✅ User added to allowed list:', userId);
  res.json({ success: true, allowedUsers: Array.from(allowedUsers) });
});

// DELETE /api/admin/allowed-users/:userId - Retirer un utilisateur
app.delete('/api/admin/allowed-users/:userId', (req, res) => {
  const authHeader = req.headers['authorization'];
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No token' });
  }
  
  const token = authHeader.substring(7);
  const userData = appTokens.get('token_' + token);
  
  if (!userData || userData.userId !== FOUNDER_ID) {
    return res.status(403).json({ error: 'Forbidden - Admin only' });
  }
  
  const { userId } = req.params;
  
  if (userId === FOUNDER_ID) {
    return res.status(400).json({ error: 'Cannot remove founder' });
  }
  
  allowedUsers.delete(userId);
  console.log('✅ User removed from allowed list:', userId);
  res.json({ success: true, allowedUsers: Array.from(allowedUsers) });
});

// ============================================
// ROUTES API CONFIG - MISE À JOUR
// ============================================

// PUT /api/configs/:section - Mettre à jour une section
app.put('/api/configs/:section', express.json(), (req, res) => {
  const authHeader = req.headers['authorization'];
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No token' });
  }
  
  const token = authHeader.substring(7);
  const userData = appTokens.get('token_' + token);
  
  if (!userData) {
    return res.status(401).json({ error: 'Invalid token' });
  }
  
  const { section } = req.params;
  const updates = req.body;
  
  try {
    const fs = require('fs');
    const configPath = CONFIG || './data/guild-config.json';
    
    // Lire la config actuelle
    let config = {};
    if (fs.existsSync(configPath)) {
      config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    }
    
    // Mettre à jour la section
    if (!config[section]) {
      config[section] = {};
    }
    
    // Merger les updates
    config[section] = { ...config[section], ...updates };
    
    // Sauvegarder
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2), 'utf8');
    
    console.log(`✅ Config section '${section}' updated by ${userData.username}`);
    res.json({ success: true, section, config: config[section] });
  } catch (error) {
    console.error('❌ Config update error:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/music/uploads - Liste des fichiers musique uploadés
app.get('/api/music/uploads', (req, res) => {
  try {
    const uploadsDir = path.join(process.cwd(), 'data', 'uploads');
    
    if (!fs.existsSync(uploadsDir)) {
      return res.json({ files: [] });
    }
    
    const files = fs.readdirSync(uploadsDir).filter(file => {
      const ext = path.extname(file).toLowerCase();
      return ['.mp3', '.wav', '.m4a', '.ogg', '.flac'].includes(ext);
    });
    
    res.json({ files });
  } catch (error) {
    console.error('Error in /api/music/uploads:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/dashboard/stats - Statistiques complètes du serveur
app.get('/api/dashboard/stats', async (req, res) => {
  try {
    const guild = client.guilds.cache.get(GUILD);
    if (!guild) {
      return res.json({
        totalMembers: 0,
        totalHumans: 0,
        totalBots: 0,
        ecoUsers: 0,
        levelUsers: 0
      });
    }

    // Récupérer tous les membres si nécessaire
    await guild.members.fetch();
    
    const totalMembers = guild.memberCount;
    const totalBots = guild.members.cache.filter(m => m.user.bot).size;
    const totalHumans = totalMembers - totalBots;
    
    // Lire les données eco et levels
    let ecoUsers = 0;
    let levelUsers = 0;
    
    try {
      const economyPath = path.join(process.cwd(), 'data', 'economy.json');
      if (fs.existsSync(economyPath)) {
        const economyData = JSON.parse(fs.readFileSync(economyPath, 'utf8'));
        ecoUsers = Object.keys(economyData).length;
      }
    } catch (e) {
      console.error('Error reading economy data:', e);
    }
    
    try {
      const levelsPath = path.join(process.cwd(), 'data', 'levels.json');
      if (fs.existsSync(levelsPath)) {
        const levelsData = JSON.parse(fs.readFileSync(levelsPath, 'utf8'));
        levelUsers = Object.keys(levelsData).length;
      }
    } catch (e) {
      console.error('Error reading levels data:', e);
    }
    
    res.json({
      totalMembers,
      totalHumans,
      totalBots,
      ecoUsers,
      levelUsers
    });
  } catch (error) {
    console.error('Error in /api/dashboard/stats:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/admin/sessions - Liste des membres connectés avec leurs rôles
app.get('/api/admin/sessions', (req, res) => {
  // Authentification
  const auth = req.headers.authorization;
  if (!auth || !auth.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  
  const token = auth.slice(7);
  if (!activeSessions.has(token)) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
  
  const requestingUserId = activeSessions.get(token);
  
  // Vérifier que c'est le fondateur ou un admin
  if (requestingUserId !== FOUNDER_ID) {
    // Vérifier si c'est un admin
    const configs = readConfigs();
    const staffRoleIds = configs.staffRoleIds || [];
    
    const guild = client.guilds.cache.get(GUILD);
    if (guild) {
      const member = guild.members.cache.get(requestingUserId);
      const isAdmin = member && staffRoleIds.some(roleId => member.roles.cache.has(roleId));
      
      if (!isAdmin) {
        return res.status(403).json({ error: 'Forbidden - Admin only' });
      }
    } else {
      return res.status(403).json({ error: 'Forbidden - Admin only' });
    }
  }
  
  // Récupérer toutes les sessions actives
  const guild = client.guilds.cache.get(GUILD);
  const sessions = [];
  
  for (const [sessionToken, userId] of activeSessions) {
    const member = guild ? guild.members.cache.get(userId) : null;
    const username = member ? member.user.username : 'Inconnu';
    
    // Déterminer le rôle
    let role = 'Membre';
    if (userId === FOUNDER_ID) {
      role = 'Fondateur';
    } else if (member) {
      const configs = readConfigs();
      const staffRoleIds = configs.staffRoleIds || [];
      const isAdmin = staffRoleIds.some(roleId => member.roles.cache.has(roleId));
      if (isAdmin) {
        role = 'Admin';
      }
    }
    
    sessions.push({
      userId,
      username,
      role,
      lastSeen: new Date().toISOString() // Pour l'instant, toutes les sessions sont actives
    });
  }
  
  res.json({ sessions });
});

// GET /api/admin/logs/:service - Récupérer les logs d'un service (bot ou dashboard)
app.get('/api/admin/logs/:service', (req, res) => {
  const authHeader = req.headers['authorization'];
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No token' });
  }
  
  const token = authHeader.substring(7);
  const userData = appTokens.get('token_' + token);
  
  if (!userData || userData.userId !== FOUNDER_ID) {
    return res.status(403).json({ error: 'Forbidden - Admin only' });
  }
  
  try {
    const { service } = req.params;
    if (service !== 'bot' && service !== 'dashboard') {
      return res.status(400).json({ error: 'Invalid service (must be bot or dashboard)' });
    }
    
    const { exec } = require('child_process');
    const command = `pm2 logs ${service === 'bot' ? 'bagbot' : 'dashboard-v2'} --lines 100 --nostream`;
    
    exec(command, (error, stdout, stderr) => {
      if (error) {
        console.error(`Error getting logs for ${service}:`, error);
        return res.status(500).json({ error: 'Failed to get logs', details: stderr });
      }
      
      res.json({ 
        service,
        logs: stdout || stderr || 'No logs available'
      });
    });
  } catch (err) {
    console.error('Error in /api/admin/logs:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/admin/restart/:service - Redémarrer un service PM2
app.post('/api/admin/restart/:service', express.json(), (req, res) => {
  const authHeader = req.headers['authorization'];
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No token' });
  }
  
  const token = authHeader.substring(7);
  const userData = appTokens.get('token_' + token);
  
  if (!userData || userData.userId !== FOUNDER_ID) {
    return res.status(403).json({ error: 'Forbidden - Admin only' });
  }
  
  try {
    const { service } = req.params;
    if (service !== 'bot' && service !== 'dashboard') {
      return res.status(400).json({ error: 'Invalid service (must be bot or dashboard)' });
    }
    
    const { exec } = require('child_process');
    const pm2Name = service === 'bot' ? 'bagbot' : 'dashboard-v2';
    const command = `pm2 restart ${pm2Name}`;
    
    exec(command, (error, stdout, stderr) => {
      if (error) {
        console.error(`Error restarting ${service}:`, error);
        return res.status(500).json({ error: 'Failed to restart service', details: stderr });
      }
      
      console.log(`✅ Service ${service} restarted by ${userData.username}`);
      res.json({ 
        success: true,
        service,
        message: `Service ${service} restarted successfully`,
        output: stdout
      });
    });
  } catch (err) {
    console.error('Error in /api/admin/restart:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.listen(PORT, () => {
  console.log(`✓ Dashboard V2 Server running on port ${PORT}`);
  console.log(`✓ Guild ID: ${GUILD}`);
  console.log(`✓ Config file: ${CONFIG}`);
  console.log(`✓ Access: http://localhost:${PORT}`);
  console.log(`✓ Discord API integration enabled`);
});
