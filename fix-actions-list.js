#!/usr/bin/env node

/**
 * Script pour forcer la mise à jour des actions.list dans config.json
 */

const fs = require('fs');
const path = require('path');

const CONFIG_FILE = path.join(__dirname, 'data', 'config.json');

console.log('🔄 Mise à jour forcée de actions.list...');

// Lire la config
let config;
try {
    const raw = fs.readFileSync(CONFIG_FILE, 'utf8');
    config = JSON.parse(raw);
} catch (err) {
    console.error('❌ Erreur lecture config:', err.message);
    process.exit(1);
}

// Labels complets pour toutes les actions
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
    sodo: { label: '🍑 Sodo', description: 'Sodomie' },
    orgasme: { label: '💦 Orgasme', description: 'Donner un orgasme' },
    branler: { label: '✊ Branler', description: 'Branler quelqu\'un' },
    doigter: { label: '👆 Doigter', description: 'Doigter quelqu\'un' },
    hairpull: { label: '💇 Tirer cheveux', description: 'Tirer les cheveux' },
    caress: { label: '👋 Caresser', description: 'Caresser sensuellement' },
    lick: { label: '👅 Lécher', description: 'Lécher quelqu\'un' },
    suck: { label: '🍭 Sucer', description: 'Sucer quelqu\'un' },
    nibble: { label: '😬 Mordre', description: 'Mordre quelqu\'un' },
    tickle: { label: '🤭 Chatouiller', description: 'Chatouiller quelqu\'un' },
    revive: { label: '💖 Réanimer', description: 'Réanimer quelqu\'un' },
    comfort: { label: '🤲 Réconforter', description: 'Réconforter quelqu\'un' },
    massage: { label: '💆 Masser', description: 'Masser quelqu\'un' },
    dance: { label: '💃 Danser', description: 'Danser avec quelqu\'un' },
    crime: { label: '🔫 Crime', description: 'Commettre un crime' },
    shower: { label: '🚿 Douche', description: 'Prendre une douche ensemble' },
    wet: { label: '💧 Wet', description: 'Mouiller quelqu\'un' },
    bed: { label: '🛏️ Lit', description: 'Aller au lit avec quelqu\'un' },
    undress: { label: '👗 Déshabiller', description: 'Déshabiller quelqu\'un' },
    collar: { label: '⛓️ Collier', description: 'Mettre un collier' },
    leash: { label: '🦮 Laisse', description: 'Mettre en laisse' },
    kneel: { label: '🧎 À genoux', description: 'Mettre à genoux' },
    order: { label: '📢 Ordonner', description: 'Donner un ordre' },
    punish: { label: '🔨 Punir', description: 'Punir quelqu\'un' },
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
    douche: { label: '🚿 Douche', description: 'Douche sensuelle' },
    calin: { label: '🤗 Câlin', description: 'Faire un câlin chaleureux' },
    sixtynine: { label: '♋ 69', description: 'Position 69' }
};

let updated = false;

// Mettre à jour chaque guild
for (const [guildId, guildData] of Object.entries(config.guilds || {})) {
    console.log(`\n📋 Guild: ${guildId}`);
    
    if (!guildData.economy) guildData.economy = {};
    if (!guildData.economy.actions) guildData.economy.actions = {};
    if (!guildData.economy.actions.list) guildData.economy.actions.list = {};
    
    const actionsList = guildData.economy.actions.list;
    const before = Object.keys(actionsList).length;
    
    // Ajouter tous les labels
    for (const [key, data] of Object.entries(actionLabels)) {
        if (!actionsList[key] || typeof actionsList[key] !== 'object') {
            actionsList[key] = data;
            updated = true;
        } else {
            // Compléter les champs manquants
            if (!actionsList[key].label) {
                actionsList[key].label = data.label;
                updated = true;
            }
            if (!actionsList[key].description) {
                actionsList[key].description = data.description;
                updated = true;
            }
        }
    }
    
    const after = Object.keys(actionsList).length;
    console.log(`   Avant: ${before} actions`);
    console.log(`   Après: ${after} actions`);
    
    if (actionsList.calin) {
        console.log(`   ✅ calin: ${actionsList.calin.label}`);
    } else {
        console.log(`   ❌ calin: MANQUANT`);
    }
    
    if (actionsList.sixtynine) {
        console.log(`   ✅ sixtynine: ${actionsList.sixtynine.label}`);
    } else {
        console.log(`   ❌ sixtynine: MANQUANT`);
    }
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
