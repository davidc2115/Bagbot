#!/usr/bin/env node
/**
 * Script de déploiement spécifique pour la commande /mot-cache
 * Ce script vérifie et déploie la commande mot-cache sur Discord
 */

const { REST, Routes } = require('discord.js');
const fs = require('fs');
const path = require('path');

// Charger l'environnement
try { 
  require('dotenv').config({ override: true, path: '/var/data/.env' }); 
} catch (_) { 
  try { 
    require('dotenv').config({ override: true }); 
  } catch (_) {} 
}

const DISCORD_TOKEN = process.env.DISCORD_TOKEN;
const CLIENT_ID = process.env.CLIENT_ID;
const GUILD_ID = process.env.GUILD_ID;

if (!DISCORD_TOKEN || !CLIENT_ID || !GUILD_ID) {
  console.error('❌ Variables d\'environnement manquantes!');
  console.error('   Requis: DISCORD_TOKEN, CLIENT_ID, GUILD_ID');
  process.exit(1);
}

console.log('🔍 Vérification de la commande mot-cache...\n');

// Charger la commande mot-cache
const motCachePath = path.join(__dirname, 'src', 'commands', 'mot-cache.js');
if (!fs.existsSync(motCachePath)) {
  console.error('❌ Fichier mot-cache.js introuvable!');
  console.error('   Chemin attendu:', motCachePath);
  process.exit(1);
}

console.log('✅ Fichier mot-cache.js trouvé');

// Vérifier les modules associés
const handlerPath = path.join(__dirname, 'src', 'modules', 'mot-cache-handler.js');
const buttonsPath = path.join(__dirname, 'src', 'modules', 'mot-cache-buttons.js');

if (!fs.existsSync(handlerPath)) {
  console.error('⚠️  Module mot-cache-handler.js manquant!');
  console.error('   Chemin attendu:', handlerPath);
}

if (!fs.existsSync(buttonsPath)) {
  console.error('⚠️  Module mot-cache-buttons.js manquant!');
  console.error('   Chemin attendu:', buttonsPath);
}

console.log('✅ Modules associés trouvés');
console.log('\n📦 Chargement de toutes les commandes...\n');

// Charger toutes les commandes
const commands = [];
const commandsPath = path.join(__dirname, 'src', 'commands');
const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));

let motCacheLoaded = false;

for (const file of commandFiles) {
  const filePath = path.join(commandsPath, file);
  try {
    delete require.cache[require.resolve(filePath)];
    const command = require(filePath);
    
    if (command.data) {
      commands.push(command.data.toJSON());
      
      if (file === 'mot-cache.js') {
        console.log(`  🎯 ${command.data.name} - COMMANDE MOT-CACHÉ (${file})`);
        motCacheLoaded = true;
        
        // Afficher les sous-commandes
        const subcommands = command.data.options || [];
        if (subcommands.length > 0) {
          console.log(`     Sous-commandes:`);
          subcommands.forEach(sub => {
            console.log(`     - /${command.data.name} ${sub.name} : ${sub.description}`);
          });
        }
      } else {
        console.log(`  ✅ ${command.data.name} (${file})`);
      }
    } else {
      console.log(`  ⚠️  ${file} - pas de propriété data`);
    }
  } catch (error) {
    console.log(`  ❌ ${file} - erreur: ${error.message}`);
  }
}

if (!motCacheLoaded) {
  console.error('\n❌ ERREUR: La commande mot-cache n\'a pas été chargée correctement!');
  process.exit(1);
}

console.log(`\n📊 Résumé:`);
console.log(`   - Total de commandes: ${commands.length}`);
console.log(`   - Commande mot-cache: ${motCacheLoaded ? '✅ OK' : '❌ MANQUANTE'}`);

console.log(`\n🚀 Déploiement de ${commands.length} commandes sur Discord...`);
console.log(`   Guild ID: ${GUILD_ID}`);
console.log(`   Client ID: ${CLIENT_ID}`);

const rest = new REST().setToken(DISCORD_TOKEN);

(async () => {
  try {
    const data = await rest.put(
      Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID),
      { body: commands }
    );

    console.log(`\n✅ ${data.length} commandes slash enregistrées avec succès!`);
    
    // Vérifier que mot-cache est bien déployé
    const motCacheDeployed = data.find(cmd => cmd.name === 'mot-cache');
    if (motCacheDeployed) {
      console.log('\n🎉 La commande /mot-cache est maintenant disponible sur Discord!');
      console.log('\n📋 Utilisation:');
      console.log('   - /mot-cache jouer    : Voir vos lettres collectées');
      console.log('   - /mot-cache deviner  : Proposer un mot');
      console.log('   - /mot-cache config   : Configuration (admin)');
    } else {
      console.error('\n⚠️  La commande mot-cache n\'apparaît pas dans les commandes déployées!');
    }
    
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Erreur lors du déploiement:', error);
    
    if (error.code === 50001) {
      console.error('\n💡 Le bot n\'a pas accès à ce serveur.');
      console.error('   Vérifiez que le bot est bien invité sur le serveur.');
    } else if (error.code === 'TokenInvalid') {
      console.error('\n💡 Le token Discord est invalide.');
      console.error('   Vérifiez la variable DISCORD_TOKEN dans .env');
    }
    
    process.exit(1);
  }
})();
