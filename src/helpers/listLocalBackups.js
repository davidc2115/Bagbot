const fs = require('fs');
const fsp = fs.promises;
const path = require('path');

/**
 * Liste les sauvegardes locales depuis TOUS les emplacements, filtrées par serveur
 * @param {string|null} guildId - ID du serveur pour filtrer (null = toutes les sauvegardes)
 * @returns {Promise<Array>} Liste des sauvegardes
 */
async function listLocalBackups(guildId = null) {
  try {
    const DATA_DIR = process.env.DATA_DIR || path.join(process.cwd(), 'data');
    const candidates = [];
    
    // 1. Backups per-guild (priorité haute)
    if (guildId) {
      candidates.push(path.join(DATA_DIR, 'backups', `guild-${guildId}`));
      candidates.push(path.join('/var/data/backups', `guild-${guildId}`));
    }
    
    // 2. Backups globaux
    candidates.push(path.join(DATA_DIR, 'backups'));
    candidates.push('/var/data/backups');

    // 2bis. Backups horaires "internes" (backup-*.json)
    candidates.push(path.join(DATA_DIR, 'backups', 'hourly'));
    candidates.push('/var/data/backups/hourly');
    
    // 3. Backups externes horaires (nouveaux)
    candidates.push('/var/data/backups/external-hourly');
    
    // 4. Ancien emplacement Freebox (pour compatibilité)
    candidates.push(path.join(DATA_DIR, 'backups'));
    
    console.log('[listLocalBackups] Recherche dans', candidates.length, 'emplacements');
    
    const seen = new Set();
    const filePaths = [];
    
    for (const dir of candidates) {
      try {
        // Vérifier si le répertoire existe
        try {
          await fsp.access(dir);
        } catch {
          continue; // Répertoire n'existe pas, passer au suivant
        }
        
        const names = await fsp.readdir(dir).catch(() => []);
        console.log(`[listLocalBackups] Dossier ${dir}: ${names.length} fichiers`);
        
        for (const n of names) {
          // Ignorer les sous-répertoires
          if (n.startsWith('guild-') || n.startsWith('_') || n.startsWith('.')){
            continue;
          }
          
          // Si c'est un fichier JSON, l'ajouter
          if (n.toLowerCase().endsWith('.json')) {
            const fullPath = path.join(dir, n);
            
            // Utiliser realpath pour résoudre les liens symboliques et éviter les doublons
            let realPath;
            try {
              realPath = await fsp.realpath(fullPath);
            } catch {
              realPath = path.resolve(fullPath);
            }
            
            if (seen.has(realPath)) continue;
            seen.add(realPath);
            filePaths.push(realPath);
          }
        }
      } catch (e) {
        console.log(`[listLocalBackups] Erreur lecture ${dir}:`, e.message);
      }
    }
    
    console.log(`[listLocalBackups] ${filePaths.length} fichiers trouvés au total`);
    
    const withStats = await Promise.all(
      filePaths.map(async (fullPath) => {
        try {
          const st = await fsp.stat(fullPath);
          const base = path.basename(fullPath);
          const low = base.toLowerCase();
          
          // Détection du type améliorée
          let type = 'other';
          let typeLabel = 'Backup';
          let typeEmoji = '📦';
          
          if (low.startsWith('config-external-')) {
            type = 'external';
            typeLabel = 'Externe horaire';
            typeEmoji = '⏰';
          } else if (low.startsWith('config-global-')) {
            type = 'global';
            typeLabel = 'Global auto';
            typeEmoji = '🌐';
          } else if (low.startsWith('config-')) {
            type = 'manual';
            typeLabel = 'Manuel';
            typeEmoji = '👤';
          } else if (low.startsWith('backup-freebox-')) {
            type = 'freebox';
            typeLabel = 'Freebox';
            typeEmoji = '📦';
          } else if (low.startsWith('backup-local-')) {
            type = 'local';
            typeLabel = 'Local auto';
            typeEmoji = '💾';
          } else if (low.startsWith('pre-restore-')) {
            type = 'safety';
            typeLabel = 'Sécurité';
            typeEmoji = '🛡️';
          } else if (low.startsWith('backup-')) {
            type = 'auto';
            typeLabel = 'Auto';
            typeEmoji = '🤖';
          }
          
          const ts = st.mtime ? st.mtime.toISOString() : new Date().toISOString();
          const labelDate = new Date(ts).toLocaleString('fr-FR');
          const sizeKB = Math.round(st.size / 1024);
          
          return {
            filename: base,
            fullPath,
            type,
            timestamp: ts,
            size: st.size || 0,
            displayName: `${typeEmoji} ${typeLabel} • ${labelDate} • ${sizeKB} KB`,
          };
        } catch (e) {
          console.log(`[listLocalBackups] Erreur stat ${fullPath}:`, e.message);
          return null;
        }
      })
    );
    
    // Filtrer les nulls
    let entries = withStats.filter(Boolean);
    console.log(`[listLocalBackups] ${entries.length} fichiers valides après analyse`);
    
    // Filtrage par serveur si guildId fourni
    if (guildId) {
      console.log(`[listLocalBackups] Filtrage pour le serveur ${guildId}...`);
      const filtered = [];
      
      for (const backup of entries) {
        try {
          // Backups "per-guild": si le chemin contient guild-<id>, on garde
          // (ces fichiers contiennent directement la config du guild, pas {guilds:{...}})
          if (backup.fullPath && backup.fullPath.includes(`guild-${guildId}`)) {
            filtered.push(backup);
            continue;
          }

          const content = await fsp.readFile(backup.fullPath, 'utf8');
          const data = JSON.parse(content);
          
          // Vérifier si ce serveur est dans la sauvegarde
          if (data.guilds && data.guilds[guildId]) {
            filtered.push(backup);
          } else if (data.data && data.data.guilds && data.data.guilds[guildId]) {
            // Format avec metadata
            filtered.push(backup);
          }
        } catch (e) {
          // Ignorer les fichiers corrompus ou illisibles
          console.log(`[listLocalBackups] Fichier ignoré ${backup.filename}:`, e.message);
        }
      }
      
      console.log(`[listLocalBackups] ${filtered.length}/${entries.length} sauvegardes contiennent le serveur ${guildId}`);
      entries = filtered;
    }
    
    // Trier par date (plus récent en premier)
    entries.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    
    console.log(`[listLocalBackups] Retour de ${entries.length} sauvegardes`);
    return entries;
    
  } catch (error) {
    console.error('[listLocalBackups] Erreur globale:', error.message);
    return [];
  }
}

module.exports = listLocalBackups;
