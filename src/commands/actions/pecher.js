const { SlashCommandBuilder } = require('discord.js');

module.exports = {
  name: 'pecher',
  data: new SlashCommandBuilder()
    .setName('pecher')
    .setDescription('Aller à la pêche')
    .setDMPermission(true),
  
  async execute(interaction) {
    // Cette commande est gérée par bot.js via handleEconomyAction
    console.log('[pecher] Commande reçue - renvoyée à bot.js');
    return false; // Indique au handler de passer au fallback (bot.js)
  }
};
