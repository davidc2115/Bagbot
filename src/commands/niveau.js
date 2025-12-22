const { SlashCommandBuilder } = require('discord.js');
const { getUserStats, getLevelsConfig } = require('../storage/jsonStore');
const { 
  getLastRewardForLevel, 
  memberHasCertifiedRole, 
  memberHasFemaleRole, 
  memberDisplayName, 
  fetchMember,
  xpRequiredForNext
} = require('../utils/levelHelpers');

module.exports = {
  name: 'niveau',

  data: new SlashCommandBuilder()
    .setName('niveau')
    .setDescription('Voir le niveau d\'un membre')
    .addUserOption(option =>
      option.setName('membre')
        .setDescription('Membre concerné (optionnel)')
        .setRequired(false))
    .setDMPermission(true),

  description: 'Commande niveau',
  
  async execute(interaction, context) {
    const { LEVEL_CARD_LOGO_URL, CERTIFIED_LOGO_URL } = context;
    
    try { 
      await interaction.deferReply(); 
    } catch (_) {}
    
    try {
      const { renderLevelCardLandscape } = require('../level-landscape');
      const { renderPrestigeCardRoseGoldLandscape } = require('../prestige-rose-gold-landscape');
      const { renderPrestigeCardBlueLandscape } = require('../prestige-blue-landscape');
      
      const levels = await getLevelsConfig(interaction.guild.id);
      const userFr = interaction.options.getUser?.('utilisateur');
      const userEn = interaction.options.getUser?.('membre');
      const targetUser = userFr || userEn || interaction.user;
      const member = await fetchMember(interaction.guild, targetUser.id);
      const stats = await getUserStats(interaction.guild.id, targetUser.id);
      const lastReward = getLastRewardForLevel(levels, stats.level);
      const roleName = lastReward ? (interaction.guild.roles.cache.get(lastReward.roleId)?.name || `Rôle ${lastReward.roleId}`) : null;
      const name = memberDisplayName(interaction.guild, member, targetUser.id);
      const logoUrl = LEVEL_CARD_LOGO_URL || CERTIFIED_LOGO_URL || undefined;
      const isCertified = memberHasCertifiedRole(member, levels);
      const isFemale = memberHasFemaleRole(member, levels);
      
      // Calculer les informations de progression pour la barre circulaire
      const xpSinceLevel = stats.xpSinceLevel || 0;
      const xpRequiredForNextLevel = xpRequiredForNext(stats.level || 0, levels.levelCurve || { base: 100, factor: 1.2 });
      
      let png;
      if (isCertified) {
        png = await renderLevelCardLandscape({ 
          memberName: name, 
          level: stats.level, 
          roleName: roleName || '—', 
          logoUrl, 
          isCertified: true,
          xpSinceLevel,
          xpRequiredForNext: xpRequiredForNextLevel
        });
      } else if (isFemale) {
        png = await renderPrestigeCardRoseGoldLandscape({
          memberName: name,
          level: stats.level,
          lastRole: roleName || '—',
          logoUrl: CERTIFIED_LOGO_URL || LEVEL_CARD_LOGO_URL || undefined,
          bgLogoUrl: CERTIFIED_LOGO_URL || LEVEL_CARD_LOGO_URL || undefined,
          xpSinceLevel,
          xpRequiredForNext: xpRequiredForNextLevel
        });
      } else {
        png = await renderPrestigeCardBlueLandscape({
          memberName: name,
          level: stats.level,
          lastRole: roleName || '—',
          logoUrl: LEVEL_CARD_LOGO_URL || undefined,
          bgLogoUrl: LEVEL_CARD_LOGO_URL || undefined,
          xpSinceLevel,
          xpRequiredForNext: xpRequiredForNextLevel
        });
      }
      
      const mention = targetUser && targetUser.id !== interaction.user.id ? `<@${targetUser.id}>` : '';
      return interaction.editReply({ content: mention || undefined, files: [{ attachment: png, name: 'level.png' }] });
    } catch (e) {
      console.error('[Niveau Command] Error:', e);
      try { 
        return await interaction.editReply({ content: 'Une erreur est survenue lors du rendu de votre carte de niveau.' }); 
      } catch (_) { 
        return; 
      }
    }
  }
};