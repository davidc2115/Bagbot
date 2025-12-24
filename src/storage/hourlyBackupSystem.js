/**
 * SYSTÈME UNIQUE DE SAUVEGARDE
 * 
 * Ce système gère TOUS les backups du bot :
 * 1. Backup automatique toutes les heures
 * 2. Backup manuel via /backup
 * 3. Rétention de 72 heures (3 jours)
 * 4. Nettoyage automatique des backups obsolètes
 * 
 * Tous les autres systèmes de backup automatique sont désactivés.
 */

const fs = require('fs');
const fsp = fs.promises;
const path = require('path');

class HourlyBackupSystem {
  constructor(configPath = '/home/bagbot/Bag-bot/data/config.json') {
    this.configPath = configPath;
    this.backupDir = path.join(path.dirname(configPath), 'backups', 'hourly');
    this.retentionHours = 72; // 3 jours = 72 heures
    this.backupInterval = null;
    this.cleanupInterval = null;
    this.lastBackupTime = null;
    // Éviter les doublons (redémarrages, plusieurs schedulers, etc.)
    this.minIntervalMs = 55 * 60 * 1000; // 55 minutes
    this.lockFile = path.join(this.backupDir, '.hourly-backup.lock');
    this.firstRunTimeout = null;
  }

  /**
   * Démarrer le système de backup automatique
   */
  start() {
    console.log('[HourlyBackup] 🚀 Démarrage du système de sauvegarde horaire');
    console.log(`[HourlyBackup] Rétention: ${this.retentionHours}h (${this.retentionHours / 24} jours)`);
    console.log(`[HourlyBackup] Fréquence: Toutes les heures`);
    
    // Planifier la première sauvegarde au prochain "top-of-hour" (évite
    // les doublons au démarrage et s'aligne avec l'heure).
    const now = new Date();
    const next = new Date(now);
    next.setMinutes(0, 0, 0);
    next.setHours(next.getHours() + 1);
    const delayMs = Math.max(5_000, next.getTime() - now.getTime());

    this.firstRunTimeout = setTimeout(() => {
      this.createBackup({ reason: 'auto' }).catch(err => {
        console.error('[HourlyBackup] Erreur backup automatique:', err.message);
      });

      // Ensuite toutes les heures
      this.backupInterval = setInterval(() => {
        this.createBackup({ reason: 'auto' }).catch(err => {
          console.error('[HourlyBackup] Erreur backup automatique:', err.message);
        });
      }, 60 * 60 * 1000);
    }, delayMs);
    
    // Nettoyer les vieux backups toutes les 6 heures
    this.cleanupInterval = setInterval(() => {
      this.cleanOldBackups().catch(err => {
        console.error('[HourlyBackup] Erreur nettoyage:', err.message);
      });
    }, 6 * 60 * 60 * 1000); // 6 heures
    
    console.log(`[HourlyBackup] ✅ Système démarré - Prochaine sauvegarde à ${next.toLocaleString('fr-FR')}`);
  }

  /**
   * Arrêter le système
   */
  stop() {
    if (this.firstRunTimeout) {
      clearTimeout(this.firstRunTimeout);
      this.firstRunTimeout = null;
    }
    if (this.backupInterval) {
      clearInterval(this.backupInterval);
      this.backupInterval = null;
    }
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
    console.log('[HourlyBackup] ⏹️  Système arrêté');
  }

  async getLatestBackupInfo() {
    try {
      await fsp.mkdir(this.backupDir, { recursive: true });
      const files = await fsp.readdir(this.backupDir);
      const backupFiles = files
        .filter(f => f.startsWith('backup-') && f.endsWith('.json'))
        .map(f => path.join(this.backupDir, f));

      if (backupFiles.length === 0) return null;

      let newest = null;
      for (const p of backupFiles) {
        try {
          const st = await fsp.stat(p);
          if (!newest || st.mtimeMs > newest.mtimeMs) {
            newest = { filepath: p, filename: path.basename(p), mtimeMs: st.mtimeMs };
          }
        } catch (_) {}
      }
      return newest;
    } catch (_) {
      return null;
    }
  }

  async acquireLock({ staleMs = 2 * 60 * 1000 } = {}) {
    await fsp.mkdir(this.backupDir, { recursive: true });
    // Nettoyer un lock stale (crash)
    try {
      const st = await fsp.stat(this.lockFile);
      const age = Date.now() - st.mtimeMs;
      if (age > staleMs) {
        await fsp.unlink(this.lockFile).catch(() => {});
      }
    } catch (_) {}

    try {
      const fd = await fsp.open(this.lockFile, 'wx');
      await fd.writeFile(JSON.stringify({ pid: process.pid, at: Date.now() }, null, 2), 'utf8');
      await fd.close();
      return true;
    } catch (e) {
      if (e && (e.code === 'EEXIST' || e.code === 'EACCES')) return false;
      throw e;
    }
  }

  async releaseLock() {
    await fsp.unlink(this.lockFile).catch(() => {});
  }

  /**
   * Créer une sauvegarde horaire
   */
  async createBackup({ force = false, reason = 'auto' } = {}) {
    try {
      const startTime = Date.now();

      // Anti-duplication: si un backup récent existe (ex: redémarrage), on saute.
      if (!force) {
        const latest = await this.getLatestBackupInfo();
        if (latest && (Date.now() - latest.mtimeMs) < this.minIntervalMs) {
          const mins = Math.round((Date.now() - latest.mtimeMs) / 60000);
          console.log(`[HourlyBackup] ⏭️  Backup ignoré (${reason}) - dernier backup il y a ${mins} min: ${latest.filename}`);
          return { success: true, skipped: true, reason: 'recent_backup', last: latest.filename };
        }
      }

      // Lock: évite les backups en parallèle
      const locked = await this.acquireLock().catch(() => false);
      if (!locked) {
        console.log(`[HourlyBackup] ⏳ Backup déjà en cours - ignoré (${reason})`);
        return { success: true, skipped: true, reason: 'locked' };
      }
      
      // Lire la configuration actuelle
      const configData = JSON.parse(await fsp.readFile(this.configPath, 'utf8'));
      
      // Vérifier la structure
      if (!configData || !configData.guilds) {
        console.error('[HourlyBackup] ❌ Config invalide - pas de guilds');
        return { success: false, error: 'invalid_structure' };
      }
      
      // Compter les utilisateurs pour validation
      let userCount = 0;
      let guildCount = Object.keys(configData.guilds).length;
      
      for (const guildId in configData.guilds) {
        const guild = configData.guilds[guildId];
        if (guild.economy?.balances) {
          userCount += Object.keys(guild.economy.balances).length;
        }
      }
      
      // Vérification de sécurité : ne pas sauvegarder si trop peu d'utilisateurs
      if (userCount < 10) {
        console.error(`[HourlyBackup] ⚠️  ALERTE: Seulement ${userCount} utilisateurs - BACKUP ANNULÉ`);
        return { success: false, error: 'too_few_users', userCount };
      }
      
      // Créer le dossier de backup
      await fsp.mkdir(this.backupDir, { recursive: true });
      
      // Nom du fichier avec timestamp
      const now = new Date();
      const timestamp = now.toISOString().replace(/[:.]/g, '-').slice(0, -5); // 2025-12-22T23-00-00
      const filename = `backup-${timestamp}.json`;
      const filepath = path.join(this.backupDir, filename);
      
      // Préparer les métadonnées
      const backupData = {
        _meta: {
          created_at: now.toISOString(),
          created_timestamp: now.getTime(),
          guilds: guildCount,
          users: userCount,
          version: '1.0',
          retention_hours: this.retentionHours
        },
        guilds: configData.guilds,
        economy: configData.economy || {} // Économie globale si existe
      };
      
      // Écrire le fichier
      await fsp.writeFile(filepath, JSON.stringify(backupData, null, 2), 'utf8');
      
      const stats = await fsp.stat(filepath);
      const duration = Date.now() - startTime;
      
      this.lastBackupTime = now;
      
      console.log('[HourlyBackup] ✅ Sauvegarde créée');
      console.log(`[HourlyBackup]    Fichier: ${filename}`);
      console.log(`[HourlyBackup]    Taille: ${(stats.size / 1024).toFixed(2)} KB`);
      console.log(`[HourlyBackup]    Serveurs: ${guildCount}`);
      console.log(`[HourlyBackup]    Utilisateurs: ${userCount}`);
      console.log(`[HourlyBackup]    Durée: ${duration}ms`);
      
      return {
        success: true,
        filename,
        filepath,
        size: stats.size,
        guilds: guildCount,
        users: userCount,
        duration
      };
      
    } catch (error) {
      console.error('[HourlyBackup] ❌ Erreur création backup:', error.message);
      return { success: false, error: error.message };
    } finally {
      await this.releaseLock().catch(() => {});
    }
  }

  /**
   * Nettoyer les backups de plus de 3 jours
   */
  async cleanOldBackups() {
    try {
      console.log('[HourlyBackup] 🧹 Nettoyage des anciens backups...');
      
      // Créer le dossier si n'existe pas
      await fsp.mkdir(this.backupDir, { recursive: true });
      
      const files = await fsp.readdir(this.backupDir);
      const backupFiles = files.filter(f => f.startsWith('backup-') && f.endsWith('.json'));
      
      if (backupFiles.length === 0) {
        console.log('[HourlyBackup] Aucun backup à nettoyer');
        return { success: true, removed: 0 };
      }
      
      const now = Date.now();
      const maxAge = this.retentionHours * 60 * 60 * 1000; // Convertir en millisecondes
      let removedCount = 0;
      let keptCount = 0;
      
      for (const filename of backupFiles) {
        try {
          const filepath = path.join(this.backupDir, filename);
          const stats = await fsp.stat(filepath);
          const age = now - stats.mtime.getTime();
          
          if (age > maxAge) {
            await fsp.unlink(filepath);
            removedCount++;
            console.log(`[HourlyBackup]    Supprimé: ${filename} (${(age / (60 * 60 * 1000)).toFixed(1)}h)`);
          } else {
            keptCount++;
          }
        } catch (error) {
          console.error(`[HourlyBackup] Erreur sur ${filename}:`, error.message);
        }
      }
      
      console.log(`[HourlyBackup] ✅ Nettoyage terminé`);
      console.log(`[HourlyBackup]    Conservés: ${keptCount} backups`);
      console.log(`[HourlyBackup]    Supprimés: ${removedCount} backups`);
      
      return {
        success: true,
        removed: removedCount,
        kept: keptCount
      };
      
    } catch (error) {
      console.error('[HourlyBackup] Erreur nettoyage:', error.message);
      return { success: false, error: error.message };
    }
  }

  /**
   * Lister tous les backups disponibles
   */
  async listBackups() {
    try {
      await fsp.mkdir(this.backupDir, { recursive: true });
      
      const files = await fsp.readdir(this.backupDir);
      const backups = [];
      
      for (const filename of files) {
        if (!filename.startsWith('backup-') || !filename.endsWith('.json')) continue;
        
        const filepath = path.join(this.backupDir, filename);
        
        try {
          const stats = await fsp.stat(filepath);
          const age = Date.now() - stats.mtime.getTime();
          const ageHours = age / (60 * 60 * 1000);
          
          // Lire les métadonnées si possible
          let meta = null;
          try {
            const content = await fsp.readFile(filepath, 'utf8');
            const data = JSON.parse(content);
            meta = data._meta;
          } catch (_) {}
          
          backups.push({
            filename,
            filepath,
            size: stats.size,
            mtime: stats.mtime,
            mtimeMs: stats.mtime.getTime(),
            age: ageHours,
            date: stats.mtime.toLocaleString('fr-FR'),
            users: meta?.users || 0,
            guilds: meta?.guilds || 0
          });
        } catch (error) {
          console.error(`[HourlyBackup] Erreur lecture ${filename}:`, error.message);
        }
      }
      
      // Trier par date (plus récent d'abord)
      backups.sort((a, b) => b.mtimeMs - a.mtimeMs);
      
      return backups;
      
    } catch (error) {
      console.error('[HourlyBackup] Erreur listage:', error.message);
      return [];
    }
  }

  /**
   * Restaurer depuis un backup
   */
  async restoreFromBackup(filename) {
    try {
      console.log(`[HourlyBackup] 🔄 Restauration depuis: ${filename}`);
      
      const filepath = path.join(this.backupDir, filename);
      
      // Vérifier que le fichier existe
      if (!fs.existsSync(filepath)) {
        throw new Error(`Fichier introuvable: ${filename}`);
      }
      
      // Lire le backup
      const backupData = JSON.parse(await fsp.readFile(filepath, 'utf8'));
      
      // Validation de la structure
      if (!backupData.guilds) {
        throw new Error('Structure invalide: pas de guilds');
      }
      
      // Compter les utilisateurs
      let userCount = 0;
      for (const guildId in backupData.guilds) {
        const guild = backupData.guilds[guildId];
        if (guild.economy?.balances) {
          userCount += Object.keys(guild.economy.balances).length;
        }
      }
      
      // Vérification de sécurité
      if (userCount < 10) {
        throw new Error(`ALERTE: Le backup ne contient que ${userCount} utilisateurs. Restauration bloquée pour sécurité.`);
      }
      
      // Créer un backup de sécurité AVANT la restauration
      const safetyFilename = `pre-restore-${Date.now()}.json`;
      const safetyPath = path.join(this.backupDir, safetyFilename);
      
      if (fs.existsSync(this.configPath)) {
        const currentData = JSON.parse(await fsp.readFile(this.configPath, 'utf8'));
        await fsp.writeFile(safetyPath, JSON.stringify(currentData, null, 2), 'utf8');
        console.log(`[HourlyBackup] 💾 Backup de sécurité: ${safetyFilename}`);
      }
      
      // Préparer les données à restaurer (sans les métadonnées)
      const restoreData = {
        guilds: backupData.guilds
      };
      
      if (backupData.economy) {
        restoreData.economy = backupData.economy;
      }
      
      // Restaurer
      await fsp.writeFile(this.configPath, JSON.stringify(restoreData, null, 2), 'utf8');
      
      const guildCount = Object.keys(restoreData.guilds).length;
      
      console.log('[HourlyBackup] ✅ Restauration réussie');
      console.log(`[HourlyBackup]    Serveurs: ${guildCount}`);
      console.log(`[HourlyBackup]    Utilisateurs: ${userCount}`);
      console.log(`[HourlyBackup]    Backup de sécurité: ${safetyFilename}`);
      
      return {
        success: true,
        guilds: guildCount,
        users: userCount,
        safetyBackup: safetyFilename
      };
      
    } catch (error) {
      console.error('[HourlyBackup] ❌ Erreur restauration:', error.message);
      return { success: false, error: error.message };
    }
  }

  /**
   * Obtenir des statistiques sur les backups
   */
  async getStats() {
    try {
      const backups = await this.listBackups();
      
      if (backups.length === 0) {
        return {
          count: 0,
          oldest: null,
          newest: null,
          totalSize: 0
        };
      }
      
      const totalSize = backups.reduce((sum, b) => sum + b.size, 0);
      const oldest = backups[backups.length - 1];
      const newest = backups[0];
      
      return {
        count: backups.length,
        oldest: {
          filename: oldest.filename,
          date: oldest.date,
          age: `${oldest.age.toFixed(1)}h`
        },
        newest: {
          filename: newest.filename,
          date: newest.date,
          users: newest.users
        },
        totalSize: totalSize,
        totalSizeMB: (totalSize / (1024 * 1024)).toFixed(2),
        retentionHours: this.retentionHours,
        lastBackup: this.lastBackupTime
      };
      
    } catch (error) {
      console.error('[HourlyBackup] Erreur stats:', error.message);
      return null;
    }
  }
}

module.exports = HourlyBackupSystem;
