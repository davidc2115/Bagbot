/**
 * Service Stable Diffusion Local (génération sur smartphone)
 * Version 4.1 - URLs corrigées et meilleure gestion des erreurs
 * 
 * STATUT:
 * ✅ Module natif avec ONNX Runtime
 * ✅ Détection automatique des modèles
 * ✅ Événements de progression
 * ✅ URLs multiples avec fallback
 * ✅ Validation des téléchargements
 */

import { NativeModules, NativeEventEmitter, Platform } from 'react-native';
import * as FileSystem from 'expo-file-system';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Récupération du module natif avec logs détaillés
console.log('🔍 Recherche du module StableDiffusionLocal...');
console.log('📱 NativeModules disponibles:', Object.keys(NativeModules || {}).join(', '));

const StableDiffusionLocal = NativeModules?.StableDiffusionLocal;
console.log('📱 StableDiffusionLocal trouvé:', !!StableDiffusionLocal);
if (StableDiffusionLocal) {
  console.log('📱 Méthodes disponibles:', Object.keys(StableDiffusionLocal).join(', '));
}

// Clé de stockage pour les URLs personnalisées
const CUSTOM_SERVER_KEY = '@sd_custom_server';

// URLs des modèles ONNX - Multiples sources avec fallback
// Utilise SD-Turbo optimisé ONNX (modèle léger et rapide)
const MODEL_SOURCES = {
  // Source principale - Hugging Face (modèle communautaire optimisé)
  primary: {
    name: 'HuggingFace Optimized',
    baseUrl: 'https://huggingface.co/AIPokemon/sd-turbo-onnx/resolve/main/',
    models: {
      textEncoder: { path: 'text_encoder/model.onnx', name: 'text_encoder.onnx', sizeMB: 250 },
      unet: { path: 'unet/model.onnx', name: 'unet.onnx', sizeMB: 1700 },
      vaeDecoder: { path: 'vae_decoder/model.onnx', name: 'vae_decoder.onnx', sizeMB: 100 },
    }
  },
  // Source de secours - Modèle SD 1.5 plus stable
  fallback: {
    name: 'SD 1.5 ONNX',
    baseUrl: 'https://huggingface.co/runwayml/stable-diffusion-v1-5/resolve/onnx/',
    models: {
      textEncoder: { path: 'text_encoder/model.onnx', name: 'text_encoder.onnx', sizeMB: 245 },
      unet: { path: 'unet/model.onnx', name: 'unet.onnx', sizeMB: 1660 },
      vaeDecoder: { path: 'vae_decoder/model.onnx', name: 'vae_decoder.onnx', sizeMB: 99 },
    }
  },
  // Source alternative - SegMind (modèle très léger)
  lightweight: {
    name: 'SegMind SSD-1B',
    baseUrl: 'https://huggingface.co/segmind/SSD-1B-onnx/resolve/main/',
    models: {
      textEncoder: { path: 'text_encoder/model.onnx', name: 'text_encoder.onnx', sizeMB: 200 },
      unet: { path: 'unet/model.onnx', name: 'unet.onnx', sizeMB: 1200 },
      vaeDecoder: { path: 'vae_decoder/model.onnx', name: 'vae_decoder.onnx', sizeMB: 80 },
    }
  }
};

// Modèles actuellement utilisés (par défaut: primary)
let CURRENT_SOURCE = 'primary';
let MODELS = {};

// Fonction pour mettre à jour les modèles selon la source
function updateModelsFromSource(sourceName) {
  const source = MODEL_SOURCES[sourceName];
  if (!source) return;
  
  CURRENT_SOURCE = sourceName;
  MODELS = {};
  
  for (const [key, model] of Object.entries(source.models)) {
    MODELS[key] = {
      name: model.name,
      url: source.baseUrl + model.path,
      sizeMB: model.sizeMB,
    };
  }
}

// Initialiser avec la source principale
updateModelsFromSource('primary');

// Taille totale estimée
const getTotalModelSize = () => Object.values(MODELS).reduce((sum, m) => sum + m.sizeMB, 0);

class StableDiffusionLocalService {
  constructor() {
    // Détection du module natif
    this.nativeModule = StableDiffusionLocal;
    this.isAndroid = Platform.OS === 'android';
    this.eventEmitter = null;
    this.progressSubscription = null;
    this.moduleInfo = this._getModuleInfo();
    this.downloadInProgress = false;
    this.downloadCancelled = false;
    this.customServerUrl = null;
    
    console.log('╔════════════════════════════════════════╗');
    console.log('║  StableDiffusionLocalService v4.1      ║');
    console.log('╚════════════════════════════════════════╝');
    console.log('📱 Platform:', Platform.OS, Platform.Version);
    console.log('📱 Module natif:', this.moduleInfo.status);
    
    if (this.moduleInfo.isLoaded) {
      console.log('📱 Module version:', this.moduleInfo.version);
      console.log('📱 ONNX disponible:', this.moduleInfo.onnxAvailable);
      this._setupEventListener();
    }
    console.log('📦 Source modèles:', MODEL_SOURCES[CURRENT_SOURCE].name);
    console.log('==========================================');
    
    // Charger les paramètres personnalisés
    this._loadCustomSettings();
  }

  /**
   * Charge les paramètres personnalisés
   */
  async _loadCustomSettings() {
    try {
      const customServer = await AsyncStorage.getItem(CUSTOM_SERVER_KEY);
      if (customServer) {
        this.customServerUrl = customServer;
        console.log('📡 Serveur personnalisé:', customServer);
      }
    } catch (e) {
      console.warn('⚠️ Erreur chargement paramètres:', e.message);
    }
  }

  /**
   * Définit un serveur personnalisé pour les modèles
   */
  async setCustomServer(serverUrl) {
    try {
      if (serverUrl) {
        // Valider l'URL
        const cleanUrl = serverUrl.endsWith('/') ? serverUrl : serverUrl + '/';
        await AsyncStorage.setItem(CUSTOM_SERVER_KEY, cleanUrl);
        this.customServerUrl = cleanUrl;
        console.log('✅ Serveur personnalisé configuré:', cleanUrl);
        return { success: true, url: cleanUrl };
      } else {
        await AsyncStorage.removeItem(CUSTOM_SERVER_KEY);
        this.customServerUrl = null;
        console.log('✅ Serveur personnalisé supprimé');
        return { success: true, url: null };
      }
    } catch (e) {
      console.error('❌ Erreur configuration serveur:', e);
      return { success: false, error: e.message };
    }
  }

  /**
   * Change la source des modèles
   */
  setModelSource(sourceName) {
    if (MODEL_SOURCES[sourceName]) {
      updateModelsFromSource(sourceName);
      console.log('📦 Source changée:', MODEL_SOURCES[sourceName].name);
      return true;
    }
    return false;
  }

  /**
   * Retourne les sources disponibles
   */
  getAvailableSources() {
    return Object.entries(MODEL_SOURCES).map(([key, source]) => ({
      id: key,
      name: source.name,
      totalSizeMB: Object.values(source.models).reduce((sum, m) => sum + m.sizeMB, 0),
    }));
  }

  /**
   * Configure l'écouteur d'événements de progression
   */
  _setupEventListener() {
    if (this.nativeModule && this.isAndroid) {
      try {
        this.eventEmitter = new NativeEventEmitter(this.nativeModule);
      } catch (e) {
        console.warn('⚠️ Impossible de créer NativeEventEmitter:', e.message);
      }
    }
  }

  /**
   * S'abonner aux événements de progression
   */
  subscribeToProgress(callback) {
    if (this.eventEmitter) {
      this.progressSubscription = this.eventEmitter.addListener('SDProgress', callback);
      return () => {
        if (this.progressSubscription) {
          this.progressSubscription.remove();
          this.progressSubscription = null;
        }
      };
    }
    return () => {};
  }

  /**
   * Analyse le module natif et retourne ses informations
   */
  _getModuleInfo() {
    if (!this.isAndroid) {
      return {
        isLoaded: false,
        status: '❌ iOS non supporté',
        version: null,
        onnxAvailable: false,
      };
    }

    if (!this.nativeModule) {
      return {
        isLoaded: false,
        status: '❌ Module natif non trouvé',
        version: null,
        onnxAvailable: false,
      };
    }

    try {
      const constants = this.nativeModule.getConstants 
        ? this.nativeModule.getConstants() 
        : this.nativeModule;
      
      const onnxError = constants?.ONNX_ERROR || '';
      const onnxAvailable = constants?.ONNX_AVAILABLE || false;
      
      let status = '✅ Module natif chargé';
      if (!onnxAvailable && onnxError) {
        status = `⚠️ Module chargé, ONNX indisponible: ${onnxError}`;
      } else if (!onnxAvailable) {
        status = '⚠️ Module chargé, ONNX non détecté';
      }
      
      return {
        isLoaded: true,
        status: status,
        version: constants?.VERSION || 'unknown',
        onnxAvailable: onnxAvailable,
        onnxError: onnxError,
        pipelineReady: constants?.PIPELINE_READY || false,
        deviceModel: constants?.DEVICE_MODEL || 'unknown',
        manufacturer: constants?.MANUFACTURER || 'unknown',
        cpuAbi: constants?.CPU_ABI || 'unknown',
        constants: constants,
      };
    } catch (e) {
      return {
        isLoaded: true,
        status: '⚠️ Module chargé (constantes inaccessibles)',
        version: 'unknown',
        onnxAvailable: false,
        error: e.message,
      };
    }
  }

  /**
   * Retourne le chemin du dossier des modèles
   */
  getModelDirectory() {
    return `${FileSystem.documentDirectory}sd_models/`;
  }

  /**
   * Vérifie si un modèle spécifique existe
   */
  async checkModelFile(modelName) {
    try {
      const modelPath = `${this.getModelDirectory()}${modelName}`;
      const fileInfo = await FileSystem.getInfoAsync(modelPath);
      return {
        exists: fileInfo.exists,
        size: fileInfo.size || 0,
        sizeMB: (fileInfo.size || 0) / 1024 / 1024,
        path: modelPath,
      };
    } catch (error) {
      return { exists: false, size: 0, sizeMB: 0, path: null };
    }
  }

  /**
   * Vérifie si tous les modèles sont téléchargés
   */
  async checkAllModels() {
    const results = {};
    let totalSize = 0;
    let allPresent = true;
    let missingModels = [];

    for (const [key, model] of Object.entries(MODELS)) {
      const check = await this.checkModelFile(model.name);
      results[key] = {
        ...check,
        expectedMB: model.sizeMB,
        complete: check.exists && check.sizeMB >= model.sizeMB * 0.9,
      };
      totalSize += check.size;
      if (!results[key].complete) {
        allPresent = false;
        missingModels.push(model.name);
      }
    }

    return {
      models: results,
      allPresent,
      missingModels,
      totalSizeMB: totalSize / 1024 / 1024,
      expectedSizeMB: getTotalModelSize(),
      source: MODEL_SOURCES[CURRENT_SOURCE].name,
    };
  }

  /**
   * Vérifie la disponibilité complète du service
   */
  async checkAvailability() {
    console.log('🔍 Vérification disponibilité SD Local...');
    
    const modelsCheck = await this.checkAllModels();
    console.log('📁 Models check:', modelsCheck.allPresent ? 'Tous présents' : `Manquants: ${modelsCheck.missingModels.join(', ')}`);
    
    const baseResponse = {
      platform: Platform.OS,
      modelDownloaded: modelsCheck.allPresent,
      modelSizeMB: modelsCheck.totalSizeMB,
      expectedSizeMB: modelsCheck.expectedSizeMB,
      modelsDetail: modelsCheck.models,
      missingModels: modelsCheck.missingModels,
      modelSource: modelsCheck.source,
      customServer: this.customServerUrl,
    };
    
    if (!this.isAndroid) {
      return {
        ...baseResponse,
        available: false,
        moduleLoaded: false,
        onnxAvailable: false,
        pipelineReady: false,
        canRunSD: false,
        reason: 'SD Local disponible uniquement sur Android',
      };
    }
    
    if (!this.moduleInfo.isLoaded) {
      return {
        ...baseResponse,
        available: false,
        moduleLoaded: false,
        onnxAvailable: false,
        pipelineReady: false,
        canRunSD: false,
        reason: this.moduleInfo.status,
      };
    }

    try {
      console.log('📡 Appel module natif...');
      
      const [modelStatus, systemInfo] = await Promise.all([
        this.nativeModule.isModelAvailable(),
        this.nativeModule.getSystemInfo(),
      ]);
      
      console.log('📱 Native modelStatus:', JSON.stringify(modelStatus));
      console.log('📱 Native systemInfo:', JSON.stringify(systemInfo));
      
      return {
        ...baseResponse,
        available: true,
        moduleLoaded: true,
        moduleVersion: modelStatus?.moduleVersion || this.moduleInfo.version,
        onnxAvailable: modelStatus?.onnxAvailable || systemInfo?.onnxAvailable || false,
        modelDownloaded: modelStatus?.modelDownloaded || modelsCheck.allPresent,
        pipelineReady: modelStatus?.pipelineReady || false,
        
        textEncoderReady: modelStatus?.textEncoderDownloaded || false,
        unetReady: modelStatus?.unetDownloaded || false,
        vaeDecoderReady: modelStatus?.vaeDecoderDownloaded || false,
        
        // RAM système réelle (pas JVM)
        ramMB: systemInfo?.totalRamMB || systemInfo?.maxMemoryMB || 0,
        freeRamMB: systemInfo?.availableRamMB || systemInfo?.freeMemoryMB || 0,
        totalSystemRamMB: systemInfo?.totalRamMB || 0,
        availableSystemRamMB: systemInfo?.availableRamMB || 0,
        freeStorageMB: systemInfo?.freeStorageMB || 0,
        processors: systemInfo?.availableProcessors || 0,
        hasEnoughRAM: systemInfo?.hasEnoughRAM || false,
        hasEnoughStorage: systemInfo?.hasEnoughStorage || false,
        canRunSD: systemInfo?.canRunSD || false,
        deviceModel: systemInfo?.deviceModel || 'Unknown',
        manufacturer: systemInfo?.manufacturer || 'Unknown',
        androidVersion: systemInfo?.androidVersion || 'Unknown',
        
        reason: this._buildStatusMessage(modelStatus, systemInfo, modelsCheck),
      };
      
    } catch (error) {
      console.error('❌ Erreur communication module natif:', error);
      
      return {
        ...baseResponse,
        available: true,
        moduleLoaded: true,
        onnxAvailable: this.moduleInfo.onnxAvailable,
        pipelineReady: false,
        canRunSD: false,
        error: error.message,
        reason: `Erreur module: ${error.message}`,
      };
    }
  }

  /**
   * Construit un message de statut clair
   */
  _buildStatusMessage(modelStatus, systemInfo, modelsCheck) {
    // Vérifier ONNX en premier - c'est le plus important
    if (!modelStatus?.onnxAvailable && !this.moduleInfo.onnxAvailable) {
      const onnxError = this.moduleInfo.onnxError || modelStatus?.onnxError || '';
      if (onnxError) {
        return `❌ ONNX indisponible: ${onnxError}. Utilisez Freebox/API externe.`;
      }
      return '❌ ONNX Runtime non disponible sur cet appareil. Utilisez Freebox/API externe.';
    }
    
    if (!modelsCheck.allPresent) {
      return `📥 Modèles manquants: ${modelsCheck.missingModels.join(', ')}`;
    }
    
    // Utiliser la RAM système réelle (totalRamMB) au lieu de maxMemoryMB
    const totalRamGB = ((systemInfo?.totalRamMB || systemInfo?.maxMemoryMB || 0) / 1024).toFixed(1);
    const availableRamGB = ((systemInfo?.availableRamMB || systemInfo?.freeMemoryMB || 0) / 1024).toFixed(1);
    
    // Si RAM détectée à 0, c'est un problème de détection
    if (parseFloat(totalRamGB) < 0.5) {
      return '⚠️ Impossible de détecter la RAM. Le module peut ne pas fonctionner correctement.';
    }
    
    if (!systemInfo?.hasEnoughRAM) {
      return `⚠️ RAM insuffisante (${totalRamGB} GB total, ${availableRamGB} GB dispo - besoin 4+ GB)`;
    }
    
    if (!systemInfo?.hasEnoughStorage) {
      const storageGB = ((systemInfo?.freeStorageMB || 0) / 1024).toFixed(1);
      return `⚠️ Stockage insuffisant (${storageGB} GB libre, besoin 3+ GB)`;
    }
    
    if (modelStatus?.pipelineReady) {
      return `✅ Pipeline prêt! RAM: ${totalRamGB} GB (${availableRamGB} GB dispo)`;
    }
    
    return `✅ Modèles OK. RAM: ${totalRamGB} GB. Initialisez le pipeline.`;
  }

  /**
   * Vérifie si une URL est accessible
   */
  async _checkUrlAccessible(url) {
    try {
      const response = await fetch(url, { method: 'HEAD', timeout: 10000 });
      return response.ok;
    } catch (e) {
      console.warn(`⚠️ URL inaccessible: ${url} - ${e.message}`);
      return false;
    }
  }

  /**
   * Trouve la meilleure source disponible
   */
  async findBestSource() {
    console.log('🔍 Recherche meilleure source de modèles...');
    
    // D'abord vérifier le serveur personnalisé
    if (this.customServerUrl) {
      const testUrl = `${this.customServerUrl}text_encoder.onnx`;
      if (await this._checkUrlAccessible(testUrl)) {
        console.log('✅ Serveur personnalisé accessible');
        return { type: 'custom', url: this.customServerUrl };
      }
      console.log('⚠️ Serveur personnalisé inaccessible');
    }
    
    // Tester chaque source
    for (const [key, source] of Object.entries(MODEL_SOURCES)) {
      const testUrl = source.baseUrl + Object.values(source.models)[0].path;
      console.log(`🔍 Test ${source.name}...`);
      
      if (await this._checkUrlAccessible(testUrl)) {
        console.log(`✅ Source disponible: ${source.name}`);
        updateModelsFromSource(key);
        return { type: 'builtin', source: key, name: source.name };
      }
    }
    
    console.error('❌ Aucune source de modèles accessible');
    return null;
  }

  /**
   * Télécharge un modèle spécifique avec retry et validation
   */
  async downloadModel(modelKey, onProgress = null) {
    const model = MODELS[modelKey];
    if (!model) {
      throw new Error(`Modèle inconnu: ${modelKey}`);
    }

    console.log(`📥 Téléchargement ${model.name}...`);
    console.log(`📡 URL: ${model.url}`);
    
    // Créer le dossier si nécessaire
    const modelDir = this.getModelDirectory();
    const dirInfo = await FileSystem.getInfoAsync(modelDir);
    if (!dirInfo.exists) {
      await FileSystem.makeDirectoryAsync(modelDir, { intermediates: true });
    }
    
    const modelPath = `${modelDir}${model.name}`;
    
    // Vérifier si déjà téléchargé et complet
    const existingFile = await FileSystem.getInfoAsync(modelPath);
    if (existingFile.exists) {
      const existingSizeMB = (existingFile.size || 0) / 1024 / 1024;
      if (existingSizeMB >= model.sizeMB * 0.9) {
        console.log(`✅ ${model.name} déjà téléchargé (${existingSizeMB.toFixed(0)} MB)`);
        if (onProgress) onProgress(100, 'Déjà téléchargé');
        return { success: true, alreadyExists: true, sizeMB: existingSizeMB };
      } else {
        // Fichier incomplet, supprimer
        console.log(`⚠️ ${model.name} incomplet (${existingSizeMB.toFixed(0)}/${model.sizeMB} MB), suppression...`);
        await FileSystem.deleteAsync(modelPath, { idempotent: true });
      }
    }
    
    // Construire l'URL (serveur personnalisé ou source)
    const downloadUrl = this.customServerUrl 
      ? `${this.customServerUrl}${model.name}` 
      : model.url;
    
    console.log(`📡 Téléchargement depuis: ${downloadUrl}`);
    
    // Vérifier l'accessibilité de l'URL
    const urlAccessible = await this._checkUrlAccessible(downloadUrl);
    if (!urlAccessible) {
      throw new Error(`URL inaccessible: ${downloadUrl}`);
    }
    
    // Télécharger avec suivi de progression
    if (onProgress) onProgress(0, 'Connexion...');
    
    const downloadResumable = FileSystem.createDownloadResumable(
      downloadUrl,
      modelPath,
      {
        headers: {
          'User-Agent': 'BoysAndGirls/4.1',
        },
      },
      (progress) => {
        if (this.downloadCancelled) {
          return;
        }
        if (progress.totalBytesExpectedToWrite > 0) {
          const pct = (progress.totalBytesWritten / progress.totalBytesExpectedToWrite) * 100;
          const dlMB = progress.totalBytesWritten / 1024 / 1024;
          const totalMB = progress.totalBytesExpectedToWrite / 1024 / 1024;
          if (onProgress) {
            onProgress(pct, `${dlMB.toFixed(0)}/${totalMB.toFixed(0)} MB`);
          }
        }
      }
    );
    
    try {
      const result = await downloadResumable.downloadAsync();
      
      if (this.downloadCancelled) {
        await FileSystem.deleteAsync(modelPath, { idempotent: true });
        throw new Error('Téléchargement annulé');
      }
      
      if (result?.uri) {
        // Vérifier la taille du fichier téléchargé
        const finalFile = await FileSystem.getInfoAsync(modelPath);
        const finalSizeMB = (finalFile.size || 0) / 1024 / 1024;
        
        if (finalSizeMB < model.sizeMB * 0.5) {
          // Fichier trop petit, probablement corrompu
          await FileSystem.deleteAsync(modelPath, { idempotent: true });
          throw new Error(`Fichier téléchargé trop petit (${finalSizeMB.toFixed(0)} MB au lieu de ${model.sizeMB} MB)`);
        }
        
        console.log(`✅ ${model.name} téléchargé (${finalSizeMB.toFixed(0)} MB)`);
        return { success: true, path: result.uri, sizeMB: finalSizeMB };
      }
      
      throw new Error(`Échec du téléchargement de ${model.name}`);
    } catch (error) {
      // Nettoyer le fichier partiel
      await FileSystem.deleteAsync(modelPath, { idempotent: true });
      throw error;
    }
  }

  /**
   * Télécharge tous les modèles avec meilleure gestion
   */
  async downloadAllModels(onProgress = null) {
    if (this.downloadInProgress) {
      throw new Error('Téléchargement déjà en cours');
    }
    
    this.downloadInProgress = true;
    this.downloadCancelled = false;
    
    try {
      // Trouver la meilleure source
      if (onProgress) onProgress(0, 'Recherche serveur...');
      
      const bestSource = await this.findBestSource();
      if (!bestSource) {
        throw new Error('Aucun serveur de modèles accessible. Vérifiez votre connexion internet.');
      }
      
      if (onProgress) {
        onProgress(5, `Source: ${bestSource.name || bestSource.url || 'Serveur personnalisé'}`);
      }
      
      const modelKeys = Object.keys(MODELS);
      const totalModels = modelKeys.length;
      
      for (let i = 0; i < totalModels; i++) {
        if (this.downloadCancelled) {
          throw new Error('Téléchargement annulé par l\'utilisateur');
        }
        
        const key = modelKeys[i];
        const model = MODELS[key];
        
        const baseProgress = 5 + ((i / totalModels) * 90);
        
        if (onProgress) {
          onProgress(baseProgress, `${model.name} (${i + 1}/${totalModels})`);
        }
        
        await this.downloadModel(key, (pct, msg) => {
          if (onProgress) {
            const modelProgress = (pct / 100) * (90 / totalModels);
            onProgress(baseProgress + modelProgress, `${model.name}: ${msg}`);
          }
        });
      }
      
      if (onProgress) onProgress(100, '✅ Tous les modèles téléchargés!');
      return { success: true, source: bestSource };
      
    } finally {
      this.downloadInProgress = false;
    }
  }

  /**
   * Annule le téléchargement en cours
   */
  cancelDownload() {
    if (this.downloadInProgress) {
      this.downloadCancelled = true;
      console.log('🛑 Annulation du téléchargement...');
    }
  }

  /**
   * Initialise le pipeline de génération avec vérification
   */
  async initializePipeline(onProgress = null) {
    if (!this.moduleInfo.isLoaded) {
      throw new Error('Module natif non disponible');
    }
    
    // Vérifier que tous les modèles sont présents
    const modelsCheck = await this.checkAllModels();
    if (!modelsCheck.allPresent) {
      throw new Error(`Modèles manquants: ${modelsCheck.missingModels.join(', ')}`);
    }
    
    console.log('🚀 Initialisation du pipeline SD...');
    if (onProgress) onProgress(0, 'Chargement des modèles...');
    
    try {
      const result = await this.nativeModule.initializeModel();
      
      if (result?.success) {
        console.log('✅ Pipeline initialisé avec succès');
        if (onProgress) onProgress(100, 'Pipeline prêt!');
        return { success: true, ...result };
      } else {
        throw new Error(result?.error || 'Échec de l\'initialisation');
      }
    } catch (error) {
      console.error('❌ Erreur initialisation pipeline:', error);
      throw error;
    }
  }

  /**
   * Génère une image
   */
  async generateImage(prompt, options = {}) {
    if (!this.moduleInfo.isLoaded) {
      console.log('⚠️ Module non disponible - Fallback Freebox');
      return null;
    }

    const {
      negativePrompt = 'bad anatomy, deformed, ugly, blurry, low quality',
      steps = 20,
      guidanceScale = 7.5,
      seed = -1,
    } = options;

    console.log('🎨 Génération SD Local:', prompt.substring(0, 100) + '...');
    
    try {
      const result = await this.nativeModule.generateImage(
        prompt,
        negativePrompt,
        steps,
        guidanceScale,
        seed
      );
      
      if (result?.success && result?.imageBase64) {
        console.log('✅ Image générée avec succès');
        return {
          success: true,
          imageUrl: result.imageBase64,
          imagePath: result.imagePath,
          seed: result.seed,
          steps: result.steps,
        };
      }
      
      console.warn('⚠️ Génération échouée:', result?.error);
      return null;
    } catch (error) {
      console.error('❌ Erreur génération:', error);
      return null;
    }
  }

  /**
   * Libère les ressources du pipeline
   */
  async releasePipeline() {
    if (this.moduleInfo.isLoaded) {
      console.log('🔄 Libération du pipeline...');
      return await this.nativeModule.releaseModel();
    }
  }

  /**
   * Annule la génération en cours
   */
  async cancelGeneration() {
    if (this.moduleInfo.isLoaded) {
      console.log('🛑 Annulation de la génération...');
      return await this.nativeModule.cancelGeneration();
    }
  }

  /**
   * Retourne les infos système
   */
  async getSystemInfo() {
    if (!this.moduleInfo.isLoaded) {
      return { moduleLoaded: false, canRunSD: false };
    }
    
    try {
      return await this.nativeModule.getSystemInfo();
    } catch (error) {
      console.error('❌ Erreur getSystemInfo:', error);
      return { moduleLoaded: true, canRunSD: false, error: error.message };
    }
  }
  
  /**
   * Test simple du module natif - pour debug AMÉLIORÉ
   */
  async testModule() {
    console.log('╔════════════════════════════════════════╗');
    console.log('║  🧪 TEST MODULE NATIF SD               ║');
    console.log('╚════════════════════════════════════════╝');
    console.log('🔍 Platform:', Platform.OS, Platform.Version);
    console.log('🔍 NativeModules count:', Object.keys(NativeModules || {}).length);
    
    // Lister TOUS les modules natifs pour debug
    const allModules = Object.keys(NativeModules || {});
    console.log('🔍 Tous les modules:', allModules.join(', '));
    
    // Vérifier spécifiquement StableDiffusionLocal
    const sdModule = NativeModules?.StableDiffusionLocal;
    console.log('🔍 StableDiffusionLocal:', sdModule ? 'TROUVÉ' : 'NON TROUVÉ');
    
    if (sdModule) {
      console.log('🔍 Type:', typeof sdModule);
      console.log('🔍 Méthodes:', Object.keys(sdModule).join(', '));
      console.log('🔍 Constantes:', JSON.stringify(sdModule.getConstants ? sdModule.getConstants() : 'N/A'));
    }
    
    if (!sdModule && !this.nativeModule) {
      console.error('❌ Module natif non trouvé dans NativeModules!');
      return {
        success: false,
        error: 'Module natif StableDiffusionLocal non trouvé',
        moduleExists: false,
        platform: Platform.OS,
        platformVersion: Platform.Version,
        availableModules: allModules,
        hint: 'Le module natif n\'est pas enregistré. Vérifiez MainApplication.kt et le build.',
      };
    }
    
    // Utiliser le module trouvé
    const moduleToUse = sdModule || this.nativeModule;
    const methods = Object.keys(moduleToUse || {});
    console.log('🔍 Module à utiliser, méthodes:', methods.join(', '));
    
    // ESSAI 1: testModule natif
    if (typeof moduleToUse.testModule === 'function') {
      try {
        console.log('🔍 Appel testModule()...');
        const result = await moduleToUse.testModule();
        console.log('✅ testModule réussi:', JSON.stringify(result, null, 2));
        
        return {
          success: true,
          source: 'testModule',
          moduleVersion: result.moduleVersion || result.status || 'N/A',
          totalRamGB: result.totalRamGB || 0,
          availableRamGB: result.availableRamGB || 0,
          totalRamMB: result.totalRamMB || 0,
          availableRamMB: result.availableRamMB || 0,
          totalRamDisplay: result.totalRamDisplay || `${(result.totalRamGB || 0).toFixed(2)} GB`,
          availRamDisplay: result.availRamDisplay || `${(result.availableRamGB || 0).toFixed(2)} GB`,
          onnxAvailable: result.onnxAvailable || false,
          onnxStatus: result.onnxStatus || (result.onnxAvailable ? 'Disponible' : 'Non disponible'),
          device: result.device || 'N/A',
          manufacturer: result.manufacturer || 'N/A',
          androidVersion: result.androidVersion || 'N/A',
          rawData: result,
        };
      } catch (e) {
        console.error('❌ Erreur testModule:', e.message, e);
      }
    } else {
      console.log('⚠️ testModule n\'est pas une fonction');
    }
    
    // ESSAI 2: getSystemInfo
    if (typeof moduleToUse.getSystemInfo === 'function') {
      try {
        console.log('🔍 Appel getSystemInfo()...');
        const sysInfo = await moduleToUse.getSystemInfo();
        console.log('✅ getSystemInfo réussi:', JSON.stringify(sysInfo, null, 2));
        
        return {
          success: true,
          source: 'getSystemInfo',
          moduleVersion: sysInfo.moduleVersion || 'N/A',
          totalRamGB: sysInfo.totalRamGB || (sysInfo.totalRamMB || 0) / 1024,
          availableRamGB: sysInfo.availableRamGB || (sysInfo.availableRamMB || 0) / 1024,
          totalRamMB: sysInfo.totalRamMB || 0,
          availableRamMB: sysInfo.availableRamMB || 0,
          totalRamDisplay: sysInfo.debugTotalRam || `${((sysInfo.totalRamMB || 0) / 1024).toFixed(2)} GB`,
          availRamDisplay: sysInfo.debugAvailRam || `${((sysInfo.availableRamMB || 0) / 1024).toFixed(2)} GB`,
          onnxAvailable: sysInfo.onnxAvailable || false,
          onnxStatus: sysInfo.onnxAvailable ? 'Disponible' : 'Non disponible',
          device: sysInfo.deviceModel || 'N/A',
          manufacturer: sysInfo.manufacturer || 'N/A',
          androidVersion: sysInfo.androidVersion || 'N/A',
          canRunSD: sysInfo.canRunSD || false,
          rawData: sysInfo,
        };
      } catch (e) {
        console.error('❌ Erreur getSystemInfo:', e.message, e);
      }
    } else {
      console.log('⚠️ getSystemInfo n\'est pas une fonction');
    }
    
    // ESSAI 3: Constantes du module
    try {
      const constants = moduleToUse.getConstants ? moduleToUse.getConstants() : moduleToUse;
      console.log('🔍 Constantes:', JSON.stringify(constants));
      
      if (constants && (constants.VERSION || constants.MODULE_NAME)) {
        return {
          success: true,
          source: 'constants',
          moduleVersion: constants.VERSION || 'N/A',
          onnxAvailable: constants.ONNX_AVAILABLE || false,
          onnxStatus: constants.ONNX_AVAILABLE ? 'Disponible (constante)' : 'Non disponible (constante)',
          device: constants.DEVICE_MODEL || 'N/A',
          totalRamGB: 0,
          availableRamGB: 0,
          hint: 'Données provenant des constantes uniquement',
          rawData: constants,
        };
      }
    } catch (e) {
      console.error('❌ Erreur lecture constantes:', e.message);
    }
    
    return {
      success: false,
      error: 'Impossible d\'obtenir les informations du module',
      moduleExists: true,
      methodsAvailable: methods,
      hint: 'Les méthodes existent mais ne répondent pas correctement',
    };
  }

  /**
   * Supprime tous les modèles téléchargés
   */
  async deleteModels() {
    try {
      const modelDir = this.getModelDirectory();
      const dirInfo = await FileSystem.getInfoAsync(modelDir);
      
      if (dirInfo.exists) {
        await FileSystem.deleteAsync(modelDir, { idempotent: true });
        console.log('✅ Modèles supprimés');
        return { success: true };
      }
      return { success: true, message: 'Aucun modèle à supprimer' };
    } catch (error) {
      console.error('❌ Erreur suppression:', error);
      throw error;
    }
  }

  /**
   * Retourne la liste des modèles requis
   */
  getRequiredModels() {
    return MODELS;
  }

  /**
   * Retourne la taille totale estimée
   */
  getTotalModelSize() {
    return getTotalModelSize();
  }

  /**
   * Retourne les informations du service
   */
  getServiceInfo() {
    return {
      version: '4.1',
      platform: Platform.OS,
      moduleLoaded: this.moduleInfo.isLoaded,
      moduleVersion: this.moduleInfo.version,
      onnxAvailable: this.moduleInfo.onnxAvailable,
      currentSource: CURRENT_SOURCE,
      sourceName: MODEL_SOURCES[CURRENT_SOURCE]?.name,
      customServer: this.customServerUrl,
      availableSources: this.getAvailableSources(),
      totalModelSizeMB: getTotalModelSize(),
    };
  }
}

export default new StableDiffusionLocalService();
