# 🔄 Comment Redémarrer le Backend Dashboard

## ⚠️ IMPORTANT
Après chaque modification du code backend (`server-v2.js`), vous DEVEZ redémarrer le serveur pour que les changements prennent effet.

## Méthode 1: Via PM2 (Recommandé)

```bash
# Redémarrer le dashboard
pm2 restart dashboard-v2

# Vérifier le statut
pm2 status

# Voir les logs en temps réel
pm2 logs dashboard-v2

# Voir les derniers logs
pm2 logs dashboard-v2 --lines 100
```

## Méthode 2: Arrêter et Relancer

```bash
# Arrêter le serveur
pm2 stop dashboard-v2

# Relancer le serveur
pm2 start dashboard-v2

# Ou en une seule commande
pm2 restart dashboard-v2
```

## Méthode 3: Redémarrage Manuel

Si PM2 ne fonctionne pas:

```bash
# Trouver le processus Node.js
ps aux | grep server-v2.js

# Tuer le processus (remplacer PID par le numéro de processus)
kill PID

# Relancer manuellement
cd /workspace/dashboard-v2
node server-v2.js
```

## Vérifications Après Redémarrage

### 1. Vérifier que le serveur démarre correctement

```bash
pm2 logs dashboard-v2 --lines 50
```

Vous devriez voir:
- ✓ Discord token chargé
- ✓ Guild owner ID détecté: [VOTRE_ID]
- Server running on port 33002

### 2. Tester l'API

```bash
# Tester l'endpoint /api/me
curl -H "Authorization: Bearer VOTRE_TOKEN" http://localhost:33002/api/me

# Tester l'endpoint /api/economy/balances
curl -H "Authorization: Bearer VOTRE_TOKEN" http://localhost:33002/api/economy/balances
```

### 3. Vérifier les permissions fondateur

Dans les logs, cherchez:
```
✓ Guild owner ID détecté: VOTRE_USER_ID
```

## Problèmes Courants

### Le serveur ne redémarre pas
```bash
# Forcer le redémarrage
pm2 delete dashboard-v2
pm2 start server-v2.js --name dashboard-v2
```

### Port déjà utilisé
```bash
# Trouver le processus sur le port 33002
lsof -i :33002

# Tuer le processus
kill -9 PID
```

### Erreur "DISCORD_TOKEN manquant"
```bash
# Vérifier que le fichier .env existe
cat /workspace/.env | grep DISCORD_TOKEN

# Si absent, créer le fichier .env
echo "DISCORD_TOKEN=votre_token_ici" > /workspace/.env
```

## Modifications Récentes (v3.0.3)

Les changements suivants nécessitent un redémarrage:
- ✅ Détection automatique du fondateur via Discord API
- ✅ Nouvelles routes `/api/economy/balances` et `/api/levels/leaderboard`
- ✅ Fonction `isUserFounder()` pour vérifier les permissions
- ✅ Variable `GUILD_OWNER_ID` stockant l'owner du serveur

## Checklist de Déploiement

- [ ] Code modifié et sauvegardé
- [ ] Backend redémarré via `pm2 restart dashboard-v2`
- [ ] Logs vérifiés: `pm2 logs dashboard-v2`
- [ ] Message "Guild owner ID détecté" visible
- [ ] Test API `/api/me` retourne `isFounder: true` pour le fondateur
- [ ] Application Android mise à jour avec la nouvelle APK
- [ ] Déconnexion/Reconnexion dans l'app pour rafraîchir le token

## Support

Si les problèmes persistent:
1. Vérifiez les logs PM2: `pm2 logs dashboard-v2 --lines 200`
2. Vérifiez que le port 33002 est accessible
3. Testez les endpoints API avec curl
4. Regardez les logs Android avec Logcat pour voir les erreurs
