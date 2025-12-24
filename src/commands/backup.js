const { SlashCommandBuilder, PermissionsBitField, EmbedBuilder } = require('discord.js');

module.exports = {
  name: 'backup',

  data: new SlashCommandBuilder()
    .setName('backup')
    .setDescription('Créer une sauvegarde manuelle des données du serveur')
    .setDMPermission(false),

  description: 'Créer une sauvegarde manuelle (admin)',
  
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
      
      console.log(`[Backup] Backup manuel lancé par ${interaction.user.tag}`);
      
      // Utiliser le système de backup horaire
      const HourlyBackupSystem = require('../storage/hourlyBackupSystem');
      const backupSystem = global.hourlyBackupSystem || new HourlyBackupSystem();
      
      const result = await backupSystem.createBackup({ force: true, reason: 'manual' });
      
      if (!result.success) {
        return interaction.editReply({ 
          content: `❌ Erreur lors de la création du backup: ${result.error}` 
        });
      }
      
      // Créer un embed avec les détails
      const embed = new EmbedBuilder()
        .setColor('#00FF00')
        .setTitle('💾 Backup Créé')
        .setDescription('Une sauvegarde manuelle a été créée avec succès.')
        .addFields(
          { name: '📁 Fichier', value: result.filename, inline: false },
          { name: '📊 Serveurs', value: String(result.guilds || 1), inline: true },
          { name: '👥 Utilisateurs', value: String(result.users || 0), inline: true },
          { name: '💽 Taille', value: `${(result.size / 1024).toFixed(2)} KB`, inline: true },
          { name: '⏱️ Durée', value: `${result.duration}ms`, inline: true }
        )
        .setFooter({ text: `Demandé par ${interaction.user.tag}` })
        .setTimestamp();
      
      await interaction.editReply({ embeds: [embed] });
      
      console.log(`[Backup] ✅ Backup manuel créé: ${result.filename} (${result.users} users)`);
      
    } catch (error) {
      console.error('[Backup] Erreur:', error);
      
      const errorMsg = `❌ Erreur lors de la création du backup: ${error.message}`;
      
      if (interaction.deferred || interaction.replied) {
        await interaction.editReply({ content: errorMsg });
      } else {
        await interaction.reply({ content: errorMsg, ephemeral: true });
      }
    }
  }
};
