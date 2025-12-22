const { SlashCommandBuilder } = require('discord.js');
/**
 * Commande: localisation
 * Description: Définir votre localisation
 * Note: Logique complexe avec geocoding
 * 
 * ⚠️ Cette commande est un wrapper - la logique reste dans bot.js pour l'instant
 * TODO: Extraire complètement la logique dans ce fichier
 */

module.exports = {
  name: 'localisation',

  data: new SlashCommandBuilder()
    .setName('localisation')
    .setDescription('Commande localisation')
    .setDMPermission(true),

  description: "Définir votre localisation",
  
  async execute(interaction) {
    // Cette commande est encore gérée par bot.js
    // Le handler la passera automatiquement à bot.js si non gérée ici
    console.log('[localisation] Commande reçue - renvoyée à bot.js pour traitement');
    return false; // Indique au handler de passer au fallback (bot.js)
  }
};
