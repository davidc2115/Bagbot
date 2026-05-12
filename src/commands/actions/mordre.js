const { SlashCommandBuilder } = require('discord.js');

module.exports = {
  name: 'mordre',
  dmPermission: true,
  data: new SlashCommandBuilder()
    .setName('mordre')
    .setDescription('Mordre quelqu\'un')
    .addUserOption(option =>
      option.setName('cible')
        .setDescription('Personne à cibler')
        .setRequired(false))
    .setDMPermission(false)
    .setContexts([0, 1, 2])
    .setIntegrationTypes([0, 1]),
  
  async execute(interaction) {
    if (global.handleEconomyAction) {
      return global.handleEconomyAction(interaction, 'nibble');
    } else {
      return interaction.reply({ 
        content: '❌ Système non disponible', 
        ephemeral: true 
      });
    }
  }
};
