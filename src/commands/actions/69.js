const { SlashCommandBuilder } = require('discord.js');

module.exports = {
  name: '69',
  dmPermission: true,
  data: new SlashCommandBuilder()
    .setName('69')
    .setDescription('Position 69 avec quelqu\'un')
    .addUserOption(option =>
      option.setName('cible')
        .setDescription('Personne avec qui faire un 69')
        .setRequired(true))
    .addStringOption(option =>
      option.setName('zone')
        .setDescription('Zone spécifique (optionnel)')
        .setRequired(false)
        .setAutocomplete(true))
    .setDMPermission(true)
    .setContexts([0, 1, 2])
    .setIntegrationTypes([0, 1]),
  
  async autocomplete(interaction) {
    console.log('[69 Autocomplete] Fonction appelée !');
    try {
      // Charger les zones depuis la config
      const guildId = interaction.guild?.id || process.env.GUILD_ID;
      console.log('[69 Autocomplete] Guild ID:', guildId);
      
      if (!guildId) {
        console.log('[69 Autocomplete] Pas de guild ID');
        return interaction.respond([]);
      }
      
      if (!global.getEconomyConfig) {
        console.log('[69 Autocomplete] getEconomyConfig non disponible');
        return interaction.respond([]);
      }
      
      const eco = await global.getEconomyConfig(guildId);
      console.log('[69 Autocomplete] Economy config chargée');
      
      const actionConfig = (eco?.actions?.config || {})['sixtynine'] || {};
      const zones = actionConfig.zones || [];
      console.log('[69 Autocomplete] Zones trouvées:', zones);
      
      if (zones.length === 0) {
        console.log('[69 Autocomplete] Aucune zone, envoi liste vide');
        return interaction.respond([]);
      }
      
      // Convertir les zones en choix
      const choices = zones.map(zone => ({
        name: zone,
        value: zone
      }));
      
      console.log('[69 Autocomplete] Envoi des choix:', choices);
      return interaction.respond(choices.slice(0, 25)); // Max 25 choix
    } catch (error) {
      console.error('[69 Autocomplete] Error:', error);
      return interaction.respond([]);
    }
  },
  
  async execute(interaction) {
    if (global.handleEconomyAction) {
      return global.handleEconomyAction(interaction, 'sixtynine');
    } else {
      return interaction.reply({ 
        content: '❌ Système non disponible', 
        ephemeral: true 
      });
    }
  }
};
