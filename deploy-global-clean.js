#!/usr/bin/env node
/**
 * Script de déploiement GLOBAL des commandes Discord
 * 
 * Ce script :
 * - Déploie TOUTES les commandes en mode GLOBAL (serveur + MP)
 * - Retire automatiquement les anciennes commandes obsolètes
 * - Inclut la nouvelle commande /mot-cache
 * 
 * Mode GLOBAL = disponible sur tous les serveurs + en MP (si dmPermission: true)
 * 
 * ATTENTION : Le déploiement global peut prendre jusqu'à 1 heure pour se propager
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

if (!DISCORD_TOKEN || !CLIENT_ID) {
  console.error('❌ Variables d\'environnement manquantes!');
  console.error('   Requis: DISCORD_TOKEN, CLIENT_ID');
  process.exit(1);
}

console.log('╔═══════════════════════════════════════════════════════════════════════╗');
console.log('║                                                                       ║');
console.log('║       🌐 DÉPLOIEMENT GLOBAL DES COMMANDES DISCORD                   ║');
console.log('║          (Serveur + MP - Nettoyage des anciennes)                   ║');
console.log('║                                                                       ║');
console.log('╚═══════════════════════════════════════════════════════════════════════╝');
console.log('');

const globalCommands = [];  // Commandes avec MP
const guildCommands = [];   // Commandes sans MP
const commandsPath = path.join(__dirname, 'src', 'commands');
const commandFiles = fs.readdirSync(commandsPath).filter(f => f.endsWith('.js'));

console.log('📦 Analyse des commandes...');
console.log('═'.repeat(80));

let motCacheFound = false;

for (const file of commandFiles) {
  const filePath = path.join(commandsPath, file);
  try {
    // Clear cache pour forcer le rechargement
    delete require.cache[require.resolve(filePath)];
    
    const content = fs.readFileSync(filePath, 'utf8');
    const command = require(filePath);
    
    if (!command.data) continue;
    
    const cmdData = command.data.toJSON();
    
    // Vérifier si la commande a dmPermission: true
    const hasDMPermission = content.includes('dmPermission: true') || 
                           content.includes('setDMPermission(true)') ||
                           cmdData.dm_permission === true;
    
    if (hasDMPermission) {
      // Commande disponible sur serveur ET en MP -> GLOBALE
      globalCommands.push(cmdData);
      console.log(`  🌐 ${cmdData.name.padEnd(25)} (global - serveur + MP)`);
    } else {
      // Commande disponible UNIQUEMENT sur serveur -> GUILD
      guildCommands.push(cmdData);
      const prefix = cmdData.name === 'mot-cache' ? '🎯' : '🏰';
      console.log(`  ${prefix} ${cmdData.name.padEnd(25)} (guild - serveur uniquement)`);
      
      if (cmdData.name === 'mot-cache') {
        motCacheFound = true;
      }
    }
  } catch (error) {
    console.log(`  ⚠️  ${file.padEnd(27)} - Erreur: ${error.message}`);
  }
}

console.log('');
console.log('═'.repeat(80));
console.log(`🌐 Commandes GLOBALES (serveur + MP): ${globalCommands.length}`);
console.log(`🏰 Commandes GUILD (serveur uniquement): ${guildCommands.length}`);
console.log(`🎯 Commande mot-cache: ${motCacheFound ? '✅ Trouvée' : '❌ Non trouvée'}`);
console.log('');

if (!motCacheFound) {
  console.log('⚠️  ATTENTION : La commande mot-cache n\'a pas été détectée !');
  console.log('   Elle sera déployée uniquement sur le serveur (mode guild).');
  console.log('');
}

const rest = new REST().setToken(DISCORD_TOKEN);

(async () => {
  try {
    console.log('🚀 Déploiement en cours...');
    console.log('');
    
    // 1. Déployer les commandes globales
    console.log(`📤 Déploiement de ${globalCommands.length} commandes GLOBALES (serveur + MP)...`);
    const globalData = await rest.put(
      Routes.applicationCommands(CLIENT_ID),
      { body: globalCommands }
    );
    console.log(`✅ ${globalData.length} commandes globales déployées`);
    
    // Afficher les commandes globales déployées
    if (globalData.length > 0) {
      console.log('   Commandes globales actives :');
      globalData.slice(0, 5).forEach(cmd => {
        console.log(`   - ${cmd.name}`);
      });
      if (globalData.length > 5) {
        console.log(`   ... et ${globalData.length - 5} autres`);
      }
    }
    console.log('');
    
    // 2. Nettoyer les anciennes commandes globales
    console.log('🧹 Nettoyage des anciennes commandes globales obsolètes...');
    const currentGlobalCommands = await rest.get(Routes.applicationCommands(CLIENT_ID));
    const currentGlobalNames = new Set(globalCommands.map(c => c.name));
    const obsoleteGlobal = currentGlobalCommands.filter(c => !currentGlobalNames.has(c.name));
    
    if (obsoleteGlobal.length > 0) {
      console.log(`   Trouvé ${obsoleteGlobal.length} commande(s) globale(s) obsolète(s) :`);
      for (const cmd of obsoleteGlobal) {
        try {
          await rest.delete(Routes.applicationCommand(CLIENT_ID, cmd.id));
          console.log(`   ❌ ${cmd.name} (supprimée)`);
        } catch (e) {
          console.log(`   ⚠️  ${cmd.name} (erreur de suppression)`);
        }
      }
    } else {
      console.log('   ✅ Aucune commande globale obsolète');
    }
    console.log('');
    
    // 3. Déployer les commandes guild (serveur uniquement)
    if (guildCommands.length > 0 && process.env.GUILD_ID) {
      const GUILD_ID = process.env.GUILD_ID;
      console.log(`📤 Déploiement de ${guildCommands.length} commandes GUILD (serveur uniquement)...`);
      console.log(`   Guild ID: ${GUILD_ID}`);
      
      const guildData = await rest.put(
        Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID),
        { body: guildCommands }
      );
      console.log(`✅ ${guildData.length} commandes guild déployées`);
      
      // Afficher les commandes guild importantes
      const importantCommands = guildData.filter(c => 
        c.name === 'mot-cache' || 
        c.name === 'config' || 
        c.name === 'dashboard'
      );
      if (importantCommands.length > 0) {
        console.log('   Commandes guild principales :');
        importantCommands.forEach(cmd => {
          console.log(`   - ${cmd.name}`);
        });
      }
      console.log('');
      
      // 4. Nettoyer les anciennes commandes guild
      console.log('🧹 Nettoyage des anciennes commandes guild obsolètes...');
      const currentGuildCommands = await rest.get(
        Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID)
      );
      const currentGuildNames = new Set(guildCommands.map(c => c.name));
      const obsoleteGuild = currentGuildCommands.filter(c => !currentGuildNames.has(c.name));
      
      if (obsoleteGuild.length > 0) {
        console.log(`   Trouvé ${obsoleteGuild.length} commande(s) guild obsolète(s) :`);
        for (const cmd of obsoleteGuild) {
          try {
            await rest.delete(Routes.applicationGuildCommand(CLIENT_ID, GUILD_ID, cmd.id));
            console.log(`   ❌ ${cmd.name} (supprimée)`);
          } catch (e) {
            console.log(`   ⚠️  ${cmd.name} (erreur de suppression)`);
          }
        }
      } else {
        console.log('   ✅ Aucune commande guild obsolète');
      }
    } else if (guildCommands.length > 0) {
      console.log('⚠️  GUILD_ID non défini - Les commandes guild ne seront pas déployées');
      console.log('   Cela concerne notamment : mot-cache, config, etc.');
    }
    
    console.log('');
    console.log('═'.repeat(80));
    console.log('');
    console.log('🎉 DÉPLOIEMENT TERMINÉ AVEC SUCCÈS !');
    console.log('');
    console.log('📝 Résultat:');
    console.log(`   - ${globalCommands.length} commandes disponibles partout (serveur + MP)`);
    console.log(`   - ${guildCommands.length} commandes disponibles sur le serveur uniquement`);
    console.log(`   - Total : ${globalCommands.length + guildCommands.length} commandes actives`);
    console.log('');
    
    if (motCacheFound) {
      console.log('🎯 La commande /mot-cache a été déployée avec succès !');
      console.log('');
      console.log('📋 Pour utiliser :');
      console.log('   1. Redémarrer le bot : pm2 restart bagbot');
      console.log('   2. Attendre 1-2 minutes (cache Discord)');
      console.log('   3. Taper /mot-cache config sur Discord');
      console.log('');
    }
    
    console.log('⏱️  NOTE : Les commandes globales peuvent prendre jusqu\'à 1 heure');
    console.log('   pour se propager sur tous les serveurs Discord.');
    console.log('   Les commandes guild sont disponibles immédiatement.');
    console.log('');
    console.log('✅ Anciennes commandes obsolètes supprimées automatiquement');
    console.log('');
    
    process.exit(0);
  } catch (error) {
    console.error('');
    console.error('❌ ERREUR lors du déploiement:');
    console.error('');
    console.error(error);
    console.error('');
    
    if (error.code === 50001) {
      console.error('💡 Le bot n\'a pas accès à ce serveur.');
      console.error('   Vérifiez que le bot est bien invité sur le serveur.');
    } else if (error.code === 'TokenInvalid') {
      console.error('💡 Le token Discord est invalide.');
      console.error('   Vérifiez la variable DISCORD_TOKEN dans .env');
    } else if (error.status === 429) {
      console.error('💡 Rate limit atteint - trop de requêtes.');
      console.error('   Attendez quelques minutes et réessayez.');
    }
    
    console.error('');
    process.exit(1);
  }
})();
