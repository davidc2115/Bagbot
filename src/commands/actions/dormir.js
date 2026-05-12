const { SlashCommandBuilder } = require('discord.js');

module.exports = {
  name: 'dormir',
  dmPermission: true,
  data: new SlashCommandBuilder()
    .setName('dormir')
    .setDescription('Dormir quelqu\'un')
    .addUserOption(option =>
      option.setName('cible')
        .setDescription('Personne à cibler')
        .setRequired(false))
    .setDMPermission(false)
    .setContexts([0, 1, 2])
    .setIntegrationTypes([0, 1]),
  
  async execute(interaction) {
    if (global.handleEconomyAction) {
      return global.handleEconomyAction(interaction, 'sleep');
    } else {
      return interaction.reply({ 
        content: '❌ Système non disponible', 
        ephemeral: true 
      });
    }
  }
};
