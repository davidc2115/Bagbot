/**
 * Fonction de validation anti-corruption
 * Vérifie qu'un config n'est pas vide/corrompu avant de l'écrire
 * 
 * @param {object} configData - La configuration à valider
 * @param {string} guildId - ID du serveur (optionnel)
 * @param {string} updateType - Type de mise à jour: 'counting', 'logs', 'economy', etc. (optionnel)
 * @param {object|null} prevConfigData - Snapshot précédent (optionnel, pour détecter une chute brutale)
 */
function validateConfigBeforeWrite(configData, guildId, updateType = 'unknown', prevConfigData = null) {
  try {
    function countUsers(cfg) {
      if (!cfg || typeof cfg !== 'object' || !cfg.guilds || typeof cfg.guilds !== 'object') return 0;
      const ids = new Set();
      for (const gid of Object.keys(cfg.guilds)) {
        const g = cfg.guilds[gid] || {};
        const eco = g.economy?.balances;
        if (eco && typeof eco === 'object') {
          for (const uid of Object.keys(eco)) ids.add(uid);
        }
        const lv = g.levels?.users;
        if (lv && typeof lv === 'object') {
          for (const uid of Object.keys(lv)) ids.add(uid);
        }
      }
      return ids.size;
    }

    // 1. Vérifier que c'est un objet valide
    if (!configData || typeof configData !== 'object') {
      console.error('[Protection] ❌ Config invalide: pas un objet');
      return { valid: false, reason: 'invalid_object' };
    }

    // 2. Vérifier la structure guilds
    if (!configData.guilds || typeof configData.guilds !== 'object') {
      console.error('[Protection] ❌ Config invalide: pas de guilds');
      return { valid: false, reason: 'no_guilds' };
    }

    // 🎯 VALIDATION ALLÉGÉE pour comptage, logs et autres petites mises à jour
    if (updateType === 'counting' || updateType === 'logs' || updateType === 'autothread' || updateType === 'disboard') {
      console.log(`[Protection] ✅ Validation allégée (${updateType}) - OK`);
      return { valid: true, updateType, lightweight: true };
    }

    // 2b. Détection chute brutale (anti-perte massive)
    const prevUsers = countUsers(prevConfigData);
    const newUsers = countUsers(configData);
    if (prevUsers >= 50) {
      const minAllowed = Math.max(10, Math.floor(prevUsers * 0.25));
      if (newUsers < minAllowed) {
        const allow = process.env.ALLOW_DANGEROUS_RESTORE === '1' && updateType === 'restore';
        if (!allow) {
          console.error(`[Protection] ❌ CHUTE BRUTALE BLOQUÉE: ${prevUsers} -> ${newUsers} (min autorisé: ${minAllowed}) updateType=${updateType}`);
          return { valid: false, reason: 'catastrophic_drop', previous: prevUsers, current: newUsers, minAllowed, updateType };
        }
        console.warn(`[Protection] ⚠️ CHUTE BRUTALE AUTORISÉE (ALLOW_DANGEROUS_RESTORE=1): ${prevUsers} -> ${newUsers}`);
      }
    }

    // 3. Si guildId fourni, vérifier ce serveur spécifiquement
    if (guildId) {
      const guild = configData.guilds[guildId];
      if (!guild || typeof guild !== 'object') {
        console.error(`[Protection] ❌ Config invalide: guild ${guildId} manquant`);
        return { valid: false, reason: 'missing_guild' };
      }

      // Vérifier les données d'économie SEULEMENT si c'est une mise à jour d'économie
      if (updateType === 'economy' && guild.economy) {
        const balances = guild.economy.balances || {};
        const balanceCount = Object.keys(balances).length;
        
        // Minimum 10 utilisateurs pour un serveur actif
        if (balanceCount < 10) {
          console.error(`[Protection] ⚠️  ALERTE: Seulement ${balanceCount} utilisateurs économie (minimum 10)`);
          return { valid: false, reason: 'too_few_users', count: balanceCount };
        }

        console.log(`[Protection] ✅ Validation OK: ${balanceCount} utilisateurs`);
      }
    }

    // 4. Compter le total d'utilisateurs tous serveurs (SEULEMENT pour économie)
    if (updateType === 'economy' || updateType === 'unknown') {
      let totalBalances = 0;
      for (const gid in configData.guilds) {
        const g = configData.guilds[gid];
        if (g.economy && g.economy.balances) {
          totalBalances += Object.keys(g.economy.balances).length;
        }
      }

      // ⚠️ Validation stricte SEULEMENT pour économie
      if (updateType === 'economy' && totalBalances < 50) {
        console.error(`[Protection] ❌ CRITIQUE: Seulement ${totalBalances} utilisateurs total (min 50)`);
        return { valid: false, reason: 'total_too_low', total: totalBalances };
      }

      console.log(`[Protection] ✅ Validation ${updateType === 'economy' ? 'stricte' : 'standard'} OK: ${totalBalances} utilisateurs total (unique≈${newUsers})`);
      return { valid: true, totalUsers: newUsers, updateType };
    }

    // 5. Pour les autres types, validation basique OK
    console.log(`[Protection] ✅ Validation basique OK (${updateType})`);
    return { valid: true, updateType };

  } catch (error) {
    console.error('[Protection] ❌ Erreur validation:', error.message);
    return { valid: false, reason: 'validation_error', error: error.message };
  }
}

module.exports = { validateConfigBeforeWrite };
