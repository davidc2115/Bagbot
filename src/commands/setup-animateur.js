const { SlashCommandBuilder, PermissionsBitField, EmbedBuilder } = require('discord.js');

// ID du rôle Animateur
const ANIMATEUR_ROLE_ID = '1461045595144847390';

// Catégories à exclure (en minuscules pour la comparaison)
const EXCLUDED_CATEGORIES = ['sauvegarde', 'ticket', 'moderation', 'modération', 'suite', 'admin', 'administration', 'staff', 'fondateur'];

// Permissions à donner au rôle Animateur
const ANIMATEUR_PERMISSIONS = {
  ViewChannel: true,
  SendMessages: true,
  SendMessagesInThreads: true,
  CreatePublicThreads: true,
  CreatePrivateThreads: true,
  EmbedLinks: true,
  AttachFiles: true,
  AddReactions: true,
  UseExternalEmojis: true,
  UseExternalStickers: true,
  MentionEveryone: true,
  ManageMessages: true,
  ManageThreads: true,
  ReadMessageHistory: true,
  UseApplicationCommands: true,
  // Permissions vocales
  Connect: true,
  Speak: true,
  Stream: true,
  UseVAD: true,
  MuteMembers: true,
  DeafenMembers: true,
  MoveMembers: true,
  // Événements
  CreateEvents: true,
  ManageEvents: true,
};

module.exports = {
  name: 'setup-animateur',
  description: '⚙️ Configure les permissions du rôle Animateur sur tous les channels',
  dmPermission: false,
  
  data: new SlashCommandBuilder()
    .setName('setup-animateur')
    .setDescription('⚙️ Configure les permissions du rôle Animateur sur tous les channels')
    .setDMPermission(false)
    .setDefaultMemberPermissions(PermissionsBitField.Flags.Administrator),

  async execute(interaction) {
    // Vérifier les permissions admin
    if (!interaction.memberPermissions.has(PermissionsBitField.Flags.Administrator)) {
      return interaction.reply({
        content: '❌ Cette commande est réservée aux administrateurs.',
        ephemeral: true
      });
    }

    await interaction.deferReply({ ephemeral: true });

    const guild = interaction.guild;
    const animateurRole = guild.roles.cache.get(ANIMATEUR_ROLE_ID);

    if (!animateurRole) {
      return interaction.editReply({
        content: `❌ Le rôle Animateur (ID: ${ANIMATEUR_ROLE_ID}) n'a pas été trouvé sur ce serveur.`
      });
    }

    let successCount = 0;
    let skippedCount = 0;
    let errorCount = 0;
    const skippedCategories = new Set();
    const errors = [];

    // Récupérer tous les channels
    const channels = guild.channels.cache;

    for (const [channelId, channel] of channels) {
      try {
        // Vérifier si le channel est dans une catégorie exclue
        let categoryName = '';
        
        if (channel.parent) {
          categoryName = channel.parent.name.toLowerCase();
        } else if (channel.type === 4) { // C'est une catégorie elle-même
          categoryName = channel.name.toLowerCase();
        }

        // Vérifier si la catégorie est exclue
        const isExcluded = EXCLUDED_CATEGORIES.some(excluded => 
          categoryName.includes(excluded.toLowerCase())
        );

        if (isExcluded) {
          skippedCount++;
          if (channel.parent) {
            skippedCategories.add(channel.parent.name);
          } else if (channel.type === 4) {
            skippedCategories.add(channel.name);
          }
          continue;
        }

        // Appliquer les permissions
        await channel.permissionOverwrites.edit(animateurRole, ANIMATEUR_PERMISSIONS);
        successCount++;

      } catch (error) {
        errorCount++;
        if (errors.length < 5) {
          errors.push(`${channel.name}: ${error.message}`);
        }
      }
    }

    // Créer l'embed de résultat
    const embed = new EmbedBuilder()
      .setTitle('🎭 Configuration du rôle Animateur')
      .setColor(errorCount === 0 ? 0x2ecc71 : 0xf39c12)
      .setDescription(`Les permissions du rôle ${animateurRole} ont été configurées.`)
      .addFields(
        { name: '✅ Channels configurés', value: String(successCount), inline: true },
        { name: '⏭️ Channels ignorés', value: String(skippedCount), inline: true },
        { name: '❌ Erreurs', value: String(errorCount), inline: true }
      )
      .setTimestamp();

    if (skippedCategories.size > 0) {
      embed.addFields({
        name: '📁 Catégories exclues',
        value: Array.from(skippedCategories).map(c => `• ${c}`).join('\n').slice(0, 1024)
      });
    }

    // Lister les permissions accordées
    const permList = Object.entries(ANIMATEUR_PERMISSIONS)
      .filter(([_, v]) => v)
      .map(([k, _]) => `✅ ${k}`)
      .join('\n');
    
    embed.addFields({
      name: '🔐 Permissions accordées',
      value: permList.slice(0, 1024)
    });

    if (errors.length > 0) {
      embed.addFields({
        name: '⚠️ Erreurs rencontrées',
        value: errors.join('\n').slice(0, 1024)
      });
    }

    return interaction.editReply({ embeds: [embed] });
  }
};
