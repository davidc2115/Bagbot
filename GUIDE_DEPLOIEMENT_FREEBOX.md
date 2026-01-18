# Guide de déploiement manuel - Correctifs Comptage BagBot

## 🎯 Objectif
Déployer les correctifs du système de comptage sur votre Freebox en toute sécurité.

## ⚠️ IMPORTANT - À lire avant de commencer

1. **Sauvegarde automatique** : Le script crée une sauvegarde avant toute modification
2. **Le bot sera redémarré** : Prévenez vos utilisateurs d'une courte interruption
3. **Temps estimé** : 5-10 minutes
4. **Rollback possible** : En cas de problème, on peut revenir en arrière

---

## 📋 Méthode 1 : Déploiement automatique (RECOMMANDÉ)

### Depuis votre PC local

1. **Transférer les fichiers vers la Freebox :**
   ```bash
   # Depuis votre machine locale, dans le dossier du workspace
   scp -P 33000 src/bot.js bagbot@88.174.155.230:/home/bagbot/BagBot/src/
   scp -P 33000 src/storage/jsonStore.js bagbot@88.174.155.230:/home/bagbot/BagBot/src/storage/
   scp -P 33000 deploy_counting_fix.sh bagbot@88.174.155.230:/home/bagbot/BagBot/
   scp -P 33000 CORRECTIFS_COMPTAGE_03JAN2026.md bagbot@88.174.155.230:/home/bagbot/BagBot/
   ```
   
   **Note :** Remplacez `/home/bagbot/BagBot` par le vrai chemin si différent.

2. **Se connecter à la Freebox :**
   ```bash
   ssh -p 33000 bagbot@88.174.155.230
   ```

3. **Exécuter le script de déploiement :**
   ```bash
   cd /home/bagbot/BagBot  # Ou le chemin réel
   chmod +x deploy_counting_fix.sh
   ./deploy_counting_fix.sh
   ```

4. **Suivre les instructions à l'écran** ✅

---

## 📋 Méthode 2 : Déploiement manuel (si le script ne fonctionne pas)

### Depuis votre Freebox (via SSH)

```bash
# 1. Connexion SSH
ssh -p 33000 bagbot@88.174.155.230

# 2. Naviguer vers le répertoire du bot
cd /home/bagbot/BagBot  # Ajustez selon votre installation

# 3. Créer une sauvegarde
mkdir -p backups/before_counting_fix_$(date +%Y%m%d_%H%M%S)
cp -r src backups/before_counting_fix_$(date +%Y%m%d_%H%M%S)/

# 4. Arrêter le bot
pkill -f "node.*src/bot.js"
# Ou si vous avez un script d'arrêt :
# ./stop.sh

# 5. Attendre 3 secondes
sleep 3

# 6. Copier les nouveaux fichiers
# (vous devez d'abord les avoir transférés avec scp, voir ci-dessus)

# 7. Vérifier la syntaxe
node -c src/bot.js
node -c src/storage/jsonStore.js

# 8. Redémarrer le bot
nohup node src/bot.js > bot.log 2>&1 &
# Ou si vous avez un script de démarrage :
# ./start.sh

# 9. Vérifier que le bot tourne
ps aux | grep "node.*src/bot.js"

# 10. Consulter les logs
tail -f bot.log
```

---

## 🔍 Vérification post-déploiement

### 1. Vérifier que le bot est en ligne
```bash
ps aux | grep "node.*src/bot.js"
```
Vous devriez voir un processus node.

### 2. Vérifier les logs
```bash
tail -f bot.log  # Ou le chemin de vos logs
```
Cherchez les messages d'erreur. Un démarrage réussi montre généralement :
```
[INFO] Bot connecté comme NomDuBot#1234
[INFO] Prêt à servir X serveurs
```

### 3. Tester sur Discord

#### Test 1 : Channels séparés
1. Utilisez `/config` sur Discord
2. Allez dans la section "Comptage"
3. Ajoutez 2 channels différents
4. Dans le premier channel, comptez : 1, 2, 3, 4...
5. Dans le second channel, comptez : 1, 2, 3, 4...
6. **✅ Résultat attendu :** Les deux channels comptent indépendamment

#### Test 2 : Suppression des messages invalides
1. Dans un channel de comptage, écrivez "bonjour"
2. **✅ Résultat attendu :** Message supprimé + vous recevez un DM
3. Écrivez "test 123"
4. **✅ Résultat attendu :** Message supprimé + DM
5. Écrivez le bon nombre (ex: "1" si on attend 1)
6. **✅ Résultat attendu :** Le bot réagit avec ✅

#### Test 3 : Formules (si activées)
1. Si le prochain nombre attendu est 5, écrivez "2+3"
2. **✅ Résultat attendu :** Accepté et réaction ✅

---

## 🚨 En cas de problème

### Le bot ne démarre pas

```bash
# 1. Consulter les logs
tail -100 bot.log

# 2. Vérifier les erreurs de syntaxe
node -c src/bot.js
node -c src/storage/jsonStore.js

# 3. Si erreur, restaurer la sauvegarde
BACKUP=$(ls -td backups/before_counting_fix_* | head -1)
cp -r $BACKUP/src/* src/
```

### Messages non supprimés

**Cause :** Le bot n'a pas la permission `MANAGE_MESSAGES`

**Solution :**
1. Sur Discord, aller dans les paramètres du serveur
2. Rôles → Rôle du bot
3. Activer la permission "Gérer les messages"

### Les channels ne comptent pas séparément

**Cause possible :** Migration non effectuée

**Solution :**
```bash
# Vérifier les données
cat /var/data/config.json | grep -A 20 '"counting"'

# Si vous voyez "channels": [...] (un array), la migration n'a pas eu lieu
# Redémarrez le bot pour forcer la migration
pkill -f "node.*src/bot.js"
sleep 2
nohup node src/bot.js > bot.log 2>&1 &
```

### Restauration complète

```bash
# 1. Identifier la sauvegarde
ls -ltr backups/

# 2. Restaurer
BACKUP=backups/before_counting_fix_YYYYMMDD_HHMMSS  # Remplacez par le bon nom
cp -r $BACKUP/src/* src/

# 3. Redémarrer
pkill -f "node.*src/bot.js"
sleep 2
nohup node src/bot.js > bot.log 2>&1 &
```

---

## 📞 Support

En cas de problème persistant :
1. Consultez `/workspace/ANALYSE_BUGS_COMPTAGE_03JAN2026.md` pour comprendre les bugs corrigés
2. Consultez `/workspace/CORRECTIFS_COMPTAGE_03JAN2026.md` pour les détails techniques
3. Vérifiez les logs du bot : `tail -100 bot.log`

---

## ✅ Checklist de déploiement

- [ ] Sauvegarde créée
- [ ] Fichiers transférés vers la Freebox
- [ ] Bot arrêté proprement
- [ ] Nouveaux fichiers en place
- [ ] Syntaxe validée
- [ ] Bot redémarré
- [ ] Bot visible sur Discord (status en ligne)
- [ ] Test channels séparés effectué
- [ ] Test suppression messages effectué
- [ ] Permission MANAGE_MESSAGES vérifiée
- [ ] Documentation lue

**Date de déploiement :** _______________

**Effectué par :** _______________

**Résultat :** ⬜ Succès  ⬜ Problèmes rencontrés (détails ci-dessous)

**Notes :**
```
_________________________________________________________________
_________________________________________________________________
_________________________________________________________________
```
