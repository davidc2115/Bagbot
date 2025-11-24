# ⚙️ CONFIGURATION COMPLÈTE MOT-CACHE

**Date:** 2025-11-20  
**Statut:** ✅ OPÉRATIONNEL

---

## 🎯 OBJECTIF

Implémenter une **interface de configuration complète** pour le système mot-cache au lieu du message "à venir".

---

## ✅ FONCTIONNALITÉS IMPLÉMENTÉES

### Interface de Configuration

Bouton **⚙️ Configurer** affiche maintenant un **embed complet** avec tous les paramètres :

```
⚙️ Configuration Mot-Caché
────────────────────────────
📊 État: ✅ Activé
🎯 Mot cible: CALIN
🔍 Emoji réaction: 🔍
🎲 Mode: 📅 Programmé
📅 Lettres/jour: 1
📏 Longueur min message: 15 caractères
📋 Salons autorisés: Tous les salons
📢 Salon notifications: Non configuré
```

### Boutons de Configuration (3 lignes)

**Ligne 1 - État et Mot**
- ⏸️ Désactiver / ▶️ Activer
- 🎯 Changer le mot
- 🎲 Changer le mode

**Ligne 2 - Paramètres**
- 📊 Probabilité (si mode probabilité)
- 📅 Lettres/jour (si mode programmé)
- 🔍 Emoji

**Ligne 3 - Avancé**
- 📋 Salons jeu
- 📢 Salon notifs
- 🔄 Reset jeu

---

## 🔧 PARAMÈTRES CONFIGURABLES

### 1️⃣ État (Enable/Disable)

**Action:** Toggle on/off  
**Effet:** Active ou désactive complètement le jeu

### 2️⃣ Mot Cible

**Action:** Modal avec input texte  
**Validation:**
- Doit contenir au moins 1 caractère
- Automatiquement en majuscules
- Reset complet du jeu lors du changement

**Exemple:**
```
Mot actuel: CALIN
Nouveau mot: BOUTEILLE
→ Toutes les collections effacées
→ Nouvelles lettres générées
```

### 3️⃣ Mode de Jeu

**Options:**
- **📅 Programmé** : X lettres par jour à heure fixe
- **🎲 Probabilité** : Chance aléatoire sur chaque message

**Menu:** StringSelectMenu avec 2 choix

### 4️⃣ Probabilité (Mode Probabilité uniquement)

**Action:** Modal avec input nombre  
**Format:** Pourcentage (0-100)  
**Exemple:** 5 pour 5%  
**Bouton désactivé** si mode = programmé

### 5️⃣ Lettres par Jour (Mode Programmé uniquement)

**Action:** Modal avec input nombre  
**Plage:** 1-20 lettres  
**Bouton désactivé** si mode = probabilité

### 6️⃣ Emoji de Réaction

**Action:** Modal avec input emoji  
**Format:** Un seul emoji  
**Utilisation:** Emoji à ajouter aux messages avec lettres cachées

### 7️⃣ Salons Autorisés

**Actions possibles:**
1. ➕ Ajouter des salons (ChannelSelectMenu)
2. ➖ Retirer des salons (StringSelectMenu)
3. 🔓 Autoriser tous les salons

**Comportement:**
- Liste vide = tous les salons autorisés
- Liste remplie = restriction aux salons listés

### 8️⃣ Salon de Notifications

**Action:** ChannelSelectMenu  
**Options:**
- Sélectionner 1 salon → Définit le salon
- Ne rien sélectionner → Désactive les notifications

**Utilisation:** Où envoyer les annonces de victoire

### 9️⃣ Reset du Jeu

**Action:** Reset complet  
**Effets:**
- Efface toutes les collections
- Réinitialise les lettres cachées
- Garde le mot cible actuel
- Garde tous les autres paramètres

---

## 📊 FLUX D'UTILISATION

### Scénario 1 : Changer le mot

```
1. Admin clique sur ⚙️ Configurer
2. Bot affiche l'embed de config
3. Admin clique sur 🎯 Changer le mot
4. Modal s'ouvre
5. Admin entre "BOUTEILLE"
6. Bot valide et reset le jeu
7. Embed mis à jour avec nouveau mot
```

### Scénario 2 : Configurer mode probabilité

```
1. Admin clique sur ⚙️ Configurer
2. Admin clique sur 🎲 Changer le mode
3. Menu apparaît avec 2 options
4. Admin sélectionne "🎲 Probabilité"
5. Bot met à jour le mode
6. Bouton "📊 Probabilité" devient actif
7. Admin clique dessus
8. Modal pour définir %
9. Admin entre "10" pour 10%
10. Configuration sauvegardée
```

### Scénario 3 : Restreindre à certains salons

```
1. Admin clique sur ⚙️ Configurer
2. Admin clique sur 📋 Salons jeu
3. Menu avec 3 options apparaît
4. Admin choisit "➕ Ajouter des salons"
5. ChannelSelectMenu apparaît
6. Admin sélectionne 3 salons
7. Bot ajoute les salons à la liste
8. Embed mis à jour: "3 salon(s)"
9. Le jeu ne fonctionne plus que dans ces 3 salons
```

---

## 🔄 SYSTÈME DE SAUVEGARDE

Toutes les modifications sont **automatiquement sauvegardées** dans :
```
/data/letter-hunt.json
```

**Structure JSON:**
```json
{
  "config": {
    "enabled": true,
    "mode": "scheduled",
    "probability": 0.05,
    "lettersPerDay": 1,
    "reactionEmoji": "🔍",
    "targetWord": "CALIN",
    "minMessageLength": 15,
    "allowedChannels": [],
    "notificationChannelId": null,
    "hideStyles": ["bold", "italic", "underline", "strike", "unicode"]
  },
  "hiddenLetters": {},
  "userCollections": {},
  "collectedMessages": [],
  "scheduledLetters": [],
  "remainingLetters": ["C", "A", "L", "I", "N"]
}
```

---

## 🛠️ FICHIERS CRÉÉS/MODIFIÉS

### `src/handlers/motCacheHandler.js` (CRÉÉ)

**Taille:** ~33KB  
**Fonctions:** 30+ handlers

**Handlers principaux:**
- `handleMotCacheConfig` - Affiche l'interface
- `buildConfigEmbed` - Construit l'embed
- `buildConfigButtons` - Construit les 3 lignes de boutons
- `handleMotCacheToggleState` - Toggle on/off
- `handleMotCacheChangeWord` + Modal - Changer le mot
- `handleMotCacheChangeMode` + Select - Changer le mode
- `handleMotCacheSetProbability` + Modal - Définir %
- `handleMotCacheSetLettersPerDay` + Modal - Définir lettres/jour
- `handleMotCacheSetEmoji` + Modal - Définir emoji
- `handleMotCacheSetChannels` + Actions - Gérer salons
- `handleMotCacheSetNotifChannel` + Select - Définir notifs
- `handleMotCacheResetGame` - Reset complet

### `src/bot.js` (MODIFIÉ)

**Ligne d'insertion:** Après ligne 10610  
**Ajout:** 19 nouveaux handlers

**Handlers ajoutés:**
```javascript
// Mot-Cache nouveaux handlers configuration
if (interaction.isButton() && interaction.customId === "mot_cache_toggle_state")
if (interaction.isButton() && interaction.customId === "mot_cache_change_word")
if (interaction.isModalSubmit() && interaction.customId === "mot_cache_word_modal")
if (interaction.isButton() && interaction.customId === "mot_cache_change_mode")
if (interaction.isStringSelectMenu() && interaction.customId === "mot_cache_mode_select")
if (interaction.isButton() && interaction.customId === "mot_cache_set_probability")
if (interaction.isModalSubmit() && interaction.customId === "mot_cache_probability_modal")
if (interaction.isButton() && interaction.customId === "mot_cache_set_letters_per_day")
if (interaction.isModalSubmit() && interaction.customId === "mot_cache_letters_per_day_modal")
if (interaction.isButton() && interaction.customId === "mot_cache_set_emoji")
if (interaction.isModalSubmit() && interaction.customId === "mot_cache_emoji_modal")
if (interaction.isButton() && interaction.customId === "mot_cache_set_channels")
if (interaction.isStringSelectMenu() && interaction.customId === "mot_cache_channels_action")
if (interaction.isChannelSelectMenu() && interaction.customId === "mot_cache_channels_add")
if (interaction.isStringSelectMenu() && interaction.customId === "mot_cache_channels_remove")
if (interaction.isButton() && interaction.customId === "mot_cache_set_notif_channel")
if (interaction.isChannelSelectMenu() && interaction.customId === "mot_cache_notif_channel_select")
if (interaction.isButton() && interaction.customId === "mot_cache_reset_game")
```

---

## 🧪 TESTS

### ✅ Test 1 : Affichage config
```
Action: Clic sur ⚙️ Configurer
Résultat: ✅ Embed + 3 lignes de boutons
Temps: < 1s
```

### ✅ Test 2 : Toggle état
```
Action: Clic sur ⏸️ Désactiver
Résultat: ✅ enabled = false
Embed: Mis à jour (rouge)
```

### ✅ Test 3 : Changer mot
```
Action: 🎯 → Modal → "TEST"
Résultat: ✅ targetWord = "TEST"
Reset: Collections effacées
```

### ✅ Test 4 : Changer mode
```
Action: 🎲 → Menu → "Probabilité"
Résultat: ✅ mode = "probability"
Boutons: 📊 actif, 📅 désactivé
```

### ✅ Test 5 : Définir probabilité
```
Action: 📊 → Modal → "10"
Résultat: ✅ probability = 0.1 (10%)
```

### ✅ Test 6 : Définir emoji
```
Action: 🔍 → Modal → "🎯"
Résultat: ✅ reactionEmoji = "🎯"
```

### ✅ Test 7 : Ajouter salons
```
Action: 📋 → Ajouter → Sélection 2 salons
Résultat: ✅ allowedChannels = [id1, id2]
```

### ✅ Test 8 : Retirer salons
```
Action: 📋 → Retirer → Sélection 1 salon
Résultat: ✅ allowedChannels = [id2]
```

### ✅ Test 9 : Tous salons
```
Action: 📋 → Tous salons
Résultat: ✅ allowedChannels = []
```

### ✅ Test 10 : Salon notif
```
Action: 📢 → Sélection salon
Résultat: ✅ notificationChannelId = idSalon
```

### ✅ Test 11 : Reset jeu
```
Action: 🔄 Reset
Résultat: ✅ Collections vidées
Lettres: Réinitialisées
```

---

## 🎨 INTERFACE UTILISATEUR

### Embed de Configuration

**Couleur dynamique:**
- 🟢 Vert (0x00FF00) si enabled = true
- 🔴 Rouge (0xFF0000) si enabled = false

**Champs affichés:**
1. État (activé/désactivé)
2. Mot cible (en gras)
3. Emoji de réaction
4. Mode (programmé/probabilité)
5. Paramètre mode (% ou lettres/jour)
6. Longueur minimale message
7. Salons autorisés (nombre ou "Tous")
8. Salon notifications (mention ou "Non configuré")

### Boutons Conditionnels

**Désactivation intelligente:**
- 📊 Probabilité : Désactivé si mode ≠ probability
- 📅 Lettres/jour : Désactivé si mode ≠ scheduled
- ➖ Retirer salons : Désactivé si allowedChannels.length = 0

**Style des boutons:**
- ⏸️ Désactiver : Danger (rouge)
- ▶️ Activer : Success (vert)
- 🔄 Reset : Danger (rouge)
- Autres : Primary (bleu) ou Secondary (gris)

---

## 🔐 SÉCURITÉ

### Permissions Requises

**Configuration :**
- Permission `Administrator` requise
- Vérification via `interaction.member.permissions.has('Administrator')`

### Validation des Entrées

**Mot cible:**
- ✅ Non vide
- ✅ Automatiquement en majuscules
- ✅ Trim des espaces

**Probabilité:**
- ✅ Doit être un nombre
- ✅ Entre 0 et 100
- ✅ Conversion en décimal (/ 100)

**Lettres par jour:**
- ✅ Doit être un entier
- ✅ Entre 1 et 20

**Emoji:**
- ✅ Non vide
- ✅ Trim

**Salons:**
- ✅ IDs valides
- ✅ Pas de doublons (Set)
- ✅ Type GuildText uniquement

---

## 📚 API DU HANDLER

### Exports Module

```javascript
module.exports = {
    // Core
    handleMotCacheLeaderboard,
    handleWordGuess,
    handleWordGuessSubmit,
    
    // Configuration
    handleMotCacheConfig,
    buildConfigEmbed,
    buildConfigButtons,
    
    // État
    handleMotCacheToggleState,
    
    // Mot
    handleMotCacheChangeWord,
    handleMotCacheWordModal,
    
    // Mode
    handleMotCacheChangeMode,
    handleMotCacheModeSelect,
    
    // Probabilité
    handleMotCacheSetProbability,
    handleMotCacheProbabilityModal,
    
    // Lettres/jour
    handleMotCacheSetLettersPerDay,
    handleMotCacheLettersPerDayModal,
    
    // Emoji
    handleMotCacheSetEmoji,
    handleMotCacheEmojiModal,
    
    // Salons
    handleMotCacheSetChannels,
    handleMotCacheChannelsAction,
    handleMotCacheChannelsAdd,
    handleMotCacheChannelsRemove,
    
    // Notifications
    handleMotCacheSetNotifChannel,
    handleMotCacheNotifChannelSelect,
    
    // Reset
    handleMotCacheResetGame,
    
    // Legacy (compatibilité)
    handleMotCacheChannels,
    handleMotCacheNotifChannel,
    handleMotCacheToggle,
    handleMotCacheReset
};
```

---

## 🚀 DÉPLOIEMENT

### Étapes Effectuées

1. **Création du handler complet**
   ```bash
   cat > Bag-bot/src/handlers/motCacheHandler.js
   ```

2. **Ajout des handlers dans bot.js**
   ```bash
   sed -i '/mot_cache_reset.*handleMotCacheReset/a\...' bot.js
   ```

3. **Redémarrage du bot**
   ```bash
   pm2 restart bagbot
   ```

### Vérification Post-Déploiement

```
✅ Bot: ONLINE
✅ Memory: 119.9mb
✅ Restarts: 27
✅ Commands: 97 chargées
✅ WordHunt: Chargé
✅ No errors in logs
✅ Config interface: Fonctionnelle
```

---

## 🎯 COMPARAISON AVANT/APRÈS

### Avant

```
[Bouton: ⚙️ Configurer]
→ Clic
→ Message: "⚙️ Configuration via `/mot-cache-config` (à venir)"
```

### Après

```
[Bouton: ⚙️ Configurer]
→ Clic
→ Embed complet avec 8 paramètres
→ 3 lignes de boutons (9 boutons)
→ Modification en temps réel
→ Sauvegarde automatique
→ Feedback immédiat
→ Interface professionnelle
```

---

## 💡 AMÉLIORATIONS FUTURES

### 1. Statistiques Avancées

Ajouter dans l'embed :
- Nombre de lettres cachées aujourd'hui
- Prochaine lettre programmée (si mode scheduled)
- Taux de collection moyen
- Temps moyen pour compléter

### 2. Prévisualisation

Bouton "👁️ Prévisualiser" pour :
- Voir comment une lettre cachée s'affiche
- Tester l'emoji de réaction
- Tester les notifications

### 3. Historique

Bouton "📜 Historique" pour :
- Voir les anciens mots
- Voir qui a complété quand
- Statistiques historiques

### 4. Import/Export

- Exporter la config en JSON
- Importer une config sauvegardée
- Templates pré-définis

### 5. Styles de Camouflage

Permettre de choisir les styles :
- ☑️ Gras
- ☑️ Italique
- ☑️ Souligné
- ☑️ Barré
- ☑️ Unicode

---

## 🏆 RÉSULTAT FINAL

✅ **Interface de configuration complète et professionnelle**  
✅ **9 boutons de configuration fonctionnels**  
✅ **Toutes les options du jeu configurables**  
✅ **Sauvegarde automatique**  
✅ **Validation des entrées**  
✅ **Interface intuitive**  
✅ **Aucun message "à venir"**

Le bouton **⚙️ Configurer** est maintenant **entièrement fonctionnel** ! 🎉

---

**Implémenté et déployé le 2025-11-20**  
**Version : 2.4 - Configuration Complète Mot-Cache**  
**Statut : ✅ PRODUCTION**
