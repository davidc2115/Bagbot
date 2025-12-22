const { SlashCommandBuilder, PermissionsBitField, EmbedBuilder } = require('discord.js');

module.exports = {
  name: 'cleanup',
  
  data: new SlashCommandBuilder()
    .setName('cleanup')
    .setDescription('Nettoyer les données des utilisateurs qui ont quitté le serveur')
    .setDMPermission(false),
  
  description: 'Nettoyer les données des utilisateurs qui ont quitté le serveur (admin)',
  
  async execute(interaction) {
    // Vérifier les permissions admin
    const isAdmin = interaction.memberPermissions?.has(PermissionsBitField.Flags.Administrator)
      || interaction.member?.permissions?.has?.(PermissionsBitField.Flags.Administrator);
    
    if (!isAdmin) {
      return interaction.reply({ 
        content: '⛔ Cette commande est réservée aux administrateurs.', 
        ephemeral: true 
      });
    }
    
    try {
      await interaction.deferReply({ ephemeral: true });
      
      const { cleanLeftUsers } = require('../utils/userCleanup');
      
      console.log(`[Cleanup] Nettoyage manuel lancé par ${interaction.user.tag} sur ${interaction.guild.name}`);
      
      const result = await cleanLeftUsers(interaction.guild);
      
      if (!result.success) {
        return interaction.editReply({ 
          content: `❌ Erreur lors du nettoyage: ${result.error}` 
        });
      }
      
      // Créer un embed avec les résultats
      const embed = new EmbedBuilder()
        .setColor(result.removed > 0 ? '#00FF00' : '#FFA500')
        .setTitle('🧹 Nettoyage des Données')
        .setDescription(result.removed > 0 
          ? `Les données des utilisateurs qui ont quitté le serveur ont été supprimées.`
          : `Aucun utilisateur à nettoyer.`
        )
        .addFields(
          { name: '📊 Utilisateurs vérifiés', value: String(result.totalChecked || 0), inline: true },
          { name: '🗑️  Utilisateurs supprimés', value: String(result.removed || 0), inline: true },
          { name: '👥 Membres actuels', value: String(result.currentMembers || 0), inline: true }
        )
        .setFooter({ text: `Demandé par ${interaction.user.tag}` })
        .setTimestamp();
      
      // Ajouter des exemples d'utilisateurs supprimés si disponibles
      if (result.removedUsers && result.removedUsers.length > 0) {
        const examples = result.removedUsers
          .slice(0, 5)
          .map(u => {
            const details = [];
            if (u.amount) details.push(`${u.amount} BAG$`);
            if (u.xp) details.push(`${u.xp} XP`);
            if (u.city) details.push(u.city);
            return `• <@${u.id}> (${u.location})${details.length ? ' - ' + details.join(', ') : ''}`;
          })
          .join('\n');
        
        embed.addFields({ 
          name: '📝 Exemples d\'utilisateurs supprimés', 
          value: examples || 'Aucun détail disponible' 
        });
      }
      
      await interaction.editReply({ embeds: [embed] });
      
      console.log(`[Cleanup] ✅ Nettoyage terminé: ${result.removed} utilisateurs supprimés`);
      
    } catch (error) {
      console.error('[Cleanup] Erreur:', error);
      
      const errorMsg = `❌ Erreur lors du nettoyage: ${error.message}`;
      
      if (interaction.deferred || interaction.replied) {
        await interaction.editReply({ content: errorMsg });
      } else {
        await interaction.reply({ content: errorMsg, ephemeral: true });
      }
    }
  }
};
