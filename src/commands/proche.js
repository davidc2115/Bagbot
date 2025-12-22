const { SlashCommandBuilder } = require('discord.js');
/**
 * Commande: proche
 * Description: Trouver les membres proches
 * Note: Logique complexe avec calculs géographiques
 * 
 * ⚠️ Cette commande est un wrapper - la logique reste dans bot.js pour l'instant
 * TODO: Extraire complètement la logique dans ce fichier
 */

module.exports = {
  name: 'proche',

  data: new SlashCommandBuilder()
    .setName('proche')
    .setDescription('Commande proche')
    .addUserOption(option =>
      option.setName('cible')
        .setDescription('Personne à cibler')
        .setRequired(false))
    .setDMPermission(true),

  description: "Trouver les membres proches",
  
  async execute(interaction) {
    // Cette commande est encore gérée par bot.js
    // Le handler la passera automatiquement à bot.js si non gérée ici
    console.log('[proche] Commande reçue - renvoyée à bot.js pour traitement');
    return false; // Indique au handler de passer au fallback (bot.js)
  }
};
