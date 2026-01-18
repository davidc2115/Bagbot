#!/usr/bin/env python3
"""
Script de déploiement sécurisé sur Freebox
Effectue une sauvegarde complète avant toute modification
"""

import sys
import time
from datetime import datetime

try:
    import paramiko
except ImportError:
    print("❌ Module paramiko non installé")
    print("Installation : pip3 install paramiko")
    sys.exit(1)

# Configuration
FREEBOX_IP = "88.174.155.230"
FREEBOX_PORT = 33000
FREEBOX_USER = "bagbot"
FREEBOX_PASS = "bagbot"
BOT_DIR = "/home/bagbot/Bag-bot"

# Couleurs
GREEN = '\033[0;32m'
YELLOW = '\033[1;33m'
RED = '\033[0;31m'
BLUE = '\033[0;34m'
NC = '\033[0m'

def log_info(msg):
    print(f"{GREEN}[✓]{NC} {msg}")

def log_warn(msg):
    print(f"{YELLOW}[!]{NC} {msg}")

def log_error(msg):
    print(f"{RED}[✗]{NC} {msg}")

def log_step(msg):
    print(f"{BLUE}[→]{NC} {msg}")

def execute_command(ssh, command):
    """Exécute une commande SSH et retourne stdout, stderr, exit_code"""
    stdin, stdout, stderr = ssh.exec_command(command)
    exit_code = stdout.channel.recv_exit_status()
    return stdout.read().decode('utf-8'), stderr.read().decode('utf-8'), exit_code

def main():
    print("🔐 Déploiement SÉCURISÉ sur Freebox - BagBot")
    print("=" * 60)
    print()
    
    # Connexion SSH
    log_step("Connexion à la Freebox...")
    ssh = paramiko.SSHClient()
    ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    
    try:
        ssh.connect(
            hostname=FREEBOX_IP,
            port=FREEBOX_PORT,
            username=FREEBOX_USER,
            password=FREEBOX_PASS,
            timeout=10
        )
        log_info("Connexion réussie")
    except Exception as e:
        log_error(f"Impossible de se connecter : {e}")
        sys.exit(1)
    
    # Vérifier le chemin du bot
    log_step("Vérification du répertoire du bot...")
    stdout, stderr, code = execute_command(ssh, f"test -f '{BOT_DIR}/src/bot.js' && echo 'OK' || echo 'NOT_FOUND'")
    
    if 'NOT_FOUND' in stdout:
        log_error(f"Bot non trouvé dans {BOT_DIR}")
        ssh.close()
        sys.exit(1)
    
    log_info(f"Bot trouvé : {BOT_DIR}")
    
    # ÉTAPE 1 : SAUVEGARDE COMPLÈTE
    print()
    print("=" * 60)
    print("  ÉTAPE 1/5 : Sauvegarde complète")
    print("=" * 60)
    print()
    
    backup_name = f"backup_complete_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
    log_step("Création de la sauvegarde...")
    
    backup_cmd = f"""
    cd '{BOT_DIR}' &&
    mkdir -p backups/{backup_name} &&
    cp -r src backups/{backup_name}/ &&
    cp package.json backups/{backup_name}/ 2>/dev/null || true &&
    cp .env backups/{backup_name}/ 2>/dev/null || true &&
    echo 'Sauvegarde créée le {datetime.now()}' > backups/{backup_name}/README.txt &&
    echo 'DONE'
    """
    
    stdout, stderr, code = execute_command(ssh, backup_cmd)
    
    if 'DONE' in stdout:
        log_info(f"✅ Sauvegarde créée : {backup_name}")
    else:
        log_error("Échec de la sauvegarde")
        print(stderr)
        ssh.close()
        sys.exit(1)
    
    # ÉTAPE 2 : VÉRIFIER SI LE BOT TOURNE
    print()
    print("=" * 60)
    print("  ÉTAPE 2/5 : Vérification du bot")
    print("=" * 60)
    print()
    
    log_step("Vérification du statut du bot...")
    stdout, stderr, code = execute_command(ssh, "ps aux | grep '[n]ode.*src/bot.js' | awk '{print $2}' | head -1")
    
    bot_pid = stdout.strip()
    restart_bot = False
    
    if bot_pid:
        log_warn(f"Bot détecté (PID: {bot_pid})")
        log_step("Arrêt du bot...")
        execute_command(ssh, f"kill -15 {bot_pid}")
        time.sleep(3)
        log_info("Bot arrêté")
        restart_bot = True
    else:
        log_info("Le bot n'est pas en cours d'exécution")
    
    # ÉTAPE 3 : TRANSFERT DES FICHIERS
    print()
    print("=" * 60)
    print("  ÉTAPE 3/5 : Transfert des fichiers")
    print("=" * 60)
    print()
    
    sftp = ssh.open_sftp()
    
    files_to_transfer = [
        ('/workspace/src/bot.js', f'{BOT_DIR}/src/bot.js'),
        ('/workspace/src/storage/jsonStore.js', f'{BOT_DIR}/src/storage/jsonStore.js')
    ]
    
    for local_file, remote_file in files_to_transfer:
        filename = local_file.split('/')[-1]
        log_step(f"Transfert de {filename}...")
        try:
            sftp.put(local_file, remote_file)
            log_info(f"{filename} transféré")
        except Exception as e:
            log_error(f"Échec du transfert de {filename}: {e}")
            sftp.close()
            ssh.close()
            sys.exit(1)
    
    sftp.close()
    
    # ÉTAPE 4 : VÉRIFICATION DE LA SYNTAXE
    print()
    print("=" * 60)
    print("  ÉTAPE 4/5 : Vérification de la syntaxe")
    print("=" * 60)
    print()
    
    log_step("Vérification de la syntaxe JavaScript...")
    stdout, stderr, code = execute_command(ssh, f"cd '{BOT_DIR}' && node -c src/bot.js && node -c src/storage/jsonStore.js && echo 'OK'")
    
    if 'OK' in stdout:
        log_info("✅ Syntaxe validée")
    else:
        log_error("Erreur de syntaxe détectée !")
        print(stderr)
        log_warn("Restauration de la sauvegarde...")
        execute_command(ssh, f"cd '{BOT_DIR}' && cp -r backups/{backup_name}/src/* src/")
        log_info("Sauvegarde restaurée")
        ssh.close()
        sys.exit(1)
    
    # ÉTAPE 5 : REDÉMARRAGE DU BOT
    if restart_bot:
        print()
        print("=" * 60)
        print("  ÉTAPE 5/5 : Redémarrage du bot")
        print("=" * 60)
        print()
        
        log_step("Redémarrage du bot...")
        execute_command(ssh, f"cd '{BOT_DIR}' && nohup node src/bot.js > bot.log 2>&1 &")
        time.sleep(3)
        
        stdout, stderr, code = execute_command(ssh, "ps aux | grep '[n]ode.*src/bot.js' | awk '{print $2}' | head -1")
        new_pid = stdout.strip()
        
        if new_pid:
            log_info(f"✅ Bot redémarré (PID: {new_pid})")
        else:
            log_error("Échec du redémarrage")
            print()
            print(f"Vérifiez les logs : tail -50 {BOT_DIR}/bot.log")
    
    # RÉSUMÉ
    print()
    print("=" * 60)
    print(f"  {GREEN}✅ DÉPLOIEMENT TERMINÉ{NC}")
    print("=" * 60)
    print()
    print(f"📦 Sauvegarde : {BOT_DIR}/backups/{backup_name}")
    print()
    print("✨ Nouvelles fonctionnalités :")
    print("  • Thread automatique en cas d'erreur")
    print("  • Ping du fautif + dernier bon compteur")
    print("  • Invitation à donner un gage")
    print("  • Suppression auto des messages invalides")
    print("  • Channels multiples indépendants")
    print()
    print("🧪 Tests à effectuer sur Discord :")
    print("  1. Comptez deux fois d'affilée → Thread créé ✓")
    print("  2. Comptez le mauvais numéro → Thread créé avec ping ✓")
    print("  3. Vérifiez que les channels comptent séparément ✓")
    print()
    print("🔄 En cas de problème, restaurez :")
    print(f"  cd {BOT_DIR}")
    print(f"  cp -r backups/{backup_name}/src/* src/")
    print(f"  pkill -f 'node.*bot.js' && nohup node src/bot.js > bot.log 2>&1 &")
    print()
    
    ssh.close()

if __name__ == '__main__':
    try:
        main()
    except KeyboardInterrupt:
        print("\n\n⚠️ Déploiement interrompu par l'utilisateur")
        sys.exit(1)
    except Exception as e:
        log_error(f"Erreur inattendue : {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
