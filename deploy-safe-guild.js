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
  console.log(`🎯 Déploiement SÉCURISÉ en mode GUILDE\n`);
  
  try {
    const guild = await client.guilds.fetch(GUILD_ID);
    
    // 1. Récupérer les commandes existantes
    console.log('🔍 Vérification des commandes existantes...');
    const existingCommands = await guild.commands.fetch();
    console.log(`📊 Commandes actuelles: ${existingCommands.size}\n`);
    
    // 2. Charger toutes les commandes du code
    const commands = [];
    const commandsPath = path.join(__dirname, 'src', 'commands');
    const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));
    
    console.log(`📦 Chargement de ${commandFiles.length} fichiers...\n`);
    
    for (const file of commandFiles) {
      const filePath = path.join(commandsPath, file);
      try {
        delete require.cache[require.resolve(filePath)];
        const command = require(filePath);
        if (command.data) {
          commands.push({
            name: command.data.name,
            data: command.data.toJSON(),
            file: file
          });
        }
      } catch (error) {
        console.error(`  ❌ ${file}: ${error.message}`);
      }
    }
    
    console.log(`✅ ${commands.length} commandes chargées\n`);
    console.log('═══════════════════════════════════════════════════════\n');
    
    // 3. Créer/Mettre à jour les commandes une par une
    console.log('🚀 Déploiement des commandes...\n');
    
    let created = 0;
    let updated = 0;
    let errors = 0;
    const errorList = [];
    
    for (let i = 0; i < commands.length; i++) {
      const cmd = commands[i];
      const progress = `[${i + 1}/${commands.length}]`;
      
      try {
        // Vérifier si la commande existe déjà
        const existing = existingCommands.find(c => c.name === cmd.name);
        
        if (existing) {
          // Mettre à jour
          await guild.commands.edit(existing.id, cmd.data);
          console.log(`✅ ${progress} ${cmd.name} (mis à jour)`);
          updated++;
        } else {
          // Créer
          await guild.commands.create(cmd.data);
          console.log(`✅ ${progress} ${cmd.name} (créé)`);
          created++;
        }
        
        // Petite pause pour éviter le rate limiting
        if (i < commands.length - 1 && i % 10 === 9) {
          await new Promise(resolve => setTimeout(resolve, 2000));
        } else {
          await new Promise(resolve => setTimeout(resolve, 300));
        }
      } catch (error) {
        console.error(`❌ ${progress} ${cmd.name}: ${error.message}`);
        errors++;
        errorList.push({ name: cmd.name, file: cmd.file, error: error.message });
      }
    }
    
    console.log('\n═══════════════════════════════════════════════════════');
    console.log('\n🎉 DÉPLOIEMENT TERMINÉ !\n');
    console.log(`📊 Résultats:`);
    console.log(`  ✅ Créées: ${created}`);
    console.log(`  🔄 Mises à jour: ${updated}`);
    console.log(`  ❌ Erreurs: ${errors}`);
    console.log(`  📊 Total succès: ${created + updated}/${commands.length}`);
    
    if (errorList.length > 0) {
      console.log(`\n❌ ERREURS:`);
      errorList.forEach(({ name, file, error }) => {
        console.log(`  • ${name} (${file})`);
        console.log(`    └─ ${error}`);
      });
    }
    
    // 4. Vérification finale
    console.log('\n🔍 Vérification finale...');
    const finalCommands = await guild.commands.fetch();
    console.log(`✅ ${finalCommands.size} commandes totales sur le serveur\n`);
    
    // Vérifier les commandes prioritaires
    const priority = ['mot-cache', 'niveau', 'solde'];
    console.log('🎯 Commandes prioritaires:');
    priority.forEach(name => {
      const found = finalCommands.find(cmd => cmd.name === name);
      console.log(`  ${found ? '✅' : '❌'} ${name}`);
    });
    
    console.log('');
    
    if (finalCommands.size >= commands.length) {
      console.log('✅ PARFAIT ! Toutes les commandes sont déployées !\n');
      process.exit(0);
    } else {
      console.log(`⚠️ ${commands.length - finalCommands.size} commandes manquantes\n`);
      process.exit(1);
    }
  } catch (error) {
    console.error('\n❌ ERREUR CRITIQUE:', error);
    process.exit(1);
  }
});

console.log('🔄 Connexion au bot Discord...');
client.login(TOKEN).catch(err => {
  console.error('❌ Erreur de connexion:', err);
  process.exit(1);
});
