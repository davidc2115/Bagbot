#!/usr/bin/env python3
import subprocess
import json
import sys

print("🔍 Vérification des commandes Discord déployées sur la Freebox...\n")

# Commande SSH pour vérifier les commandes déployées
ssh_command = """
cd /home/bagbot/Bag-bot
node -e "
const { REST, Routes } = require('discord.js');
require('dotenv').config();
const rest = new REST().setToken(process.env.DISCORD_TOKEN);
const CLIENT_ID = process.env.CLIENT_ID || process.env.APPLICATION_ID;
(async () => {
  try {
    const commands = await rest.get(Routes.applicationCommands(CLIENT_ID));
    console.log(JSON.stringify({
      count: commands.length,
      names: commands.map(c => c.name).sort()
    }));
  } catch(e) {
    console.error('ERROR:', e.message);
    process.exit(1);
  }
})();
"
"""

try:
    result = subprocess.run(
        ['ssh', '-p', '33000', '-o', 'StrictHostKeyChecking=no', 
         '-o', 'UserKnownHostsFile=/dev/null', 
         'bagbot@88.174.155.230', ssh_command],
        capture_output=True,
        text=True,
        timeout=30
    )
    
    if result.returncode != 0:
        print(f"❌ Erreur SSH: {result.stderr}")
        print("\n💡 Essayez manuellement:")
        print(f"   ssh -p 33000 bagbot@88.174.155.230")
        print(f"   Mot de passe: bagbot")
        sys.exit(1)
    
    # Parser la réponse JSON
    output = result.stdout.strip()
    data = json.loads(output)
    
    print(f"📊 COMMANDES DÉPLOYÉES SUR DISCORD: {data['count']}\n")
    print("═" * 80)
    print("\n✅ Liste des commandes déployées:\n")
    
    for i, name in enumerate(data['names'], 1):
        print(f"  {i:2}. /{name}")
    
    print("\n" + "═" * 80)
    
    # Vérifier les commandes spécifiques mentionnées
    test_commands = ['mot-cache', 'solde', 'niveau', 'daily', 'crime', 'travailler', 'config']
    deployed_set = set(data['names'])
    
    print("\n🔍 Vérification des commandes spécifiques:\n")
    missing = []
    for cmd in test_commands:
        if cmd in deployed_set:
            print(f"  ✅ /{cmd} - DÉPLOYÉE")
        else:
            print(f"  ❌ /{cmd} - MANQUANTE")
            missing.append(cmd)
    
    if missing:
        print(f"\n❌ {len(missing)} commande(s) manquante(s) sur {len(test_commands)} testées")
        print(f"\n⚠️  PROBLÈME DÉTECTÉ: Certaines commandes ne sont pas déployées!")
        sys.exit(1)
    else:
        print(f"\n✅ Toutes les commandes testées sont déployées!")
    
except subprocess.TimeoutExpired:
    print("❌ Timeout lors de la connexion SSH")
    sys.exit(1)
except json.JSONDecodeError as e:
    print(f"❌ Erreur de parsing JSON: {e}")
    print(f"Output: {result.stdout}")
    sys.exit(1)
except Exception as e:
    print(f"❌ Erreur: {e}")
    sys.exit(1)
