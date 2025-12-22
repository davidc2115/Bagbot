const { REST, Routes } = require('discord.js');
const fs = require('fs');
const path = require('path');

// Charger .env
require('dotenv').config({ path: '/var/data/.env' });

const CLIENT_ID = process.env.CLIENT_ID;
const GUILD_ID = process.env.GUILD_ID;
const TOKEN = process.env.DISCORD_TOKEN;

console.log('🔧 DÉPLOIEMENT REST API DIRECT\n');
console.log('═══════════════════════════════════════════════════════\n');

// Vérification des variables
console.log('📋 Configuration:');
console.log(`  CLIENT_ID: ${CLIENT_ID ? '✅' : '❌'}`);
console.log(`  GUILD_ID: ${GUILD_ID ? '✅' : '❌'}`);
console.log(`  TOKEN: ${TOKEN ? '✅ (' + TOKEN.length + ' chars)' : '❌'}`);
console.log('');

if (!CLIENT_ID || !GUILD_ID || !TOKEN) {
  console.error('❌ Variables manquantes !');
  process.exit(1);
}

async function main() {
  try {
    // 1. Charger toutes les commandes
    console.log('📦 Chargement des commandes...\n');
    
    const commands = [];
    const commandsPath = path.join(__dirname, 'src', 'commands');
    const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));
    
    let loaded = 0;
    let errors = 0;
    
    for (const file of commandFiles) {
      const filePath = path.join(commandsPath, file);
      try {
        delete require.cache[require.resolve(filePath)];
        const command = require(filePath);
        if (command.data) {
          commands.push(command.data.toJSON());
          loaded++;
          if (loaded <= 5 || ['mot-cache', 'niveau', 'solde'].includes(command.data.name)) {
            console.log(`  ✅ ${command.data.name}`);
          }
        }
      } catch (error) {
        console.error(`  ❌ ${file}: ${error.message}`);
        errors++;
      }
    }
    
    if (loaded > 5) {
      console.log(`  ... et ${loaded - 5} autres commandes`);
    }
    
    console.log('');
    console.log(`📊 Résultat: ${loaded} commandes chargées${errors > 0 ? `, ${errors} erreurs` : ''}\n`);
    
    if (commands.length === 0) {
      console.error('❌ Aucune commande à déployer !');
      process.exit(1);
    }
    
    // 2. Créer le client REST
    const rest = new REST({ version: '10' }).setToken(TOKEN);
    
    // 3. Vérifier les commandes actuelles
    console.log('🔍 Vérification des commandes actuelles...\n');
    
    try {
      const currentCommands = await rest.get(
        Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID)
      );
      console.log(`  Commandes actuelles: ${currentCommands.length}\n`);
    } catch (error) {
      console.log(`  ⚠️ Impossible de récupérer les commandes actuelles: ${error.message}\n`);
    }
    
    // 4. Déployer toutes les commandes (BULK PUT)
    console.log('🚀 Déploiement de toutes les commandes...\n');
    console.log(`  Méthode: PUT (remplace toutes les commandes)`);
    console.log(`  Mode: GUILD (serveur spécifique)`);
    console.log(`  Commandes: ${commands.length}\n`);
    
    const result = await rest.put(
      Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID),
      { body: commands }
    );
    
    console.log('═══════════════════════════════════════════════════════\n');
    console.log('🎉 DÉPLOIEMENT RÉUSSI !\n');
    console.log(`📊 ${result.length} commandes déployées sur Discord\n`);
    
    // 5. Vérifier les commandes prioritaires
    const priority = ['mot-cache', 'niveau', 'solde', 'daily', 'crime'];
    console.log('🎯 Commandes prioritaires:');
    
    priority.forEach(name => {
      const found = result.find(cmd => cmd.name === name);
      console.log(`  ${found ? '✅' : '❌'} ${name}`);
    });
    
    console.log('');
    
    // 6. Liste complète
    console.log('📝 Toutes les commandes déployées:\n');
    
    const sorted = result.sort((a, b) => a.name.localeCompare(b.name));
    sorted.forEach((cmd, i) => {
      if (i < 20) {
        console.log(`  ${i + 1}. ${cmd.name}`);
      }
    });
    
    if (sorted.length > 20) {
      console.log(`  ... et ${sorted.length - 20} autres commandes`);
    }
    
    console.log('');
    console.log('═══════════════════════════════════════════════════════');
    console.log('');
    console.log('✅ TERMINÉ !');
    console.log('');
    console.log('💡 Les commandes devraient apparaître dans Discord dans 1-2 minutes.');
    console.log('   Pour les voir : tapez "/" dans n\'importe quel canal.\n');
    
    process.exit(0);
    
  } catch (error) {
    console.error('\n❌ ERREUR CRITIQUE:\n');
    console.error(`  Message: ${error.message}`);
    console.error(`  Code: ${error.code || 'N/A'}`);
    
    if (error.rawError) {
      console.error(`  Détails: ${JSON.stringify(error.rawError, null, 2)}`);
    }
    
    console.error('');
    process.exit(1);
  }
}

main();
