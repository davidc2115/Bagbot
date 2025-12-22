const { Client, GatewayIntentBits } = require('discord.js');
const fs = require('fs');
const path = require('path');

// Charger depuis /var/data/.env
try { require('dotenv').config({ path: '/var/data/.env' }); } catch (_) {}

const CLIENT_ID = process.env.CLIENT_ID || '1414216173809307780';
const GUILD_ID = process.env.GUILD_ID || '1360897918504271882';
const TOKEN = process.env.DISCORD_TOKEN;

const client = new Client({ intents: [GatewayIntentBits.Guilds] });

client.once('ready', async () => {
  console.log('✅ Bot connecté !');
  
  try {
    // Récupérer les commandes déployées
    const guild = await client.guilds.fetch(GUILD_ID);
    const deployedCommands = await guild.commands.fetch();
    
    console.log(`\n📋 Commandes déployées (${deployedCommands.size}) :`);
    const deployedNames = [];
    deployedCommands.forEach(cmd => {
      console.log(`  - ${cmd.name}`);
      deployedNames.push(cmd.name);
    });
    
    // Lire les commandes disponibles localement
    const commandsPath = path.join(__dirname, 'src', 'commands');
    const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));
    
    console.log(`\n📦 Commandes locales (${commandFiles.length}) :`);
    const localNames = [];
    for (const file of commandFiles) {
      const filePath = path.join(commandsPath, file);
      try {
        delete require.cache[require.resolve(filePath)];
        const command = require(filePath);
        if (command.data) {
          localNames.push(command.data.name);
        }
      } catch (err) {
        console.log(`  ⚠️ Erreur lors du chargement de ${file}: ${err.message}`);
      }
    }
    
    // Trouver les commandes manquantes
    const missing = localNames.filter(name => !deployedNames.includes(name));
    
    if (missing.length > 0) {
      console.log(`\n❌ Commandes manquantes (${missing.length}) :`);
      missing.forEach(name => console.log(`  - ${name}`));
    } else {
      console.log('\n✅ Toutes les commandes sont déployées !');
    }
    
    // Trouver les commandes en trop (déployées mais pas en local)
    const extra = deployedNames.filter(name => !localNames.includes(name));
    if (extra.length > 0) {
      console.log(`\n⚠️ Commandes déployées mais absentes localement (${extra.length}) :`);
      extra.forEach(name => console.log(`  - ${name}`));
    }
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Erreur:', error);
    process.exit(1);
  }
});

console.log('🔄 Connexion au bot...');
client.login(TOKEN);
