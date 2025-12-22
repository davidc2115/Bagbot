const { SlashCommandBuilder } = require('discord.js');

module.exports = {
  name: 'confess',
  description: 'Envoyer une confession anonyme',
  data: new SlashCommandBuilder()
    .setName('confess')
    .setDescription('Envoyer une confession anonyme')
    .addStringOption(option =>
      option.setName('texte')
        .setDescription('Votre confession')
        .setRequired(true)
        .setMaxLength(2000)
    )
    .addAttachmentOption(option =>
      option.setName('image')
        .setDescription('Image jointe (optionnel)')
        .setRequired(false)
    )
    .setDMPermission(true),
  
  async execute(interaction) {
    // Logique de la commande confess gérée par bot.js
    console.log('[confess] Renvoi vers bot.js');
    return false;
  }
};
