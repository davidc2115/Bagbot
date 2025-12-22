/**
 * Système de nettoyage automatique des utilisateurs qui ont quitté le serveur
 * Supprime les données des membres qui ne sont plus sur le serveur
 */

const { readConfig, writeConfig } = require('../storage/jsonStore');

/**
 * Nettoyer les utilisateurs qui ont quitté un serveur spécifique
 * @param {Guild} guild - Le serveur Discord
 * @returns {Promise<Object>} Résultat du nettoyage
 */
async function cleanLeftUsers(guild) {
  try {
    console.log(`[UserCleanup] Démarrage nettoyage pour ${guild.name} (${guild.id})`);
    
    const config = await readConfig();
    const guildConfig = config.guilds?.[guild.id];
    
    if (!guildConfig) {
      console.log(`[UserCleanup] Pas de config pour ce serveur`);
      return { success: true, removed: 0, reason: 'no_config' };
    }
    
    // Récupérer tous les membres du serveur
    let allMembers;
    try {
      allMembers = await guild.members.fetch();
      console.log(`[UserCleanup] ${allMembers.size} membres actuels sur le serveur`);
    } catch (error) {
      console.error(`[UserCleanup] Erreur fetch members:`, error.message);
      return { success: false, error: error.message };
    }
    
    const memberIds = new Set(allMembers.map(m => m.id));
    let removedCount = 0;
    let totalChecked = 0;
    const removedUsers = [];
    
    // Nettoyer economy.balances
    if (guildConfig.economy?.balances) {
      const balances = guildConfig.economy.balances;
      const userIds = Object.keys(balances);
      
      console.log(`[UserCleanup] Vérification de ${userIds.length} utilisateurs dans economy`);
      
      for (const userId of userIds) {
        totalChecked++;
        
        if (!memberIds.has(userId)) {
          const userData = balances[userId];
          removedUsers.push({
            id: userId,
            amount: userData.amount || 0,
            location: 'economy.balances'
          });
          delete balances[userId];
          removedCount++;
        }
      }
    }
    
    // Nettoyer levels/stats
    if (guildConfig.stats) {
      const stats = guildConfig.stats;
      const userIds = Object.keys(stats);
      
      console.log(`[UserCleanup] Vérification de ${userIds.length} utilisateurs dans stats`);
      
      for (const userId of userIds) {
        totalChecked++;
        
        if (!memberIds.has(userId)) {
          removedUsers.push({
            id: userId,
            xp: stats[userId]?.xp || 0,
            level: stats[userId]?.level || 0,
            location: 'stats'
          });
          delete stats[userId];
          removedCount++;
        }
      }
    }
    
    // Nettoyer geo/locations
    if (guildConfig.geo?.locations) {
      const locations = guildConfig.geo.locations;
      const userIds = Object.keys(locations);
      
      console.log(`[UserCleanup] Vérification de ${userIds.length} utilisateurs dans geo`);
      
      for (const userId of userIds) {
        totalChecked++;
        
        if (!memberIds.has(userId)) {
          removedUsers.push({
            id: userId,
            city: locations[userId]?.city || 'unknown',
            location: 'geo.locations'
          });
          delete locations[userId];
          removedCount++;
        }
      }
    }
    
    // Nettoyer inactivity.members
    if (guildConfig.inactivity?.members) {
      const members = guildConfig.inactivity.members;
      const userIds = Object.keys(members);
      
      console.log(`[UserCleanup] Vérification de ${userIds.length} utilisateurs dans inactivity`);
      
      for (const userId of userIds) {
        totalChecked++;
        
        if (!memberIds.has(userId)) {
          removedUsers.push({
            id: userId,
            location: 'inactivity.members'
          });
          delete members[userId];
          removedCount++;
        }
      }
    }
    
    // Nettoyer truthdare.participants
    if (guildConfig.truthdare?.participants) {
      const participants = guildConfig.truthdare.participants;
      const userIds = Object.keys(participants);
      
      console.log(`[UserCleanup] Vérification de ${userIds.length} utilisateurs dans truthdare`);
      
      for (const userId of userIds) {
        totalChecked++;
        
        if (!memberIds.has(userId)) {
          removedUsers.push({
            id: userId,
            location: 'truthdare.participants'
          });
          delete participants[userId];
          removedCount++;
        }
      }
    }
    
    // Sauvegarder les modifications si des utilisateurs ont été supprimés
    if (removedCount > 0) {
      await writeConfig(config, 'cleanup');
      
      console.log(`[UserCleanup] ✅ Nettoyage terminé:`);
      console.log(`[UserCleanup]    Utilisateurs vérifiés: ${totalChecked}`);
      console.log(`[UserCleanup]    Utilisateurs supprimés: ${removedCount}`);
      console.log(`[UserCleanup]    Membres actuels: ${memberIds.size}`);
      
      // Log détaillé des premiers utilisateurs supprimés
      if (removedUsers.length > 0) {
        const sample = removedUsers.slice(0, 5);
        console.log(`[UserCleanup]    Exemples supprimés:`, sample);
      }
    } else {
      console.log(`[UserCleanup] ✅ Aucun utilisateur à nettoyer`);
    }
    
    return {
      success: true,
      removed: removedCount,
      totalChecked,
      currentMembers: memberIds.size,
      removedUsers: removedUsers.slice(0, 10) // Garder max 10 pour le log
    };
    
  } catch (error) {
    console.error(`[UserCleanup] Erreur:`, error);
    return { success: false, error: error.message };
  }
}

/**
 * Nettoyer tous les serveurs
 * @param {Client} client - Le client Discord
 * @returns {Promise<Object>} Résumé du nettoyage
 */
async function cleanAllGuilds(client) {
  try {
    console.log(`[UserCleanup] === NETTOYAGE GLOBAL ===`);
    
    const guilds = client.guilds.cache;
    const results = [];
    let totalRemoved = 0;
    
    for (const [guildId, guild] of guilds) {
      const result = await cleanLeftUsers(guild);
      results.push({ guildId, guildName: guild.name, ...result });
      
      if (result.success) {
        totalRemoved += result.removed || 0;
      }
    }
    
    console.log(`[UserCleanup] === NETTOYAGE TERMINÉ ===`);
    console.log(`[UserCleanup] Total utilisateurs supprimés: ${totalRemoved}`);
    
    return {
      success: true,
      totalRemoved,
      guilds: results
    };
    
  } catch (error) {
    console.error(`[UserCleanup] Erreur nettoyage global:`, error);
    return { success: false, error: error.message };
  }
}

module.exports = {
  cleanLeftUsers,
  cleanAllGuilds
};
