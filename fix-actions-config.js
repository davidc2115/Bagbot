#!/usr/bin/env node

/**
 * Script pour ajouter les configurations de calin et sixtynine dans actions.config
 */

const fs = require('fs');
const path = require('path');

const CONFIG_FILE = path.join(__dirname, 'data', 'config.json');

console.log('🔄 Ajout des configurations calin et sixtynine...');

// Lire la config
let config;
try {
    const raw = fs.readFileSync(CONFIG_FILE, 'utf8');
    config = JSON.parse(raw);
} catch (err) {
    console.error('❌ Erreur lecture config:', err.message);
    process.exit(1);
}

// Configurations complètes pour calin et sixtynine
const calinConfig = {
    moneyMin: 3,
    moneyMax: 10,
    karma: 'charm',
    karmaDelta: 2,
    cooldown: 60,
    successRate: 0.95,
    failMoneyMin: 1,
    failMoneyMax: 3,
    failKarmaDelta: 1,
    partnerMoneyShare: 1.0,
    partnerKarmaShare: 1.0,
    xpDelta: 6,
    failXpDelta: 1,
    partnerXpShare: 1.0,
    zones: [
        'Câlin classique',
        'Câlin chaleureux',
        'Câlin réconfortant',
        'Câlin tendre',
        'Gros câlin',
        'Câlin amical',
        'Câlin doux',
        'Câlin prolongé',
        'Câlin sincère',
        'Câlin affectueux'
    ]
};

const sixtynineConfig = {
    moneyMin: 25,
    moneyMax: 65,
    karma: 'perversion',
    karmaDelta: 6,
    cooldown: 600,
    successRate: 0.75,
    failMoneyMin: 12,
    failMoneyMax: 25,
    failKarmaDelta: 4,
    partnerMoneyShare: 1.5,
    partnerKarmaShare: 1.5,
    xpDelta: 20,
    failXpDelta: 5,
    partnerXpShare: 1.5
};

let updated = false;

// Mettre à jour chaque guild
for (const [guildId, guildData] of Object.entries(config.guilds || {})) {
    console.log(`\n📋 Guild: ${guildId}`);
    
    if (!guildData.economy) guildData.economy = {};
    if (!guildData.economy.actions) guildData.economy.actions = {};
    if (!guildData.economy.actions.config) guildData.economy.actions.config = {};
    
    const actionsConfig = guildData.economy.actions.config;
    
    // Ajouter calin
    if (!actionsConfig.calin) {
        actionsConfig.calin = calinConfig;
        console.log('   ✅ Configuration calin ajoutée');
        updated = true;
    } else {
        console.log('   ℹ️  Configuration calin existe déjà');
    }
    
    // Ajouter sixtynine
    if (!actionsConfig.sixtynine) {
        actionsConfig.sixtynine = sixtynineConfig;
        console.log('   ✅ Configuration sixtynine ajoutée');
        updated = true;
    } else {
        console.log('   ℹ️  Configuration sixtynine existe déjà');
    }
    
    // Vérifier que les actions sont activées
    if (!guildData.economy.actions.enabled) {
        guildData.economy.actions.enabled = [];
    }
    
    const enabled = guildData.economy.actions.enabled;
    
    if (!enabled.includes('calin')) {
        enabled.push('calin');
        console.log('   ✅ calin activé');
        updated = true;
    }
    
    if (!enabled.includes('sixtynine')) {
        enabled.push('sixtynine');
        console.log('   ✅ sixtynine activé');
        updated = true;
    }
    
    // Afficher résumé
    console.log(`\n   📊 Résumé :`);
    console.log(`      calin: ${JSON.stringify(actionsConfig.calin?.moneyMin)}-${JSON.stringify(actionsConfig.calin?.moneyMax)} BAG$, cooldown ${actionsConfig.calin?.cooldown}s`);
    console.log(`      sixtynine: ${JSON.stringify(actionsConfig.sixtynine?.moneyMin)}-${JSON.stringify(actionsConfig.sixtynine?.moneyMax)} BAG$, cooldown ${actionsConfig.sixtynine?.cooldown}s`);
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
