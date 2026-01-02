#!/usr/bin/env node
/**
 * Script pour forcer la mise à jour de actions.list dans la config
 * Execute: node force-update-actions-list.js
 */

const { readConfig, writeConfig } = require('./src/storage/jsonStore');
const path = require('path');

async function main() {
  try {
    console.log('[UPDATE] Chargement de la configuration...');
    const cfg = await readConfig();
    
    const GUILD_ID = process.env.GUILD_ID || process.env.FORCE_GUILD_ID;
    if (!GUILD_ID) {
      console.error('❌ GUILD_ID non défini!');
      process.exit(1);
    }
    
    console.log(`[UPDATE] Guild ID: ${GUILD_ID}`);
    
    if (!cfg.guilds) cfg.guilds = {};
    if (!cfg.guilds[GUILD_ID]) cfg.guilds[GUILD_ID] = {};
    if (!cfg.guilds[GUILD_ID].economy) cfg.guilds[GUILD_ID].economy = {};
    if (!cfg.guilds[GUILD_ID].economy.actions) cfg.guilds[GUILD_ID].economy.actions = {};
    
    const actions = cfg.guilds[GUILD_ID].economy.actions;
    
    console.log('[UPDATE] État actuel de actions.list:');
    console.log(`  - Existe: ${!!actions.list}`);
    console.log(`  - Type: ${typeof actions.list}`);
    console.log(`  - Clés: ${actions.list ? Object.keys(actions.list).length : 0}`);
    
    // Forcer l'initialisation de actions.list
    if (!actions.list || typeof actions.list !== 'object') actions.list = {};
    
    const actionLabels = {
      daily: { label: '💰 Daily', description: 'Récompense quotidienne' },
      work: { label: '💼 Travailler', description: 'Gagner de l\'argent en travaillant' },
      fish: { label: '🎣 Pêcher', description: 'Pêcher pour gagner de l\'argent' },
      give: { label: '💝 Donner', description: 'Donner de l\'argent' },
      steal: { label: '💰 Voler', description: 'Voler quelqu\'un' },
      kiss: { label: '💋 Embrasser', description: 'Embrasser quelqu\'un' },
      flirt: { label: '😘 Flirter', description: 'Flirter avec quelqu\'un' },
      seduce: { label: '😏 Séduire', description: 'Séduire quelqu\'un' },
      fuck: { label: '🔥 Fuck', description: 'Action intense' },
      sodo: { label: '🍑 Sodomie', description: 'Action très intense' },
      orgasme: { label: '💦 Orgasme', description: 'Climax' },
      branler: { label: '✊ Branler', description: 'Action manuelle' },
      doigter: { label: '👉 Doigter', description: 'Action digitale' },
      hairpull: { label: '💇 Tirer cheveux', description: 'Tirer les cheveux' },
      caress: { label: '🫳 Caresser', description: 'Caresser doucement' },
      lick: { label: '👅 Lécher', description: 'Lécher sensuellement' },
      suck: { label: '👄 Sucer', description: 'Action orale' },
      nibble: { label: '😬 Mordre', description: 'Mordiller gentiment' },
      tickle: { label: '🤭 Chatouiller', description: 'Chatouiller quelqu\'un' },
      revive: { label: '💖 Ranimer', description: 'Ranimer quelqu\'un' },
      comfort: { label: '🤗 Réconforter', description: 'Réconforter quelqu\'un' },
      massage: { label: '💆 Masser', description: 'Masser quelqu\'un' },
      dance: { label: '💃 Danser', description: 'Danser ensemble' },
      crime: { label: '🔫 Crime', description: 'Commettre un crime' },
      shower: { label: '🚿 Douche', description: 'Prendre une douche ensemble' },
      wet: { label: '💧 Mouiller', description: 'Mouiller quelqu\'un' },
      bed: { label: '🛏️ Lit', description: 'Aller au lit' },
      undress: { label: '👗 Déshabiller', description: 'Déshabiller quelqu\'un' },
      collar: { label: '⛓️ Collier', description: 'Mettre un collier' },
      leash: { label: '🔗 Laisse', description: 'Mettre en laisse' },
      kneel: { label: '🧎 Agenouiller', description: 'S\'agenouiller' },
      order: { label: '👑 Ordonner', description: 'Donner un ordre' },
      punish: { label: '😈 Punir', description: 'Punir quelqu\'un' },
      rose: { label: '🌹 Rose', description: 'Offrir une rose' },
      wine: { label: '🍷 Vin', description: 'Boire du vin ensemble' },
      pillowfight: { label: '🪶 Bataille oreillers', description: 'Bataille d\'oreillers' },
      sleep: { label: '😴 Dormir', description: 'Dormir ensemble' },
      oops: { label: '😳 Oups', description: 'Moment embarrassant' },
      caught: { label: '😱 Attrapé', description: 'Se faire attraper' },
      tromper: { label: '💔 Tromper', description: 'Tromper son partenaire' },
      orgie: { label: '🔞 Orgie', description: 'Orgie' },
      touche: { label: '✋ Toucher', description: 'Toucher sensuellement' },
      reveiller: { label: '⏰ Réveiller', description: 'Réveiller quelqu\'un' },
      cuisiner: { label: '👨‍🍳 Cuisiner', description: 'Cuisiner pour quelqu\'un' },
      douche: { label: '🚿 Douche', description: 'Douche sensuelle' }
    };
    
    console.log('[UPDATE] Ajout des labels...');
    let added = 0;
    let updated = 0;
    
    for (const [key, data] of Object.entries(actionLabels)) {
      if (!actions.list[key] || typeof actions.list[key] !== 'object') {
        actions.list[key] = data;
        added++;
      } else {
        let modified = false;
        if (!actions.list[key].label) {
          actions.list[key].label = data.label;
          modified = true;
        }
        if (!actions.list[key].description) {
          actions.list[key].description = data.description;
          modified = true;
        }
        if (modified) updated++;
      }
    }
    
    console.log(`[UPDATE] Ajoutées: ${added}, Mises à jour: ${updated}`);
    console.log(`[UPDATE] Total actions.list: ${Object.keys(actions.list).length}`);
    
    console.log('[UPDATE] Sauvegarde de la configuration...');
    await writeConfig(cfg);
    
    console.log('✅ Configuration mise à jour avec succès!');
    console.log('\nActions disponibles:');
    Object.keys(actions.list).sort().forEach(key => {
      console.log(`  - ${key}: ${actions.list[key].label}`);
    });
    
  } catch (error) {
    console.error('❌ Erreur:', error);
    process.exit(1);
  }
}

main();
