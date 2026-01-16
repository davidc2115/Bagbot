import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Image,
  ActivityIndicator,
  Alert,
} from 'react-native';
import StorageService from '../services/StorageService';
import ImageGenerationService from '../services/ImageGenerationService';
import CustomCharacterService from '../services/CustomCharacterService';
import GalleryService from '../services/GalleryService';
import UserProfileService from '../services/UserProfileService';
import AuthService from '../services/AuthService';
import LevelService from '../services/LevelService';

/**
 * Traduit le tempérament en français
 */
const translateTemperament = (temperament) => {
  if (!temperament) return 'Non défini';
  
  const translations = {
    // Tempéraments anglais -> français
    'dominant': 'Dominant(e) et confiant(e)',
    'gentle': 'Doux/Douce et attentionné(e)',
    'shy': 'Timide et réservé(e)',
    'passionate': 'Passionné(e) et intense',
    'mysterious': 'Mystérieux/Mystérieuse et énigmatique',
    'playful': 'Joueur/Joueuse et espiègle',
    'caring': 'Bienveillant(e) et protecteur/protectrice',
    'flirtatious': 'Séducteur/Séductrice et charmeur/charmeuse',
    'direct': 'Direct(e) et franc/franche',
    'submissive': 'Soumis(e) et docile',
    'confident': 'Confiant(e) et assuré(e)',
    'romantic': 'Romantique et rêveur/rêveuse',
    'aggressive': 'Fougueux/Fougueuse et intense',
    'seductive': 'Séducteur/Séductrice',
    'innocent': 'Innocent(e) et naïf/naïve',
    'mature': 'Mature et posé(e)',
    'wild': 'Sauvage et imprévisible',
    'tender': 'Tendre et affectueux/affectueuse',
    'assertive': 'Affirmé(e) et déterminé(e)',
    'sensual': 'Sensuel(le) et voluptueux/voluptueuse',
  };
  
  const temp = temperament.toLowerCase().trim();
  
  // Vérifier si c'est un tempérament connu
  if (translations[temp]) {
    return translations[temp];
  }
  
  // Vérifier si le tempérament contient un mot-clé connu
  for (const [key, value] of Object.entries(translations)) {
    if (temp.includes(key)) {
      return value;
    }
  }
  
  // Si c'est déjà en français ou inconnu, mettre la première lettre en majuscule
  return temperament.charAt(0).toUpperCase() + temperament.slice(1);
};

/**
 * Extrait un attribut physique depuis physicalDescription ou imagePrompt
 */
const extractAttribute = (character, type) => {
  const text = ((character.physicalDescription || '') + ' ' + (character.appearance || '') + ' ' + (character.imagePrompt || '') + ' ' + (character.tags || []).join(' ')).toLowerCase();
  
  if (type === 'hair') {
    const patterns = [
      { regex: /cheveux?\s+([\wéèêëàâäôöùûü\s-]+)/i, group: 1 },
      { regex: /(blond[es]?|brun[es]?|roux?|rousse|noir[es]?|châtain|gris[es]?|argenté[es]?|blanc[hes]?|rose|violet[tes]?|bleu[es]?)\s*(cheveux|hair)?/i, group: 1 },
      { regex: /(blonde|brunette|red|black|brown|gray|silver|white|pink|purple|blue)\s*hair/i, group: 1 },
    ];
    for (const p of patterns) {
      const match = text.match(p.regex);
      if (match) return match[p.group].trim();
    }
  }
  
  if (type === 'eyes') {
    const patterns = [
      { regex: /yeux\s+([\wéèêëàâäôöùûü\s-]+)/i, group: 1 },
      { regex: /(bleu[s]?|vert[s]?|marron|noisette|gris|noir[s]?|ambre|doré[s]?|violet[s]?|rouge[s]?)\s*(yeux|eyes)?/i, group: 1 },
      { regex: /(blue|green|brown|hazel|gray|black|amber|golden|purple|red)\s*eyes/i, group: 1 },
    ];
    for (const p of patterns) {
      const match = text.match(p.regex);
      if (match) return match[p.group].trim();
    }
  }
  
  if (type === 'height') {
    const match = text.match(/(\d{2,3})\s*(cm|centimètres)/i);
    if (match) return match[1] + ' cm';
    if (text.includes('grande') || text.includes('tall')) return '175+ cm';
    if (text.includes('petite') || text.includes('small')) return '155-160 cm';
  }
  
  if (type === 'body') {
    if (text.includes('très ronde') || text.includes('bbw')) return 'Très ronde et généreuse';
    if (text.includes('ronde') || text.includes('chubby') || text.includes('curvy') || text.includes('plump')) return 'Ronde et généreuse';
    if (text.includes('voluptueuse') || text.includes('voluptuous') || text.includes('pulpeuse')) return 'Voluptueuse';
    if (text.includes('généreuse') || text.includes('generous')) return 'Généreuse';
    if (text.includes('athlétique') || text.includes('athletic') || text.includes('tonique')) return 'Athlétique';
    if (text.includes('mince') || text.includes('slim') || text.includes('élancée')) return 'Mince et élancée';
    if (text.includes('musclée') || text.includes('muscular')) return 'Musclée';
    if (text.includes('maternelle') || text.includes('maternal')) return 'Maternelle et douce';
  }
  
  if (type === 'bust') {
    const bustMatch = text.match(/bonnet\s*([A-H]{1,2})/i) || text.match(/([A-H])\s*cup/i);
    if (bustMatch) return bustMatch[1].toUpperCase();
    if (text.includes('énorme') || text.includes('massive') || text.includes('huge')) return 'H';
    if (text.includes('très grosse') || text.includes('very large')) return 'G';
    if (text.includes('grosse') || text.includes('large')) return 'F';
    if (text.includes('généreuse') || text.includes('generous')) return 'E';
    if (text.includes('moyenne') || text.includes('medium')) return 'C';
    if (text.includes('petite poitrine') || text.includes('small breast')) return 'B';
  }
  
  if (type === 'male') {
    const match = text.match(/(\d{2})\s*(cm)?/);
    if (match) return match[1];
  }
  
  return null;
};

/**
 * Génère une description physique ULTRA-DÉTAILLÉE du personnage
 */
const generateDetailedDescription = (character) => {
  const parts = [];
  const text = ((character.physicalDescription || '') + ' ' + (character.appearance || '') + ' ' + (character.imagePrompt || '') + ' ' + (character.tags || []).join(' ')).toLowerCase();
  
  // Genre et âge
  if (character.gender === 'female') {
    parts.push(`${character.name} est une femme${character.age ? ` de ${character.age} ans` : ''}`);
  } else if (character.gender === 'male') {
    parts.push(`${character.name} est un homme${character.age ? ` de ${character.age} ans` : ''}`);
  } else {
    parts.push(`${character.name} est une personne non-binaire${character.age ? ` de ${character.age} ans` : ''}`);
  }
  
  // Taille
  const height = character.height || extractAttribute(character, 'height');
  if (height) {
    parts.push(`mesurant environ ${height}`);
  } else if (text.includes('grande') || text.includes('tall')) {
    parts.push('de grande taille');
  } else if (text.includes('petite') || text.includes('small')) {
    parts.push('de petite taille');
  }
  
  // Morphologie DÉTAILLÉE
  const bodyType = character.bodyType || extractAttribute(character, 'body');
  if (bodyType) {
    parts.push(`à la silhouette ${bodyType.toLowerCase()}`);
  }
  
  // CHEVEUX - Couleur, longueur, texture
  const hairColor = character.hairColor || extractAttribute(character, 'hair');
  const hairLength = character.hairLength || '';
  let hairDesc = [];
  if (hairColor) hairDesc.push(hairColor);
  if (hairLength) hairDesc.push(hairLength.toLowerCase());
  if (text.includes('lisse') || text.includes('straight')) hairDesc.push('lisses');
  else if (text.includes('ondulé') || text.includes('wavy')) hairDesc.push('ondulés');
  else if (text.includes('bouclé') || text.includes('curly') || text.includes('frisé')) hairDesc.push('bouclés');
  else if (text.includes('crépu') || text.includes('afro')) hairDesc.push('crépus');
  if (hairDesc.length > 0) {
    parts.push(`aux cheveux ${hairDesc.join(', ')}`);
  }
  
  // YEUX
  const eyeColor = character.eyeColor || extractAttribute(character, 'eyes');
  if (eyeColor) {
    let eyeDesc = eyeColor;
    if (text.includes('yeux en amande') || text.includes('almond')) eyeDesc += ' en amande';
    else if (text.includes('grands yeux') || text.includes('big eyes')) eyeDesc = `grands yeux ${eyeColor}`;
    parts.push(`aux yeux ${eyeDesc}`);
  }
  
  // PEAU
  if (text.includes('peau pâle') || text.includes('pale skin') || text.includes('porcelaine')) {
    parts.push('à la peau pâle comme de la porcelaine');
  } else if (text.includes('bronzé') || text.includes('tan') || text.includes('doré')) {
    parts.push('à la peau bronzée et dorée');
  } else if (text.includes('ébène') || text.includes('noir') || text.includes('dark skin')) {
    parts.push('à la peau ébène');
  } else if (text.includes('caramel') || text.includes('métis')) {
    parts.push('à la peau caramel');
  } else if (text.includes('olive') || text.includes('méditerran')) {
    parts.push('à la peau olive méditerranéenne');
  }
  
  if (text.includes('taches de rousseur') || text.includes('freckles')) {
    parts.push('parsemée de taches de rousseur');
  }
  
  // POITRINE pour femmes (TRÈS DÉTAILLÉ)
  if (character.gender === 'female') {
    const bust = character.bust || extractAttribute(character, 'bust');
    if (bust) {
      const bustDescFr = {
        'A': 'une petite poitrine délicate (bonnet A)',
        'B': 'une poitrine menue et ferme (bonnet B)',
        'C': 'une poitrine de taille moyenne, bien proportionnée (bonnet C)',
        'D': 'une poitrine généreuse et pleine (bonnet D)',
        'DD': 'une très belle poitrine imposante (bonnet DD)',
        'E': 'une poitrine volumineuse et impressionnante (bonnet E)',
        'F': 'une très grosse poitrine (bonnet F)',
        'G': 'une poitrine énorme et majestueuse (bonnet G)',
        'H': 'une poitrine massive et imposante (bonnet H)'
      };
      parts.push(`Elle possède ${bustDescFr[bust] || `une poitrine bonnet ${bust}`}`);
    }
    
    // Fesses
    if (text.includes('énormes fesses') || text.includes('huge butt') || text.includes('très grosses fesses')) {
      parts.push('de très grosses fesses rondes et rebondies');
    } else if (text.includes('grosses fesses') || text.includes('big butt') || text.includes('fesses généreuses')) {
      parts.push('de belles fesses généreuses et rondes');
    } else if (text.includes('fesses rebondies') || text.includes('bubble butt')) {
      parts.push('des fesses rebondies parfaitement galbées');
    }
    
    // Hanches
    if (text.includes('hanches larges') || text.includes('wide hips')) {
      parts.push('des hanches larges et féminines');
    }
    
    // Ventre
    if (text.includes('gros ventre') || text.includes('big belly')) {
      parts.push('un ventre rond et doux');
    } else if (text.includes('ventre rond') || text.includes('round belly') || text.includes('ventre doux')) {
      parts.push('un joli petit ventre arrondi');
    } else if (text.includes('ventre plat') || text.includes('flat stomach')) {
      parts.push('un ventre plat et tonique');
    }
    
    // Cuisses
    if (text.includes('cuisses épaisses') || text.includes('thick thighs') || text.includes('grosses cuisses')) {
      parts.push('de belles cuisses épaisses et sensuelles');
    }
  }
  
  // PÉNIS pour hommes (DÉTAILLÉ)
  if (character.gender === 'male') {
    const penis = character.penis || extractAttribute(character, 'male');
    if (penis) {
      const size = parseInt(penis);
      let sizeDesc = '';
      if (size >= 22) sizeDesc = 'très impressionnant';
      else if (size >= 19) sizeDesc = 'généreusement doté';
      else if (size >= 16) sizeDesc = 'bien membré';
      else sizeDesc = 'de taille moyenne';
      parts.push(`Il est ${sizeDesc} (${penis} cm)`);
    }
    
    // Corps masculin
    if (text.includes('musclé') || text.includes('muscular')) {
      parts.push('avec un corps musclé et athlétique');
    } else if (text.includes('imposant') || text.includes('broad')) {
      parts.push('avec une carrure imposante');
    }
  }
  
  // Accessoires
  if (text.includes('lunettes') || text.includes('glasses') || character.glasses) {
    parts.push('Elle/Il porte des lunettes');
  }
  if (text.includes('tatouage') || text.includes('tattoo')) {
    parts.push('avec des tatouages');
  }
  if (text.includes('piercing')) {
    parts.push('avec des piercings');
  }
  
  return parts.join(', ') + '.';
};

/**
 * Traduit le tempérament avec description détaillée
 */
const getDetailedTemperament = (character) => {
  const temp = (character.temperament || '').toLowerCase();
  const personality = (character.personality || '').toLowerCase();
  
  const detailed = {
    'shy': 'Timide et réservé(e), elle/il rougit facilement et a du mal à exprimer ses sentiments. Son regard fuyant cache une sensibilité profonde.',
    'dominant': 'Dominant(e) et sûr(e) de soi, elle/il aime prendre les commandes et sait ce qu\'elle/il veut. Son assurance est séduisante.',
    'confident': 'Confiant(e) et assuré(e), elle/il dégage une aura de charisme naturel. Son regard direct et son sourire sont irrésistibles.',
    'playful': 'Joueur/joueuse et espiègle, elle/il adore taquiner et flirter. Son rire communicatif illumine la pièce.',
    'passionate': 'Passionné(e) et intense, elle/il vit ses émotions pleinement. Quand elle/il aime, c\'est sans retenue.',
    'romantic': 'Romantique et rêveur/rêveuse, elle/il croit au grand amour. Les petites attentions et les moments tendres la/le font fondre.',
    'mysterious': 'Mystérieux/mystérieuse et énigmatique, elle/il garde une part de secret qui fascine. Son regard profond cache mille pensées.',
    'gentle': 'Doux/douce et attentionné(e), elle/il prend soin des autres avec tendresse. Sa présence apaise et réconforte.',
    'seductive': 'Séducteur/séductrice né(e), elle/il sait user de son charme. Chaque geste, chaque mot est une invitation.',
    'submissive': 'Soumis(e) et docile, elle/il aime se laisser guider. Son obéissance cache un désir de plaire.',
    'wild': 'Sauvage et imprévisible, elle/il suit ses instincts. Son côté indomptable est à la fois effrayant et excitant.',
    'caring': 'Bienveillant(e) et protecteur/protectrice, elle/il veille sur ceux qu\'elle/il aime. Son amour se manifeste en actes.',
    'maternal': 'Maternel(le) et nourricier/nourricière, elle/il a un instinct protecteur naturel. Son côté réconfortant attire.',
    'assertive': 'Affirmé(e) et déterminé(e), elle/il sait ce qu\'elle/il veut et n\'a pas peur de l\'exprimer.',
    'sensual': 'Sensuel(le) et voluptueux/voluptueuse, elle/il éveille les sens. Chaque contact avec elle/lui est une caresse.',
  };
  
  for (const [key, desc] of Object.entries(detailed)) {
    if (temp.includes(key) || personality.includes(key)) {
      return desc;
    }
  }
  
  // Si on a une personnalité mais pas de tempérament connu
  if (character.personality) {
    return character.personality;
  }
  
  return 'Personnalité unique et attachante.';
};

export default function CharacterDetailScreen({ route, navigation }) {
  const { character } = route.params;
  const [relationship, setRelationship] = useState(null);
  const [hasConversation, setHasConversation] = useState(false);
  const [characterImage, setCharacterImage] = useState(null);
  const [loadingImage, setLoadingImage] = useState(true);
  const [gallery, setGallery] = useState([]);
  const [userProfile, setUserProfile] = useState(null);
  const [isPremium, setIsPremium] = useState(false);

  useEffect(() => {
    initializeScreen();
    navigation.setOptions({ title: character.name });
    
    // Recharger la galerie quand on revient sur cet écran
    const unsubscribe = navigation.addListener('focus', () => {
      loadCharacterData(); // Recharger les données de niveau
      loadGallery();
      loadUserProfile();
      checkPremiumStatus();
    });
    
    return unsubscribe;
  }, [character]);

  const initializeScreen = async () => {
    loadCharacterData();
    loadGallery();
    loadUserProfile();
    
    // Vérifier le statut premium avant de générer l'image
    const premiumStatus = await checkPremiumStatus();
    console.log('🎫 Premium status:', premiumStatus);
    
    if (premiumStatus) {
      // Passer le statut premium directement pour éviter les problèmes de timing
      generateCharacterImage(true);
    } else {
      setLoadingImage(false);
      // Charger une image existante de la galerie si disponible
      const existingGallery = await GalleryService.getGallery(character.id);
      if (existingGallery && existingGallery.length > 0) {
        setCharacterImage(existingGallery[0]);
      }
    }
  };

  const checkPremiumStatus = async () => {
    try {
      // Vérifier d'abord localement (admin = premium automatiquement)
      const user = AuthService.getCurrentUser();
      const isAdmin = user?.is_admin || user?.email?.toLowerCase() === 'douvdouv21@gmail.com';
      
      if (isAdmin) {
        console.log('👑 Admin détecté - Premium automatique');
        setIsPremium(true);
        return true;
      }
      
      const localPremium = AuthService.isPremium();
      setIsPremium(localPremium);
      
      // Puis vérifier côté serveur
      const serverPremium = await AuthService.checkPremiumStatus();
      setIsPremium(serverPremium);
      console.log('💎 Premium server check:', serverPremium);
      return serverPremium;
    } catch (error) {
      console.error('Erreur vérification premium:', error);
      // En cas d'erreur, vérifier si admin
      const user = AuthService.getCurrentUser();
      const isAdmin = user?.is_admin || user?.email?.toLowerCase() === 'douvdouv21@gmail.com';
      const fallback = isAdmin || AuthService.isPremium();
      setIsPremium(fallback);
      return fallback;
    }
  };

  const loadUserProfile = async () => {
    const profile = await UserProfileService.getProfile();
    setUserProfile(profile);
  };

  const loadGallery = async () => {
    const images = await GalleryService.getGallery(character.id);
    setGallery(images);
  };

  const loadCharacterData = async () => {
    // Charger les données de niveau depuis LevelService (système principal)
    try {
      const levelData = await LevelService.getCharacterStats(character.id);
      // Convertir en format relationship pour l'affichage
      setRelationship({
        level: levelData.level || 1,
        affection: Math.min((levelData.level || 1) * 10, 100),
        trust: Math.min((levelData.level || 1) * 8, 100),
        interactions: levelData.totalMessages || 0,
        experience: levelData.xp || 0,
      });
    } catch (error) {
      console.log('Fallback sur StorageService:', error);
      // Fallback sur l'ancien système
      const rel = await StorageService.loadRelationship(character.id);
      setRelationship(rel);
    }

    const conv = await StorageService.loadConversation(character.id);
    setHasConversation(conv !== null && conv.messages.length > 0);
  };

  const generateCharacterImage = async (forceAllowed = false) => {
    // Vérifier le statut premium (utiliser le paramètre ou l'état)
    const canGenerate = forceAllowed || isPremium;
    
    if (!canGenerate) {
      Alert.alert(
        '💎 Fonctionnalité Premium',
        'La génération d\'images est réservée aux membres Premium.\n\nDevenez Premium pour voir vos personnages prendre vie !',
        [
          { text: 'Plus tard', style: 'cancel' },
          { 
            text: 'Devenir Premium', 
            onPress: () => navigation.navigate('Premium')
          }
        ]
      );
      return;
    }

    try {
      setLoadingImage(true);
      console.log('🎨 Génération image pour:', character.name);
      
      // Charger le profil utilisateur pour le mode NSFW
      const profile = userProfile || await UserProfileService.getProfile();
      const imageUrl = await ImageGenerationService.generateCharacterImage(character, profile);
      
      console.log('✅ Image générée:', imageUrl ? 'OK' : 'Échec');
      setCharacterImage(imageUrl);
      
      // SAUVEGARDER l'image dans la galerie du personnage
      if (imageUrl) {
        await GalleryService.saveImageToGallery(character.id, imageUrl);
        // Recharger la galerie pour afficher la nouvelle image
        await loadGallery();
      }
    } catch (error) {
      console.error('❌ Error generating image:', error);
      if (error.message?.includes('Premium') || error.message?.includes('403')) {
        Alert.alert(
          '💎 Premium Requis',
          'Vous devez être membre Premium pour générer des images.'
        );
      } else {
        // Essayer de charger une image existante
        const existingGallery = await GalleryService.getGallery(character.id);
        if (existingGallery && existingGallery.length > 0) {
          setCharacterImage(existingGallery[0]);
        }
      }
    } finally {
      setLoadingImage(false);
    }
  };

  const startConversation = () => {
    // Vérification avant navigation
    if (!character || !character.id) {
      Alert.alert('Erreur', 'Impossible de démarrer la conversation. Personnage invalide.');
      console.error('❌ Tentative de démarrer conversation avec character invalide:', character);
      return;
    }
    
    console.log('✅ Démarrage conversation:', character.name, 'ID:', character.id);
    navigation.navigate('Conversation', { character });
  };

  const startNewConversation = () => {
    Alert.alert(
      'Nouvelle conversation',
      'Voulez-vous vraiment démarrer une nouvelle conversation ? L\'ancienne conversation sera perdue.',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Nouvelle conversation',
          style: 'destructive',
          onPress: async () => {
            // Supprimer l'ancienne conversation
            await StorageService.deleteConversation(character.id);
            setHasConversation(false);
            // Démarrer une nouvelle conversation
            startConversation();
          }
        }
      ]
    );
  };

  const resumeConversation = () => {
    if (!character || !character.id) {
      Alert.alert('Erreur', 'Impossible de reprendre la conversation. Personnage invalide.');
      return;
    }
    
    console.log('✅ Reprise conversation:', character.name, 'ID:', character.id);
    navigation.navigate('Conversation', { character });
  };

  const handleEditCharacter = () => {
    if (character.isCustom) {
      navigation.navigate('CreateCharacter', { characterToEdit: character });
    } else {
      Alert.alert('Info', 'Seuls les personnages personnalisés peuvent être modifiés');
    }
  };

  const handleDeleteCharacter = async () => {
    if (!character.isCustom) {
      Alert.alert('Info', 'Seuls les personnages personnalisés peuvent être supprimés');
      return;
    }

    Alert.alert(
      'Supprimer le personnage',
      `Voulez-vous vraiment supprimer ${character.name} ?`,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: async () => {
            try {
              await CustomCharacterService.deleteCustomCharacter(character.id);
              Alert.alert('Succès', 'Personnage supprimé', [
                { text: 'OK', onPress: () => navigation.goBack() }
              ]);
            } catch (error) {
              Alert.alert('Erreur', 'Impossible de supprimer le personnage');
            }
          }
        }
      ]
    );
  };

  const getRelationshipLevel = () => {
    if (!relationship) return 'Inconnu';
    const level = relationship.level;
    if (level < 5) return 'Connaissance';
    if (level < 10) return 'Ami';
    if (level < 15) return 'Proche';
    if (level < 20) return 'Très proche';
    return 'Âme sœur';
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.imageContainer}>
        {loadingImage && isPremium ? (
          <View style={styles.imagePlaceholder}>
            <ActivityIndicator size="large" color="#6366f1" />
            <Text style={styles.loadingText}>Génération de l'image...</Text>
          </View>
        ) : characterImage ? (
          <Image source={{ uri: characterImage }} style={styles.characterImage} />
        ) : (
          <View style={styles.imagePlaceholder}>
            <Text style={styles.avatarLarge}>
              {character.name.split(' ').map(n => n[0]).join('')}
            </Text>
          </View>
        )}
      </View>

      <View style={styles.content}>
        <View style={styles.header}>
          <View style={styles.headerInfo}>
            <Text style={styles.name}>{character.name}</Text>
            <Text style={styles.info}>
              {String(character.age || '').includes('ans') ? character.age : `${character.age || '?'} ans`} • {
                character.gender === 'male' ? 'Homme' :
                character.gender === 'female' ? 'Femme' :
                'Non-binaire'
              }
              {character.gender === 'female' && character.bust && ` • Bonnet ${character.bust}`}
              {character.gender === 'male' && character.penis && ` • ${character.penis}`}
            </Text>
          </View>
          {isPremium && (
            <TouchableOpacity
              style={styles.refreshImageButton}
              onPress={generateCharacterImage}
            >
              <Text style={styles.refreshImageText}>🔄</Text>
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.tagsContainer}>
          {(character.tags || []).map((tag, index) => (
            <View key={index} style={styles.tag}>
              <Text style={styles.tagText}>{tag}</Text>
            </View>
          ))}
        </View>

        {/* Tempérament DÉTAILLÉ */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>💭 Tempérament & Personnalité</Text>
          <Text style={styles.sectionContent}>
            {getDetailedTemperament(character)}
          </Text>
        </View>

        {/* Apparence physique ULTRA-DÉTAILLÉE */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>✨ Apparence physique</Text>
          {/* Description narrative générée */}
          <Text style={styles.sectionContent}>
            {generateDetailedDescription(character)}
          </Text>
          
          {/* Détails structurés - format liste */}
          <View style={styles.attributesContainer}>
            {/* Âge */}
            {character.age && (
              <Text style={styles.attributeDetail}>• Âge : {character.age} ans</Text>
            )}
            {/* Taille */}
            {(character.height || extractAttribute(character, 'height')) && (
              <Text style={styles.attributeDetail}>• Taille : {character.height || extractAttribute(character, 'height')}</Text>
            )}
            {/* Morphologie */}
            {(character.bodyType || extractAttribute(character, 'body')) && (
              <Text style={styles.attributeDetail}>• Morphologie : {character.bodyType || extractAttribute(character, 'body')}</Text>
            )}
            {/* Cheveux - DÉTAILLÉ */}
            <Text style={styles.attributeDetail}>
              • Cheveux : {character.hairColor || extractAttribute(character, 'hair') || 'Non spécifié'}
              {character.hairLength ? `, ${character.hairLength}` : ''}
            </Text>
            {/* Yeux */}
            <Text style={styles.attributeDetail}>
              • Yeux : {character.eyeColor || extractAttribute(character, 'eyes') || 'Non spécifié'}
            </Text>
            {/* Poitrine pour femmes - TRÈS DÉTAILLÉ */}
            {character.gender === 'female' && (
              <Text style={styles.attributeDetail}>
                • Poitrine : Bonnet {character.bust || character.bustSize || extractAttribute(character, 'bust') || 'C'}
              </Text>
            )}
            {/* Pénis pour hommes - DÉTAILLÉ */}
            {character.gender === 'male' && (character.penis || character.maleSize || extractAttribute(character, 'male')) && (
              <Text style={styles.attributeDetail}>
                • Attribut : {character.penis || character.maleSize || extractAttribute(character, 'male')} cm
              </Text>
            )}
            {/* Accessoires */}
            {(character.glasses || ((character.physicalDescription || '') + (character.appearance || '')).toLowerCase().includes('lunettes')) && (
              <Text style={styles.attributeDetail}>• Accessoires : Lunettes</Text>
            )}
          </View>
        </View>

        {/* Tenue - Section séparée et détaillée */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>👘 Tenue</Text>
          <Text style={styles.sectionContent}>
            {character.outfit || 'Tenue non spécifiée'}
          </Text>
        </View>

        {character.personality && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>🎭 Personnalité</Text>
            <Text style={styles.sectionContent}>{character.personality}</Text>
          </View>
        )}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📖 Scénario</Text>
          <Text style={styles.sectionContent}>
            {character.scenario || character.background || 'Pas de scénario défini'}
          </Text>
        </View>

        {/* Message d'accroche */}
        {(character.startMessage || character.greeting) && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>💬 Premier message</Text>
            <Text style={styles.sectionContent}>
              {character.startMessage || character.greeting}
            </Text>
          </View>
        )}

        {relationship && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>💖 Relation</Text>
            <View style={styles.relationshipContainer}>
              <View style={styles.statRow}>
                <Text style={styles.statLabel}>Niveau:</Text>
                <View style={styles.statBar}>
                  <View style={[styles.statFill, { width: `${Math.min(relationship.level * 5, 100)}%` }]} />
                </View>
                <Text style={styles.statValue}>{relationship.level}</Text>
              </View>
              <View style={styles.statRow}>
                <Text style={styles.statLabel}>Affection:</Text>
                <View style={styles.statBar}>
                  <View style={[styles.statFill, { width: `${relationship.affection}%`, backgroundColor: '#ec4899' }]} />
                </View>
                <Text style={styles.statValue}>{relationship.affection}%</Text>
              </View>
              <View style={styles.statRow}>
                <Text style={styles.statLabel}>Confiance:</Text>
                <View style={styles.statBar}>
                  <View style={[styles.statFill, { width: `${relationship.trust}%`, backgroundColor: '#10b981' }]} />
                </View>
                <Text style={styles.statValue}>{relationship.trust}%</Text>
              </View>
              <Text style={styles.relationshipLevel}>
                {getRelationshipLevel()}
              </Text>
              <Text style={styles.relationshipStats}>
                {relationship.interactions} interaction(s) • {relationship.experience} XP
              </Text>
            </View>
          </View>
        )}

        {/* Galerie d'images - TOUJOURS VISIBLE */}
        <View style={styles.section}>
          <View style={styles.gallerySectionHeader}>
            <Text style={styles.sectionTitle}>🖼️ Galerie</Text>
            <TouchableOpacity
              onPress={() => navigation.navigate('Gallery', { character })}
            >
              <Text style={styles.seeAllText}>Voir tout ({gallery.length}) →</Text>
            </TouchableOpacity>
          </View>
          {gallery.length === 0 ? (
            <View style={styles.emptyGalleryContainer}>
              <Text style={styles.emptyGalleryIcon}>📸</Text>
              <Text style={styles.emptyGalleryText}>
                Aucune image pour le moment. Générez des images dans les conversations !
              </Text>
            </View>
          ) : (
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={styles.galleryPreview}>
                {gallery.map((imageUrl, index) => (
                  <TouchableOpacity
                    key={index}
                    onPress={() => navigation.navigate('Gallery', { character })}
                  >
                    <Image source={{ uri: imageUrl }} style={styles.galleryThumbnail} />
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>
          )}
        </View>

        <View style={styles.buttonContainer}>
          {hasConversation ? (
            <>
              <TouchableOpacity
                style={styles.resumeButton}
                onPress={resumeConversation}
              >
                <Text style={styles.resumeButtonText}>
                  💬 Reprendre la conversation
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.newConversationButton}
                onPress={startNewConversation}
              >
                <Text style={styles.newConversationButtonText}>
                  ✨ Nouvelle conversation
                </Text>
              </TouchableOpacity>
            </>
          ) : (
            <TouchableOpacity
              style={styles.startButton}
              onPress={startConversation}
            >
              <Text style={styles.startButtonText}>
                ✨ Commencer la conversation
              </Text>
            </TouchableOpacity>
          )}

          {character.isCustom && (
            <View style={styles.customButtonsRow}>
              <TouchableOpacity
                style={styles.editButton}
                onPress={handleEditCharacter}
              >
                <Text style={styles.editButtonText}>✏️ Modifier</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.deleteButton}
                onPress={handleDeleteCharacter}
              >
                <Text style={styles.deleteButtonText}>🗑️ Supprimer</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  imageContainer: {
    width: '100%',
    height: 300,
    backgroundColor: '#e5e7eb',
  },
  characterImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  imagePlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: '#6366f1',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarLarge: {
    fontSize: 80,
    fontWeight: 'bold',
    color: '#fff',
  },
  loadingText: {
    color: '#fff',
    marginTop: 10,
    fontSize: 14,
  },
  content: {
    padding: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 15,
  },
  headerInfo: {
    flex: 1,
  },
  name: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 5,
  },
  info: {
    fontSize: 16,
    color: '#6b7280',
  },
  refreshImageButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#6366f1',
    justifyContent: 'center',
    alignItems: 'center',
  },
  refreshImageText: {
    fontSize: 20,
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 20,
  },
  tag: {
    backgroundColor: '#e0e7ff',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 15,
    marginRight: 8,
    marginBottom: 8,
  },
  tagText: {
    fontSize: 14,
    color: '#4f46e5',
    fontWeight: '500',
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 8,
  },
  sectionContent: {
    fontSize: 15,
    color: '#4b5563',
    lineHeight: 22,
  },
  relationshipContainer: {
    backgroundColor: '#f3f4f6',
    padding: 15,
    borderRadius: 10,
  },
  statRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  statLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4b5563',
    width: 80,
  },
  statBar: {
    flex: 1,
    height: 8,
    backgroundColor: '#e5e7eb',
    borderRadius: 4,
    overflow: 'hidden',
    marginRight: 10,
  },
  statFill: {
    height: '100%',
    backgroundColor: '#6366f1',
  },
  statValue: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#111827',
    width: 40,
    textAlign: 'right',
  },
  relationshipLevel: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#6366f1',
    textAlign: 'center',
    marginTop: 5,
  },
  relationshipStats: {
    fontSize: 12,
    color: '#6b7280',
    textAlign: 'center',
    marginTop: 5,
  },
  buttonContainer: {
    marginTop: 10,
    marginBottom: 20,
  },
  startButton: {
    backgroundColor: '#6366f1',
    borderRadius: 15,
    padding: 18,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  startButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
  },
  resumeButton: {
    backgroundColor: '#10b981',
    borderRadius: 15,
    padding: 18,
    alignItems: 'center',
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  resumeButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
  },
  newConversationButton: {
    backgroundColor: '#6366f1',
    borderRadius: 15,
    padding: 18,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  newConversationButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
  },
  attributesContainer: {
    marginTop: 12,
    backgroundColor: '#f0f4ff',
    borderRadius: 12,
    padding: 12,
  },
  attributeDetail: {
    fontSize: 14,
    color: '#4f46e5',
    fontWeight: '600',
    marginBottom: 6,
    paddingLeft: 4,
  },
  customButtonsRow: {
    flexDirection: 'row',
    marginTop: 10,
  },
  editButton: {
    flex: 1,
    backgroundColor: '#f59e0b',
    borderRadius: 12,
    padding: 15,
    alignItems: 'center',
    marginRight: 10,
  },
  editButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
  },
  deleteButton: {
    flex: 1,
    backgroundColor: '#ef4444',
    borderRadius: 12,
    padding: 15,
    alignItems: 'center',
  },
  deleteButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
  },
  gallerySectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  seeAllText: {
    fontSize: 14,
    color: '#6366f1',
    fontWeight: '600',
  },
  galleryPreview: {
    flexDirection: 'row',
  },
  galleryThumbnail: {
    width: 100,
    height: 100,
    borderRadius: 8,
    marginRight: 10,
  },
  emptyGalleryContainer: {
    padding: 20,
    backgroundColor: '#f3f4f6',
    borderRadius: 10,
    alignItems: 'center',
  },
  emptyGalleryIcon: {
    fontSize: 48,
    marginBottom: 10,
  },
  emptyGalleryText: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
  },
});
