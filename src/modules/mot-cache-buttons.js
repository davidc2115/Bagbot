// Handlers pour les boutons de configuration mot-caché
// À intégrer dans bot.js dans la section client.on('interactionCreate')

const { ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder, StringSelectMenuBuilder, EmbedBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { readConfig, writeConfig } = require('../storage/jsonStore');

async function handleMotCacheButton(interaction) {
  const config = await readConfig();
  const guildConfig = config.guilds[interaction.guildId] || {};
  const motCache = guildConfig.motCache || {
    enabled: false,
    targetWord: '',
    mode: 'programmed',
    lettersPerDay: 1,
    probability: 5,
    emoji: '🔍',
    minMessageLength: 15,
    allowedChannels: [],
    letterNotificationChannel: null,
    winnerNotificationChannel: null,
    rewardAmount: 5000,
    collections: {},
    winners: []
  };

  const buttonId = interaction.customId;

  // Toggle enabled/disabled
  if (buttonId === 'motcache_toggle') {
    motCache.enabled = !motCache.enabled;
    guildConfig.motCache = motCache;
    await writeConfig(config);

    return interaction.update({
      content: `✅ Jeu mot-caché ${motCache.enabled ? '**activé**' : '**désactivé**'}`,
      embeds: [],
      components: []
    });
  }

  // Changer le mot
  if (buttonId === 'motcache_setword') {
    const modal = new ModalBuilder()
      .setCustomId('motcache_modal_setword')
      .setTitle('🎯 Définir le mot caché');

    const wordInput = new TextInputBuilder()
      .setCustomId('word')
      .setLabel('Mot à trouver')
      .setStyle(TextInputStyle.Short)
      .setPlaceholder('Ex: CALIN, BOUTEILLE')
      .setRequired(true)
      .setValue(motCache.targetWord || '');

    modal.addComponents(new ActionRowBuilder().addComponents(wordInput));
    return interaction.showModal(modal);
  }

  // Changer le mode
  if (buttonId === 'motcache_mode') {
    const menu = new StringSelectMenuBuilder()
      .setCustomId('motcache_select_mode')
      .setPlaceholder('Choisir le mode de jeu')
      .addOptions([
        {
          label: '📅 Programmé',
          description: 'X lettres par jour à heure fixe',
          value: 'programmed'
        },
        {
          label: '🎲 Probabilité',
          description: 'Chance aléatoire sur chaque message',
          value: 'probability'
        }
      ]);

    return interaction.update({
      content: '🎲 Sélectionne le mode de jeu :',
      components: [new ActionRowBuilder().addComponents(menu)]
    });
  }

  // Probabilité
  if (buttonId === 'motcache_probability') {
    const modal = new ModalBuilder()
      .setCustomId('motcache_modal_probability')
      .setTitle('📊 Probabilité');

    const probInput = new TextInputBuilder()
      .setCustomId('probability')
      .setLabel('Probabilité (%)')
      .setStyle(TextInputStyle.Short)
      .setPlaceholder('Ex: 5 pour 5%')
      .setRequired(true)
      .setValue(motCache.probability?.toString() || '5');

    modal.addComponents(new ActionRowBuilder().addComponents(probInput));
    return interaction.showModal(modal);
  }

  // Lettres par jour
  if (buttonId === 'motcache_lettersperday') {
    const modal = new ModalBuilder()
      .setCustomId('motcache_modal_lettersperday')
      .setTitle('📅 Lettres par jour');

    const lettersInput = new TextInputBuilder()
      .setCustomId('letters')
      .setLabel('Nombre de lettres par jour')
      .setStyle(TextInputStyle.Short)
      .setPlaceholder('Ex: 1, 2, 3...')
      .setRequired(true)
      .setValue(motCache.lettersPerDay?.toString() || '1');

    modal.addComponents(new ActionRowBuilder().addComponents(lettersInput));
    return interaction.showModal(modal);
  }

  // Emoji
  if (buttonId === 'motcache_emoji') {
    const modal = new ModalBuilder()
      .setCustomId('motcache_modal_emoji')
      .setTitle('🔍 Emoji de réaction');

    const emojiInput = new TextInputBuilder()
      .setCustomId('emoji')
      .setLabel('Emoji')
      .setStyle(TextInputStyle.Short)
      .setPlaceholder('Ex: 🔍, 🎯, ⭐')
      .setRequired(true)
      .setValue(motCache.emoji || '🔍');

    modal.addComponents(new ActionRowBuilder().addComponents(emojiInput));
    return interaction.showModal(modal);
  }

  // Salons de jeu (où les lettres apparaissent)
  if (buttonId === 'motcache_gamechannels') {
    const modal = new ModalBuilder()
      .setCustomId('motcache_modal_gamechannels')
      .setTitle('📋 Salons de jeu');

    const channelsInput = new TextInputBuilder()
      .setCustomId('channels')
      .setLabel('IDs des salons (séparés par des virgules)')
      .setStyle(TextInputStyle.Paragraph)
      .setPlaceholder('Ex: 123456789,987654321\nVide = tous les salons')
      .setRequired(false)
      .setValue(motCache.allowedChannels?.join(',') || '');

    modal.addComponents(new ActionRowBuilder().addComponents(channelsInput));
    return interaction.showModal(modal);
  }

  // Salon notification lettres (où on annonce les lettres trouvées)
  if (buttonId === 'motcache_letternotifchannel') {
    const modal = new ModalBuilder()
      .setCustomId('motcache_modal_letternotifchannel')
      .setTitle('💬 Salon notifications lettres');

    const channelInput = new TextInputBuilder()
      .setCustomId('channel')
      .setLabel('ID du salon')
      .setStyle(TextInputStyle.Short)
      .setPlaceholder('Ex: 123456789')
      .setRequired(false)
      .setValue(motCache.letterNotificationChannel || '');

    modal.addComponents(new ActionRowBuilder().addComponents(channelInput));
    return interaction.showModal(modal);
  }

  // Salon notification gagnant
  if (buttonId === 'motcache_winnernotifchannel') {
    const modal = new ModalBuilder()
      .setCustomId('motcache_modal_winnernotifchannel')
      .setTitle('📢 Salon notifications gagnant');

    const channelInput = new TextInputBuilder()
      .setCustomId('channel')
      .setLabel('ID du salon')
      .setStyle(TextInputStyle.Short)
      .setPlaceholder('Ex: 123456789')
      .setRequired(false)
      .setValue(motCache.winnerNotificationChannel || '');

    modal.addComponents(new ActionRowBuilder().addComponents(channelInput));
    return interaction.showModal(modal);
  }

  // Reset jeu
  if (buttonId === 'motcache_reset') {
    motCache.collections = {};
    motCache.targetWord = '';
    motCache.enabled = false;
    guildConfig.motCache = motCache;
    await writeConfig(config);

    return interaction.update({
      content: '🔄 **Jeu réinitialisé !**\nToutes les collections ont été effacées.',
      embeds: [],
      components: []
    });
  }

  // Ouvrir la config (admin uniquement)
  if (buttonId === 'motcache_open_config') {
    if (!interaction.memberPermissions.has('Administrator')) {
      return interaction.reply({
        content: '❌ Seuls les administrateurs peuvent configurer le jeu.',
        ephemeral: true
      });
    }

    const embed = new EmbedBuilder()
      .setTitle('⚙️ Configuration Mot-Caché')
      .setDescription('────────────────────────────')
      .addFields(
        { name: '📊 État', value: motCache.enabled ? '✅ Activé' : '⏸️ Désactivé', inline: true },
        { name: '🎯 Mot cible', value: motCache.targetWord || 'Non défini', inline: true },
        { name: '🔍 Emoji', value: motCache.emoji || '🔍', inline: true },
        { name: '💰 Récompense', value: `${motCache.rewardAmount || 5000} BAG$`, inline: true },
        { name: '📋 Salons jeu', value: motCache.allowedChannels && motCache.allowedChannels.length > 0 ? `${motCache.allowedChannels.length} salons` : 'Tous', inline: true },
        { name: '💬 Salon lettres', value: motCache.letterNotificationChannel ? `<#${motCache.letterNotificationChannel}>` : 'Non configuré', inline: true },
        { name: '📢 Salon gagnant', value: motCache.winnerNotificationChannel ? `<#${motCache.winnerNotificationChannel}>` : 'Non configuré', inline: true }
      )
      .setColor('#9b59b6');

    const row1 = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('motcache_toggle')
        .setLabel(motCache.enabled ? '⏸️ Désactiver' : '▶️ Activer')
        .setStyle(motCache.enabled ? ButtonStyle.Danger : ButtonStyle.Success),
      new ButtonBuilder()
        .setCustomId('motcache_setword')
        .setLabel('🎯 Changer le mot')
        .setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setCustomId('motcache_emoji')
        .setLabel('🔍 Emoji')
        .setStyle(ButtonStyle.Secondary)
    );

    const row2 = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('motcache_gamechannels')
        .setLabel('📋 Salons jeu')
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId('motcache_letternotifchannel')
        .setLabel('💬 Salon lettres')
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId('motcache_winnernotifchannel')
        .setLabel('📢 Salon gagnant')
        .setStyle(ButtonStyle.Secondary)
    );

    const row3 = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('motcache_reset')
        .setLabel('🔄 Reset jeu')
        .setStyle(ButtonStyle.Danger)
    );

    // Pour les messages ephemeral, on doit utiliser reply, pas update
    try {
      // Vérifier si l'interaction vient d'un message ephemeral
      // Dans ce cas, on fait un nouveau reply ephemeral
      return await interaction.reply({
        embeds: [embed],
        components: [row1, row2, row3],
        ephemeral: true
      });
    } catch (err) {
      console.error('[MOT-CACHE] Error replying to config button:', err);
      // Si déjà répondu, essayer update
      try {
        return await interaction.update({
          embeds: [embed],
          components: [row1, row2, row3]
        });
      } catch (err2) {
        console.error('[MOT-CACHE] Update also failed:', err2);
        // Dernier recours: followUp
        try {
          return await interaction.followUp({
            embeds: [embed],
            components: [row1, row2, row3],
            ephemeral: true
          });
        } catch (err3) {
          console.error('[MOT-CACHE] All attempts failed:', err3);
        }
      }
    }
  }

  // Deviner le mot (modal)
  if (buttonId === 'motcache_guess_word') {
    const modal = new ModalBuilder()
      .setCustomId('motcache_modal_guess')
      .setTitle('🎯 Deviner le mot caché');

    const wordInput = new TextInputBuilder()
      .setCustomId('word')
      .setLabel('Quel est le mot caché ?')
      .setStyle(TextInputStyle.Short)
      .setPlaceholder('Entrez votre réponse')
      .setRequired(true);

    modal.addComponents(new ActionRowBuilder().addComponents(wordInput));
    return interaction.showModal(modal);
  }
}

// Handler pour les modals
async function handleMotCacheModal(interaction) {
  const config = await readConfig();
  const guildConfig = config.guilds[interaction.guildId] || {};
  const motCache = guildConfig.motCache || {};

  const modalId = interaction.customId;

  if (modalId === 'motcache_modal_setword') {
    const newWord = interaction.fields.getTextInputValue('word').toUpperCase().trim();
    
    if (newWord.length < 1) {
      return interaction.reply({
        content: '❌ Le mot doit contenir au moins 1 caractère.',
        ephemeral: true
      });
    }

    // Reset le jeu quand on change de mot
    motCache.targetWord = newWord;
    motCache.collections = {};
    guildConfig.motCache = motCache;
    await writeConfig(config);

    return interaction.reply({
      content: `✅ Mot défini : **${newWord}**\n🔄 Toutes les collections ont été réinitialisées.`,
      ephemeral: true
    });
  }

  if (modalId === 'motcache_modal_probability') {
    const prob = parseInt(interaction.fields.getTextInputValue('probability'));
    
    if (isNaN(prob) || prob < 0 || prob > 100) {
      return interaction.reply({
        content: '❌ La probabilité doit être entre 0 et 100.',
        ephemeral: true
      });
    }

    motCache.probability = prob;
    guildConfig.motCache = motCache;
    await writeConfig(config);

    return interaction.reply({
      content: `✅ Probabilité définie : **${prob}%**`,
      ephemeral: true
    });
  }

  if (modalId === 'motcache_modal_lettersperday') {
    const letters = parseInt(interaction.fields.getTextInputValue('letters'));
    
    if (isNaN(letters) || letters < 1 || letters > 20) {
      return interaction.reply({
        content: '❌ Le nombre de lettres doit être entre 1 et 20.',
        ephemeral: true
      });
    }

    motCache.lettersPerDay = letters;
    guildConfig.motCache = motCache;
    await writeConfig(config);

    return interaction.reply({
      content: `✅ Lettres par jour : **${letters}**`,
      ephemeral: true
    });
  }

  if (modalId === 'motcache_modal_emoji') {
    const emoji = interaction.fields.getTextInputValue('emoji').trim();
    
    motCache.emoji = emoji;
    guildConfig.motCache = motCache;
    await writeConfig(config);

    return interaction.reply({
      content: `✅ Emoji défini : ${emoji}`,
      ephemeral: true
    });
  }

  if (modalId === 'motcache_modal_gamechannels') {
    const channelsStr = interaction.fields.getTextInputValue('channels').trim();
    
    if (channelsStr === '') {
      // Vide = tous les salons
      motCache.allowedChannels = [];
    } else {
      // Parser les IDs
      const channelIds = channelsStr.split(',').map(id => id.trim()).filter(id => id.length > 0);
      motCache.allowedChannels = channelIds;
    }
    
    guildConfig.motCache = motCache;
    await writeConfig(config);

    return interaction.reply({
      content: `✅ Salons de jeu configurés : ${motCache.allowedChannels.length > 0 ? `${motCache.allowedChannels.length} salons` : 'Tous les salons'}`,
      ephemeral: true
    });
  }

  if (modalId === 'motcache_modal_letternotifchannel') {
    const channelId = interaction.fields.getTextInputValue('channel').trim();
    
    if (channelId === '') {
      motCache.letterNotificationChannel = null;
    } else {
      // Vérifier que le salon existe
      const channel = interaction.guild.channels.cache.get(channelId);
      if (!channel) {
        return interaction.reply({
          content: `❌ Salon introuvable : ${channelId}`,
          ephemeral: true
        });
      }
      motCache.letterNotificationChannel = channelId;
    }
    
    guildConfig.motCache = motCache;
    await writeConfig(config);

    return interaction.reply({
      content: motCache.letterNotificationChannel 
        ? `✅ Salon notifications lettres : <#${motCache.letterNotificationChannel}>` 
        : '✅ Salon notifications lettres désactivé',
      ephemeral: true
    });
  }

  if (modalId === 'motcache_modal_winnernotifchannel') {
    const channelId = interaction.fields.getTextInputValue('channel').trim();
    
    if (channelId === '') {
      motCache.winnerNotificationChannel = null;
    } else {
      // Vérifier que le salon existe
      const channel = interaction.guild.channels.cache.get(channelId);
      if (!channel) {
        return interaction.reply({
          content: `❌ Salon introuvable : ${channelId}`,
          ephemeral: true
        });
      }
      motCache.winnerNotificationChannel = channelId;
    }
    
    guildConfig.motCache = motCache;
    await writeConfig(config);

    return interaction.reply({
      content: motCache.winnerNotificationChannel 
        ? `✅ Salon notifications gagnant : <#${motCache.winnerNotificationChannel}>` 
        : '✅ Salon notifications gagnant désactivé',
      ephemeral: true
    });
  }

  // Modal deviner le mot
  if (modalId === 'motcache_modal_guess') {
    const guessedWord = interaction.fields.getTextInputValue('word').toUpperCase().trim();
    const userId = interaction.user.id;
    const userLetters = motCache.collections?.[userId] || [];

    if (!motCache.enabled || !motCache.targetWord) {
      return interaction.reply({
        content: '❌ Le jeu n\'est plus actif.',
        ephemeral: true
      });
    }

    if (guessedWord === motCache.targetWord.toUpperCase()) {
      // GAGNÉ !
      const reward = motCache.rewardAmount || 5000;
      
      // Ajouter l'argent
      if (!guildConfig.economy) guildConfig.economy = { balances: {} };
      if (!guildConfig.economy.balances) guildConfig.economy.balances = {};
      if (!guildConfig.economy.balances[userId]) {
        guildConfig.economy.balances[userId] = { amount: 0, money: 0 };
      }
      guildConfig.economy.balances[userId].amount += reward;
      guildConfig.economy.balances[userId].money += reward;

      // Enregistrer le gagnant
      if (!motCache.winners) motCache.winners = [];
      motCache.winners.push({
        userId,
        username: interaction.user.username,
        word: motCache.targetWord,
        date: Date.now(),
        reward
      });

      // Reset le jeu
      motCache.collections = {};
      motCache.targetWord = '';
      motCache.enabled = false;

      guildConfig.motCache = motCache;
      await writeConfig(config);

      const embed = new EmbedBuilder()
        .setTitle('🎉 FÉLICITATIONS !')
        .setDescription(`**Tu as trouvé le mot caché !**\n\n🎯 Mot: **${guessedWord}**\n💰 Récompense: **${reward} BAG$**`)
        .setColor('#2ecc71')
        .setFooter({ text: 'Bravo champion !' });

      // Notifier dans le salon de notifications
      if (motCache.winnerNotificationChannel) {
        const notifChannel = interaction.guild.channels.cache.get(motCache.winnerNotificationChannel);
        if (notifChannel) {
          notifChannel.send({
            content: `🎉 <@${userId}> a trouvé le mot caché : **${guessedWord}** et gagne **${reward} BAG$** !`,
            embeds: [embed]
          });
        }
      }

      return interaction.reply({ embeds: [embed], ephemeral: false });
    } else {
      return interaction.reply({
        content: `❌ Ce n'est pas le bon mot ! Continue à collecter des lettres.\n\n📋 Tes lettres: ${userLetters.join(' ') || 'Aucune'}`,
        ephemeral: true
      });
    }
  }
}

// Handler pour les select menus
async function handleMotCacheSelect(interaction) {
  const config = await readConfig();
  const guildConfig = config.guilds[interaction.guildId] || {};
  const motCache = guildConfig.motCache || {};

  if (interaction.customId === 'motcache_select_mode') {
    const mode = interaction.values[0];
    motCache.mode = mode;
    guildConfig.motCache = motCache;
    await writeConfig(config);

    return interaction.update({
      content: `✅ Mode défini : **${mode === 'programmed' ? '📅 Programmé' : '🎲 Probabilité'}**`,
      components: []
    });
  }
}

module.exports = {
  handleMotCacheButton,
  handleMotCacheModal,
  handleMotCacheSelect
};
