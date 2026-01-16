import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Image,
  Alert,
  Modal,
  ScrollView,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import GroqService from '../services/GroqService';
import TextGenerationService from '../services/TextGenerationService';
import StorageService from '../services/StorageService';
import ImageGenerationService from '../services/ImageGenerationService';
import UserProfileService from '../services/UserProfileService';
import GalleryService from '../services/GalleryService';
import ChatStyleService from '../services/ChatStyleService';
import LevelService from '../services/LevelService';
import AuthService from '../services/AuthService';
import ColorPicker from '../components/ColorPicker';

export default function ConversationScreen({ route, navigation }) {
  const { character } = route.params || {};
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [relationship, setRelationship] = useState(null);
  const [generatingImage, setGeneratingImage] = useState(false);
  const [userProfile, setUserProfile] = useState(null);
  const [gallery, setGallery] = useState([]);
  const [conversationBackground, setConversationBackground] = useState(null);
  const [initError, setInitError] = useState(null);
  const [isInitialized, setIsInitialized] = useState(false);
  
  // Système de niveaux
  const [userLevel, setUserLevel] = useState(null);
  const [showLevelUp, setShowLevelUp] = useState(false);
  const [levelUpInfo, setLevelUpInfo] = useState(null);
  
  // Style settings
  const [showSettings, setShowSettings] = useState(false);
  const [chatStyle, setChatStyle] = useState(null);
  const [selectedTheme, setSelectedTheme] = useState('default');
  const [opacity, setOpacity] = useState(1);
  const [borderRadius, setBorderRadius] = useState(15);
  const [backgroundBlur, setBackgroundBlur] = useState(0); // 0-100%
  
  // Color picker states
  const [colorPickerVisible, setColorPickerVisible] = useState(false);
  const [colorPickerTarget, setColorPickerTarget] = useState(null);
  const [colorPickerTitle, setColorPickerTitle] = useState('');
  
  // Premium status
  const [isPremium, setIsPremium] = useState(false);
  
  // Contrôle du scroll
  const [userIsScrolling, setUserIsScrolling] = useState(false);
  
  const flatListRef = useRef(null);

  // Vérification de sécurité
  useEffect(() => {
    if (!character || !character.id) {
      console.error('❌ Character invalide:', character);
      setInitError('Personnage invalide ou incomplet');
      Alert.alert(
        'Erreur',
        'Impossible de charger la conversation. Le personnage est invalide.',
        [{ text: 'Retour', onPress: () => navigation.goBack() }]
      );
      return;
    }
    
    console.log('✅ Initialisation conversation pour:', character.name, 'ID:', character.id);
    initializeScreen();
  }, [character]);

  const initializeScreen = async () => {
    try {
      // Charger tout en parallèle
      await Promise.all([
        loadConversation(),
        loadUserProfile(),
        loadGallery(),
        loadBackground(),
        loadChatStyle(),
        loadUserLevel(),
        checkPremiumStatus(),
      ]);
      
      setIsInitialized(true);
      
      navigation.setOptions({
        title: character?.name || 'Conversation',
        headerRight: () => (
          <View style={{ flexDirection: 'row', marginRight: 10 }}>
            <TouchableOpacity onPress={() => setShowSettings(true)} style={{ marginRight: 15 }}>
              <Text style={{ color: '#fff', fontSize: 20 }}>⚙️</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => navigation.navigate('CharacterDetail', { character })}>
              <Text style={{ color: '#fff', fontSize: 20 }}>ℹ️</Text>
            </TouchableOpacity>
          </View>
        ),
      });
    } catch (error) {
      console.error('❌ Erreur initialisation conversation:', error);
      setInitError(error.message);
      Alert.alert(
        'Erreur',
        `Impossible d'initialiser la conversation: ${error.message}`,
        [{ text: 'Retour', onPress: () => navigation.goBack() }]
      );
    }
  };

  const loadChatStyle = async () => {
    try {
      const style = await ChatStyleService.loadStyle();
      setChatStyle(style);
      setSelectedTheme(ChatStyleService.getCurrentTheme());
      setOpacity(style.bubbleOpacity || 1);
      setBorderRadius(style.borderRadius || 15);
      setBackgroundBlur(style.backgroundBlur || 0);
    } catch (error) {
      console.error('❌ Erreur chargement style:', error);
      setChatStyle(ChatStyleService.getCurrentStyle());
    }
  };

  const loadUserLevel = async () => {
    try {
      // Charger le niveau spécifique pour ce personnage
      if (character?.id) {
        const levelData = await LevelService.getCharacterStats(character.id);
        setUserLevel(levelData);
        console.log('✅ Niveau avec', character.name, ':', levelData.level, levelData.title);
      } else {
        // Fallback sur les stats globales
        const levelData = await LevelService.getFullStats();
        setUserLevel(levelData);
        console.log('✅ Niveau global:', levelData.level, levelData.title);
      }
    } catch (error) {
      console.error('❌ Erreur chargement niveau:', error);
    }
  };

  const checkPremiumStatus = async () => {
    try {
      // Vérifier si admin (toujours premium)
      const user = AuthService.getCurrentUser();
      const isAdmin = user?.is_admin || user?.email?.toLowerCase() === 'douvdouv21@gmail.com';
      
      if (isAdmin) {
        console.log('👑 Admin détecté - Premium automatique');
        setIsPremium(true);
        return;
      }
      
      // Vérifier localement d'abord
      const localPremium = AuthService.isPremium();
      setIsPremium(localPremium);
      
      // Puis vérifier côté serveur
      const serverPremium = await AuthService.checkPremiumStatus();
      setIsPremium(serverPremium);
      console.log('💎 Status Premium:', serverPremium ? 'Oui' : 'Non');
    } catch (error) {
      console.error('❌ Erreur vérification premium:', error);
      // Fallback: vérifier si admin
      const user = AuthService.getCurrentUser();
      const isAdmin = user?.is_admin || user?.email?.toLowerCase() === 'douvdouv21@gmail.com';
      setIsPremium(isAdmin || AuthService.isPremium());
    }
  };

  const loadUserProfile = async () => {
    try {
      const profile = await UserProfileService.getProfile();
      setUserProfile(profile);
      console.log('✅ Profil utilisateur chargé:', JSON.stringify({
        username: profile?.username,
        nsfwMode: profile?.nsfwMode,
        isAdult: profile?.isAdult,
        age: profile?.age,
        gender: profile?.gender
      }));
      
      // Vérification NSFW détaillée
      if (profile) {
        const nsfwEnabled = profile.nsfwMode === true || profile.nsfwMode === 'true';
        const isAdultUser = profile.isAdult === true || profile.isAdult === 'true' || (parseInt(profile.age) >= 18);
        console.log(`🔞 NSFW Check: nsfwMode=${nsfwEnabled}, isAdult=${isAdultUser}, result=${nsfwEnabled && isAdultUser}`);
      }
    } catch (error) {
      console.error('❌ Erreur chargement profil:', error);
    }
  };

  const loadGallery = async () => {
    try {
      if (!character || !character.id) return;
      const characterGallery = await GalleryService.getGallery(character.id);
      setGallery(characterGallery || []);
      console.log(`✅ Galerie chargée: ${characterGallery?.length || 0} images`);
    } catch (error) {
      console.error('❌ Erreur chargement galerie:', error);
      setGallery([]);
    }
  };

  const loadBackground = async () => {
    try {
      if (!character || !character.id) return;
      const bg = await GalleryService.getConversationBackground(character.id);
      setConversationBackground(bg);
      if (bg) console.log('✅ Background chargé');
    } catch (error) {
      console.error('❌ Erreur chargement background:', error);
    }
  };

  // Recharger le fond et scroll en bas quand l'écran reprend le focus
  useFocusEffect(
    useCallback(() => {
      if (character?.id) {
        loadBackground();
        
        // Scroll automatique en bas quand on revient sur la conversation
        // Utiliser scrollToOffset avec une grande valeur pour forcer le scroll en bas
        const scrollToBottom = () => {
          if (flatListRef.current && messages.length > 0) {
            try {
              // Méthode 1: scrollToOffset avec une très grande valeur
              flatListRef.current.scrollToOffset({ 
                offset: 999999, // Grande valeur pour aller tout en bas
                animated: false 
              });
              console.log('📜 Scroll offset max (focus) - ' + messages.length + ' messages');
            } catch (e) {
              console.log('📜 Erreur scroll:', e.message);
            }
          }
        };
        // Essayer plusieurs fois avec des délais progressifs plus longs
        setTimeout(scrollToBottom, 300);
        setTimeout(scrollToBottom, 700);
        setTimeout(scrollToBottom, 1200);
        setTimeout(scrollToBottom, 2000);
        setTimeout(scrollToBottom, 3000);
      }
    }, [character?.id, messages.length])
  );

  const loadConversation = async () => {
    try {
      if (!character || !character.id) {
        throw new Error('Character ID manquant');
      }
      
      const saved = await StorageService.loadConversation(character.id);
      if (saved && saved.messages && saved.messages.length > 0) {
        console.log(`✅ Conversation chargée: ${saved.messages.length} messages`);
        setMessages(saved.messages);
        setRelationship(saved.relationship);
        
        // SCROLL AUTOMATIQUE EN BAS après chargement
        // Utiliser scrollToOffset avec grande valeur pour forcer le scroll
        const scrollToBottom = () => {
          if (flatListRef.current && saved.messages.length > 0) {
            try {
              // scrollToOffset avec grande valeur = scroll tout en bas
              flatListRef.current.scrollToOffset({ 
                offset: 999999, 
                animated: false 
              });
              console.log('📜 Scroll offset max (load) - ' + saved.messages.length + ' messages');
            } catch (e) {
              console.log('📜 Erreur scroll:', e.message);
            }
          }
        };
        // Essayer plusieurs fois avec délais progressifs plus longs
        setTimeout(scrollToBottom, 300);
        setTimeout(scrollToBottom, 700);
        setTimeout(scrollToBottom, 1200);
        setTimeout(scrollToBottom, 2000);
        setTimeout(scrollToBottom, 3000);
        setTimeout(scrollToBottom, 4000);
        
      } else {
        const initialMessage = {
          role: 'assistant',
          content: character.startMessage || character.greeting || `Bonjour, je suis ${character.name}.`,
        };
        console.log('✅ Nouveau conversation initialisée');
        setMessages([initialMessage]);
        const rel = await StorageService.loadRelationship(character.id);
        setRelationship(rel);
      }
    } catch (error) {
      console.error('❌ Erreur chargement conversation:', error);
      setMessages([{
        role: 'assistant',
        content: character?.startMessage || `Bonjour, je suis ${character?.name || 'votre personnage'}.`
      }]);
    }
  };

  const saveConversation = async (newMessages, newRelationship) => {
    await StorageService.saveConversation(character.id, newMessages, newRelationship);
  };

  const updateRelationship = (userMessage) => {
    if (!relationship) return relationship;

    const changes = StorageService.calculateRelationshipChange(userMessage, character);
    
    const newRelationship = {
      experience: relationship.experience + changes.expGain,
      level: Math.floor((relationship.experience + changes.expGain) / 100) + 1,
      affection: Math.max(0, Math.min(100, relationship.affection + changes.affectionChange)),
      trust: Math.max(0, Math.min(100, relationship.trust + changes.trustChange)),
      interactions: relationship.interactions + 1,
    };

    return newRelationship;
  };

  const sendMessage = async () => {
    if (!inputText.trim() || isLoading) return;

    const userMessage = {
      role: 'user',
      content: inputText.trim(),
    };

    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
    setInputText('');
    setIsLoading(true);

    try {
      const newRelationship = updateRelationship(userMessage.content);
      setRelationship(newRelationship);

      const response = await TextGenerationService.generateResponse(
        updatedMessages,
        character,
        userProfile
      );

      const assistantMessage = {
        role: 'assistant',
        content: response,
      };

      const finalMessages = [...updatedMessages, assistantMessage];
      setMessages(finalMessages);
      
      await saveConversation(finalMessages, newRelationship);

      // Gagner de l'XP pour le message envoyé (par personnage)
      try {
        const isNSFW = userProfile?.nsfwMode || false;
        const xpGained = LevelService.calculateMessageXP(userMessage.content.length, isNSFW);
        
        // Utiliser le système de niveau par personnage
        const xpResult = await LevelService.addXPForCharacter(character.id, xpGained, 'message');
        
        // Enregistrer l'interaction avec ce personnage (pour les stats globales)
        await LevelService.recordCharacterInteraction(character.id);
        
        // Mettre à jour l'état du niveau
        setUserLevel({
          ...userLevel,
          level: xpResult.level,
          title: xpResult.title,
          totalXP: xpResult.totalXP,
          progress: xpResult.progress,
        });
        
        // Si level up, afficher l'animation et générer l'image récompense
        if (xpResult.leveledUp) {
          setLevelUpInfo(xpResult);
          setShowLevelUp(true);
          
          // Générer l'image de récompense si disponible
          if (xpResult.reward && xpResult.reward.type === 'image') {
            generateLevelUpRewardImage(xpResult.reward, xpResult.newLevel);
          }
          
          setTimeout(() => setShowLevelUp(false), 5000);
        }
        
        console.log(`✅ +${xpGained} XP avec ${character.name} → Niveau ${xpResult.level} "${xpResult.title}" (${xpResult.progress}%)`);
      } catch (xpError) {
        console.error('❌ Erreur XP:', xpError);
      }

      // Scroll vers le bas seulement si l'utilisateur ne scroll pas manuellement
      if (!userIsScrolling) {
        setTimeout(() => {
          flatListRef.current?.scrollToEnd({ animated: true });
        }, 100);
      }
    } catch (error) {
      Alert.alert('Erreur', error.message);
      setMessages(messages);
    } finally {
      setIsLoading(false);
    }
  };

  // Génère l'image de récompense pour un level up (MÊME SANS PREMIUM)
  const generateLevelUpRewardImage = async (reward, newLevel) => {
    try {
      console.log(`🎁 Génération image récompense niveau ${newLevel}: ${reward.imageType}`);
      
      // Construire le prompt ULTRA-DÉTAILLÉ avec TOUTES les caractéristiques du personnage
      const rewardPromptPart = LevelService.getRewardImagePrompt(reward.imageType, character);
      
      // Utiliser les fonctions de ImageGenerationService pour les détails physiques
      const physicalDesc = ImageGenerationService.buildDetailedPhysicalDescription(character, true);
      const anatomyDesc = ImageGenerationService.buildAnatomyDescription(character, true);
      
      // Extraire les caractéristiques spécifiques du personnage
      const hairDesc = character.hairColor ? `${character.hairColor} hair` : '';
      const eyeDesc = character.eyeColor ? `${character.eyeColor} eyes` : '';
      const skinDesc = character.skinTone || '';
      const heightDesc = character.height || '';
      const bustDesc = character.bust ? `${character.bust} cup breasts` : '';
      
      // Prompt ULTRA-DÉTAILLÉ avec qualité maximale
      const fullPrompt = `masterpiece, best quality, hyper-realistic photograph, professional photography, 8K ultra HD resolution, 
        ${physicalDesc},
        ${anatomyDesc},
        ${hairDesc}, ${eyeDesc}, ${skinDesc},
        ${character.appearance || ''},
        ${character.physicalDescription || ''},
        ${rewardPromptPart},
        perfect human anatomy, anatomically correct perfect body,
        proper symmetrical face, exactly two arms attached to shoulders, exactly two legs,
        proper hands with exactly five fingers each, correct natural proportions,
        professional studio lighting, high-end boudoir photography,
        skin texture visible with pores, ultra-realistic skin details, lifelike photograph,
        single person in frame, solo portrait shot,
        sharp focus, bokeh background, cinematic lighting,
        NEGATIVE: deformed, distorted, extra limbs, missing limbs, bad anatomy, mutated, 
        extra fingers, fused fingers, bad hands, wrong proportions, ugly, blurry, watermark`;
      
      console.log(`📸 Prompt récompense niveau ${newLevel} généré avec détails complets du personnage`);
      
      // Générer l'image via l'API (même sans premium pour les récompenses)
      const imageUrl = await ImageGenerationService.generateImage(fullPrompt);
      
      if (imageUrl) {
        // Sauvegarder dans la galerie
        await GalleryService.saveImageToGallery(character.id, imageUrl);
        
        // Enregistrer comme image débloquée
        await LevelService.recordUnlockedImage(character.id, newLevel, imageUrl);
        
        // Recharger la galerie
        await loadGallery();
        
        // Afficher un message avec l'image
        Alert.alert(
          `🎉 Niveau ${newLevel} atteint !`,
          `${reward.description}\n\nUne image exclusive a été ajoutée à votre galerie avec ${character.name} !`,
          [{ text: '👀 Super !', style: 'default' }]
        );
        
        console.log(`✅ Image récompense générée et sauvegardée`);
      }
    } catch (error) {
      console.error('❌ Erreur génération image récompense:', error);
      // Ne pas bloquer l'expérience si l'image échoue
      Alert.alert(
        `🎉 Niveau ${newLevel} atteint !`,
        `${reward.description}\n\nVotre relation avec ${character.name} évolue !`,
        [{ text: 'Super !', style: 'default' }]
      );
    }
  };

  const generateImage = async () => {
    if (generatingImage) return;

    // Vérifier le statut premium
    if (!isPremium) {
      Alert.alert(
        '💎 Fonctionnalité Premium',
        'La génération d\'images est réservée aux membres Premium.\n\nDevenez Premium pour débloquer cette fonctionnalité et bien plus encore !',
        [
          { text: 'Plus tard', style: 'cancel' },
          { 
            text: 'Devenir Premium', 
            onPress: () => {
              // Navigation vers l'écran Premium si disponible
              try {
                navigation.navigate('Premium');
              } catch (e) {
                Alert.alert('Premium', 'Rendez-vous dans les paramètres pour devenir Premium.');
              }
            }
          }
        ]
      );
      return;
    }

    setGeneratingImage(true);
    try {
      // Niveau de relation pour adapter la tenue/pose
      const currentLevel = userLevel?.level || 1;
      
      // LOG IMPORTANT pour debug
      console.log('🖼️ ===== GÉNÉRATION IMAGE =====');
      console.log('🖼️ userLevel:', JSON.stringify(userLevel));
      console.log('🖼️ currentLevel utilisé:', currentLevel);
      console.log('🖼️ Personnage:', character?.name);
      
      // S'assurer que le niveau est au moins 2 pour avoir des images NSFW si progression
      // (si l'utilisateur a un niveau mais qu'il est à 0, on utilise au moins 1)
      const effectiveLevel = Math.max(1, currentLevel);
      console.log('🖼️ effectiveLevel final:', effectiveLevel);
      
      // Afficher le niveau utilisé pour debug
      const nsfwType = effectiveLevel >= 5 ? '🔥 NUE EXPLICITE' :
                       effectiveLevel >= 4 ? '👙 TOPLESS' :
                       effectiveLevel >= 3 ? '💋 LINGERIE' :
                       effectiveLevel >= 2 ? '😈 PROVOCANTE' : '✨ SFW';
      console.log(`🎨 Génération image: Niveau ${effectiveLevel} = ${nsfwType}`);
      
      const imageUrl = await ImageGenerationService.generateSceneImage(
        character,
        userProfile,
        messages,
        effectiveLevel  // Passe le niveau pour tenue appropriée
      );
      
      await GalleryService.saveImageToGallery(character.id, imageUrl);
      await loadGallery();
      
      const imageMessage = {
        role: 'system',
        content: '[Image générée et sauvegardée dans la galerie]',
        image: imageUrl,
      };

      const updatedMessages = [...messages, imageMessage];
      setMessages(updatedMessages);
      await saveConversation(updatedMessages, relationship);

      Alert.alert('Succès', 'Image générée et ajoutée à la galerie !');

      // Scroll vers le bas seulement si l'utilisateur ne scroll pas manuellement
      if (!userIsScrolling) {
        setTimeout(() => {
          flatListRef.current?.scrollToEnd({ animated: true });
        }, 100);
      }
    } catch (error) {
      // Vérifier si c'est une erreur de premium
      if (error.message?.includes('Premium') || error.message?.includes('403')) {
        Alert.alert(
          '💎 Premium Requis',
          'Vous devez être membre Premium pour générer des images.',
          [
            { text: 'OK', style: 'cancel' },
            { text: 'Devenir Premium', onPress: () => navigation.navigate('Premium') }
          ]
        );
      } else {
        Alert.alert('Erreur', error.message || 'Impossible de générer l\'image');
      }
    } finally {
      setGeneratingImage(false);
    }
  };

  // Fonctions de personnalisation du style
  const handleThemeChange = async (themeId) => {
    setSelectedTheme(themeId);
    const newStyle = await ChatStyleService.applyTheme(themeId);
    setChatStyle(newStyle);
    setOpacity(newStyle.bubbleOpacity);
    setBorderRadius(newStyle.borderRadius);
  };

  const handleOpacityChange = async (value) => {
    setOpacity(value);
    const newStyle = await ChatStyleService.setOpacity(value);
    setChatStyle(newStyle);
  };

  const handleBorderRadiusChange = async (value) => {
    setBorderRadius(value);
    const newStyle = await ChatStyleService.setBorderRadius(value);
    setChatStyle(newStyle);
  };

  const handleBlurChange = async (value) => {
    setBackgroundBlur(value);
    await ChatStyleService.setBlur(value);
  };

  /**
   * Vérifie si un caractère est un astérisque (toutes variantes)
   */
  const isAsterisk = (char) => {
    return char === '*' || char === '\uFF0A' || char === '\u2217' || char === '\u204E' || char === '\u2731';
  };

  /**
   * Trouve le prochain astérisque dans le texte
   */
  const findNextAsterisk = (text, startIndex) => {
    for (let i = startIndex; i < text.length; i++) {
      if (isAsterisk(text[i])) {
        return i;
      }
    }
    return -1;
  };

  /**
   * Formatage du texte RP - Version robuste v6
   * Parse: *actions*, (pensées), "dialogues"
   * Gère les astérisques Unicode et les actions inline
   */
  const formatRPMessage = (content) => {
    if (!content || typeof content !== 'string') {
      return [{ type: 'text', text: content || '' }];
    }
    
    const result = [];
    let i = 0;
    const len = content.length;
    let currentText = '';
    
    while (i < len) {
      const char = content[i];
      
      // Détecter le début d'une action (astérisque)
      if (isAsterisk(char)) {
        // Sauvegarder le texte accumulé avant
        if (currentText) {
          result.push({ type: 'text', text: currentText });
          currentText = '';
        }
        
        // Chercher la fin de l'action (prochain astérisque)
        const actionEnd = findNextAsterisk(content, i + 1);
        
        if (actionEnd !== -1 && actionEnd > i + 1) {
          // Action trouvée
          const actionContent = content.substring(i + 1, actionEnd);
          result.push({ type: 'action', text: '*' + actionContent + '*' });
          i = actionEnd + 1;
        } else {
          // Pas de fermeture, traiter comme texte
          currentText += char;
          i++;
        }
        continue;
      }
      
      // Détecter le début d'une pensée (parenthèse)
      if (char === '(' || char === '\uFF08') {
        if (currentText) {
          result.push({ type: 'text', text: currentText });
          currentText = '';
        }
        
        const closeChar = char === '\uFF08' ? '\uFF09' : ')';
        let thoughtEnd = -1;
        for (let j = i + 1; j < len; j++) {
          if (content[j] === closeChar || content[j] === ')') {
            thoughtEnd = j;
            break;
          }
        }
        
        if (thoughtEnd !== -1 && thoughtEnd > i + 2) {
          const thoughtContent = content.substring(i, thoughtEnd + 1);
          result.push({ type: 'thought', text: thoughtContent });
          i = thoughtEnd + 1;
        } else {
          currentText += char;
          i++;
        }
        continue;
      }
      
      // Détecter le début d'un dialogue (guillemets)
      if (char === '"' || char === '\u00AB' || char === '\u201C' || char === '\uFF02') {
        if (currentText) {
          result.push({ type: 'text', text: currentText });
          currentText = '';
        }
        
        // Trouver le guillemet fermant correspondant
        let closeChars = ['"', '\u00BB', '\u201D', '\uFF02'];
        if (char === '\u00AB') closeChars = ['\u00BB'];
        
        let dialogueEnd = -1;
        for (let j = i + 1; j < len; j++) {
          if (closeChars.includes(content[j])) {
            dialogueEnd = j;
            break;
          }
        }
        
        if (dialogueEnd !== -1 && dialogueEnd > i + 1) {
          const dialogueContent = content.substring(i + 1, dialogueEnd);
          result.push({ type: 'dialogue', text: dialogueContent });
          i = dialogueEnd + 1;
        } else {
          currentText += char;
          i++;
        }
        continue;
      }
      
      // Caractère normal
      currentText += char;
      i++;
    }
    
    // Ajouter le texte restant
    if (currentText) {
      result.push({ type: 'text', text: currentText });
    }
    
    return result.length > 0 ? result : [{ type: 'text', text: content }];
  };

  const renderMessage = ({ item }) => {
    const isUser = item.role === 'user';
    const isSystem = item.role === 'system';
    const style = chatStyle || {};

    if (isSystem && item.image) {
      return (
        <View style={styles.imageMessageContainer}>
          <Image source={{ uri: item.image }} style={styles.generatedImage} />
          <Text style={styles.imageTimestamp}>
            {item.timestamp ? new Date(item.timestamp).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) : ''}
          </Text>
        </View>
      );
    }

    const formattedParts = formatRPMessage(item.content);

    const bubbleStyle = {
      backgroundColor: isUser 
        ? (style.userBubble || '#6366f1') 
        : (style.assistantBubble || '#ffffff'),
      opacity: style.bubbleOpacity || 1,
      borderRadius: style.borderRadius || 15,
    };

    return (
      <View style={[styles.messageContainer, isUser ? styles.userMessage : styles.assistantMessage]}>
        <View style={[styles.messageBubble, bubbleStyle]}>
          {!isUser && (
            <Text style={[styles.characterName, { color: style.userBubble || '#6366f1' }]}>
              {character.name}
            </Text>
          )}
          <Text style={styles.messageContent}>
            {formattedParts.map((part, index) => {
              if (part.type === 'action') {
                // ACTIONS: Couleur personnalisée
                return (
                  <Text key={index} style={{ color: style.actionColor || '#ef4444', fontStyle: 'italic', fontWeight: 'bold' }}>
                    {part.text}
                  </Text>
                );
              } else if (part.type === 'thought') {
                // PENSÉES: Couleur personnalisée
                return (
                  <Text key={index} style={{ color: style.thoughtColor || '#3b82f6', fontStyle: 'italic' }}>
                    {part.text}
                  </Text>
                );
              } else if (part.type === 'dialogue') {
                // PAROLES: Couleur personnalisée
                return (
                  <Text key={index} style={{ color: isUser ? '#ffffff' : (style.dialogueColor || '#1f2937') }}>
                    {part.text}
                  </Text>
                );
              } else {
                // Texte normal
                return (
                  <Text key={index} style={{ color: isUser ? '#ffffff' : (style.dialogueColor || '#4b5563') }}>
                    {part.text}
                  </Text>
                );
              }
            })}
          </Text>
          <Text style={[styles.timestamp, { color: isUser ? 'rgba(255,255,255,0.7)' : '#9ca3af' }]}>
            {item.timestamp ? new Date(item.timestamp).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) : ''}
          </Text>
        </View>
      </View>
    );
  };

  // Modal de personnalisation
  const renderSettingsModal = () => {
    const themes = ChatStyleService.getThemes();
    
    return (
      <Modal
        visible={showSettings}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowSettings(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>⚙️ Style des bulles</Text>
              <TouchableOpacity onPress={() => setShowSettings(false)}>
                <Text style={styles.modalClose}>✕</Text>
              </TouchableOpacity>
            </View>
            
            <ScrollView style={styles.modalBody}>
              {/* Thèmes prédéfinis */}
              <Text style={styles.settingLabel}>🎨 Thèmes</Text>
              <View style={styles.themesGrid}>
                {themes.map((theme) => (
                  <TouchableOpacity
                    key={theme.id}
                    style={[
                      styles.themeOption,
                      selectedTheme === theme.id && styles.themeOptionSelected
                    ]}
                    onPress={() => handleThemeChange(theme.id)}
                  >
                    <View style={styles.themePreview}>
                      <View style={[styles.themePreviewBubble, { backgroundColor: theme.preview.userBubble }]} />
                      <View style={[styles.themePreviewBubble, { backgroundColor: theme.preview.assistantBubble, borderWidth: 1, borderColor: '#e5e7eb' }]} />
                    </View>
                    <Text style={styles.themeName}>{theme.name}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              
              {/* Opacité */}
              <Text style={styles.settingLabel}>🔍 Opacité: {Math.round(opacity * 100)}%</Text>
              <View style={styles.sliderContainer}>
                <Text style={styles.sliderLabel}>50%</Text>
                <View style={styles.sliderWrapper}>
                  <View 
                    style={[
                      styles.sliderTrack,
                      { width: `${((opacity - 0.5) / 0.5) * 100}%` }
                    ]} 
                  />
                  <TouchableOpacity
                    style={[
                      styles.sliderThumb,
                      { left: `${((opacity - 0.5) / 0.5) * 100}%` }
                    ]}
                    onPress={() => {}}
                  />
                </View>
                <Text style={styles.sliderLabel}>100%</Text>
              </View>
              <View style={styles.sliderButtons}>
                <TouchableOpacity 
                  style={styles.sliderBtn}
                  onPress={() => handleOpacityChange(Math.max(0.5, opacity - 0.1))}
                >
                  <Text style={styles.sliderBtnText}>-</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={styles.sliderBtn}
                  onPress={() => handleOpacityChange(Math.min(1, opacity + 0.1))}
                >
                  <Text style={styles.sliderBtnText}>+</Text>
                </TouchableOpacity>
              </View>
              
              {/* Arrondi */}
              <Text style={styles.settingLabel}>⭕ Arrondi: {Math.round(borderRadius)}px</Text>
              <View style={styles.sliderButtons}>
                <TouchableOpacity 
                  style={styles.sliderBtn}
                  onPress={() => handleBorderRadiusChange(Math.max(0, borderRadius - 5))}
                >
                  <Text style={styles.sliderBtnText}>-</Text>
                </TouchableOpacity>
                <View style={styles.radiusPreview}>
                  <View style={[styles.radiusPreviewBox, { borderRadius: borderRadius }]} />
                </View>
                <TouchableOpacity 
                  style={styles.sliderBtn}
                  onPress={() => handleBorderRadiusChange(Math.min(30, borderRadius + 5))}
                >
                  <Text style={styles.sliderBtnText}>+</Text>
                </TouchableOpacity>
              </View>
              
              {/* Flou du fond */}
              <Text style={styles.settingLabel}>🌫️ Flou du fond: {Math.round(backgroundBlur)}%</Text>
              <View style={styles.sliderButtons}>
                <TouchableOpacity 
                  style={styles.sliderBtn}
                  onPress={() => handleBlurChange(Math.max(0, backgroundBlur - 10))}
                >
                  <Text style={styles.sliderBtnText}>-</Text>
                </TouchableOpacity>
                <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
                  <View style={{ 
                    width: 60, 
                    height: 60, 
                    backgroundColor: `rgba(0,0,0,${backgroundBlur / 100})`,
                    borderRadius: 8,
                    justifyContent: 'center',
                    alignItems: 'center',
                    borderWidth: 1,
                    borderColor: '#ccc',
                  }}>
                    <Text style={{ color: backgroundBlur > 50 ? '#fff' : '#000', fontWeight: 'bold' }}>{Math.round(backgroundBlur)}%</Text>
                  </View>
                </View>
                <TouchableOpacity 
                  style={styles.sliderBtn}
                  onPress={() => handleBlurChange(Math.min(100, backgroundBlur + 10))}
                >
                  <Text style={styles.sliderBtnText}>+</Text>
                </TouchableOpacity>
              </View>
              
              {/* SÉLECTEURS DE COULEURS */}
              <Text style={styles.settingLabel}>🎨 Personnalisation des couleurs</Text>
              
              {/* Bulle personnage */}
              <TouchableOpacity 
                style={styles.colorPickerBtn}
                onPress={() => {
                  setColorPickerTarget('assistantBubble');
                  setColorPickerTitle('💬 Couleur bulle personnage');
                  setColorPickerVisible(true);
                }}
              >
                <View style={[styles.colorPreviewSmall, { backgroundColor: chatStyle?.assistantBubble || '#ffffff' }]} />
                <Text style={styles.colorPickerBtnText}>Bulle personnage</Text>
                <Text style={styles.colorPickerHex}>{(chatStyle?.assistantBubble || '#ffffff').toUpperCase()}</Text>
              </TouchableOpacity>
              
              {/* Bulle utilisateur */}
              <TouchableOpacity 
                style={styles.colorPickerBtn}
                onPress={() => {
                  setColorPickerTarget('userBubble');
                  setColorPickerTitle('💬 Couleur bulle utilisateur');
                  setColorPickerVisible(true);
                }}
              >
                <View style={[styles.colorPreviewSmall, { backgroundColor: chatStyle?.userBubble || '#6366f1' }]} />
                <Text style={styles.colorPickerBtnText}>Bulle utilisateur</Text>
                <Text style={styles.colorPickerHex}>{(chatStyle?.userBubble || '#6366f1').toUpperCase()}</Text>
              </TouchableOpacity>
              
              {/* Couleur actions */}
              <TouchableOpacity 
                style={styles.colorPickerBtn}
                onPress={() => {
                  setColorPickerTarget('actionColor');
                  setColorPickerTitle('🔴 Couleur des actions (*geste*)');
                  setColorPickerVisible(true);
                }}
              >
                <View style={[styles.colorPreviewSmall, { backgroundColor: chatStyle?.actionColor || '#ef4444' }]} />
                <Text style={styles.colorPickerBtnText}>Actions *geste*</Text>
                <Text style={styles.colorPickerHex}>{(chatStyle?.actionColor || '#ef4444').toUpperCase()}</Text>
              </TouchableOpacity>
              
              {/* Couleur pensées */}
              <TouchableOpacity 
                style={styles.colorPickerBtn}
                onPress={() => {
                  setColorPickerTarget('thoughtColor');
                  setColorPickerTitle('🔵 Couleur des pensées ((pensée))');
                  setColorPickerVisible(true);
                }}
              >
                <View style={[styles.colorPreviewSmall, { backgroundColor: chatStyle?.thoughtColor || '#3b82f6' }]} />
                <Text style={styles.colorPickerBtnText}>Pensées (pensée)</Text>
                <Text style={styles.colorPickerHex}>{(chatStyle?.thoughtColor || '#3b82f6').toUpperCase()}</Text>
              </TouchableOpacity>
              
              {/* Couleur paroles */}
              <TouchableOpacity 
                style={styles.colorPickerBtn}
                onPress={() => {
                  setColorPickerTarget('dialogueColor');
                  setColorPickerTitle('⚪ Couleur des paroles ("dialogue")');
                  setColorPickerVisible(true);
                }}
              >
                <View style={[styles.colorPreviewSmall, { backgroundColor: chatStyle?.dialogueColor || '#1f2937' }]} />
                <Text style={styles.colorPickerBtnText}>Paroles "dialogue"</Text>
                <Text style={styles.colorPickerHex}>{(chatStyle?.dialogueColor || '#1f2937').toUpperCase()}</Text>
              </TouchableOpacity>

              {/* Aperçu */}
              <Text style={styles.settingLabel}>👁️ Aperçu</Text>
              <View style={styles.previewContainer}>
                <View style={[
                  styles.previewBubble, 
                  { 
                    backgroundColor: chatStyle?.assistantBubble || '#fff',
                    opacity: opacity,
                    borderRadius: borderRadius,
                    alignSelf: 'flex-start',
                  }
                ]}>
                  <Text style={{ color: chatStyle?.actionColor || '#ef4444' }}>*sourit*</Text>
                  <Text style={{ color: chatStyle?.dialogueColor || '#ffffff' }}> "Bonjour !"</Text>
                  <Text style={{ color: chatStyle?.thoughtColor || '#3b82f6' }}> (c'est vraiment lui...)</Text>
                </View>
                <View style={[
                  styles.previewBubble, 
                  { 
                    backgroundColor: chatStyle?.userBubble || '#6366f1',
                    opacity: opacity,
                    borderRadius: borderRadius,
                    alignSelf: 'flex-end',
                  }
                ]}>
                  <Text style={{ color: chatStyle?.userText || '#fff' }}>
                    Salut !
                  </Text>
                </View>
              </View>
            </ScrollView>
            
            <TouchableOpacity
              style={styles.modalButton}
              onPress={() => setShowSettings(false)}
            >
              <Text style={styles.modalButtonText}>✓ Fermer</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    );
  };

  // Afficher l'écran de chargement ou d'erreur
  if (initError) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>❌ Erreur</Text>
        <Text style={styles.errorMessage}>{initError}</Text>
        <TouchableOpacity
          style={styles.retryButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.retryButtonText}>← Retour</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (!isInitialized) {
    return (
      <View style={styles.loadingScreen}>
        <ActivityIndicator size="large" color="#6366f1" />
        <Text style={styles.loadingScreenText}>Chargement de la conversation...</Text>
        <Text style={styles.loadingScreenSubText}>{character?.name || ''}</Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={[styles.container, conversationBackground && { backgroundColor: 'transparent' }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 70}
    >
      {conversationBackground && (
        <>
          <Image
            source={{ uri: conversationBackground }}
            style={styles.backgroundImage}
            blurRadius={backgroundBlur / 5} // 0-20 blur radius (paramètres)
          />
        </>
      )}
      
      {/* Barre de niveau avec ce personnage */}
      {userLevel && (
        <View style={styles.levelBar}>
          <View style={styles.levelInfo}>
            <Text style={styles.levelText}>💕 Niv. {userLevel.level}</Text>
            <Text style={styles.levelTitle}>{userLevel.title}</Text>
          </View>
          <View style={styles.xpBarContainer}>
            <View style={[styles.xpBar, { width: `${userLevel.progress || 0}%` }]} />
            <Text style={styles.xpText}>{userLevel.progress || 0}%</Text>
          </View>
          <Text style={styles.xpDetail}>{userLevel.totalXP || 0} XP • {character?.name || ''}</Text>
        </View>
      )}
      
      {/* Barre de relation avec le personnage */}
      {relationship && (
        <View style={styles.relationshipBar}>
          <View style={styles.relationshipStat}>
            <Text style={styles.relationshipLabel}>💫 Niv.{userLevel?.level || relationship.level || 1}</Text>
          </View>
          <View style={styles.relationshipStat}>
            <View style={styles.statBarContainer}>
              <Text style={styles.relationshipLabel}>Affection</Text>
              <View style={styles.miniBarBg}>
                <View style={[styles.miniBarFill, styles.affectionBar, { width: `${relationship.affection}%` }]} />
              </View>
              <Text style={styles.statPercent}>{relationship.affection}%</Text>
            </View>
          </View>
          <View style={styles.relationshipStat}>
            <View style={styles.statBarContainer}>
              <Text style={styles.relationshipLabel}>Confiance</Text>
              <View style={styles.miniBarBg}>
                <View style={[styles.miniBarFill, styles.trustBar, { width: `${relationship.trust}%` }]} />
              </View>
              <Text style={styles.statPercent}>{relationship.trust}%</Text>
            </View>
          </View>
          <TouchableOpacity
            style={styles.galleryButton}
            onPress={() => navigation.navigate('Gallery', { character })}
          >
            <Text style={styles.galleryButtonText}>🖼️ {gallery.length}</Text>
          </TouchableOpacity>
        </View>
      )}
      
      {/* Animation Level Up */}
      {showLevelUp && levelUpInfo && (
        <View style={styles.levelUpOverlay}>
          <View style={styles.levelUpModal}>
            <Text style={styles.levelUpEmoji}>🎉</Text>
            <Text style={styles.levelUpTitle}>NIVEAU SUPÉRIEUR !</Text>
            <Text style={styles.levelUpLevel}>Niveau {levelUpInfo.newLevel}</Text>
            <Text style={styles.levelUpTitleText}>{levelUpInfo.title}</Text>
            {levelUpInfo.reward && (
              <View style={styles.rewardBox}>
                <Text style={styles.rewardText}>🎁 {levelUpInfo.reward.description}</Text>
              </View>
            )}
          </View>
        </View>
      )}

      <FlatList
        ref={flatListRef}
        data={messages}
        renderItem={renderMessage}
        keyExtractor={(item, index) => index.toString()}
        contentContainerStyle={styles.messagesList}
        // Scroll automatique quand le contenu change de taille
        onContentSizeChange={(contentWidth, contentHeight) => {
          // Scroll en bas uniquement si pas en train de scroller manuellement
          if (!userIsScrolling && flatListRef.current && messages.length > 0) {
            flatListRef.current.scrollToOffset({ 
              offset: contentHeight, 
              animated: false 
            });
          }
        }}
        onScrollBeginDrag={() => setUserIsScrolling(true)}
        onMomentumScrollEnd={() => {
          // Réinitialiser après un court délai
          setTimeout(() => setUserIsScrolling(false), 500);
        }}
        // NE PAS utiliser maintainVisibleContentPosition - empêche le scroll auto
        // Améliorer le rendu
        removeClippedSubviews={false}
        initialNumToRender={50}
        maxToRenderPerBatch={20}
        windowSize={21}
        // Scroll inversé désactivé pour garder l'ordre normal
        inverted={false}
      />

      {isLoading && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="small" color="#6366f1" />
          <Text style={styles.loadingText}>{character.name} écrit...</Text>
        </View>
      )}

      <View style={styles.inputContainer}>
        <TouchableOpacity
          style={[styles.imageButton, !isPremium && styles.imageButtonLocked]}
          onPress={generateImage}
          disabled={generatingImage}
        >
          {generatingImage ? (
            <ActivityIndicator size="small" color="#6366f1" />
          ) : (
            <Text style={styles.imageButtonText}>
              {isPremium ? '🎨' : '🔒'}
            </Text>
          )}
        </TouchableOpacity>
        
        <TextInput
          style={styles.input}
          value={inputText}
          onChangeText={setInputText}
          placeholder="Votre message (utilisez *actions* et 'paroles')..."
          multiline
          maxLength={500}
          editable={!isLoading}
          returnKeyType="default"
          blurOnSubmit={false}
        />
        
        <TouchableOpacity
          style={[styles.sendButton, (!inputText.trim() || isLoading) && styles.sendButtonDisabled]}
          onPress={sendMessage}
          disabled={!inputText.trim() || isLoading}
        >
          <Text style={styles.sendButtonText}>➤</Text>
        </TouchableOpacity>
      </View>
      
      {renderSettingsModal()}
      
      {/* Color Picker Modal */}
      <ColorPicker
        visible={colorPickerVisible}
        onClose={() => setColorPickerVisible(false)}
        title={colorPickerTitle}
        currentColor={
          colorPickerTarget === 'assistantBubble' ? (chatStyle?.assistantBubble || '#ffffff') :
          colorPickerTarget === 'userBubble' ? (chatStyle?.userBubble || '#6366f1') :
          colorPickerTarget === 'actionColor' ? (chatStyle?.actionColor || '#ef4444') :
          colorPickerTarget === 'thoughtColor' ? (chatStyle?.thoughtColor || '#3b82f6') :
          colorPickerTarget === 'dialogueColor' ? (chatStyle?.dialogueColor || '#1f2937') : '#ffffff'
        }
        onSelectColor={async (color) => {
          let newStyle;
          switch (colorPickerTarget) {
            case 'assistantBubble':
              newStyle = await ChatStyleService.setAssistantBubbleColor(color);
              break;
            case 'userBubble':
              newStyle = await ChatStyleService.setUserBubbleColor(color);
              break;
            case 'actionColor':
              newStyle = await ChatStyleService.setActionColor(color);
              break;
            case 'thoughtColor':
              newStyle = await ChatStyleService.setThoughtColor(color);
              break;
            case 'dialogueColor':
              newStyle = await ChatStyleService.setDialogueColor(color);
              break;
          }
          if (newStyle) {
            setChatStyle({...newStyle});
          }
        }}
      />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  // Barre de niveau utilisateur
  levelBar: {
    backgroundColor: '#1e1b4b',
    paddingVertical: 8,
    paddingHorizontal: 15,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  levelInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  levelText: {
    color: '#fbbf24',
    fontWeight: 'bold',
    fontSize: 14,
  },
  levelTitle: {
    color: '#a78bfa',
    fontSize: 12,
    fontStyle: 'italic',
  },
  xpBarContainer: {
    flex: 1,
    height: 12,
    backgroundColor: '#374151',
    borderRadius: 6,
    marginHorizontal: 10,
    overflow: 'hidden',
    position: 'relative',
  },
  xpBar: {
    height: '100%',
    backgroundColor: '#8b5cf6',
    borderRadius: 6,
  },
  xpText: {
    position: 'absolute',
    width: '100%',
    textAlign: 'center',
    fontSize: 9,
    color: '#fff',
    fontWeight: 'bold',
    lineHeight: 12,
  },
  xpDetail: {
    color: '#9ca3af',
    fontSize: 11,
    minWidth: 50,
    textAlign: 'right',
  },
  // Animation Level Up
  levelUpOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  levelUpModal: {
    backgroundColor: '#1e1b4b',
    borderRadius: 20,
    padding: 30,
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#fbbf24',
  },
  levelUpEmoji: {
    fontSize: 50,
    marginBottom: 10,
  },
  levelUpTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fbbf24',
    marginBottom: 5,
  },
  levelUpLevel: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 5,
  },
  levelUpTitleText: {
    fontSize: 18,
    color: '#a78bfa',
    fontStyle: 'italic',
    marginBottom: 15,
  },
  rewardBox: {
    backgroundColor: '#4c1d95',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 10,
  },
  rewardText: {
    color: '#fbbf24',
    fontSize: 14,
    fontWeight: '600',
  },
  relationshipBar: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: '#6366f1',
    paddingVertical: 10,
    paddingHorizontal: 15,
  },
  relationshipStat: {
    alignItems: 'center',
  },
  relationshipLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#fff',
  },
  relationshipValue: {
    fontSize: 10,
    color: '#e0e7ff',
    marginTop: 2,
  },
  statBarContainer: {
    alignItems: 'center',
  },
  miniBarBg: {
    width: 50,
    height: 6,
    backgroundColor: 'rgba(255,255,255,0.3)',
    borderRadius: 3,
    marginVertical: 2,
    overflow: 'hidden',
  },
  miniBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  affectionBar: {
    backgroundColor: '#f472b6',
  },
  trustBar: {
    backgroundColor: '#34d399',
  },
  statPercent: {
    fontSize: 9,
    color: '#e0e7ff',
    fontWeight: '600',
  },
  messagesList: {
    padding: 15,
    paddingBottom: 10,
  },
  messageContainer: {
    marginBottom: 15,
    maxWidth: '80%',
  },
  userMessage: {
    alignSelf: 'flex-end',
  },
  assistantMessage: {
    alignSelf: 'flex-start',
  },
  messageBubble: {
    padding: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  characterName: {
    fontSize: 12,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  messageContent: {
    marginBottom: 5,
    fontSize: 15,
    lineHeight: 22,
  },
  actionText: {
    fontSize: 14,
    fontStyle: 'italic',
    marginBottom: 3,
    color: '#ef4444', // ROUGE pour les actions
    fontWeight: '500',
  },
  thoughtText: {
    fontSize: 14,
    fontStyle: 'italic',
    marginBottom: 3,
    color: '#3b82f6', // BLEU pour les pensées
    opacity: 0.95,
  },
  dialogueText: {
    fontSize: 15,
    fontWeight: '500',
    marginBottom: 3,
  },
  normalText: {
    fontSize: 14,
    marginBottom: 3,
  },
  timestamp: {
    fontSize: 10,
    alignSelf: 'flex-end',
  },
  imageMessageContainer: {
    alignItems: 'center',
    marginBottom: 15,
  },
  generatedImage: {
    width: 300,
    height: 300,
    borderRadius: 15,
    backgroundColor: '#e5e7eb',
  },
  imageTimestamp: {
    fontSize: 10,
    color: '#9ca3af',
    marginTop: 5,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 10,
    backgroundColor: '#f3f4f6',
  },
  loadingText: {
    marginLeft: 10,
    fontSize: 14,
    color: '#6b7280',
    fontStyle: 'italic',
  },
  inputContainer: {
    flexDirection: 'row',
    padding: 10,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    alignItems: 'flex-end',
  },
  imageButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f3f4f6',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
    marginBottom: 5,
  },
  imageButtonLocked: {
    backgroundColor: '#fef3c7',
    borderWidth: 1,
    borderColor: '#f59e0b',
  },
  imageButtonText: {
    fontSize: 20,
  },
  input: {
    flex: 1,
    backgroundColor: '#f3f4f6',
    borderRadius: 20,
    paddingHorizontal: 15,
    paddingVertical: 10,
    fontSize: 15,
    maxHeight: 100,
    marginRight: 8,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#6366f1',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 5,
  },
  sendButtonDisabled: {
    backgroundColor: '#d1d5db',
  },
  sendButtonText: {
    fontSize: 20,
    color: '#fff',
  },
  galleryButton: {
    backgroundColor: '#10b981',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  galleryButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  backgroundImage: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  colorRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 15,
    paddingHorizontal: 10,
  },
  colorBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#ccc',
  },
  colorPalette: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    marginBottom: 20,
    paddingHorizontal: 5,
    gap: 6,
  },
  paletteBtn: {
    width: 32,
    height: 32,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.2)',
  },
  loadingScreen: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
  },
  loadingScreenText: {
    marginTop: 15,
    fontSize: 16,
    color: '#6366f1',
    fontWeight: '600',
  },
  loadingScreenSubText: {
    marginTop: 5,
    fontSize: 14,
    color: '#9ca3af',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    padding: 20,
  },
  errorText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#ef4444',
    marginBottom: 10,
  },
  errorMessage: {
    fontSize: 16,
    color: '#6b7280',
    textAlign: 'center',
    marginBottom: 20,
  },
  retryButton: {
    backgroundColor: '#6366f1',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 10,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#111827',
  },
  modalClose: {
    fontSize: 24,
    color: '#6b7280',
  },
  modalBody: {
    padding: 20,
  },
  settingLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 12,
    marginTop: 10,
  },
  themesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 20,
  },
  themeOption: {
    width: '30%',
    padding: 10,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#e5e7eb',
    alignItems: 'center',
  },
  themeOptionSelected: {
    borderColor: '#6366f1',
    backgroundColor: '#eef2ff',
  },
  themePreview: {
    flexDirection: 'row',
    gap: 5,
    marginBottom: 5,
  },
  themePreviewBubble: {
    width: 20,
    height: 20,
    borderRadius: 10,
  },
  themeName: {
    fontSize: 11,
    color: '#4b5563',
    textAlign: 'center',
  },
  sliderContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  sliderWrapper: {
    flex: 1,
    height: 8,
    backgroundColor: '#e5e7eb',
    borderRadius: 4,
    marginHorizontal: 10,
    position: 'relative',
  },
  sliderTrack: {
    height: '100%',
    backgroundColor: '#6366f1',
    borderRadius: 4,
  },
  sliderThumb: {
    position: 'absolute',
    top: -6,
    width: 20,
    height: 20,
    backgroundColor: '#6366f1',
    borderRadius: 10,
    marginLeft: -10,
  },
  sliderLabel: {
    fontSize: 12,
    color: '#6b7280',
    width: 40,
    textAlign: 'center',
  },
  sliderButtons: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 20,
    marginBottom: 20,
  },
  sliderBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#6366f1',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sliderBtnText: {
    fontSize: 24,
    color: '#fff',
    fontWeight: 'bold',
  },
  radiusPreview: {
    width: 60,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  radiusPreviewBox: {
    width: 50,
    height: 30,
    backgroundColor: '#6366f1',
  },
  previewContainer: {
    backgroundColor: '#f3f4f6',
    borderRadius: 12,
    padding: 15,
    gap: 10,
  },
  previewBubble: {
    padding: 12,
    maxWidth: '70%',
  },
  modalButton: {
    backgroundColor: '#6366f1',
    margin: 20,
    padding: 15,
    borderRadius: 12,
    alignItems: 'center',
  },
  modalButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  // Color Picker Button Styles
  colorPickerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#374151',
    padding: 12,
    borderRadius: 10,
    marginBottom: 10,
  },
  colorPreviewSmall: {
    width: 36,
    height: 36,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#fff',
    marginRight: 12,
  },
  colorPickerBtnText: {
    flex: 1,
    color: '#fff',
    fontSize: 15,
    fontWeight: '500',
  },
  colorPickerHex: {
    color: '#9ca3af',
    fontSize: 12,
    fontFamily: 'monospace',
  },
});
