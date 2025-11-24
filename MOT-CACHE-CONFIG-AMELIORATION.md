# Amélioration Configuration Mot-Caché

## Date : 19 novembre 2025

## Modifications effectuées

### 1. Nettoyage du menu principal `/mot-cache`

**Boutons retirés :**
- ❌ `📋 Salons jeu`
- ❌ `📢 Salon notifs`

**Raison :** Ces boutons sont maintenant accessibles uniquement via le menu de configuration `⚙️ Configurer`, pour simplifier l'interface principale.

**Menu principal après modification :**
- `🏆 Top joueurs` (visible par tous)
- `📝 Entrer le mot` (visible par tous)
- `⚙️ Configurer` (admin seulement)
- `⏸️ Désactiver/▶️ Activer` (admin seulement)
- `🔄 Reset` (admin seulement)

### 2. Ajout du bouton "📏 Longueur min" dans le menu de configuration

**Nouveau bouton ajouté dans le menu `⚙️ Configurer` :**
- `📏 Longueur min` : Permet de définir le nombre minimum de caractères qu'un message doit contenir pour participer au jeu

**Fonctionnalités :**
- Ouverture d'un modal avec champ de saisie
- Validation : entre 1 et 500 caractères
- Sauvegarde immédiate dans la configuration
- Mise à jour de l'embed de configuration

**Emplacement :** 2ème ligne de boutons dans le menu de configuration, après les boutons "Probabilité", "Lettres/jour" et "Emoji"

### 3. Structure du menu de configuration

**Ligne 1 :**
- `⏸️ Désactiver/▶️ Activer`
- `🎯 Changer le mot`
- `🎲 Changer le mode`

**Ligne 2 :**
- `📊 Probabilité` (désactivé si mode = programmé)
- `📅 Lettres/jour` (désactivé si mode = probabilité)
- `🔍 Emoji`
- `📏 Longueur min` ⭐ NOUVEAU

**Ligne 3 :**
- `📋 Salons jeu`
- `📢 Salon notifs`
- `🔄 Reset jeu`

## Fichiers modifiés

### 1. `/home/bagbot/Bag-bot/src/commands/mot-cache.js`

**Modification :** Retrait des boutons "Salons jeu" et "Salon notifs" de la première ligne de boutons admin.

**Avant :**
```javascript
row.addComponents(
    new ButtonBuilder()
        .setCustomId('mot_cache_config')
        .setLabel('⚙️ Configurer')
        .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
        .setCustomId('mot_cache_channels')
        .setLabel('📋 Salons jeu')
        .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
        .setCustomId('mot_cache_notif_channel')
        .setLabel('📢 Salon notifs')
        .setStyle(ButtonStyle.Secondary)
);
```

**Après :**
```javascript
row.addComponents(
    new ButtonBuilder()
        .setCustomId('mot_cache_config')
        .setLabel('⚙️ Configurer')
        .setStyle(ButtonStyle.Secondary)
);
```

### 2. `/home/bagbot/Bag-bot/src/handlers/motCacheHandler.js`

**Modifications :**

#### a) Ajout du bouton dans `buildConfigButtons()` :
```javascript
const row2 = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
        .setCustomId('mot_cache_set_probability')
        .setLabel('📊 Probabilité')
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(cfg.mode !== 'probability'),
    new ButtonBuilder()
        .setCustomId('mot_cache_set_letters_per_day')
        .setLabel('📅 Lettres/jour')
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(cfg.mode !== 'scheduled'),
    new ButtonBuilder()
        .setCustomId('mot_cache_set_emoji')
        .setLabel('🔍 Emoji')
        .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
        .setCustomId('mot_cache_set_min_length')
        .setLabel('📏 Longueur min')
        .setStyle(ButtonStyle.Secondary)
);
```

#### b) Ajout de l'affichage dans `buildConfigEmbed()` :
```javascript
{
    name: '📏 Longueur min message',
    value: `${cfg.minMessageLength} caractères`,
    inline: true
}
```

#### c) Nouvelles fonctions ajoutées :

**`handleMotCacheSetMinLength(interaction)`**
- Affiche un modal avec un champ de saisie
- Champ pré-rempli avec la valeur actuelle
- Maximum 3 caractères (pour saisir jusqu'à 500)

**`handleMotCacheMinLengthModal(interaction)`**
- Récupère la valeur saisie
- Valide : 1 ≤ valeur ≤ 500
- Sauvegarde dans `letterHunt.config.minMessageLength`
- Met à jour l'affichage

#### d) Exports ajoutés :
```javascript
module.exports = {
    // ... autres exports ...
    handleMotCacheSetMinLength,
    handleMotCacheMinLengthModal,
    // ...
};
```

### 3. `/home/bagbot/Bag-bot/src/bot.js`

**Modifications :** Ajout des handlers pour les nouvelles interactions :

```javascript
if (interaction.isButton() && interaction.customId === 'mot_cache_set_min_length') {
    return motCacheHandler.handleMotCacheSetMinLength(interaction);
}

if (interaction.isModalSubmit() && interaction.customId === 'mot_cache_min_length_modal') {
    return motCacheHandler.handleMotCacheMinLengthModal(interaction);
}
```

## Tests effectués

✅ Bot démarre sans erreur  
✅ Commande `/mot-cache` affiche le menu principal simplifié  
✅ Menu de configuration accessible via `⚙️ Configurer`  
✅ Bouton `📏 Longueur min` présent dans le menu config  
✅ Modal s'ouvre au clic  
✅ Validation des valeurs (1-500)  
✅ Sauvegarde fonctionnelle  
✅ Mise à jour de l'embed après modification  

## Avantages

1. **Interface plus claire** : Menu principal allégé, moins de boutons pour les non-admins
2. **Meilleure organisation** : Tous les paramètres de configuration regroupés dans un seul menu
3. **Nouvelle fonctionnalité** : Contrôle précis de la longueur minimale des messages participants
4. **Cohérence** : Tous les paramètres de filtrage (salons, longueur) au même endroit

## Configuration recommandée

- **Longueur minimale** : Entre 10 et 30 caractères pour éviter le spam
- **Mode** : Probabilité pour une distribution naturelle des lettres
- **Probabilité** : Entre 3% et 8% selon l'activité du serveur

## Compatibilité

- ✅ Rétrocompatible avec les configurations existantes
- ✅ Valeur par défaut : `minMessageLength` conservée (généralement 10)
- ✅ Pas d'impact sur le fonctionnement existant

---

**Status :** ✅ Déployé et opérationnel
