const { REST, Routes } = require('discord.js');
const fs = require('fs');
const path = require('path');

require('dotenv').config({ path: '/var/data/.env' });

const CLIENT_ID = process.env.CLIENT_ID;
const TOKEN = process.env.DISCORD_TOKEN;

console.log('🌍 DÉPLOIEMENT GLOBAL (toutes les commandes)\n');
console.log('═══════════════════════════════════════════════════════\n');

async function deployGlobal() {
  try {
    const rest = new REST({ version: '10' }).setToken(TOKEN);
    
    // Charger toutes les commandes
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
          if (loaded <= 10 || ['mot-cache', 'niveau', 'solde', 'daily', 'crime'].includes(command.data.name)) {
            console.log(`  ✅ ${command.data.name}`);
          }
        }
      } catch (error) {
        console.error(`  ❌ ${file}: ${error.message}`);
        errors++;
      }
    }
    
    if (loaded > 10) {
      console.log(`  ... et ${loaded - 10} autres commandes`);
    }
    
    console.log('');
    console.log(`📊 ${loaded} commandes chargées${errors > 0 ? `, ${errors} erreurs` : ''}\n`);
    
    if (commands.length === 0) {
      console.error('❌ Aucune commande à déployer !');
      process.exit(1);
    }
    
    // Déployer une par une sur GLOBAL (plus fiable)
    console.log('🚀 Déploiement une par une en mode GLOBAL...\n');
    console.log('   📝 Les commandes seront disponibles sur TOUS les serveurs\n');
    
    // Récupérer les commandes existantes
    let existingCommands = [];
    try {
      existingCommands = await rest.get(Routes.applicationCommands(CLIENT_ID));
      console.log(`   📊 ${existingCommands.length} commandes globales existantes\n`);
    } catch (error) {
      console.log('   ⚠️ Impossible de récupérer les commandes existantes\n');
    }
    
    const existingMap = new Map(existingCommands.map(c => [c.name, c.id]));
    
    let deployed = 0;
    let updated = 0;
    let errors_deploy = 0;
    
    const priority = ['mot-cache', 'niveau', 'solde', 'daily', 'crime', 'balance', 'bank', 'blackjack', 'boutique'];
    const orderedCommands = [
      ...commands.filter(c => priority.includes(c.name)),
      ...commands.filter(c => !priority.includes(c.name))
    ];
    
    for (const commandData of orderedCommands) {
      try {
        const existingId = existingMap.get(commandData.name);
        
        if (existingId) {
          // Mise à jour
          await rest.patch(
            Routes.applicationCommand(CLIENT_ID, existingId),
            { body: commandData }
          );
          console.log(`  ✅ ${commandData.name} (mise à jour)`);
          updated++;
        } else {
          // Création
          await rest.post(
            Routes.applicationCommands(CLIENT_ID),
            { body: commandData }
          );
          console.log(`  ✅ ${commandData.name} (nouvelle)`);
          deployed++;
        }
        
        // Pause pour éviter rate limit
        await new Promise(resolve => setTimeout(resolve, 300));
        
      } catch (error) {
        if (error.status === 429) {
          console.log(`  ⏳ ${commandData.name} (rate limit, attente...)`);
          await new Promise(resolve => setTimeout(resolve, 5000));
          // Réessayer
          try {
            if (existingId) {
              await rest.patch(
                Routes.applicationCommand(CLIENT_ID, existingId),
                { body: commandData }
              );
            } else {
              await rest.post(
                Routes.applicationCommands(CLIENT_ID),
                { body: commandData }
              );
            }
            console.log(`  ✅ ${commandData.name} (réussi après attente)`);
            deployed++;
          } catch (retryError) {
            console.log(`  ❌ ${commandData.name} (échec: ${retryError.message})`);
            errors_deploy++;
          }
        } else {
          console.log(`  ❌ ${commandData.name} (${error.message})`);
          errors_deploy++;
        }
      }
      
      // Progression
      if ((deployed + updated + errors_deploy) % 20 === 0) {
        console.log(`\n  📊 Progression: ${deployed + updated + errors_deploy}/${orderedCommands.length}\n`);
      }
    }
    
    // Vérification finale
    console.log('\n🔍 Vérification finale...\n');
    const finalCommands = await rest.get(Routes.applicationCommands(CLIENT_ID));
    
    console.log('═══════════════════════════════════════════════════════\n');
    console.log('🎉 DÉPLOIEMENT TERMINÉ !\n');
    console.log(`📊 Résultat:`);
    console.log(`  ✅ ${deployed} nouvelles commandes`);
    console.log(`  🔄 ${updated} commandes mises à jour`);
    if (errors_deploy > 0) {
      console.log(`  ❌ ${errors_deploy} erreurs`);
    }
    console.log(`  📊 TOTAL: ${finalCommands.length} commandes globales\n`);
    
    // Vérifier les prioritaires
    console.log('🎯 Commandes prioritaires:');
    priority.forEach(name => {
      const found = finalCommands.find(cmd => cmd.name === name);
      console.log(`  ${found ? '✅' : '❌'} ${name}`);
    });
    
    console.log('\n📝 Liste complète (20 premières):\n');
    const sorted = finalCommands.sort((a, b) => a.name.localeCompare(b.name));
    sorted.slice(0, 20).forEach((cmd, i) => {
      console.log(`  ${i + 1}. ${cmd.name}`);
    });
    
    if (sorted.length > 20) {
      console.log(`  ... et ${sorted.length - 20} autres`);
    }
    
    console.log('\n═══════════════════════════════════════════════════════');
    console.log('\n✅ DÉPLOIEMENT GLOBAL RÉUSSI !');
    console.log('\n💡 Les commandes sont maintenant disponibles sur TOUS les serveurs.');
    console.log('   Dans Discord, tapez "/" pour les voir.\n');
    
  } catch (error) {
    console.error('\n❌ ERREUR:', error.message);
    if (error.rawError) {
      console.error(`Détails: ${JSON.stringify(error.rawError, null, 2)}`);
    }
    process.exit(1);
  }
}

deployGlobal();
