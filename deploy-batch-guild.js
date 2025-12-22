const { Client, GatewayIntentBits } = require('discord.js');
const fs = require('fs');
const path = require('path');

// Charger depuis /var/data/.env
try { require('dotenv').config({ path: '/var/data/.env' }); } catch (_) {}

const CLIENT_ID = process.env.CLIENT_ID || '1414216173809307780';
const GUILD_ID = process.env.GUILD_ID || '1360897918504271882';
const TOKEN = process.env.DISCORD_TOKEN;

// Taille des batches (plus petit = plus sûr)
const BATCH_SIZE = 20;
const DELAY_BETWEEN_BATCHES = 5000; // 5 secondes

const client = new Client({ intents: [GatewayIntentBits.Guilds] });

async function deployBatch(guild, batchCommands, batchNumber, totalBatches) {
  try {
    console.log(`\n📤 Batch ${batchNumber}/${totalBatches} - ${batchCommands.length} commandes:`);
    batchCommands.forEach(cmd => console.log(`   • ${cmd.name}`));
    
    // Utiliser guild.commands.set pour remplacer toutes les commandes du batch
    const result = await guild.commands.set(batchCommands);
    
    console.log(`✅ Batch ${batchNumber}/${totalBatches} déployé avec succès ! (${result.size} commandes)`);
    return { success: true, count: result.size };
  } catch (error) {
    console.error(`❌ Erreur batch ${batchNumber}/${totalBatches}:`, error.message);
    
    // En cas d'erreur, essayer commande par commande
    console.log(`⚠️ Tentative de déploiement individuel pour identifier la commande problématique...`);
    let successCount = 0;
    let failedCommands = [];
    
    for (const cmd of batchCommands) {
      try {
        await guild.commands.create(cmd);
        console.log(`  ✅ ${cmd.name}`);
        successCount++;
        await new Promise(resolve => setTimeout(resolve, 500)); // Pause entre chaque commande
      } catch (err) {
        console.error(`  ❌ ${cmd.name}: ${err.message}`);
        failedCommands.push({ name: cmd.name, error: err.message });
      }
    }
    
    return { success: false, count: successCount, failed: failedCommands };
  }
}

client.once('ready', async () => {
  console.log('✅ Bot connecté !');
  console.log(`🎯 Déploiement en mode GUILDE (serveur spécifique)`);
  console.log(`📊 Taille des batches: ${BATCH_SIZE} commandes`);
  console.log(`⏱️ Délai entre batches: ${DELAY_BETWEEN_BATCHES}ms\n`);
  
  try {
    const commands = [];
    const commandsPath = path.join(__dirname, 'src', 'commands');
    const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));
    
    console.log(`📦 Chargement de ${commandFiles.length} fichiers de commandes...\n`);
    
    let loadedCount = 0;
    let errorCount = 0;
    const errorFiles = [];
    
    for (const file of commandFiles) {
      const filePath = path.join(commandsPath, file);
      try {
        delete require.cache[require.resolve(filePath)];
        const command = require(filePath);
        if (command.data) {
          commands.push(command.data.toJSON());
          loadedCount++;
          console.log(`  ✅ ${command.data.name} (${file})`);
        } else {
          console.log(`  ⚠️ ${file}: pas de propriété 'data'`);
          errorCount++;
          errorFiles.push({ file, reason: 'Pas de propriété data' });
        }
      } catch (error) {
        console.error(`  ❌ ${file}: ${error.message}`);
        errorCount++;
        errorFiles.push({ file, reason: error.message });
      }
    }
    
    console.log(`\n📊 Résultat du chargement:`);
    console.log(`  ✅ Chargées: ${loadedCount}`);
    console.log(`  ❌ Erreurs: ${errorCount}`);
    
    if (errorFiles.length > 0) {
      console.log(`\n⚠️ Fichiers problématiques:`);
      errorFiles.forEach(({ file, reason }) => {
        console.log(`  • ${file}: ${reason}`);
      });
    }
    
    if (commands.length === 0) {
      console.error('❌ Aucune commande chargée !');
      process.exit(1);
    }
    
    console.log(`\n🚀 Déploiement de ${commands.length} commandes vers le guild ${GUILD_ID}...\n`);
    
    const guild = await client.guilds.fetch(GUILD_ID);
    
    // Diviser en batches
    const batches = [];
    for (let i = 0; i < commands.length; i += BATCH_SIZE) {
      batches.push(commands.slice(i, i + BATCH_SIZE));
    }
    
    console.log(`📦 ${batches.length} batches à déployer\n`);
    console.log('═══════════════════════════════════════════════════════\n');
    
    let totalSuccess = 0;
    let totalFailed = [];
    
    // Déployer batch par batch
    for (let i = 0; i < batches.length; i++) {
      const result = await deployBatch(guild, batches[i], i + 1, batches.length);
      totalSuccess += result.count;
      
      if (result.failed) {
        totalFailed.push(...result.failed);
      }
      
      // Attendre entre les batches (sauf pour le dernier)
      if (i < batches.length - 1) {
        console.log(`⏳ Attente de ${DELAY_BETWEEN_BATCHES}ms avant le prochain batch...`);
        await new Promise(resolve => setTimeout(resolve, DELAY_BETWEEN_BATCHES));
      }
    }
    
    console.log('\n═══════════════════════════════════════════════════════');
    console.log('\n🎉 DÉPLOIEMENT TERMINÉ !\n');
    console.log(`📊 Statistiques finales:`);
    console.log(`  ✅ Déployées avec succès: ${totalSuccess}/${commands.length}`);
    console.log(`  ❌ Échecs: ${totalFailed.length}`);
    
    if (totalFailed.length > 0) {
      console.log(`\n⚠️ Commandes échouées:`);
      totalFailed.forEach(({ name, error }) => {
        console.log(`  • ${name}: ${error}`);
      });
    }
    
    // Vérification finale
    console.log('\n🔍 Vérification finale...');
    const deployedCommands = await guild.commands.fetch();
    console.log(`✅ ${deployedCommands.size} commandes actuellement sur le serveur\n`);
    
    if (deployedCommands.size === commands.length) {
      console.log('✅ PARFAIT ! Toutes les commandes sont déployées !');
    } else {
      console.log(`⚠️ Différence: ${commands.length - deployedCommands.size} commandes manquantes`);
    }
    
    process.exit(totalFailed.length > 0 ? 1 : 0);
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
