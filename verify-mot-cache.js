#!/usr/bin/env node
/**
 * Script de vérification pré-déploiement
 * Vérifie que tous les fichiers nécessaires sont présents et valides
 */

const fs = require('fs');
const path = require('path');

console.log('🔍 VÉRIFICATION PRÉ-DÉPLOIEMENT\n');
console.log('═'.repeat(70));

let hasErrors = false;
let hasWarnings = false;

function check(description, condition, isWarning = false) {
  if (condition) {
    console.log(`✅ ${description}`);
    return true;
  } else {
    if (isWarning) {
      console.log(`⚠️  ${description}`);
      hasWarnings = true;
    } else {
      console.log(`❌ ${description}`);
      hasErrors = true;
    }
    return false;
  }
}

// 1. Vérifier les fichiers de commande
console.log('\n📁 Fichiers de commande:');
check('src/commands/mot-cache.js existe', fs.existsSync('src/commands/mot-cache.js'));
check('src/modules/mot-cache-handler.js existe', fs.existsSync('src/modules/mot-cache-handler.js'));
check('src/modules/mot-cache-buttons.js existe', fs.existsSync('src/modules/mot-cache-buttons.js'));

// 2. Vérifier l'intégration dans bot.js
console.log('\n🔧 Intégration dans bot.js:');
if (fs.existsSync('src/bot.js')) {
  const botContent = fs.readFileSync('src/bot.js', 'utf8');
  check('Handler mot-cache-buttons intégré', botContent.includes('mot-cache-buttons'));
  check('Handler mot-cache-handler intégré', botContent.includes('mot-cache-handler'));
  check('Handler boutons motcache_ présent', botContent.includes('motcache_'));
  check('Handler modals motcache_modal_ présent', botContent.includes('motcache_modal_'));
  check('Handler select menus motcache_select_ présent', botContent.includes('motcache_select_'));
} else {
  check('src/bot.js existe', false);
}

// 3. Vérifier les dépendances
console.log('\n📦 Dépendances:');
if (fs.existsSync('package.json')) {
  const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
  check('discord.js installé', pkg.dependencies && pkg.dependencies['discord.js']);
  check('dotenv installé', pkg.dependencies && pkg.dependencies['dotenv']);
} else {
  check('package.json existe', false);
}

// 4. Vérifier les scripts de déploiement
console.log('\n🚀 Scripts de déploiement:');
check('deploy-mot-cache.js créé', fs.existsSync('deploy-mot-cache.js'));
check('deploy-mot-cache.sh créé', fs.existsSync('deploy-mot-cache.sh'), true);
check('deploy-guild-commands.js existe', fs.existsSync('deploy-guild-commands.js'), true);

// 5. Vérifier les variables d'environnement
console.log('\n🔐 Variables d\'environnement:');
const hasVarDataEnv = fs.existsSync('/var/data/.env');
const hasLocalEnv = fs.existsSync('.env');

if (hasVarDataEnv) {
  console.log('✅ Fichier .env trouvé dans /var/data/');
  try {
    require('dotenv').config({ path: '/var/data/.env' });
  } catch (e) {}
} else if (hasLocalEnv) {
  console.log('✅ Fichier .env trouvé localement');
  try {
    require('dotenv').config();
  } catch (e) {}
} else {
  console.log('⚠️  Aucun fichier .env trouvé (vérifiez les variables d\'environnement système)');
  hasWarnings = true;
}

check('DISCORD_TOKEN défini', !!process.env.DISCORD_TOKEN);
check('CLIENT_ID défini', !!process.env.CLIENT_ID);
check('GUILD_ID défini', !!process.env.GUILD_ID);

// 6. Vérifier la structure de la commande
console.log('\n🎯 Structure de la commande:');
try {
  // Juste parser sans require pour éviter les erreurs de dépendances
  const cmdContent = fs.readFileSync('src/commands/mot-cache.js', 'utf8');
  check('Export module.exports présent', cmdContent.includes('module.exports'));
  check('Propriété name présente', cmdContent.includes("name: 'mot-cache'"));
  check('Propriété data présente', cmdContent.includes('data:'));
  check('Méthode execute présente', cmdContent.includes('execute'));
  check('Sous-commande "jouer" présente', cmdContent.includes("'jouer'"));
  check('Sous-commande "deviner" présente', cmdContent.includes("'deviner'"));
  check('Sous-commande "config" présente', cmdContent.includes("'config'"));
} catch (e) {
  console.log(`❌ Erreur lors de la lecture: ${e.message}`);
  hasErrors = true;
}

// 7. Vérifier la documentation
console.log('\n📚 Documentation:');
check('docs/MOT-CACHE-DEPLOY.md créé', fs.existsSync('docs/MOT-CACHE-DEPLOY.md'), true);
check('DEPLOY-MOT-CACHE-NOW.md créé', fs.existsSync('DEPLOY-MOT-CACHE-NOW.md'), true);

// Résumé final
console.log('\n' + '═'.repeat(70));
console.log('\n📊 RÉSUMÉ:\n');

if (hasErrors) {
  console.log('❌ Des erreurs critiques ont été détectées.');
  console.log('   Corrigez les erreurs avant de déployer.\n');
  process.exit(1);
} else if (hasWarnings) {
  console.log('⚠️  Quelques avertissements ont été détectés.');
  console.log('   Le déploiement devrait fonctionner, mais vérifiez les avertissements.\n');
  console.log('✅ Vous pouvez procéder au déploiement:\n');
  console.log('   $ node deploy-mot-cache.js\n');
  process.exit(0);
} else {
  console.log('✅ Toutes les vérifications sont passées!\n');
  console.log('🚀 Prêt pour le déploiement:\n');
  console.log('   $ node deploy-mot-cache.js\n');
  process.exit(0);
}
