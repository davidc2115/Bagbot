# 📱 Construction de l'APK BAG Bot Dashboard

## 🎯 Architecture

```
📱 Application Android (APK)
    ↓
🌐 API REST (http://88.174.155.230:3002)
    ↓
🤖 Bot Discord (Freebox)
```

## ✅ Ce qui est inclus dans l'APK

- ✅ Dashboard complet
- ✅ Gestion de l'économie
- ✅ Contrôle de la musique
- ✅ Gestion des jeux (Truth or Dare, Counting)
- ✅ Configuration du bot
- ✅ Système de tickets
- ✅ Gestion de l'inactivité
- ✅ Chat Staff
- ✅ Monitoring du serveur
- ✅ Redémarrage du bot/dashboard
- ✅ Connexion directe à votre Freebox (88.174.155.230:3002)

## 🔧 Configuration

L'application se connecte par défaut à : `http://88.174.155.230:3002`

Vous pouvez modifier cette adresse dans les paramètres de l'app si nécessaire.

## 📦 Construction de l'APK

### Commande à exécuter :

```bash
cd /workspace/BagBotApp
export EXPO_TOKEN="JKlsDNXifNh8IXoQdRlnxKI3hDjw0IQs522q5S0f"
eas build --platform android --profile production
```

### ⚠️ Action requise :

Quand vous verrez ce message :
```
? Generate a new Android Keystore? (Y/n)
```

**Tapez : `y` puis Entrée**

C'est LA SEULE action manuelle nécessaire !

## ⏱️ Temps de construction

- Durée estimée : **15-20 minutes**
- EAS Build va compiler l'APK dans le cloud
- À la fin, vous recevrez un lien de téléchargement direct

## 📲 Installation

1. Téléchargez l'APK depuis le lien fourni
2. Sur votre Android, autorisez l'installation d'applications tierces
3. Installez l'APK
4. Lancez "BAG Bot Dashboard"
5. Connectez-vous et gérez votre bot !

## 🔒 Sécurité

- L'APK sera signé avec une clé unique
- Connexion sécurisée à votre API
- Toutes les données restent sur votre Freebox

## 🌐 Accès distant

Pour accéder à votre bot depuis l'extérieur de votre réseau local :
- Assurez-vous que le port 3002 est ouvert sur votre Freebox
- Ou configurez un VPN pour accéder à votre réseau local
- Ou utilisez un tunnel (ngrok, cloudflare tunnel, etc.)
