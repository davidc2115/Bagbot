// Bot config watcher - À ajouter dans le bot principal
const fs = require('fs');
const path = require('path');

function setupConfigWatcher(reloadConfigFunction) {
  const signalPath = path.join(__dirname, '../data/config-updated.signal');
  
  // Créer le fichier signal s'il n'existe pas
  if (!fs.existsSync(signalPath)) {
    fs.writeFileSync(signalPath, '0', 'utf8');
  }
  
  // Watcher sur le fichier signal
  fs.watch(signalPath, (eventType) => {
    if (eventType === 'change') {
      console.log('📡 Signal reçu - Rechargement config...');
      try {
        reloadConfigFunction();
        console.log('✅ Config rechargée avec succès');
      } catch (e) {
        console.error('❌ Erreur rechargement config:', e.message);
      }
    }
  });
  
  console.log('👀 Config watcher démarré');
}

module.exports = { setupConfigWatcher };
