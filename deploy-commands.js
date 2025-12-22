const { REST, Routes } = require('discord.js');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const allCommands = [];
const commandsPath = path.join(__dirname, 'src', 'commands');
const commandFiles = fs.readdirSync(commandsPath).filter(f => f.endsWith('.js'));

console.log('📦 Analyse des commandes...');
console.log('='.repeat(80));

for (const file of commandFiles) {
  const filePath = path.join(commandsPath, file);
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const command = require(filePath);
    
    if (!command.data) continue;
    
    const cmdData = command.data.toJSON();
    
    // Vérifier si la commande a dmPermission: true explicitement
    const hasDMPermission = content.includes('dmPermission: true') || 
                           content.includes('setDMPermission(true)');
    
    // FORCER dmPermission: false si pas explicitement true
    if (!hasDMPermission) {
      cmdData.dm_permission = false;
    }
    
    allCommands.push(cmdData);
    
    const dmStatus = hasDMPermission ? '(serveur + MP)' : '(serveur uniquement)';
    console.log(`  🌐 ${cmdData.name} ${dmStatus}`);
    
  } catch (error) {
    console.log(`  ⚠️  ${file} - Erreur: ${error.message}`);
  }
}

console.log('');
console.log('='.repeat(80));
console.log(`📊 Total: ${allCommands.length} commandes`);
console.log('   Déployées en GLOBAL par lots de 10 pour éviter le rate limiting');
console.log('');

const rest = new REST().setToken(process.env.DISCORD_TOKEN);

// Fonction pour attendre
const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));

(async () => {
  try {
    console.log('🚀 Déploiement GLOBAL par lots...');
    console.log('');
    
    // Déployer par lots de 10 commandes
    const BATCH_SIZE = 10;
    let deployed = 0;
    
    for (let i = 0; i < allCommands.length; i += BATCH_SIZE) {
      const batch = allCommands.slice(i, i + BATCH_SIZE);
      console.log(`📤 Déploiement du lot ${Math.floor(i/BATCH_SIZE) + 1}/${Math.ceil(allCommands.length/BATCH_SIZE)} (${batch.length} commandes)...`);
      
      try {
        await rest.put(
          Routes.applicationCommands(process.env.CLIENT_ID),
          { body: allCommands.slice(0, i + batch.length) } // Envoyer toutes les commandes jusqu'à maintenant
        );
        deployed += batch.length;
        console.log(`✅ ${deployed}/${allCommands.length} commandes déployées`);
        
        // Attendre 2 secondes entre chaque lot
        if (i + BATCH_SIZE < allCommands.length) {
          console.log('⏳ Attente 2s avant le prochain lot...');
          await wait(2000);
        }
      } catch (error) {
        console.error(`❌ Erreur lot ${Math.floor(i/BATCH_SIZE) + 1}:`, error.message);
        // Continuer malgré l'erreur
      }
    }
    
    console.log('');
    console.log('🎉 Déploiement terminé !');
    console.log('');
    console.log(`📝 ${allCommands.length} commandes disponibles sur le serveur`);
    console.log('   (MP désactivé sauf pour celles avec dmPermission: true)');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Erreur globale:', error);
    process.exit(1);
  }
})();
