#!/usr/bin/env node

/**
 * Script pour ajouter complètement l'action "boire" dans config.json
 */

const fs = require('fs');
const path = require('path');

const CONFIG_FILE = path.join(__dirname, 'data', 'config.json');

console.log('🍺 Ajout complet de l\'action "boire"...');

// Lire la config
let config;
try {
    const raw = fs.readFileSync(CONFIG_FILE, 'utf8');
    config = JSON.parse(raw);
} catch (err) {
    console.error('❌ Erreur lecture config:', err.message);
    process.exit(1);
}

// Configuration complète pour boire
const boireConfig = {
    moneyMin: 5,
    moneyMax: 15,
    karma: 'charm',
    karmaDelta: 2,
    cooldown: 90,
    successRate: 0.9,
    failMoneyMin: 2,
    failMoneyMax: 5,
    failKarmaDelta: 1,
    partnerMoneyShare: 1.0,
    partnerKarmaShare: 1.0,
    xpDelta: 8,
    failXpDelta: 2,
    partnerXpShare: 1.0,
    types: [
        'Bière',
        'Vin',
        'Cocktail',
        'Champagne',
        'Whisky',
        'Rhum',
        'Vodka',
        'Gin',
        'Tequila',
        'Sangria',
        'Mojito',
        'Shot'
    ]
};

const boireLabel = {
    label: '🍺 Boire un verre',
    description: 'Boire un verre ensemble'
};

let updated = false;

// Mettre à jour chaque guild
for (const [guildId, guildData] of Object.entries(config.guilds || {})) {
    console.log(`\n📋 Guild: ${guildId}`);
    
    if (!guildData.economy) guildData.economy = {};
    if (!guildData.economy.actions) guildData.economy.actions = {};
    
    // 1. Ajouter dans actions.list
    if (!guildData.economy.actions.list) guildData.economy.actions.list = {};
    if (!guildData.economy.actions.list.boire) {
        guildData.economy.actions.list.boire = boireLabel;
        console.log('   ✅ Ajouté dans actions.list');
        updated = true;
    } else {
        console.log('   ℹ️  Déjà dans actions.list');
    }
    
    // 2. Ajouter dans actions.config
    if (!guildData.economy.actions.config) guildData.economy.actions.config = {};
    if (!guildData.economy.actions.config.boire) {
        guildData.economy.actions.config.boire = boireConfig;
        console.log('   ✅ Configuration ajoutée');
        updated = true;
    } else {
        console.log('   ℹ️  Configuration existe déjà');
    }
    
    // 3. Ajouter dans actions.enabled
    if (!guildData.economy.actions.enabled) {
        guildData.economy.actions.enabled = [];
    }
    
    if (!guildData.economy.actions.enabled.includes('boire')) {
        guildData.economy.actions.enabled.push('boire');
        console.log('   ✅ Action activée');
        updated = true;
    } else {
        console.log('   ℹ️  Action déjà activée');
    }
    
    // Afficher résumé
    console.log(`\n   📊 Résumé boire :`);
    console.log(`      Label: ${guildData.economy.actions.list.boire?.label}`);
    console.log(`      Argent: ${boireConfig.moneyMin}-${boireConfig.moneyMax} BAG$`);
    console.log(`      Cooldown: ${boireConfig.cooldown}s`);
    console.log(`      Karma: +${boireConfig.karmaDelta} charme`);
    console.log(`      XP: +${boireConfig.xpDelta}`);
    console.log(`      Types: ${boireConfig.types.length} boissons disponibles`);
}

if (updated) {
    // Sauvegarder
    console.log('\n💾 Sauvegarde de la configuration...');
    try {
        fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2), 'utf8');
        console.log('✅ Configuration mise à jour avec succès !');
        console.log('\n🔄 Redémarrez le bot pour appliquer les changements.');
    } catch (err) {
        console.error('❌ Erreur sauvegarde:', err.message);
        process.exit(1);
    }
} else {
    console.log('\n✨ Aucune mise à jour nécessaire.');
}
