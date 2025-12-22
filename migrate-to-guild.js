const { REST, Routes } = require('discord.js');
const fs = require('fs');
const path = require('path');

require('dotenv').config({ path: '/var/data/.env' });

const CLIENT_ID = process.env.CLIENT_ID;
const GUILD_ID = process.env.GUILD_ID;
const TOKEN = process.env.DISCORD_TOKEN;

console.log('🔄 MIGRATION GLOBAL → GUILD\n');
console.log('═══════════════════════════════════════════════════════\n');

async function migrate() {
  try {
    const rest = new REST({ version: '10' }).setToken(TOKEN);
    
    // 1. Charger les commandes locales
    console.log('📦 Chargement des commandes locales...\n');
    
    const commands = [];
    const commandsPath = path.join(__dirname, 'src', 'commands');
    const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));
    
    for (const file of commandFiles) {
      const filePath = path.join(commandsPath, file);
      try {
        delete require.cache[require.resolve(filePath)];
        const command = require(filePath);
        if (command.data) {
          commands.push(command.data.toJSON());
        }
      } catch (error) {
        // Ignorer les erreurs
      }
    }
    
    console.log(`✅ ${commands.length} commandes chargées\n`);
    
    // 2. Déployer TOUTES les commandes sur le GUILD en une seule fois
    console.log('🚀 Déploiement sur le GUILD (serveur spécifique)...\n');
    console.log(`  Méthode: PUT (remplace toutes les commandes du serveur)`);
    console.log(`  Commandes: ${commands.length}\n`);
    
    const guildResult = await rest.put(
      Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID),
      { body: commands }
    );
    
    console.log(`✅ ${guildResult.length} commandes déployées sur le GUILD\n`);
    
    // 3. Supprimer les commandes globales
    console.log('🗑️ Suppression des commandes globales...\n');
    
    try {
      await rest.put(
        Routes.applicationCommands(CLIENT_ID),
        { body: [] }
      );
      console.log(`✅ Commandes globales supprimées\n`);
    } catch (error) {
      console.log(`⚠️ Impossible de supprimer les commandes globales: ${error.message}\n`);
    }
    
    // 4. Vérification finale
    console.log('🔍 Vérification finale...\n');
    
    const finalGuild = await rest.get(Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID));
    const finalGlobal = await rest.get(Routes.applicationCommands(CLIENT_ID));
    
    console.log('═══════════════════════════════════════════════════════\n');
    console.log('🎉 MIGRATION TERMINÉE !\n');
    console.log(`📊 Résultat:`);
    console.log(`  • GUILD (serveur): ${finalGuild.length} commandes ✅`);
    console.log(`  • GLOBAL (tous serveurs): ${finalGlobal.length} commandes\n`);
    
    // Vérifier les commandes prioritaires
    const priority = ['mot-cache', 'niveau', 'solde', 'daily', 'crime', 'balance', 'bank', 'blackjack', 'boutique'];
    console.log('🎯 Commandes prioritaires sur le GUILD:');
    priority.forEach(name => {
      const found = finalGuild.find(cmd => cmd.name === name);
      console.log(`  ${found ? '✅' : '❌'} ${name}`);
    });
    
    console.log('\n📝 Toutes les commandes du GUILD:\n');
    const sorted = finalGuild.sort((a, b) => a.name.localeCompare(b.name));
    sorted.forEach((cmd, i) => {
      if (i < 20) {
        console.log(`  ${i + 1}. ${cmd.name}`);
      }
    });
    
    if (sorted.length > 20) {
      console.log(`  ... et ${sorted.length - 20} autres`);
    }
    
    console.log('\n═══════════════════════════════════════════════════════');
    console.log('\n✅ MIGRATION RÉUSSIE !');
    console.log('\n💡 Les commandes sont maintenant disponibles UNIQUEMENT sur votre serveur.');
    console.log('   Pour les voir : tapez "/" dans n\'importe quel canal.\n');
    
  } catch (error) {
    console.error('\n❌ ERREUR:', error.message);
    if (error.rawError) {
      console.error(`Détails: ${JSON.stringify(error.rawError, null, 2)}`);
    }
    process.exit(1);
  }
}

migrate();
