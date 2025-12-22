const { REST, Routes } = require('discord.js');
const fs = require('fs');
const path = require('path');

require('dotenv').config({ path: '/var/data/.env' });

const CLIENT_ID = process.env.CLIENT_ID;
const GUILD_ID = process.env.GUILD_ID;
const TOKEN = process.env.DISCORD_TOKEN;

console.log('🔧 DÉPLOIEMENT UN PAR UN\n');

if (!CLIENT_ID || !GUILD_ID || !TOKEN) {
  console.error('❌ Variables manquantes !');
  process.exit(1);
}

async function deployOneByOne() {
  try {
    // Charger les commandes
    console.log('📦 Chargement des commandes...\n');
    
    const commandsMap = new Map();
    const commandsPath = path.join(__dirname, 'src', 'commands');
    const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));
    
    for (const file of commandFiles) {
      const filePath = path.join(commandsPath, file);
      try {
        delete require.cache[require.resolve(filePath)];
        const command = require(filePath);
        if (command.data) {
          commandsMap.set(command.data.name, command.data.toJSON());
        }
      } catch (error) {
        // Ignorer les erreurs de chargement
      }
    }
    
    console.log(`✅ ${commandsMap.size} commandes chargées\n`);
    
    // Ordre de priorité
    const priority = [
      'mot-cache', 'niveau', 'solde', 'daily', 'crime',
      'agenouiller', 'balance', 'bank', 'bite', 'blackjack',
      'bonk', 'boutique', 'braquage', 'butin', 'calin',
      'carte-identite', 'casino', 'classement', 'coinflip',
      'conseil', 'crime-organise', 'cuisiner', 'daily-coins'
    ];
    
    const allCommands = Array.from(commandsMap.keys());
    const remaining = allCommands.filter(name => !priority.includes(name));
    const ordered = [...priority.filter(name => commandsMap.has(name)), ...remaining];
    
    const rest = new REST({ version: '10' }).setToken(TOKEN);
    
    // Récupérer les commandes actuelles
    let currentCommands = [];
    try {
      currentCommands = await rest.get(Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID));
      console.log(`📊 Commandes actuelles: ${currentCommands.length}\n`);
    } catch (error) {
      console.log(`⚠️ Impossible de récupérer les commandes actuelles\n`);
    }
    
    // Déployer une par une
    console.log('🚀 Déploiement des commandes:\n');
    
    let deployed = 0;
    let errors = 0;
    let skipped = 0;
    
    for (const name of ordered) {
      const commandData = commandsMap.get(name);
      
      try {
        // Vérifier si la commande existe déjà
        const existing = currentCommands.find(cmd => cmd.name === name);
        
        if (existing) {
          // Mettre à jour
          await rest.patch(
            Routes.applicationGuildCommand(CLIENT_ID, GUILD_ID, existing.id),
            { body: commandData }
          );
          console.log(`  ✅ ${name} (mis à jour)`);
        } else {
          // Créer
          await rest.post(
            Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID),
            { body: commandData }
          );
          console.log(`  ✅ ${name} (créé)`);
        }
        
        deployed++;
        
        // Pause courte pour éviter le rate limit
        await new Promise(resolve => setTimeout(resolve, 250));
        
      } catch (error) {
        if (error.code === 50035) {
          // Erreur de validation - passer
          console.log(`  ⚠️ ${name} (invalide)`);
          skipped++;
        } else if (error.status === 429) {
          // Rate limit - attendre
          console.log(`  ⏳ ${name} (rate limit, attente...)`);
          await new Promise(resolve => setTimeout(resolve, 5000));
          // Réessayer
          try {
            if (existing) {
              await rest.patch(
                Routes.applicationGuildCommand(CLIENT_ID, GUILD_ID, existing.id),
                { body: commandData }
              );
            } else {
              await rest.post(
                Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID),
                { body: commandData }
              );
            }
            console.log(`  ✅ ${name} (réussi après attente)`);
            deployed++;
          } catch (retryError) {
            console.log(`  ❌ ${name} (échec après retry)`);
            errors++;
          }
        } else {
          console.log(`  ❌ ${name} (${error.message})`);
          errors++;
        }
      }
      
      // Afficher la progression tous les 10 commandes
      if ((deployed + errors + skipped) % 10 === 0) {
        console.log(`\n  📊 Progression: ${deployed + errors + skipped}/${ordered.length}\n`);
      }
    }
    
    console.log('\n═══════════════════════════════════════════════════════\n');
    console.log('🎉 DÉPLOIEMENT TERMINÉ !\n');
    console.log(`📊 Résultat:`);
    console.log(`  ✅ ${deployed} déployées`);
    console.log(`  ⚠️ ${skipped} invalides`);
    console.log(`  ❌ ${errors} erreurs\n`);
    
    // Vérification finale
    const finalCommands = await rest.get(Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID));
    console.log(`📊 Total sur Discord: ${finalCommands.length} commandes\n`);
    
    // Vérifier les prioritaires
    console.log('🎯 Commandes prioritaires:');
    priority.slice(0, 5).forEach(name => {
      const found = finalCommands.find(cmd => cmd.name === name);
      console.log(`  ${found ? '✅' : '❌'} ${name}`);
    });
    
    console.log('\n✅ TERMINÉ !\n');
    
  } catch (error) {
    console.error('\n❌ ERREUR:', error.message);
    process.exit(1);
  }
}

deployOneByOne();
