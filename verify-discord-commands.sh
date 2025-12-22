#!/bin/bash

# Script pour vérifier les commandes Discord déployées sur la Freebox

HOST="88.174.155.230"
PORT="33000"
USER="bagbot"
PASS="bagbot"

echo "🔍 Connexion à la Freebox pour vérifier les commandes Discord..."
echo ""

# Créer un script Node.js temporaire pour vérifier
cat > /tmp/verify-commands-detailed.js << 'ENDNODE'
const { REST, Routes } = require('discord.js');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const rest = new REST().setToken(process.env.DISCORD_TOKEN);
const CLIENT_ID = process.env.CLIENT_ID || process.env.APPLICATION_ID;

(async () => {
  try {
    console.log('📊 ANALYSE DÉTAILLÉE DES COMMANDES DISCORD\n');
    console.log('═'.repeat(80));
    
    // Récupérer les commandes déployées
    const deployedCommands = await rest.get(Routes.applicationCommands(CLIENT_ID));
    
    // Récupérer les commandes dans le code
    const commandsPath = path.join(__dirname, 'src', 'commands');
    const commandFiles = fs.readdirSync(commandsPath)
      .filter(f => f.endsWith('.js') && !f.includes('backup') && !f.includes('.old') && !f.includes('.disabled') && !f.includes('.broken'));
    
    const codeCommands = new Map();
    const errorCommands = [];
    
    for (const file of commandFiles) {
      try {
        const cmd = require(path.join(commandsPath, file));
        if (cmd.data && cmd.data.name) {
          codeCommands.set(cmd.data.name, {
            file: file,
            description: cmd.data.description || 'Pas de description'
          });
        } else if (cmd.name) {
          codeCommands.set(cmd.name, {
            file: file,
            description: cmd.description || 'Pas de description'
          });
        } else {
          errorCommands.push({ file, error: 'Pas de nom trouvé' });
        }
      } catch (err) {
        errorCommands.push({ file, error: err.message });
      }
    }
    
    const deployedNames = new Set(deployedCommands.map(c => c.name));
    const missingCommands = Array.from(codeCommands.keys()).filter(name => !deployedNames.includes(name));
    
    console.log('\n📦 STATISTIQUES\n');
    console.log(`  Fichiers analysés: ${commandFiles.length}`);
    console.log(`  Commandes dans le code: ${codeCommands.size}`);
    console.log(`  Commandes déployées: ${deployedCommands.length}`);
    console.log(`  Commandes manquantes: ${missingCommands.length}`);
    console.log(`  Fichiers avec erreurs: ${errorCommands.length}`);
    
    if (missingCommands.length > 0) {
      console.log('\n❌ COMMANDES MANQUANTES:\n');
      missingCommands.sort().forEach((cmd, i) => {
        const info = codeCommands.get(cmd);
        console.log(`  ${i + 1}. /${cmd}`);
        console.log(`     Fichier: ${info.file}`);
        console.log(`     Description: ${info.description}`);
      });
    }
    
    if (errorCommands.length > 0) {
      console.log('\n⚠️  FICHIERS AVEC ERREURS:\n');
      errorCommands.forEach(({ file, error }) => {
        console.log(`  • ${file}: ${error}`);
      });
    }
    
    console.log('\n✅ COMMANDES DÉPLOYÉES (sample):\n');
    deployedCommands.slice(0, 10).forEach((cmd, i) => {
      console.log(`  ${i + 1}. /${cmd.name} - ${cmd.description}`);
    });
    
    console.log('\n═'.repeat(80));
    
    // Vérifier des commandes spécifiques
    const testCommands = ['mot-cache', 'solde', 'niveau', 'daily', 'crime', 'travailler', 'config'];
    console.log('\n🔍 VÉRIFICATION COMMANDES SPÉCIFIQUES:\n');
    testCommands.forEach(cmdName => {
      const deployed = deployedCommands.find(c => c.name === cmdName);
      const inCode = codeCommands.has(cmdName);
      
      if (deployed) {
        console.log(`  ✅ /${cmdName} - Déployée`);
      } else if (inCode) {
        console.log(`  ❌ /${cmdName} - Dans le code MAIS PAS déployée`);
      } else {
        console.log(`  ⚠️  /${cmdName} - Pas dans le code`);
      }
    });
    
    console.log('\n═'.repeat(80));
    
    process.exit(missingCommands.length > 0 ? 1 : 0);
    
  } catch (error) {
    console.error('❌ Erreur:', error.message);
    process.exit(1);
  }
})();
ENDNODE

# Envoyer et exécuter sur la Freebox
sshpass -p "$PASS" ssh -p "$PORT" -o StrictHostKeyChecking=no "$USER@$HOST" << 'ENDSSH'
cd /home/bagbot/Bag-bot

# Copier le script
cat > /tmp/verify-commands-detailed.js << 'ENDNODE'
const { REST, Routes } = require('discord.js');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const rest = new REST().setToken(process.env.DISCORD_TOKEN);
const CLIENT_ID = process.env.CLIENT_ID || process.env.APPLICATION_ID;

(async () => {
  try {
    console.log('📊 ANALYSE DÉTAILLÉE DES COMMANDES DISCORD\n');
    console.log('═'.repeat(80));
    
    // Récupérer les commandes déployées
    const deployedCommands = await rest.get(Routes.applicationCommands(CLIENT_ID));
    
    // Récupérer les commandes dans le code
    const commandsPath = path.join(__dirname, 'src', 'commands');
    const commandFiles = fs.readdirSync(commandsPath)
      .filter(f => f.endsWith('.js') && !f.includes('backup') && !f.includes('.old') && !f.includes('.disabled') && !f.includes('.broken'));
    
    const codeCommands = new Map();
    const errorCommands = [];
    
    for (const file of commandFiles) {
      try {
        const cmd = require(path.join(commandsPath, file));
        if (cmd.data && cmd.data.name) {
          codeCommands.set(cmd.data.name, {
            file: file,
            description: cmd.data.description || 'Pas de description'
          });
        } else if (cmd.name) {
          codeCommands.set(cmd.name, {
            file: file,
            description: cmd.description || 'Pas de description'
          });
        } else {
          errorCommands.push({ file, error: 'Pas de nom trouvé' });
        }
      } catch (err) {
        errorCommands.push({ file, error: err.message });
      }
    }
    
    const deployedNames = new Set(deployedCommands.map(c => c.name));
    const missingCommands = Array.from(codeCommands.keys()).filter(name => !deployedNames.includes(name));
    
    console.log('\n📦 STATISTIQUES\n');
    console.log(`  Fichiers analysés: ${commandFiles.length}`);
    console.log(`  Commandes dans le code: ${codeCommands.size}`);
    console.log(`  Commandes déployées: ${deployedCommands.length}`);
    console.log(`  Commandes manquantes: ${missingCommands.length}`);
    console.log(`  Fichiers avec erreurs: ${errorCommands.length}`);
    
    if (missingCommands.length > 0) {
      console.log('\n❌ COMMANDES MANQUANTES:\n');
      missingCommands.sort().forEach((cmd, i) => {
        const info = codeCommands.get(cmd);
        console.log(`  ${i + 1}. /${cmd}`);
        console.log(`     Fichier: ${info.file}`);
        console.log(`     Description: ${info.description}`);
      });
    }
    
    if (errorCommands.length > 0) {
      console.log('\n⚠️  FICHIERS AVEC ERREURS:\n');
      errorCommands.forEach(({ file, error }) => {
        console.log(`  • ${file}: ${error}`);
      });
    }
    
    console.log('\n✅ COMMANDES DÉPLOYÉES (10 premières):\n');
    deployedCommands.slice(0, 10).forEach((cmd, i) => {
      console.log(`  ${i + 1}. /${cmd.name} - ${cmd.description}`);
    });
    
    console.log('\n═'.repeat(80));
    
    // Vérifier des commandes spécifiques
    const testCommands = ['mot-cache', 'solde', 'niveau', 'daily', 'crime', 'travailler', 'config'];
    console.log('\n🔍 VÉRIFICATION COMMANDES SPÉCIFIQUES:\n');
    testCommands.forEach(cmdName => {
      const deployed = deployedCommands.find(c => c.name === cmdName);
      const inCode = codeCommands.has(cmdName);
      
      if (deployed) {
        console.log(`  ✅ /${cmdName} - Déployée`);
      } else if (inCode) {
        console.log(`  ❌ /${cmdName} - Dans le code MAIS PAS déployée`);
      } else {
        console.log(`  ⚠️  /${cmdName} - Pas dans le code`);
      }
    });
    
    console.log('\n═'.repeat(80));
    
    process.exit(missingCommands.length > 0 ? 1 : 0);
    
  } catch (error) {
    console.error('❌ Erreur:', error.message);
    process.exit(1);
  }
})();
ENDNODE

node /tmp/verify-commands-detailed.js

ENDSSH
