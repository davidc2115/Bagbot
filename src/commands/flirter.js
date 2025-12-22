const { SlashCommandBuilder } = require('discord.js');

module.exports = {
  name: 'flirter',
  dmPermission: true,
  data: new SlashCommandBuilder()
    .setName('flirter')
    .setDescription('Flirter quelqu\'un')
    .addUserOption(option =>
      option.setName('cible')
        .setDescription('Personne à cibler')
        .setRequired(false))
    .setDMPermission(true)
    .setContexts([0, 1, 2])
    .setIntegrationTypes([0, 1]),
  
  async execute(interaction) {
    if (global.handleEconomyAction) {
      return global.handleEconomyAction(interaction, 'flirt');
    } else {
      return interaction.reply({ 
        content: '❌ Système non disponible', 
        ephemeral: true 
      });
    }
  }
};
