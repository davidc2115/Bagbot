# INSTRUCTIONS : Récupération Token Discord depuis Freebox

Le serveur sur la Freebox (88.174.155.230:33002) est accessible et fonctionne.

Pour récupérer le DISCORD_TOKEN :

## Option 1 : Depuis l'interface Freebox
1. Se connecter à la Freebox OS : http://mafreebox.freebox.fr
2. Aller dans "Applications"
3. Trouver le bot Discord
4. Voir les variables d'environnement

## Option 2 : Depuis SSH (si activé)
```bash
ssh ubuntu@88.174.155.230
cat /home/bagbot/Bag-bot/.env
# OU
pm2 env bagbot
```

## Option 3 : Copier depuis l'installation existante

Le serveur actuel fonctionne déjà avec un token valide.
Pour synchroniser, il faut simplement copier le fichier .env depuis la Freebox
vers notre environnement /workspace/dashboard-v2/.env

## Ce qui est déjà configuré
✅ DISCORD_OAUTH_CLIENT_ID=1414216173809307780
✅ DISCORD_OAUTH_CLIENT_SECRET=_LnfeJDT77TZ3qcBs7SsjFOcT_nvWB-o

## Ce qui manque
❌ DISCORD_TOKEN (pour API Discord)

Une fois le token obtenu, éditer :
/workspace/dashboard-v2/.env

Et redémarrer :
/workspace/restart-dashboard.sh
