/**
 * Protection contre les doubles instances
 * Utilise un fichier de lock pour garantir une seule instance
 * VERSION AMÉLIORÉE avec vérification du PID réel
 */

const fs = require('fs');
const path = require('path');

function resolveLockFile() {
  const candidates = [
    process.env.BAGBOT_LOCK_FILE,
    // preferred persistent dir if available
    '/var/data/bot.lock',
    // fallback to configured DATA_DIR
    (process.env.DATA_DIR ? path.join(String(process.env.DATA_DIR), 'bot.lock') : null),
    // last resort
    '/tmp/bot.lock'
  ].filter(Boolean);
  return candidates[0];
}
const LOCK_FILE = resolveLockFile();
const MAX_LOCK_AGE = 30000; // 30 secondes (réduit de 60s)

/**
 * Vérifie si un processus existe réellement
 */
function processExists(pid) {
  try {
    // Sur Unix/Linux, process.kill(pid, 0) ne tue pas le processus
    // mais retourne true si le processus existe
    process.kill(pid, 0);
    return true;
  } catch (e) {
    // ESRCH = No such process
    return e.code !== 'ESRCH';
  }
}

function acquireLock() {
  try {
    // S'assurer que le dossier existe (si ce n'est pas /tmp)
    try { fs.mkdirSync(path.dirname(LOCK_FILE), { recursive: true }); } catch (_) {}

    // Vérifier si le lock existe
    if (fs.existsSync(LOCK_FILE)) {
      let shouldRemoveLock = false;
      let reason = '';
      
      try {
        const lockData = JSON.parse(fs.readFileSync(LOCK_FILE, 'utf8'));
        const age = Date.now() - lockData.timestamp;
        
        // Vérification 1 : Le processus existe-t-il vraiment ?
        if (lockData.pid && !processExists(lockData.pid)) {
          shouldRemoveLock = true;
          reason = `Processus PID ${lockData.pid} n'existe plus`;
        }
        // Vérification 2 : Le lock est-il trop ancien ?
        else if (age > MAX_LOCK_AGE) {
          shouldRemoveLock = true;
          reason = `Lock ancien (${Math.round(age/1000)}s > ${MAX_LOCK_AGE/1000}s)`;
        }
        // Vérification 3 : C'est nous-même ? (redémarrage après crash)
        else if (lockData.pid === process.pid) {
          shouldRemoveLock = true;
          reason = 'Même PID détecté (redémarrage après crash?)';
        }
        
        if (shouldRemoveLock) {
          console.log(`[Lock] Nettoyage du lock : ${reason}`);
          fs.unlinkSync(LOCK_FILE);
        } else {
          // Lock valide, une autre instance tourne vraiment
          console.error('[Lock] ❌ UNE AUTRE INSTANCE TOURNE DÉJÀ!');
          console.error('[Lock] PID:', lockData.pid);
          console.error('[Lock] Démarré:', new Date(lockData.timestamp).toISOString());
          console.error('[Lock] Âge:', Math.round(age/1000), 'secondes');
          process.exit(1);
        }
      } catch (parseError) {
        // Fichier de lock corrompu, on le supprime
        console.log('[Lock] Fichier de lock corrompu, suppression...');
        try { fs.unlinkSync(LOCK_FILE); } catch (_) {}
      }
    }
    
    // Créer le lock
    const lockData = {
      pid: process.pid,
      timestamp: Date.now(),
      started: new Date().toISOString(),
      hostname: require('os').hostname()
    };
    
    fs.writeFileSync(LOCK_FILE, JSON.stringify(lockData, null, 2), 'utf8');
    console.log('[Lock] ✅ Lock acquis, PID:', process.pid, 'file:', LOCK_FILE);
    
    // Mettre à jour le lock toutes les 15 secondes (réduit de 30s)
    const updateInterval = setInterval(() => {
      try {
        if (fs.existsSync(LOCK_FILE)) {
          const current = JSON.parse(fs.readFileSync(LOCK_FILE, 'utf8'));
          // Ne mettre à jour que si c'est notre lock
          if (current.pid === process.pid) {
            lockData.timestamp = Date.now();
            fs.writeFileSync(LOCK_FILE, JSON.stringify(lockData, null, 2), 'utf8');
          }
        }
      } catch (_) {}
    }, 15000);
    
    // Nettoyer le lock à la sortie
    const cleanup = () => {
      try {
        clearInterval(updateInterval);
        if (fs.existsSync(LOCK_FILE)) {
          const current = JSON.parse(fs.readFileSync(LOCK_FILE, 'utf8'));
          if (current.pid === process.pid) {
            fs.unlinkSync(LOCK_FILE);
            console.log('[Lock] ✅ Lock libéré proprement');
          }
        }
      } catch (_) {}
    };
    
    // Gestionnaires de signaux améliorés
    process.on('exit', cleanup);
    process.on('SIGINT', () => { 
      console.log('[Lock] Réception SIGINT...');
      cleanup(); 
      process.exit(0); 
    });
    process.on('SIGTERM', () => { 
      console.log('[Lock] Réception SIGTERM...');
      cleanup(); 
      process.exit(0); 
    });
    process.on('uncaughtException', (err) => {
      console.error('[Lock] ❌ Erreur non gérée:', err.message);
      cleanup();
      process.exit(1);
    });
    process.on('unhandledRejection', (reason, promise) => {
      console.error('[Lock] ❌ Promise rejetée non gérée:', reason);
      cleanup();
      process.exit(1);
    });
    
    return true;
    
  } catch (error) {
    console.error('[Lock] ❌ Erreur acquisition lock:', error.message);
    process.exit(1);
  }
}

module.exports = { acquireLock };
