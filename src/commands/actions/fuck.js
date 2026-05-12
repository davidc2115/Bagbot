const { SlashCommandBuilder } = require('discord.js');

module.exports = {
  name: 'fuck',
  dmPermission: true,
  data: new SlashCommandBuilder()
    .setName('fuck')
    .setDescription('Fuck quelqu\'un')
    .addUserOption(option =>
      option.setName('cible')
        .setDescription('Personne à cibler')
        .setRequired(false))
    .setDMPermission(false)
    .setContexts([0, 1, 2])
    .setIntegrationTypes([0, 1]),
  
  async execute(interaction) {
    if (global.handleEconomyAction) {
      return global.handleEconomyAction(interaction, 'fuck');
    } else {
      return interaction.reply({ 
        content: '❌ Système non disponible', 
        ephemeral: true 
      });
    }
  }
};
