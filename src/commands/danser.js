const { SlashCommandBuilder } = require('discord.js');

module.exports = {
  name: 'danser',
  dmPermission: true,
  data: new SlashCommandBuilder()
    .setName('danser')
    .setDescription('Danser quelqu\'un')
    .addUserOption(option =>
      option.setName('cible')
        .setDescription('Personne à cibler')
        .setRequired(false))
    .setDMPermission(true)
    .setContexts([0, 1, 2])
    .setIntegrationTypes([0, 1]),
  
  async execute(interaction) {
    if (global.handleEconomyAction) {
      return global.handleEconomyAction(interaction, 'dance');
    } else {
      return interaction.reply({ 
        content: '❌ Système non disponible', 
        ephemeral: true 
      });
    }
  }
};
