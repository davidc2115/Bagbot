const { REST, Routes } = require('discord.js');
const fs = require('fs');
const path = require('path');

require('dotenv').config({ path: '/var/data/.env' });

const CLIENT_ID = process.env.CLIENT_ID;
const GUILD_ID = process.env.GUILD_ID;
const TOKEN = process.env.DISCORD_TOKEN;

console.log('🔄 COPIE GLOBAL → GUILD (une par une)\n');

async function copyOneByOne() {
  try {
    const rest = new REST({ version: '10' }).setToken(TOKEN);
    
    // 1. Récupérer toutes les commandes globales
    console.log('📦 Récupération des commandes globales...\n');
    const globalCommands = await rest.get(Routes.applicationCommands(CLIENT_ID));
    console.log(`✅ ${globalCommands.length} commandes globales trouvées\n`);
    
    // 2. Récupérer les commandes actuelles du GUILD
    console.log('📦 Récupération des commandes GUILD...\n');
    const guildCommands = await rest.get(Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID));
    console.log(`✅ ${guildCommands.length} commandes GUILD actuelles\n`);
    
    const guildCommandNames = new Set(guildCommands.map(c => c.name));
    
    // 3. Charger les commandes locales pour avoir toutes les données
    console.log('📦 Chargement des commandes locales...\n');
    const localCommands = new Map();
    const commandsPath = path.join(__dirname, 'src', 'commands');
    const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));
    
    for (const file of commandFiles) {
      const filePath = path.join(commandsPath, file);
      try {
        delete require.cache[require.resolve(filePath)];
        const command = require(filePath);
        if (command.data) {
          localCommands.set(command.data.name, command.data.toJSON());
        }
      } catch (error) {
        // Ignorer
      }
    }
    
    console.log(`✅ ${localCommands.size} commandes locales chargées\n`);
    
    // 4. Copier les commandes une par une
    console.log('🚀 Copie des commandes vers le GUILD...\n');
    
    let copied = 0;
    let skipped = 0;
    let errors = 0;
    
    // Prioritaires d'abord
    const priority = ['solde', 'daily', 'crime', 'balance', 'bank', 'blackjack', 'boutique', 'coinflip', 'casino'];
    
    // Obtenir toutes les commandes à copier, ordonnées par priorité
    const allNames = new Set([...localCommands.keys()]);
    const orderedNames = [
      ...priority.filter(name => allNames.has(name) && !guildCommandNames.has(name)),
      ...Array.from(allNames).filter(name => !priority.includes(name) && !guildCommandNames.has(name))
    ];
    
    console.log(`📊 ${orderedNames.length} commandes à copier (${guildCommands.length} déjà présentes)\n`);
    
    for (const name of orderedNames) {
      const commandData = localCommands.get(name);
      
      if (!commandData) {
        console.log(`  ⚠️ ${name} (données manquantes)`);
        skipped++;
        continue;
      }
      
      try {
        await rest.post(
          Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID),
          { body: commandData }
        );
        console.log(`  ✅ ${name}`);
        copied++;
        
        // Pause pour éviter rate limit
        await new Promise(resolve => setTimeout(resolve, 500));
        
      } catch (error) {
        if (error.code === 50035) {
          console.log(`  ⚠️ ${name} (invalide)`);
          skipped++;
        } else if (error.status === 429) {
          console.log(`  ⏳ ${name} (rate limit, attente 5s...)`);
          await new Promise(resolve => setTimeout(resolve, 5000));
          // Réessayer
          try {
            await rest.post(
              Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID),
              { body: commandData }
            );
            console.log(`  ✅ ${name} (réussi après attente)`);
            copied++;
          } catch (retryError) {
            console.log(`  ❌ ${name} (${retryError.message})`);
            errors++;
          }
        } else {
          console.log(`  ❌ ${name} (${error.message})`);
          errors++;
        }
      }
      
      // Progression tous les 10
      if ((copied + errors + skipped) % 10 === 0 && copied + errors + skipped > 0) {
        console.log(`\n  📊 Progression: ${copied + errors + skipped}/${orderedNames.length}\n`);
      }
    }
    
    // 5. Vérification finale
    console.log('\n🔍 Vérification finale...\n');
    const finalGuild = await rest.get(Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID));
    
    console.log('═══════════════════════════════════════════════════════\n');
    console.log('🎉 COPIE TERMINÉE !\n');
    console.log(`📊 Résultat:`);
    console.log(`  ✅ ${copied} copiées`);
    console.log(`  ⚠️ ${skipped} invalides`);
    console.log(`  ❌ ${errors} erreurs`);
    console.log(`  📊 TOTAL sur GUILD: ${finalGuild.length} commandes\n`);
    
    // Vérifier prioritaires
    const priorityCheck = ['mot-cache', 'niveau', 'solde', 'daily', 'crime', 'balance', 'bank', 'blackjack', 'boutique'];
    console.log('🎯 Commandes prioritaires:');
    priorityCheck.forEach(name => {
      const found = finalGuild.find(cmd => cmd.name === name);
      console.log(`  ${found ? '✅' : '❌'} ${name}`);
    });
    
    console.log('\n✅ TERMINÉ !\n');
    
  } catch (error) {
    console.error('\n❌ ERREUR:', error.message);
    process.exit(1);
  }
}

copyOneByOne();
