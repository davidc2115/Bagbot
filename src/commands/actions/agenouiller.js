const { SlashCommandBuilder } = require('discord.js');

module.exports = {
  name: 'agenouiller',
  dmPermission: true,
  data: new SlashCommandBuilder()
    .setName('agenouiller')
    .setDescription('Agenouiller quelqu\'un')
    .addUserOption(option =>
      option.setName('cible')
        .setDescription('Personne à cibler')
        .setRequired(false))
    .setDMPermission(false)
    .setContexts([0, 1, 2])
    .setIntegrationTypes([0, 1]),
  
  async execute(interaction) {
    if (global.handleEconomyAction) {
      return global.handleEconomyAction(interaction, 'kneel');
    } else {
      return interaction.reply({ 
        content: '❌ Système non disponible', 
        ephemeral: true 
      });
    }
  }
};
