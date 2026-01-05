const { SlashCommandBuilder } = require('discord.js');

module.exports = {
  name: 'boir-verre',
  dmPermission: true,
  data: new SlashCommandBuilder()
    .setName('boir-verre')
    .setDescription('Boire un verre avec quelqu\'un')
    .addUserOption(option =>
      option.setName('cible')
        .setDescription('Personne avec qui boire')
        .setRequired(false))
    .addStringOption(option =>
      option.setName('type')
        .setDescription('Type de boisson')
        .setRequired(false).setAutocomplete(true))
    .setDMPermission(true)
    .setContexts([0, 1, 2])
    .setIntegrationTypes([0, 1]),
  

  async autocomplete(interaction) {
    const focusedOption = interaction.options.getFocused(true);
    
    if (focusedOption.name === 'type') {
      try {
        // Charger la config pour obtenir les types de cette action
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
        const actionConfig = eco?.actions?.config?.['boire'] || {};
        const types = actionConfig.types || [];
        
        const filtered = types
          .filter(type => String(type).toLowerCase().includes(focusedOption.value.toLowerCase()))
          .slice(0, 25)
          .map(type => ({ name: String(type), value: String(type) }));
        
        return interaction.respond(filtered);
      } catch (error) {
        console.error(`[Autocomplete] Error for boire:`, error.message);
        return interaction.respond([]);
      }
    }
  },
  async execute(interaction) {
    if (global.handleEconomyAction) {
      return global.handleEconomyAction(interaction, 'boire');
    } else {
      return interaction.reply({ 
        content: '❌ Système non disponible', 
        ephemeral: true 
      });
    }
  }
};
