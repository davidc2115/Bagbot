import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
  Linking,
  ActivityIndicator,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import AuthService from '../services/AuthService';
import UserProfileService from '../services/UserProfileService';
import CustomImageAPIService from '../services/CustomImageAPIService';
import StableDiffusionLocalService from '../services/StableDiffusionLocalService';

/**
 * Écran de paramètres pour les utilisateurs non-admin
 * - Déconnexion
 * - Mode NSFW (si majeur)
 * - Lien Discord (si majeur)
 */
export default function UserSettingsScreen({ navigation, onLogout }) {
  const [userProfile, setUserProfile] = useState(null);
  const [nsfwMode, setNsfwMode] = useState(false);
  const [isAdult, setIsAdult] = useState(false);
  const [loading, setLoading] = useState(true);
  
  // États pour Stable Diffusion Local
  const [imageStrategy, setImageStrategy] = useState('freebox'); // 'freebox' ou 'local'
  const [sdAvailability, setSdAvailability] = useState(null);
  const [sdDownloading, setSdDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [downloadStatus, setDownloadStatus] = useState('');
  const [isPremium, setIsPremium] = useState(false);
  const [initializingPipeline, setInitializingPipeline] = useState(false);
  
  // État pour les mises à jour
  const [checkingUpdate, setCheckingUpdate] = useState(false);
  const [updateInfo, setUpdateInfo] = useState(null);

  const DISCORD_INVITE = 'https://discord.gg/9KHCqSmz';
  const CURRENT_VERSION = '3.7.54';
  const GITHUB_RELEASES_URL = 'https://api.github.com/repos/YOUR_USERNAME/roleplay-chat/releases/latest';

  useEffect(() => {
    loadUserData();
    loadImageSettings();
    checkPremiumStatus();
  }, []);

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      loadUserData();
      loadImageSettings();
      checkPremiumStatus();
    });
    return unsubscribe;
  }, [navigation]);

  const checkPremiumStatus = async () => {
    try {
      const premiumStatus = await AuthService.checkPremiumStatus();
      setIsPremium(premiumStatus);
    } catch (error) {
      console.error('Erreur vérification premium:', error);
      setIsPremium(AuthService.isPremium());
    }
  };

  const loadImageSettings = async () => {
    try {
      await CustomImageAPIService.loadConfig();
      setImageStrategy(CustomImageAPIService.getStrategy());
      
      // Vérifier la disponibilité de SD Local
      const availability = await StableDiffusionLocalService.checkAvailability();
      setSdAvailability(availability);
    } catch (error) {
      console.error('Erreur chargement config images:', error);
    }
  };

  const handleImageStrategyChange = async (newStrategy) => {
    if (newStrategy === 'local' && !isPremium) {
      Alert.alert(
        '💎 Premium Requis',
        'La génération d\'images sur smartphone est réservée aux membres Premium.'
      );
      return;
    }

    if (newStrategy === 'local' && (!sdAvailability?.available || !sdAvailability?.modelDownloaded)) {
      Alert.alert(
        '📱 Stable Diffusion Non Disponible',
        'Vous devez d\'abord télécharger le modèle SD pour utiliser la génération locale.\n\nVoulez-vous le télécharger maintenant ?',
        [
          { text: 'Annuler', style: 'cancel' },
          { text: 'Télécharger', onPress: handleDownloadSD }
        ]
      );
      return;
    }

    try {
      setImageStrategy(newStrategy);
      await CustomImageAPIService.saveConfig(
        CustomImageAPIService.getApiUrl(),
        newStrategy === 'local' ? 'local' : 'freebox',
        newStrategy
      );
      
      Alert.alert(
        '✅ Configuration Sauvegardée',
        newStrategy === 'local'
          ? 'Les images seront générées directement sur votre smartphone.'
          : 'Les images seront générées via le serveur Freebox.'
      );
    } catch (error) {
      console.error('Erreur changement stratégie:', error);
      Alert.alert('Erreur', 'Impossible de changer la configuration');
    }
  };

  const handleDownloadSD = async () => {
    if (!isPremium) {
      Alert.alert(
        '💎 Premium Requis',
        'Le téléchargement de Stable Diffusion est réservé aux membres Premium.'
      );
      return;
    }

    // Obtenir la taille totale des modèles
    const totalSize = StableDiffusionLocalService.getTotalModelSize();
    const models = StableDiffusionLocalService.getRequiredModels();
    const modelNames = Object.values(models).map(m => m.name).join('\n• ');

    Alert.alert(
      '📥 Téléchargement Modèles ONNX',
      `Cela va télécharger les modèles SD (~${(totalSize / 1024).toFixed(1)} Go):\n\n• ${modelNames}\n\nAssurez-vous d'avoir:\n• Une connexion WiFi stable\n• ${(totalSize / 1024 + 1).toFixed(0)}+ Go d'espace libre\n• 3+ Go RAM`,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Télécharger',
          onPress: async () => {
            try {
              setSdDownloading(true);
              setDownloadProgress(0);
              setDownloadStatus('Préparation...');
              
              await StableDiffusionLocalService.downloadAllModels((progress, status) => {
                setDownloadProgress(progress / 100);
                setDownloadStatus(status);
              });
              
              setSdDownloading(false);
              setDownloadStatus('');
              
              // Recharger la disponibilité
              const availability = await StableDiffusionLocalService.checkAvailability();
              setSdAvailability(availability);
              
              Alert.alert(
                '✅ Téléchargement Terminé', 
                'Les modèles ONNX sont prêts !\n\nVous pouvez maintenant initialiser le pipeline pour générer des images localement.'
              );
            } catch (error) {
              setSdDownloading(false);
              setDownloadStatus('');
              console.error('Erreur téléchargement SD:', error);
              Alert.alert('❌ Erreur', 'Le téléchargement a échoué:\n' + error.message);
            }
          }
        }
      ]
    );
  };

  const handleDeleteSD = async () => {
    Alert.alert(
      '🗑️ Supprimer les modèles SD',
      'Voulez-vous supprimer tous les modèles ONNX de votre appareil ?\n\nCela libérera environ 2 Go d\'espace.',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: async () => {
            try {
              // Libérer le pipeline d'abord
              await StableDiffusionLocalService.releasePipeline();
              
              // Supprimer les modèles
              await StableDiffusionLocalService.deleteModels();
              
              // Revenir à Freebox
              setImageStrategy('freebox');
              await CustomImageAPIService.saveConfig(
                CustomImageAPIService.getApiUrl(),
                'freebox',
                'freebox'
              );
              
              // Recharger la disponibilité
              const availability = await StableDiffusionLocalService.checkAvailability();
              setSdAvailability(availability);
              
              Alert.alert('✅ Supprimé', 'Les modèles SD ont été supprimés de votre appareil.');
            } catch (error) {
              console.error('Erreur suppression SD:', error);
              Alert.alert('Erreur', 'Impossible de supprimer les modèles');
            }
          }
        }
      ]
    );
  };

  const handleInitializePipeline = async () => {
    if (!sdAvailability?.modelDownloaded) {
      Alert.alert(
        '📥 Modèles requis',
        'Vous devez d\'abord télécharger les modèles ONNX avant d\'initialiser le pipeline.'
      );
      return;
    }

    Alert.alert(
      '🚀 Initialiser le Pipeline',
      'Cela va charger les modèles en mémoire pour la génération d\'images.\n\n⚠️ Cela peut prendre plusieurs minutes et utiliser beaucoup de RAM.',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Initialiser',
          onPress: async () => {
            try {
              setInitializingPipeline(true);
              
              await StableDiffusionLocalService.initializePipeline();
              
              // Recharger la disponibilité
              const availability = await StableDiffusionLocalService.checkAvailability();
              setSdAvailability(availability);
              
              setInitializingPipeline(false);
              
              Alert.alert(
                '✅ Pipeline Prêt',
                'Le pipeline SD est initialisé ! Vous pouvez maintenant générer des images localement.'
              );
            } catch (error) {
              setInitializingPipeline(false);
              console.error('Erreur initialisation pipeline:', error);
              Alert.alert('❌ Erreur', 'Initialisation échouée:\n' + error.message);
            }
          }
        }
      ]
    );
  };

  const loadUserData = async () => {
    try {
      // Charger le profil depuis AuthService
      const authUser = AuthService.getCurrentUser();
      const authProfile = authUser?.profile;
      
      // Charger aussi depuis UserProfileService (local)
      const localProfile = await UserProfileService.getProfile();
      
      const profile = authProfile || localProfile;
      setUserProfile(profile);
      
      if (profile) {
        const age = profile.age || 0;
        setIsAdult(age >= 18);
        setNsfwMode(profile.nsfwMode || false);
      }
    } catch (error) {
      console.error('Erreur chargement profil:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleNSFWToggle = async (value) => {
    if (!isAdult) {
      Alert.alert('Accès restreint', 'Le mode NSFW est réservé aux utilisateurs majeurs (18+).');
      return;
    }

    try {
      setNsfwMode(value);
      
      // Sauvegarder localement
      const updatedProfile = { ...userProfile, nsfwMode: value };
      await UserProfileService.updateProfile({ nsfwMode: value });
      
      // Sauvegarder sur le serveur
      await AuthService.updateProfile(updatedProfile);
      
      setUserProfile(updatedProfile);
      
      Alert.alert(
        value ? '🔞 Mode NSFW activé' : '✅ Mode NSFW désactivé',
        value 
          ? 'Vous avez maintenant accès aux contenus adultes.' 
          : 'Les contenus adultes sont masqués.'
      );
    } catch (error) {
      console.error('Erreur toggle NSFW:', error);
      setNsfwMode(!value); // Revert
    }
  };

  const handleOpenDiscord = () => {
    if (!isAdult) {
      Alert.alert('Accès restreint', 'Le serveur Discord est réservé aux utilisateurs majeurs (18+).');
      return;
    }
    
    Alert.alert(
      '🎮 Rejoindre Discord',
      '⚠️ ATTENTION: Ce serveur Discord est un espace communautaire NSFW réservé exclusivement aux adultes (18+).\n\nEn rejoignant, vous confirmez avoir au moins 18 ans.',
      [
        { text: 'Annuler', style: 'cancel' },
        { 
          text: 'Je confirme avoir 18+', 
          onPress: () => Linking.openURL(DISCORD_INVITE)
        }
      ]
    );
  };

  const handleLogout = () => {
    Alert.alert(
      '🚪 Déconnexion',
      'Voulez-vous vraiment vous déconnecter ?',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Se déconnecter',
          style: 'destructive',
          onPress: async () => {
            try {
              await AuthService.logout();
              // Appeler le callback de déconnexion de App.js
              if (onLogout) {
                onLogout();
              }
            } catch (error) {
              console.error('Erreur déconnexion:', error);
              Alert.alert('Erreur', 'Impossible de se déconnecter');
            }
          }
        }
      ]
    );
  };

  const currentUser = AuthService.getCurrentUser();

  // Fonction pour vérifier les mises à jour
  const checkForUpdates = async () => {
    setCheckingUpdate(true);
    let foundVersion = false;
    let directDownloadUrl = null;
    
    try {
      // Vérifier sur GitHub
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000);
        
        const githubResponse = await fetch(
          'https://api.github.com/repos/davidc2115/Naruto-chabot/releases/latest',
          { 
            headers: { 'Accept': 'application/vnd.github.v3+json' },
            signal: controller.signal
          }
        );
        
        clearTimeout(timeoutId);
        
        if (githubResponse.ok) {
          const release = await githubResponse.json();
          const latestVersion = release.tag_name?.replace('v', '') || release.name?.replace('v', '');
          
          // Trouver l'APK natif dans les assets
          const apkAsset = release.assets?.find(a => 
            a.name.endsWith('.apk') && a.name.includes('native')
          ) || release.assets?.find(a => a.name.endsWith('.apk'));
          
          directDownloadUrl = apkAsset?.browser_download_url;
          const changelog = release.body;
          
          if (latestVersion && directDownloadUrl) {
            compareVersions(latestVersion, directDownloadUrl, changelog);
            foundVersion = true;
            return;
          }
        }
      } catch (githubError) {
        console.log('GitHub non disponible:', githubError.message);
      }
      
      // Aucune source n'a fonctionné - proposer téléchargement direct
      if (!foundVersion) {
        // Construire l'URL directe basée sur la version actuelle +1
        const versionParts = CURRENT_VERSION.split('.');
        const nextMinor = parseInt(versionParts[2] || 0) + 1;
        const guessedVersion = `${versionParts[0]}.${versionParts[1]}.${nextMinor}`;
        
        Alert.alert(
          '📥 Télécharger la dernière version',
          `Version actuelle: ${CURRENT_VERSION}\n\n📱 Instructions:\n1. Cliquez pour ouvrir la page GitHub\n2. Téléchargez le fichier APK\n3. Installez-le sur votre appareil`,
          [
            { text: 'Annuler', style: 'cancel' },
            { 
              text: '🌐 Ouvrir GitHub', 
              onPress: () => {
                // Ouvrir la page des releases (plus fiable)
                Linking.openURL('https://github.com/davidc2115/Naruto-chabot/releases/latest');
              }
            }
          ]
        );
      }
      
    } catch (error) {
      console.error('Erreur vérification mise à jour:', error);
      Alert.alert(
        '📥 Télécharger',
        `Impossible de vérifier les mises à jour.\n\nTélécharger la dernière version ?`,
        [
          { text: 'Annuler', style: 'cancel' },
          { 
            text: '📥 Télécharger', 
            onPress: () => Linking.openURL('https://github.com/davidc2115/Naruto-chabot/releases/latest')
          }
        ]
      );
    } finally {
      setCheckingUpdate(false);
    }
  };

  const compareVersions = (latestVersion, downloadUrl, changelog) => {
    const currentParts = CURRENT_VERSION.split('.').map(Number);
    const latestParts = latestVersion.split('.').map(Number);
    
    let needsUpdate = false;
    for (let i = 0; i < Math.max(currentParts.length, latestParts.length); i++) {
      const current = currentParts[i] || 0;
      const latest = latestParts[i] || 0;
      
      if (latest > current) {
        needsUpdate = true;
        break;
      } else if (current > latest) {
        break;
      }
    }
    
    setUpdateInfo({
      latestVersion,
      needsUpdate,
      downloadUrl,
      changelog
    });
    
    if (needsUpdate) {
      // Construire l'URL finale
      let finalUrl = downloadUrl;
      if (!downloadUrl || !downloadUrl.endsWith('.apk')) {
        finalUrl = `https://github.com/davidc2115/Naruto-chabot/releases/download/v${latestVersion}/roleplay-chat-v${latestVersion}-native.apk`;
      }
      
      Alert.alert(
        '🆕 Mise à jour disponible !',
        `Version ${latestVersion} disponible\n(actuelle: ${CURRENT_VERSION})\n\n📱 Instructions:\n1. Cliquez "Ouvrir dans le navigateur"\n2. Le téléchargement commencera\n3. Ouvrez le fichier APK téléchargé\n4. Installez la mise à jour`,
        [
          { text: 'Plus tard', style: 'cancel' },
          { 
            text: '📋 Copier le lien', 
            onPress: async () => {
              try {
                const Clipboard = require('react-native').Clipboard || require('@react-native-clipboard/clipboard').default;
                if (Clipboard && Clipboard.setString) {
                  Clipboard.setString(finalUrl);
                  Alert.alert('✅ Lien copié !', 'Collez ce lien dans votre navigateur Chrome pour télécharger l\'APK.');
                }
              } catch (e) {
                // Fallback si Clipboard non disponible
                Alert.alert('Lien APK', finalUrl);
              }
            }
          },
          { 
            text: '🌐 Ouvrir navigateur', 
            onPress: () => {
              // Ouvrir la page des releases (plus fiable que le lien direct)
              Linking.openURL(`https://github.com/davidc2115/Naruto-chabot/releases/tag/v${latestVersion}`);
            }
          }
        ]
      );
    } else {
      Alert.alert(
        '✅ Application à jour',
        `Vous utilisez la dernière version (${CURRENT_VERSION}).`
      );
    }
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>⚙️ Paramètres</Text>
      </View>

      {/* PROFIL */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>👤 Mon Compte</Text>
        
        <View style={styles.profileCard}>
          <View style={styles.profileAvatar}>
            <Text style={styles.profileAvatarText}>
              {userProfile?.username?.charAt(0)?.toUpperCase() || '?'}
            </Text>
          </View>
          <View style={styles.profileInfo}>
            <Text style={styles.profileName}>
              {userProfile?.username || 'Utilisateur'}
            </Text>
            <Text style={styles.profileEmail}>
              {currentUser?.email || 'Non connecté'}
            </Text>
            {userProfile?.age && (
              <Text style={styles.profileAge}>
                {userProfile.age} ans • {isAdult ? '✅ Majeur' : '🔒 Mineur'}
              </Text>
            )}
          </View>
        </View>

        <TouchableOpacity
          style={styles.editProfileButton}
          onPress={() => navigation.navigate('UserProfile')}
        >
          <Text style={styles.editProfileButtonText}>✏️ Modifier mon profil</Text>
        </TouchableOpacity>
      </View>

      {/* PREMIUM */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>💎 Premium</Text>
        
        <TouchableOpacity
          style={styles.premiumButton}
          onPress={() => navigation.navigate('Premium')}
        >
          <View style={styles.premiumContent}>
            <Text style={styles.premiumIcon}>⭐</Text>
            <View style={styles.premiumInfo}>
              <Text style={styles.premiumTitle}>
                {AuthService.isPremium() ? 'Vous êtes Premium !' : 'Devenir Premium'}
              </Text>
              <Text style={styles.premiumDesc}>
                {AuthService.isPremium() 
                  ? 'Accédez à vos avantages'
                  : 'Génération d\'images illimitée'}
              </Text>
            </View>
            <Text style={styles.premiumArrow}>→</Text>
          </View>
        </TouchableOpacity>
        
        {/* Chat Premium - Réservé aux membres premium */}
        {isPremium && (
          <TouchableOpacity
            style={styles.premiumChatButton}
            onPress={() => navigation.navigate('PremiumChat')}
          >
            <View style={styles.premiumContent}>
              <Text style={styles.premiumIcon}>💬</Text>
              <View style={styles.premiumInfo}>
                <Text style={styles.premiumChatTitle}>Chat Communautaire</Text>
                <Text style={styles.premiumChatDesc}>
                  Discutez avec les autres membres Premium
                </Text>
              </View>
              <Text style={styles.premiumArrow}>→</Text>
            </View>
          </TouchableOpacity>
        )}
      </View>

      {/* GÉNÉRATION D'IMAGES */}
      {isPremium && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🖼️ Génération d'Images</Text>
          
          <Text style={styles.sectionSubtitle}>Méthode de génération</Text>
          
          <View style={styles.strategyOptions}>
            <TouchableOpacity
              style={[
                styles.strategyOption,
                imageStrategy === 'freebox' && styles.strategyOptionActive
              ]}
              onPress={() => handleImageStrategyChange('freebox')}
            >
              <Text style={styles.strategyIcon}>🏠</Text>
              <Text style={[
                styles.strategyLabel,
                imageStrategy === 'freebox' && styles.strategyLabelActive
              ]}>
                Freebox
              </Text>
              <Text style={styles.strategyDesc}>Via serveur</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.strategyOption,
                imageStrategy === 'local' && styles.strategyOptionActive
              ]}
              onPress={() => handleImageStrategyChange('local')}
            >
              <Text style={styles.strategyIcon}>📱</Text>
              <Text style={[
                styles.strategyLabel,
                imageStrategy === 'local' && styles.strategyLabelActive
              ]}>
                Local
              </Text>
              <Text style={styles.strategyDesc}>Sur smartphone</Text>
            </TouchableOpacity>
          </View>

          {/* Status Stable Diffusion */}
          <View style={styles.sdStatusBox}>
            <Text style={styles.sdStatusTitle}>📱 Stable Diffusion Local</Text>
            
            {sdAvailability ? (
              <View style={styles.sdStatusContent}>
                {/* Module Status */}
                <View style={styles.sdStatusRow}>
                  <Text style={styles.sdStatusLabel}>Module natif:</Text>
                  <Text style={[
                    styles.sdStatusValue,
                    { color: sdAvailability.moduleLoaded ? '#10b981' : '#ef4444' }
                  ]}>
                    {sdAvailability.moduleLoaded ? '✅ Chargé' : '❌ Non disponible'}
                    {sdAvailability.moduleVersion && ` v${sdAvailability.moduleVersion}`}
                  </Text>
                </View>
                
                {/* ONNX Status */}
                <View style={styles.sdStatusRow}>
                  <Text style={styles.sdStatusLabel}>ONNX Runtime:</Text>
                  <Text style={[
                    styles.sdStatusValue,
                    { color: sdAvailability.onnxAvailable ? '#10b981' : '#f59e0b' }
                  ]}>
                    {sdAvailability.onnxAvailable ? '✅ Disponible' : '⚠️ Non détecté'}
                  </Text>
                </View>
                
                {/* Models Status */}
                <View style={styles.sdStatusRow}>
                  <Text style={styles.sdStatusLabel}>Modèles ONNX:</Text>
                  <Text style={[
                    styles.sdStatusValue,
                    { color: sdAvailability.modelDownloaded ? '#10b981' : '#6b7280' }
                  ]}>
                    {sdAvailability.modelDownloaded 
                      ? `✅ Prêts (${sdAvailability.modelSizeMB?.toFixed(0) || 0} MB)` 
                      : '📥 À télécharger (~2 GB)'}
                  </Text>
                </View>
                
                {/* System Info */}
                {sdAvailability.ramMB > 0 && (
                  <View style={styles.sdStatusRow}>
                    <Text style={styles.sdStatusLabel}>RAM disponible:</Text>
                    <Text style={[
                      styles.sdStatusValue,
                      { color: sdAvailability.hasEnoughRAM ? '#10b981' : '#f59e0b' }
                    ]}>
                      {(sdAvailability.ramMB / 1024).toFixed(1)} Go
                      {sdAvailability.hasEnoughRAM ? ' ✅' : ' ⚠️'}
                    </Text>
                  </View>
                )}
                
                {/* Device Info */}
                {sdAvailability.deviceModel && (
                  <View style={styles.sdStatusRow}>
                    <Text style={styles.sdStatusLabel}>Appareil:</Text>
                    <Text style={styles.sdStatusValue}>
                      {sdAvailability.deviceModel}
                    </Text>
                  </View>
                )}
                
                {/* Pipeline Status */}
                <View style={styles.sdStatusRow}>
                  <Text style={styles.sdStatusLabel}>Pipeline:</Text>
                  <Text style={[
                    styles.sdStatusValue,
                    { color: sdAvailability.pipelineReady ? '#10b981' : '#6b7280' }
                  ]}>
                    {sdAvailability.pipelineReady ? '✅ Prêt' : '⏸️ Non initialisé'}
                  </Text>
                </View>
                
                {/* Status Message */}
                {sdAvailability.reason && (
                  <View style={[styles.sdStatusRow, { marginTop: 8, backgroundColor: '#f3f4f6', padding: 8, borderRadius: 6 }]}>
                    <Text style={{ fontSize: 12, color: '#4b5563', textAlign: 'center', flex: 1 }}>
                      {sdAvailability.reason}
                    </Text>
                  </View>
                )}
              </View>
            ) : (
              <ActivityIndicator color="#6366f1" style={{ marginTop: 10 }} />
            )}
            
            {/* Barre de progression téléchargement */}
            {sdDownloading && (
              <View style={{ marginVertical: 10 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                  <Text style={{ fontSize: 12, color: '#6b7280' }}>{downloadStatus}</Text>
                  <Text style={{ fontSize: 12, color: '#6b7280' }}>{Math.round(downloadProgress * 100)}%</Text>
                </View>
                <View style={{ height: 8, backgroundColor: '#e5e7eb', borderRadius: 4 }}>
                  <View style={{ 
                    height: 8, 
                    backgroundColor: '#6366f1', 
                    borderRadius: 4,
                    width: `${Math.round(downloadProgress * 100)}%`
                  }} />
                </View>
              </View>
            )}

            {/* Boutons SD */}
            <View style={styles.sdButtonsRow}>
              {/* Bouton Télécharger */}
              {!sdAvailability?.modelDownloaded && (
                <TouchableOpacity
                  style={[styles.sdDownloadButton, sdDownloading && styles.sdButtonDisabled]}
                  onPress={handleDownloadSD}
                  disabled={sdDownloading}
                >
                  {sdDownloading ? (
                    <View style={styles.sdDownloadingContent}>
                      <ActivityIndicator color="#fff" size="small" />
                      <Text style={styles.sdDownloadButtonText}>Téléchargement...</Text>
                    </View>
                  ) : (
                    <Text style={styles.sdDownloadButtonText}>
                      📥 Télécharger les modèles (~2 Go)
                    </Text>
                  )}
                </TouchableOpacity>
              )}
              
              {/* Bouton Initialiser Pipeline */}
              {sdAvailability?.modelDownloaded && !sdAvailability?.pipelineReady && (
                <TouchableOpacity
                  style={[styles.sdDownloadButton, { backgroundColor: '#10b981' }, initializingPipeline && styles.sdButtonDisabled]}
                  onPress={handleInitializePipeline}
                  disabled={initializingPipeline}
                >
                  {initializingPipeline ? (
                    <View style={styles.sdDownloadingContent}>
                      <ActivityIndicator color="#fff" size="small" />
                      <Text style={styles.sdDownloadButtonText}>Initialisation...</Text>
                    </View>
                  ) : (
                    <Text style={styles.sdDownloadButtonText}>
                      🚀 Initialiser le Pipeline
                    </Text>
                  )}
                </TouchableOpacity>
              )}
              
              {/* Indicateur Pipeline Prêt */}
              {sdAvailability?.pipelineReady && (
                <View style={[styles.sdDownloadButton, { backgroundColor: '#10b981' }]}>
                  <Text style={styles.sdDownloadButtonText}>
                    ✅ Pipeline Prêt
                  </Text>
                </View>
              )}
            </View>
            
            {/* Bouton Supprimer */}
            {sdAvailability?.modelDownloaded && (
              <TouchableOpacity
                style={[styles.sdDeleteButton, { marginTop: 8 }]}
                onPress={handleDeleteSD}
              >
                <Text style={styles.sdDeleteButtonText}>
                  🗑️ Supprimer les modèles
                </Text>
              </TouchableOpacity>
            )}
            
            <Text style={styles.sdInfoText}>
              ℹ️ La génération locale nécessite un smartphone puissant (3+ Go RAM).
              Les images sont générées directement sur votre appareil.
            </Text>
          </View>
        </View>
      )}

      {/* INFO APPLICATION 18+ */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>🔞 Application 18+</Text>
        
        <View style={[styles.settingRow, { backgroundColor: '#fef2f2', borderRadius: 10, padding: 12 }]}>
          <View style={styles.settingInfo}>
            <Text style={[styles.settingLabel, { color: '#dc2626' }]}>Mode NSFW Actif</Text>
            <Text style={styles.settingDescription}>
              Cette application est réservée aux adultes (18+).
              Tout le contenu est explicite par défaut.
            </Text>
          </View>
          <Text style={{ fontSize: 24 }}>✅</Text>
        </View>
      </View>

      {/* DISCORD */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>🎮 Communauté</Text>
        
        <TouchableOpacity
          style={styles.discordButton}
          onPress={handleOpenDiscord}
        >
          <Text style={styles.discordButtonIcon}>🎮</Text>
          <View style={styles.discordButtonContent}>
            <Text style={styles.discordButtonTitle}>Rejoindre Discord</Text>
            <Text style={styles.discordButtonSubtitle}>
              🔞 Serveur communautaire NSFW - Adultes uniquement
            </Text>
          </View>
          <Text style={styles.discordButtonArrow}>→</Text>
        </TouchableOpacity>
      </View>

      {/* DÉCONNEXION */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>🚪 Session</Text>
        
        <TouchableOpacity
          style={styles.logoutButton}
          onPress={handleLogout}
        >
          <Text style={styles.logoutButtonText}>🚪 Se déconnecter</Text>
        </TouchableOpacity>
        
        <Text style={styles.logoutHint}>
          Vos données seront conservées et vous pourrez vous reconnecter à tout moment.
        </Text>
      </View>

      {/* À PROPOS */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>ℹ️ À propos</Text>
        <View style={styles.aboutBox}>
          <Text style={styles.aboutText}>Version: {CURRENT_VERSION}</Text>
          <Text style={styles.aboutText}>Roleplay Chat - Application de conversation</Text>
          <Text style={styles.aboutText}>400+ personnages disponibles</Text>
        </View>
        
        {/* Vérification des mises à jour */}
        <TouchableOpacity
          style={[styles.updateButton, checkingUpdate && styles.updateButtonDisabled]}
          onPress={checkForUpdates}
          disabled={checkingUpdate}
        >
          {checkingUpdate ? (
            <View style={styles.updateButtonContent}>
              <ActivityIndicator color="#fff" size="small" />
              <Text style={styles.updateButtonText}>Vérification...</Text>
            </View>
          ) : (
            <View style={styles.updateButtonContent}>
              <Text style={styles.updateButtonIcon}>🔄</Text>
              <Text style={styles.updateButtonText}>Vérifier les mises à jour</Text>
            </View>
          )}
        </TouchableOpacity>
        
        {updateInfo && (
          <View style={[
            styles.updateInfoBox,
            updateInfo.needsUpdate ? styles.updateInfoBoxNew : styles.updateInfoBoxCurrent
          ]}>
            <Text style={styles.updateInfoText}>
              {updateInfo.needsUpdate 
                ? `🆕 Version ${updateInfo.latestVersion} disponible !`
                : `✅ Vous êtes à jour (${CURRENT_VERSION})`
              }
            </Text>
            {updateInfo.needsUpdate && updateInfo.downloadUrl && (
              <TouchableOpacity
                style={styles.downloadUpdateButton}
                onPress={() => Linking.openURL(updateInfo.downloadUrl)}
              >
                <Text style={styles.downloadUpdateButtonText}>📥 Télécharger</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      </View>

      <View style={{ height: 50 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  header: {
    padding: 20,
    paddingTop: 60,
    backgroundColor: '#6366f1',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
  },
  section: {
    padding: 20,
    backgroundColor: '#fff',
    marginTop: 15,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 15,
  },
  // Profil
  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f3f4f6',
    padding: 15,
    borderRadius: 12,
    marginBottom: 15,
  },
  profileAvatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#6366f1',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  profileAvatarText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
  },
  profileInfo: {
    flex: 1,
  },
  profileName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  profileEmail: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 2,
  },
  profileAge: {
    fontSize: 13,
    color: '#6b7280',
    marginTop: 4,
  },
  editProfileButton: {
    backgroundColor: '#f3f4f6',
    padding: 14,
    borderRadius: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  editProfileButtonText: {
    color: '#6366f1',
    fontSize: 15,
    fontWeight: '600',
  },
  // Premium
  premiumButton: {
    backgroundColor: '#fef3c7',
    padding: 15,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#fcd34d',
  },
  premiumContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  premiumIcon: {
    fontSize: 32,
    marginRight: 15,
  },
  premiumInfo: {
    flex: 1,
  },
  premiumTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#92400e',
  },
  premiumDesc: {
    fontSize: 13,
    color: '#b45309',
    marginTop: 2,
  },
  premiumArrow: {
    fontSize: 20,
    color: '#92400e',
    fontWeight: 'bold',
  },
  premiumChatButton: {
    backgroundColor: '#dbeafe',
    padding: 15,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#93c5fd',
    marginTop: 10,
  },
  premiumChatTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1e40af',
  },
  premiumChatDesc: {
    fontSize: 13,
    color: '#3b82f6',
    marginTop: 2,
  },
  // Settings Row
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#f3f4f6',
    padding: 15,
    borderRadius: 10,
  },
  settingInfo: {
    flex: 1,
    marginRight: 15,
  },
  settingLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
  },
  settingDescription: {
    fontSize: 13,
    color: '#6b7280',
    marginTop: 4,
  },
  // Warning
  warningBox: {
    backgroundColor: '#fef3c7',
    padding: 12,
    borderRadius: 8,
    marginTop: 10,
    borderWidth: 1,
    borderColor: '#f59e0b',
  },
  warningText: {
    fontSize: 13,
    color: '#92400e',
    textAlign: 'center',
  },
  // Discord
  discordButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#5865F2',
    padding: 15,
    borderRadius: 12,
  },
  discordButtonDisabled: {
    backgroundColor: '#9ca3af',
  },
  discordButtonIcon: {
    fontSize: 28,
    marginRight: 12,
  },
  discordButtonContent: {
    flex: 1,
  },
  discordButtonTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
  },
  discordButtonSubtitle: {
    fontSize: 12,
    color: '#e0e0e0',
    marginTop: 2,
  },
  discordButtonArrow: {
    fontSize: 20,
    color: '#fff',
  },
  // Logout
  logoutButton: {
    backgroundColor: '#ef4444',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  logoutButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  logoutHint: {
    fontSize: 12,
    color: '#9ca3af',
    textAlign: 'center',
    marginTop: 10,
  },
  // About
  aboutBox: {
    backgroundColor: '#f3f4f6',
    padding: 15,
    borderRadius: 10,
  },
  aboutText: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 5,
  },
  // Update button styles
  updateButton: {
    backgroundColor: '#6366f1',
    padding: 14,
    borderRadius: 10,
    marginTop: 15,
    alignItems: 'center',
  },
  updateButtonDisabled: {
    backgroundColor: '#9ca3af',
  },
  updateButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  updateButtonIcon: {
    fontSize: 18,
  },
  updateButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
  updateInfoBox: {
    marginTop: 12,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  updateInfoBoxNew: {
    backgroundColor: '#fef3c7',
    borderWidth: 1,
    borderColor: '#fcd34d',
  },
  updateInfoBoxCurrent: {
    backgroundColor: '#d1fae5',
    borderWidth: 1,
    borderColor: '#6ee7b7',
  },
  updateInfoText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
  },
  downloadUpdateButton: {
    backgroundColor: '#6366f1',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    marginTop: 10,
  },
  downloadUpdateButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  // Section subtitle
  sectionSubtitle: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 10,
  },
  // Strategy options for image generation
  strategyOptions: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 15,
  },
  strategyOption: {
    flex: 1,
    padding: 15,
    borderRadius: 12,
    backgroundColor: '#f3f4f6',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  strategyOptionActive: {
    borderColor: '#6366f1',
    backgroundColor: '#eef2ff',
  },
  strategyIcon: {
    fontSize: 28,
    marginBottom: 8,
  },
  strategyLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6b7280',
  },
  strategyLabelActive: {
    color: '#6366f1',
  },
  strategyDesc: {
    fontSize: 11,
    color: '#9ca3af',
    marginTop: 2,
  },
  // SD Status box
  sdStatusBox: {
    backgroundColor: '#f9fafb',
    padding: 15,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  sdStatusTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 10,
  },
  sdStatusContent: {
    marginBottom: 15,
  },
  sdStatusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  sdStatusLabel: {
    fontSize: 13,
    color: '#6b7280',
  },
  sdStatusValue: {
    fontSize: 13,
    fontWeight: '500',
    color: '#374151',
  },
  sdButtonsRow: {
    marginBottom: 10,
  },
  sdDownloadButton: {
    backgroundColor: '#6366f1',
    padding: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  sdButtonDisabled: {
    backgroundColor: '#9ca3af',
  },
  sdDownloadButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  sdDownloadingContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  sdDeleteButton: {
    backgroundColor: '#fee2e2',
    padding: 14,
    borderRadius: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#fecaca',
  },
  sdDeleteButtonText: {
    color: '#dc2626',
    fontSize: 14,
    fontWeight: '600',
  },
  sdInfoText: {
    fontSize: 12,
    color: '#9ca3af',
    textAlign: 'center',
    lineHeight: 18,
  },
});
