const fs = require('fs');
const path = require('path');

console.log('🔍 ANALYSE DES COMMANDES\n');
console.log('═══════════════════════════════════════════════════════\n');

const commandsPath = path.join(__dirname, 'src', 'commands');
const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));

console.log(`📦 ${commandFiles.length} fichiers trouvés\n`);

const results = {
  valid: [],
  errors: [],
  warnings: []
};

commandFiles.forEach((file, index) => {
  const filePath = path.join(commandsPath, file);
  const num = index + 1;
  
  try {
    // Vider le cache
    delete require.cache[require.resolve(filePath)];
    
    // Charger la commande
    const command = require(filePath);
    
    // Vérifications
    if (!command.data) {
      results.warnings.push({
        num,
        file,
        issue: 'Pas de propriété data'
      });
      console.log(`⚠️  ${num}. ${file}: Pas de data`);
      return;
    }
    
    // Essayer de convertir en JSON (test de validité)
    try {
      const json = command.data.toJSON();
      
      // Vérifications supplémentaires
      const checks = {
        hasName: !!json.name,
        hasDescription: !!json.description,
        nameLength: json.name?.length || 0,
        descLength: json.description?.length || 0,
        hasOptions: Array.isArray(json.options),
        optionsCount: Array.isArray(json.options) ? json.options.length : 0
      };
      
      if (!checks.hasName || !checks.hasDescription) {
        results.warnings.push({
          num,
          file,
          name: json.name,
          issue: `Manque ${!checks.hasName ? 'name' : 'description'}`
        });
        console.log(`⚠️  ${num}. ${file} (${json.name || 'NO_NAME'}): Données incomplètes`);
      } else if (checks.nameLength > 32) {
        results.warnings.push({
          num,
          file,
          name: json.name,
          issue: `Nom trop long (${checks.nameLength} > 32)`
        });
        console.log(`⚠️  ${num}. ${file} (${json.name}): Nom trop long`);
      } else if (checks.descLength > 100) {
        results.warnings.push({
          num,
          file,
          name: json.name,
          issue: `Description trop longue (${checks.descLength} > 100)`
        });
        console.log(`⚠️  ${num}. ${file} (${json.name}): Description trop longue`);
      } else {
        results.valid.push({
          num,
          file,
          name: json.name,
          dmPermission: json.dm_permission,
          optionsCount: checks.optionsCount
        });
        console.log(`✅ ${num}. ${file} (${json.name})${json.dm_permission !== false ? ' [DM OK]' : ' [Serveur]'}`);
      }
    } catch (jsonError) {
      results.errors.push({
        num,
        file,
        name: command.data.name || 'UNKNOWN',
        error: jsonError.message
      });
      console.log(`❌ ${num}. ${file}: Erreur toJSON() - ${jsonError.message}`);
    }
  } catch (error) {
    results.errors.push({
      num,
      file,
      error: error.message
    });
    console.log(`❌ ${num}. ${file}: ${error.message}`);
  }
});

console.log('\n═══════════════════════════════════════════════════════');
console.log('\n📊 RÉSUMÉ DE L\'ANALYSE\n');
console.log(`✅ Commandes valides: ${results.valid.length}`);
console.log(`⚠️  Avertissements: ${results.warnings.length}`);
console.log(`❌ Erreurs critiques: ${results.errors.length}`);

if (results.errors.length > 0) {
  console.log('\n❌ COMMANDES PROBLÉMATIQUES (ERREURS CRITIQUES):\n');
  results.errors.forEach(({ num, file, name, error }) => {
    console.log(`  ${num}. ${file}${name ? ` (${name})` : ''}`);
    console.log(`     └─ ${error}`);
  });
}

if (results.warnings.length > 0) {
  console.log('\n⚠️  COMMANDES AVEC AVERTISSEMENTS:\n');
  results.warnings.forEach(({ num, file, name, issue }) => {
    console.log(`  ${num}. ${file}${name ? ` (${name})` : ''}`);
    console.log(`     └─ ${issue}`);
  });
}

// Sauvegarder le rapport
const report = {
  date: new Date().toISOString(),
  total: commandFiles.length,
  valid: results.valid.length,
  warnings: results.warnings.length,
  errors: results.errors.length,
  details: results
};

fs.writeFileSync(
  path.join(__dirname, 'command-analysis-report.json'),
  JSON.stringify(report, null, 2)
);

console.log('\n📄 Rapport sauvegardé dans: command-analysis-report.json');

console.log('\n═══════════════════════════════════════════════════════\n');

if (results.errors.length > 0) {
  console.log('⚠️  DES ERREURS ONT ÉTÉ DÉTECTÉES !');
  console.log('Ces commandes doivent être corrigées avant le déploiement.\n');
  process.exit(1);
} else {
  console.log('✅ Toutes les commandes sont valides !');
  console.log(`${results.valid.length} commandes prêtes pour le déploiement.\n`);
  process.exit(0);
}
