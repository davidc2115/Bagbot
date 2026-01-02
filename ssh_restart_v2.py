#!/usr/bin/env python3
import pexpect
import sys

host = "88.174.155.230"
port = 33000
user = "bagbot"
password = "bagbot"

print("🔄 REDÉMARRAGE DU BOT DISCORD")
print("=" * 50)
print(f"📡 Connexion: {user}@{host}:{port}\n")

try:
    # Connexion SSH
    child = pexpect.spawn(f'ssh -o StrictHostKeyChecking=no -p {port} {user}@{host}', timeout=30)
    child.logfile_read = sys.stdout.buffer
    
    # Attendre le prompt de mot de passe
    child.expect(['password:', 'Password:'])
    child.sendline(password)
    
    # Attendre le prompt shell
    child.expect(['\$', '#', 'bagbot@'])
    
    print("\n✅ Connecté!\n")
    print("📂 Navigation vers le dossier du bot...")
    
    # Aller dans le dossier
    child.sendline('cd /home/bagbot/Bag-bot')
    child.expect(['\$', '#'])
    
    child.sendline('pwd')
    child.expect(['\$', '#'])
    
    print("\n🔄 Redémarrage du bot avec PM2...")
    child.sendline('pm2 restart bagbot')
    child.expect(['\$', '#'], timeout=15)
    
    print("\n⏱️  Attente 5 secondes...\n")
    child.sendline('sleep 5')
    child.expect(['\$', '#'], timeout=10)
    
    print("\n📊 Statut PM2:")
    child.sendline('pm2 status')
    child.expect(['\$', '#'], timeout=10)
    
    print("\n📋 Derniers logs du bot:")
    child.sendline('pm2 logs bagbot --lines 15 --nostream')
    child.expect(['\$', '#'], timeout=10)
    
    print("\n🔍 Test de l'endpoint /api/debug/actions:")
    child.sendline('curl -s http://localhost:3000/api/debug/actions 2>/dev/null | python3 -m json.tool | head -40')
    child.expect(['\$', '#'], timeout=10)
    
    print("\n✅ TERMINÉ!")
    child.sendline('exit')
    child.close()
    
    print("\n" + "=" * 50)
    print("✅ Bot redémarré avec succès!")
    print("\n💡 Prochaine étape:")
    print("   Rouvrez l'app Android v6.1.18")
    print("   Config > Actions ou Économie > Actions")
    print("   Toutes les 56 actions devraient apparaître! 🎉\n")

except pexpect.TIMEOUT:
    print("\n❌ Timeout - La commande a pris trop de temps")
except Exception as e:
    print(f"\n❌ Erreur: {e}")
    import traceback
    traceback.print_exc()
