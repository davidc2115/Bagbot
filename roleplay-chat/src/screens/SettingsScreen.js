import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import UserProfileService from '../services/UserProfileService';
import CustomImageAPIService from '../services/CustomImageAPIService';
import StableDiffusionLocalService from '../services/StableDiffusionLocalService';
import TextGenerationService from '../services/TextGenerationService';
import SyncService from '../services/SyncService';
import AuthService from '../services/AuthService';
import * as FileSystem from 'expo-file-system';

// URL du serveur Freebox pour les fonctions admin
const FREEBOX_URL = 'http://88.174.155.230:33437';

export default function SettingsScreen({ navigation, onLogout }) {
  const [loading, setLoading] = useState(true);
  const [userProfile, setUserProfile] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  
  // Provider de génération de texte (Pollinations ou Ollama)
  const [textProvider, setTextProvider] = useState('pollinations');
  const [textProviders, setTextProviders] = useState([
    { id: 'pollinations', name: 'Pollinations AI', description: '🚀 Rapide (~3s)', speed: 'fast' },
    { id: 'ollama', name: 'Ollama Freebox', description: '🏠 Local (~30s)', speed: 'slow' },
  ]);
  
  // Anciens états Groq (pour compatibilité)
  const [groqApiKeys, setGroqApiKeys] = useState(['']);
  const [testingApi, setTestingApi] = useState(false);
  const [groqModel, setGroqModel] = useState('');
  const [availableModels, setAvailableModels] = useState([]);
  
  // Configuration images
  const [imageSource, setImageSource] = useState('freebox');
  const [freeboxUrl, setFreeboxUrl] = useState('http://88.174.155.230:33437/generate');
  
  // SD Local
  const [sdAvailability, setSdAvailability] = useState(null);
  const [sdDownloading, setSdDownloading] = useState(false);
  const [sdDownloadProgress, setSdDownloadProgress] = useState(0);
  
  // Synchronisation
  const [syncStatus, setSyncStatus] = useState(null);
  const [syncing, setSyncing] = useState(false);
  const [serverStats, setServerStats] = useState(null);

  useEffect(() => {
    loadAllSettings();
  }, []);

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      loadProfile();
      checkSDAvailability();
    });
    return unsubscribe;
  }, [navigation]);

  const loadAllSettings = async () => {
    try {
      // Vérifier si admin
      const adminStatus = AuthService.isAdmin();
      setIsAdmin(adminStatus);
      console.log('👑 Admin status:', adminStatus);
      
      await loadProfile();
      await loadTextProvider();
      
      // Charger les paramètres sensibles seulement si admin
      if (adminStatus) {
        await loadImageConfig();
        await checkSDAvailability();
      }
      await loadSyncStatus();
    } catch (error) {
      console.error('Erreur chargement paramètres:', error);
    } finally {
      setLoading(false);
    }
  };

  // Charger le provider de texte sélectionné
  const loadTextProvider = async () => {
    try {
      const provider = await AsyncStorage.getItem('text_generation_provider');
      if (provider) {
        setTextProvider(provider);
      }
    } catch (error) {
      console.error('Erreur chargement provider texte:', error);
    }
  };

  // Sauvegarder le provider de texte
  const saveTextProvider = async (providerId) => {
    try {
      setTextProvider(providerId);
      await AsyncStorage.setItem('text_generation_provider', providerId);
      await TextGenerationService.setProvider(providerId);
      Alert.alert('✅ Succès', `Provider changé: ${textProviders.find(p => p.id === providerId)?.name}`);
    } catch (error) {
      Alert.alert('Erreur', error.message);
    }
  };

  const loadSyncStatus = async () => {
    try {
      await SyncService.init();
      const status = await SyncService.getSyncStatus();
      setSyncStatus(status);
      
      if (status.serverOnline) {
        const stats = await SyncService.getServerStats();
        setServerStats(stats);
      }
    } catch (error) {
      console.error('Erreur vérification sync:', error);
    }
  };

  const handleSyncUpload = async () => {
    setSyncing(true);
    try {
      await SyncService.init();
      await SyncService.syncUpload();
      await loadSyncStatus();
      Alert.alert('Succès', 'Données synchronisées avec le serveur !');
    } catch (error) {
      Alert.alert('Erreur', 'Impossible de synchroniser: ' + error.message);
    } finally {
      setSyncing(false);
    }
  };

  const handleSyncDownload = async () => {
    Alert.alert(
      'Restaurer les données',
      'Cela remplacera vos données locales par celles du serveur. Continuer ?',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Restaurer',
          onPress: async () => {
            setSyncing(true);
            try {
              await SyncService.init();
              const success = await SyncService.syncDownload();
              if (success) {
                await loadSyncStatus();
                Alert.alert('Succès', 'Données restaurées depuis le serveur !');
              } else {
                Alert.alert('Info', 'Aucune donnée à restaurer sur le serveur.');
              }
            } catch (error) {
              Alert.alert('Erreur', 'Impossible de restaurer: ' + error.message);
            } finally {
              setSyncing(false);
            }
          }
        }
      ]
    );
  };

  const loadProfile = async () => {
    try {
      const profile = await UserProfileService.getProfile();
      setUserProfile(profile);
    } catch (error) {
      console.error('Erreur chargement profil:', error);
    }
  };

  const loadGroqKeys = async () => {
    try {
      const saved = await AsyncStorage.getItem('groq_api_keys');
      if (saved) {
        const keys = JSON.parse(saved);
        setGroqApiKeys(keys.length > 0 ? keys : ['']);
      }
    } catch (error) {
      console.error('Erreur chargement clés Groq:', error);
    }
  };

  const loadGroqModel = async () => {
    try {
      // Charger la config du service
      await TextGenerationService.loadConfig();
      
      // Récupérer les modèles disponibles
      const models = TextGenerationService.getAvailableGroqModels();
      setAvailableModels(models);
      
      // Récupérer le modèle actuel
      const currentModel = TextGenerationService.getGroqModel();
      setGroqModel(currentModel);
      
      console.log('🤖 Modèles Groq chargés:', models.length);
      console.log('🤖 Modèle actuel:', currentModel);
    } catch (error) {
      console.error('Erreur chargement modèle Groq:', error);
    }
  };

  const saveGroqModel = async (modelId) => {
    try {
      await TextGenerationService.setGroqModel(modelId);
      setGroqModel(modelId);
      Alert.alert('✅ Succès', `Modèle ${modelId} sélectionné !`);
    } catch (error) {
      Alert.alert('❌ Erreur', error.message);
    }
  };

  const loadImageConfig = async () => {
    try {
      await CustomImageAPIService.loadConfig();
      const strategy = CustomImageAPIService.getStrategy();
      const url = CustomImageAPIService.getApiUrl();
      
      setImageSource(strategy || 'freebox');
      if (url) {
        setFreeboxUrl(url);
      }
    } catch (error) {
      console.error('Erreur chargement config images:', error);
    }
  };

  const checkSDAvailability = async () => {
    try {
      const availability = await StableDiffusionLocalService.checkAvailability();
      setSdAvailability(availability);
      console.log('📱 SD Local availability:', availability);
    } catch (error) {
      console.error('❌ Error checking SD availability:', error);
      setSdAvailability({ available: false, reason: error.message });
    }
  };

  const saveGroqKeys = async () => {
    try {
      const validKeys = groqApiKeys.filter(key => key && key.trim() !== '');
      
      if (validKeys.length === 0) {
        Alert.alert('Erreur', 'Veuillez ajouter au moins une clé API valide.');
        return;
      }

      await AsyncStorage.setItem('groq_api_keys', JSON.stringify(validKeys));
      Alert.alert('✅ Succès', `${validKeys.length} clé(s) API sauvegardée(s) !`);
    } catch (error) {
      Alert.alert('❌ Erreur', `Impossible de sauvegarder: ${error.message}`);
    }
  };

  // Partager les clés avec tous les utilisateurs (Admin seulement)
  const shareGroqKeys = async () => {
    try {
      const validKeys = groqApiKeys.filter(key => key && key.trim() !== '');
      
      if (validKeys.length === 0) {
        Alert.alert('Erreur', 'Veuillez ajouter au moins une clé API avant de partager.');
        return;
      }

      Alert.alert(
        '🔗 Partager les clés',
        `Voulez-vous partager ${validKeys.length} clé(s) API Groq avec tous les utilisateurs de l'application ?`,
        [
          { text: 'Annuler', style: 'cancel' },
          {
            text: 'Partager',
            onPress: async () => {
              try {
                const response = await fetch(`${FREEBOX_URL}/api/shared-keys`, {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                    'X-Admin-Email': AuthService.getCurrentUser()?.email || ''
                  },
                  body: JSON.stringify({
                    groq: validKeys,
                    groq_model: groqModel
                  })
                });

                const data = await response.json();
                
                if (response.ok && data.success) {
                  Alert.alert(
                    '✅ Clés partagées !',
                    `${validKeys.length} clé(s) Groq sont maintenant disponibles pour tous les utilisateurs.\n\nModèle: ${groqModel}`
                  );
                } else {
                  Alert.alert('❌ Erreur', data.error || 'Impossible de partager les clés');
                }
              } catch (error) {
                Alert.alert('❌ Erreur', `Erreur serveur: ${error.message}`);
              }
            }
          }
        ]
      );
    } catch (error) {
      Alert.alert('❌ Erreur', error.message);
    }
  };

  const testGroqKey = async () => {
    const validKeys = groqApiKeys.filter(key => key && key.trim() !== '');
    
    if (validKeys.length === 0) {
      Alert.alert('Erreur', 'Veuillez ajouter une clé API d\'abord.');
      return;
    }

    setTestingApi(true);
    try {
      const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${validKeys[0]}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'llama-3.3-70b-versatile',
          messages: [{ role: 'user', content: 'Dis bonjour.' }],
          max_tokens: 50,
        }),
      });

      if (response.ok) {
        Alert.alert('✅ Succès', 'La clé API fonctionne correctement !');
      } else {
        const error = await response.json();
        Alert.alert('❌ Échec', `Erreur: ${error.error?.message || 'Clé invalide'}`);
      }
    } catch (error) {
      Alert.alert('❌ Erreur', `Test échoué: ${error.message}`);
    } finally {
      setTestingApi(false);
    }
  };

  const saveImageConfig = async () => {
    try {
      if (imageSource === 'local') {
        await CustomImageAPIService.saveConfig('', 'local', 'local');
        Alert.alert('✅ Succès', 'Stable Diffusion Local activé ! Téléchargez le modèle pour commencer.');
      } else {
        // Freebox
        if (!freeboxUrl.trim()) {
          Alert.alert('Erreur', 'Veuillez entrer l\'URL de la Freebox.');
          return;
        }
        await CustomImageAPIService.saveConfig(freeboxUrl.trim(), 'freebox', 'freebox');
        Alert.alert('✅ Succès', 'API Freebox configurée !');
      }
    } catch (error) {
      Alert.alert('❌ Erreur', error.message);
    }
  };

  const testFreeboxConnection = async () => {
    if (!freeboxUrl.trim()) {
      Alert.alert('Erreur', 'Veuillez entrer une URL.');
      return;
    }

    try {
      Alert.alert('Test en cours', 'Vérification de la connexion...');
      const result = await CustomImageAPIService.testConnection(freeboxUrl.trim());
      
      if (result.success) {
        Alert.alert('✅ Succès', 'Connexion à la Freebox réussie !');
      } else {
        Alert.alert('❌ Échec', `Impossible de se connecter:\n${result.error}`);
      }
    } catch (error) {
      Alert.alert('❌ Erreur', `Test échoué: ${error.message}`);
    }
  };

  const downloadSDModel = async () => {
    try {
      setSdDownloading(true);
      setSdDownloadProgress(0);
      
      Alert.alert(
        '📥 Téléchargement du modèle SD',
        'Le téléchargement va commencer.\nTaille: ~450 MB\n\n⚠️ Assurez-vous d\'être connecté en WiFi.',
        [
          { text: 'Annuler', style: 'cancel', onPress: () => setSdDownloading(false) },
          {
            text: 'Télécharger',
            onPress: async () => {
              try {
                console.log('📥 Début téléchargement modèle SD...');
                
                // Créer le dossier
                const modelDir = `${FileSystem.documentDirectory}sd_models/`;
                const dirInfo = await FileSystem.getInfoAsync(modelDir);
                if (!dirInfo.exists) {
                  await FileSystem.makeDirectoryAsync(modelDir, { intermediates: true });
                }
                
                // URL du modèle (placeholder - sera remplacée par le vrai modèle)
                const modelUrl = 'https://huggingface.co/stabilityai/sd-turbo/resolve/main/sd_turbo.safetensors';
                const modelPath = `${modelDir}sd_turbo.safetensors`;
                
                console.log('🌐 Téléchargement depuis:', modelUrl);
                
                const downloadResumable = FileSystem.createDownloadResumable(
                  modelUrl,
                  modelPath,
                  {},
                  (downloadProgress) => {
                    if (downloadProgress.totalBytesExpectedToWrite > 0) {
                      const progress = (downloadProgress.totalBytesWritten / downloadProgress.totalBytesExpectedToWrite) * 100;
                      setSdDownloadProgress(progress);
                    }
                  }
                );
                
                const result = await downloadResumable.downloadAsync();
                
                if (result && result.uri) {
                  const fileInfo = await FileSystem.getInfoAsync(result.uri);
                  const sizeMB = fileInfo.size / 1024 / 1024;
                  
                  setSdDownloading(false);
                  setSdDownloadProgress(100);
                  
                  Alert.alert(
                    '✅ Téléchargement réussi !',
                    `Modèle téléchargé avec succès.\nTaille: ${sizeMB.toFixed(2)} MB`,
                    [{ text: 'OK', onPress: () => checkSDAvailability() }]
                  );
                }
              } catch (error) {
                console.error('❌ Erreur téléchargement:', error);
                setSdDownloading(false);
                Alert.alert('❌ Erreur', `Téléchargement échoué: ${error.message}`);
              }
            }
          }
        ]
      );
    } catch (error) {
      setSdDownloading(false);
      Alert.alert('❌ Erreur', error.message);
    }
  };

  const addKeyField = () => {
    setGroqApiKeys([...groqApiKeys, '']);
  };

  const removeKeyField = (index) => {
    const newKeys = groqApiKeys.filter((_, i) => i !== index);
    setGroqApiKeys(newKeys.length === 0 ? [''] : newKeys);
  };

  const updateKey = (index, value) => {
    const newKeys = [...groqApiKeys];
    newKeys[index] = value;
    setGroqApiKeys(newKeys);
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#6366f1" />
        <Text style={styles.loadingText}>Chargement des paramètres...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Paramètres</Text>
      </View>

      {/* PROFIL */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>👤 Mon Profil</Text>
        <TouchableOpacity
          style={styles.profileButton}
          onPress={() => navigation.navigate('UserProfile')}
        >
          {userProfile ? (
            <View>
              <Text style={styles.profileName}>👋 {userProfile.username}</Text>
              <Text style={styles.profileInfo}>
                {userProfile.age} ans • {userProfile.gender === 'male' ? 'Homme' : userProfile.gender === 'female' ? 'Femme' : 'Autre'}
                {userProfile.nsfwMode && userProfile.isAdult && ' • 🔞 Mode NSFW'}
              </Text>
              <Text style={styles.profileAction}>Modifier mon profil →</Text>
            </View>
          ) : (
            <View>
              <Text style={styles.profileCreate}>✨ Créer mon profil</Text>
              <Text style={styles.profileSubtext}>
                Personnalisez vos conversations avec les personnages
              </Text>
            </View>
          )}
        </TouchableOpacity>
        
        {/* Chat Premium pour Admin */}
        <TouchableOpacity
          style={styles.premiumChatButton}
          onPress={() => navigation.navigate('PremiumChat')}
        >
          <Text style={styles.premiumChatIcon}>💬</Text>
          <View style={styles.premiumChatContent}>
            <Text style={styles.premiumChatTitle}>Chat Communautaire</Text>
            <Text style={styles.premiumChatDesc}>Discuter avec les membres Premium</Text>
          </View>
          <Text style={styles.premiumChatArrow}>→</Text>
        </TouchableOpacity>
      </View>

      {/* GÉNÉRATION DE TEXTE - Pour tous les utilisateurs */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>🤖 Génération de Texte</Text>
        <Text style={styles.sectionDescription}>
          Choisissez le service pour générer les réponses des personnages
        </Text>

        <View style={styles.infoBox}>
          <Text style={styles.infoText}>ℹ️ Deux options disponibles:</Text>
          <Text style={styles.infoSteps}>🚀 Pollinations AI - Rapide (~3 secondes)</Text>
          <Text style={styles.infoSteps}>🏠 Ollama Freebox - Local (~30 secondes)</Text>
        </View>

        {textProviders.map((provider) => (
          <TouchableOpacity
            key={provider.id}
            style={[
              styles.optionCard,
              textProvider === provider.id && styles.optionCardActive
            ]}
            onPress={() => saveTextProvider(provider.id)}
          >
            <View style={styles.radioButton}>
              {textProvider === provider.id && <View style={styles.radioButtonInner} />}
            </View>
            <View style={styles.optionContent}>
              <Text style={styles.optionTitle}>{provider.name}</Text>
              <Text style={styles.optionDescription}>{provider.description}</Text>
              {provider.id === 'pollinations' && (
                <Text style={styles.optionHint}>✨ Recommandé - Plus rapide</Text>
              )}
              {provider.id === 'ollama' && (
                <Text style={styles.optionHint}>📡 Serveur Freebox requis</Text>
              )}
            </View>
          </TouchableOpacity>
        ))}
        
        <View style={styles.providerNote}>
          <Text style={styles.providerNoteText}>
            💡 Pollinations AI est gratuit et ne nécessite aucune clé API.
            Si Pollinations est lent, l'application basculera automatiquement sur Ollama.
          </Text>
        </View>
      </View>

      {/* GÉNÉRATION D'IMAGES - Admin seulement */}
      {isAdmin && (
        <View style={styles.section}>
          <View style={styles.adminBadge}>
            <Text style={styles.adminBadgeText}>👑 Admin Only</Text>
          </View>
          <Text style={styles.sectionTitle}>🖼️ Génération d'Images</Text>
          <Text style={styles.sectionDescription}>
            Choisissez entre Freebox (serveur) ou SD Local (smartphone).
          </Text>

          {/* Option Freebox */}
          <TouchableOpacity
            style={[
              styles.optionCard,
              imageSource === 'freebox' && styles.optionCardActive
            ]}
            onPress={() => setImageSource('freebox')}
          >
            <View style={styles.radioButton}>
              {imageSource === 'freebox' && <View style={styles.radioButtonInner} />}
            </View>
            <View style={styles.optionContent}>
              <Text style={styles.optionTitle}>🏠 Freebox (Recommandé)</Text>
              <Text style={styles.optionDescription}>
                Serveur Stable Diffusion sur Freebox. Rapide et illimité !
              </Text>
            </View>
          </TouchableOpacity>

          {/* Option SD Local */}
          <TouchableOpacity
            style={[
              styles.optionCard,
              imageSource === 'local' && styles.optionCardActive
            ]}
            onPress={() => setImageSource('local')}
          >
            <View style={styles.radioButton}>
              {imageSource === 'local' && <View style={styles.radioButtonInner} />}
            </View>
            <View style={styles.optionContent}>
              <Text style={styles.optionTitle}>📱 SD Local (Smartphone)</Text>
              <Text style={styles.optionDescription}>
                Génération sur téléphone. Offline, 100% privé.
              </Text>
              <Text style={styles.optionWarning}>⚠️ Pipeline en développement</Text>
            </View>
          </TouchableOpacity>

          {/* Configuration Freebox */}
          {imageSource === 'freebox' && (
            <View style={styles.configBox}>
              <Text style={styles.configTitle}>Configuration Freebox:</Text>
              <TextInput
                style={styles.urlInput}
                placeholder="http://88.174.155.230:33437/generate"
                value={freeboxUrl}
                onChangeText={setFreeboxUrl}
                autoCapitalize="none"
                autoCorrect={false}
              />
              <TouchableOpacity style={styles.testButtonSmall} onPress={testFreeboxConnection}>
                <Text style={styles.testButtonSmallText}>🧪 Tester la connexion</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Configuration SD Local */}
          {imageSource === 'local' && (
            <View style={styles.configBox}>
              <Text style={styles.configTitle}>📱 Stable Diffusion Local:</Text>

              {/* Statut détaillé */}
              {sdAvailability && (
                <View style={styles.sdInfoBox}>
                  <Text style={styles.sdInfoTitle}>📊 Statut du module</Text>
                  
                  <Text style={styles.sdInfoText}>
                    📱 Module natif: {sdAvailability.moduleLoaded ? '✅ Chargé' : '❌ Non chargé'}
                    {sdAvailability.moduleVersion && ` (v${sdAvailability.moduleVersion})`}
                  </Text>
                  
                  <Text style={styles.sdInfoText}>
                    🔧 ONNX Runtime: {sdAvailability.onnxAvailable ? '✅ Disponible' : '❌ Non disponible'}
                  </Text>
                  
                  {!sdAvailability.onnxAvailable && (
                    <Text style={[styles.sdInfoText, { color: '#dc2626', fontSize: 11, marginLeft: 20 }]}>
                      ⚠️ La génération locale n'est pas disponible sur cet appareil.
                      {'\n'}   Utilisez la Freebox ou l'API externe pour générer des images.
                    </Text>
                  )}
                  
                  <Text style={styles.sdInfoText}>
                    📦 Modèles: {sdAvailability.modelDownloaded 
                      ? `✅ Prêts (${sdAvailability.modelSizeMB?.toFixed(0) || 0} MB)` 
                      : '📥 À télécharger (~2 GB)'}
                  </Text>
                  
                  {sdAvailability.deviceModel && (
                    <Text style={styles.sdInfoText}>
                      📲 Appareil: {sdAvailability.deviceModel} (Android {sdAvailability.androidVersion})
                    </Text>
                  )}
                  
                  <Text style={styles.sdInfoText}>
                    🧠 RAM Totale: {
                      sdAvailability.totalSystemRamMB > 0 
                        ? (sdAvailability.totalSystemRamMB / 1024).toFixed(2)
                        : sdAvailability.ramMB > 0 
                          ? (sdAvailability.ramMB / 1024).toFixed(2) 
                          : '?'
                    } GB
                    {(sdAvailability.availableSystemRamMB > 0 || sdAvailability.freeRamMB > 0) 
                      ? ` (${((sdAvailability.availableSystemRamMB || sdAvailability.freeRamMB) / 1024).toFixed(2)} GB dispo)` 
                      : ''
                    }
                    {sdAvailability.hasEnoughRAM ? ' ✅' : ' ⚠️'}
                  </Text>
                  
                  {sdAvailability.freeStorageMB > 0 && (
                    <Text style={styles.sdInfoText}>
                      💾 Stockage: {(sdAvailability.freeStorageMB / 1024).toFixed(1)} GB libre
                    </Text>
                  )}
                  
                  <Text style={styles.sdInfoText}>
                    ⚡ Pipeline: {sdAvailability.pipelineReady ? '✅ Prêt' : '⏸️ Non initialisé'}
                  </Text>
                  
                  <View style={[styles.sdStatusBadge, { 
                    backgroundColor: sdAvailability.canRunSD ? '#d1fae5' : '#fef3c7' 
                  }]}>
                    <Text style={[styles.sdStatusText, { 
                      color: sdAvailability.canRunSD ? '#065f46' : '#92400e' 
                    }]}>
                      {sdAvailability.reason || 'Vérification...'}
                    </Text>
                  </View>
                </View>
              )}

              {/* Barre de progression */}
              {sdDownloading && (
                <View style={styles.progressContainer}>
                  <Text style={styles.progressText}>
                    📥 Téléchargement... {Math.round(sdDownloadProgress)}%
                  </Text>
                  <View style={styles.progressBar}>
                    <View style={[styles.progressFill, { width: `${sdDownloadProgress}%` }]} />
                  </View>
                </View>
              )}

              {/* Bouton téléchargement */}
              <TouchableOpacity 
                style={[
                  styles.downloadButton, 
                  sdDownloading && styles.downloadButtonDisabled
                ]} 
                onPress={downloadSDModel}
                disabled={sdDownloading}
              >
                <Text style={styles.downloadButtonText}>
                  {sdDownloading 
                    ? '⏳ Téléchargement en cours...' 
                    : sdAvailability?.modelDownloaded
                      ? '🔄 Re-télécharger le modèle'
                      : '📥 Télécharger le modèle (~2.5 GB)'}
                </Text>
              </TouchableOpacity>
              
              {/* Bouton de test du module */}
              <TouchableOpacity
                style={[styles.sdButton, { backgroundColor: '#6366f1', marginTop: 10 }]}
                onPress={async () => {
                  try {
                    Alert.alert('🧪 Test...', 'Test du module natif en cours...');
                    const result = await StableDiffusionLocalService.testModule();
                    console.log('🧪 Résultat test module:', JSON.stringify(result, null, 2));
                    
                    if (result.success) {
                      // Calculer les valeurs à afficher
                      const totalGB = result.totalRamGB || (result.totalRamMB ? result.totalRamMB / 1024 : 0);
                      const availGB = result.availableRamGB || (result.availableRamMB ? result.availableRamMB / 1024 : 0);
                      
                      Alert.alert(
                        '✅ Module OK',
                        `Source: ${result.source || 'N/A'}\n` +
                        `Version: ${result.moduleVersion || 'N/A'}\n` +
                        `\n📊 RAM:\n` +
                        `  • Totale: ${totalGB.toFixed(2)} GB\n` +
                        `  • Disponible: ${availGB.toFixed(2)} GB\n` +
                        (result.totalRamMB ? `  • (${Math.round(result.totalRamMB)} MB / ${Math.round(result.availableRamMB || 0)} MB)\n` : '') +
                        `\n⚡ ONNX: ${result.onnxAvailable ? '✅ Disponible' : '❌ Non disponible'}\n` +
                        `  Status: ${result.onnxStatus || 'N/A'}\n` +
                        `\n📱 Appareil: ${result.device || 'N/A'}\n` +
                        `  Fabricant: ${result.manufacturer || 'N/A'}\n` +
                        `  Android: ${result.androidVersion || 'N/A'}` +
                        (result.hint ? `\n\n💡 ${result.hint}` : '')
                      );
                    } else {
                      // Afficher les détails de l'erreur
                      let errorDetails = `Module trouvé: ${result.moduleExists ? '✅' : '❌'}\n`;
                      errorDetails += `Platform: ${result.platform || 'N/A'} ${result.platformVersion || ''}\n`;
                      errorDetails += `\nErreur: ${result.error || 'Inconnue'}\n`;
                      
                      if (result.hint) {
                        errorDetails += `\n💡 ${result.hint}\n`;
                      }
                      
                      if (result.availableModules && result.availableModules.length > 0) {
                        errorDetails += `\nModules natifs trouvés (${result.availableModules.length}):\n`;
                        errorDetails += result.availableModules.slice(0, 10).join(', ');
                        if (result.availableModules.length > 10) {
                          errorDetails += '...';
                        }
                      }
                      
                      if (result.methodsAvailable && result.methodsAvailable.length > 0) {
                        errorDetails += `\n\nMéthodes du module:\n${result.methodsAvailable.join(', ')}`;
                      }
                      
                      Alert.alert('❌ Erreur Module', errorDetails);
                    }
                    checkSDAvailability();
                  } catch (e) {
                    Alert.alert('❌ Erreur', e.message);
                  }
                }}
              >
                <Text style={styles.sdButtonText}>🧪 Tester le module natif</Text>
              </TouchableOpacity>
              
              <Text style={styles.sdNote}>
                💡 Conseil: Utilisez la Freebox pour l'instant. Le SD Local sera fonctionnel dans une future mise à jour.
              </Text>
            </View>
          )}

          <TouchableOpacity style={styles.saveButton} onPress={saveImageConfig}>
            <Text style={styles.saveButtonText}>💾 Sauvegarder la configuration</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* COMPTE - Admin seulement */}
      {isAdmin && (
        <View style={styles.section}>
          <View style={styles.adminBadge}>
            <Text style={styles.adminBadgeText}>👑 Admin Only</Text>
          </View>
          <Text style={styles.sectionTitle}>👤 Compte Admin</Text>
          
          <View style={styles.accountBox}>
            <Text style={styles.accountStatus}>
              ✅ Connecté: {AuthService.getCurrentUser()?.email || 'Admin'}
            </Text>
            
            <TouchableOpacity
              style={[styles.accountButton, styles.logoutButton]}
              onPress={() => {
                Alert.alert(
                  'Déconnexion',
                  'Voulez-vous vraiment vous déconnecter ?',
                  [
                    { text: 'Annuler', style: 'cancel' },
                    { 
                      text: 'Déconnexion', 
                      style: 'destructive',
                      onPress: async () => {
                        await AuthService.logout();
                        // Appeler le callback pour retourner à l'écran de connexion
                        if (onLogout) {
                          onLogout();
                        }
                      }
                    }
                  ]
                );
              }}
            >
              <Text style={styles.accountButtonText}>🚪 Se déconnecter</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* SYNCHRONISATION FREEBOX - Admin seulement */}
      {isAdmin && (
        <View style={styles.section}>
          <View style={styles.adminBadge}>
            <Text style={styles.adminBadgeText}>👑 Admin Only</Text>
          </View>
          <Text style={styles.sectionTitle}>☁️ Synchronisation Freebox</Text>
          
          <View style={styles.syncStatusBox}>
            <View style={styles.syncStatusRow}>
              <Text style={styles.syncLabel}>Serveur:</Text>
              <Text style={[
                styles.syncValue, 
                { color: syncStatus?.serverOnline ? '#059669' : '#dc2626' }
              ]}>
                {syncStatus?.serverOnline ? '🟢 En ligne' : '🔴 Hors ligne'}
              </Text>
            </View>
            
            {syncStatus?.lastSync && (
              <View style={styles.syncStatusRow}>
                <Text style={styles.syncLabel}>Dernière sync:</Text>
                <Text style={styles.syncValue}>
                  {new Date(syncStatus.lastSync).toLocaleString('fr-FR')}
                </Text>
              </View>
            )}
            
            {serverStats && (
              <View style={styles.syncStatusRow}>
                <Text style={styles.syncLabel}>Personnages publics:</Text>
                <Text style={styles.syncValue}>{serverStats.publicCharacters || 0}</Text>
              </View>
            )}
          </View>
          
          <View style={styles.syncButtons}>
            <TouchableOpacity
              style={[styles.syncButton, styles.syncUploadButton]}
              onPress={handleSyncUpload}
              disabled={syncing}
            >
              {syncing ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.syncButtonText}>📤 Sauvegarder</Text>
              )}
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.syncButton, styles.syncDownloadButton]}
              onPress={handleSyncDownload}
              disabled={syncing}
            >
              {syncing ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.syncButtonText}>📥 Restaurer</Text>
              )}
            </TouchableOpacity>
          </View>
          
          <Text style={styles.syncHint}>
            Synchronise tes personnages, conversations et paramètres avec ta Freebox.
            Les personnages publics sont partagés avec la communauté.
          </Text>
        </View>
      )}

      {/* À PROPOS */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>ℹ️ À propos</Text>
        <View style={styles.aboutBox}>
          <Text style={styles.aboutText}>Version: 3.7.10</Text>
          <Text style={styles.aboutText}>Application de roleplay conversationnel</Text>
          <Text style={styles.aboutText}>400+ personnages disponibles</Text>
          <Text style={styles.aboutText}>Génération d'images: Freebox (Pollinations multi-modèles)</Text>
          <Text style={styles.aboutText}>Synchronisation Freebox + Personnages publics</Text>
          <Text style={styles.aboutText}>Mode NSFW 100% français</Text>
        </View>
      </View>

      {/* FONCTIONNALITÉS */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>🎨 Fonctionnalités</Text>
        <View style={styles.featuresList}>
          <Text style={styles.featureItem}>✓ Multi-clés Groq avec rotation</Text>
          <Text style={styles.featureItem}>✓ Personnalisation des bulles de chat</Text>
          <Text style={styles.featureItem}>✓ Mode NSFW pour adultes</Text>
          <Text style={styles.featureItem}>✓ Génération d'images Freebox illimitée</Text>
          <Text style={styles.featureItem}>✓ Option SD Local sur smartphone</Text>
          <Text style={styles.featureItem}>✓ Galerie d'images par personnage</Text>
          <Text style={styles.featureItem}>✓ Sauvegarde automatique</Text>
        </View>
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#6b7280',
  },
  header: {
    padding: 20,
    paddingTop: 60,
    backgroundColor: '#6366f1',
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#fff',
  },
  section: {
    padding: 20,
    backgroundColor: '#fff',
    marginTop: 15,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 10,
  },
  sectionDescription: {
    fontSize: 14,
    color: '#6b7280',
    lineHeight: 20,
    marginBottom: 15,
  },
  infoBox: {
    backgroundColor: '#e0e7ff',
    padding: 15,
    borderRadius: 10,
    marginBottom: 20,
  },
  infoText: {
    fontSize: 14,
    color: '#4f46e5',
    fontWeight: '600',
    marginBottom: 10,
  },
  infoSteps: {
    fontSize: 13,
    color: '#4f46e5',
    marginLeft: 10,
    marginBottom: 5,
  },
  keyInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  keyInput: {
    flex: 1,
    backgroundColor: '#f3f4f6',
    borderRadius: 10,
    padding: 12,
    fontSize: 14,
  },
  removeButton: {
    marginLeft: 10,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#ef4444',
    justifyContent: 'center',
    alignItems: 'center',
  },
  removeButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  addButton: {
    backgroundColor: '#f3f4f6',
    borderRadius: 10,
    padding: 12,
    alignItems: 'center',
    marginTop: 5,
    marginBottom: 20,
  },
  addButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6366f1',
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 10,
  },
  testButton: {
    flex: 1,
    backgroundColor: '#f59e0b',
    borderRadius: 10,
    padding: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  testButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
  },
  saveButton: {
    flex: 1,
    backgroundColor: '#6366f1',
    borderRadius: 10,
    padding: 15,
    alignItems: 'center',
    marginTop: 10,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
  },
  shareButton: {
    backgroundColor: '#10b981',
    borderRadius: 10,
    padding: 15,
    alignItems: 'center',
    marginTop: 15,
  },
  shareButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
  },
  shareHint: {
    fontSize: 12,
    color: '#6b7280',
    textAlign: 'center',
    marginTop: 8,
    fontStyle: 'italic',
  },
  optionCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#f9fafb',
    padding: 15,
    borderRadius: 10,
    marginBottom: 10,
    borderWidth: 2,
    borderColor: '#e5e7eb',
  },
  optionCardActive: {
    borderColor: '#6366f1',
    backgroundColor: '#eef2ff',
  },
  radioButton: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#6366f1',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    marginTop: 2,
  },
  radioButtonInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#6366f1',
  },
  optionContent: {
    flex: 1,
  },
  optionTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 4,
  },
  optionDescription: {
    fontSize: 13,
    color: '#6b7280',
    lineHeight: 18,
  },
  configBox: {
    backgroundColor: '#f0f9ff',
    padding: 15,
    borderRadius: 10,
    marginTop: 10,
    marginBottom: 10,
  },
  configTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0369a1',
    marginBottom: 10,
  },
  urlInput: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 12,
    fontSize: 13,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    marginBottom: 10,
  },
  testButtonSmall: {
    backgroundColor: '#0ea5e9',
    borderRadius: 8,
    padding: 10,
    alignItems: 'center',
  },
  testButtonSmallText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
  sdInfoBox: {
    backgroundColor: '#fff',
    padding: 12,
    borderRadius: 8,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  sdInfoTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 8,
  },
  sdInfoText: {
    fontSize: 12,
    color: '#374151',
    marginBottom: 4,
  },
  sdStatusBadge: {
    backgroundColor: '#f0f9ff',
    padding: 8,
    borderRadius: 6,
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#bae6fd',
  },
  sdStatusText: {
    fontSize: 12,
    color: '#0369a1',
    textAlign: 'center',
  },
  sdInfoWarning: {
    fontSize: 13,
    color: '#dc2626',
    marginTop: 5,
  },
  progressContainer: {
    marginBottom: 10,
  },
  progressText: {
    fontSize: 13,
    color: '#6b7280',
    marginBottom: 5,
    textAlign: 'center',
  },
  progressBar: {
    height: 8,
    backgroundColor: '#e5e7eb',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#10b981',
    borderRadius: 4,
  },
  downloadButton: {
    backgroundColor: '#10b981',
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
  },
  downloadButtonDisabled: {
    backgroundColor: '#9ca3af',
  },
  downloadButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
  optionWarning: {
    fontSize: 11,
    color: '#dc2626',
    marginTop: 4,
    fontStyle: 'italic',
  },
  warningBox: {
    backgroundColor: '#fef3c7',
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#f59e0b',
  },
  warningText: {
    fontSize: 12,
    color: '#92400e',
    lineHeight: 18,
  },
  sdNote: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 10,
    fontStyle: 'italic',
    textAlign: 'center',
  },
  aboutBox: {
    backgroundColor: '#f3f4f6',
    padding: 15,
    borderRadius: 10,
  },
  aboutText: {
    fontSize: 14,
    color: '#4b5563',
    marginBottom: 8,
  },
  // Styles synchronisation
  syncStatusBox: {
    backgroundColor: '#f3f4f6',
    padding: 15,
    borderRadius: 10,
    marginBottom: 15,
  },
  syncStatusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  syncLabel: {
    fontSize: 14,
    color: '#6b7280',
  },
  syncValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
  },
  syncButtons: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 15,
  },
  syncButton: {
    flex: 1,
    padding: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  syncUploadButton: {
    backgroundColor: '#6366f1',
  },
  syncDownloadButton: {
    backgroundColor: '#10b981',
  },
  syncButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  syncHint: {
    fontSize: 12,
    color: '#9ca3af',
    textAlign: 'center',
    lineHeight: 18,
  },
  // Styles compte
  accountBox: {
    backgroundColor: '#f3f4f6',
    padding: 15,
    borderRadius: 10,
  },
  accountStatus: {
    fontSize: 14,
    color: '#374151',
    marginBottom: 15,
    textAlign: 'center',
  },
  accountButton: {
    padding: 14,
    borderRadius: 10,
    alignItems: 'center',
    marginBottom: 10,
  },
  loginButton: {
    backgroundColor: '#6366f1',
  },
  logoutButton: {
    backgroundColor: '#ef4444',
  },
  accountButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  accountHint: {
    fontSize: 12,
    color: '#9ca3af',
    textAlign: 'center',
    lineHeight: 18,
  },
  featuresList: {
    backgroundColor: '#f3f4f6',
    padding: 15,
    borderRadius: 10,
  },
  featureItem: {
    fontSize: 14,
    color: '#4b5563',
    marginBottom: 8,
  },
  profileButton: {
    padding: 20,
    backgroundColor: '#f3f4f6',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#6366f1',
    marginBottom: 10,
  },
  profileName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#6366f1',
    marginBottom: 5,
  },
  profileInfo: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 8,
  },
  profileAction: {
    fontSize: 14,
    color: '#6366f1',
    fontWeight: '600',
  },
  profileCreate: {
    fontSize: 18,
    color: '#6366f1',
    fontWeight: 'bold',
    marginBottom: 5,
  },
  profileSubtext: {
    fontSize: 13,
    color: '#6b7280',
  },
  // Styles pour le chat premium
  premiumChatButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#6366f1',
    padding: 15,
    borderRadius: 12,
    marginTop: 15,
  },
  premiumChatIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  premiumChatContent: {
    flex: 1,
  },
  premiumChatTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
  },
  premiumChatDesc: {
    fontSize: 13,
    color: '#e0e7ff',
    marginTop: 2,
  },
  premiumChatArrow: {
    fontSize: 20,
    color: '#fff',
    fontWeight: 'bold',
  },
  // Styles pour les limites Groq
  groqLimitsBox: {
    backgroundColor: '#f0fdf4',
    padding: 15,
    borderRadius: 12,
    marginTop: 20,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#86efac',
  },
  groqLimitsTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#166534',
    marginBottom: 12,
  },
  groqLimitsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 12,
  },
  groqLimitItem: {
    backgroundColor: '#fff',
    padding: 10,
    borderRadius: 8,
    width: '48%',
    borderWidth: 1,
    borderColor: '#bbf7d0',
  },
  groqLimitLabel: {
    fontSize: 11,
    color: '#166534',
    marginBottom: 4,
  },
  groqLimitValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#15803d',
  },
  groqLimitSub: {
    fontSize: 10,
    color: '#6b7280',
    marginTop: 2,
  },
  groqLimitsNote: {
    backgroundColor: '#dcfce7',
    padding: 10,
    borderRadius: 8,
    marginBottom: 12,
  },
  groqLimitsNoteText: {
    fontSize: 12,
    color: '#166534',
    lineHeight: 18,
    textAlign: 'center',
  },
  groqContextInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#bbf7d0',
  },
  groqContextLabel: {
    fontSize: 12,
    color: '#166534',
  },
  groqContextValue: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#15803d',
  },
  // Styles pour la sélection du modèle Groq
  modelSection: {
    marginTop: 25,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  modelSectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 5,
  },
  modelDescription: {
    fontSize: 13,
    color: '#6b7280',
    marginBottom: 15,
  },
  modelCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f9fafb',
    padding: 12,
    borderRadius: 10,
    marginBottom: 8,
    borderWidth: 2,
    borderColor: '#e5e7eb',
  },
  modelCardActive: {
    borderColor: '#10b981',
    backgroundColor: '#ecfdf5',
  },
  modelRadio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#10b981',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  modelRadioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#10b981',
  },
  modelContent: {
    flex: 1,
  },
  modelName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1f2937',
  },
  modelDesc: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 2,
  },
  // Style badge admin
  adminBadge: {
    backgroundColor: '#fef3c7',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#f59e0b',
  },
  adminBadgeText: {
    color: '#92400e',
    fontSize: 12,
    fontWeight: '600',
  },
  // Styles pour le choix de provider de texte
  optionHint: {
    fontSize: 11,
    color: '#10b981',
    marginTop: 4,
    fontStyle: 'italic',
  },
  providerNote: {
    backgroundColor: '#ecfdf5',
    padding: 12,
    borderRadius: 10,
    marginTop: 15,
    borderWidth: 1,
    borderColor: '#a7f3d0',
  },
  providerNoteText: {
    fontSize: 12,
    color: '#065f46',
    lineHeight: 18,
  },
});
