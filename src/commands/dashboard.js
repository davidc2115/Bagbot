const { SlashCommandBuilder, PermissionsBitField, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { getLevelsConfig } = require('../storage/jsonStore');

module.exports = {
  name: 'dashboard',
  data: new SlashCommandBuilder()
    .setName('dashboard')
    .setDescription('📊 Accéder au panneau d administration du bot')
    .setDMPermission(false)
    .setDefaultMemberPermissions(PermissionsBitField.Flags.ManageGuild),
  
  async execute(interaction) {
    const hasManageGuild = interaction.memberPermissions?.has(PermissionsBitField.Flags.ManageGuild);
    if (!hasManageGuild) {
      return interaction.reply({ 
        content: '⛔ Cette commande est réservée aux administrateurs.', 
        ephemeral: true 
      });
    }
    
    // Récupérer l'URL du dashboard depuis la configuration
    let dashboardUrl = 'http://82.67.65.98:3002'; // URL par défaut
    try {
      const fs = require('fs');
      const path = require('path');
      const configPath = path.join(process.cwd(), 'data', 'config.json');
      if (fs.existsSync(configPath)) {
        const configData = JSON.parse(fs.readFileSync(configPath, 'utf8'));
        const guildConfig = configData.guilds?.[interaction.guild.id];
        if (guildConfig?.dashboardUrl) {
          dashboardUrl = guildConfig.dashboardUrl;
        }
      }
    } catch (error) {
      console.error('Erreur lors de la récupération de l\'URL du dashboard:', error);
      // Continuer avec l'URL par défaut
    }
    
    const embed = new EmbedBuilder()
      .setColor(0xFF69B4)
      .setTitle('📊 Dashboard du Bot')
      .setDescription('Bienvenue sur le panneau d administration !')
      .addFields(
        {
          name: '🔗 Lien d accès',
          value: `[Cliquez ici pour ouvrir le dashboard](${dashboardUrl})`,
          inline: false
        },
        {
          name: '✨ Fonctionnalités',
          value: '• 🎮 Gestion des actions et zones\n• 🎵 Gestion de la musique\n• 📊 Configuration complète\n• 🔧 Paramètres du bot',
          inline: false
        },
        {
          name: '🔐 Sécurité',
          value: 'Ce lien est réservé aux administrateurs uniquement.',
          inline: false
        }
      )
      .setThumbnail('https://i.imgur.com/vg9LPU2.png')
      .setFooter({ 
        text: `Demandé par ${interaction.user.username}`, 
        iconURL: interaction.user.displayAvatarURL() 
      })
      .setTimestamp();
    
    const row = new ActionRowBuilder()
      .addComponents(
        new ButtonBuilder()
          .setLabel('🌐 Ouvrir le Dashboard')
          .setURL(dashboardUrl)
          .setStyle(ButtonStyle.Link)
      );
    
    return interaction.reply({ 
      embeds: [embed],
      components: [row],
      ephemeral: true 
    });
  }
};
