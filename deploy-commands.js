const { REST, Routes } = require('discord.js');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const globalCommands = [];  // Commandes avec MP
const guildCommands = [];   // Commandes sans MP
const commandsPath = path.join(__dirname, 'src', 'commands');
const commandFiles = fs.readdirSync(commandsPath).filter(f => f.endsWith('.js'));

console.log('📦 Analyse des commandes...');
console.log('='.repeat(80));

for (const file of commandFiles) {
  const filePath = path.join(commandsPath, file);
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const command = require(filePath);
    
    if (!command.data) continue;

    // Source de vérité: propriété exportée (fallback sur heuristique)
    const dmPermission =
      command.dmPermission === true ||
      content.includes('dmPermission: true') ||
      content.includes('setDMPermission(true)');

    // Forcer la permission MP sur la commande (corrige les fichiers incohérents)
    if (typeof command.data.setDMPermission === 'function') {
      try {
        command.data.setDMPermission(dmPermission);
      } catch (_) {
        // ignore: certains builders peuvent refuser dans des cas rares
      }
    }

    const cmdData = command.data.toJSON();
    // Sécurité: s'assurer que le JSON envoyé reflète bien dmPermission
    cmdData.dm_permission = dmPermission;

    if (dmPermission) {
      // Commande disponible sur serveur ET en MP -> GLOBALE
      globalCommands.push(cmdData);
      console.log(`  🌐 ${cmdData.name} (global - serveur + MP)`);
    } else {
      // Commande disponible UNIQUEMENT sur serveur -> GUILD
      guildCommands.push(cmdData);
      console.log(`  🏰 ${cmdData.name} (guild - serveur uniquement)`);
    }
  } catch (error) {
    console.log(`  ⚠️  ${file} - Erreur: ${error.message}`);
  }
}

console.log('');
console.log('='.repeat(80));
console.log(`🌐 Commandes GLOBALES (serveur + MP): ${globalCommands.length}`);
console.log(`🏰 Commandes GUILD (serveur uniquement): ${guildCommands.length}`);
console.log('');

const rest = new REST().setToken(process.env.DISCORD_TOKEN);
const GUILD_ID = process.env.GUILD_ID || process.env.FORCE_GUILD_ID || '1360897918504271882';

(async () => {
  try {
    console.log('🚀 Déploiement...');
    console.log('');
    
    // Déployer les commandes globales
    console.log(`📤 Déploiement de ${globalCommands.length} commandes globales...`);
    await rest.put(
      Routes.applicationCommands(process.env.CLIENT_ID),
      { body: globalCommands }
    );
    console.log('✅ Commandes globales déployées');
    
    // Déployer les commandes guild
    console.log(`📤 Déploiement de ${guildCommands.length} commandes guild...`);
    await rest.put(
      Routes.applicationGuildCommands(process.env.CLIENT_ID, GUILD_ID),
      { body: guildCommands }
    );
    console.log('✅ Commandes guild déployées');
    
    console.log('');
    console.log('🎉 Déploiement terminé !');
    console.log('');
    console.log('📝 Résultat:');
    console.log(`   - ${globalCommands.length} commandes sur serveur + MP`);
    console.log(`   - ${guildCommands.length} commandes sur serveur uniquement`);
    console.log(`   - Total sur serveur: ${globalCommands.length + guildCommands.length}`);
    
  } catch (error) {
    console.error('❌ Erreur:', error);
  }
})();
