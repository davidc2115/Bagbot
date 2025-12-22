const { REST, Routes } = require('discord.js');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const commands = [];
const commandsPath = path.join(__dirname, 'src', 'commands');
const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));

console.log('📦 Chargement des commandes...');
for (const file of commandFiles) {
  const command = require(`./src/commands/${file}`);
  if (command.data) {
    const cmdData = command.data.toJSON();
    const content = fs.readFileSync(path.join(commandsPath, file), 'utf8');
    const hasDMPermission = content.includes('dmPermission: true') || content.includes('setDMPermission(true)');
    if (!hasDMPermission) {
      cmdData.dm_permission = false;
    }
    commands.push(cmdData);
  }
}

console.log(`✅ ${commands.length} commandes chargées\n`);

const rest = new REST({ timeout: 60000 }).setToken(process.env.DISCORD_TOKEN);
const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));

(async () => {
  try {
    console.log('🚀 Déploiement lent avec 2s entre chaque commande...\n');
    
    // Récupérer les commandes existantes
    const existing = await rest.get(Routes.applicationCommands(process.env.CLIENT_ID));
    const existingMap = new Map(existing.map(c => [c.name, c.id]));
    
    let deployed = 0;
    for (const cmd of commands) {
      try {
        const existingId = existingMap.get(cmd.name);
        if (existingId) {
          await rest.patch(Routes.applicationCommand(process.env.CLIENT_ID, existingId), { body: cmd });
          console.log(`✅ ${++deployed}/${commands.length} - PATCH: ${cmd.name}`);
        } else {
          await rest.post(Routes.applicationCommands(process.env.CLIENT_ID), { body: cmd });
          console.log(`✅ ${++deployed}/${commands.length} - POST: ${cmd.name}`);
        }
        await wait(2000); // 2 secondes entre chaque
      } catch (error) {
        if (error.status === 429) {
          const retryAfter = error.retry_after || 5000;
          console.log(`⏳ Rate limit sur ${cmd.name}, attente ${retryAfter}ms...`);
          await wait(retryAfter + 1000);
          // Retry
          try {
            if (existingId) {
              await rest.patch(Routes.applicationCommand(process.env.CLIENT_ID, existingId), { body: cmd });
            } else {
              await rest.post(Routes.applicationCommands(process.env.CLIENT_ID), { body: cmd });
            }
            console.log(`✅ ${++deployed}/${commands.length} - RETRY OK: ${cmd.name}`);
          } catch (retryError) {
            console.error(`❌ ÉCHEC: ${cmd.name} - ${retryError.message}`);
          }
        } else {
          console.error(`❌ Erreur ${cmd.name}: ${error.message}`);
        }
      }
    }
    
    console.log(`\n🎉 Déploiement terminé: ${deployed}/${commands.length} commandes`);
  } catch (error) {
    console.error('❌ Erreur globale:', error);
  }
})();
