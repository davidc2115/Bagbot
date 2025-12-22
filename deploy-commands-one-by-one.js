const { REST, Routes } = require('discord.js');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const allCommands = [];
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
    
    const cmdData = command.data.toJSON();
    
    // Vérifier si la commande a dmPermission: true explicitement
    const hasDMPermission = content.includes('dmPermission: true') || 
                           content.includes('setDMPermission(true)');
    
    // FORCER dmPermission: false si pas explicitement true
    if (!hasDMPermission) {
      cmdData.dm_permission = false;
    }
    
    allCommands.push(cmdData);
    
    const dmStatus = hasDMPermission ? '(serveur + MP)' : '(serveur uniquement)';
    console.log(`  🌐 ${cmdData.name} ${dmStatus}`);
    
  } catch (error) {
    console.log(`  ⚠️  ${file} - Erreur: ${error.message}`);
  }
}

console.log('');
console.log('='.repeat(80));
console.log(`📊 Total: ${allCommands.length} commandes`);
console.log('   Déployées UNE PAR UNE pour éviter le rate limiting');
console.log('');

const rest = new REST({ timeout: 30000 }).setToken(process.env.DISCORD_TOKEN);

const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));

(async () => {
  try {
    console.log('🚀 Récupération des commandes existantes...');
    
    // Récupérer les commandes existantes
    const existing = await rest.get(Routes.applicationCommands(process.env.CLIENT_ID));
    console.log(`📋 ${existing.length} commandes déjà déployées`);
    console.log('');
    
    console.log('🔄 Déploiement commande par commande...');
    let deployed = 0;
    let skipped = 0;
    let errors = 0;
    
    for (const cmd of allCommands) {
      try {
        // Vérifier si la commande existe déjà
        const existingCmd = existing.find(c => c.name === cmd.name);
        
        if (existingCmd) {
          // Mettre à jour la commande existante
          await rest.patch(
            Routes.applicationCommand(process.env.CLIENT_ID, existingCmd.id),
            { body: cmd }
          );
          console.log(`  ✓ ${cmd.name} (mis à jour)`);
        } else {
          // Créer une nouvelle commande
          await rest.post(
            Routes.applicationCommands(process.env.CLIENT_ID),
            { body: cmd }
          );
          console.log(`  ✓ ${cmd.name} (créé)`);
        }
        
        deployed++;
        
        // Attendre 500ms entre chaque commande pour éviter le rate limiting
        await wait(500);
        
      } catch (error) {
        if (error.code === 50035 || error.status === 429) {
          console.log(`  ⏳ ${cmd.name} - Rate limited, attente 5s...`);
          await wait(5000);
          // Réessayer une fois
          try {
            if (existingCmd) {
              await rest.patch(
                Routes.applicationCommand(process.env.CLIENT_ID, existingCmd.id),
                { body: cmd }
              );
            } else {
              await rest.post(
                Routes.applicationCommands(process.env.CLIENT_ID),
                { body: cmd }
              );
            }
            console.log(`  ✓ ${cmd.name} (réussi après retry)`);
            deployed++;
          } catch (retryError) {
            console.error(`  ❌ ${cmd.name} - ${retryError.message}`);
            errors++;
          }
        } else {
          console.error(`  ❌ ${cmd.name} - ${error.message}`);
          errors++;
        }
      }
    }
    
    console.log('');
    console.log('='.repeat(80));
    console.log('🎉 Déploiement terminé !');
    console.log('');
    console.log(`✅ ${deployed} commandes déployées`);
    console.log(`❌ ${errors} erreurs`);
    console.log('');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Erreur globale:', error);
    process.exit(1);
  }
})();
