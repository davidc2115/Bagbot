#!/usr/bin/env node

/**
 * Script pour ajouter les messages MP personnalisés pour l'action "boire"
 */

const fs = require('fs');
const path = require('path');

const CONFIG_FILE = path.join(__dirname, 'data', 'config.json');

console.log('🍺 Ajout des messages MP sensuels pour "boire"...');

// Lire la config
let config;
try {
    const raw = fs.readFileSync(CONFIG_FILE, 'utf8');
    config = JSON.parse(raw);
} catch (err) {
    console.error('❌ Erreur lecture config:', err.message);
    process.exit(1);
}

// Messages MP sensuels pour boire
const boireDmMessages = {
    success: [
        'Tu verses un verre à {target}, le contact de vos mains fait monter la tension…',
        'Vous trinquez, le regard intense, l\'alcool n\'est qu\'un prétexte…',
        'Tu glisses le verre vers {target} avec un sourire coquin, la soirée s\'annonce chaude.',
        'Vos verres s\'entrechoquent, l\'ambiance devient électrique entre vous.',
        'Tu sers généreusement {target}, qui te lance un regard plein de sous-entendus.',
        'L\'alcool délie les langues et les corps… Vous vous rapprochez dangereusement.',
        'Tu partages cette bouteille avec {target}, chaque gorgée rapproche vos lèvres.',
        'Vous buvez au même verre, échange de salive et promesses silencieuses.',
        'Tu fais goûter ta boisson à {target}, langue contre langue, c\'est torride.',
        'L\'alcool vous échauffe, les mains commencent à se balader…',
        'Tu proposes un jeu à boire coquin, {target} accepte avec un sourire malicieux.',
        'Chaque shot vous rapproche, l\'inhibition disparaît progressivement…',
        'Tu verses directement dans la bouche de {target}, moment intense et sensuel.',
        'Vous partagez ce verre dans une atmosphère de plus en plus chaude.',
        'L\'alcool coule, les vêtements commencent à tomber… La soirée ne fait que commencer.',
        'Tu embrasses {target} avec le goût de l\'alcool sur les lèvres, feu et passion.',
        'Vous vous enivrez l\'un de l\'autre autant que de vos verres…',
        'Tu lèches une goutte sur le cou de {target}, prétexte parfait pour plus.',
        'L\'alcool n\'est qu\'une excuse, vous savez tous deux où ça va mener…',
        'Entre deux verres, vos corps se collent, promesse d\'une nuit torride.'
    ],
    fail: [
        '{target} refuse, trop d\'alcool tue le désir.',
        'Tu renverses le verre sur toi, moment sexy ruiné.',
        '{target} grimace, vraiment pas son truc, ambiance cassée.',
        'Trop insistant(e), {target} recule et met les limites.',
        'L\'alcool te fait faire n\'importe quoi, {target} préfère arrêter là.',
        'Tu proposes mais {target} n\'est pas d\'humeur coquine ce soir.',
        'Le verre te glisse des mains, fail complet devant {target}.',
        '{target} refuse net, pas question de mélanger alcool et jeu sensuel.',
        'Tu tentes mais {target} a passé l\'âge de ces combines d\'ado.',
        '{target} te repousse, trop bourré(e) pour être sexy là.'
    ]
};

let updated = false;

// Mettre à jour chaque guild
for (const [guildId, guildData] of Object.entries(config.guilds || {})) {
    console.log(`\n📋 Guild: ${guildId}`);
    
    if (!guildData.economy) guildData.economy = {};
    if (!guildData.economy.actions) guildData.economy.actions = {};
    if (!guildData.economy.actions.messages) guildData.economy.actions.messages = {};
    
    const messages = guildData.economy.actions.messages;
    
    if (!messages.boire || typeof messages.boire !== 'object') {
        messages.boire = boireDmMessages;
        console.log('   ✅ Messages MP ajoutés pour boire');
        updated = true;
    } else {
        // Mettre à jour les messages si vides
        if (!Array.isArray(messages.boire.success) || messages.boire.success.length === 0) {
            messages.boire.success = boireDmMessages.success;
            console.log('   ✅ Messages MP succès ajoutés');
            updated = true;
        }
        if (!Array.isArray(messages.boire.fail) || messages.boire.fail.length === 0) {
            messages.boire.fail = boireDmMessages.fail;
            console.log('   ✅ Messages MP échec ajoutés');
            updated = true;
        }
        if (!updated) {
            console.log('   ℹ️  Messages MP existent déjà');
        }
    }
    
    console.log(`\n   📊 Résumé messages MP boire :`);
    console.log(`      Succès: ${messages.boire?.success?.length || 0} messages sensuels`);
    console.log(`      Échec: ${messages.boire?.fail?.length || 0} messages`);
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
