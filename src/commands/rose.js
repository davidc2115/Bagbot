const { SlashCommandBuilder } = require('discord.js');

module.exports = {
  name: 'rose',
  dmPermission: true,
  data: new SlashCommandBuilder()
    .setName('rose')
    .setDescription('Rose quelqu\'un')
    .addUserOption(option =>
      option.setName('cible')
        .setDescription('Personne à cibler')
        .setRequired(false))
    .setDMPermission(true)
    .setContexts([0, 1, 2])
    .setIntegrationTypes([0, 1]),
  
  async execute(interaction) {
    if (global.handleEconomyAction) {
      return global.handleEconomyAction(interaction, 'rose');
    } else {
      return interaction.reply({ 
        content: '❌ Système non disponible', 
        ephemeral: true 
      });
    }
  }
};
