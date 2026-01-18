// Gestionnaire pour le système mot-caché
// Écoute les messages et cache des lettres aléatoirement

const { readConfig, writeConfig } = require('../storage/jsonStore');

// Fonction pour cacher une lettre dans un message aléatoire
async function handleMessage(message) {
  console.log('[MOT-CACHE-DEBUG] 🔍 Message reçu de', message.author.username);
  
  if (message.author.bot) {
    console.log('[MOT-CACHE-DEBUG] ❌ Message d\'un bot, ignoré');
    return;
  }
  
  if (!message.guild) {
    console.log('[MOT-CACHE-DEBUG] ❌ Pas de guild, ignoré');
    return;
  }

  try {
    const config = await readConfig();
    const guildId = message.guildId;
    if (!config.guilds) config.guilds = {};
    if (!config.guilds[guildId]) config.guilds[guildId] = {};
    const guildConfig = config.guilds[guildId];
    const motCache = guildConfig.motCache || {};

    console.log('[MOT-CACHE-DEBUG] 📋 Config:', {
      enabled: motCache.enabled,
      targetWord: motCache.targetWord,
      mode: motCache.mode,
      probability: motCache.probability,
      emoji: motCache.emoji,
      allowedChannelsCount: motCache.allowedChannels?.length || 0
    });

    // Vérifier si le jeu est activé
    if (!motCache.enabled || !motCache.targetWord) {
      console.log('[MOT-CACHE-DEBUG] ❌ Jeu désactivé ou pas de mot cible');
      return;
    }

    console.log('[MOT-CACHE-DEBUG] ✅ Jeu activé');

    // Vérifier longueur minimale du message
    const minLength = motCache.minMessageLength || 15;
    console.log('[MOT-CACHE-DEBUG] 📏 Longueur message:', message.content.length, '/ min:', minLength);
    
    if (message.content.length < minLength) {
      console.log('[MOT-CACHE-DEBUG] ❌ Message trop court');
      return;
    }

    console.log('[MOT-CACHE-DEBUG] ✅ Longueur OK');

    // Vérifier si le salon est autorisé
    if (motCache.allowedChannels && motCache.allowedChannels.length > 0) {
      const isAllowed = motCache.allowedChannels.includes(message.channelId);
      console.log('[MOT-CACHE-DEBUG] 🔑 Channel', message.channelId, 'autorisé?', isAllowed);
      
      if (!isAllowed) {
        console.log('[MOT-CACHE-DEBUG] ❌ Channel non autorisé');
        console.log('[MOT-CACHE-DEBUG] 📋 Channels autorisés:', motCache.allowedChannels);
        return;
      }
    }

    console.log('[MOT-CACHE-DEBUG] ✅ Channel autorisé');

    // Déterminer si on doit cacher une lettre
    let shouldHide = false;
    const random = Math.random() * 100;

    if (motCache.mode === 'probability') {
      // Mode probabilité
      const prob = motCache.probability || 5;
      shouldHide = random < prob;
      console.log('[MOT-CACHE-DEBUG] 🎲 Mode probabilité:', prob, '% - Random:', random.toFixed(2), '- Résultat:', shouldHide);
    } else {
      // Mode programmé - géré par un cron job
      shouldHide = random < 2; // 2% de chance
      console.log('[MOT-CACHE-DEBUG] 🎲 Mode programmé: 2% - Random:', random.toFixed(2), '- Résultat:', shouldHide);
    }

    if (!shouldHide) {
      console.log('[MOT-CACHE-DEBUG] ❌ Pas de chance cette fois');
      return;
    }

    console.log('[MOT-CACHE-DEBUG] 🎉 LETTRE VA ÊTRE CACHÉE !');

    // Choisir une lettre aléatoire du mot cible
    const targetWord = motCache.targetWord.toUpperCase();
    const randomIndex = Math.floor(Math.random() * targetWord.length);
    const letter = targetWord[randomIndex];

    console.log('[MOT-CACHE-DEBUG] 🔤 Mot cible:', targetWord, '- Lettre choisie:', letter);

    // Ajouter la lettre à la collection de l'utilisateur
    if (!motCache.collections) motCache.collections = {};
    if (!motCache.collections[message.author.id]) {
      motCache.collections[message.author.id] = [];
    }

    // Vérifier si l'utilisateur n'a pas déjà toutes les lettres
    if (motCache.collections[message.author.id].length >= targetWord.length) {
      console.log('[MOT-CACHE-DEBUG] ⚠️ Utilisateur a déjà toutes les lettres');
      return;
    }

    // Ajouter la lettre (autoriser les doublons pour rendre le jeu plus accessible)
    motCache.collections[message.author.id].push(letter);

    console.log('[MOT-CACHE-DEBUG] 💾 Lettre ajoutée - Collection:', motCache.collections[message.author.id]);

    // Sauvegarder
    guildConfig.motCache = motCache;
    await writeConfig(config);

    console.log('[MOT-CACHE-DEBUG] ✅ Config sauvegardée');

    // Ajouter l'emoji au message
    try {
      const emoji = motCache.emoji || '🔍';
      console.log('[MOT-CACHE-DEBUG] 😀 Ajout emoji:', emoji);
      await message.react(emoji);
      console.log('[MOT-CACHE-DEBUG] ✅ Emoji ajouté');
    } catch (err) {
      console.error('[MOT-CACHE-DEBUG] ❌ Erreur ajout emoji:', err.message);
    }

    // Envoyer la notification dans le salon configuré
    if (motCache.letterNotificationChannel) {
      try {
        console.log('[MOT-CACHE-DEBUG] 📢 Envoi notification vers channel:', motCache.letterNotificationChannel);
        
        const notifChannel = message.guild.channels.cache.get(motCache.letterNotificationChannel);
        if (notifChannel) {
          const notifMessage = await notifChannel.send({
            content: `🔍 <@${message.author.id}> **a trouvé une lettre cachée !**\n\n` +
              `Lettre: **${letter}**\n` +
              `Progression: ${motCache.collections[message.author.id].length}/${targetWord.length}\n` +
              `💡 Utilise \`/mot-cache\` puis clique sur "✍️ Entrer le mot" quand tu penses avoir trouvé !`,
            allowedMentions: { users: [message.author.id] }
          });
          
          console.log('[MOT-CACHE-DEBUG] ✅ Notification envoyée');
          
          // Supprimer après 15 secondes
          setTimeout(async () => {
            try {
              await notifMessage.delete();
              console.log('[MOT-CACHE-DEBUG] 🗑️ Notification supprimée après 15s');
            } catch (e) {
              console.log('[MOT-CACHE-DEBUG] ⚠️ Impossible de supprimer la notification');
            }
          }, 15000);
        } else {
          console.warn('[MOT-CACHE-DEBUG] ⚠️ Channel de notification non trouvé:', motCache.letterNotificationChannel);
        }
      } catch (err) {
        console.error('[MOT-CACHE-DEBUG] ❌ Erreur envoi notification:', err.message);
      }
    } else {
      console.warn('[MOT-CACHE-DEBUG] ⚠️ Pas de letterNotificationChannel configuré');
    }

    console.log(`[MOT-CACHE-DEBUG] ✅ SUCCÈS ! Lettre '${letter}' donnée à ${message.author.username} (${motCache.collections[message.author.id].length}/${targetWord.length})`);
  } catch (error) {
    console.error('[MOT-CACHE-DEBUG] ❌ ERREUR:', error);
  }
}

module.exports = { handleMessage };
