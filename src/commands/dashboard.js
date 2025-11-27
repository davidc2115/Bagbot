const { SlashCommandBuilder, PermissionsBitField, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

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
    
    const embed = new EmbedBuilder()
      .setColor(0xFF69B4)
      .setTitle('📊 Dashboard du Bot')
      .setDescription('Bienvenue sur le panneau d administration !')
      .addFields(
        {
          name: '🔗 Lien d accès',
          value: '[Cliquez ici pour ouvrir le dashboard](http://88.174.155.230:3002)',
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
          .setURL('http://88.174.155.230:3002')
          .setStyle(ButtonStyle.Link)
      );
    
    return interaction.reply({ 
      embeds: [embed],
      components: [row],
      ephemeral: true 
    });
  }
};
