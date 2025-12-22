# 🎯 DÉPLOIEMENT DE LA COMMANDE /MOT-CACHE

## ✅ MODIFICATIONS EFFECTUÉES

### 1. Fichiers du système mot-cache
- ✅ `src/commands/mot-cache.js` (221 lignes) - Commande principale
- ✅ `src/modules/mot-cache-handler.js` (107 lignes) - Distribution des lettres
- ✅ `src/modules/mot-cache-buttons.js` (389 lignes) - Interface de configuration

### 2. Intégration dans bot.js
- ✅ Handlers ajoutés dans `InteractionCreate` (lignes ~6710-6735)
  - Boutons: `motcache_*`
  - Modals: `motcache_modal_*`
  - Select menus: `motcache_select_*`
- ✅ Handler ajouté dans `MessageCreate` (lignes ~12520-12526)
  - Distribution des lettres sur les messages

### 3. Scripts de déploiement
- ✅ `deploy-mot-cache.js` - Script Node.js dédié
- ✅ `deploy-mot-cache.sh` - Script Bash simplifié
- ✅ `docs/MOT-CACHE-DEPLOY.md` - Documentation complète

---

## 🚀 DÉPLOYER MAINTENANT

### Sur le serveur Discord

```bash
# Option 1: Script dédié (recommandé)
node deploy-mot-cache.js

# Option 2: Script bash
bash deploy-mot-cache.sh

# Option 3: Script standard
node deploy-guild-commands.js
```

### Étapes de déploiement

1. **Déployer les commandes**
   ```bash
   cd /chemin/vers/Bag-bot
   node deploy-mot-cache.js
   ```

2. **Redémarrer le bot** (si nécessaire)
   ```bash
   # Si vous utilisez PM2
   pm2 restart bagbot
   
   # Ou simplement relancer
   node src/bot.js
   ```

3. **Tester sur Discord**
   - Taper `/mot-cache` pour voir la commande
   - Tester `/mot-cache config` (admin)
   - Configurer le jeu

---

## 🎮 UTILISATION

### Pour les administrateurs

1. **Configuration initiale**
   ```
   /mot-cache config
   ```
   
2. **Définir le mot**
   - Cliquer sur "🎯 Changer le mot"
   - Entrer le mot à deviner (ex: CALIN, BOUTEILLE)

3. **Choisir le mode**
   - 📅 **Programmé**: X lettres par jour
   - 🎲 **Probabilité**: % de chance sur chaque message

4. **Configurer les salons** (optionnel)
   - 📋 Salons où le jeu est actif
   - 💬 Salon pour les notifications de lettres
   - 📢 Salon pour annoncer le gagnant

5. **Activer le jeu**
   - Cliquer sur "▶️ Activer"

### Pour les joueurs

1. **Écrire des messages** (15+ caractères)
2. **Le bot réagit avec 🔍** quand une lettre est cachée
3. **Voir ses lettres**: `/mot-cache jouer`
4. **Deviner le mot**: `/mot-cache deviner <mot>`
5. **Gagner 5000 BAG$** si le mot est correct !

---

## 📊 RÉSUMÉ DES COMMITS

Après la version 5.8.2, **8 commits** ont ajouté le système mot-cache:

1. `5af2f97` - Création initiale (3 fichiers, 717 lignes)
2. `3ad0246` - Fix imports
3. `a7a9630` - Notifications dans salons
4. `ec0810c` - Métadonnées commande
5. `3cca12e` - Configuration améliorée
6. `dcfadb9` - Système de récompenses
7. `52a38f5` - Top 3 gagnants
8. `d47cc4a` - Refactorisation (-340 lignes)

**État actuel**: Branche `cursor/application-changes-discord-commands-6046`

---

## ✅ CHECKLIST DE VÉRIFICATION

Après le déploiement, vérifiez:

- [ ] La commande `/mot-cache` apparaît dans Discord
- [ ] Les 3 sous-commandes fonctionnent:
  - [ ] `/mot-cache jouer`
  - [ ] `/mot-cache deviner`
  - [ ] `/mot-cache config`
- [ ] Les boutons de configuration s'affichent
- [ ] Les modals s'ouvrent correctement
- [ ] Le bot peut distribuer des lettres (tester en activant le jeu)
- [ ] Les réactions 🔍 apparaissent sur les messages
- [ ] Les notifications apparaissent dans le salon configuré

---

## 🐛 RÉSOLUTION DE PROBLÈMES

### La commande n'apparaît pas
```bash
# Re-déployer
node deploy-mot-cache.js

# Attendre 1-2 minutes (cache Discord)
# Redémarrer Discord si nécessaire
```

### Les handlers ne fonctionnent pas
```bash
# Vérifier l'intégration
grep -n "mot-cache" src/bot.js

# Devrait afficher:
# - Ligne ~6711: require mot-cache-buttons
# - Ligne ~6714: handler boutons
# - Ligne ~6719: handler modals
# - Ligne ~6724: handler select menus
# - Ligne ~12522: require mot-cache-handler
```

### Le bot ne distribue pas de lettres
1. Vérifier que le jeu est **activé** (`/mot-cache config`)
2. Vérifier qu'un **mot cible** est défini
3. Vérifier la **probabilité** (augmenter si trop faible)
4. Vérifier les **salons autorisés**
5. Redémarrer le bot

---

## 📞 SUPPORT

Logs à surveiller:
```
[MOT-CACHE] Letter 'A' given to username (3/5)
[MOT-CACHE] Error adding reaction: ...
[MOT-CACHE] Error handling interaction: ...
```

Documentation complète: `docs/MOT-CACHE-DEPLOY.md`

---

## 🎉 FÉLICITATIONS !

Le système mot-cache est prêt à être déployé !

**Dernière étape**: Exécuter `node deploy-mot-cache.js` sur le serveur Discord.
