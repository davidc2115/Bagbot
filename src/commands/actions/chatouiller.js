const { SlashCommandBuilder } = require('discord.js');

module.exports = {
  name: 'chatouiller',
  dmPermission: true,
  data: new SlashCommandBuilder()
    .setName('chatouiller')
    .setDescription('Chatouiller quelqu\'un')
    .addUserOption(option =>
      option.setName('cible')
        .setDescription('Personne à cibler')
        .setRequired(false))
    .addStringOption(option =>
      option.setName('zone')
        .setDescription('Zone à chatouiller')
        .setRequired(false).setAutocomplete(true))
    .setDMPermission(true)
    .setContexts([0, 1, 2])
    .setIntegrationTypes([0, 1]),
  

  async autocomplete(interaction) {
    const focusedOption = interaction.options.getFocused(true);
    
    if (focusedOption.name === 'zone') {
      try {
        // Charger la config pour obtenir les zones de cette action
        const getEconomyConfig = global.getEconomyConfig;
        if (!getEconomyConfig) {
          return interaction.respond([]);
        }
        
        // En DM, utiliser le guild ID de l'env
        const guildId = interaction.guild?.id || process.env.GUILD_ID || process.env.FORCE_GUILD_ID;
        if (!guildId) {
          return interaction.respond([]);
        }
        
        const eco = await getEconomyConfig(guildId);
        const actionConfig = eco?.actions?.config?.['tickle'] || {};
        const zones = actionConfig.zones || [];
        
        const filtered = zones
          .filter(zone => String(zone).toLowerCase().includes(focusedOption.value.toLowerCase()))
          .slice(0, 25)
          .map(zone => ({ name: String(zone), value: String(zone) }));
        
        return interaction.respond(filtered);
      } catch (error) {
        console.error(`[Autocomplete] Error for chatouiller:`, error.message);
        return interaction.respond([]);
      }
    }
  },
  async execute(interaction) {
    if (global.handleEconomyAction) {
      return global.handleEconomyAction(interaction, 'tickle');
    } else {
      return interaction.reply({ 
        content: '❌ Système non disponible', 
        ephemeral: true 
      });
    }
  }
};
