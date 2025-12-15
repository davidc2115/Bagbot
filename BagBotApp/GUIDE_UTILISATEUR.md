# 📱 Guide d'Utilisation - BAG Bot Dashboard Mobile

## 🎯 Vue d'ensemble

Application mobile Android complète pour gérer votre serveur Discord BAG Bot depuis votre téléphone.

## 📲 Installation

### Étape 1 : Obtenir l'APK

**Option A - APK Pré-compilé (Recommandé)**
```bash
# L'APK sera disponible après le build
# Transférez-le sur votre téléphone Android
```

**Option B - Compiler vous-même**
```bash
cd /workspace/BagBotApp
npm install
npx eas build --platform android --profile production
```

### Étape 2 : Installer sur Android

1. Sur votre téléphone Android, allez dans **Paramètres** → **Sécurité**
2. Activez **Sources inconnues** ou **Installer des apps inconnues**
3. Ouvrez le fichier APK téléchargé
4. Cliquez sur **Installer**
5. Lancez l'application

## 🔐 Première Connexion

1. **Écran de connexion**
   - URL du serveur: `http://88.174.155.230:3002`
   - Cliquez sur **Connexion**

2. **Vérification**
   - L'app teste la connexion au serveur
   - Si succès → Dashboard principal
   - Si échec → Vérifiez l'URL

## 📚 Guide par Section

### 🏠 Dashboard (Accueil)

**Affichage:**
- Statistiques générales (membres, économie, tickets)
- Actions rapides (Boutique, Inactivité, Tickets)
- Informations système

**Actions:**
- Glisser vers le bas pour rafraîchir
- Cliquer sur une action rapide pour y accéder

### 💰 Économie

**Fonctionnalités:**
- Vue des statistiques économiques
- Configuration des cooldowns (travail, slotmachine, coinflip)
- Top 10 utilisateurs par richesse
- Accès à la boutique

**Comment modifier les cooldowns:**
1. Entrez les valeurs en minutes
2. Cliquez sur **Sauvegarder les modifications**
3. Attendez la confirmation

### 🎵 Musique

**Gestion des playlists:**
1. **Créer une playlist:**
   - Entrez le nom
   - Cliquez sur **Créer**

2. **Supprimer une playlist:**
   - Cliquez sur **Supprimer** à côté de la playlist
   - Confirmez

**Note:** Les pistes peuvent être gérées depuis le dashboard web complet.

### 🎲 Jeux

**Onglets disponibles:**
- **Action:** Défis pour Action ou Vérité
- **Vérité:** Questions pour Action ou Vérité
- **Comptage:** Jeu de comptage

**Affichage:**
- Nombre de prompts/questions
- Salons actifs

### 🛒 Boutique

**Gestion des articles:**
1. **Ajouter un article:**
   - Emoji: 🎁
   - Nom: ex. "VIP Role"
   - ID Discord: ID du rôle Discord
   - Prix: en BAG$
   - Cliquez sur **Ajouter**

2. **Supprimer un article:**
   - Cliquez sur ✕ à côté de l'article

3. **Sauvegarder:**
   - Cliquez sur le bouton **Sauvegarder** (FAB rouge en bas à droite)

### 💤 Inactivité

**Actions disponibles:**

1. **Ajouter tous les membres**
   - Ajoute tous les membres du serveur au système d'inactivité
   - Permet le suivi de leur activité

2. **Nettoyer les inactifs**
   - ⚠️ ATTENTION: Supprime les membres inactifs du serveur
   - Demande confirmation
   - Irréversible

3. **Réinitialiser tout**
   - Efface toutes les données d'inactivité
   - Ne supprime PAS les membres du serveur
   - Demande confirmation

**Statistiques:**
- Total membres suivis
- Nombre d'inactifs
- Nombre d'actifs

### 🎫 Tickets

**Gestion des catégories:**

1. **Créer une catégorie:**
   - Emoji: 🎫
   - Nom: ex. "Support Technique"
   - Description: Détails de la catégorie
   - Cliquez sur **Ajouter**

2. **Supprimer une catégorie:**
   - Cliquez sur ✕ à côté de la catégorie

3. **Sauvegarder:**
   - Cliquez sur le bouton **Sauvegarder** (FAB rose en bas à droite)

### ⚙️ Configuration

**Options:**

1. **Changer de serveur:**
   - Entrez la nouvelle URL
   - Cliquez sur **Changer de serveur**
   - L'app teste la connexion

2. **Informations:**
   - Version de l'app
   - Version du dashboard

3. **Déconnexion:**
   - Cliquez sur **Déconnexion**
   - Retour à l'écran de connexion

## 🔄 Actions Communes

### Rafraîchir les données
- Tirez l'écran vers le bas (pull-to-refresh)
- Les données se rechargent automatiquement

### Sauvegarder les modifications
- Cliquez sur le bouton **Sauvegarder** (généralement en rouge)
- Attendez la confirmation "Succès"

### Navigation
- Utilisez la barre de navigation en bas
- 5 sections principales accessibles d'un clic

## ⚠️ Résolution des Problèmes

### Erreur de connexion

**Problème:** "Impossible de se connecter au serveur"

**Solutions:**
1. Vérifiez l'URL du serveur
2. Vérifiez votre connexion Internet
3. Vérifiez que le serveur est accessible:
   - Ouvrez un navigateur web
   - Allez sur l'URL: http://88.174.155.230:3002
   - Si ça ne charge pas → Le serveur est hors ligne

### L'application crash

**Solutions:**
1. Fermez et relancez l'app
2. Videz le cache: Paramètres Android → Apps → BAG Bot → Vider le cache
3. Réinstallez l'application

### Les données ne se chargent pas

**Solutions:**
1. Tirez vers le bas pour rafraîchir
2. Vérifiez votre connexion Internet
3. Redémarrez l'application
4. Vérifiez que le serveur répond

### Impossible de sauvegarder

**Solutions:**
1. Vérifiez votre connexion
2. Vérifiez que tous les champs requis sont remplis
3. Réessayez après quelques secondes

## 📊 Bonnes Pratiques

1. **Sauvegardez régulièrement**
   - Après chaque modification importante
   - Avant de changer de section

2. **Rafraîchissez les données**
   - Avant de faire des modifications
   - Pour avoir les données à jour

3. **Confirmations**
   - Lisez bien les messages de confirmation
   - Surtout pour les actions destructives (suppression, nettoyage)

4. **Réseau**
   - Utilisez une connexion stable
   - Évitez de faire des modifications sur réseau instable

## 🆘 Support

### Questions Fréquentes

**Q: L'app peut-elle fonctionner hors ligne ?**
R: Non, une connexion Internet est requise pour communiquer avec le serveur.

**Q: Puis-je gérer plusieurs serveurs ?**
R: Oui, changez l'URL du serveur dans Configuration.

**Q: Les modifications sont-elles instantanées sur Discord ?**
R: Oui, dès que vous sauvegardez, les changements sont appliqués.

**Q: L'app est-elle compatible iOS ?**
R: Le code est compatible, mais seul l'APK Android est fourni.

## 📱 Raccourcis Clavier (si clavier connecté)

- **Ctrl + R** : Rafraîchir
- **Ctrl + S** : Sauvegarder (si applicable)
- **Retour** : Navigation arrière

## 🎨 Interface

**Thème Dark:**
- Fond noir: #0d0d0d
- Cards sombres: #1a1a1a
- Accent rouge: #FF0000
- Texte blanc: #ffffff

**Navigation:**
- Barre inférieure avec 5 onglets
- Stack navigation pour les sous-écrans
- Boutons FAB pour actions principales

## 📈 Mises à Jour

Pour mettre à jour l'application:
1. Téléchargez la nouvelle version APK
2. Installez par-dessus l'ancienne version
3. Vos paramètres sont conservés

---

**Version:** 1.0.0  
**Dernière mise à jour:** Décembre 2025  
**Développé pour:** BAG Bot Dashboard
