const fs = require('fs');
const path = require('path');

// Liste toutes les commandes locales
const commandsPath = path.join(__dirname, 'src', 'commands');
const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));

console.log('📦 COMMANDES LOCALES DISPONIBLES:');
console.log('═'.repeat(50));

const localCommands = [];
for (const file of commandFiles) {
  const filePath = path.join(commandsPath, file);
  try {
    delete require.cache[require.resolve(filePath)];
    const command = require(filePath);
    if (command.data) {
      localCommands.push({
        file: file,
        name: command.data.name,
        description: command.data.description
      });
    }
  } catch (err) {
    console.log(`⚠️  ${file}: Erreur lors du chargement - ${err.message}`);
  }
}

// Trier par nom
localCommands.sort((a, b) => a.name.localeCompare(b.name));

// Afficher
localCommands.forEach((cmd, idx) => {
  console.log(`${(idx + 1).toString().padStart(3, ' ')}. /${cmd.name.padEnd(25, ' ')} - ${cmd.description}`);
});

console.log('\n═'.repeat(50));
console.log(`📊 TOTAL: ${localCommands.length} commandes`);
console.log('═'.repeat(50));

console.log('\n💡 Pour vérifier les commandes déployées sur Discord:');
console.log('   1. Utilisez le script deploy-final.js pour redéployer toutes les commandes');
console.log('   2. Ou connectez-vous au serveur Freebox pour vérifier');

console.log('\n📝 Liste des commandes (alphabétique):');
const commandNames = localCommands.map(c => c.name);
console.log(commandNames.join(', '));
