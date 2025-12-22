#!/usr/bin/env python3
import subprocess
import sys
import time

print("🚀 Déploiement des commandes Discord sur la Freebox...\n")

HOST = "88.174.155.230"
PORT = "33000"
USER = "bagbot"
PASS = "bagbot"

# Script de déploiement à exécuter
deploy_script = """
cd /home/bagbot/Bag-bot
echo "📊 Analyse pré-déploiement..."
echo ""
echo "Commandes dans le code: $(ls -1 src/commands/*.js 2>/dev/null | wc -l)"
echo ""
echo "🚀 Déploiement en cours..."
echo ""
node deploy-commands.js
EXIT_CODE=$?
echo ""
if [ $EXIT_CODE -eq 0 ]; then
    echo "✅ Déploiement réussi!"
    echo ""
    echo "📊 Vérification..."
    node verify-commands.js || true
else
    echo "❌ Erreur lors du déploiement (code: $EXIT_CODE)"
    exit 1
fi
"""

try:
    # Utiliser sshpass si disponible, sinon pexpect
    try:
        # Essayer avec subprocess et stdin
        cmd = f'sshpass -p "{PASS}" ssh -p {PORT} -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null {USER}@{HOST} bash -s'
        
        proc = subprocess.Popen(
            cmd,
            shell=True,
            stdin=subprocess.PIPE,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True
        )
        
        stdout, stderr = proc.communicate(input=deploy_script, timeout=120)
        
        print(stdout)
        if stderr and "Warning" not in stderr:
            print(f"Stderr: {stderr}", file=sys.stderr)
        
        if proc.returncode == 0:
            print("\n✅ DÉPLOIEMENT TERMINÉ AVEC SUCCÈS!")
            print("\n⏰ Attendez 10 minutes pour la synchronisation Discord")
            sys.exit(0)
        else:
            print(f"\n❌ Erreur (code: {proc.returncode})")
            sys.exit(1)
            
    except FileNotFoundError:
        print("❌ sshpass non trouvé, essai avec SSH interactif...\n")
        
        # Fallback: utiliser SSH classique
        cmd = [
            'ssh',
            '-p', PORT,
            '-o', 'StrictHostKeyChecking=no',
            '-o', 'UserKnownHostsFile=/dev/null',
            f'{USER}@{HOST}',
            f'bash -c "{deploy_script}"'
        ]
        
        result = subprocess.run(cmd, capture_output=True, text=True, timeout=120)
        
        print(result.stdout)
        if result.stderr:
            print(result.stderr, file=sys.stderr)
        
        sys.exit(result.returncode)

except subprocess.TimeoutExpired:
    print("❌ Timeout lors du déploiement")
    sys.exit(1)
except Exception as e:
    print(f"❌ Erreur: {e}")
    print("\n💡 Vous pouvez déployer manuellement:")
    print(f"   ssh -p {PORT} {USER}@{HOST}")
    print(f"   cd /home/bagbot/Bag-bot")
    print(f"   node deploy-commands.js")
    sys.exit(1)
