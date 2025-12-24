/**
 * Protection contre les doubles instances
 * Utilise un fichier de lock pour garantir une seule instance
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
const MAX_LOCK_AGE = 60000; // 60 secondes

function acquireLock() {
  try {
    // S'assurer que le dossier existe (si ce n'est pas /tmp)
    try { fs.mkdirSync(path.dirname(LOCK_FILE), { recursive: true }); } catch (_) {}

    // Vérifier si le lock existe
    if (fs.existsSync(LOCK_FILE)) {
      const lockData = JSON.parse(fs.readFileSync(LOCK_FILE, 'utf8'));
      const age = Date.now() - lockData.timestamp;
      
      // Si le lock est ancien (> 60s), le processus est probablement mort
      if (age > MAX_LOCK_AGE) {
        console.log('[Lock] Lock ancien détecté, nettoyage...');
        fs.unlinkSync(LOCK_FILE);
      } else {
        // Lock valide, une autre instance tourne
        console.error('[Lock] ❌ UNE AUTRE INSTANCE TOURNE DÉJÀ!');
        console.error('[Lock] PID:', lockData.pid);
        console.error('[Lock] Démarré:', new Date(lockData.timestamp).toISOString());
        process.exit(1);
      }
    }
    
    // Créer le lock
    const lockData = {
      pid: process.pid,
      timestamp: Date.now(),
      started: new Date().toISOString()
    };
    
    fs.writeFileSync(LOCK_FILE, JSON.stringify(lockData, null, 2), 'utf8');
    console.log('[Lock] ✅ Lock acquis, PID:', process.pid, 'file:', LOCK_FILE);
    
    // Mettre à jour le lock toutes les 30 secondes
    setInterval(() => {
      try {
        lockData.timestamp = Date.now();
        fs.writeFileSync(LOCK_FILE, JSON.stringify(lockData, null, 2), 'utf8');
      } catch (_) {}
    }, 30000);
    
    // Nettoyer le lock à la sortie
    const cleanup = () => {
      try {
        if (fs.existsSync(LOCK_FILE)) {
          const current = JSON.parse(fs.readFileSync(LOCK_FILE, 'utf8'));
          if (current.pid === process.pid) {
            fs.unlinkSync(LOCK_FILE);
            console.log('[Lock] Lock libéré');
          }
        }
      } catch (_) {}
    };
    
    process.on('exit', cleanup);
    process.on('SIGINT', () => { cleanup(); process.exit(); });
    process.on('SIGTERM', () => { cleanup(); process.exit(); });
    process.on('uncaughtException', (err) => {
      console.error('[Lock] Erreur non gérée:', err);
      cleanup();
      process.exit(1);
    });
    
    return true;
    
  } catch (error) {
    console.error('[Lock] Erreur acquisition lock:', error.message);
    process.exit(1);
  }
}

module.exports = { acquireLock };
