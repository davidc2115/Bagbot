const fs = require('fs');
const fsp = require('fs/promises');
const path = require('path');
require('dotenv').config();
let Pool;
try { ({ Pool } = require('pg')); } catch (_) { Pool = null; }
// Supporte plusieurs variables d'env pour la compat Heroku/Render/Fly
const { validateConfigBeforeWrite } = require('./configValidator');
const DATABASE_URL = process.env.DATABASE_URL
  || process.env.POSTGRES_URL
  || process.env.POSTGRESQL_URL
  || process.env.PG_CONNECTION_STRING
  || '';
const USE_PG = !!(DATABASE_URL && Pool);
let pgHealthy = true; // désactivé si une connexion échoue
let pgPool = null;
async function getPg() {
  if (!USE_PG || !pgHealthy) return null;
  if (!pgPool) pgPool = new Pool({ connectionString: DATABASE_URL, max: 5, connectionTimeoutMillis: 1500, idleTimeoutMillis: 10000 });
  return pgPool;
}

let DATA_DIR = process.env.DATA_DIR ? String(process.env.DATA_DIR) : path.join(process.cwd(), 'data');
let CONFIG_PATH = path.join(DATA_DIR, 'config.json');
function setDataDir(dir) {
  DATA_DIR = String(dir);
  CONFIG_PATH = path.join(DATA_DIR, 'config.json');
}

async function ensureStorageExists() {
  if (USE_PG && pgHealthy) {
    try {
      const pool = await getPg();
      const client = await pool.connect();
      try {
        await client.query('CREATE TABLE IF NOT EXISTS app_config (id INTEGER PRIMARY KEY, data JSONB NOT NULL, updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW())');
        const res = await client.query('SELECT 1 FROM app_config WHERE id = 1');
        if (res.rowCount === 0) {
          // Bootstrap from file if available
          let bootstrap = { guilds: {} };
          try {
            const raw = await fsp.readFile(CONFIG_PATH, 'utf8');
            const parsed = JSON.parse(raw);
            if (parsed && typeof parsed === 'object') bootstrap = parsed;
          } catch (_) { /* ignore, keep default */ }
          await client.query('INSERT INTO app_config (id, data) VALUES (1, $1)', [bootstrap]);
        }
        try { console.log('[storage] Mode: postgres (table app_config prête)'); } catch (_) {}
        return; // DB OK
      } finally {
        client.release();
      }
    } catch (e) {
      try { console.warn('[storage] Postgres unavailable, falling back to file storage:', e?.message || e); } catch (_) {}
      pgHealthy = false;
      // fall back to FS below
    }
  }
  // Resolve a writable data directory with robust fallbacks (Render, local, tmp)
  {
    const candidates = [
      DATA_DIR,
      '/opt/render/project/src/data',
      path.join(process.cwd(), 'data'),
      '/tmp/bag-data'
    ];
    let resolved = false;
    for (const dir of candidates) {
      try {
        await fsp.mkdir(dir, { recursive: true });
        await fsp.access(dir, fs.constants.W_OK);
        setDataDir(dir);
        resolved = true;
        break;
      } catch (_) { /* try next candidate */ }
    }
    if (!resolved) {
      // Last resort: attempt /tmp
      try { await fsp.mkdir('/tmp/bag-data', { recursive: true }); setDataDir('/tmp/bag-data'); } catch (_) {}
    }
  }
  try {
    await fsp.access(CONFIG_PATH, fs.constants.F_OK);
  } catch (_) {
    // NE JAMAIS créer de config vide - ERREUR si fichier manquant
    console.error("[storage] ERREUR CRITIQUE: config.json introuvable à", CONFIG_PATH);
    console.error("[storage] Restaurez depuis une sauvegarde avec: node restore-backup.js");
    throw new Error("config.json introuvable - Restauration requise");
  }
  try { console.log('[storage] Mode: fichier JSON ->', CONFIG_PATH); } catch (_) {}
}

async function readConfig() {
  await ensureStorageExists();
  if (USE_PG && pgHealthy) {
    try {
      const pool = await getPg();
      const client = await pool.connect();
      try {
        const { rows } = await client.query('SELECT data FROM app_config WHERE id = 1');
        const data = rows?.[0]?.data || { guilds: {} };
        if (!data || typeof data !== 'object') return { guilds: {} };
        if (!data.guilds || typeof data.guilds !== 'object') data.guilds = {};
        return data;
      } finally {
        client.release();
      }
    } catch (e) {
      try { console.warn('[storage] Postgres read failed, using file storage:', e?.message || e); } catch (_) {}
      pgHealthy = false;
    }
  }
  try {
    const raw = await fsp.readFile(CONFIG_PATH, 'utf8');
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return { guilds: {} };
    if (!parsed.guilds || typeof parsed.guilds !== 'object') parsed.guilds = {};
    return parsed;
  } catch (_) {
    // Si le fichier est manquant ou corrompu, on tente de régénérer
    try {
      await fsp.mkdir(DATA_DIR, { recursive: true });
      await fsp.writeFile(CONFIG_PATH, JSON.stringify({ guilds: {} }, null, 2), 'utf8');
    } catch (_) {}
    return { guilds: {} };
  }
}

async function writeConfig(cfg, updateType = "unknown") {
  await ensureStorageExists();
  
  // 🛡️ PROTECTION ANTI-CORRUPTION
  const validation = validateConfigBeforeWrite(cfg, null, updateType);
  if (!validation.valid) {
    console.error('[Protection] ❌ REFUS D ÉCRITURE: Config invalide -', validation.reason);
    console.error('[Protection] 🔄 Le config actuel reste intact');
    throw new Error(`Protection anti-corruption: ${validation.reason}`);
  }
  
  console.log(`[Protection] ✅ Config valide (${validation.totalUsers} utilisateurs)`);
  
  // Sauvegarder le fichier principal config.json (toutes les guilds)
  try { await fsp.mkdir(DATA_DIR, { recursive: true }); } catch (_) {}
  const tmpPath = CONFIG_PATH + '.tmp';
  await fsp.writeFile(tmpPath, JSON.stringify(cfg, null, 2), 'utf8');
  try {
    await fsp.rename(tmpPath, CONFIG_PATH);
  } catch (e) {
    // Sur certains FS (ex: overlay), rename atomique peut échouer: fallback sur write direct
    try { await fsp.writeFile(CONFIG_PATH, JSON.stringify(cfg, null, 2), 'utf8'); }
    catch (_) {}
  }
  
  // BACKUPS AUTOMATIQUES DÉSACTIVÉS
  // Les backups sont maintenant gérés uniquement par :
  // 1. HourlyBackupSystem (toutes les heures)
  // 2. Commande /backup (manuel)
  // Cela évite de créer trop de fichiers de backup
}

// Force a snapshot of current state into the configured storage
async function backupNow() {
  const cfg = await readConfig();
  // Ne pas appeler writeConfig ici car cela ferait un double appel GitHub
  // await writeConfig(cfg);
  const info = { 
    storage: USE_PG ? 'postgres' : 'file', 
    backupFile: null, 
    historyId: null, 
    github: { success: false, configured: false },
    freebox: { success: false, available: false, error: null, filename: null },
    local: { success: false, error: null },
    details: {
      dataSize: JSON.stringify(cfg).length,
      guildsCount: Object.keys(cfg.guilds || {}).length,
      usersCount: 0,
      timestamp: new Date().toISOString()
    }
  };

  // Compter le nombre total d'utilisateurs avec des données
  for (const guildId in cfg.guilds || {}) {
    const guild = cfg.guilds[guildId];
    if (guild.levels?.users) info.details.usersCount += Object.keys(guild.levels.users).length;
    if (guild.economy?.balances) info.details.usersCount += Object.keys(guild.economy.balances).length;
  }
  info.details.usersCount = Math.max(info.details.usersCount, Object.keys(cfg.guilds || {}).length);
  
  // Note: Les sauvegardes sont maintenant créées par serveur dans writeConfig()
  // Cette fonction backupNow() est appelée par la commande /backup
  info.local = {
    success: true,
    message: 'Sauvegardes créées par serveur via writeConfig()'
  };

  // Sauvegarde GitHub désactivée (remplacée par sauvegardes par serveur)
  info.github = { 
    success: false, 
    configured: false, 
    message: 'Sauvegarde GitHub désactivée - Utilisation de sauvegardes locales par serveur'
  };

  return info;
}

// Restore the latest snapshot (local file backup only - no GitHub/PostgreSQL)
async function restoreLatest() {
  let data = null;
  let source = 'unknown';

  // 1. Essayer les sauvegardes globales en priorité
  if (!data) {
    try {
      const backupsDir = path.join(DATA_DIR, 'backups');
      const globalBackups = (await fsp.readdir(backupsDir))
        .filter(n => n.startsWith('config-global-') && n.endsWith('.json'))
        .sort();
      
      if (globalBackups.length) {
        const latest = path.join(backupsDir, globalBackups[globalBackups.length - 1]);
        const raw = await fsp.readFile(latest, 'utf8');
        data = JSON.parse(raw);
        source = 'file_backup_global';
        console.log('[Restore] Restauration depuis sauvegarde globale:', globalBackups[globalBackups.length - 1]);
      }
    } catch (_) {}
  }

  // 2. Dernier recours : fichier de config principal
  if (!data) {
    try { 
      const raw = await fsp.readFile(CONFIG_PATH, 'utf8'); 
      data = JSON.parse(raw);
      source = 'file_current';
    } catch (_) { 
      data = { guilds: {} };
      source = 'default';
    }
  }

  // Appliquer la restauration
  if (data) {
    await writeConfig(data);
    // Synchroniser avec le fichier local
    try {
      await fsp.mkdir(DATA_DIR, { recursive: true });
      const tmp = CONFIG_PATH + '.tmp';
      await fsp.writeFile(tmp, JSON.stringify(data, null, 2), 'utf8');
      try { await fsp.rename(tmp, CONFIG_PATH); } catch (_) { await fsp.writeFile(CONFIG_PATH, JSON.stringify(data, null, 2), 'utf8'); }
    } catch (_) {}
  }

  return { ok: true, source };
}

// Restore from a specific backup file (guild-specific or global)
async function restoreFromBackupFile(filename, guildId = null) {
  try {
    const backupsDir = path.join(DATA_DIR, 'backups');
    let filePath = null;
    
    // Chercher le fichier dans le répertoire spécifique du serveur d'abord
    if (guildId) {
      const guildBackupDir = path.join(backupsDir, `guild-${guildId}`);
      const guildFilePath = path.join(guildBackupDir, filename);
      try {
        await fsp.access(guildFilePath, fs.constants.R_OK);
        filePath = guildFilePath;
      } catch (_) {}
    }
    
    // Si pas trouvé, chercher dans différents emplacements
    if (!filePath) {
      const candidates = [
        path.join(backupsDir, filename),
        path.join(backupsDir, 'hourly', filename),
        path.join(backupsDir, 'external-hourly', filename),
        path.join('/var/data/backups', filename),
        path.join('/var/data/backups/external-hourly', filename)
      ];
      
      for (const candidate of candidates) {
        try {
          await fsp.access(candidate, fs.constants.R_OK);
          filePath = candidate;
          console.log(`[Restore] Fichier trouvé: ${candidate}`);
          break;
        } catch (_) {
          // Continue avec le prochain candidat
        }
      }
    }
    
    // Vérifier que le fichier a été trouvé
    if (!filePath) {
      throw new Error(`Fichier introuvable: ${filename} dans aucun emplacement`);
    }
    
    // Vérifier l'accès final
    await fsp.access(filePath, fs.constants.R_OK);
    
    // Lire et parser le contenu
    const content = await fsp.readFile(filePath, 'utf8');
    const backupData = JSON.parse(content);
    
    // Détecter le format (wrapped ou direct)
    let restoredData = null;
    if (backupData.data && backupData.metadata) {
      restoredData = backupData.data;
    } else if (backupData.guilds) {
      restoredData = backupData;
    } else {
      throw new Error('Format de sauvegarde non reconnu');
    }
    
    // Si guildId fourni, restaurer uniquement ce serveur (restauration partielle)
    if (guildId && restoredData.guilds && restoredData.guilds[guildId]) {
      const currentConfig = await readConfig();
      currentConfig.guilds[guildId] = restoredData.guilds[guildId];
      await writeConfig(currentConfig);
      
      console.log(`[Restore] Restauration partielle réussie pour le serveur ${guildId} depuis: ${filename}`);
      
      return {
        ok: true,
        source: 'guild_specific',
        filename: filename,
        guildId: guildId,
        partial: true
      };
    } else {
      // Restauration globale (tous les serveurs)
      await writeConfig(restoredData);
      
      console.log(`[Restore] Restauration globale réussie depuis: ${filename}`);
      
      return {
        ok: true,
        source: 'global_backup',
        filename: filename,
        partial: false
      };
    }
    
  } catch (error) {
    console.error(`[Restore] Erreur restauration depuis ${filename}:`, error.message);
    return {
      ok: false,
      source: 'backup_file',
      error: error.message,
      filename: filename
    };
  }
}

// Restore from a specific Freebox backup file
async function restoreFromFreeboxFile(filename) {
  try {
    const FreeboxBackup = require('./freeboxBackup');
    const freebox = new FreeboxBackup();
    
    const result = await freebox.restoreFromFile(filename);
    if (!result.success || !result.data) {
      throw new Error('Échec de la restauration depuis le fichier Freebox');
    }

    const data = result.data;
    
    // Appliquer la restauration
    await writeConfig(data);
    
    // Synchroniser avec la base de données si elle est disponible
    if (USE_PG) {
      try {
        const pool = await getPg();
        const client = await pool.connect();
        try {
          await client.query('INSERT INTO app_config (id, data, updated_at) VALUES (1, $1, NOW()) ON CONFLICT (id) DO UPDATE SET data = EXCLUDED.data, updated_at = NOW()', [data]);
        } finally {
          client.release();
        }
      } catch (_) {}
    }

    // Synchroniser avec le fichier local
    try {
      await fsp.mkdir(DATA_DIR, { recursive: true });
      const tmp = CONFIG_PATH + '.tmp';
      await fsp.writeFile(tmp, JSON.stringify(data, null, 2), 'utf8');
      try { await fsp.rename(tmp, CONFIG_PATH); } catch (_) { await fsp.writeFile(CONFIG_PATH, JSON.stringify(data, null, 2), 'utf8'); }
    } catch (_) {}

    console.log(`[Restore] Restauration Freebox réussie depuis: ${filename}`);
    
    return { 
      ok: true, 
      source: 'freebox_file', 
      filename: filename,
      metadata: result.metadata 
    };
    
  } catch (error) {
    console.error(`[Restore] Erreur restauration Freebox depuis ${filename}:`, error.message);
    return { 
      ok: false, 
      source: 'freebox_file', 
      error: error.message,
      filename: filename 
    };
  }
}

// List available Freebox backup files
async function listFreeboxBackups() {
  try {
    const FreeboxBackup = require('./freeboxBackup');
    const freebox = new FreeboxBackup();
    
    if (!(await freebox.isAvailable())) {
      return [];
    }
    
    return await freebox.listBackupFiles();
  } catch (error) {
    console.error('[Restore] Erreur liste sauvegardes Freebox:', error.message);
    return [];
  }
}

async function getGuildConfig(guildId) {
  const cfg = await readConfig();
  if (!cfg.guilds[guildId]) cfg.guilds[guildId] = {};
  if (!Array.isArray(cfg.guilds[guildId].staffRoleIds)) cfg.guilds[guildId].staffRoleIds = [];
  ensureTicketsShape(cfg.guilds[guildId]);
  if (!cfg.guilds[guildId].levels) {
    cfg.guilds[guildId].levels = {
      enabled: false,
      xpPerMessage: 10,
      xpPerVoiceMinute: 5,
      levelCurve: { base: 100, factor: 1.2 },
      rewards: {},
      users: {},
      announce: {
        levelUp: { enabled: false, channelId: '' },
        roleAward: { enabled: false, channelId: '' },
      },
      cards: {
        femaleRoleIds: [],
        certifiedRoleIds: [],
        backgrounds: { default: '', female: '', certified: '' },
        perRoleBackgrounds: {},
      },
    };
  }
  ensureEconomyShape(cfg.guilds[guildId]);
  return cfg.guilds[guildId];
}

async function getGuildStaffRoleIds(guildId) {
  const g = await getGuildConfig(guildId);
  return Array.isArray(g.staffRoleIds) ? g.staffRoleIds : [];
}

async function setGuildStaffRoleIds(guildId, roleIds) {
  const cfg = await readConfig();
  if (!cfg.guilds[guildId]) cfg.guilds[guildId] = {};
  cfg.guilds[guildId].staffRoleIds = Array.from(new Set(roleIds.map(String)));
  await writeConfig(cfg);
}

async function getGuildFooterLogo(guildId) {
  const guild = await getGuildConfig(guildId);
  return guild.footerLogoUrl || '';
}

async function setGuildFooterLogo(guildId, logoUrl) {
  const config = await readConfig();
  if (!config.guilds[guildId]) config.guilds[guildId] = {};
  config.guilds[guildId].footerLogoUrl = String(logoUrl || '').trim();
  await writeConfig(config);
}

async function getGuildCategoryBanners(guildId) {
  const guild = await getGuildConfig(guildId);
  return guild.categoryBanners || {};
}

async function setGuildCategoryBanner(guildId, category, imageUrl) {
  const config = await readConfig();
  if (!config.guilds[guildId]) config.guilds[guildId] = {};
  if (!config.guilds[guildId].categoryBanners) config.guilds[guildId].categoryBanners = {};
  const url = String(imageUrl || '').trim();
  if (url) config.guilds[guildId].categoryBanners[category] = url;
  else delete config.guilds[guildId].categoryBanners[category];
  await writeConfig(config);
}

// --- AutoKick config helpers ---
function ensureAutoKickShape(g) {
  if (!g.autokick) {
    g.autokick = { 
      enabled: false, 
      roleId: '', 
      delayMs: 3600000, 
      pendingJoiners: {},
      // Inactivity kick
      inactivityKick: {
        enabled: false,
        delayDays: 30, // Par défaut 30 jours
        excludedRoleIds: [],
        trackActivity: true
      },
      inactivityTracking: {}, // { userId: { lastActivity: timestamp, plannedInactive: { until: timestamp, reason: string } } }
      lastCheck: 0
    };
  } else {
    if (typeof g.autokick.enabled !== 'boolean') g.autokick.enabled = false;
    if (typeof g.autokick.roleId !== 'string') g.autokick.roleId = '';
    if (typeof g.autokick.delayMs !== 'number') g.autokick.delayMs = 3600000;
    if (!g.autokick.pendingJoiners || typeof g.autokick.pendingJoiners !== 'object') g.autokick.pendingJoiners = {};
    
    // Ensure inactivity kick structure
    if (!g.autokick.inactivityKick) {
      g.autokick.inactivityKick = {
        enabled: false,
        delayDays: 30,
        excludedRoleIds: [],
        trackActivity: true
      };
    }
    if (typeof g.autokick.inactivityKick.enabled !== 'boolean') g.autokick.inactivityKick.enabled = false;
    if (typeof g.autokick.inactivityKick.delayDays !== 'number') g.autokick.inactivityKick.delayDays = 30;
    if (!Array.isArray(g.autokick.inactivityKick.excludedRoleIds)) g.autokick.inactivityKick.excludedRoleIds = [];
    if (typeof g.autokick.inactivityKick.trackActivity !== 'boolean') g.autokick.inactivityKick.trackActivity = true;
    
    if (!g.autokick.inactivityTracking || typeof g.autokick.inactivityTracking !== 'object') g.autokick.inactivityTracking = {};
    if (typeof g.autokick.lastCheck !== 'number') g.autokick.lastCheck = 0;
  }
}

async function getAutoKickConfig(guildId) {
  const cfg = await readConfig();
  if (!cfg.guilds[guildId]) cfg.guilds[guildId] = {};
  ensureAutoKickShape(cfg.guilds[guildId]);
  return cfg.guilds[guildId].autokick;
}

async function updateAutoKickConfig(guildId, partial) {
  const cfg = await readConfig();
  if (!cfg.guilds[guildId]) cfg.guilds[guildId] = {};
  ensureAutoKickShape(cfg.guilds[guildId]);
  cfg.guilds[guildId].autokick = { ...cfg.guilds[guildId].autokick, ...partial };
  await writeConfig(cfg);
  return cfg.guilds[guildId].autokick;
}

async function addPendingJoiner(guildId, userId, joinedAtMs) {
  const cfg = await readConfig();
  if (!cfg.guilds[guildId]) cfg.guilds[guildId] = {};
  ensureAutoKickShape(cfg.guilds[guildId]);
  cfg.guilds[guildId].autokick.pendingJoiners[userId] = joinedAtMs;
  await writeConfig(cfg);
}

async function removePendingJoiner(guildId, userId) {
  const cfg = await readConfig();
  if (!cfg.guilds[guildId]) return;
  ensureAutoKickShape(cfg.guilds[guildId]);
  delete cfg.guilds[guildId].autokick.pendingJoiners[userId];
  await writeConfig(cfg);
}

// --- Inactivity tracking helpers ---
async function updateMemberActivity(guildId, userId) {
  const cfg = await readConfig();
  if (!cfg.guilds[guildId]) cfg.guilds[guildId] = {};
  ensureAutoKickShape(cfg.guilds[guildId]);
  
  const tracking = cfg.guilds[guildId].autokick.inactivityTracking[userId] || {};
  const hadPlannedInactive = tracking.plannedInactive ? true : false;
  const hadGraceWarning = tracking.graceWarningUntil && tracking.graceWarningUntil > Date.now();
  const lastActivity = tracking.lastActivity || 0;
  const wasInactive = (lastActivity > 0) && ((Date.now() - lastActivity) > (7 * 24 * 60 * 60 * 1000)); // Inactif si > 7 jours
  
  if (!cfg.guilds[guildId].autokick.inactivityTracking[userId]) {
    cfg.guilds[guildId].autokick.inactivityTracking[userId] = {};
  }
  
  // Clear inactivity flags when member becomes active
  if (hadPlannedInactive) {
    delete cfg.guilds[guildId].autokick.inactivityTracking[userId].plannedInactive;
  }
  if (hadGraceWarning) {
    delete cfg.guilds[guildId].autokick.inactivityTracking[userId].graceWarningUntil;
  }
  
  cfg.guilds[guildId].autokick.inactivityTracking[userId].lastActivity = Date.now();
  await writeConfig(cfg);
  
  // Return info about what changed
  return {
    wasInactive,
    hadPlannedInactive,
    hadGraceWarning,
    shouldNotify: hadPlannedInactive || hadGraceWarning || wasInactive
  };
}

async function setPlannedInactivity(guildId, userId, untilTimestamp, reason) {
  const cfg = await readConfig();
  if (!cfg.guilds[guildId]) cfg.guilds[guildId] = {};
  ensureAutoKickShape(cfg.guilds[guildId]);
  
  if (!cfg.guilds[guildId].autokick.inactivityTracking[userId]) {
    cfg.guilds[guildId].autokick.inactivityTracking[userId] = { lastActivity: Date.now() };
  }
  
  cfg.guilds[guildId].autokick.inactivityTracking[userId].plannedInactive = {
    until: untilTimestamp,
    reason: reason || 'Non spécifié',
    declaredAt: Date.now()
  };
  
  await writeConfig(cfg);
}

async function removePlannedInactivity(guildId, userId) {
  const cfg = await readConfig();
  if (!cfg.guilds[guildId]) return;
  ensureAutoKickShape(cfg.guilds[guildId]);
  
  if (cfg.guilds[guildId].autokick.inactivityTracking[userId]) {
    delete cfg.guilds[guildId].autokick.inactivityTracking[userId].plannedInactive;
    cfg.guilds[guildId].autokick.inactivityTracking[userId].lastActivity = Date.now();
  }
  
  await writeConfig(cfg);
}

async function getInactivityTracking(guildId) {
  const cfg = await readConfig();
  if (!cfg.guilds[guildId]) cfg.guilds[guildId] = {};
  ensureAutoKickShape(cfg.guilds[guildId]);
  return cfg.guilds[guildId].autokick.inactivityTracking || {};
}

async function updateLastInactivityCheck(guildId) {
  const cfg = await readConfig();
  if (!cfg.guilds[guildId]) cfg.guilds[guildId] = {};
  ensureAutoKickShape(cfg.guilds[guildId]);
  cfg.guilds[guildId].autokick.lastCheck = Date.now();
  await writeConfig(cfg);
}

// --- Levels helpers ---
function ensureLevelsShape(g) {
  if (!g.levels) {
    g.levels = {
      enabled: false,
      xpPerMessage: 10,
      xpPerVoiceMinute: 5,
      levelCurve: { base: 100, factor: 1.2 },
      rewards: {},
      users: {},
      announce: {
        levelUp: { enabled: false, channelId: '' },
        roleAward: { enabled: false, channelId: '' },
      },
      cards: {
        femaleRoleIds: [],
        certifiedRoleIds: [],
        backgrounds: { default: '', female: '', certified: '' },
      },
    };
  } else {
    if (typeof g.levels.enabled !== 'boolean') g.levels.enabled = false;
    if (typeof g.levels.xpPerMessage !== 'number') g.levels.xpPerMessage = 10;
    if (typeof g.levels.xpPerVoiceMinute !== 'number') g.levels.xpPerVoiceMinute = 5;
    if (!g.levels.levelCurve || typeof g.levels.levelCurve !== 'object') g.levels.levelCurve = { base: 100, factor: 1.2 };
    if (typeof g.levels.levelCurve.base !== 'number') g.levels.levelCurve.base = 100;
    if (typeof g.levels.levelCurve.factor !== 'number') g.levels.levelCurve.factor = 1.2;
    if (!g.levels.rewards || typeof g.levels.rewards !== 'object') g.levels.rewards = {};
    if (!g.levels.users || typeof g.levels.users !== 'object') g.levels.users = {};
    if (!g.levels.announce || typeof g.levels.announce !== 'object') g.levels.announce = {};
    if (!g.levels.announce.levelUp || typeof g.levels.announce.levelUp !== 'object') g.levels.announce.levelUp = { enabled: false, channelId: '' };
    if (!g.levels.announce.roleAward || typeof g.levels.announce.roleAward !== 'object') g.levels.announce.roleAward = { enabled: false, channelId: '' };
    if (typeof g.levels.announce.levelUp.enabled !== 'boolean') g.levels.announce.levelUp.enabled = false;
    if (typeof g.levels.announce.levelUp.channelId !== 'string') g.levels.announce.levelUp.channelId = '';
    if (typeof g.levels.announce.roleAward.enabled !== 'boolean') g.levels.announce.roleAward.enabled = false;
    if (typeof g.levels.announce.roleAward.channelId !== 'string') g.levels.announce.roleAward.channelId = '';
    if (!g.levels.cards || typeof g.levels.cards !== 'object') g.levels.cards = { femaleRoleIds: [], certifiedRoleIds: [], backgrounds: { default: '', female: '', certified: '' } };
    if (!g.levels.cards.perRoleBackgrounds || typeof g.levels.cards.perRoleBackgrounds !== 'object') g.levels.cards.perRoleBackgrounds = {};
    if (!Array.isArray(g.levels.cards.femaleRoleIds)) g.levels.cards.femaleRoleIds = [];
    if (!Array.isArray(g.levels.cards.certifiedRoleIds)) g.levels.cards.certifiedRoleIds = [];
    if (!g.levels.cards.backgrounds || typeof g.levels.cards.backgrounds !== 'object') g.levels.cards.backgrounds = { default: '', female: '', certified: '' };
    if (typeof g.levels.cards.backgrounds.default !== 'string') g.levels.cards.backgrounds.default = '';
    if (typeof g.levels.cards.backgrounds.female !== 'string') g.levels.cards.backgrounds.female = '';
    if (typeof g.levels.cards.backgrounds.certified !== 'string') g.levels.cards.backgrounds.certified = '';
  }
}

async function getLevelsConfig(guildId) {
  const cfg = await readConfig();
  if (!cfg.guilds[guildId]) cfg.guilds[guildId] = {};
  ensureLevelsShape(cfg.guilds[guildId]);
  return cfg.guilds[guildId].levels;
}

async function getEconomyConfig(guildId) {
  const g = await getGuildConfig(guildId);
  ensureEconomyShape(g);
  return g.economy;
}

async function updateEconomyConfig(guildId, partial) {
  const cfg = await readConfig();
  if (!cfg.guilds[guildId]) cfg.guilds[guildId] = {};
  if (!cfg.guilds[guildId].economy) cfg.guilds[guildId].economy = {};
  cfg.guilds[guildId].economy = { ...cfg.guilds[guildId].economy, ...partial };
  await writeConfig(cfg);
  return cfg.guilds[guildId].economy;
}

async function updateLevelsConfig(guildId, partial) {
  const cfg = await readConfig();
  if (!cfg.guilds[guildId]) cfg.guilds[guildId] = {};
  ensureLevelsShape(cfg.guilds[guildId]);
  cfg.guilds[guildId].levels = { ...cfg.guilds[guildId].levels, ...partial };
  await writeConfig(cfg);
  return cfg.guilds[guildId].levels;
}

async function getUserStats(guildId, userId) {
  const cfg = await readConfig();
  if (!cfg.guilds[guildId]) cfg.guilds[guildId] = {};
  ensureLevelsShape(cfg.guilds[guildId]);
  const existing = cfg.guilds[guildId].levels.users[userId];
  const u = existing || { xp: 0, level: 0, xpSinceLevel: 0, lastMessageAt: 0, voiceMsAccum: 0, voiceJoinedAt: 0 };
  if (typeof u.xp !== 'number') u.xp = 0;
  if (typeof u.level !== 'number') u.level = 0;
  if (typeof u.xpSinceLevel !== 'number') u.xpSinceLevel = 0;
  if (typeof u.lastMessageAt !== 'number') u.lastMessageAt = 0;
  if (typeof u.voiceMsAccum !== 'number') u.voiceMsAccum = 0;
  if (typeof u.voiceJoinedAt !== 'number') u.voiceJoinedAt = 0;
  return u;
}

async function setUserStats(guildId, userId, stats) {
  const cfg = await readConfig();
  if (!cfg.guilds[guildId]) cfg.guilds[guildId] = {};
  ensureLevelsShape(cfg.guilds[guildId]);
  cfg.guilds[guildId].levels.users[userId] = stats;
  await writeConfig(cfg);
}

async function getEconomyUser(guildId, userId) {
  const cfg = await readConfig();
  if (!cfg.guilds[guildId]) cfg.guilds[guildId] = {};
  if (!cfg.guilds[guildId].economy) cfg.guilds[guildId].economy = { balances: {} };
  const eco = cfg.guilds[guildId].economy;
  const u = eco.balances?.[userId] || { amount: 0, cooldowns: {}, charm: 0, perversion: 0 };
  
  // Synchronisation bidirectionnelle amount/money pour compatibilité
  if (typeof u.amount !== 'number' && typeof u.money === 'number') {
    u.amount = u.money;
  } else if (typeof u.amount !== 'number') {
    u.amount = 0;
  }
  
  if (typeof u.money !== 'number') {
    u.money = u.amount;
  }
  
  if (!u.cooldowns || typeof u.cooldowns !== 'object') u.cooldowns = {};
  if (typeof u.charm !== 'number') u.charm = 0;
  if (typeof u.perversion !== 'number') u.perversion = 0;
  if (typeof u.lastVoiceReward !== 'number') u.lastVoiceReward = 0;
  return u;
}

async function setEconomyUser(guildId, userId, state) {
  const cfg = await readConfig();
  if (!cfg.guilds[guildId]) cfg.guilds[guildId] = {};
  if (!cfg.guilds[guildId].economy) cfg.guilds[guildId].economy = { balances: {} };
  if (!cfg.guilds[guildId].economy.balances) cfg.guilds[guildId].economy.balances = {};
  
  // Synchroniser money et amount pour compatibilité bidirectionnelle
  if (typeof state.money === 'number' && typeof state.amount !== 'number') {
    state.amount = state.money;
  } else if (typeof state.amount === 'number' && typeof state.money !== 'number') {
    state.money = state.amount;
  } else if (typeof state.amount === 'number' && typeof state.money === 'number') {
    // Si les deux sont définis, utiliser amount comme référence
    state.money = state.amount;
  }
  
  cfg.guilds[guildId].economy.balances[userId] = state;
  await writeConfig(cfg);
  
  // Log de debug pour vérifier la sauvegarde
  console.log(`[STORAGE DEBUG] Saved user ${userId} in guild ${guildId}: amount=${state.amount}, money=${state.money}, charm=${state.charm}, perversion=${state.perversion}, receivedGrants=${Object.keys(state.receivedGrants||{}).length}`);
}

function ensureEconomyShape(g) {
  if (!g.economy || typeof g.economy !== 'object') {
    g.economy = {};
  }
  const e = g.economy;
  if (!e.balances || typeof e.balances !== 'object') e.balances = {};
  if (!e.currency || typeof e.currency !== 'object') e.currency = { symbol: '🪙', name: 'BAG$' };
  if (!e.settings || typeof e.settings !== 'object') e.settings = {};
  if (typeof e.settings.baseWorkReward !== 'number') e.settings.baseWorkReward = 50;
  if (typeof e.settings.baseFishReward !== 'number') e.settings.baseFishReward = 30;
  if (!e.settings.cooldowns || typeof e.settings.cooldowns !== 'object') e.settings.cooldowns = { work: 600, fish: 300, give: 0, steal: 1800, kiss: 60, flirt: 60, seduce: 120, fuck: 600, sodo: 600, orgasme: 600, lick: 120, suck: 120, branler: 120, doigter: 120, tickle: 60, revive: 180, comfort: 90, massage: 120, dance: 120, crime: 1800, shower: 120, wet: 90, bed: 180, undress: 120, collar: 120, leash: 120, kneel: 60, order: 60, punish: 300, rose: 60, wine: 180, pillowfight: 120, sleep: 300, oops: 30, caught: 60, tromper: 300 };
  
  // Récompenses pour messages et vocal
  if (!e.rewards || typeof e.rewards !== 'object') e.rewards = {};
  if (!e.rewards.message || typeof e.rewards.message !== 'object') e.rewards.message = { min: 1, max: 3, enabled: true };
  if (typeof e.rewards.message.min !== 'number') e.rewards.message.min = 1;
  if (typeof e.rewards.message.max !== 'number') e.rewards.message.max = 3;
  if (typeof e.rewards.message.enabled !== 'boolean') e.rewards.message.enabled = true;
  if (!e.rewards.voice || typeof e.rewards.voice !== 'object') e.rewards.voice = { min: 2, max: 5, enabled: true, intervalMinutes: 5 };
  if (typeof e.rewards.voice.min !== 'number') e.rewards.voice.min = 2;
  if (typeof e.rewards.voice.max !== 'number') e.rewards.voice.max = 5;
  if (typeof e.rewards.voice.enabled !== 'boolean') e.rewards.voice.enabled = true;
  if (typeof e.rewards.voice.intervalMinutes !== 'number') e.rewards.voice.intervalMinutes = 5;
  if (!e.actions || typeof e.actions !== 'object') e.actions = {};
  // Ensure GIFs container exists under actions, and migrate from legacy economy.gifs if present
  if (!e.actions.gifs || typeof e.actions.gifs !== 'object') {
    if (e.gifs && typeof e.gifs === 'object') {
      // Migrate legacy GIFs structure (economy.gifs -> economy.actions.gifs)
      e.actions.gifs = { ...e.gifs };
      try { delete e.gifs; } catch (_) {}
    } else {
      e.actions.gifs = {};
    }
  }
  // Pré-remplir des messages personnalisés pour les nouvelles actions si absent
  if (!e.actions.messages || typeof e.actions.messages !== 'object') e.actions.messages = {};
  const preset = e.actions.messages;
  function ensureMsgs(key, succArr, failArr){
    if (!preset[key] || typeof preset[key] !== 'object') preset[key] = { success: [], fail: [] };
    if (!Array.isArray(preset[key].success) || preset[key].success.length === 0) preset[key].success = succArr.slice();
    if (!Array.isArray(preset[key].fail) || preset[key].fail.length === 0) preset[key].fail = failArr.slice();
  }
  ensureMsgs('touche',[
    "Tu frôles délicatement la peau de {target}…",
    "Tes mains se posent avec envie sur {target}…",
    "Un contact doux qui fait frissonner {target}."
  ],[
    "{target} esquive avec un sourire taquin.",
    "Moment raté… {target} n'était pas prêt(e)."
  ]);
  ensureMsgs('reveiller',[
    "Tu réveilles {target} avec douceur…",
    "Petit réveil sensuel pour {target}…",
    "{target} ouvre les yeux avec un sourire."
  ],[
    "{target} ronfle encore… mission reportée.",
    "Le café est froid… le réveil attendra."
  ]);
  ensureMsgs('cuisiner',[
    "Tu prépares un plat irrésistible…",
    "L'odeur envoûtante met {target} en appétit…",
    "Chef en cuisine, cœur en ébullition!"
  ],[
    "La recette tourne mal… ça fumait un peu trop.",
    "Le gâteau s'effondre… on commandera!"
  ]);
  ensureMsgs('douche',[
    "Tu caresses le corps de {cible} sous l'eau tiède…",
    "Tes mains savonneuses glissent sur {cible} de façon érotique…",
    "L'eau ruisselle, vos corps se frôlent: {cible} frissonne."
  ],[
    "L'eau froide coupe court aux envies…",
    "Le savon pique les yeux, vous riez et remettez ça plus tard."
  ]);
  ensureMsgs('touche',[
    "Tu touches {cible} d'une manière délicieusement suggestive…",
    "Tes doigts explorent {cible}, lentement, avec envie…",
    "{cible} gémit lorsque tes mains s'attardent aux bons endroits."
  ],[
    "{cible} recule avec un sourire timide…",
    "Le moment n'est pas propice, {cible} préfère attendre."
  ]);
  ensureMsgs('reveiller',[
    "Tu réveilles {cible} par de tendres baisers… ou d'habiles caresses…",
    "Petit-déjeuner au lit, ou doigts malicieux: {cible} s'éveille sous tes attentions.",
    "{cible} ouvre les yeux, troublé(e) par tes gestes."
  ],[
    "{cible} reste profondément endormi(e)…",
    "Le réveil vibre… et casse l'ambiance."
  ]);
  ensureMsgs('cuisiner',[
    "Tu cuisines nu(e) pour {cible}, un tablier et des intentions…",
    "La recette est simple: toi, {cible}, et une pincée de tentation.",
    "Le plat mijote; la passion aussi. {cible} te dévore des yeux."
  ],[
    "Ça brûle un peu… mais l'appétit reste entier!",
    "La cuisine est en désordre, vous finirez par commander."
  ]);
  const defaultEnabled = ['work','fish','give','steal','kiss','flirt','seduce','fuck','sodo','orgasme','branler','doigter','hairpull','caress','lick','suck','nibble','tickle','revive','comfort','massage','dance','crime','shower','wet','bed','undress','collar','leash','kneel','order','punish','rose','wine','pillowfight','sleep','oops','caught','tromper','orgie','daily','touche','reveiller','cuisiner','douche'];
  if (!Array.isArray(e.actions.enabled)) e.actions.enabled = defaultEnabled;
  else {
    for (const k of defaultEnabled) if (!e.actions.enabled.includes(k)) e.actions.enabled.push(k);
  }
  if (!e.actions.config || typeof e.actions.config !== 'object') e.actions.config = {};
  
  // Ensure karmaModifiers structure exists and is valid
  if (!e.karmaModifiers || typeof e.karmaModifiers !== 'object') {
    e.karmaModifiers = { shop: [], actions: [], grants: [] };
  } else {
    // Validate each karma modifier type
    if (!Array.isArray(e.karmaModifiers.shop)) e.karmaModifiers.shop = [];
    if (!Array.isArray(e.karmaModifiers.actions)) e.karmaModifiers.actions = [];
    if (!Array.isArray(e.karmaModifiers.grants)) e.karmaModifiers.grants = [];
    
    // Validate and sanitize each rule
    ['shop', 'actions', 'grants'].forEach(type => {
      e.karmaModifiers[type] = e.karmaModifiers[type].filter(rule => {
        if (!rule || typeof rule !== 'object') return false;
        if (!rule.condition || typeof rule.condition !== 'string') return false;
        if (type === 'grants') {
          return typeof rule.money === 'number';
        } else {
          return typeof rule.percent === 'number';
        }
      });
    });
  }
  
  // Ensure karmaReset structure exists
  if (!e.karmaReset || typeof e.karmaReset !== 'object') {
    e.karmaReset = { enabled: false, day: 1 };
  }
  if (typeof e.karmaReset.enabled !== 'boolean') e.karmaReset.enabled = false;
  if (typeof e.karmaReset.day !== 'number' || e.karmaReset.day < 0 || e.karmaReset.day > 6) e.karmaReset.day = 1; // 0=Dimanche .. 6=Samedi (UTC)
  
  const defaults = {
    daily: { moneyMin: 150, moneyMax: 300, karma: 'none', karmaDelta: 0, cooldown: 86400, successRate: 1.0, failMoneyMin: 0, failMoneyMax: 0, failKarmaDelta: 0, partnerMoneyShare: 0.0, partnerKarmaShare: 0.0 },
    work: { moneyMin: 40, moneyMax: 90, karma: 'charm', karmaDelta: 1, cooldown: 600, successRate: 0.9, failMoneyMin: 5, failMoneyMax: 15, failKarmaDelta: 1, partnerMoneyShare: 0.0, partnerKarmaShare: 0.0 },
    fish: { moneyMin: 20, moneyMax: 60, karma: 'charm', karmaDelta: 1, cooldown: 300, successRate: 0.65, failMoneyMin: 5, failMoneyMax: 15, failKarmaDelta: 1, partnerMoneyShare: 0.0, partnerKarmaShare: 0.0 },
    give: { moneyMin: 0, moneyMax: 0, karma: 'charm', karmaDelta: 1, cooldown: 0, successRate: 1.0, failMoneyMin: 0, failMoneyMax: 0, failKarmaDelta: 0, partnerMoneyShare: 0.0, partnerKarmaShare: 0.0 },
    steal: { moneyMin: 10, moneyMax: 30, karma: 'perversion', karmaDelta: 2, cooldown: 1800, successRate: 0.5, failMoneyMin: 10, failMoneyMax: 20, failKarmaDelta: 2, partnerMoneyShare: 0.0, partnerKarmaShare: 0.0 },
    kiss: { moneyMin: 5, moneyMax: 15, karma: 'charm', karmaDelta: 2, cooldown: 60, successRate: 0.8, failMoneyMin: 2, failMoneyMax: 5, failKarmaDelta: 2, partnerMoneyShare: 1.2, partnerKarmaShare: 1.5 },
    lick: { moneyMin: 8, moneyMax: 20, karma: 'perversion', karmaDelta: 3, cooldown: 120, successRate: 0.85, failMoneyMin: 3, failMoneyMax: 10, failKarmaDelta: 2, partnerMoneyShare: 1.2, partnerKarmaShare: 1.5 },
    suck: { moneyMin: 12, moneyMax: 28, karma: 'perversion', karmaDelta: 4, cooldown: 120, successRate: 0.85, failMoneyMin: 4, failMoneyMax: 12, failKarmaDelta: 2, partnerMoneyShare: 1.2, partnerKarmaShare: 1.5 },
    nibble: { moneyMin: 10, moneyMax: 24, karma: 'perversion', karmaDelta: 3, cooldown: 120, successRate: 0.9, failMoneyMin: 2, failMoneyMax: 6, failKarmaDelta: 1, partnerMoneyShare: 1.0, partnerKarmaShare: 1.2 },
    branler: { moneyMin: 10, moneyMax: 26, karma: 'perversion', karmaDelta: 4, cooldown: 120, successRate: 0.85, failMoneyMin: 3, failMoneyMax: 10, failKarmaDelta: 2, partnerMoneyShare: 1.2, partnerKarmaShare: 1.5 },
    doigter: { moneyMin: 9, moneyMax: 22, karma: 'perversion', karmaDelta: 3, cooldown: 120, successRate: 0.85, failMoneyMin: 3, failMoneyMax: 9, failKarmaDelta: 2, partnerMoneyShare: 1.2, partnerKarmaShare: 1.5 },
    tickle: { moneyMin: 4, moneyMax: 12, karma: 'charm', karmaDelta: 2, cooldown: 60, successRate: 0.9, failMoneyMin: 1, failMoneyMax: 3, failKarmaDelta: 1, partnerMoneyShare: 1.0, partnerKarmaShare: 1.0 },
    revive: { moneyMin: 6, moneyMax: 18, karma: 'charm', karmaDelta: 3, cooldown: 180, successRate: 0.85, failMoneyMin: 2, failMoneyMax: 6, failKarmaDelta: 1, partnerMoneyShare: 1.0, partnerKarmaShare: 1.0 },
    comfort: { moneyMin: 5, moneyMax: 15, karma: 'charm', karmaDelta: 3, cooldown: 90, successRate: 0.9, failMoneyMin: 1, failMoneyMax: 4, failKarmaDelta: 1, partnerMoneyShare: 1.2, partnerKarmaShare: 1.0 },
    flirt: { moneyMin: 5, moneyMax: 15, karma: 'charm', karmaDelta: 2, cooldown: 60, successRate: 0.8, failMoneyMin: 2, failMoneyMax: 5, failKarmaDelta: 2, partnerMoneyShare: 1.2, partnerKarmaShare: 1.5 },
    seduce: { moneyMin: 10, moneyMax: 20, karma: 'charm', karmaDelta: 3, cooldown: 120, successRate: 0.7, failMoneyMin: 5, failMoneyMax: 10, failKarmaDelta: 3, partnerMoneyShare: 1.2, partnerKarmaShare: 1.5 },
    fuck: { moneyMin: 20, moneyMax: 50, karma: 'perversion', karmaDelta: 5, cooldown: 600, successRate: 0.7, failMoneyMin: 10, failMoneyMax: 20, failKarmaDelta: 5, partnerMoneyShare: 1.2, partnerKarmaShare: 1.5 },
    sodo: { moneyMin: 22, moneyMax: 55, karma: 'perversion', karmaDelta: 6, cooldown: 600, successRate: 0.7, failMoneyMin: 10, failMoneyMax: 22, failKarmaDelta: 5, partnerMoneyShare: 1.2, partnerKarmaShare: 1.5 },
    orgasme: { moneyMin: 24, moneyMax: 60, karma: 'perversion', karmaDelta: 6, cooldown: 600, successRate: 0.8, failMoneyMin: 10, failMoneyMax: 22, failKarmaDelta: 5, partnerMoneyShare: 1.5, partnerKarmaShare: 1.5 },
    hairpull: { moneyMin: 10, moneyMax: 25, karma: 'perversion', karmaDelta: 3, cooldown: 90, successRate: 0.85, failMoneyMin: 2, failMoneyMax: 6, failKarmaDelta: 2, partnerMoneyShare: 1.0, partnerKarmaShare: 1.2 },
    caress: { moneyMin: 8, moneyMax: 20, karma: 'perversion', karmaDelta: 2, cooldown: 90, successRate: 0.9, failMoneyMin: 2, failMoneyMax: 5, failKarmaDelta: 1, partnerMoneyShare: 1.0, partnerKarmaShare: 1.2 },
    massage: { moneyMin: 5, moneyMax: 15, karma: 'charm', karmaDelta: 1, cooldown: 120, successRate: 0.85, failMoneyMin: 2, failMoneyMax: 4, failKarmaDelta: 1, partnerMoneyShare: 1.2, partnerKarmaShare: 1.5 },
    dance: { moneyMin: 5, moneyMax: 15, karma: 'charm', karmaDelta: 1, cooldown: 120, successRate: 0.85, failMoneyMin: 2, failMoneyMax: 4, failKarmaDelta: 1, partnerMoneyShare: 1.5, partnerKarmaShare: 1.5 },
    crime: { moneyMin: 30, moneyMax: 80, karma: 'perversion', karmaDelta: 4, cooldown: 1800, successRate: 0.6, failMoneyMin: 15, failMoneyMax: 30, failKarmaDelta: 4, partnerMoneyShare: 1.2, partnerKarmaShare: 1.5 },
    // Nouvelles actions
    touche: { moneyMin: 8, moneyMax: 22, karma: 'perversion', karmaDelta: 2, cooldown: 90, successRate: 0.85, failMoneyMin: 2, failMoneyMax: 6, failKarmaDelta: 1, partnerMoneyShare: 1.0, partnerKarmaShare: 1.2 },
    reveiller: { moneyMin: 10, moneyMax: 26, karma: 'charm', karmaDelta: 2, cooldown: 120, successRate: 0.85, failMoneyMin: 3, failMoneyMax: 8, failKarmaDelta: 1, partnerMoneyShare: 1.0, partnerKarmaShare: 1.2 },
    cuisiner: { moneyMin: 12, moneyMax: 28, karma: 'perversion', karmaDelta: 2, cooldown: 180, successRate: 0.9, failMoneyMin: 4, failMoneyMax: 10, failKarmaDelta: 1, partnerMoneyShare: 1.0, partnerKarmaShare: 1.2 },
    douche: { moneyMin: 14, moneyMax: 32, karma: 'perversion', karmaDelta: 3, cooldown: 180, successRate: 0.9, failMoneyMin: 5, failMoneyMax: 12, failKarmaDelta: 1, partnerMoneyShare: 1.0, partnerKarmaShare: 1.2 },
    // Hot & Fun
    shower: { moneyMin: 5, moneyMax: 20, karma: 'perversion', karmaDelta: 2, cooldown: 120, successRate: 0.85, failMoneyMin: 2, failMoneyMax: 5, failKarmaDelta: 1, partnerMoneyShare: 1.0, partnerKarmaShare: 1.2 },
    wet: { moneyMin: 5, moneyMax: 15, karma: 'perversion', karmaDelta: 2, cooldown: 90, successRate: 0.85, failMoneyMin: 2, failMoneyMax: 5, failKarmaDelta: 1, partnerMoneyShare: 1.0, partnerKarmaShare: 1.2 },
    bed: { moneyMin: 10, moneyMax: 30, karma: 'perversion', karmaDelta: 3, cooldown: 180, successRate: 0.7, failMoneyMin: 5, failMoneyMax: 10, failKarmaDelta: 2, partnerMoneyShare: 1.0, partnerKarmaShare: 1.2 },
    undress: { moneyMin: 5, moneyMax: 15, karma: 'perversion', karmaDelta: 2, cooldown: 120, successRate: 0.8, failMoneyMin: 2, failMoneyMax: 5, failKarmaDelta: 1, partnerMoneyShare: 0.0, partnerKarmaShare: 0.0 },
    // Domination / Soumission
    collar: { moneyMin: 5, moneyMax: 20, karma: 'perversion', karmaDelta: 3, cooldown: 120, successRate: 0.8, failMoneyMin: 2, failMoneyMax: 6, failKarmaDelta: 2, partnerMoneyShare: 1.0, partnerKarmaShare: 1.5 },
    leash: { moneyMin: 5, moneyMax: 20, karma: 'perversion', karmaDelta: 3, cooldown: 120, successRate: 0.8, failMoneyMin: 2, failMoneyMax: 6, failKarmaDelta: 2, partnerMoneyShare: 1.0, partnerKarmaShare: 1.5 },
    kneel: { moneyMin: 5, moneyMax: 15, karma: 'perversion', karmaDelta: 2, cooldown: 60, successRate: 0.85, failMoneyMin: 2, failMoneyMax: 5, failKarmaDelta: 1, partnerMoneyShare: 1.0, partnerKarmaShare: 1.5 },
    order: { moneyMin: 5, moneyMax: 15, karma: 'perversion', karmaDelta: 2, cooldown: 60, successRate: 0.9, failMoneyMin: 1, failMoneyMax: 4, failKarmaDelta: 1, partnerMoneyShare: 1.0, partnerKarmaShare: 1.2 },
    punish: { moneyMin: 10, moneyMax: 30, karma: 'perversion', karmaDelta: 4, cooldown: 300, successRate: 0.7, failMoneyMin: 5, failMoneyMax: 10, failKarmaDelta: 3, partnerMoneyShare: 1.0, partnerKarmaShare: 1.5 },
    // Séduction & RP doux
    rose: { moneyMin: 5, moneyMax: 10, karma: 'charm', karmaDelta: 2, cooldown: 60, successRate: 0.95, failMoneyMin: 1, failMoneyMax: 3, failKarmaDelta: 1, partnerMoneyShare: 1.0, partnerKarmaShare: 1.3 },
    wine: { moneyMin: 10, moneyMax: 25, karma: 'charm', karmaDelta: 2, cooldown: 180, successRate: 0.85, failMoneyMin: 3, failMoneyMax: 6, failKarmaDelta: 1, partnerMoneyShare: 1.0, partnerKarmaShare: 1.3 },
    pillowfight: { moneyMin: 5, moneyMax: 15, karma: 'charm', karmaDelta: 2, cooldown: 120, successRate: 0.9, failMoneyMin: 2, failMoneyMax: 5, failKarmaDelta: 1, partnerMoneyShare: 1.0, partnerKarmaShare: 1.3 },
    sleep: { moneyMin: 5, moneyMax: 15, karma: 'charm', karmaDelta: 2, cooldown: 300, successRate: 0.9, failMoneyMin: 2, failMoneyMax: 5, failKarmaDelta: 1, partnerMoneyShare: 1.0, partnerKarmaShare: 1.3 },
    // Délires coquins / Jeux
    oops: { moneyMin: 3, moneyMax: 8, karma: 'perversion', karmaDelta: 1, cooldown: 30, successRate: 0.95, failMoneyMin: 1, failMoneyMax: 2, failKarmaDelta: 1, partnerMoneyShare: 0.0, partnerKarmaShare: 0.0 },
    caught: { moneyMin: 3, moneyMax: 12, karma: 'perversion', karmaDelta: 1, cooldown: 60, successRate: 0.9, failMoneyMin: 1, failMoneyMax: 3, failKarmaDelta: 1, partnerMoneyShare: 0.0, partnerKarmaShare: 0.0 },
    tromper: { moneyMin: 15, moneyMax: 40, karma: 'perversion', karmaDelta: 3, cooldown: 300, successRate: 0.6, failMoneyMin: 10, failMoneyMax: 25, failKarmaDelta: 3, partnerMoneyShare: 0.0, partnerKarmaShare: 0.0 },
    orgie: { moneyMin: 30, moneyMax: 100, karma: 'perversion', karmaDelta: 6, cooldown: 900, successRate: 0.65, failMoneyMin: 15, failMoneyMax: 35, failKarmaDelta: 4, partnerMoneyShare: 0.0, partnerKarmaShare: 0.0 },
  };
  // Add XP parameters defaults for actions (success/fail) + partner XP share
  const xpDefaults = {
    daily: { xpDelta: 5, failXpDelta: 0, partnerXpShare: 0.0 },
    work: { xpDelta: 10, failXpDelta: 2, partnerXpShare: 0.0 },
    fish: { xpDelta: 8, failXpDelta: 2, partnerXpShare: 0.0 },
    give: { xpDelta: 5, failXpDelta: 0, partnerXpShare: 0.0 },
    steal: { xpDelta: 10, failXpDelta: 2, partnerXpShare: 0.0 },
    kiss: { xpDelta: 10, failXpDelta: 2, partnerXpShare: 1.0 },
    lick: { xpDelta: 10, failXpDelta: 2, partnerXpShare: 1.0 },
    suck: { xpDelta: 12, failXpDelta: 3, partnerXpShare: 1.0 },
    nibble: { xpDelta: 10, failXpDelta: 2, partnerXpShare: 1.0 },
    branler: { xpDelta: 12, failXpDelta: 3, partnerXpShare: 1.0 },
    doigter: { xpDelta: 10, failXpDelta: 2, partnerXpShare: 1.0 },
    tickle: { xpDelta: 6, failXpDelta: 1, partnerXpShare: 1.0 },
    revive: { xpDelta: 10, failXpDelta: 2, partnerXpShare: 1.0 },
    comfort: { xpDelta: 8, failXpDelta: 2, partnerXpShare: 1.0 },
    flirt: { xpDelta: 8, failXpDelta: 2, partnerXpShare: 1.0 },
    seduce: { xpDelta: 12, failXpDelta: 3, partnerXpShare: 1.0 },
    fuck: { xpDelta: 20, failXpDelta: 5, partnerXpShare: 1.0 },
    sodo: { xpDelta: 22, failXpDelta: 6, partnerXpShare: 1.0 },
    orgasme: { xpDelta: 24, failXpDelta: 6, partnerXpShare: 1.0 },
    hairpull: { xpDelta: 10, failXpDelta: 2, partnerXpShare: 1.0 },
    caress: { xpDelta: 8, failXpDelta: 2, partnerXpShare: 1.0 },
    massage: { xpDelta: 8, failXpDelta: 2, partnerXpShare: 1.0 },
    dance: { xpDelta: 6, failXpDelta: 2, partnerXpShare: 1.0 },
    crime: { xpDelta: 15, failXpDelta: 5, partnerXpShare: 1.0 },
    shower: { xpDelta: 10, failXpDelta: 2, partnerXpShare: 1.0 },
    wet: { xpDelta: 8, failXpDelta: 2, partnerXpShare: 1.0 },
    bed: { xpDelta: 12, failXpDelta: 3, partnerXpShare: 1.0 },
    undress: { xpDelta: 8, failXpDelta: 2, partnerXpShare: 0.0 },
    collar: { xpDelta: 10, failXpDelta: 2, partnerXpShare: 1.0 },
    leash: { xpDelta: 10, failXpDelta: 2, partnerXpShare: 1.0 },
    kneel: { xpDelta: 8, failXpDelta: 2, partnerXpShare: 1.0 },
    order: { xpDelta: 6, failXpDelta: 2, partnerXpShare: 1.0 },
    punish: { xpDelta: 12, failXpDelta: 3, partnerXpShare: 1.0 },
    rose: { xpDelta: 6, failXpDelta: 1, partnerXpShare: 1.0 },
    wine: { xpDelta: 8, failXpDelta: 2, partnerXpShare: 1.0 },
    pillowfight: { xpDelta: 8, failXpDelta: 2, partnerXpShare: 1.0 },
    sleep: { xpDelta: 6, failXpDelta: 1, partnerXpShare: 1.0 },
    oops: { xpDelta: 4, failXpDelta: 1, partnerXpShare: 0.0 },
    caught: { xpDelta: 5, failXpDelta: 1, partnerXpShare: 0.0 },
    tromper: { xpDelta: 12, failXpDelta: 3, partnerXpShare: 0.0 },
    orgie: { xpDelta: 24, failXpDelta: 6, partnerXpShare: 0.0 },
  };
  for (const [k, d] of Object.entries(defaults)) {
    if (!e.actions.config[k] || typeof e.actions.config[k] !== 'object') e.actions.config[k] = { ...d };
    else {
      const c = e.actions.config[k];
      if (typeof c.moneyMin !== 'number') c.moneyMin = d.moneyMin;
      if (typeof c.moneyMax !== 'number') c.moneyMax = d.moneyMax;
      if (c.karma !== 'charm' && c.karma !== 'perversion' && c.karma !== 'none') c.karma = d.karma;
      if (typeof c.karmaDelta !== 'number') c.karmaDelta = d.karmaDelta;
      if (typeof c.cooldown !== 'number') c.cooldown = d.cooldown;
      if (typeof c.successRate !== 'number') c.successRate = d.successRate;
      if (typeof c.failMoneyMin !== 'number') c.failMoneyMin = d.failMoneyMin;
      if (typeof c.failMoneyMax !== 'number') c.failMoneyMax = d.failMoneyMax;
      if (typeof c.failKarmaDelta !== 'number') c.failKarmaDelta = d.failKarmaDelta;
      if (typeof c.partnerMoneyShare !== 'number') c.partnerMoneyShare = d.partnerMoneyShare;
      if (typeof c.partnerKarmaShare !== 'number') c.partnerKarmaShare = d.partnerKarmaShare;
    }
    // Ensure XP fields exist
    const xd = xpDefaults[k] || { xpDelta: 5, failXpDelta: 1, partnerXpShare: 0.0 };
    if (typeof e.actions.config[k].xpDelta !== 'number') e.actions.config[k].xpDelta = xd.xpDelta;
    if (typeof e.actions.config[k].failXpDelta !== 'number') e.actions.config[k].failXpDelta = xd.failXpDelta;
    if (typeof e.actions.config[k].partnerXpShare !== 'number') e.actions.config[k].partnerXpShare = xd.partnerXpShare;
  }
  // Ensure per-action messages shape (personalized success/fail messages)
  if (!e.actions.messages || typeof e.actions.messages !== 'object') e.actions.messages = {};
  const msgDefaults = {
    hairpull: {
      success: ['Tu tires ses cheveux avec fermeté, regard brûlant 😈', 'Main dans la chevelure, tu guides avec assurance.', 'Prise maîtrisée, consentement affiché: ça le/la rend fou/folle.'],
      fail: ["Tu hésites, le geste n'est pas clair.", "Pas d'accord là-dessus, vous préférez éviter.", "Mauvais timing, on en discute d'abord."]
    },
    caress: {
      success: ['Tes mains glissent lentement, la température monte…', 'Des caresses expertes, frisson garanti.', 'Douceur et intention: irrésistible.'],
      fail: ["Tu tentes une caresse, mais il/elle préfère attendre.", "Le moment n'y est pas, vous ralentissez."]
    },
    daily: {
      success: ['Bonus quotidien reçu !', 'Récompense du jour collectée. À demain !'],
      fail: []
    },
    work: {
      success: ['Beau boulot, votre chef est ravi !', 'Paie reçue, continuez comme ça !'],
      fail: ["Journée compliquée… vous aurez plus de chance demain.", "Retard et paperasse… pas de prime aujourd'hui."]
    },
    fish: {
      success: ['Bravo, vous avez pêché un saumon !', 'Félicitations, vous avez attrapé un banc de poissons !'],
      fail: ["Rien n'a mordu cette fois…", 'La ligne a cassé au dernier moment !']
    },
    kiss: {
      success: ['Un baiser qui fait fondre les cœurs…', 'Doux moment, tout le monde est conquis.'],
      fail: ["Moment gênant… ce n'était pas réciproque.", 'Oups, malentendu.']
    },
    lick: {
      success: ['Un coup de langue bien placé…', 'Tu fais monter la température.'],
      fail: ['Tu tentes… mais on te repousse gentiment.', 'Ambiance un peu gênante cette fois.']
    },
    flirt: {
      success: ["Votre clin d'œil a fait mouche ✨", "Votre charme opère irrésistiblement."],
      fail: ["On vous a mis un râteau…", "Pas réceptif aujourd'hui."]
    },
    seduce: {
      success: ["Séduction réussie, quelle prestance !", 'Vous avez fait chavirer des cœurs.'],
      fail: ["Raté… la magie n'a pas pris.", "Trop direct, ça n'a pas marché."]
    },
    suck: {
      success: ['Tu prends ton temps… le regard devient fiévreux.', "Tu alternes douceur et intensité, c'est torride."],
      fail: ['Tu tentes, mais on te repousse gentiment.', "Mauvais timing, ça refroidit l'ambiance."]
    },
    nibble: {
      success: ['Morsure douce dans le cou… frisson garanti.', "Tu mordilles ses lèvres, c'est électrique.", "Petite morsure à l'épaule, souffle court."],
      fail: ['Il/elle préfère éviter la morsure maintenant.', 'Mauvais timing pour mordre, vous ralentissez.']
    },
    branler: {
      success: ['Mouvements maîtrisés, le souffle se fait court…', 'Rythme assuré, la tension monte.'],
      fail: ["Tu tentes, mais il/elle préfère ralentir.", "Pas le bon moment, on s'arrête."]
    },
    doigter: {
      success: ['Doigts habiles, regards qui se croisent…', 'Tu explores avec douceur et assurance.'],
      fail: ["Tu t'approches, mais il/elle n'est pas à l'aise.", "On préfère en parler d'abord."]
    },
    revive: {
      success: ['Bouche-à-bouche efficace, le souffle revient !', 'Massage cardiaque précis, il/elle ouvre les yeux.'],
      fail: ['Tu paniques, les gestes ne sont pas coordonnés…', 'Rien pour le moment, continue les compressions.']
    },
    comfort: {
      success: ['Tu le/la prends délicatement dans tes bras.', 'Mots doux murmurés, les épaules se relâchent.', 'Un câlin chaleureux réchauffe son cœur.'],
      fail: ['Tu cherches les mots… silence maladroit.', "Tu t'approches, mais il/elle préfère rester seul(e) pour l'instant."]
    },
    tickle: {
      success: ['Des rires éclatent, mission chatouilles réussie !', 'Tu déclenches une crise de fou rire.'],
      fail: ["Pas d'humeur à rire…", "Tu t'y prends mal, ça ne chatouille pas."]
    },
    fuck: {
      success: ['Nuit torride 😈', 'Explosion de passion…'],
      fail: ['Mauvais timing…', "Ça ne l'a pas fait cette fois." ]
    },
    sodo: {
      success: ['Tu le/la prends par derrière avec intensité 🔥', 'Vous vous abandonnez à une sodomie passionnée 😈', 'Rythme assuré, consentement total et plaisir partagé.'],
      fail: ["Vous tentez… mais ce n'est pas le bon moment.", "Sans préparation, impossible d'y arriver correctement.", 'On arrête: confort avant tout.']
    },
    orgasme: {
      success: ["Tu le/la guides jusqu'à l'extase, souffle coupé…", 'Plaisir partagé, frissons et regards complices.', 'Climax atteint, sourire aux lèvres.'],
      fail: ["Le moment n'y est pas, vous préférez ralentir.", 'On communique et on remet ça plus tard.']
    },
    massage: {
      success: ['Relaxation totale, mains de fée !', 'Vous avez détendu toutes les tensions.'],
      fail: ["Crampes… ce n'était pas si relaxant.", 'Un peu trop appuyé…']
    },
    dance: {
      success: ['Vous avez enflammé la piste 💃', 'Quel rythme ! Tout le monde a adoré.'],
      fail: ["Deux pieds gauches aujourd'hui…", 'Le tempo vous a échappé.']
    },
    crime: {
      success: ['Coup monté propre et net.', 'Plan parfait, personne ne vous a vu.'],
      fail: ['La police vous a cueilli net…', 'Un complice vous a trahi.']
    },
    steal: {
      success: ['Vol réussi, quelle dextérité !', 'Vous avez filé avec le butin.'],
      fail: ['Pris la main dans le sac…', 'La cible vous a repéré !']
    },
    // Hot & Fun
    shower: {
      success: ['Douche chaude… ou froide surprise 😏🚿', 'Ça chauffe sous la douche !'],
      fail: ["L'eau est glacée… brrr !", 'Oups, la serviette a glissé…']
    },
    wet: {
      success: ['Ambiance humide garantie 💧', 'Ça devient glissant…'],
      fail: ['Rien à signaler… trop sec.']
    },
    bed: {
      success: ['Invitation au lit acceptée 😏', 'Le lit vous tend les bras.'],
      fail: ["Pas d'humeur pour se coucher."]
    },
    undress: {
      success: ['Déshabillage progressif engagé…', 'Tout en douceur.'],
      fail: ['Boutons récalcitrants…']
    },
    // Domination / Soumission
    collar: {
      success: ['Collier posé 🔗', 'Un lien se crée…'],
      fail: ['Refusé…']
    },
    leash: {
      success: ['En laisse 🐾', 'Suivez-moi.'],
      fail: ["La laisse s'échappe…"]
    },
    kneel: {
      success: ['À genoux, bon/ne soumis/e.', 'Obéissance parfaite.'],
      fail: ['Résistance détectée.']
    },
    order: {
      success: ['Ordre donné, exécution immédiate.', 'Vous imposez votre volonté.'],
      fail: ['Ordre ignoré…']
    },
    punish: {
      success: ['Punition appliquée 😈', 'Leçon mémorable.'],
      fail: ['Grâce accordée.']
    },
    // Séduction & RP doux
    rose: {
      success: ['Une rose offerte 🌹', 'Le cœur fond.'],
      fail: ['La rose fane…']
    },
    wine: {
      success: ['Verre partagé 🍷', 'Tchin !'],
      fail: ['Pas de verre ce soir.']
    },
    pillowfight: {
      success: ["Bataille d'oreillers épique 🛏️", 'Pluie de plumes !'],
      fail: ['Oreillers introuvables…']
    },
    sleep: {
      success: ['Endormi dans ses bras 💤', 'Rêves doux.'],
      fail: ['Insomnie…']
    },
    // Délires coquins / Jeux
    oops: {
      success: ["Oups, j'ai glissé…", 'Quelle maladresse sexy !'],
      fail: ['On refait ?']
    },
    caught: {
      success: ['Surpris en flagrant délit 👀', 'Pris sur le fait !'],
      fail: ['Personne ne vous a vu.']
    },
    tromper: {
      success: [
        'Tu surprends la cible en train de te tromper… tu renverses la situation. 😈',
        "Pris en flagrant délit avec un(e) autre… et pourtant, c'était toi qui gagnes la partie.",
        "Découverte chaude: un(e) troisième s'en mêle, mais tu reprends l'avantage."
      ],
      fail: [
        "Tout s'écroule: tu es pris(e) sur le fait…",
        'Ça tourne mal: la cible vous surprend, la honte et la perte retombent sur toi.',
        'Le plan foire: exposé(e) au grand jour, tu perds gros.'
      ]
    },
    orgie: {
      success: [
        'Orgie réussie: tout le monde repart comblé.',
        "Exultation collective, c'était intense et consentie.",
      ],
      fail: [
        'Orgie avortée: ambiance cassée, on remballe.',
        'Ça ne prend pas cette fois, chacun rentre frustré.',
      ]
    }
  };
  for (const [k, def] of Object.entries(msgDefaults)) {
    if (!e.actions.messages[k] || typeof e.actions.messages[k] !== 'object') e.actions.messages[k] = { success: [], fail: [] };
    const em = e.actions.messages[k];
    if (!Array.isArray(em.success)) em.success = [];
    if (!Array.isArray(em.fail)) em.fail = [];
    if (em.success.length === 0 && Array.isArray(def.success)) em.success = [...def.success];
    if (em.fail.length === 0 && Array.isArray(def.fail)) em.fail = [...def.fail];
  }
  if (!e.shop || typeof e.shop !== 'object') e.shop = { items: [], roles: [], grants: {} };
  else {
    if (!Array.isArray(e.shop.items)) e.shop.items = [];
    if (!Array.isArray(e.shop.roles)) e.shop.roles = [];
    if (!e.shop.grants || typeof e.shop.grants !== 'object') e.shop.grants = {};
  }
  if (!e.suites || typeof e.suites !== 'object') e.suites = { durations: { day: 1, week: 7, month: 30 }, categoryId: '', prices: { day: 1000, week: 5000, month: 20000 }, active: {}, emoji: '💞' };
  else {
    if (!e.suites.durations || typeof e.suites.durations !== 'object') e.suites.durations = { day: 1, week: 7, month: 30 };
    if (typeof e.suites.categoryId !== 'string') e.suites.categoryId = '';
    if (!e.suites.prices || typeof e.suites.prices !== 'object') e.suites.prices = { day: 1000, week: 5000, month: 20000 };
    if (typeof e.suites.prices.day !== 'number') e.suites.prices.day = 1000;
    if (typeof e.suites.prices.week !== 'number') e.suites.prices.week = 5000;
    if (typeof e.suites.prices.month !== 'number') e.suites.prices.month = 20000;
    if (!e.suites.active || typeof e.suites.active !== 'object') e.suites.active = {};
    if (typeof e.suites.emoji !== 'string' || !e.suites.emoji) e.suites.emoji = '💞';
  }
  if (!e.balances || typeof e.balances !== 'object') e.balances = {};
  if (!e.karmaModifiers || typeof e.karmaModifiers !== 'object') e.karmaModifiers = { shop: [], actions: [], grants: [] };
  else {
    if (!Array.isArray(e.karmaModifiers.shop)) e.karmaModifiers.shop = [];
    if (!Array.isArray(e.karmaModifiers.actions)) e.karmaModifiers.actions = [];
    if (!Array.isArray(e.karmaModifiers.grants)) e.karmaModifiers.grants = [];
  }
  if (!e.booster || typeof e.booster !== 'object') e.booster = { enabled: true, textXpMult: 2, voiceXpMult: 2, actionCooldownMult: 0.5, shopPriceMult: 0.5, roles: [] };
  else {
    if (typeof e.booster.enabled !== 'boolean') e.booster.enabled = true;
    if (typeof e.booster.textXpMult !== 'number') e.booster.textXpMult = 2;
    if (typeof e.booster.voiceXpMult !== 'number') e.booster.voiceXpMult = 2;
    if (typeof e.booster.actionCooldownMult !== 'number') e.booster.actionCooldownMult = 0.5;
    if (typeof e.booster.shopPriceMult !== 'number') e.booster.shopPriceMult = 0.5;
    if (!Array.isArray(e.booster.roles)) e.booster.roles = [];
  }
}

function ensureTruthDareShape(g) {
  if (!g.truthdare || typeof g.truthdare !== 'object') g.truthdare = {};
  const td = g.truthdare;
  if (!td.sfw || typeof td.sfw !== 'object') td.sfw = { channels: [], prompts: [], nextId: 1 };
  if (!td.nsfw || typeof td.nsfw !== 'object') td.nsfw = { channels: [], prompts: [], nextId: 1 };
  if (!Array.isArray(td.sfw.channels)) td.sfw.channels = [];
  if (!Array.isArray(td.sfw.prompts)) td.sfw.prompts = [];
  if (typeof td.sfw.nextId !== 'number') td.sfw.nextId = 1;
  if (!Array.isArray(td.nsfw.channels)) td.nsfw.channels = [];
  if (!Array.isArray(td.nsfw.prompts)) td.nsfw.prompts = [];
  if (typeof td.nsfw.nextId !== 'number') td.nsfw.nextId = 1;
}

function ensureConfessShape(g) {
  if (!g.confess || typeof g.confess !== 'object') g.confess = {};
  const cf = g.confess;
  if (!cf.sfw || typeof cf.sfw !== 'object') cf.sfw = { channels: [] };
  if (!cf.nsfw || typeof cf.nsfw !== 'object') cf.nsfw = { channels: [] };
  if (!Array.isArray(cf.sfw.channels)) cf.sfw.channels = [];
  if (!Array.isArray(cf.nsfw.channels)) cf.nsfw.channels = [];
  
  // Validate and clean channel IDs - remove any non-string or empty values
  cf.sfw.channels = cf.sfw.channels.filter(id => typeof id === 'string' && id.trim().length > 0);
  cf.nsfw.channels = cf.nsfw.channels.filter(id => typeof id === 'string' && id.trim().length > 0);
  
  if (typeof cf.logChannelId !== 'string') cf.logChannelId = '';
  if (typeof cf.allowReplies !== 'boolean') cf.allowReplies = true;
  if (cf.threadNaming !== 'nsfw' && cf.threadNaming !== 'normal') cf.threadNaming = 'normal';
  if (!Array.isArray(cf.nsfwNames)) cf.nsfwNames = ['Velours', 'Nuit Rouge', 'Écarlate', 'Aphrodite', 'Énigme', 'Saphir', 'Nocturne', 'Scarlett', 'Mystique', 'Aphrodisia'];
  if (typeof cf.counter !== 'number') cf.counter = 1;
}

function ensureTicketsShape(g) {
  if (!g.tickets || typeof g.tickets !== 'object') g.tickets = {};
  const t = g.tickets;
  if (typeof t.enabled !== 'boolean') t.enabled = true;
  if (typeof t.categoryId !== 'string') t.categoryId = '';
  if (typeof t.panelChannelId !== 'string') t.panelChannelId = '';
  if (typeof t.panelMessageId !== 'string') t.panelMessageId = '';
  if (!Array.isArray(t.categories)) {
    t.categories = [
      { key: 'support', label: 'Support', emoji: '🛟', description: 'Décrivez votre problème de support ci-dessous. Un membre du staff vous répondra bientôt.' },
      { key: 'plainte', label: 'Plainte', emoji: '📝', description: 'Expliquez votre plainte avec le plus de détails possible.' },
      { key: 'demande', label: 'Demande', emoji: '💡', description: 'Expliquez votre demande ou votre suggestion ici.' },
    ];
  }
  // Validate categories
  t.categories = t.categories
    .filter(c => c && typeof c === 'object')
    .map(c => {
      const normalized = {
        key: String(c.key || '').trim() || 'cat_' + Math.random().toString(36).slice(2, 8),
        label: String(c.label || c.key || 'Catégorie'),
        emoji: typeof c.emoji === 'string' ? c.emoji : '',
        description: String(c.description || ''),
        bannerUrl: typeof c.bannerUrl === 'string' ? c.bannerUrl : '',
        staffPingRoleIds: Array.isArray(c.staffPingRoleIds) ? c.staffPingRoleIds.map(String) : [],
        extraViewerRoleIds: Array.isArray(c.extraViewerRoleIds) ? c.extraViewerRoleIds.map(String) : [],
        accessRoleIds: Array.isArray(c.accessRoleIds) ? c.accessRoleIds.map(String) : [],
        staffAccessRoleIds: Array.isArray(c.staffAccessRoleIds) ? c.staffAccessRoleIds.map(String) : [],
        excludeRoleIds: Array.isArray(c.excludeRoleIds) ? c.excludeRoleIds.map(String) : [],
        showCertified: c.showCertified === false ? false : true,
        memberRoleAdd: typeof c.memberRoleAdd === 'string' ? c.memberRoleAdd : '',
        memberRoleRemove: typeof c.memberRoleRemove === 'string' ? c.memberRoleRemove : '',
      };
      // Préserver tous les autres champs non-standards
      Object.keys(c).forEach(k => {
        if (!(k in normalized)) {
          normalized[k] = c[k];
        }
      });
      return normalized;
    });
  if (typeof t.counter !== 'number') t.counter = 1;
  if (!t.records || typeof t.records !== 'object') t.records = {};
  if (typeof t.panelTitle !== 'string') t.panelTitle = '🎫 Ouvrir un ticket';
  if (typeof t.panelText !== 'string') t.panelText = 'Choisissez une catégorie pour créer un ticket. Un membre du staff vous assistera.';
  if (typeof t.logChannelId !== 'string') t.logChannelId = '';
  if (typeof t.pingStaffOnOpen !== 'boolean') t.pingStaffOnOpen = false;
  if (typeof t.transcriptChannelId !== 'string') t.transcriptChannelId = '';
  if (!t.transcript || typeof t.transcript !== 'object') t.transcript = { style: 'pro' };
  if (!['pro','premium','classic'].includes(t.transcript.style)) t.transcript.style = 'pro';
  // Ticket naming configuration
  if (!t.naming || typeof t.naming !== 'object') t.naming = { mode: 'ticket_num', customPattern: '' };
  if (!['ticket_num','member_num','category_num','custom','numeric','date_num'].includes(t.naming.mode)) t.naming.mode = 'ticket_num';
  if (typeof t.naming.customPattern !== 'string') t.naming.customPattern = '';
  // Certified role configuration
  if (typeof t.certifiedRoleId !== 'string') t.certifiedRoleId = '';
  // Ticket panel banner url (overrides local bag2.png)
  if (typeof t.bannerUrl !== 'string') t.bannerUrl = '';
}

async function getTicketsConfig(guildId) {
  const cfg = await readConfig();
  if (!cfg.guilds[guildId]) cfg.guilds[guildId] = {};
  ensureTicketsShape(cfg.guilds[guildId]);
  return cfg.guilds[guildId].tickets;
}

async function updateTicketsConfig(guildId, partial) {
  const cfg = await readConfig();
  if (!cfg.guilds[guildId]) cfg.guilds[guildId] = {};
  ensureTicketsShape(cfg.guilds[guildId]);
  cfg.guilds[guildId].tickets = { ...cfg.guilds[guildId].tickets, ...partial };
  await writeConfig(cfg);
  return cfg.guilds[guildId].tickets;
}

async function addTicketCategory(guildId, category) {
  const cfg = await readConfig();
  if (!cfg.guilds[guildId]) cfg.guilds[guildId] = {};
  ensureTicketsShape(cfg.guilds[guildId]);
  const t = cfg.guilds[guildId].tickets;
  const entry = {
    key: String(category.key || '').trim() || 'cat_' + Math.random().toString(36).slice(2, 8),
    label: String(category.label || 'Catégorie'),
    emoji: typeof category.emoji === 'string' ? category.emoji : '',
    description: String(category.description || ''),
    staffPingRoleIds: Array.isArray(category.staffPingRoleIds) ? category.staffPingRoleIds.map(String) : [],
    extraViewerRoleIds: Array.isArray(category.extraViewerRoleIds) ? category.extraViewerRoleIds.map(String) : [],
    accessRoleIds: Array.isArray(category.accessRoleIds) ? category.accessRoleIds.map(String) : [],
    staffAccessRoleIds: Array.isArray(category.staffAccessRoleIds) ? category.staffAccessRoleIds.map(String) : [],
    excludeRoleIds: Array.isArray(category.excludeRoleIds) ? category.excludeRoleIds.map(String) : [],
    bannerUrl: typeof category.bannerUrl === 'string' ? category.bannerUrl : ''
  };
  if (!Array.isArray(t.categories)) t.categories = [];
  // Avoid duplicate keys
  const exists = t.categories.some(c => c.key === entry.key);
  if (!exists) t.categories.push(entry);
  await writeConfig(cfg);
  return t.categories;
}

async function removeTicketCategory(guildId, key) {
  const cfg = await readConfig();
  if (!cfg.guilds[guildId]) return [];
  ensureTicketsShape(cfg.guilds[guildId]);
  const t = cfg.guilds[guildId].tickets;
  t.categories = (t.categories || []).filter(c => c.key !== key);
  await writeConfig(cfg);
  return t.categories;
}

async function addTicketRecord(guildId, channelId, userId, categoryKey) {
  const cfg = await readConfig();
  console.log('[addTicketRecord] Début - guildId:', guildId, 'channelId:', channelId);
  if (!cfg.guilds[guildId]) cfg.guilds[guildId] = {};
  ensureTicketsShape(cfg.guilds[guildId]);
  const t = cfg.guilds[guildId].tickets;
  const id = String(channelId);
  t.records[id] = {
    userId: String(userId),
    categoryKey: String(categoryKey || ''),
    createdAt: Date.now(),
    claimedBy: '',
    closedAt: 0,
  };
  console.log('[addTicketRecord] writeConfig terminé, record sauvegardé');
  t.counter = (typeof t.counter === 'number' ? t.counter : 0) + 1;
  await writeConfig(cfg);
  return t.records[id];
}

async function setTicketClaim(guildId, channelId, staffUserId) {
  const cfg = await readConfig();
  if (!cfg.guilds[guildId]) return null;
  ensureTicketsShape(cfg.guilds[guildId]);
  const t = cfg.guilds[guildId].tickets;
  const rec = t.records[String(channelId)];
  console.log('[setTicketClaim] channelId:', channelId, '- Record:', rec ? 'TROUVÉ' : 'NON TROUVÉ');
  console.log('[setTicketClaim] channelId:', channelId, '- Record:', rec ? 'TROUVÉ' : 'NON TROUVÉ');
  if (!rec) return null;
  rec.claimedBy = String(staffUserId || '');
  await writeConfig(cfg);
  return rec;
}

async function closeTicketRecord(guildId, channelId) {
  const cfg = await readConfig();
  if (!cfg.guilds[guildId]) return null;
  ensureTicketsShape(cfg.guilds[guildId]);
  const t = cfg.guilds[guildId].tickets;
  const rec = t.records[String(channelId)];
  if (!rec) return null;
  rec.closedAt = Date.now();
  await writeConfig(cfg);
  return rec;
}

function ensureAutoThreadShape(g) {
  if (!g.autothread || typeof g.autothread !== 'object') g.autothread = {};
  const at = g.autothread;
  if (!Array.isArray(at.channels)) at.channels = [];
  
  // Validate and clean channel IDs - remove any non-string or empty values
  at.channels = at.channels.filter(id => typeof id === 'string' && id.trim().length > 0);
  
  if (!at.naming || typeof at.naming !== 'object') at.naming = { mode: 'member_num', customPattern: '' };
  if (!['member_num','custom','nsfw','numeric','date_num'].includes(at.naming.mode)) at.naming.mode = 'member_num';
  if (typeof at.naming.customPattern !== 'string') at.naming.customPattern = '';
  if (!at.archive || typeof at.archive !== 'object') at.archive = { policy: '7d' };
  if (!['1d','7d','1m','max'].includes(at.archive.policy)) at.archive.policy = '7d';
  if (typeof at.counter !== 'number') at.counter = 1;
  if (!Array.isArray(at.nsfwNames)) at.nsfwNames = ['Velours','Nuit Rouge','Écarlate','Aphrodite','Énigme','Saphir','Nocturne','Scarlett','Mystique','Aphrodisia'];
}

function ensureCountingShape(g) {
  if (!g.counting || typeof g.counting !== 'object') g.counting = {};
  const c = g.counting;
  if (!Array.isArray(c.channels)) c.channels = [];
  if (typeof c.allowFormulas !== 'boolean') c.allowFormulas = true;
  if (!c.state || typeof c.state !== 'object') c.state = { current: 0, lastUserId: '' };
  if (typeof c.state.current !== 'number') c.state.current = 0;
  if (typeof c.state.lastUserId !== 'string') c.state.lastUserId = '';
  if (!Array.isArray(c.achievedNumbers)) c.achievedNumbers = [];
}
function ensureDisboardShape(g) {
  if (!g.disboard || typeof g.disboard !== 'object') g.disboard = {};
  const d = g.disboard;
  if (typeof d.lastBumpAt !== 'number') d.lastBumpAt = 0;
  if (typeof d.lastBumpChannelId !== 'string') d.lastBumpChannelId = '';
  if (typeof d.reminded !== 'boolean') d.reminded = false;
}

function ensureLogsShape(g) {
  if (!g.logs || typeof g.logs !== 'object') {
    g.logs = {
      enabled: false,
      channelId: '',
      pseudo: true,
      emoji: '📝',
      categories: {
        moderation: true,
        voice: true,
        economy: true,
        boosts: true,
        threads: true,
        joinleave: true,
        messages: true,
        backup: true,
        channels: false,
        roles: false,
        emojis: false,
        members: false,
        invites: false,
        tickets: false
      },
      channels: {
        moderation: '',
        voice: '',
        economy: '',
        boosts: '',
        threads: '',
        joinleave: '',
        messages: '',
        backup: '',
        channels: '',
        roles: '',
        emojis: '',
        members: '',
        invites: '',
        tickets: ''
      }
    };
  } else {
    if (typeof g.logs.enabled !== 'boolean') g.logs.enabled = false;
    if (typeof g.logs.channelId !== 'string') g.logs.channelId = '';
    if (typeof g.logs.pseudo !== 'boolean') g.logs.pseudo = true;
    if (typeof g.logs.emoji !== 'string' || !g.logs.emoji) g.logs.emoji = '📝';
    if (typeof g.logs.embedImageUrl !== 'string') g.logs.embedImageUrl = '';
    if (!g.logs.categories || typeof g.logs.categories !== 'object') g.logs.categories = { moderation: true, voice: true, economy: true, boosts: true, threads: true, joinleave: true, messages: true, backup: true };
    for (const k of ['moderation','voice','economy','boosts','threads','joinleave','messages','backup','channels','roles','emojis','members','invites','tickets']) if (typeof g.logs.categories[k] !== 'boolean') g.logs.categories[k] = (['moderation','voice','economy','boosts','threads','joinleave','messages','backup'].includes(k));
    if (!g.logs.channels || typeof g.logs.channels !== 'object') g.logs.channels = { moderation: '', voice: '', economy: '', boosts: '', threads: '', joinleave: '', messages: '', backup: '' };
    for (const k of ['moderation','voice','economy','boosts','threads','joinleave','messages','backup','channels','roles','emojis','members','invites','tickets']) if (typeof g.logs.channels[k] !== 'string') g.logs.channels[k] = '';
  }
}

function ensureGeoShape(g) {
  if (!g.geo || typeof g.geo !== 'object') g.geo = {};
  const geo = g.geo;
  if (!geo.locations || typeof geo.locations !== 'object') geo.locations = {}; // userId -> { lat, lon, city, updatedAt }
}

async function getTruthDareConfig(guildId) {
  const cfg = await readConfig();
  if (!cfg.guilds[guildId]) cfg.guilds[guildId] = {};
  ensureTruthDareShape(cfg.guilds[guildId]);
  return cfg.guilds[guildId].truthdare;
}

async function getGeoConfig(guildId) {
  const cfg = await readConfig();
  if (!cfg.guilds[guildId]) cfg.guilds[guildId] = {};
  ensureGeoShape(cfg.guilds[guildId]);
  return cfg.guilds[guildId].geo;
}

async function getLogsConfig(guildId) {
  const cfg = await readConfig();
  if (!cfg.guilds[guildId]) cfg.guilds[guildId] = {};
  ensureLogsShape(cfg.guilds[guildId]);
  return cfg.guilds[guildId].logs;
}

async function updateLogsConfig(guildId, partial) {
  const cfg = await readConfig();
  if (!cfg.guilds[guildId]) cfg.guilds[guildId] = {};
  ensureLogsShape(cfg.guilds[guildId]);
  cfg.guilds[guildId].logs = { ...cfg.guilds[guildId].logs, ...partial };
  await writeConfig(cfg);
  return cfg.guilds[guildId].logs;
}

async function getCountingConfig(guildId) {
  const cfg = await readConfig();
  if (!cfg.guilds[guildId]) cfg.guilds[guildId] = {};
  ensureCountingShape(cfg.guilds[guildId]);
  return cfg.guilds[guildId].counting;
}

async function updateCountingConfig(guildId, partial) {
  const cfg = await readConfig();
  if (!cfg.guilds[guildId]) cfg.guilds[guildId] = {};
  ensureCountingShape(cfg.guilds[guildId]);
  const cur = cfg.guilds[guildId].counting;
  cfg.guilds[guildId].counting = { ...cur, ...partial };
  await writeConfig(cfg, "counting");
  return cfg.guilds[guildId].counting;
}

async function setCountingState(guildId, state) {
  const cfg = await readConfig();
  if (!cfg.guilds[guildId]) cfg.guilds[guildId] = {};
  ensureCountingShape(cfg.guilds[guildId]);
  cfg.guilds[guildId].counting.state = { ...(cfg.guilds[guildId].counting.state || {}), ...state };
  await writeConfig(cfg, "counting");
  return cfg.guilds[guildId].counting.state;
}
async function getDisboardConfig(guildId) {
  const cfg = await readConfig();
  if (!cfg.guilds[guildId]) cfg.guilds[guildId] = {};
  ensureDisboardShape(cfg.guilds[guildId]);
  return cfg.guilds[guildId].disboard;
}
async function updateDisboardConfig(guildId, partial) {
  const cfg = await readConfig();
  if (!cfg.guilds[guildId]) cfg.guilds[guildId] = {};
  ensureDisboardShape(cfg.guilds[guildId]);
  const cur = cfg.guilds[guildId].disboard || {};
  cfg.guilds[guildId].disboard = { ...cur, ...partial };
  await writeConfig(cfg);
  return cfg.guilds[guildId].disboard;
}

async function getAutoThreadConfig(guildId) {
  const cfg = await readConfig();
  if (!cfg.guilds[guildId]) cfg.guilds[guildId] = {};
  ensureAutoThreadShape(cfg.guilds[guildId]);
  return cfg.guilds[guildId].autothread;
}

async function updateAutoThreadConfig(guildId, partial) {
  const cfg = await readConfig();
  if (!cfg.guilds[guildId]) cfg.guilds[guildId] = {};
  ensureAutoThreadShape(cfg.guilds[guildId]);
  const current = cfg.guilds[guildId].autothread;
  
  // Validate channels if being updated
  if (partial.channels) {
    partial.channels = partial.channels.filter(id => typeof id === 'string' && id.trim().length > 0);
  }
  
  cfg.guilds[guildId].autothread = { ...current, ...partial };
  await writeConfig(cfg);
  return cfg.guilds[guildId].autothread;
}

async function getConfessConfig(guildId) {
  const cfg = await readConfig();
  if (!cfg.guilds[guildId]) cfg.guilds[guildId] = {};
  ensureConfessShape(cfg.guilds[guildId]);
  return cfg.guilds[guildId].confess;
}

async function updateTruthDareConfig(guildId, partial) {
  const cfg = await readConfig();
  if (!cfg.guilds[guildId]) cfg.guilds[guildId] = {};
  ensureTruthDareShape(cfg.guilds[guildId]);
  cfg.guilds[guildId].truthdare = { ...cfg.guilds[guildId].truthdare, ...partial };
  await writeConfig(cfg);
  return cfg.guilds[guildId].truthdare;
}

async function setUserLocation(guildId, userId, lat, lon, city) {
  const cfg = await readConfig();
  if (!cfg.guilds[guildId]) cfg.guilds[guildId] = {};
  ensureGeoShape(cfg.guilds[guildId]);
  const geo = cfg.guilds[guildId].geo;
  geo.locations[String(userId)] = { lat: Number(lat), lon: Number(lon), city: city || '', updatedAt: Date.now() };
  await writeConfig(cfg);
  return geo.locations[String(userId)];
}

async function getUserLocation(guildId, userId) {
  const cfg = await readConfig();
  if (!cfg.guilds[guildId]) return null;
  ensureGeoShape(cfg.guilds[guildId]);
  const geo = cfg.guilds[guildId].geo;
  return geo.locations[String(userId)] || null;
}

async function getAllLocations(guildId) {
  const cfg = await readConfig();
  if (!cfg.guilds[guildId]) return {};
  ensureGeoShape(cfg.guilds[guildId]);
  return cfg.guilds[guildId].geo.locations || {};
}

async function removeUserLocation(guildId, userId) {
  const cfg = await readConfig();
  if (!cfg.guilds[guildId]) return false;
  ensureGeoShape(cfg.guilds[guildId]);
  const geo = cfg.guilds[guildId].geo;
  
  if (geo.locations[String(userId)]) {
    delete geo.locations[String(userId)];
    await writeConfig(cfg);
    console.log(`[GEO] Localisation supprimée pour userId: ${userId} (serveur: ${guildId})`);
    return true;
  }
  return false;
}

async function updateConfessConfig(guildId, partial) {
  const cfg = await readConfig();
  if (!cfg.guilds[guildId]) cfg.guilds[guildId] = {};
  ensureConfessShape(cfg.guilds[guildId]);
  cfg.guilds[guildId].confess = { ...cfg.guilds[guildId].confess, ...partial };
  await writeConfig(cfg);
  return cfg.guilds[guildId].confess;
}

async function addTdChannels(guildId, channelIds, mode = 'sfw') {
  const cfg = await readConfig();
  if (!cfg.guilds[guildId]) cfg.guilds[guildId] = {};
  ensureTruthDareShape(cfg.guilds[guildId]);
  const td = cfg.guilds[guildId].truthdare;
  const set = new Set(td[mode].channels || []);
  for (const id of channelIds) set.add(String(id));
  td[mode].channels = Array.from(set);
  await writeConfig(cfg);
  return td[mode].channels;
}

async function addConfessChannels(guildId, channelIds, mode = 'sfw') {
  const cfg = await readConfig();
  if (!cfg.guilds[guildId]) cfg.guilds[guildId] = {};
  ensureConfessShape(cfg.guilds[guildId]);
  const cf = cfg.guilds[guildId].confess;
  const set = new Set(cf[mode].channels || []);
  for (const id of channelIds) set.add(String(id));
  cf[mode].channels = Array.from(set);
  await writeConfig(cfg);
  return cf[mode].channels;
}

async function removeTdChannels(guildId, channelIds, mode = 'sfw') {
  const cfg = await readConfig();
  if (!cfg.guilds[guildId]) return [];
  ensureTruthDareShape(cfg.guilds[guildId]);
  const td = cfg.guilds[guildId].truthdare;
  const toRemove = new Set(channelIds.map(String));
  td[mode].channels = (td[mode].channels||[]).filter(id => !toRemove.has(String(id)));
  await writeConfig(cfg);
  return td[mode].channels;
}

async function removeConfessChannels(guildId, channelIds, mode = 'sfw') {
  const cfg = await readConfig();
  if (!cfg.guilds[guildId]) return [];
  ensureConfessShape(cfg.guilds[guildId]);
  const cf = cfg.guilds[guildId].confess;
  const toRemove = new Set(channelIds.map(String));
  cf[mode].channels = (cf[mode].channels||[]).filter(id => !toRemove.has(String(id)));
  await writeConfig(cfg);
  return cf[mode].channels;
}

async function incrementConfessCounter(guildId) {
  const cfg = await readConfig();
  if (!cfg.guilds[guildId]) cfg.guilds[guildId] = {};
  ensureConfessShape(cfg.guilds[guildId]);
  const cf = cfg.guilds[guildId].confess;
  cf.counter = (typeof cf.counter === 'number' ? cf.counter : 0) + 1;
  await writeConfig(cfg);
  return cf.counter;
}

async function addTdPrompts(guildId, type, texts, mode = 'sfw') {
  const cfg = await readConfig();
  if (!cfg.guilds[guildId]) cfg.guilds[guildId] = {};
  ensureTruthDareShape(cfg.guilds[guildId]);
  const td = cfg.guilds[guildId].truthdare;
  for (const t of texts) {
    const text = String(t).trim();
    if (!text) continue;
    td[mode].prompts.push({ id: td[mode].nextId++, type, text });
  }
  await writeConfig(cfg);
  return td[mode].prompts;
}

async function deleteTdPrompts(guildId, ids, mode = 'sfw') {
  const cfg = await readConfig();
  if (!cfg.guilds[guildId]) return [];
  ensureTruthDareShape(cfg.guilds[guildId]);
  const td = cfg.guilds[guildId].truthdare;
  const del = new Set(ids.map(n => Number(n)));
  td[mode].prompts = (td[mode].prompts||[]).filter(p => !del.has(Number(p.id)));
  await writeConfig(cfg);
  return td[mode].prompts;
}

async function editTdPrompt(guildId, id, newText, mode = 'sfw') {
  const cfg = await readConfig();
  if (!cfg.guilds[guildId]) return null;
  ensureTruthDareShape(cfg.guilds[guildId]);
  const td = cfg.guilds[guildId].truthdare;
  const pid = Number(id);
  if (!Number.isFinite(pid)) return null;
  const list = Array.isArray(td[mode]?.prompts) ? td[mode].prompts : [];
  const idx = list.findIndex(p => Number(p.id) === pid);
  if (idx === -1) return null;
  const text = String(newText || '').trim();
  if (!text) return null;
  list[idx].text = text;
  await writeConfig(cfg);
  return list[idx];
}

// Ensure economy shape on getGuildConfig and getEconomyConfig

const paths = {
  get DATA_DIR() { return DATA_DIR; },
  get CONFIG_PATH() { return CONFIG_PATH; }
};

module.exports = {
  ensureStorageExists,
  readConfig,
  writeConfig,
  getGuildConfig,
  getGuildStaffRoleIds,
  setGuildStaffRoleIds,
  // Tickets
  getTicketsConfig,
  updateTicketsConfig,
  addTicketCategory,
  removeTicketCategory,
  addTicketRecord,
  setTicketClaim,
  closeTicketRecord,
  getAutoKickConfig,
  updateAutoKickConfig,
  addPendingJoiner,
  removePendingJoiner,
  updateMemberActivity,
  setPlannedInactivity,
  removePlannedInactivity,
  getInactivityTracking,
  updateLastInactivityCheck,
  // Levels
  getLevelsConfig,
  updateLevelsConfig,
  getUserStats,
  setUserStats,
  // Economy
  getEconomyConfig,
  updateEconomyConfig,
  getEconomyUser,
  setEconomyUser,
  getTruthDareConfig,
  updateTruthDareConfig,
  addTdChannels,
  removeTdChannels,
  addTdPrompts,
  deleteTdPrompts,
  editTdPrompt,
  // Geo
  getGeoConfig,
  setUserLocation,
  getUserLocation,
  getAllLocations,
  removeUserLocation,
  getAutoThreadConfig,
  updateAutoThreadConfig,
  getLogsConfig,
  updateLogsConfig,
  // Counting
  getCountingConfig,
  updateCountingConfig,
  setCountingState,
  getDisboardConfig,
  updateDisboardConfig,
  // Confess
  getConfessConfig,
  updateConfessConfig,
  addConfessChannels,
  removeConfessChannels,
  incrementConfessCounter,
  // Moderation
  getWarns,
  addWarn,
  // Backup & Restore
  backupNow,
  restoreLatest,
  restoreFromBackupFile,
  restoreFromFreeboxFile,
  listFreeboxBackups,
  paths,
  getGuildFooterLogo,
  setGuildFooterLogo,
  getGuildCategoryBanners,
  setGuildCategoryBanner,
};

// Moderation: warnings storage
async function getWarns(guildId, userId) {
  const cfg = await readConfig();
  if (!cfg.guilds[guildId]) cfg.guilds[guildId] = {};
  if (!cfg.guilds[guildId].moderation) cfg.guilds[guildId].moderation = {};
  if (!cfg.guilds[guildId].moderation.warns) cfg.guilds[guildId].moderation.warns = {};
  const list = cfg.guilds[guildId].moderation.warns[userId] || [];
  return Array.isArray(list) ? list : [];
}

async function addWarn(guildId, userId, entry) {
  const cfg = await readConfig();
  if (!cfg.guilds[guildId]) cfg.guilds[guildId] = {};
  if (!cfg.guilds[guildId].moderation) cfg.guilds[guildId].moderation = {};
  if (!cfg.guilds[guildId].moderation.warns) cfg.guilds[guildId].moderation.warns = {};
  const now = Date.now();
  const rec = { at: now, ...entry };
  const prev = Array.isArray(cfg.guilds[guildId].moderation.warns[userId]) ? cfg.guilds[guildId].moderation.warns[userId] : [];
  cfg.guilds[guildId].moderation.warns[userId] = [...prev, rec];
  await writeConfig(cfg);
  return rec;
}

