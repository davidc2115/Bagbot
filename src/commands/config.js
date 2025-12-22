const { SlashCommandBuilder } = require('discord.js');
/**
* Commande: config
* Description: Configuration du serveur
* Note: Logique complexe avec menus interactifs
* 
* ⚠️ Cette commande est un wrapper - la logique reste dans bot.js pour l'instant
* TODO: Extraire complètement la logique dans ce fichier
*/

module.exports = {
  name: 'config',

  data: new SlashCommandBuilder()
    .setName('config')
    .setDescription('Commande config')
    .setDMPermission(false),

  description: "Configuration du serveur",
  
  async execute(interaction) {
    // Cette commande est encore gérée par bot.js
    // Le handler la passera automatiquement à bot.js si non gérée ici
    console.log('[config] Commande reçue - renvoyée à bot.js pour traitement');
    return false; // Indique au handler de passer au fallback (bot.js)
  }
};
