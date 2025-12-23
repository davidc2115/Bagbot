#!/bin/bash
# Script de nettoyage des anciens systèmes de backup (OPTIONNEL)
# Ce script désactive/renomme les anciens scripts de backup pour éviter toute confusion
# 
# ⚠️ ATTENTION: Exécuter uniquement si vous êtes sûr de ne plus utiliser ces scripts
# 
# Date: 23 Décembre 2025

echo "╔═══════════════════════════════════════════════════════════╗"
echo "║  🧹 NETTOYAGE DES ANCIENS SYSTÈMES DE BACKUP            ║"
echo "╚═══════════════════════════════════════════════════════════╝"
echo ""

# Couleurs
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

BASE_DIR="/home/bagbot/Bag-bot"

# Fonction de confirmation
confirm() {
    echo -e "${YELLOW}$1${NC}"
    read -p "Continuer? (o/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Oo]$ ]]; then
        return 1
    fi
    return 0
}

echo "Ce script va désactiver les anciens systèmes de backup."
echo "Le système HourlyBackupSystem (backup horaire) restera ACTIF."
echo ""

if ! confirm "⚠️  Voulez-vous continuer?"; then
    echo "Annulé."
    exit 0
fi

echo ""
echo "═════════════════════════════════════════════════════════"
echo " 1. DÉSACTIVATION DES SCRIPTS SHELL"
echo "═════════════════════════════════════════════════════════"
echo ""

# Désactiver hourly-external-backup.sh
if [ -f "$BASE_DIR/hourly-external-backup.sh" ]; then
    echo -e "${YELLOW}[1/2] hourly-external-backup.sh trouvé${NC}"
    
    # Vérifier s'il est dans le crontab
    if crontab -l 2>/dev/null | grep -q "hourly-external-backup.sh"; then
        echo -e "${RED}⚠️  Ce script EST dans le crontab!${NC}"
        echo "Veuillez le retirer manuellement avec: crontab -e"
        exit 1
    else
        echo -e "${GREEN}✓ Pas dans le crontab${NC}"
    fi
    
    # Renommer le script
    mv "$BASE_DIR/hourly-external-backup.sh" "$BASE_DIR/hourly-external-backup.sh.DISABLED"
    echo -e "${GREEN}✓ Renommé en .DISABLED${NC}"
else
    echo -e "${GREEN}[1/2] hourly-external-backup.sh déjà désactivé ou absent${NC}"
fi

echo ""

# Désactiver auto-restore-best-backup.sh
if [ -f "$BASE_DIR/auto-restore-best-backup.sh" ]; then
    echo -e "${YELLOW}[2/2] auto-restore-best-backup.sh trouvé${NC}"
    
    mv "$BASE_DIR/auto-restore-best-backup.sh" "$BASE_DIR/auto-restore-best-backup.sh.DISABLED"
    echo -e "${GREEN}✓ Renommé en .DISABLED${NC}"
else
    echo -e "${GREEN}[2/2] auto-restore-best-backup.sh déjà désactivé ou absent${NC}"
fi

echo ""
echo "═════════════════════════════════════════════════════════"
echo " 2. AJOUT DE COMMENTAIRES DE DÉSACTIVATION"
echo "═════════════════════════════════════════════════════════"
echo ""

# Ajouter commentaire dans simpleBackupSystem.js
SIMPLE_BACKUP="$BASE_DIR/src/storage/simpleBackupSystem.js"
if [ -f "$SIMPLE_BACKUP" ]; then
    if ! grep -q "DÉSACTIVÉ" "$SIMPLE_BACKUP"; then
        echo -e "${YELLOW}[1/3] Ajout commentaire dans simpleBackupSystem.js${NC}"
        
        # Créer un backup
        cp "$SIMPLE_BACKUP" "$SIMPLE_BACKUP.backup"
        
        # Ajouter le commentaire en haut
        cat > "$SIMPLE_BACKUP.tmp" << 'EOF'
/**
 * ⚠️ DÉSACTIVÉ - Ce module n'est plus utilisé
 * Le système de backup est maintenant géré par HourlyBackupSystem
 * Conservé uniquement pour référence historique
 * Date de désactivation: 23 Décembre 2025
 */

EOF
        cat "$SIMPLE_BACKUP" >> "$SIMPLE_BACKUP.tmp"
        mv "$SIMPLE_BACKUP.tmp" "$SIMPLE_BACKUP"
        
        echo -e "${GREEN}✓ Commentaire ajouté${NC}"
    else
        echo -e "${GREEN}[1/3] simpleBackupSystem.js déjà marqué${NC}"
    fi
else
    echo -e "${YELLOW}[1/3] simpleBackupSystem.js non trouvé${NC}"
fi

echo ""

# Ajouter commentaire dans githubBackup.js
GITHUB_BACKUP="$BASE_DIR/src/storage/githubBackup.js"
if [ -f "$GITHUB_BACKUP" ]; then
    if ! grep -q "DÉSACTIVÉ" "$GITHUB_BACKUP"; then
        echo -e "${YELLOW}[2/3] Ajout commentaire dans githubBackup.js${NC}"
        
        cp "$GITHUB_BACKUP" "$GITHUB_BACKUP.backup"
        
        cat > "$GITHUB_BACKUP.tmp" << 'EOF'
/**
 * ⚠️ DÉSACTIVÉ - Ce module n'est plus utilisé
 * Le système de backup GitHub a été remplacé par HourlyBackupSystem (backups locaux)
 * Conservé uniquement pour référence historique
 * Date de désactivation: 23 Décembre 2025
 */

EOF
        cat "$GITHUB_BACKUP" >> "$GITHUB_BACKUP.tmp"
        mv "$GITHUB_BACKUP.tmp" "$GITHUB_BACKUP"
        
        echo -e "${GREEN}✓ Commentaire ajouté${NC}"
    else
        echo -e "${GREEN}[2/3] githubBackup.js déjà marqué${NC}"
    fi
else
    echo -e "${YELLOW}[2/3] githubBackup.js non trouvé${NC}"
fi

echo ""

# Créer un README dans le dossier backups
BACKUP_README="$BASE_DIR/data/backups/README.md"
echo -e "${YELLOW}[3/3] Création README dans data/backups/${NC}"

cat > "$BACKUP_README" << 'EOF'
# Structure des Backups

## Dossiers Actifs

### hourly/
**ACTIF** - Système principal de backup
- Créé par: HourlyBackupSystem
- Fréquence: Toutes les heures
- Rétention: 72 heures (3 jours)
- Nettoyage: Automatique toutes les 6h
- Format: backup-YYYY-MM-DDTHH-MM-SS.json

## Dossiers Obsolètes (Conservés pour référence)

### external-hourly/
**INACTIF** - Anciens backups externes
- Créé par: hourly-external-backup.sh (DÉSACTIVÉ)
- Peut être supprimé si plus nécessaire

### guild-*/
**LEGACY** - Anciens backups par serveur
- Format obsolète
- Peut être supprimé si plus nécessaire

## Système de Backup Actuel

Un seul système est actif: **HourlyBackupSystem**

Tous les backups sont créés automatiquement dans le dossier `hourly/`.

Pour créer un backup manuel: `/backup` sur Discord

Pour restaurer: `/restore` sur Discord ou voir section Admin du dashboard

Date de dernière mise à jour: 23 Décembre 2025
EOF

echo -e "${GREEN}✓ README créé${NC}"

echo ""
echo "═════════════════════════════════════════════════════════"
echo " 3. RÉSUMÉ DES ACTIONS"
echo "═════════════════════════════════════════════════════════"
echo ""

echo "✅ Actions effectuées:"
echo ""
echo "Scripts shell renommés:"
[ -f "$BASE_DIR/hourly-external-backup.sh.DISABLED" ] && echo "  • hourly-external-backup.sh → .DISABLED"
[ -f "$BASE_DIR/auto-restore-best-backup.sh.DISABLED" ] && echo "  • auto-restore-best-backup.sh → .DISABLED"
echo ""
echo "Commentaires ajoutés:"
[ -f "$BASE_DIR/src/storage/simpleBackupSystem.js.backup" ] && echo "  • simpleBackupSystem.js (backup créé)"
[ -f "$BASE_DIR/src/storage/githubBackup.js.backup" ] && echo "  • githubBackup.js (backup créé)"
echo ""
echo "Documentation:"
echo "  • README créé dans data/backups/"
echo ""

echo "═════════════════════════════════════════════════════════"
echo " 4. ACTIONS OPTIONNELLES"
echo "═════════════════════════════════════════════════════════"
echo ""

echo "Vous pouvez maintenant (optionnel):"
echo ""
echo "1. Vérifier le système actif:"
echo "   pm2 logs bagbot | grep HourlyBackup"
echo ""
echo "2. Nettoyer les anciens backups externes (PRUDENCE!):"
echo "   rm -rf /var/data/backups/external-hourly/"
echo ""
echo "3. Nettoyer les anciens backups par serveur:"
echo "   rm -rf $BASE_DIR/data/backups/guild-*"
echo ""
echo "4. Redémarrer le bot (recommandé si fichiers .js modifiés):"
echo "   pm2 restart bagbot"
echo ""

echo "═════════════════════════════════════════════════════════"
echo ""
echo -e "${GREEN}✅ Nettoyage terminé avec succès!${NC}"
echo ""
echo "Le système HourlyBackupSystem reste ACTIF et fonctionnel."
echo ""
