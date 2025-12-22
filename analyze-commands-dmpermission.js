const fs = require('fs');
const path = require('path');

// Catégories de commandes
const categories = {
  serverOnly: {
    title: '🏰 SERVEUR UNIQUEMENT (dmPermission: false)',
    commands: [],
    description: 'Commandes qui nécessitent un contexte de serveur'
  },
  serverAndDM: {
    title: '💬 SERVEUR + MP (dmPermission: true)',
    commands: [],
    description: 'Commandes utilisables partout'
  },
  needsReview: {
    title: '⚠️  À VÉRIFIER',
    commands: [],
    description: 'Commandes avec configuration potentiellement incorrecte'
  }
};

// Commandes qui DOIVENT être serveur uniquement
const mustBeServerOnly = [
  // Modération
  'ban', 'kick', 'warn', 'mute', 'unmute', 'quarantaine', 'retirer-quarantaine',
  'purge', 'massban', 'masskick',
  
  // Configuration
  'config', 'configbienvenue',
  
  // Admin
  'backup', 'restore', 'adminxp', 'adminkarma', 'ajoutargent', 'dropargent', 'dropxp',
  
  // Système serveur
  'serveurs', 'bot', 'inactif',
  
  // Jeux multijoueur
  'uno', 'mot-cache'
];

// Commandes qui PEUVENT être serveur + MP
const canBeDM = [
  // Économie personnelle
  'solde', 'daily', 'travailler', 'crime', 'pecher', 'voler',
  
  // Actions sociales (fonctionnent en MP)
  'calin', 'embrasser', 'caresser', 'chatouiller', 'danser', 'flirter',
  'seduire', 'rose', 'confess',
  
  // Info personnelle
  'niveau', 'proche', 'localisation'
];

console.log('🔍 ANALYSE DES COMMANDES DISCORD - dmPermission\n');
console.log('═'.repeat(80));

const commandsPath = path.join(__dirname, 'src', 'commands');
const files = fs.readdirSync(commandsPath)
  .filter(f => f.endsWith('.js') && !f.includes('backup') && !f.includes('.old') && !f.includes('.disabled') && !f.includes('.broken'));

console.log(`\n📦 Total de commandes à analyser: ${files.length}\n`);

for (const file of files) {
  try {
    const filePath = path.join(commandsPath, file);
    const content = fs.readFileSync(filePath, 'utf8');
    const commandName = file.replace('.js', '');
    
    // Détecter dmPermission
    let hasDMTrue = content.includes('dmPermission: true') || content.includes('setDMPermission(true)');
    let hasDMFalse = content.includes('dmPermission: false') || content.includes('setDMPermission(false)');
    
    const info = {
      name: commandName,
      file: file,
      currentDM: hasDMTrue ? 'true' : hasDMFalse ? 'false' : 'undefined'
    };
    
    // Catégoriser
    if (mustBeServerOnly.includes(commandName)) {
      if (hasDMTrue) {
        info.issue = '❌ Devrait être false mais est true';
        categories.needsReview.commands.push(info);
      } else {
        categories.serverOnly.commands.push(info);
      }
    } else if (canBeDM.includes(commandName)) {
      if (hasDMFalse) {
        info.issue = '⚠️  Pourrait être true mais est false';
        categories.needsReview.commands.push(info);
      } else {
        categories.serverAndDM.commands.push(info);
      }
    } else {
      // Analyse contextuelle pour les autres
      if (content.includes('guild.') || content.includes('interaction.guild') || 
          content.includes('Administrator') || content.includes('ManageGuild')) {
        categories.serverOnly.commands.push(info);
      } else {
        categories.serverAndDM.commands.push(info);
      }
    }
  } catch (err) {
    console.error(`Erreur lors de l'analyse de ${file}:`, err.message);
  }
}

// Afficher les résultats
console.log('═'.repeat(80));
console.log('\n📊 RÉSULTATS DE L\'ANALYSE\n');

for (const [key, category] of Object.entries(categories)) {
  console.log(`\n${category.title}`);
  console.log(`${category.description}`);
  console.log('─'.repeat(80));
  console.log(`Total: ${category.commands.length} commandes\n`);
  
  if (category.commands.length > 0) {
    category.commands.sort((a, b) => a.name.localeCompare(b.name));
    category.commands.forEach((cmd, i) => {
      const issue = cmd.issue ? ` ${cmd.issue}` : '';
      console.log(`  ${i + 1}. /${cmd.name} (dmPermission: ${cmd.currentDM})${issue}`);
    });
  }
  console.log('');
}

console.log('═'.repeat(80));
console.log('\n📋 RECOMMANDATIONS\n');

if (categories.needsReview.commands.length > 0) {
  console.log('⚠️  Commandes à corriger:\n');
  categories.needsReview.commands.forEach(cmd => {
    const shouldBe = mustBeServerOnly.includes(cmd.name) ? 'false' : 'true';
    console.log(`  • ${cmd.file}: dmPermission devrait être ${shouldBe}`);
  });
  console.log('');
}

console.log('✅ Configuration recommandée:');
console.log(`  • ${categories.serverOnly.commands.length} commandes avec dmPermission: false`);
console.log(`  • ${categories.serverAndDM.commands.length} commandes avec dmPermission: true`);
console.log('');

// Sauvegarder le rapport
const report = {
  date: new Date().toISOString(),
  total: files.length,
  categories: {
    serverOnly: categories.serverOnly.commands.map(c => c.name),
    serverAndDM: categories.serverAndDM.commands.map(c => c.name),
    needsReview: categories.needsReview.commands
  }
};

fs.writeFileSync(
  path.join(__dirname, 'command-dmpermission-report.json'),
  JSON.stringify(report, null, 2)
);

console.log('💾 Rapport sauvegardé: command-dmpermission-report.json\n');
console.log('═'.repeat(80));
