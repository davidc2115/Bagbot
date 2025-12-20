# 🚀 Quick Start - BAG Bot v4.1.0

## En 3 minutes ⏱️

### 1. Configuration Backend (1 min)

```bash
cd /workspace/backend
npm install
cp .env.example .env
nano .env  # Ajouter vos tokens Discord
```

### 2. Démarrage (30 secondes)

```bash
./start.sh
# Choisir option 1 : Démarrer tous les services
```

### 3. Vérification (30 secondes)

```bash
# Backend répond ?
curl http://localhost:3002/

# Services actifs ?
pm2 status

# ✅ C'est prêt !
```

---

## Commandes Ultra-Rapides 🏃

```bash
# Démarrer tout
./start.sh

# Voir les logs
pm2 logs

# Redémarrer
pm2 restart all

# Arrêter
pm2 stop all

# Status
pm2 status
```

---

## 📱 App Android

1. Installer l'APK : `app/build/outputs/apk/release/app-release.apk`
2. Ouvrir l'app
3. Se connecter avec Discord
4. ✅ Accès immédiat !

---

## 🆘 Problème ?

```bash
# Voir les erreurs
pm2 logs --err

# Redémarrer tout
pm2 restart all

# Port bloqué ?
lsof -ti:3002 | xargs kill -9
```

---

## 📚 Docs Complètes

- [Récapitulatif Final](RECAPITULATIF_FINAL.md)
- [Commandes Essentielles](COMMANDES_ESSENTIELLES.md)
- [Guide de Test](GUIDE_TEST_COMPLET.md)
- [Migration](GUIDE_MIGRATION.md)

---

**C'est tout ! Vous êtes prêt à utiliser BAG Bot v4.1.0 ! 🎉**
