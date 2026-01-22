/**
 * Helpers pour les commandes de modération
 */

const { EmbedBuilder } = require('discord.js');
const { getGuildStaffRoleIds, getGuildAnimateurRoleIds } = require('../storage/jsonStore');
const { THEME_COLOR_PRIMARY, THEME_FOOTER_ICON } = require('./commonHelpers');

/**
 * Vérifie si un membre fait partie du staff
 */
async function isStaffMember(guild, member) {
  if (!member) return false;
  
  // Admins et modérateurs ont toujours accès
  if (member.permissions?.has?.('Administrator') || member.permissions?.has?.('ModerateMembers')) {
    return true;
  }
  
  // Vérifier les rôles staff configurés
  try {
    const staffRoleIds = await getGuildStaffRoleIds(guild.id);
    if (staffRoleIds && staffRoleIds.length > 0) {
      return member.roles.cache.some(r => staffRoleIds.includes(r.id));
    }
  } catch (_) {}
  
  return false;
}

/**
 * Vérifie si un membre est un animateur
 * Les animateurs peuvent gérer les animations (jeux, événements, etc.)
 * sans avoir accès aux fonctions admin/modération
 */
async function isAnimateur(guild, member) {
  if (!member) return false;
  
  // Admins, modérateurs et staff ont toujours accès aux fonctions animateur
  if (member.permissions?.has?.('Administrator') || member.permissions?.has?.('ModerateMembers')) {
    return true;
  }
  
  // Vérifier les rôles staff (staff a aussi les droits animateur)
  try {
    const staffRoleIds = await getGuildStaffRoleIds(guild.id);
    if (staffRoleIds && staffRoleIds.length > 0) {
      if (member.roles.cache.some(r => staffRoleIds.includes(r.id))) {
        return true;
      }
    }
  } catch (_) {}
  
  // Vérifier les rôles animateur spécifiques
  try {
    const animateurRoleIds = await getGuildAnimateurRoleIds(guild.id);
    if (animateurRoleIds && animateurRoleIds.length > 0) {
      return member.roles.cache.some(r => animateurRoleIds.includes(r.id));
    }
  } catch (_) {}
  
  return false;
}

/**
 * Vérifie si un membre est un animateur OU un admin/modérateur
 * Utilisé pour les commandes qui peuvent être utilisées par les animateurs
 */
async function canManageAnimations(guild, member) {
  return await isAnimateur(guild, member);
}

/**
 * Construit un embed de modération
 */
function buildModEmbed(title, description, fields = []) {
  const embed = new EmbedBuilder()
    .setColor(THEME_COLOR_PRIMARY)
    .setTitle(title)
    .setDescription(description)
    .setTimestamp(new Date())
    .setFooter({ text: 'BAG • Modération', iconURL: THEME_FOOTER_ICON });
  
  if (Array.isArray(fields) && fields.length) {
    embed.addFields(fields);
  }
  
  return embed;
}

module.exports = {
  isStaffMember,
  isAnimateur,
  canManageAnimations,
  buildModEmbed
};