const { Client, GatewayIntentBits } = require('discord.js');
const fs = require('fs');
const path = require('path');

// Charger depuis /var/data/.env
try { require('dotenv').config({ path: '/var/data/.env' }); } catch (_) {}

const CLIENT_ID = process.env.CLIENT_ID || '1414216173809307780';
const GUILD_ID = process.env.GUILD_ID || '1360897918504271882';
const TOKEN = process.env.DISCORD_TOKEN;

// Commandes prioritaires signalées comme manquantes
const PRIORITY_COMMANDS = [
  'mot-cache',
  'niveau',
  'solde'
];

// Commandes qui ont probablement échoué (après la 49ème)
const LIKELY_MISSING_COMMANDS = [
  'mouiller', 'mute', 'niveau', 'objet', 'ordonner', 'orgasme', 'orgie', 'oups',
  'pause', 'pecher', 'play', 'playlist', 'proche', 'punir', 'purge', 'quarantaine',
  'queue', 'reanimer', 'reconforter', 'restore', 'resume', 'retirer-quarantaine',
  'reveiller', 'rose', 'seduire', 'serveurs', 'skip', 'sodo', 'solde', 'stop',
  'sucer', 'suite-definitive', 'tirercheveux', 'topeconomie', 'topniveaux',
  'touche', 'travailler', 'tromper', 'unban', 'unmute', 'uno', 'vin', 'voler', 'warn'
];

const client = new Client({ intents: [GatewayIntentBits.Guilds] });

client.once('ready', async () => {
  console.log('✅ Bot connecté !');
  console.log(`🎯 Déploiement des commandes MANQUANTES uniquement\n`);
  
  try {
    const guild = await client.guilds.fetch(GUILD_ID);
    
    // 1. Récupérer les commandes actuellement déployées
    console.log('🔍 Récupération des commandes actuellement déployées...');
    const deployedCommands = await guild.commands.fetch();
    const deployedNames = new Set(deployedCommands.map(cmd => cmd.name));
    
    console.log(`📊 ${deployedCommands.size} commandes déjà déployées sur le serveur\n`);
    
    // 2. Charger toutes les commandes du code
    const commands = [];
    const commandsPath = path.join(__dirname, 'src', 'commands');
    const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));
    
    console.log(`📦 Chargement de ${commandFiles.length} fichiers de commandes...\n`);
    
    for (const file of commandFiles) {
      const filePath = path.join(commandsPath, file);
      try {
        delete require.cache[require.resolve(filePath)];
        const command = require(filePath);
        if (command.data) {
          const cmdData = command.data.toJSON();
          commands.push({
            name: cmdData.name,
            data: command.data,
            file: file,
            isPriority: PRIORITY_COMMANDS.includes(cmdData.name),
            isDeployed: deployedNames.has(cmdData.name)
          });
        }
      } catch (error) {
        console.error(`  ❌ ${file}: ${error.message}`);
      }
    }
    
    // 3. Identifier les commandes manquantes
    const missing = commands.filter(cmd => !cmd.isDeployed);
    const priorityMissing = missing.filter(cmd => cmd.isPriority);
    
    console.log('═══════════════════════════════════════════════════════\n');
    console.log(`📊 ANALYSE:`);
    console.log(`  • Total fichiers: ${commandFiles.length}`);
    console.log(`  • Déjà déployées: ${commands.length - missing.length}`);
    console.log(`  • Manquantes: ${missing.length}`);
    console.log(`  • Prioritaires manquantes: ${priorityMissing.length}\n`);
    
    if (priorityMissing.length > 0) {
      console.log('⚠️  COMMANDES PRIORITAIRES MANQUANTES:');
      priorityMissing.forEach(cmd => {
        console.log(`  • ${cmd.name} (${cmd.file})`);
      });
      console.log('');
    }
    
    if (missing.length === 0) {
      console.log('✅ TOUTES LES COMMANDES SONT DÉJÀ DÉPLOYÉES !');
      console.log('Rien à faire.\n');
      process.exit(0);
    }
    
    console.log(`🚀 Déploiement de ${missing.length} commandes manquantes...\n`);
    console.log('═══════════════════════════════════════════════════════\n');
    
    let successCount = 0;
    let errorCount = 0;
    const errors = [];
    
    // Déployer les prioritaires en premier
    const sortedMissing = [
      ...missing.filter(cmd => cmd.isPriority),
      ...missing.filter(cmd => !cmd.isPriority)
    ];
    
    for (let i = 0; i < sortedMissing.length; i++) {
      const cmd = sortedMissing[i];
      const progress = `[${i + 1}/${sortedMissing.length}]`;
      
      try {
        await guild.commands.create(cmd.data);
        console.log(`✅ ${progress} ${cmd.name}${cmd.isPriority ? ' ⭐ PRIORITAIRE' : ''}`);
        successCount++;
        
        // Petite pause pour éviter le rate limiting
        if (i < sortedMissing.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      } catch (error) {
        console.error(`❌ ${progress} ${cmd.name}: ${error.message}`);
        errorCount++;
        errors.push({ name: cmd.name, file: cmd.file, error: error.message });
      }
    }
    
    console.log('\n═══════════════════════════════════════════════════════');
    console.log('\n🎉 DÉPLOIEMENT TERMINÉ !\n');
    console.log(`📊 Résultats:`);
    console.log(`  ✅ Succès: ${successCount}/${missing.length}`);
    console.log(`  ❌ Échecs: ${errorCount}`);
    
    if (errors.length > 0) {
      console.log(`\n❌ COMMANDES ÉCHOUÉES:`);
      errors.forEach(({ name, file, error }) => {
        console.log(`  • ${name} (${file})`);
        console.log(`    └─ ${error}`);
      });
    }
    
    // Vérification finale
    console.log('\n🔍 Vérification finale...');
    const finalCommands = await guild.commands.fetch();
    console.log(`✅ ${finalCommands.size} commandes totales sur le serveur\n`);
    
    // Vérifier les prioritaires
    const deployedPriority = PRIORITY_COMMANDS.filter(name => 
      Array.from(finalCommands.values()).some(cmd => cmd.name === name)
    );
    
    if (deployedPriority.length === PRIORITY_COMMANDS.length) {
      console.log('✅ PARFAIT ! Toutes les commandes prioritaires sont déployées:');
      deployedPriority.forEach(name => console.log(`  • ${name}`));
    } else {
      console.log('⚠️  Commandes prioritaires manquantes:');
      PRIORITY_COMMANDS.filter(name => !deployedPriority.includes(name))
        .forEach(name => console.log(`  • ${name}`));
    }
    
    console.log('');
    process.exit(errorCount > 0 ? 1 : 0);
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
