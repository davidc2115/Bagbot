#!/bin/bash
# Script de surveillance mémoire et restauration automatique

CONFIG_FILE="/var/data/config.json"
BACKUP_DIR="/var/data/backups"
MIN_CONFIG_SIZE=1000  # Taille minimale acceptable en octets (1 KB)
MAX_MEMORY_PERCENT=80 # Pourcentage max de mémoire utilisée

# Fonction pour logger
log_message() {
    echo "$(date '+%Y-%m-%d %H:%M:%S'): $1" >> /home/bagbot/memory-monitor.log
}

# Vérifier la taille du config.json
CONFIG_SIZE=$(stat -f%z "$CONFIG_FILE" 2>/dev/null || stat -c%s "$CONFIG_FILE" 2>/dev/null || echo "0")

if [ "$CONFIG_SIZE" -lt "$MIN_CONFIG_SIZE" ]; then
    log_message "ALERTE: config.json trop petit ($CONFIG_SIZE octets)! Restauration automatique..."

    # Trouver le backup le plus récent
    # Priorité: backups externes (copie brute de config.json)
    LATEST_BACKUP=$(ls -t "$BACKUP_DIR"/external-hourly/config-external-*.json 2>/dev/null | head -1)
    # Fallback: ancien format config-global-*
    if [ -z "$LATEST_BACKUP" ]; then
        LATEST_BACKUP=$(ls -t "$BACKUP_DIR"/config-global-*.json 2>/dev/null | head -1)
    fi

    if [ -n "$LATEST_BACKUP" ]; then
        # Sauvegarder le fichier corrompu
        cp "$CONFIG_FILE" "$CONFIG_FILE.corrupt-$(date +%s)" 2>/dev/null || true

        # Restaurer le backup
        cp "$LATEST_BACKUP" "$CONFIG_FILE"
        log_message "Restauration effectuée depuis $LATEST_BACKUP"

        # Redémarrer le bot
        cd /home/bagbot/Bag-bot && pm2 restart bagbot
        log_message "Bot redémarré"
    else
        log_message "ERREUR: Aucun backup trouvé!"
    fi
fi

# Vérifier l'utilisation mémoire
MEMORY_USED=$(free | grep Mem | awk '{print int($3/$2 * 100)}')

if [ "$MEMORY_USED" -gt "$MAX_MEMORY_PERCENT" ]; then
    log_message "ALERTE: Mémoire élevée (${MEMORY_USED}%)! Nettoyage..."

    # Nettoyer le cache système
    sync && echo 1 > /proc/sys/vm/drop_caches 2>/dev/null || true

    log_message "Nettoyage cache effectué"
fi

# Nettoyer les anciens backups (garder seulement les 50 plus récents) - legacy
cd "$BACKUP_DIR" || exit 0
ls -t config-global-*.json 2>/dev/null | tail -n +51 | xargs rm -f 2>/dev/null || true

log_message "Vérification terminée - Config: ${CONFIG_SIZE} octets, Mémoire: ${MEMORY_USED}%"

