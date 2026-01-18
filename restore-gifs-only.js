// Script pour restaurer UNIQUEMENT les GIFs depuis un backup
// Sans toucher au reste de la configuration

const fs = require('fs');
const path = require('path');

const BACKUP_PATH = '/home/bagbot/Bag-bot/backups/dashboard-COMPLETE-BACKUP-20251028_112327/config.json';
const CONFIG_PATH = '/home/bagbot/Bag-bot/data/config.json';
const GUILD_ID = '1360897918504271882';

console.log('🎬 RESTAURATION GIFs UNIQUEMENT');
console.log('=' .repeat(80));

// 1. Lire le backup
console.log('\n1️⃣  Lecture du backup...');
const backup = JSON.parse(fs.readFileSync(BACKUP_PATH, 'utf8'));
const backupGifs = backup.guilds?.[GUILD_ID]?.economy?.actions?.gifs || {};

const gifsCount = Object.keys(backupGifs).filter(k => {
  const action = backupGifs[k];
  return (action.success && action.success.length > 0) || (action.fail && action.fail.length > 0);
}).length;

console.log(`   ✅ ${gifsCount} actions avec GIFs trouvées dans le backup`);

// Afficher les actions
console.log('\n📋 Actions avec GIFs dans le backup :');
for (const [action, gifs] of Object.entries(backupGifs)) {
  const successCount = gifs.success?.length || 0;
  const failCount = gifs.fail?.length || 0;
  if (successCount > 0 || failCount > 0) {
    console.log(`   • ${action}: ${successCount} success, ${failCount} fail`);
  }
}

// 2. Lire la config actuelle
console.log('\n2️⃣  Lecture de la config actuelle...');
const config = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));

if (!config.guilds) config.guilds = {};
if (!config.guilds[GUILD_ID]) config.guilds[GUILD_ID] = {};
if (!config.guilds[GUILD_ID].economy) config.guilds[GUILD_ID].economy = {};
if (!config.guilds[GUILD_ID].economy.actions) config.guilds[GUILD_ID].economy.actions = {};

const currentGifs = config.guilds[GUILD_ID].economy.actions.gifs || {};
const currentCount = Object.keys(currentGifs).filter(k => {
  const action = currentGifs[k];
  return (action.success && action.success.length > 0) || (action.fail && action.fail.length > 0);
}).length;

console.log(`   ℹ️  ${currentCount} actions avec GIFs dans la config actuelle`);

// 3. Créer un backup de la config actuelle
console.log('\n3️⃣  Création backup de sécurité...');
const backupPath = CONFIG_PATH + '.backup_before_gif_restore_' + Date.now();
fs.writeFileSync(backupPath, JSON.stringify(config, null, 2));
console.log(`   ✅ Backup créé : ${backupPath}`);

// 4. Restaurer les GIFs
console.log('\n4️⃣  Restauration des GIFs...');

// Remplacer complètement la section gifs
config.guilds[GUILD_ID].economy.actions.gifs = backupGifs;

console.log('   ✅ GIFs restaurés depuis le backup');

// 5. Sauvegarder
console.log('\n5️⃣  Sauvegarde de la config...');
fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2));
console.log('   ✅ Config sauvegardée');

// 6. Vérification
console.log('\n6️⃣  Vérification...');
const verif = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));
const verifGifs = verif.guilds?.[GUILD_ID]?.economy?.actions?.gifs || {};
const verifCount = Object.keys(verifGifs).filter(k => {
  const action = verifGifs[k];
  return (action.success && action.success.length > 0) || (action.fail && action.fail.length > 0);
}).length;

console.log(`   📊 ${verifCount} actions avec GIFs après restauration`);

console.log('\n' + '='.repeat(80));
console.log('✅ RESTAURATION TERMINÉE AVEC SUCCÈS !');
console.log('=' .repeat(80));
console.log('\n💡 Le bot n\'a PAS besoin d\'être redémarré');
console.log('   Les GIFs seront disponibles immédiatement');
console.log('\n📋 Actions restaurées :');
for (const [action, gifs] of Object.entries(verifGifs)) {
  const successCount = gifs.success?.length || 0;
  const failCount = gifs.fail?.length || 0;
  if (successCount > 0 || failCount > 0) {
    console.log(`   ✅ ${action}: ${successCount} success, ${failCount} fail`);
  }
}
