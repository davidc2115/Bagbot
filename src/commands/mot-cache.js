const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ChannelSelectMenuBuilder, ChannelType, ModalBuilder, TextInputBuilder, TextInputStyle } = require('discord.js');
const { readConfig, writeConfig } = require('../storage/jsonStore');

module.exports = {
  name: 'mot-cache',
  description: '🔍 Jeu du mot caché - Collecte les lettres!',
  dmPermission: false,
  
  data: new SlashCommandBuilder()
    .setName('mot-cache')
    .setDescription('🔍 Jeu du mot caché - Collecte les lettres!')
    .setDMPermission(false),

  async execute(interaction) {
    const config = await readConfig();
    const guildId = interaction.guildId;
    
    if (!config.guilds) config.guilds = {};
    if (!config.guilds[guildId]) config.guilds[guildId] = {};
    
    const motCache = config.guilds[guildId].motCache || {
      enabled: false,
      targetWord: '',
      emoji: '🔍',
      minMessageLength: 15,
      allowedChannels: [],
      letterNotificationChannel: null,
      winnerNotificationChannel: null,
      rewardAmount: 5000,
      collections: {},
      winners: []
    };

    const userId = interaction.user.id;
    const userLetters = motCache.collections?.[userId] || [];
    const isAdmin = interaction.memberPermissions.has('Administrator');

    // Créer l'embed commun
    const embed = new EmbedBuilder()
      .setTitle('🔍 Mot Caché - Jeu de Lettres')
      .setColor(motCache.enabled ? '#9b59b6' : '#95a5a6');

    if (!motCache.enabled || !motCache.targetWord) {
      embed.setDescription('⏸️ **Le jeu n\'est pas activé**\n\nLes administrateurs peuvent le configurer.');
      
      if (isAdmin) {
        // Admin : afficher embed + bouton Config
        const row = new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId('motcache_open_config')
            .setLabel('⚙️ Configurer le jeu')
            .setStyle(ButtonStyle.Primary)
        );
        
        return interaction.reply({ embeds: [embed], components: [row], ephemeral: true });
      } else {
        // Membre : juste l'embed
        return interaction.reply({ embeds: [embed], ephemeral: true });
      }
    }

    // Jeu actif - afficher les lettres collectées
    const wordLength = motCache.targetWord.length;
    const progress = Math.round((userLetters.length / wordLength) * 100);
    
    // Afficher le mot avec les lettres trouvées révélées
    const wordDisplay = motCache.targetWord.toUpperCase().split('').map((letter, index) => {
      // Vérifier si cette lettre a été trouvée
      if (userLetters.includes(letter)) {
        return letter;
      } else {
        return '_';
      }
    }).join(' ');
    
    embed.setDescription(
      `**Mot à trouver:**\n\`\`\`\n${wordDisplay}\n\`\`\`\n` +
      `**Lettres collectées:**\n\`\`\`\n${userLetters.length > 0 ? userLetters.join('  ') : '(Aucune lettre)'}\n\`\`\`\n` +
      `**Progression:** ${userLetters.length}/${wordLength} lettres (${progress}%)`
    );
    
    // Boutons
    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('motcache_guess_word')
        .setLabel('✍️ Entrer le mot')
        .setStyle(ButtonStyle.Success)
    );
    
    if (isAdmin) {
      // Ajouter bouton Config pour admins
      row.addComponents(
        new ButtonBuilder()
          .setCustomId('motcache_open_config')
          .setLabel('⚙️ Config')
          .setStyle(ButtonStyle.Secondary)
      );
    }

    return interaction.reply({ embeds: [embed], components: [row], ephemeral: true });
  }
};
