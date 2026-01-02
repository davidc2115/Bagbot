#!/usr/bin/env python3
import subprocess
import time

host = "88.174.155.230"
port = 33000
user = "bagbot"
password = "bagbot"

print("🔄 Connexion SSH et redémarrage du bot...")
print(f"📡 {user}@{host}:{port}")
print()

commands = """
cd /home/bagbot/Bag-bot
echo "📂 Dossier: $(pwd)"
echo ""
echo "🔄 Redémarrage du bot..."
pm2 restart bagbot
sleep 3
echo ""
echo "✅ Bot redémarré!"
echo ""
echo "📊 Statut PM2:"
pm2 status
echo ""
echo "📋 Derniers logs:"
pm2 logs bagbot --lines 20 --nostream
echo ""
echo "🔍 Test actions.list:"
curl -s http://localhost:3000/api/debug/actions | head -30
"""

try:
    # Utiliser pexpect si disponible
    import pexpect
    
    child = pexpect.spawn(f'ssh -o StrictHostKeyChecking=no -p {port} {user}@{host}', encoding='utf-8')
    child.logfile = None  # On affichera manuellement
    
    idx = child.expect(['password:', 'Password:'])
    child.sendline(password)
    child.expect(['\$', '#', '~'])
    
    print("✅ Connecté!\n")
    
    for cmd in commands.strip().split('\n'):
        if cmd.strip():
            child.sendline(cmd)
            time.sleep(0.5)
    
    # Attendre que tout s'exécute
    time.sleep(10)
    
    # Lire toute la sortie
    try:
        output = child.read_nonblocking(size=50000, timeout=1)
        print(output)
    except:
        pass
    
    child.sendline('exit')
    time.sleep(1)
    
    try:
        remaining = child.read_nonblocking(size=10000, timeout=1)
        print(remaining)
    except:
        pass
    
    child.close()
    print("\n✅ Commandes exécutées avec succès!")
    
except ImportError:
    print("❌ pexpect non installé. Installation...")
    subprocess.run(['pip', 'install', '-q', 'pexpect'], check=False)
    print("✅ Réessayez le script: python3 ssh_restart.py")
except Exception as e:
    print(f"❌ Erreur: {e}")
    print("\n💡 Solution alternative:")
    print(f"   ssh -p {port} {user}@{host}")
    print(f"   Mot de passe: {password}")
    print("   Puis: cd /home/bagbot/Bag-bot && pm2 restart bagbot")
