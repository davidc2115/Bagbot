import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import CustomImageAPIService from './CustomImageAPIService';
import StableDiffusionLocalService from './StableDiffusionLocalService';
import AuthService from './AuthService';

class ImageGenerationService {
  constructor() {
    // URL Freebox par défaut
    this.freeboxURL = 'http://88.174.155.230:33437/generate';
    this.lastRequestTime = 0;
    this.minDelay = 1000;
    this.maxRetries = 3;
    
    // STYLES SÉPARÉS - Anime vs Réaliste
    this.animeStyles = [
      'anime style, anime art, manga illustration, clean lineart, vibrant colors',
      'anime artwork, japanese animation style, cel shading, detailed anime',
      'manga style illustration, anime character design, 2D anime art',
      'high quality anime, beautiful anime art, studio ghibli style',
    ];
    
    this.realisticStyles = [
      'photorealistic portrait photography, professional DSLR photo, 85mm lens',
      'hyper-realistic photograph, studio lighting, high-end fashion photography',
      'ultra-realistic photo, natural lighting, professional portrait',
      'cinematic photography, movie still quality, professional photoshoot',
    ];
    
    // PROMPTS DE QUALITÉ ANATOMIQUE RENFORCÉS
    this.anatomyQualityPrompts = [
      'perfect human anatomy, medically correct body proportions, anatomically accurate',
      'exactly two arms, exactly two legs, proper limb attachment points',
      'proper hand anatomy with exactly five fingers on each hand, correct finger length',
      'natural body proportions, realistic human figure, proper skeletal structure',
      'correct facial features, symmetrical face, natural expression, proper eye placement',
      'professional model pose, natural body position, balanced composition, stable stance',
      'single complete human body, one head, two eyes, one nose, one mouth',
    ];
    
    // PROMPTS ANATOMIQUES ULTRA-STRICTS (intégrés au prompt positif)
    this.anatomyStrictPrompt = 
      'ANATOMICALLY PERFECT HUMAN BODY: ' +
      'exactly ONE person, exactly TWO arms attached to shoulders, exactly TWO legs attached to hips, ' +
      'exactly TWO hands with FIVE fingers each, exactly TWO feet with five toes each, ' +
      'ONE head, ONE face, TWO eyes symmetrically placed, ONE nose centered, ONE mouth, TWO ears, ' +
      'proper human proportions, arms extend from shoulders naturally, ' +
      'legs extend from hips naturally, no floating body parts, ' +
      'anatomically correct female or male body, natural muscle structure, ' +
      'correct breast shape and size if female, natural nipple placement, ' +
      'symmetrical body, balanced pose, stable stance';
    
    // NEGATIVE PROMPT ULTRA-COMPLET (pour SD local et Pollinations)
    this.negativePromptFull = 
      'deformed, distorted, disfigured, mutated, bad anatomy, wrong anatomy, anatomical errors, ' +
      'extra limbs, missing limbs, three arms, four arms, three legs, four legs, extra body parts, ' +
      'floating limbs, disconnected limbs, merged limbs, fused body parts, ' +
      'malformed hands, twisted hands, backwards hands, extra fingers, missing fingers, ' +
      'fused fingers, six fingers, seven fingers, too many fingers, mutated hands, bad hands, ' +
      'clawed hands, webbed fingers, malformed feet, extra toes, ' +
      'extra arms, extra legs, duplicate body parts, clone, conjoined, ' +
      'two heads, two faces, multiple people, crowd, group, ' +
      'malformed breasts, misshapen breasts, uneven breasts, extra nipples, ' +
      'malformed face, asymmetrical face, cross-eyed, misaligned eyes, third eye, ' +
      'double chin overlapping, long neck, twisted neck, broken neck, ' +
      'blurry, low quality, pixelated, watermark, signature, text, logo, ' +
      'bad proportions, giant head, tiny head, long arms, short arms, ' +
      'jpeg artifacts, compression artifacts, noise, grainy, ' +
      'ugly, grotesque, horror, creepy, nightmare, zombie';
    
    // PROMPT QUALITÉ PARFAITE - Pour images sans défauts
    this.perfectQualityPrompt = 
      'masterpiece, best quality, ultra detailed, extremely detailed, ' +
      'perfect anatomy, anatomically correct, perfect proportions, ' +
      'perfect hands, five fingers on each hand, correct finger count, ' +
      'perfect face, beautiful face, symmetrical face, detailed eyes, ' +
      'flawless skin, smooth skin, clear skin, no blemishes, ' +
      'professional lighting, studio lighting, perfect lighting, ' +
      'sharp focus, high resolution, 8K, ultra HD, ' +
      'single person, one character, solo, one subject only';
    
    // PROMPT QUALITÉ ANIME PARFAIT
    this.perfectAnimePrompt = 
      'masterpiece anime art, best quality anime, perfect anime illustration, ' +
      'clean lineart, perfect lines, no artifacts, vibrant colors, ' +
      'professional anime artwork, studio quality, detailed anime face, ' +
      'beautiful anime eyes, perfect anime proportions, ' +
      'single character, solo character, one person';
    
    // PROMPT QUALITÉ RÉALISTE PARFAIT
    this.perfectRealisticPrompt = 
      'ultra realistic photo, photorealistic, hyperrealistic, ' +
      'professional photography, DSLR quality, 8K resolution, ' +
      'perfect skin texture, realistic skin, natural lighting, ' +
      'professional portrait, magazine quality, flawless, ' +
      'single person, solo portrait, one subject';
    
    // === GRANDE VARIÉTÉ DE POSITIONS ===
    this.positions = {
      standing: [
        'standing confidently, hand on hip, weight on one leg',
        'standing tall against wall, one leg bent, seductive lean',
        'standing in doorway, silhouette pose, dramatic lighting',
        'standing by window, natural light, elegant posture',
        'standing with arms raised above head, stretching sensually',
        'standing from behind, looking over shoulder, back view',
        'standing side profile, elegant curves emphasized',
      ],
      sitting: [
        'sitting elegantly on velvet armchair, legs crossed',
        'sitting on bed edge, legs slightly apart, inviting',
        'sitting on floor, knees up, casual intimate',
        'sitting in bathtub, surrounded by bubbles',
        'sitting at vanity mirror, applying makeup',
        'sitting cross-legged on silk sheets',
        'sitting with legs to side, graceful pose',
      ],
      lying: [
        'lying on back on bed, arms above head, relaxed',
        'lying on stomach, feet up, playful pose',
        'lying on side, propped on elbow, curves emphasized',
        'lying in bathtub, only head and shoulders visible',
        'lying on fur rug, luxurious sensual',
        'lying sprawled on silk sheets, carefree',
        'lying with one knee bent, inviting pose',
      ],
      kneeling: [
        'kneeling on bed, sitting back on heels',
        'kneeling upright, hands on thighs',
        'kneeling forward, hands on bed, arched back',
        'kneeling side view, elegant profile',
        'kneeling from behind, looking back over shoulder',
      ],
      bending: [
        'bending forward slightly, showing cleavage',
        'bent over vanity, looking in mirror',
        'bending to pick something up, rear view',
        'arching back dramatically, sensual curve',
        'leaning forward on hands and knees',
      ],
      special: [
        'stretching like just woke up, natural beauty',
        'getting out of shower, water droplets on skin',
        'stepping into or out of bathtub',
        'undressing, clothing halfway off',
        'wrapped in sheet or towel, partially fallen',
        'exercising, yoga pose, flexible body',
        'dancing sensually, movement captured',
      ],
    };
    
    // === GRANDE VARIÉTÉ DE LIEUX ===
    this.locations = {
      bedroom: [
        'in luxurious master bedroom, silk sheets, romantic atmosphere',
        'on king-size bed with satin pillows, intimate setting',
        'bedroom with fairy lights, dreamy ambiance',
        'modern minimalist bedroom, clean aesthetic',
        'vintage boudoir room, antique furniture, elegant',
      ],
      bathroom: [
        'in marble bathroom, steam from hot water',
        'near clawfoot bathtub, vintage elegant',
        'in modern shower, glass walls, water streaming',
        'by bathroom mirror, steamy atmosphere',
        'in jacuzzi with bubbles, relaxing',
      ],
      pool: [
        'by infinity pool, sunset background',
        'in swimming pool, wet body glistening',
        'poolside on lounger, tropical setting',
        'near waterfall pool feature, exotic',
      ],
      nature: [
        'on private beach, waves in background',
        'in forest clearing, natural sunlight',
        'near lake at sunset, golden hour',
        'in flower field, romantic natural setting',
        'on balcony overlooking ocean',
      ],
      interior: [
        'in penthouse with city view at night',
        'by fireplace, warm flickering light',
        'on leather couch in living room',
        'in artist studio with natural light',
        'in front of large window, silhouette',
        'on fur rug near fireplace',
        'in walk-in closet, mirror reflection',
      ],
      special: [
        'hotel room with rose petals on bed',
        'yacht deck at sunset, luxury atmosphere',
        'private sauna, steamy hot atmosphere',
        'backstage dressing room, glamorous',
        'photo studio with professional lighting',
      ],
    };
    
    // === VARIÉTÉ DE TYPES DE PHOTOS ET ANGLES NSFW ===
    this.shotTypes = [
      // Vues de face sexy
      'full body frontal shot showing entire figure, breasts and body visible',
      'frontal view facing camera, confident sexy pose, cleavage prominent',
      'front view, legs slightly spread, inviting pose',
      // Vues de profil sensuelles
      'side profile view, curves emphasized, breasts silhouette visible',
      'profile shot showing breast shape and butt curve',
      'three-quarter angle, one breast visible, mysterious allure',
      // Vues de dos érotiques
      'back view, showing full butt and spine, looking over shoulder seductively',
      'rear view bent over slightly, butt emphasized, arched back',
      'from behind on all fours, rear fully visible, looking back',
      // Zooms NSFW spécifiques
      'close-up on breasts and cleavage, nipples visible or implied',
      'zoomed on butt and hips, rear focus, thong visible',
      'focus on spread legs, intimate view',
      'upper body close-up, bare breasts prominent',
      'close-up between legs, intimate perspective',
      // Poses aguichantes
      'lying on bed legs open, inviting pose, sensual',
      'on knees looking up, submissive sexy pose',
      'straddling position, dominant sexy pose',
      'arched back showing breasts, erotic pose',
      // Angles voyeuristes
      'from above looking down at body, voyeuristic',
      'low angle looking up between legs, erotic perspective',
      'mirror reflection showing front and back, voyeuristic',
      'caught undressing, candid sexy moment',
    ];
    
    // === VARIÉTÉ D'ÉCLAIRAGES ===
    this.lightingStyles = [
      'soft romantic candlelight, warm golden glow',
      'natural window light, gentle shadows',
      'dramatic chiaroscuro, strong contrast',
      'neon light pink and blue, modern aesthetic',
      'golden hour sunset light, magical',
      'studio professional lighting, flawless',
      'moonlight through window, ethereal blue',
      'fireplace warm glow, intimate cozy',
      'backlit silhouette, mysterious',
      'soft diffused light, dreamy atmosphere',
    ];
    
    // === VARIÉTÉ D'AMBIANCES ===
    this.moods = [
      'romantic passionate atmosphere, desire in the air',
      'playful teasing mood, mischievous smile',
      'elegant sophisticated, classy sensuality',
      'wild untamed energy, passionate intensity',
      'soft tender intimate, loving gaze',
      'mysterious seductive, enigmatic allure',
      'confident powerful, dominant presence',
      'innocent sweet, subtle sensuality',
      'hot steamy, intense desire',
      'relaxed comfortable, natural beauty',
    ];
    
    // TENUES NSFW ALÉATOIRES - TRÈS VARIÉES
    this.nsfwOutfits = [
      'wearing sexy lingerie, lace underwear',
      'wearing silk robe, partially open',
      'topless, bare chest visible',
      'wearing only towel',
      'completely nude, artistic nudity',
      'wearing see-through clothing',
      'wearing bikini, swimsuit',
      'lingerie visible under clothing',
    ];
    
    // POSTURES NSFW ALÉATOIRES
    this.nsfwPoses = [
      'lying on bed, seductive pose',
      'sitting elegantly, legs crossed',
      'standing gracefully, hand on hip',
      'kneeling, looking up',
      'arching back, sensual pose',
      'leaning against wall, alluring',
      'reclining on couch, relaxed',
      'stretching, body exposed',
    ];
  }
  
  /**
   * Sélectionne un élément aléatoire d'un tableau
   */
  randomChoice(array) {
    return array[Math.floor(Math.random() * array.length)];
  }
  
  /**
   * Sélectionne un élément aléatoire d'une catégorie dans un objet
   */
  randomFromCategory(obj) {
    const categories = Object.keys(obj);
    const category = categories[Math.floor(Math.random() * categories.length)];
    return this.randomChoice(obj[category]);
  }
  
  /**
   * Génère une combinaison unique de position + lieu + éclairage + ambiance
   */
  generateVariedSceneElements() {
    return {
      position: this.randomFromCategory(this.positions),
      location: this.randomFromCategory(this.locations),
      shotType: this.randomChoice(this.shotTypes),
      lighting: this.randomChoice(this.lightingStyles),
      mood: this.randomChoice(this.moods),
    };
  }

  /**
   * Retourne une tenue basée sur le niveau de relation
   * REFAIT SELON DEMANDE:
   * - Niveau 1: Habillé (robes, jupes, tops, décolletés)
   * - Niveau 2: Provocant (nuisettes, robes moulantes, mini-jupes, collants, bas, talons, transparent)
   * - Niveau 3: Lingerie (sous-vêtements, bikini, nuisette transparente)
   * - Niveau 4+: De plus en plus explicite
   */
  getOutfitByLevel(level) {
    const lvl = Math.min(Math.max(1, level || 1), 10);
    const outfits = {
      // === NIVEAU 1 - HABILLÉ SEXY (robes, jupes, tops, décolletés) ===
      1: [
        // Robes variées
        'wearing elegant red cocktail dress with plunging neckline, cleavage visible',
        'wearing tight black little dress, curves emphasized, short length',
        'wearing flowing summer dress with thin straps, shoulders bare',
        'wearing bodycon dress hugging every curve, side slit showing leg',
        'wearing off-shoulder evening gown, elegant and sexy',
        'wearing wrap dress with deep V showing cleavage, form-fitting',
        // Jupes variées
        'wearing short pleated skirt with tight blouse, legs visible',
        'wearing pencil skirt with silk blouse unbuttoned, professional sexy',
        'wearing denim mini skirt with crop top, casual and hot',
        'wearing leather skirt with lace top, edgy sexy',
        // Tops et décolletés
        'wearing low-cut top showing generous cleavage, jeans',
        'wearing crop top exposing toned midriff, high-waisted pants',
        'wearing halter top with plunging neckline, back exposed',
        'wearing tight sweater emphasizing bust, casual chic',
        'wearing corset top with jeans, cinched waist, cleavage pushed up',
        'wearing tank top with visible bra straps, casual sexy',
      ],
      // === NIVEAU 2 - PROVOCANT (nuisettes, robes moulantes, collants, bas, talons) ===
      2: [
        // Nuisettes et robes de soirée moulantes
        'wearing silky short nightgown barely covering thighs, suggestive',
        'wearing ultra-tight evening dress, every curve visible, almost see-through',
        'wearing satin slip dress clinging to body, no bra visible',
        'wearing sheer evening gown with strategic coverage, glamorous',
        // Mini-jupes provocantes
        'wearing extremely short mini-skirt, panties almost visible when sitting',
        'wearing leather mini-skirt with thigh-high boots, dominatrix vibe',
        'wearing pleated micro-skirt with garter belt visible underneath',
        // Collants, bas et talons
        'wearing sheer black stockings with garter belt, high heels, short skirt',
        'wearing fishnet stockings with suspenders, visible under dress',
        'wearing thigh-high boots with mini dress, powerful sexy',
        'wearing stiletto heels with ankle straps, showing off legs',
        // Tenues transparentes/suggestives
        'wearing semi-transparent blouse, bra visible underneath',
        'wearing mesh top over lace bra, skin visible through fabric',
        'wearing backless dress with no underwear, spine exposed',
        'wearing side-boob revealing top, daring fashion',
        'wearing wet-look leggings with crop top, shiny and tight',
      ],
      // === NIVEAU 3 - LINGERIE (sous-vêtements, bikini, nuisette transparente) ===
      3: [
        // Sous-vêtements classiques
        'wearing matching lace bra and panties set, feminine and sexy',
        'wearing push-up bra and thong, cleavage emphasized',
        'wearing satin underwear set, elegant and sensual',
        'wearing cotton panties and sports bra, innocent sexy',
        // Bikinis variés
        'wearing string bikini, minimal coverage, beach ready',
        'wearing triangle bikini, ties on sides, sexy vacation look',
        'wearing high-cut bikini bottom with bandeau top',
        'wearing micro bikini barely covering essentials',
        // Nuisettes et lingerie élaborée
        'wearing sheer transparent negligee, body visible through fabric',
        'wearing lace babydoll with matching thong, romantic',
        'wearing see-through chemise, nipples visible through lace',
        'wearing silk robe open over lingerie, teasing',
        // Ensembles lingerie
        'wearing corset with garter belt and stockings, burlesque style',
        'wearing bodysuit lingerie, lace detailing, one-piece sexy',
        'wearing bralette and high-waist panties, modern lingerie',
        'wearing crotchless panties with demi-cup bra, erotic lingerie',
      ],
      // === NIVEAU 4 - TOPLESS ===
      4: [
        'topless, bare breasts fully visible, wearing only lace panties',
        'nude from waist up, breasts exposed, wearing thong and heels',
        'topless with hands on hips confidently, wearing only stockings',
        'bare chested, wearing only unbuttoned jeans, casual topless',
        'topless wearing garter belt and stockings only, boudoir',
        'upper body completely nude, sheet covering from waist down',
        'topless in steamy shower, water on breasts',
        'nude torso, wearing only jewelry necklace between breasts',
        'topless lying on stomach, back and side of breast visible',
        'breasts fully exposed, holding panties playfully',
        'topless by pool in just bikini bottom, wet skin',
        'completely topless, nipples erect, confident pose',
      ],
      // === NIVEAU 5 - NU ARTISTIQUE ===
      5: [
        'completely nude, full frontal artistic pose, natural beauty',
        'fully naked lying elegantly on silk sheets, curves visible',
        'nude confident standing pose, nothing hidden, boudoir lighting',
        'naked in bathtub, bubbles strategically placed, relaxed',
        'artistic nude on fur rug, classic glamour photography',
        'nude by window, natural light on body, ethereal',
        'completely naked kneeling pose, graceful feminine',
        'nude from behind, full back and butt visible, looking over shoulder',
        'naked sitting cross-legged on bed, meditation nude',
        'nude stretched out on bed, morning light, lazy sensual',
        'fully nude in mirror reflection, voyeuristic artistic',
        'naked outdoors, natural setting, free spirit nude',
      ],
      // === NIVEAU 6+ - DE PLUS EN PLUS EXPLICITE ===
      6: [
        'sensual nude lying invitingly on bed, legs slightly parted',
        'erotic nude, passionate expression, touching self',
        'naked on silk sheets, body glistening with oil, sensual',
        'nude in candlelight, hands exploring own body',
        'fully exposed lying on stomach, butt raised, arched back',
        'naked cuddling pillow between legs, vulnerable sexy',
        'nude stretching provocatively, body fully displayed',
        'completely bare in hot tub, breasts above water, steamy',
      ],
      7: [
        'sexy nude pose, legs parted invitingly, bedroom eyes',
        'hot erotic nude on bed, hand between thighs',
        'naked on hands and knees, looking back seductively, rear view',
        'nude spread on leather couch, luxurious explicit',
        'completely exposed in shower, hands on body, wet',
        'naked with legs spread, touching intimately',
        'nude provocative pose, fingers near sex, teasing',
        'fully bare bent over, rear fully exposed and inviting',
      ],
      8: [
        'explicit nude pose, legs wide spread, sex visible',
        'extremely sexy naked, open provocative pose, nothing hidden',
        'nude wide open on bed, fingers spreading labia',
        'naked in very intimate position, explicit view',
        'completely exposed masturbation pose, erotic',
        'nude with legs up and spread, explicit full view',
        'explicit position, touching sex openly',
        'naked spread eagle on bed, maximum explicit exposure',
      ],
      9: [
        'ultra erotic nude, very explicit pose, penetration implied',
        'intensely sexual nude position, toys visible',
        'maximum exposure nude, legs wide, fingers inside',
        'extremely explicit naked pose, orgasmic expression',
        'nude in most intimate position, masturbating openly',
        'ultra revealing pose, complete explicit exposure',
        'sexually explicit nude, intense self-pleasure',
        'fully spread nude, ultimate explicit intimacy',
      ],
      10: [
        'maximum explicit nude, most provocative pose, extreme erotic',
        'ultimate erotic nude, nothing hidden, explicit masturbation',
        'absolute maximum exposure, orgasm captured, intensely sexual',
        'most explicit possible nude pose, complete vulnerability',
        'ultimate intimacy pose, toy penetration, everything visible',
        'maximum erotic exposure, passionate explicit climax',
        'most provocative nude imaginable, total explicit display',
        'extreme explicit position, ultimate sensual pleasure',
      ],
    };
    
    const effectiveLevel = lvl > 10 ? 10 : lvl;
    const levelOutfits = outfits[effectiveLevel] || outfits[1];
    return levelOutfits[Math.floor(Math.random() * levelOutfits.length)];
  }

  /**
   * Retourne une pose basée sur le niveau de relation
   * POSES NSFW VARIÉES: aguichante → sexy → topless → nue → explicite
   */
  getPoseByLevel(level) {
    const lvl = Math.min(Math.max(1, level || 1), 10);
    const poses = {
      // === NIVEAU 1 - POSES AGUICHANTES (habillée sexy) ===
      1: [
        'standing confidently, hand on hip, showing off dress, flirty smile',
        'sitting with legs crossed elegantly, cleavage visible, seductive look',
        'leaning forward showing deep cleavage, teasing smile',
        'bending over slightly, skirt riding up, playful pose',
        'lying on bed fully clothed, legs slightly apart, inviting',
        'standing in doorway, dress hugging curves, mysterious',
        'sitting on chair backwards, looking over shoulder, sexy',
        'walking towards camera, hips swaying, confident strut',
        'stretching arms up, shirt rising showing midriff, casual sexy',
        'adjusting dress strap, shoulder exposed, coy expression',
      ],
      // === NIVEAU 2 - POSES SEXY (tenues provocantes) ===
      2: [
        'lying on bed in lingerie, propped on elbow, bedroom eyes',
        'standing in sheer nightgown, body silhouette visible',
        'kneeling on bed in sexy outfit, hands on thighs',
        'bending over in mini skirt, rear visible, looking back',
        'sitting on bed edge in stockings and heels, legs apart slightly',
        'standing against wall in tight dress, curves emphasized',
        'lying on stomach in negligee, feet up, teasing',
        'straddling chair in revealing outfit, confident',
        'undressing slowly, dress half off shoulder',
        'in bathrobe loosely tied, hint of body underneath',
        'posing in mirror wearing lingerie, admiring reflection',
        'stretching in see-through top, nipples visible through fabric',
      ],
      // === NIVEAU 3 - POSES TOPLESS (lingerie/topless) ===
      3: [
        'topless, covering breasts with arms, teasing shy pose',
        'in bra and panties, unhooking bra, about to remove',
        'bare breasted, hands on hips, confident topless pose',
        'lying topless on bed, one arm across chest, sensual',
        'kneeling topless, breasts fully visible, submissive pose',
        'standing topless by window, natural light on breasts',
        'topless from behind, looking over shoulder, back visible',
        'removing bra, breasts being revealed, sexy striptease',
        'topless lying on stomach, side of breast visible',
        'sitting topless on bed, knees up, casual nude',
        'topless stretching, breasts lifted, morning pose',
        'in only panties, topless, playing with hair',
      ],
      // === NIVEAU 4 - POSES NUES ARTISTIQUES ===
      4: [
        'fully nude standing, hands at sides, confident nude',
        'naked lying on silk sheets, elegant artistic pose',
        'nude kneeling, back arched, breasts prominent',
        'completely naked on all fours, looking back seductively',
        'nude lying on back, one knee up, relaxed',
        'standing nude in profile, curves silhouetted',
        'naked sitting cross-legged, natural casual nude',
        'nude bent over, rear view, spine curved',
        'lying nude on fur rug, glamour pose',
        'naked in bathtub, bubbles barely covering',
        'nude stretching on bed, full body visible',
        'standing naked against wall, frontal view',
      ],
      // === NIVEAU 5 - POSES NUES SENSUELLES ===
      5: [
        'nude lying with legs slightly parted, inviting',
        'naked on bed, touching own body sensually',
        'nude spread on couch, one hand between thighs',
        'lying nude, legs open, intimate view',
        'naked kneeling, legs apart, frontal exposed',
        'nude arching back on bed, breasts up, legs spread',
        'completely naked squatting, full frontal view',
        'nude on all fours, rear presented, looking back',
        'lying nude with legs in air, spread',
        'naked sitting with legs wide open',
        'nude lying on side, top leg raised high',
        'standing nude, legs apart, hands on thighs',
      ],
      // === NIVEAU 6+ - POSES EXPLICITES PROGRESSIVES ===
      6: [
        'explicit nude, legs spread wide on bed, everything visible',
        'naked bent over, rear fully exposed, looking back invitingly',
        'nude lying spread eagle, complete frontal exposure',
        'on knees, legs spread, touching intimately',
        'lying nude, fingers between legs, self-pleasure pose',
        'naked doggy position, rear view, presented',
        'spread open on chair, fully exposed, inviting',
        'nude with legs over head, extreme flexibility, exposed',
      ],
      7: [
        'very explicit spread, fingers spreading labia',
        'maximum exposure nude, masturbation pose',
        'extreme spread position, penetration implied',
        'nude touching sex openly, erotic pose',
        'legs spread maximum, everything on display',
        'explicit rear view, bent over presenting',
        'self-pleasure pose, fingers inside',
        'ultimate exposure, orgasmic expression',
      ],
      8: [
        'ultra explicit pose, sex toy visible',
        'maximum spread with penetration',
        'extreme masturbation pose, intense pleasure',
        'most explicit position, nothing hidden',
        'climax pose, orgasm captured',
        'double penetration implied, toys visible',
        'extreme spread, wet and aroused visible',
        'ultimate explicit, peak eroticism',
      ],
      9: [
        'absolute maximum explicit, toys in use',
        'extreme orgasm pose, intense climax',
        'most revealing possible, multiple toys',
        'ultimate sexual position, peak explicit',
        'maximum penetration pose, intense',
        'extreme pleasure captured, orgasmic',
        'most provocative imaginable, everything shown',
        'ultimate erotic climax pose',
      ],
      10: [
        'peak explicit content, maximum everything',
        'ultimate orgasm captured, intense climax',
        'most extreme pose possible, total exposure',
        'absolute maximum eroticism, nothing hidden',
        'ultimate sexual peak, extreme pleasure',
        'maximum explicit climax, toys and fingers',
        'most provocative possible, intense orgasm',
        'absolute ultimate explicit pose, peak erotic',
      ],
    };
    
    const effectiveLevel = lvl > 10 ? 10 : lvl;
    const levelPoses = poses[effectiveLevel] || poses[1];
    return levelPoses[Math.floor(Math.random() * levelPoses.length)];
  }

  /**
   * Parse l'âge du personnage (gère les formats fantastiques)
   * Ex: "300 ans (apparence 25)" -> 25
   * Ex: "42" -> 42
   * Ex: "Immortelle (apparence 26)" -> 26
   */
  parseCharacterAge(ageValue) {
    const ageStr = String(ageValue || '');
    
    // Chercher d'abord "apparence XX" pour les personnages fantastiques
    const appearanceMatch = ageStr.match(/apparence\s*(\d+)/i);
    if (appearanceMatch) {
      return parseInt(appearanceMatch[1]);
    }
    
    // Sinon prendre le premier nombre trouvé
    const numMatch = ageStr.match(/(\d+)/);
    if (numMatch) {
      const age = parseInt(numMatch[1]);
      // Si l'âge est > 100, c'est probablement un âge fantastique
      // Utiliser une apparence raisonnable basée sur l'âge
      if (age > 100) {
        return Math.min(Math.max(Math.floor(age / 10), 20), 50);
      }
      return age;
    }
    
    return 25; // Âge par défaut
  }

  /**
   * Choisit un style aléatoire (anime ou réaliste)
   * @returns {Object} { style: string, isRealistic: boolean }
   */
  getRandomStyle() {
    // 50% chance anime, 50% chance réaliste
    const isRealistic = Math.random() > 0.5;
    
    if (isRealistic) {
      const style = this.realisticStyles[Math.floor(Math.random() * this.realisticStyles.length)];
      return { style, isRealistic: true };
    } else {
      const style = this.animeStyles[Math.floor(Math.random() * this.animeStyles.length)];
      return { style, isRealistic: false };
    }
  }

  /**
   * Construit les prompts de qualité pour images réalistes
   */
  buildRealisticQualityPrompts() {
    // Sélectionner plusieurs prompts de qualité anatomique
    const selectedPrompts = [];
    const shuffled = [...this.anatomyQualityPrompts].sort(() => Math.random() - 0.5);
    selectedPrompts.push(shuffled[0], shuffled[1]);
    
    return selectedPrompts.join(', ') + ', ' + this.antiDeformationPrompts;
  }

  /**
   * Extrait le contexte de la conversation pour l'image
   * Détecte: lieu, position, tenue, action en cours
   */
  extractConversationContext(recentMessages = []) {
    if (!recentMessages || recentMessages.length === 0) {
      return { location: null, position: null, outfit: null, action: null };
    }
    
    // Analyser les 5 derniers messages
    const lastMessages = recentMessages.slice(-5).map(m => m.content?.toLowerCase() || '').join(' ');
    
    // === DÉTECTION DU LIEU ===
    const locations = {
      // Intérieur maison
      'chambre|bedroom|lit|bed|draps': 'in bedroom, on comfortable bed, intimate setting',
      'cuisine|kitchen|comptoir': 'in kitchen, domestic setting',
      'salon|living room|canapé|sofa': 'in living room, on couch, relaxed atmosphere',
      'salle de bain|bathroom|douche|shower|bain|bath': 'in bathroom, wet environment, steamy atmosphere',
      'bureau|office|travail': 'in office, professional setting',
      // Extérieur
      'jardin|garden|dehors|outside|terrasse': 'outside in garden, natural light, outdoor setting',
      'plage|beach|mer|sea|sable': 'at the beach, ocean view, sandy environment',
      'forêt|forest|bois|nature': 'in forest, natural surroundings, trees',
      'piscine|pool|eau': 'by the pool, water nearby, summer setting',
      // Lieux publics
      'restaurant|café|bar': 'in restaurant or cafe, ambient lighting',
      'hôtel|hotel|suite': 'in luxury hotel room, elegant decor',
      'voiture|car|siège': 'in car, vehicle interior',
      'ascenseur|elevator': 'in elevator, confined space',
    };
    
    let detectedLocation = null;
    for (const [keywords, location] of Object.entries(locations)) {
      if (new RegExp(keywords, 'i').test(lastMessages)) {
        detectedLocation = location;
        break;
      }
    }
    
    // === DÉTECTION DE LA POSITION ===
    const positions = {
      'allongé|couché|lying|lying down': 'lying down, horizontal position',
      'assis|sitting|assise': 'sitting position',
      'debout|standing': 'standing upright',
      'à genoux|kneeling|agenouillé': 'kneeling position',
      'quatre pattes|all fours|doggy': 'on all fours position',
      'penché|bent over|bending': 'bent over, leaning forward',
      'contre le mur|against wall': 'against the wall',
      'sur le dos|on back': 'lying on back, face up',
      'sur le ventre|on stomach': 'lying on stomach, face down',
      'chevauch|straddl|riding': 'straddling position',
    };
    
    let detectedPosition = null;
    for (const [keywords, position] of Object.entries(positions)) {
      if (new RegExp(keywords, 'i').test(lastMessages)) {
        detectedPosition = position;
        break;
      }
    }
    
    // === DÉTECTION DE LA TENUE ===
    const outfits = {
      'nue?|naked|nu ': 'completely naked, nude',
      'lingerie|sous-vêtements|underwear': 'wearing sexy lingerie',
      'robe|dress': 'wearing a dress',
      'jupe|skirt': 'wearing a skirt',
      'jean|pantalon|pants': 'wearing jeans/pants',
      'maillot|bikini|swimsuit': 'wearing bikini/swimsuit',
      'pyjama|nuisette|nightgown': 'wearing nightwear',
      'uniforme|uniform': 'wearing uniform',
      'costume|suit': 'wearing formal suit',
      'topless|seins nus': 'topless, bare breasts',
    };
    
    let detectedOutfit = null;
    for (const [keywords, outfit] of Object.entries(outfits)) {
      if (new RegExp(keywords, 'i').test(lastMessages)) {
        detectedOutfit = outfit;
        break;
      }
    }
    
    // === DÉTECTION DE L'ACTION ===
    const actions = {
      'embrass|kiss': 'romantic kissing moment',
      'câlin|hug|enlacer': 'embracing, hugging',
      'caress|touche|touch': 'being touched sensually',
      'déshabill|undress': 'undressing, removing clothes',
      'danse|dancing': 'dancing sensually',
      'regard|looking|regarde': 'making eye contact, looking seductively',
      'sourit|smile': 'smiling warmly',
      'rougit|blush': 'blushing shyly',
    };
    
    let detectedAction = null;
    for (const [keywords, action] of Object.entries(actions)) {
      if (new RegExp(keywords, 'i').test(lastMessages)) {
        detectedAction = action;
        break;
      }
    }
    
    console.log(`📍 Contexte détecté - Lieu: ${detectedLocation || 'auto'}, Position: ${detectedPosition || 'auto'}, Tenue: ${detectedOutfit || 'auto'}`);
    
    return {
      location: detectedLocation,
      position: detectedPosition,
      outfit: detectedOutfit,
      action: detectedAction,
    };
  }

  /**
   * Construit une description physique ULTRA-DÉTAILLÉE pour les prompts d'image
   * Inclut: visage, cheveux (couleur, longueur, type), corps, peau, attributs
   */
  buildUltraDetailedPhysicalPrompt(character, isRealistic = false) {
    const parts = [];
    const appearance = (
      (character.appearance || '') + ' ' + 
      (character.physicalDescription || '') + ' ' +
      (character.bodyType || '') + ' ' +
      (character.imagePrompt || '')
    ).toLowerCase();
    
    // === 1. GENRE ===
    if (character.gender === 'female') {
      parts.push(isRealistic ? 'beautiful real woman, female' : 'beautiful anime woman, female character');
    } else if (character.gender === 'male') {
      parts.push(isRealistic ? 'handsome real man, male' : 'handsome anime man, male character');
    } else {
      const nbType = this.getNonBinaryAppearanceType(character);
      parts.push(`androgynous ${nbType}-presenting person`);
    }
    
    // === 2. ÂGE ===
    const age = this.parseCharacterAge(character.age) || 25;
    parts.push(`${age} years old`);
    
    // === 3. FORME DU VISAGE ===
    const faceShapes = {
      'ovale|oval': 'oval face shape',
      'rond|round face': 'round soft face',
      'carré|square': 'square strong jawline',
      'coeur|heart': 'heart-shaped face',
      'long|oblong': 'long elegant face',
      'diamant|diamond': 'diamond-shaped face with high cheekbones',
      'triangul': 'triangular face',
      'angul': 'angular defined features',
      'doux|soft': 'soft gentle facial features',
    };
    let faceShape = 'harmonious face';
    for (const [key, value] of Object.entries(faceShapes)) {
      if (new RegExp(key, 'i').test(appearance)) {
        faceShape = value;
        break;
      }
    }
    parts.push(faceShape);
    
    // === 4. COULEUR DE PEAU ===
    const skinColors = {
      'porcelaine|très pale|très claire': 'porcelain pale white skin',
      'pale|claire|fair|pâle': 'fair light skin',
      'ivoire|ivory': 'ivory cream skin',
      'pêche|peach|rosé': 'peachy rosy skin',
      'bronzé|tan|doré|golden': 'tanned golden sun-kissed skin',
      'olive|méditerran': 'olive mediterranean skin',
      'caramel|métis': 'warm caramel mixed skin',
      'marron|brown|brun': 'warm brown skin',
      'ébène|noir|dark|foncé': 'beautiful dark ebony skin',
      'asiat|asian|jaune': 'asian warm-toned skin',
      'latin|hispani': 'latin warm skin tone',
    };
    let skinColor = 'natural healthy skin';
    for (const [key, value] of Object.entries(skinColors)) {
      if (new RegExp(key, 'i').test(appearance)) {
        skinColor = value;
        break;
      }
    }
    parts.push(skinColor);
    
    // === 5. TYPE DE PEAU ===
    const skinTypes = {
      'taches de rousseur|freckles': 'with cute freckles',
      'grain de beauté|beauty mark|mole': 'with beauty mark',
      'lisse|smooth': 'smooth flawless skin',
      'velout|velvet': 'velvety soft skin',
      'satin|satiny': 'satiny glowing skin',
    };
    for (const [key, value] of Object.entries(skinTypes)) {
      if (new RegExp(key, 'i').test(appearance)) {
        parts.push(value);
        break;
      }
    }
    
    // === 6. COULEUR DES CHEVEUX ===
    const hairColor = character.hairColor || this.extractFromAppearance(character, 'hair') || 'brown';
    parts.push(`${hairColor} hair`);
    
    // === 7. LONGUEUR DES CHEVEUX ===
    const hairLengths = {
      'très long|very long|hanches|waist': 'extremely long hair reaching waist',
      'long|longs': 'long flowing hair',
      'mi-long|shoulder|épaules': 'medium shoulder-length hair',
      'court|short': 'short stylish hair',
      'très court|very short|pixie': 'very short pixie cut',
      'carré|bob': 'sleek bob haircut',
      'rasé|shaved|buzz': 'shaved/buzzcut hair',
    };
    let hairLength = 'medium length hair';
    const hairLengthField = (character.hairLength || '').toLowerCase();
    for (const [key, value] of Object.entries(hairLengths)) {
      if (new RegExp(key, 'i').test(hairLengthField) || new RegExp(key, 'i').test(appearance)) {
        hairLength = value;
        break;
      }
    }
    parts.push(hairLength);
    
    // === 8. TYPE DE CHEVEUX ===
    const hairTypes = {
      'crépu|kinky|afro|coily': 'kinky coily afro-textured hair',
      'frisé|curly|boucl': 'curly bouncy hair',
      'ondulé|wavy': 'wavy flowing hair',
      'lisse|straight|raide': 'straight sleek hair',
      'épais|thick|volum': 'thick voluminous hair',
      'fin|thin|fine': 'fine delicate hair',
      'soyeux|silky': 'silky smooth hair',
      'brillant|shiny': 'shiny glossy hair',
    };
    for (const [key, value] of Object.entries(hairTypes)) {
      if (new RegExp(key, 'i').test(hairLengthField) || new RegExp(key, 'i').test(appearance)) {
        parts.push(value);
        break;
      }
    }
    
    // === 9. COULEUR DES YEUX ===
    const eyeColor = character.eyeColor || 'expressive eyes';
    parts.push(`${eyeColor} eyes`);
    
    // === 10. MORPHOLOGIE / BODY TYPE ===
    const bodyTypes = {
      'très mince|very slim|maigre': 'very slim thin body',
      'mince|slim|élancé|slender': 'slim slender body',
      'athlétique|athletic|musclé|toned|fit': 'athletic toned fit body',
      'moyenne|average|normal': 'average balanced body',
      'voluptu|curvy|généreuse': 'voluptuous curvy full-figured body',
      'pulpeuse|thick|épaisse': 'thick curvy body with curves',
      'ronde|plump|chubby|potelé': 'soft plump rounded body',
      'très ronde|very curvy|bbw': 'very curvy plump body, BBW',
      'matern|maternal': 'soft maternal curvy body',
    };
    let bodyType = 'balanced proportionate body';
    const bodyField = (character.bodyType || '').toLowerCase();
    for (const [key, value] of Object.entries(bodyTypes)) {
      if (new RegExp(key, 'i').test(bodyField) || new RegExp(key, 'i').test(appearance)) {
        bodyType = value;
        break;
      }
    }
    parts.push(bodyType);
    
    // === 11. TAILLE ===
    if (character.height) {
      const h = parseInt(character.height);
      if (h >= 180) parts.push('tall stature');
      else if (h >= 170) parts.push('above average height');
      else if (h <= 155) parts.push('petite short stature');
      else if (h <= 165) parts.push('average height');
    }
    
    // === 12. POITRINE (femmes) ===
    if (character.gender === 'female') {
      const bust = character.bust || '';
      const bustDescriptions = {
        'A': 'small petite A-cup breasts',
        'B': 'modest B-cup breasts',
        'C': 'medium C-cup breasts',
        'D': 'full D-cup breasts',
        'DD': 'large DD-cup breasts',
        'E': 'very large E-cup breasts',
        'F': 'huge F-cup breasts',
        'G': 'massive G-cup breasts',
      };
      if (bustDescriptions[bust]) {
        parts.push(bustDescriptions[bust]);
      }
    }
    
    // === 13. PÉNIS (hommes) ===
    if (character.gender === 'male' && character.penis) {
      const size = parseInt(character.penis);
      if (size >= 22) parts.push('very large endowed');
      else if (size >= 18) parts.push('well endowed');
      else if (size >= 14) parts.push('average endowment');
    }
    
    // === 14. FESSES ===
    const buttTypes = {
      'énorme fesse|huge butt|très grosse': 'huge massive round butt',
      'grosse fesse|big butt|large butt': 'big round plump butt',
      'fesses rebond|bubble butt|fesses rondes': 'round bubble butt',
      'fesses généreuses|curvy butt': 'generous curvy butt',
      'fesses musclé|toned butt|fit butt': 'toned muscular firm butt',
      'fesses plates|flat butt|petites fesses': 'small flat butt',
      'fesses fermes|firm butt|perky': 'firm perky butt',
    };
    for (const [key, value] of Object.entries(buttTypes)) {
      if (new RegExp(key, 'i').test(appearance)) {
        parts.push(value);
        break;
      }
    }
    
    // === 15. HANCHES ===
    if (appearance.includes('hanches larges') || appearance.includes('wide hips')) {
      parts.push('wide generous hips');
    } else if (appearance.includes('hanches étroites') || appearance.includes('narrow hips')) {
      parts.push('narrow slim hips');
    }
    
    // === 16. CUISSES ===
    if (appearance.includes('cuisses épaisses') || appearance.includes('thick thighs')) {
      parts.push('thick meaty thighs');
    } else if (appearance.includes('cuisses fines') || appearance.includes('slim thighs')) {
      parts.push('slim slender thighs');
    }
    
    // === 17. VENTRE ===
    if (appearance.includes('ventre rond') || appearance.includes('round belly')) {
      parts.push('soft round belly');
    } else if (appearance.includes('ventre plat') || appearance.includes('flat stomach')) {
      parts.push('flat toned stomach');
    }
    
    // === 18. ACCESSOIRES ===
    if (appearance.includes('lunettes') || appearance.includes('glasses')) {
      parts.push('wearing glasses');
    }
    if (appearance.includes('piercing')) {
      parts.push('with piercings');
    }
    if (appearance.includes('tatouage') || appearance.includes('tattoo')) {
      parts.push('with tattoos');
    }
    
    // === QUALITÉ IMAGE ===
    if (isRealistic) {
      parts.push('photorealistic, ultra detailed, 8K, professional photography');
    } else {
      parts.push('high quality anime art, detailed illustration');
    }
    
    return parts.join(', ');
  }

  /**
   * Calcule un hash simple et déterministe pour un personnage
   * Utilisé pour garantir la cohérence des images non-binaires
   */
  getCharacterHash(character) {
    const str = (character.id || character.name || 'default').toString();
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convertir en 32bit integer
    }
    return Math.abs(hash);
  }
  
  /**
   * Détermine l'apparence fixe d'un personnage non-binaire
   * Basé sur les caractéristiques explicites OU un hash déterministe
   */
  getNonBinaryAppearanceType(character) {
    const charAppearance = (character.appearance || '').toLowerCase();
    const charPhysical = (character.physicalDescription || '').toLowerCase();
    const charImagePrompt = (character.imagePrompt || '').toLowerCase();
    const combined = charAppearance + ' ' + charPhysical + ' ' + charImagePrompt;
    
    // === PRIORITÉ 1: Détection explicite dans les données ===
    // Mots-clés féminins explicites
    const explicitFeminine = combined.includes('femme') || combined.includes('woman') ||
                            combined.includes('poitrine') || combined.includes('seins') ||
                            combined.includes('breast') || combined.includes('bust') ||
                            combined.includes('féminine') || combined.includes('feminine') ||
                            combined.includes('robe') || combined.includes('dress') ||
                            combined.includes('jupe') || combined.includes('skirt') ||
                            combined.includes('décolleté') || combined.includes('maquillage');
    
    // Mots-clés masculins explicites
    const explicitMasculine = combined.includes('homme') || combined.includes('man ') ||
                             combined.includes('barbe') || combined.includes('beard') ||
                             combined.includes('musclé') || combined.includes('muscular') ||
                             combined.includes('masculine') || combined.includes('masculin') ||
                             combined.includes('torse') || combined.includes('chest hair') ||
                             combined.includes('pénis') || combined.includes('penis');
    
    // Si explicitement défini, utiliser cette apparence
    if (explicitFeminine && !explicitMasculine) {
      console.log(`🎭 Non-binaire ${character.name}: FÉMININ (explicite)`);
      return 'feminine';
    }
    if (explicitMasculine && !explicitFeminine) {
      console.log(`🎭 Non-binaire ${character.name}: MASCULIN (explicite)`);
      return 'masculine';
    }
    
    // === PRIORITÉ 2: Hash déterministe pour cohérence ===
    // Le même personnage aura TOUJOURS la même apparence
    const hash = this.getCharacterHash(character);
    const appearanceType = hash % 3; // 0, 1, ou 2
    
    if (appearanceType === 0) {
      console.log(`🎭 Non-binaire ${character.name}: FÉMININ (hash: ${hash})`);
      return 'feminine';
    } else if (appearanceType === 1) {
      console.log(`🎭 Non-binaire ${character.name}: MASCULIN (hash: ${hash})`);
      return 'masculine';
    } else {
      console.log(`🎭 Non-binaire ${character.name}: ANDROGYNE (hash: ${hash})`);
      return 'androgynous';
    }
  }

  /**
   * Construit une description ultra-détaillée des caractéristiques physiques
   * Prend en compte TOUS les champs du personnage
   */
  buildDetailedPhysicalDescription(character, isRealistic = false) {
    let description = '';
    
    // === UTILISER physicalDescription EN PRIORITÉ si disponible ===
    if (character.physicalDescription) {
      description += character.physicalDescription.replace(/\n/g, ', ').trim();
      description += ', ';
    }
    
    // === GENRE ET BASE ===
    if (character.gender === 'female') {
      if (isRealistic) {
        description += 'beautiful real woman, female human, realistic lady, real person, feminine features';
      } else {
        description += 'beautiful anime woman, female character, anime lady, feminine features';
      }
    } else if (character.gender === 'male') {
      if (isRealistic) {
        description += 'handsome real man, male human, realistic gentleman, real person, masculine features';
      } else {
        description += 'handsome anime man, male character, anime gentleman, masculine features';
      }
    } else {
      // NON-BINAIRE: Utiliser une apparence COHÉRENTE ET FIXE
      // Basée sur les caractéristiques explicites OU un hash déterministe
      const appearanceType = this.getNonBinaryAppearanceType(character);
      
      if (appearanceType === 'feminine') {
        // Non-binaire avec apparence féminine COHÉRENTE
        if (isRealistic) {
          description += 'beautiful androgynous feminine-presenting person, soft feminine features, delicate face, smooth skin, real person, ALWAYS feminine appearance';
        } else {
          description += 'beautiful androgynous feminine anime character, soft delicate features, graceful appearance, ALWAYS feminine';
        }
        description += ', feminine-presenting, soft curves, delicate frame';
      } else if (appearanceType === 'masculine') {
        // Non-binaire avec apparence masculine COHÉRENTE
        if (isRealistic) {
          description += 'handsome androgynous masculine-presenting person, defined angular features, strong jaw, real person, ALWAYS masculine appearance';
        } else {
          description += 'handsome androgynous masculine anime character, defined features, sharp look, ALWAYS masculine';
        }
        description += ', masculine-presenting, angular features, defined frame';
      } else {
        // Non-binaire vraiment androgyne
        if (isRealistic) {
          description += 'elegant androgynous person, perfectly balanced gender-neutral features, soft yet defined face, real person, ALWAYS androgynous';
        } else {
          description += 'elegant androgynous anime character, perfectly balanced features, graceful neutral appearance, ALWAYS androgynous';
        }
        description += ', truly androgynous, balanced features, elegant frame';
      }
      description += ', androgynous non-binary';
    }
    
    // === ÂGE PRÉCIS (gère les formats comme "300 ans (apparence 25)") ===
    let age = 25;
    const ageStr = String(character.age || '');
    // Chercher d'abord "apparence XX" pour les personnages fantastiques
    const appearanceMatch = ageStr.match(/apparence\s*(\d+)/i);
    if (appearanceMatch) {
      age = parseInt(appearanceMatch[1]);
    } else {
      // Sinon prendre le premier nombre trouvé
      const numMatch = ageStr.match(/(\d+)/);
      if (numMatch) {
        age = parseInt(numMatch[1]);
        // Si l'âge est > 100, c'est probablement un âge fantastique, utiliser une apparence raisonnable
        if (age > 100) {
          age = Math.min(Math.max(Math.floor(age / 10), 20), 50);
        }
      }
    }
    description += `, ${age} years old`;
    if (age >= 35 && age < 45) {
      description += ', mature adult, experienced, confident';
    } else if (age >= 45 && age < 55) {
      description += ', mature, distinguished, elegant';
    } else if (age >= 55) {
      description += ', mature, seasoned, sophisticated';
    } else if (age >= 25 && age < 35) {
      description += ', young adult, prime of life';
    } else if (age >= 18 && age < 25) {
      description += ', youthful adult, young adult';
    }
    
    // === CHEVEUX ULTRA-DÉTAILLÉS ===
    const hairColor = character.hairColor || this.extractFromAppearance(character, 'hair') || 'brown';
    description += `, beautiful ${hairColor} hair`;
    
    // Combiner tous les champs pour analyse
    const appearance = (
      (character.appearance || '') + ' ' + 
      (character.physicalDescription || '') + ' ' +
      (character.bodyType || '') + ' ' +
      (character.hairLength || '')
    ).toLowerCase();
    
    // Longueur des cheveux (utilise hairLength en priorité)
    const hairLength = (character.hairLength || '').toLowerCase();
    if (hairLength.includes('très long') || hairLength.includes('very long') || hairLength.includes('hanches') || hairLength.includes('taille')) {
      description += ', extremely long flowing luxurious hair reaching waist or hips';
    } else if (hairLength.includes('long') || appearance.includes('longs cheveux') || appearance.includes('long hair')) {
      description += ', long beautiful flowing hair reaching lower back';
    } else if (hairLength.includes('mi-long') || hairLength.includes('épaules') || appearance.includes('mi-long') || appearance.includes('shoulder')) {
      description += ', medium shoulder-length hair';
    } else if (hairLength.includes('court') || hairLength.includes('short') || appearance.includes('court')) {
      description += ', short stylish cropped hair';
    } else if (hairLength.includes('carré') || hairLength.includes('bob')) {
      description += ', sleek bob cut hair';
    } else if (hairLength.includes('pixie')) {
      description += ', cute pixie cut short hair';
    } else if (appearance.includes('long')) {
      description += ', long flowing hair';
    } else {
      description += ', medium length hair';
    }
    
    // Texture des cheveux
    if (hairLength.includes('bouclé') || hairLength.includes('curly') || appearance.includes('bouclé') || appearance.includes('curly')) {
      description += ', naturally curly bouncy hair with beautiful curls';
    } else if (hairLength.includes('ondulé') || hairLength.includes('wavy') || appearance.includes('ondulé') || appearance.includes('wavy')) {
      description += ', wavy flowing hair with soft waves';
    } else if (hairLength.includes('lisse') || hairLength.includes('straight') || appearance.includes('raides') || appearance.includes('lisse')) {
      description += ', perfectly straight sleek silky hair';
    } else if (hairLength.includes('frisé') || appearance.includes('frisé')) {
      description += ', tight curly frizzy hair';
    } else if (hairLength.includes('tresse') || appearance.includes('tresse') || appearance.includes('braid')) {
      description += ', beautifully braided hair';
    }
    
    // Style spécifique
    if (hairLength.includes('queue') || appearance.includes('queue de cheval') || appearance.includes('ponytail')) {
      description += ', styled in ponytail';
    } else if (hairLength.includes('chignon') || appearance.includes('chignon') || appearance.includes('bun')) {
      description += ', styled in elegant bun';
    } else if (hairLength.includes('frange') || appearance.includes('frange') || appearance.includes('bangs')) {
      description += ', with cute bangs framing face';
    } else if (hairLength.includes('undercut') || appearance.includes('undercut')) {
      description += ', with edgy undercut style';
    } else if (hairLength.includes('mèches') || appearance.includes('mèches') || appearance.includes('highlights')) {
      description += ', with stylish highlights';
    }
    
    // === MORPHOLOGIE DE BASE ===
    if (appearance.includes('grande') || appearance.includes('tall')) {
      description += ', tall stature';
    } else if (appearance.includes('petite') || appearance.includes('small')) {
      description += ', petite short stature';
    } else {
      description += ', average height';
    }
    
    // === TYPE DE CORPS GÉNÉRAL ===
    if (appearance.includes('musclé') || appearance.includes('muscular') || appearance.includes('athlétique') || appearance.includes('athletic')) {
      description += ', athletic toned fit body with defined muscles';
    } else if (appearance.includes('mince') || appearance.includes('slim') || appearance.includes('élancé') || appearance.includes('slender')) {
      description += ', slim slender lean body';
    } else if (appearance.includes('voluptu') || appearance.includes('curvy') || appearance.includes('généreuses') || appearance.includes('formes')) {
      description += ', voluptuous curvy full-figured body with generous curves';
    } else if (appearance.includes('ronde') || appearance.includes('round') || appearance.includes('potelée') || appearance.includes('chubby')) {
      description += ', curvy soft rounded plump body';
    } else if (appearance.includes('pulpeuse') || appearance.includes('thick')) {
      description += ', thick curvy body with pronounced curves';
    } else {
      description += ', balanced normal physique';
    }
    
    // === DÉTAILS CORPORELS SPÉCIFIQUES (ventre, fesses, hanches) ===
    // Ventre
    if (appearance.includes('ventre rond') || appearance.includes('ventre arrondi') || appearance.includes('belly') || appearance.includes('soft belly')) {
      description += ', soft round belly, plump midsection';
    } else if (appearance.includes('ventre plat') || appearance.includes('flat stomach') || appearance.includes('abdos')) {
      description += ', flat toned stomach, defined abs';
    }
    
    // Fesses
    if (appearance.includes('grosse fesse') || appearance.includes('grosses fesses') || appearance.includes('big butt') || appearance.includes('fesses généreuses')) {
      description += ', big round butt, large plump buttocks, thick ass';
    } else if (appearance.includes('fesses rebondies') || appearance.includes('bubble butt') || appearance.includes('fesses rondes')) {
      description += ', round bubble butt, perky buttocks';
    } else if (appearance.includes('fesses plates') || appearance.includes('flat butt')) {
      description += ', small flat butt';
    }
    
    // Hanches
    if (appearance.includes('hanches larges') || appearance.includes('wide hips') || appearance.includes('hanches généreuses')) {
      description += ', wide generous hips, curvy hips';
    } else if (appearance.includes('hanches étroites') || appearance.includes('narrow hips')) {
      description += ', narrow slim hips';
    }
    
    // Cuisses
    if (appearance.includes('cuisses épaisses') || appearance.includes('thick thighs') || appearance.includes('grosses cuisses')) {
      description += ', thick meaty thighs, full legs';
    } else if (appearance.includes('cuisses fines') || appearance.includes('slim thighs')) {
      description += ', slim slender thighs';
    }
    
    // Silhouette en sablier / poire
    if (appearance.includes('sablier') || appearance.includes('hourglass')) {
      description += ', perfect hourglass figure, narrow waist with wide hips';
    } else if (appearance.includes('poire') || appearance.includes('pear')) {
      description += ', pear-shaped body, wider hips than bust';
    }
    
    // === COULEUR DE PEAU ===
    if (appearance.includes('pâle') || appearance.includes('pale') || appearance.includes('porcelaine')) {
      description += ', pale fair porcelain skin';
    } else if (appearance.includes('bronzé') || appearance.includes('tanned') || appearance.includes('doré')) {
      description += ', tanned golden sun-kissed skin';
    } else if (appearance.includes('ébène') || appearance.includes('noire') || appearance.includes('dark') || appearance.includes('noir')) {
      description += ', beautiful dark ebony skin';
    } else if (appearance.includes('caramel') || appearance.includes('métisse') || appearance.includes('mixed')) {
      description += ', warm caramel mixed skin tone';
    } else if (appearance.includes('asiat') || appearance.includes('asian')) {
      description += ', asian light skin tone';
    } else if (appearance.includes('latin') || appearance.includes('olive') || appearance.includes('mediterran')) {
      description += ', mediterranean olive warm skin';
    } else {
      description += ', natural healthy skin';
    }
    
    // === YEUX (utilise eyeColor en priorité, sinon extraction) ===
    const eyeColor = character.eyeColor || this.extractFromAppearance(character, 'eyes');
    if (eyeColor) {
      description += `, ${eyeColor} eyes`;
    } else if (appearance.includes('yeux bleu') || appearance.includes('blue eyes')) {
      description += ', bright blue eyes';
    } else if (appearance.includes('yeux vert') || appearance.includes('green eyes')) {
      description += ', emerald green eyes';
    } else if (appearance.includes('yeux marron') || appearance.includes('yeux brun') || appearance.includes('brown eyes')) {
      description += ', warm brown eyes';
    } else if (appearance.includes('yeux noi') || appearance.includes('black eyes') || appearance.includes('dark eyes')) {
      description += ', deep dark eyes';
    } else if (appearance.includes('yeux gris') || appearance.includes('grey eyes')) {
      description += ', steel gray eyes';
    } else if (appearance.includes('noisette') || appearance.includes('hazel')) {
      description += ', hazel eyes';
    } else if (appearance.includes('améthyste') || appearance.includes('violet') || appearance.includes('purple')) {
      description += ', mystical purple amethyst eyes';
    } else if (appearance.includes('doré') || appearance.includes('gold') || appearance.includes('or')) {
      description += ', striking golden eyes';
    } else if (appearance.includes('rouge') || appearance.includes('red')) {
      description += ', intense crimson red eyes';
    } else {
      description += ', expressive captivating eyes';
    }
    
    // === TAILLE (utilise height en priorité) ===
    if (character.height) {
      const heightCm = parseInt(character.height);
      if (heightCm >= 180) {
        description += ', tall stature, impressive height';
      } else if (heightCm >= 170) {
        description += ', above average height';
      } else if (heightCm <= 160) {
        description += ', petite short stature';
      } else {
        description += ', average height';
      }
    }
    
    // === BODY TYPE (utilise bodyType en priorité, sinon extraction) ===
    const bodyType = character.bodyType || this.extractFromAppearance(character, 'body');
    if (bodyType) {
      const bodyTypeLower = bodyType.toLowerCase();
      if (bodyTypeLower.includes('athléti') || bodyTypeLower.includes('muscl') || bodyTypeLower.includes('athletic')) {
        description += ', athletic toned muscular body';
      } else if (bodyTypeLower.includes('voluptu') || bodyTypeLower.includes('curv') || bodyTypeLower.includes('généreus')) {
        description += ', voluptuous curvy full-figured body';
      } else if (bodyTypeLower.includes('élancé') || bodyTypeLower.includes('mince') || bodyTypeLower.includes('slim')) {
        description += ', slim slender elegant body';
      } else if (bodyTypeLower.includes('graci') || bodyTypeLower.includes('fine')) {
        description += ', graceful slender refined body';
      } else if (bodyTypeLower.includes('puissant') || bodyTypeLower.includes('massif')) {
        description += ', powerful massive muscular build';
      } else if (bodyTypeLower.includes('ronde') || bodyTypeLower.includes('chubby') || bodyTypeLower.includes('plump')) {
        description += ', curvy plump soft body';
      } else if (bodyTypeLower.includes('matern') || bodyTypeLower.includes('maternel')) {
        description += ', maternal soft curvy body';
      } else {
        description += `, ${bodyType} body`;
      }
    }
    
    // === TRAITS ADDITIONNELS ===
    if (appearance.includes('taches de rousseur') || appearance.includes('freckles')) {
      description += ', cute freckles on face';
    }
    
    if (appearance.includes('lunettes') || appearance.includes('glasses')) {
      description += ', wearing stylish glasses';
    }
    
    // Pour réaliste: ajouter des détails de peau réaliste
    if (isRealistic) {
      description += ', realistic skin texture, natural skin pores, lifelike appearance';
    }
    
    return description;
  }

  /**
   * Extrait une information spécifique de l'apparence
   */
  extractFromAppearance(character, type) {
    const text = ((character.appearance || '') + ' ' + (character.physicalDescription || '') + ' ' + (character.imagePrompt || '')).toLowerCase();
    
    if (type === 'hair') {
      const hairColors = [
        { key: 'platine', value: 'platinum blonde' },
        { key: 'platinum', value: 'platinum blonde' },
        { key: 'blond doré', value: 'golden blonde' },
        { key: 'golden blonde', value: 'golden blonde' },
        { key: 'blond cendré', value: 'ash blonde' },
        { key: 'ash blonde', value: 'ash blonde' },
        { key: 'blond miel', value: 'honey blonde' },
        { key: 'honey blonde', value: 'honey blonde' },
        { key: 'blonde', value: 'blonde' },
        { key: 'blond', value: 'blonde' },
        { key: 'roux flamboyant', value: 'fiery red' },
        { key: 'fiery red', value: 'fiery red' },
        { key: 'roux cuivré', value: 'copper red' },
        { key: 'copper red', value: 'copper red' },
        { key: 'rousse', value: 'red' },
        { key: 'roux', value: 'red' },
        { key: 'auburn', value: 'auburn' },
        { key: 'brun chocolat', value: 'chocolate brown' },
        { key: 'chocolate brown', value: 'chocolate brown' },
        { key: 'brune', value: 'brunette' },
        { key: 'brun', value: 'brown' },
        { key: 'châtain', value: 'chestnut brown' },
        { key: 'noir de jais', value: 'jet black' },
        { key: 'jet black', value: 'jet black' },
        { key: 'noire', value: 'black' },
        { key: 'noir', value: 'black' },
        { key: 'gris argenté', value: 'silver gray' },
        { key: 'silver gray', value: 'silver gray' },
        { key: 'argenté', value: 'silver' },
        { key: 'silver', value: 'silver' },
        { key: 'gris', value: 'gray' },
        { key: 'grey', value: 'gray' },
        { key: 'blanc', value: 'white' },
        { key: 'white', value: 'white' },
        { key: 'violet', value: 'purple' },
        { key: 'purple', value: 'purple' },
        { key: 'rose', value: 'pink' },
        { key: 'pink', value: 'pink' },
        { key: 'bleu', value: 'blue' },
        { key: 'blue', value: 'blue' },
        { key: 'vert', value: 'green' },
        { key: 'green', value: 'green' },
        { key: 'rouge vif', value: 'bright red' },
        { key: 'bright red', value: 'bright red' },
      ];
      for (const color of hairColors) {
        if (text.includes(color.key)) return color.value;
      }
    }
    
    if (type === 'eyes') {
      const eyeColors = [
        { key: 'bleu clair', value: 'light blue' },
        { key: 'bleu glacier', value: 'icy blue' },
        { key: 'bleu électrique', value: 'electric blue' },
        { key: 'blue eyes', value: 'blue' },
        { key: 'bleus', value: 'blue' },
        { key: 'bleu', value: 'blue' },
        { key: 'vert émeraude', value: 'emerald green' },
        { key: 'vert clair', value: 'light green' },
        { key: 'green eyes', value: 'green' },
        { key: 'verts', value: 'green' },
        { key: 'vert', value: 'green' },
        { key: 'noisette', value: 'hazel' },
        { key: 'hazel', value: 'hazel' },
        { key: 'ambre', value: 'amber' },
        { key: 'amber', value: 'amber' },
        { key: 'marron foncé', value: 'dark brown' },
        { key: 'marron chaleureux', value: 'warm brown' },
        { key: 'brown eyes', value: 'brown' },
        { key: 'marron', value: 'brown' },
        { key: 'gris acier', value: 'steel gray' },
        { key: 'gray eyes', value: 'gray' },
        { key: 'gris', value: 'gray' },
        { key: 'noirs profonds', value: 'deep black' },
        { key: 'black eyes', value: 'black' },
        { key: 'noirs', value: 'black' },
        { key: 'améthyste', value: 'purple amethyst' },
        { key: 'violet', value: 'purple' },
        { key: 'doré', value: 'golden' },
        { key: 'golden', value: 'golden' },
        { key: 'rouge', value: 'red' },
        { key: 'red eyes', value: 'red' },
      ];
      for (const color of eyeColors) {
        if (text.includes(color.key)) return color.value;
      }
    }
    
    if (type === 'bust') {
      // Extraire la taille de bonnet du texte
      const bustPatterns = [
        { pattern: /bonnet\s*h/i, value: 'H' },
        { pattern: /bonnet\s*g/i, value: 'G' },
        { pattern: /bonnet\s*f/i, value: 'F' },
        { pattern: /bonnet\s*e/i, value: 'E' },
        { pattern: /bonnet\s*dd/i, value: 'DD' },
        { pattern: /bonnet\s*d/i, value: 'D' },
        { pattern: /bonnet\s*c/i, value: 'C' },
        { pattern: /bonnet\s*b/i, value: 'B' },
        { pattern: /bonnet\s*a/i, value: 'A' },
        { pattern: /h\s*cup/i, value: 'H' },
        { pattern: /g\s*cup/i, value: 'G' },
        { pattern: /f\s*cup/i, value: 'F' },
        { pattern: /e\s*cup/i, value: 'E' },
        { pattern: /dd\s*cup/i, value: 'DD' },
        { pattern: /d\s*cup/i, value: 'D' },
        { pattern: /c\s*cup/i, value: 'C' },
        { pattern: /b\s*cup/i, value: 'B' },
        { pattern: /a\s*cup/i, value: 'A' },
        { pattern: /énorme.*poitrine|huge.*breast|massive.*breast/i, value: 'H' },
        { pattern: /très grosse.*poitrine|very large.*breast/i, value: 'G' },
        { pattern: /grosse.*poitrine|large.*breast/i, value: 'F' },
        { pattern: /généreuse.*poitrine|generous.*breast/i, value: 'E' },
        { pattern: /poitrine.*généreuse/i, value: 'E' },
        { pattern: /moyenne.*poitrine|medium.*breast/i, value: 'C' },
        { pattern: /poitrine.*moyenne/i, value: 'C' },
        { pattern: /petite.*poitrine|small.*breast/i, value: 'B' },
        { pattern: /poitrine.*petite/i, value: 'B' },
      ];
      for (const p of bustPatterns) {
        if (p.pattern.test(text)) return p.value;
      }
    }
    
    if (type === 'body') {
      const bodyTypes = [
        // Rondeurs et formes généreuses
        { key: 'très ronde', value: 'very curvy chubby plump body' },
        { key: 'very curvy', value: 'very curvy full-figured' },
        { key: 'ronde', value: 'curvy plump soft body' },
        { key: 'chubby', value: 'chubby curvy plump' },
        { key: 'potelée', value: 'chubby plump soft body' },
        { key: 'thick', value: 'thick curvy body' },
        { key: 'voluptueuse', value: 'voluptuous curvy full-figured' },
        { key: 'voluptuous', value: 'voluptuous curvy' },
        { key: 'pulpeuse', value: 'voluptuous full-figured curvy' },
        { key: 'généreuse', value: 'generous curvy full-figured' },
        { key: 'formes généreuses', value: 'generous curves full-figured' },
        { key: 'curvy', value: 'curvy full-figured' },
        { key: 'bbw', value: 'BBW curvy thick plump body' },
        // Fesses spécifiques
        { key: 'grosses fesses', value: 'big round butt thick ass' },
        { key: 'grosse fesse', value: 'big round butt thick ass' },
        { key: 'fesses généreuses', value: 'generous round butt curvy ass' },
        { key: 'fesses rebondies', value: 'bubble butt perky round ass' },
        { key: 'big butt', value: 'big round butt thick ass' },
        { key: 'bubble butt', value: 'bubble butt round perky ass' },
        // Ventre spécifique
        { key: 'ventre rond', value: 'soft round belly plump midsection' },
        { key: 'ventre arrondi', value: 'soft round belly' },
        { key: 'belly', value: 'soft belly plump midsection' },
        // Hanches et cuisses
        { key: 'hanches larges', value: 'wide hips curvy hips' },
        { key: 'hanches généreuses', value: 'wide generous hips' },
        { key: 'cuisses épaisses', value: 'thick thighs full legs' },
        { key: 'thick thighs', value: 'thick meaty thighs' },
        // Silhouettes
        { key: 'sablier', value: 'hourglass figure curvy' },
        { key: 'hourglass', value: 'hourglass figure' },
        { key: 'poire', value: 'pear-shaped body wide hips' },
        { key: 'pear', value: 'pear-shaped body' },
        // Athlétique et musclé
        { key: 'athlétique', value: 'athletic toned' },
        { key: 'athletic', value: 'athletic' },
        { key: 'musclée', value: 'muscular toned' },
        { key: 'muscular', value: 'muscular' },
        { key: 'tonique', value: 'toned fit' },
        { key: 'toned', value: 'toned' },
        { key: 'sportive', value: 'athletic sporty' },
        // Mince et élancé
        { key: 'mince', value: 'slim slender' },
        { key: 'slim', value: 'slim' },
        { key: 'élancée', value: 'slender elegant' },
        { key: 'slender', value: 'slender' },
        { key: 'fine', value: 'slim petite' },
        { key: 'petite', value: 'petite small' },
        { key: 'maternelle', value: 'maternal soft curvy' },
        { key: 'maternal', value: 'maternal' },
      ];
      for (const bt of bodyTypes) {
        if (text.includes(bt.key)) return bt.value;
      }
    }
    
    return null;
  }

  /**
   * Extrait les caractéristiques corporelles spécifiques (fesses, hanches, ventre, cuisses)
   * et les transforme en prompts explicites pour l'image
   * VERSION AMÉLIORÉE - Détecte TOUS les termes de morphologie
   */
  extractBodyFeatures(character) {
    const features = [];
    
    // Combiner TOUTES les sources de données du personnage
    const fullText = (
      (character.appearance || '') + ' ' + 
      (character.bodyType || '') + ' ' + 
      (character.physicalDescription || '') + ' ' +
      (character.imagePrompt || '') + ' ' +
      (character.personality || '') + ' ' +
      (Array.isArray(character.tags) ? character.tags.join(' ') : '')
    ).toLowerCase();
    
    console.log('🔍 extractBodyFeatures - Texte analysé:', fullText.substring(0, 300));
    
    // === TYPE DE CORPS GÉNÉRAL - DÉTECTION ULTRA-COMPLÈTE ===
    
    // TRÈS RONDE / TRÈS GROSSE
    if (fullText.includes('très ronde') || fullText.includes('very round') || fullText.includes('très grosse') || fullText.includes('very fat') || fullText.includes('obèse') || fullText.includes('obese')) {
      features.push('very round very curvy very plump body, extremely soft full figure, very chubby thick');
    }
    // RONDE / RONDELET / RONDEUR
    else if (fullText.includes('ronde') || fullText.includes('rondelet') || fullText.includes('rondeur') || fullText.includes('round body') || fullText.includes('rounded')) {
      features.push('curvy plump soft rounded body, soft full figure, chubby cute');
    }
    
    // DODU / DODUE / POTELÉ
    if (fullText.includes('dodu') || fullText.includes('potelé') || fullText.includes('plump') || fullText.includes('pudgy') || fullText.includes('chubby')) {
      features.push('soft plump chubby body, cute pudgy figure, doughy soft curves');
    }
    
    // GÉNÉREUSE / FORMES GÉNÉREUSES / COURBES GÉNÉREUSES
    if (fullText.includes('généreuse') || fullText.includes('courbes généreuses') || fullText.includes('formes généreuses') || fullText.includes('generous curves') || fullText.includes('generous figure')) {
      features.push('generous curvy body, ample soft curves everywhere, full figured');
    }
    
    // VOLUPTUEUSE / PULPEUSE
    if (fullText.includes('voluptu') || fullText.includes('pulpeuse') || fullText.includes('voluptuous') || fullText.includes('lush')) {
      features.push('voluptuous lush curvy body with generous sensual curves');
    }
    
    // CURVY / THICK
    if (fullText.includes('curvy') || fullText.includes('thick body') || fullText.includes('thicc')) {
      features.push('thick curvy body with pronounced sexy curves');
    }
    
    // BBW / PLUS SIZE
    if (fullText.includes('bbw') || fullText.includes('plus size') || fullText.includes('plus-size') || fullText.includes('grande taille')) {
      features.push('BBW curvy thick plump body, very generous big beautiful proportions');
    }
    
    // ENROBÉ / ENVELOPPÉ
    if (fullText.includes('enrobé') || fullText.includes('enveloppé') || fullText.includes('well-padded') || fullText.includes('soft body')) {
      features.push('soft padded body, pleasantly plump, well-rounded figure');
    }
    
    // MATERNELLE / FEMME AU FOYER
    if (fullText.includes('maternelle') || fullText.includes('maternal') || fullText.includes('femme au foyer') || fullText.includes('housewife') || fullText.includes('maman') || fullText.includes('mommy')) {
      features.push('soft maternal curvy body, nurturing motherly figure, womanly curves');
    }
    
    // === VENTRE SPÉCIFIQUE - ULTRA-DÉTAILLÉ ===
    if (fullText.includes('énorme ventre') || fullText.includes('très gros ventre') || fullText.includes('huge belly') || fullText.includes('big fat belly')) {
      features.push('huge round soft belly, very big plump tummy, large soft midsection, prominent belly');
    } else if (fullText.includes('gros ventre') || fullText.includes('big belly') || fullText.includes('fat belly') || fullText.includes('ventre proéminent')) {
      features.push('big round soft belly, large plump tummy, prominent soft midsection');
    } else if (fullText.includes('ventre rond') || fullText.includes('ventre arrondi') || fullText.includes('round belly') || fullText.includes('soft belly') || fullText.includes('ventre doux')) {
      features.push('soft round belly, plump cute tummy, gentle belly curve, soft padded midsection');
    } else if (fullText.includes('petit ventre') || fullText.includes('belly pooch') || fullText.includes('little belly')) {
      features.push('small soft belly pooch, gentle cute tummy, slight belly curve');
    }
    
    // === FESSES SPÉCIFIQUES - ULTRA-DÉTAILLÉ ===
    if (fullText.includes('énorme fesse') || fullText.includes('énormes fesses') || fullText.includes('huge butt') || fullText.includes('huge ass') || fullText.includes('massive butt')) {
      features.push('huge massive round butt, enormous thick buttocks, very big jiggly ass, extremely wide rear');
    } else if (fullText.includes('grosse fesse') || fullText.includes('grosses fesses') || fullText.includes('big butt') || fullText.includes('large butt') || fullText.includes('big round butt') || fullText.includes('gros fessier') || fullText.includes('big ass') || fullText.includes('fat ass')) {
      features.push('big round plump butt, large thick buttocks, generous thick ass, wide jiggly rear');
    } else if (fullText.includes('fesses rebondies') || fullText.includes('bubble butt') || fullText.includes('fesses rondes') || fullText.includes('round butt') || fullText.includes('perky butt')) {
      features.push('round bubble butt, perky plump buttocks, juicy round ass, bouncy rear');
    } else if (fullText.includes('fesses généreuses') || fullText.includes('curvy butt') || fullText.includes('nice butt') || fullText.includes('beau fessier')) {
      features.push('generous curvy butt, full round buttocks, shapely rear');
    }
    
    // === HANCHES SPÉCIFIQUES ===
    if (fullText.includes('très larges hanches') || fullText.includes('hanches très larges') || fullText.includes('very wide hips') || fullText.includes('huge hips')) {
      features.push('very wide generous hips, extremely broad curvy hip bones, massive childbearing hips');
    } else if (fullText.includes('hanches larges') || fullText.includes('wide hips') || fullText.includes('hanches généreuses') || fullText.includes('larges hanches') || fullText.includes('broad hips') || fullText.includes('hanches rondes')) {
      features.push('wide generous hips, broad curvy hip bones, childbearing hips');
    }
    
    // === CUISSES SPÉCIFIQUES ===
    if (fullText.includes('très grosses cuisses') || fullText.includes('huge thighs') || fullText.includes('massive thighs')) {
      features.push('very thick massive thighs, huge plump legs, extremely generous meaty thighs');
    } else if (fullText.includes('cuisses épaisses') || fullText.includes('thick thighs') || fullText.includes('grosses cuisses') || fullText.includes('cuisses généreuses') || fullText.includes('cuisses pleines') || fullText.includes('full thighs') || fullText.includes('fat thighs')) {
      features.push('thick meaty thighs, full plump legs, generous thick thighs');
    }
    
    // === POITRINE TRÈS GÉNÉREUSE ===
    if (fullText.includes('énorme poitrine') || fullText.includes('très grosse poitrine') || fullText.includes('huge breasts') || fullText.includes('enormous breasts') || fullText.includes('massive breasts') || fullText.includes('énormes seins') || fullText.includes('gigantic breasts')) {
      features.push('huge massive breasts, enormous bust, very large heavy chest');
    } else if (fullText.includes('grosse poitrine') || fullText.includes('large breasts') || fullText.includes('big breasts') || fullText.includes('gros seins') || fullText.includes('poitrine généreuse') || fullText.includes('generous bust') || fullText.includes('full breasts')) {
      features.push('large full breasts, big generous bust, heavy ample chest');
    } else if (fullText.includes('poitrine pleine') || fullText.includes('full bust') || fullText.includes('ample bust')) {
      features.push('full round breasts, ample bust, nicely filled chest');
    }
    
    // === SILHOUETTE GLOBALE ===
    if (fullText.includes('sablier') || fullText.includes('hourglass')) {
      features.push('perfect hourglass figure, narrow waist with wide hips and bust');
    } else if (fullText.includes('poire') || fullText.includes('pear shape') || fullText.includes('pear-shaped')) {
      features.push('pear-shaped body, wider hips than bust, curvy lower body');
    } else if (fullText.includes('pomme') || fullText.includes('apple shape') || fullText.includes('apple-shaped')) {
      features.push('apple-shaped body, fuller midsection, round in the middle');
    }
    
    // === PEAU DOUCE / MOELLEUSE ===
    if (fullText.includes('peau douce') || fullText.includes('soft skin') || fullText.includes('moelleuse') || fullText.includes('cushiony')) {
      features.push('soft smooth skin, cushiony touchable body');
    }
    
    // Log des features trouvées
    if (features.length > 0) {
      console.log(`✅ Features corporelles trouvées: ${features.length}`);
      features.forEach((f, i) => console.log(`   ${i+1}. ${f}`));
    } else {
      console.log('⚠️ Aucune feature corporelle spécifique trouvée dans:', fullText.substring(0, 100));
    }
    
    return features.length > 0 ? features.join(', ') : null;
  }

  /**
   * Décrit l'anatomie de manière précise
   */
  buildAnatomyDescription(character, isRealistic = false) {
    let anatomy = '';
    
    // === FEMMES - POITRINE ULTRA-DÉTAILLÉE ===
    let bustSize = character.bust || character.bustSize || this.extractFromAppearance(character, 'bust');
    if (character.gender === 'female') {
      const bustDetails = {
        'A': { size: 'small A cup breasts', details: 'petite perky chest, small firm breasts, delicate feminine bust, cute small nipples' },
        'B': { size: 'natural B cup breasts', details: 'modest perky bust, small firm round breasts, cute feminine chest, pink nipples' },
        'C': { size: 'medium C cup breasts', details: 'balanced natural bust, medium round firm breasts, nice feminine cleavage, perfect proportions' },
        'D': { size: 'large D cup breasts', details: 'voluptuous generous bust, full round heavy breasts, impressive deep cleavage, feminine curves' },
        'DD': { size: 'very large DD cup breasts', details: 'very generous voluptuous bust, full heavy round breasts, deep sensual cleavage, prominent nipples' },
        'E': { size: 'huge E cup breasts', details: 'massive impressive bust, enormous full heavy breasts, extremely deep cleavage, large areolas' },
        'F': { size: 'enormous F cup breasts', details: 'huge voluptuous bust, gigantic full heavy breasts, incredible cleavage, very large areolas' },
        'G': { size: 'gigantic G cup breasts', details: 'gigantic massive bust, colossal heavy breasts, impossibly large chest, prominent nipples' },
        'H': { size: 'massive H cup breasts', details: 'enormous massive bust, incredibly huge heavy breasts, extreme proportions' }
      };
      
      // Normaliser la taille
      let normalizedBust = 'C'; // Défaut
      if (bustSize) {
        const bustLower = bustSize.toLowerCase();
        if (bustLower.includes('a') && !bustLower.includes('large')) normalizedBust = 'A';
        else if (bustLower.includes('b') || bustLower.includes('petit') || bustLower.includes('small')) normalizedBust = 'B';
        else if (bustLower.includes('c') || bustLower.includes('moyen') || bustLower.includes('medium')) normalizedBust = 'C';
        else if (bustLower.includes('dd') || bustLower.includes('très') || bustLower.includes('very large')) normalizedBust = 'DD';
        else if (bustLower.includes('d') || bustLower.includes('génér') || bustLower.includes('large') || bustLower.includes('voluptu')) normalizedBust = 'D';
        else if (bustLower.includes('e') || bustLower.includes('énorme') || bustLower.includes('huge')) normalizedBust = 'E';
        else if (bustLower.includes('f') || bustLower.includes('gigant')) normalizedBust = 'F';
        else if (bustLower.includes('g')) normalizedBust = 'G';
        else if (bustLower.includes('h')) normalizedBust = 'H';
        // Si c'est une lettre seule
        else if (['A','B','C','D','DD','E','F','G','H'].includes(bustSize.toUpperCase())) {
          normalizedBust = bustSize.toUpperCase();
        }
      }
      
      const bustInfo = bustDetails[normalizedBust] || bustDetails['C'];
      anatomy += `, ${bustInfo.size}, ${bustInfo.details}`;
      
      // === CORPS FÉMININ DÉTAILLÉ (fesses, hanches, ventre, cuisses) ===
      const fullAppearance = ((character.appearance || '') + ' ' + (character.bodyType || '') + ' ' + (character.physicalDescription || '')).toLowerCase();
      
      // Fesses détaillées
      if (fullAppearance.includes('grosse fesse') || fullAppearance.includes('grosses fesses') || fullAppearance.includes('big butt') || fullAppearance.includes('large butt')) {
        anatomy += ', big round plump butt, large thick buttocks, generous rear, wide ass';
      } else if (fullAppearance.includes('fesses rebondies') || fullAppearance.includes('bubble butt') || fullAppearance.includes('fesses rondes')) {
        anatomy += ', round bubble butt, perky plump buttocks, nice round ass';
      } else if (fullAppearance.includes('fesses généreuses') || fullAppearance.includes('curvy butt')) {
        anatomy += ', generous curvy butt, full round buttocks';
      } else if (fullAppearance.includes('fesses plates') || fullAppearance.includes('flat butt')) {
        anatomy += ', small flat butt, petite rear';
      }
      
      // Hanches détaillées
      if (fullAppearance.includes('hanches larges') || fullAppearance.includes('wide hips') || fullAppearance.includes('hanches généreuses')) {
        anatomy += ', wide generous hips, curvy wide hip bones, broad feminine hips';
      } else if (fullAppearance.includes('hanches étroites') || fullAppearance.includes('narrow hips')) {
        anatomy += ', narrow slim hips, petite hip bones';
      }
      
      // Ventre détaillé
      if (fullAppearance.includes('ventre rond') || fullAppearance.includes('ventre arrondi') || fullAppearance.includes('round belly') || fullAppearance.includes('soft belly')) {
        anatomy += ', soft round belly, plump midsection, gentle tummy';
      } else if (fullAppearance.includes('ventre plat') || fullAppearance.includes('flat stomach') || fullAppearance.includes('abdos')) {
        anatomy += ', flat toned stomach, tight abs';
      }
      
      // Cuisses détaillées
      if (fullAppearance.includes('cuisses épaisses') || fullAppearance.includes('thick thighs') || fullAppearance.includes('grosses cuisses')) {
        anatomy += ', thick meaty thighs, full plump legs, generous thighs';
      } else if (fullAppearance.includes('cuisses fines') || fullAppearance.includes('slim thighs') || fullAppearance.includes('jambes fines')) {
        anatomy += ', slim slender thighs, long elegant legs';
      }
      
      // Type de corps global (curvy, ronde, etc.)
      if (fullAppearance.includes('voluptu') || fullAppearance.includes('curvy') || fullAppearance.includes('généreuse') || fullAppearance.includes('formes')) {
        anatomy += ', voluptuous curvy full-figured body, generous curves everywhere';
      } else if (fullAppearance.includes('ronde') || fullAppearance.includes('plump') || fullAppearance.includes('chubby') || fullAppearance.includes('potelée')) {
        anatomy += ', curvy plump soft body, rounded figure, soft curves';
      } else if (fullAppearance.includes('pulpeuse') || fullAppearance.includes('thick')) {
        anatomy += ', thick curvy body, pronounced curves, full-figured';
      } else if (fullAppearance.includes('bbw')) {
        anatomy += ', BBW curvy thick plump body, very full-figured, generous proportions';
      }
      
      // Silhouette basée sur la poitrine ET le corps
      const isCurvy = fullAppearance.includes('curvy') || fullAppearance.includes('voluptu') || fullAppearance.includes('ronde') || 
                      fullAppearance.includes('généreuse') || fullAppearance.includes('grosse') || fullAppearance.includes('thick');
      
      if (isCurvy || ['D', 'DD', 'E', 'F', 'G', 'H'].includes(normalizedBust)) {
        anatomy += ', hourglass figure, curvy sexy body, prominent bust and hips';
      } else if (['A', 'B'].includes(normalizedBust)) {
        anatomy += ', slim elegant figure, petite feminine body, graceful silhouette';
      } else {
        anatomy += ', balanced feminine figure, natural curves, attractive proportions';
      }
    }
    
    // === HOMMES - PHYSIQUE ET ATTRIBUTS ===
    if (character.gender === 'male') {
      const bodyType = (character.bodyType || '').toLowerCase();
      const appearance = (character.appearance || '').toLowerCase();
      
      // Déterminer le type de corps basé sur bodyType/appearance
      if (bodyType.includes('muscl') || bodyType.includes('athléti') || appearance.includes('muscl')) {
        anatomy += ', muscular athletic male body, broad shoulders, defined pecs, six-pack abs, V-shaped torso, strong arms';
      } else if (bodyType.includes('mince') || bodyType.includes('slim') || bodyType.includes('élancé')) {
        anatomy += ', slim lean male body, slender build, toned physique, narrow waist';
      } else if (bodyType.includes('massif') || bodyType.includes('puissant') || bodyType.includes('trapu')) {
        anatomy += ', massive powerful male body, very broad shoulders, thick muscular build, imposing physique';
      } else if (bodyType.includes('moyen') || bodyType.includes('normal')) {
        anatomy += ', average male build, normal proportions, healthy physique';
      } else {
        anatomy += ', fit male body, masculine build, natural proportions';
      }
      
      // Taille du pénis (pour images explicites si mentionné)
      const penisSize = character.penis || character.maleSize;
      if (penisSize) {
        const size = parseInt(penisSize) || 15;
        if (size >= 22) {
          anatomy += ', very well endowed, impressive masculine attributes';
        } else if (size >= 18) {
          anatomy += ', well endowed, masculine attributes';
        }
      }
    }
    
    // === TEMPÉRAMENT (influence l'expression et la pose) ===
    const temperament = (character.temperament || '').toLowerCase();
    if (temperament) {
      if (temperament.includes('dominant') || temperament.includes('confiant')) {
        anatomy += ', confident powerful expression, dominant commanding presence, intense gaze';
      } else if (temperament.includes('timide') || temperament.includes('shy') || temperament.includes('gentle')) {
        anatomy += ', soft gentle expression, shy demure look, sweet innocent face';
      } else if (temperament.includes('passionn') || temperament.includes('passion')) {
        anatomy += ', passionate intense expression, burning desire in eyes, fiery presence';
      } else if (temperament.includes('mysterious') || temperament.includes('mystér')) {
        anatomy += ', mysterious enigmatic expression, alluring secretive gaze, intriguing presence';
      } else if (temperament.includes('playful') || temperament.includes('joueur') || temperament.includes('espiègle')) {
        anatomy += ', playful mischievous expression, teasing smile, fun spirited presence';
      } else if (temperament.includes('caring') || temperament.includes('doux') || temperament.includes('tender')) {
        anatomy += ', warm caring expression, gentle loving eyes, nurturing presence';
      } else if (temperament.includes('flirt') || temperament.includes('séduct')) {
        anatomy += ', flirtatious seductive expression, bedroom eyes, alluring inviting look';
      } else if (temperament.includes('direct') || temperament.includes('assertive')) {
        anatomy += ', direct assertive expression, confident bold gaze, straightforward presence';
      }
    }
    
    // Pour réaliste: insister sur l'anatomie correcte
    if (isRealistic) {
      anatomy += ', correct human anatomy, proper body proportions, natural limb positions';
      anatomy += ', realistic hands with five fingers each, proper arm length, symmetrical features';
    }
    
    return anatomy;
  }

  /**
   * Génère un profil d'apparence physique ULTRA-DÉTAILLÉ pour un personnage
   * Utilisé pour la page de profil et les descriptions
   */
  generateCompletePhysicalProfile(character) {
    let profile = '';
    
    // Genre et âge
    if (character.gender === 'female') {
      profile += `Femme de ${character.age || '?'} ans`;
    } else if (character.gender === 'male') {
      profile += `Homme de ${character.age || '?'} ans`;
    } else {
      profile += `Personne de ${character.age || '?'} ans`;
    }
    
    // Taille
    if (character.height) {
      profile += ` mesurant ${character.height}`;
    }
    
    // Type de corps
    if (character.bodyType) {
      profile += `, silhouette ${character.bodyType}`;
    }
    
    profile += '.\n\n';
    
    // Cheveux
    profile += '💇 CHEVEUX: ';
    if (character.hairColor) {
      profile += `${character.hairColor}`;
    }
    if (character.hairLength) {
      profile += `, ${character.hairLength}`;
    }
    profile += '\n';
    
    // Yeux
    profile += '👁️ YEUX: ';
    if (character.eyeColor) {
      profile += `${character.eyeColor}`;
    }
    profile += '\n';
    
    // Peau
    if (character.skinTone) {
      profile += `🎨 PEAU: ${character.skinTone}\n`;
    }
    
    // Corps spécifique selon le genre
    if (character.gender === 'female') {
      profile += '👗 SILHOUETTE: ';
      if (character.bust) {
        profile += `Poitrine ${character.bust}`;
      }
      if (character.bodyType) {
        profile += `, corps ${character.bodyType}`;
      }
      profile += '\n';
    } else if (character.gender === 'male') {
      profile += '💪 PHYSIQUE: ';
      if (character.bodyType) {
        profile += `Corps ${character.bodyType}`;
      }
      if (character.penis) {
        profile += `, ${character.penis} cm`;
      }
      profile += '\n';
    }
    
    // Tempérament
    if (character.temperament) {
      profile += `🎭 TEMPÉRAMENT: ${character.temperament}\n`;
    }
    
    // Description complète
    if (character.appearance) {
      profile += `\n📝 DESCRIPTION COMPLÈTE:\n${character.appearance}`;
    }
    
    return profile;
  }

  /**
   * MODE NSFW - Version explicite
   * NE PAS ajouter de tenues ici - la tenue vient de getOutfitByLevel
   */
  buildNSFWPrompt(character, isRealistic = false) {
    let nsfw = '';
    
    // Expressions sensuelles (PAS de tenues, juste l'ambiance)
    nsfw += ', seductive sexy expression, bedroom eyes, sultry gaze, sensual atmosphere';
    nsfw += ', smooth flawless skin, beautiful body, attractive physique';
    
    if (character.gender === 'female') {
      // Poitrine (description uniquement, pas de vêtements)
      const bustSize = character.bust || character.bustSize;
      if (bustSize) {
        const bustDescriptions = {
          'A': 'small perky breasts',
          'B': 'petite natural breasts',
          'C': 'medium beautiful breasts',
          'D': 'large generous breasts, full bust',
          'DD': 'very large breasts, impressive bust',
          'E': 'huge breasts, massive bust',
          'F': 'enormous breasts, gigantic bust',
          'G': 'massive huge breasts',
          'H': 'enormous massive breasts'
        };
        
        let normalizedBust = bustSize;
        if (bustSize.toLowerCase().includes('petit')) normalizedBust = 'B';
        else if (bustSize.toLowerCase().includes('moyen')) normalizedBust = 'C';
        else if (bustSize.toLowerCase().includes('génér') || bustSize.toLowerCase().includes('voluptu')) normalizedBust = 'D';
        else if (bustSize.toLowerCase().includes('énorme')) normalizedBust = 'E';
        
        nsfw += `, ${bustDescriptions[normalizedBust] || bustDescriptions[bustSize] || 'beautiful breasts'}`;
      }
      
      nsfw += ', feminine curves, hourglass figure, sensual body';
      
    } else if (character.gender === 'male') {
      nsfw += ', masculine physique, attractive male body';
      if (character.penis) {
        const size = parseInt(character.penis) || 15;
        if (size >= 20) nsfw += ', extremely muscular body, powerful build';
        else if (size >= 17) nsfw += ', athletic muscular body';
      }
    }
    
    if (isRealistic) {
      nsfw += ', professional boudoir photography, high-end erotic photoshoot';
      nsfw += ', intimate sensual photo, elegant erotica, perfect lighting';
    } else {
      nsfw += ', beautiful ecchi anime art, high quality nsfw anime';
    }
    
    nsfw += ', NSFW content, adult only, erotic, sexy, sensual';
    
    return nsfw;
  }

  /**
   * MODE SFW
   */
  buildSFWPrompt(character, isRealistic = false) {
    let sfw = ', fully clothed, appropriate attire, decent outfit';
    
    const appearance = (character.appearance || '').toLowerCase();
    
    if (appearance.includes('élégant') || appearance.includes('elegant')) {
      sfw += ', elegant sophisticated outfit, classy clothing';
    } else if (appearance.includes('professionnel') || appearance.includes('professional')) {
      sfw += ', professional business attire, formal clothing';
    } else if (appearance.includes('sport') || appearance.includes('athletic')) {
      sfw += ', athletic sportswear, fitness outfit';
    } else {
      sfw += ', casual modern clothing, stylish outfit';
    }
    
    sfw += ', natural confident pose, friendly expression';
    
    if (isRealistic) {
      sfw += ', professional portrait photography, natural lighting, clean background';
    }
    
    return sfw;
  }

  /**
   * Génère l'image du personnage (profil) - MODE SFW
   * Les images de profil sont TOUJOURS SFW (élégantes mais pas explicites)
   * v5.0.5: Correction genre masculin - tenues et poses spécifiques par genre
   */
  async generateCharacterImage(character, userProfile = null) {
    // Parser l'âge correctement (gère "300 ans (apparence 25)")
    const charAge = this.parseCharacterAge(character.age);
    if (charAge < 18) {
      throw new Error('Génération d\'images désactivée pour les personnages mineurs');
    }

    const isMale = character.gender === 'male';
    const isFemale = character.gender === 'female';
    
    console.log(`✨ Génération image PROFIL (SFW) pour ${character.name} - Genre: ${character.gender || 'non spécifié'}`);

    // Choisir le style (anime ou réaliste)
    const { style, isRealistic } = this.getRandomStyle();
    
    let prompt = style;
    
    // === GENRE EN PRIORITÉ ABSOLUE ===
    if (isMale) {
      prompt += ', MALE, man, masculine, gentleman, male character, male person';
      if (isRealistic) {
        prompt += ', handsome real man, male human, masculine features, male model';
      } else {
        prompt += ', handsome anime man, male anime character, bishounen, masculine anime';
      }
    } else if (isFemale) {
      prompt += ', FEMALE, woman, feminine, lady, female character, female person';
      if (isRealistic) {
        prompt += ', beautiful real woman, female human, feminine features, female model';
      } else {
        prompt += ', beautiful anime woman, female anime character, feminine anime';
      }
    }
    
    // === CONSTRUIRE UN PROMPT DÉTAILLÉ ===
    prompt += ', ' + this.buildUltraDetailedPrompt(character, isRealistic);
    
    // === TENUES SFW SELON LE GENRE ===
    if (isMale) {
      const maleOutfits = [
        'wearing elegant suit and tie, well-dressed gentleman',
        'wearing casual button-up shirt, sleeves rolled up, stylish',
        'wearing fitted t-shirt showing physique, casual cool',
        'wearing leather jacket over t-shirt, bad boy style',
        'wearing professional blazer, smart casual, attractive',
        'wearing stylish sweater, cozy masculine look',
        'wearing dress shirt open collar, confident style',
        'wearing trendy streetwear, modern masculine fashion',
      ];
      prompt += `, ${maleOutfits[Math.floor(Math.random() * maleOutfits.length)]}`;
    } else {
      const femaleOutfits = [
        'wearing elegant casual outfit, fashionable, stylish',
        'wearing beautiful dress, classy, sophisticated',
        'wearing smart casual clothes, well-dressed, attractive',
        'wearing trendy modern outfit, chic fashion',
        'wearing stylish blouse and pants, elegant',
        'wearing fashionable sundress, feminine charm',
        'wearing professional yet attractive attire',
      ];
      prompt += `, ${femaleOutfits[Math.floor(Math.random() * femaleOutfits.length)]}`;
    }
    
    // === POSES SFW SELON LE GENRE ===
    if (isMale) {
      const malePoses = [
        'confident masculine pose, charming smile',
        'standing tall with hands in pockets, cool demeanor',
        'leaning casually against wall, relaxed confident',
        'arms crossed showing confidence, friendly expression',
        'natural masculine pose, approachable look',
        'sitting confidently, relaxed powerful presence',
      ];
      prompt += `, ${malePoses[Math.floor(Math.random() * malePoses.length)]}`;
      // Qualités masculines
      prompt += ', handsome, attractive man, masculine charm, approachable';
      prompt += ', strong jawline, masculine features, male physique';
    } else {
      const femalePoses = [
        'natural confident pose, warm genuine smile',
        'elegant standing pose, friendly expression',
        'relaxed casual pose, inviting look',
        'charming pose, attractive smile',
        'graceful pose, soft natural expression',
      ];
      prompt += `, ${femalePoses[Math.floor(Math.random() * femalePoses.length)]}`;
      // Qualités féminines
      prompt += ', beautiful, attractive woman, feminine charm, approachable';
    }
    
    prompt += ', tasteful, classy, SFW, safe for work';
    
    // ANATOMIE STRICTE (pour éviter les défauts)
    prompt += ', ' + this.anatomyStrictPrompt;
    
    // === NEGATIVE PROMPT POUR ÉVITER LE MAUVAIS GENRE ===
    if (isMale) {
      // Éviter les caractéristiques féminines pour les hommes
      this.currentNegativeAdditions = 'female, woman, feminine, breasts, cleavage, dress, skirt, makeup, lipstick, long eyelashes, feminine features, girly';
    } else if (isFemale) {
      // Éviter les caractéristiques masculines pour les femmes
      this.currentNegativeAdditions = 'male, man, masculine, beard, stubble, muscular arms, male features, manly';
    }
    
    // QUALITÉ SPÉCIFIQUE AU STYLE
    if (isRealistic) {
      prompt += ', ' + this.buildRealisticQualityPrompts();
      prompt += ', ultra-high quality photo, 8K resolution, sharp focus, professional photography';
      prompt += ', realistic skin texture, lifelike details, photographic quality';
      prompt += ', single person only, one subject, solo portrait, perfect lighting';
    } else {
      prompt += ', masterpiece anime art, best quality illustration, highly detailed anime';
      prompt += ', clean lines, vibrant colors, professional anime artwork';
      prompt += ', single character, solo, one person, detailed face';
    }

    console.log(`🖼️ Génération image profil SFW (${isRealistic ? 'RÉALISTE' : 'ANIME'}) - ${isMale ? 'HOMME' : 'FEMME'}...`);
    return await this.generateImage(prompt);
  }
  
  /**
   * Construit un prompt ULTRA-DÉTAILLÉ basé sur TOUS les attributs du personnage
   * v4.3.30 ENHANCED: Utilise imagePrompt optimisé en priorité
   * Inclut: visage, cheveux, corps, morphologie, poitrine/pénis, fesses, hanches, peau, etc.
   */
  buildUltraDetailedPrompt(character, isRealistic = false) {
    // === v4.3.30 ENHANCED: Si imagePrompt optimisé disponible, l'utiliser en priorité ===
    if (character.imagePrompt && character.imagePrompt.length > 50) {
      console.log('🎯 Utilisation imagePrompt optimisé v4.3.30');
      // Ajouter les qualités de base selon le style
      let enhancedPrompt = character.imagePrompt;
      if (isRealistic) {
        enhancedPrompt += ', photorealistic, ultra detailed, professional photography, 8k, sharp focus';
      } else {
        enhancedPrompt += ', anime style, detailed illustration, masterpiece quality';
      }
      return enhancedPrompt;
    }
    
    // === Fallback: construire le prompt à partir des attributs ===
    const parts = [];
    
    // Collecter TOUTES les données pour analyse
    const allData = [
      character.appearance || '',
      character.physicalDescription || '',
      character.bodyType || '',
      character.imagePrompt || '',
      (character.tags || []).join(' '),
      character.hairColor || '',
      character.hairLength || '',
      character.eyeColor || '',
      character.outfit || ''
    ].join(' ').toLowerCase();
    
    // === 1. GENRE ===
    if (character.gender === 'female') {
      parts.push(isRealistic ? 'beautiful real woman, female human' : 'beautiful anime woman, female character');
    } else if (character.gender === 'male') {
      parts.push(isRealistic ? 'handsome real man, male human' : 'handsome anime man, male character');
    } else {
      parts.push('beautiful androgynous person');
    }
    
    // === 2. ÂGE ===
    const age = this.parseCharacterAge(character.age);
    parts.push(`${age} years old`);
    if (age >= 45) parts.push('mature elegant sophisticated');
    else if (age >= 35) parts.push('mature confident adult');
    else if (age >= 28) parts.push('adult prime of life');
    else parts.push('young adult');
    
    // === 3. FORME DU VISAGE ===
    if (allData.includes('visage ovale') || allData.includes('oval face')) parts.push('oval face shape');
    else if (allData.includes('visage rond') || allData.includes('round face')) parts.push('round soft face');
    else if (allData.includes('visage carré') || allData.includes('square')) parts.push('square strong jawline');
    else if (allData.includes('visage fin') || allData.includes('thin face') || allData.includes('fin visage')) parts.push('delicate fine facial features');
    else if (allData.includes('visage doux') || allData.includes('soft face')) parts.push('soft gentle facial features');
    else if (allData.includes('pommettes') || allData.includes('cheekbones')) parts.push('high prominent cheekbones');
    else if (allData.includes('mâchoire') || allData.includes('jaw')) parts.push('defined jawline');
    
    // === 4. CHEVEUX - COULEUR ===
    const hairColor = character.hairColor || '';
    if (hairColor) {
      // Traduire les couleurs françaises
      let colorEn = hairColor.toLowerCase()
        .replace('noir', 'black').replace('noire', 'black')
        .replace('brun', 'brown').replace('brune', 'brown').replace('châtain', 'chestnut brown')
        .replace('blond', 'blonde').replace('blonde', 'blonde')
        .replace('roux', 'red ginger').replace('rousse', 'red ginger')
        .replace('blanc', 'white').replace('blanche', 'white')
        .replace('gris', 'grey').replace('grise', 'grey')
        .replace('rose', 'pink').replace('bleu', 'blue').replace('vert', 'green')
        .replace('violet', 'purple').replace('argent', 'silver');
      parts.push(`beautiful ${colorEn} hair`);
    }
    
    // === 5. CHEVEUX - LONGUEUR ===
    if (allData.includes('très long') || allData.includes('very long') || allData.includes('hanches') || allData.includes('taille')) {
      parts.push('extremely long hair reaching waist');
    } else if (allData.includes('long') || allData.includes('longs cheveux')) {
      parts.push('long flowing hair');
    } else if (allData.includes('mi-long') || allData.includes('épaules') || allData.includes('shoulder')) {
      parts.push('shoulder-length hair');
    } else if (allData.includes('court') || allData.includes('short')) {
      parts.push('short stylish hair');
    } else if (allData.includes('carré') || allData.includes('bob')) {
      parts.push('bob haircut');
    }
    
    // === 6. CHEVEUX - TEXTURE ===
    if (allData.includes('lisse') || allData.includes('straight') || allData.includes('raide')) {
      parts.push('straight sleek hair');
    } else if (allData.includes('ondulé') || allData.includes('wavy')) {
      parts.push('wavy flowing hair');
    } else if (allData.includes('bouclé') || allData.includes('curly') || allData.includes('boucl')) {
      parts.push('curly bouncy hair');
    } else if (allData.includes('frisé') || allData.includes('frizzy') || allData.includes('crépu') || allData.includes('afro')) {
      parts.push('kinky coily afro-textured hair');
    } else if (allData.includes('épais') || allData.includes('thick hair')) {
      parts.push('thick voluminous hair');
    } else if (allData.includes('fin') || allData.includes('fine hair')) {
      parts.push('fine delicate hair');
    } else if (allData.includes('soyeux') || allData.includes('silky')) {
      parts.push('silky smooth hair');
    }
    
    // === 7. YEUX ===
    const eyeColor = character.eyeColor || '';
    if (eyeColor) {
      let eyeEn = eyeColor.toLowerCase()
        .replace('bleu', 'blue').replace('vert', 'green').replace('marron', 'brown')
        .replace('noisette', 'hazel').replace('noir', 'dark').replace('gris', 'grey');
      parts.push(`beautiful ${eyeEn} eyes`);
    } else if (allData.includes('yeux bleu')) parts.push('bright blue eyes');
    else if (allData.includes('yeux vert')) parts.push('emerald green eyes');
    else if (allData.includes('yeux marron') || allData.includes('yeux brun')) parts.push('warm brown eyes');
    else if (allData.includes('yeux noir')) parts.push('deep dark eyes');
    else if (allData.includes('yeux noisette')) parts.push('hazel eyes');
    else parts.push('expressive beautiful eyes');
    
    // === 8. COULEUR DE PEAU ===
    if (allData.includes('pâle') || allData.includes('porcelaine') || allData.includes('pale')) {
      parts.push('pale porcelain fair skin');
    } else if (allData.includes('bronzé') || allData.includes('doré') || allData.includes('tan')) {
      parts.push('tanned golden sun-kissed skin');
    } else if (allData.includes('ébène') || allData.includes('noir') || allData.includes('dark skin') || allData.includes('ebony')) {
      parts.push('beautiful dark ebony skin');
    } else if (allData.includes('caramel') || allData.includes('métis') || allData.includes('mixed')) {
      parts.push('warm caramel mixed skin');
    } else if (allData.includes('olive') || allData.includes('méditerran') || allData.includes('latin')) {
      parts.push('olive mediterranean skin');
    } else if (allData.includes('asiat') || allData.includes('asian')) {
      parts.push('fair asian skin');
    } else {
      parts.push('natural healthy skin');
    }
    
    // === 9. TYPE DE PEAU ===
    if (allData.includes('taches de rousseur') || allData.includes('freckles')) parts.push('with cute freckles');
    if (allData.includes('grain de beauté') || allData.includes('beauty mark')) parts.push('with beauty mark');
    if (allData.includes('douce') || allData.includes('soft skin')) parts.push('soft smooth skin');
    
    // === 10. MORPHOLOGIE / BODY TYPE - TRÈS DÉTAILLÉ ET RENFORCÉ ===
    // Ronde / Très ronde / BBW - PRIORITAIRE
    if (allData.includes('très ronde') || allData.includes('bbw') || allData.includes('très grosse') || allData.includes('obèse')) {
      parts.push('BBW BODY TYPE, very curvy thick plump body, very full-figured, big beautiful woman, fat body, chubby figure, large body');
    } else if (allData.includes('ronde') || allData.includes('chubby') || allData.includes('potel') || allData.includes('plump')) {
      parts.push('CURVY PLUMP BODY, soft rounded figure, chubby body, full-figured woman, thick body');
    } else if (allData.includes('enrobé') || allData.includes('enveloppé') || allData.includes('soft body')) {
      parts.push('SOFT PLUMP BODY, pleasantly padded figure, soft curves, rounded body');
    }
    // Généreuse / Voluptueuse
    else if (allData.includes('généreuse') || allData.includes('voluptu') || allData.includes('curvy') || allData.includes('formes')) {
      parts.push('VOLUPTUOUS CURVY BODY, full-figured with generous curves, hourglass figure, sexy curves everywhere');
    }
    // Pulpeuse / Thick
    else if (allData.includes('pulpeuse') || allData.includes('thick')) {
      parts.push('THICK CURVY BODY, pronounced sexy curves, full-figured, thick thighs and hips');
    }
    // Maternelle
    else if (allData.includes('maternelle') || allData.includes('maternal') || allData.includes('femme au foyer')) {
      parts.push('SOFT MATERNAL BODY, curvy womanly figure, nurturing physique, soft curves');
    }
    // Athlétique / Musclée
    else if (allData.includes('musclé') || allData.includes('athletic') || allData.includes('fit') || allData.includes('tonique')) {
      parts.push('ATHLETIC TONED BODY, fit physique, defined muscles, sporty figure');
    }
    // Mince / Élancée
    else if (allData.includes('mince') || allData.includes('slim') || allData.includes('élanc') || allData.includes('slender')) {
      parts.push('SLIM SLENDER BODY, lean figure, thin physique, slender frame');
    }
    // Petite
    else if (allData.includes('petite') && allData.includes('mince')) {
      parts.push('PETITE SLIM BODY, small delicate frame, tiny figure');
    }
    
    // === 11. TAILLE ===
    if (allData.includes('grande') || allData.includes('tall') || allData.includes('longues jambes')) {
      parts.push('tall stature, long legs');
    } else if (allData.includes('petite') || allData.includes('small')) {
      parts.push('petite short stature');
    }
    
    // === 12. POITRINE (FEMMES) - PRIORITÉ HAUTE ===
    if (character.gender === 'female') {
      const bust = (character.bust || '').toUpperCase();
      // Descriptions TRÈS détaillées et renforcées pour chaque bonnet
      const bustDesc = {
        'A': 'SMALL A-CUP BREASTS, petite flat chest, tiny breasts, small bust',
        'B': 'SMALL B-CUP BREASTS, modest small breasts, petite bust, small chest',
        'C': 'MEDIUM C-CUP BREASTS, average breasts, normal sized bust, moderate chest',
        'D': 'LARGE D-CUP BREASTS, big breasts, full generous bust, impressive cleavage, large chest',
        'DD': 'VERY LARGE DD-CUP BREASTS, big heavy breasts, impressive large bust, deep cleavage',
        'E': 'HUGE E-CUP BREASTS, very big breasts, enormous bust, massive chest, heavy breasts',
        'F': 'HUGE F-CUP BREASTS, massive breasts, gigantic bust, extremely large chest, heavy hanging breasts',
        'G': 'GIGANTIC G-CUP BREASTS, enormous massive breasts, huge heavy bust, extremely big chest',
        'H': 'MASSIVE H-CUP BREASTS, enormous gigantic breasts, extremely heavy huge bust, colossal chest'
      };
      
      if (bustDesc[bust]) {
        // Ajouter la description de poitrine EN PRIORITÉ
        parts.push(bustDesc[bust]);
        // Renforcer pour les grandes poitrines
        if (['E', 'F', 'G', 'H'].includes(bust)) {
          parts.push('prominent large breasts, very big bust visible');
        } else if (['D', 'DD'].includes(bust)) {
          parts.push('noticeable big breasts, generous bust');
        } else if (['A', 'B'].includes(bust)) {
          parts.push('small chest, flat-chested, petite breasts');
        }
      } else if (allData.includes('énorme poitrine') || allData.includes('énormes seins') || allData.includes('huge breasts')) {
        parts.push('HUGE MASSIVE BREASTS, enormous bust, very big heavy chest');
      } else if (allData.includes('grosse poitrine') || allData.includes('gros seins') || allData.includes('large breasts')) {
        parts.push('LARGE FULL BREASTS, big generous bust, impressive chest');
      } else if (allData.includes('petite poitrine') || allData.includes('small breasts')) {
        parts.push('SMALL PETITE BREASTS, flat chest, tiny bust');
      }
    }
    
    // === 13. PÉNIS (HOMMES) ===
    if (character.gender === 'male' && character.penis) {
      const size = parseInt(character.penis);
      if (size >= 22) parts.push('very well endowed, large');
      else if (size >= 18) parts.push('well endowed');
      else if (size >= 15) parts.push('average build');
    }
    
    // === 14. FESSES ===
    if (allData.includes('énorme fesse') || allData.includes('huge butt') || allData.includes('très grosses fesses')) {
      parts.push('huge massive round butt, very big thick ass');
    } else if (allData.includes('grosse fesse') || allData.includes('big butt') || allData.includes('grosses fesses') || allData.includes('gros fessier')) {
      parts.push('big round plump butt, large thick buttocks');
    } else if (allData.includes('fesses rebondies') || allData.includes('bubble butt') || allData.includes('fesses rondes')) {
      parts.push('round bubble butt, perky buttocks');
    } else if (allData.includes('fesses plates') || allData.includes('flat butt')) {
      parts.push('small flat butt');
    } else if (allData.includes('fesses musclées') || allData.includes('toned butt')) {
      parts.push('toned muscular firm butt');
    }
    
    // === 15. HANCHES ===
    if (allData.includes('très larges hanches') || allData.includes('very wide hips')) {
      parts.push('very wide generous hips, extremely broad');
    } else if (allData.includes('hanches larges') || allData.includes('wide hips') || allData.includes('larges hanches')) {
      parts.push('wide generous hips');
    } else if (allData.includes('hanches étroites') || allData.includes('narrow hips')) {
      parts.push('narrow slim hips');
    }
    
    // === 16. CUISSES ===
    if (allData.includes('très grosses cuisses') || allData.includes('huge thighs')) {
      parts.push('very thick massive thighs');
    } else if (allData.includes('cuisses épaisses') || allData.includes('thick thighs') || allData.includes('grosses cuisses')) {
      parts.push('thick meaty thighs');
    } else if (allData.includes('cuisses fines') || allData.includes('slim thighs')) {
      parts.push('slim slender thighs');
    }
    
    // === 17. VENTRE ===
    if (allData.includes('gros ventre') || allData.includes('big belly') || allData.includes('énorme ventre')) {
      parts.push('big round soft belly, large plump tummy');
    } else if (allData.includes('ventre rond') || allData.includes('round belly') || allData.includes('ventre doux')) {
      parts.push('soft round belly, plump cute tummy');
    } else if (allData.includes('ventre plat') || allData.includes('flat stomach')) {
      parts.push('flat toned stomach');
    }
    
    // === 18. SILHOUETTE ===
    if (allData.includes('sablier') || allData.includes('hourglass')) {
      parts.push('perfect hourglass figure');
    } else if (allData.includes('poire') || allData.includes('pear')) {
      parts.push('pear-shaped body, wider hips');
    }
    
    // === 19. ACCESSOIRES ===
    if (allData.includes('lunettes') || allData.includes('glasses')) parts.push('wearing glasses');
    if (allData.includes('piercing')) parts.push('with piercings');
    if (allData.includes('tatouage') || allData.includes('tattoo')) parts.push('with tattoos');
    
    // === 20. imagePrompt DU PERSONNAGE (toujours ajouter si existe) ===
    if (character.imagePrompt) {
      // Ajouter le imagePrompt personnalisé qui contient souvent des détails précis
      parts.push(character.imagePrompt);
    }
    
    // === 21. QUALITÉ ===
    if (isRealistic) {
      parts.push('photorealistic, ultra detailed, 8K, professional photography, perfect anatomy');
    } else {
      parts.push('high quality anime art, detailed illustration, perfect anatomy');
    }
    
    console.log(`📋 Prompt ultra-détaillé généré: ${parts.length} éléments`);
    return parts.filter(p => p && p.trim()).join(', ');
  }
  
  /**
   * Prompt NSFW spécifique pour le profil (plus soft que conversation)
   */
  buildProfileNSFWPrompt(character, isRealistic = false) {
    const poses = [
      'elegant pose, confident stance',
      'alluring pose, seductive look',
      'relaxed pose, inviting expression',
      'graceful pose, soft smile',
    ];
    const pose = poses[Math.floor(Math.random() * poses.length)];
    
    let prompt = `, ${pose}`;
    
    if (character.gender === 'female') {
      prompt += ', sensual, attractive, feminine beauty';
      if (isRealistic) {
        prompt += ', professional boudoir photography style';
      }
    } else if (character.gender === 'male') {
      prompt += ', masculine, attractive, confident';
      if (isRealistic) {
        prompt += ', professional portrait photography';
      }
    }
    
    return prompt;
  }

  /**
   * Génère l'image de scène (conversation)
   * @param {Object} character - Le personnage
   * @param {Object} userProfile - Le profil utilisateur
   * @param {Array} recentMessages - Messages récents
   * @param {number} relationLevel - Niveau de relation (1-5+)
   * MAINTENANT AVEC GRANDE VARIÉTÉ: positions, lieux, éclairages, ambiances
   * v5.0.5: Support complet du genre masculin
   */
  async generateSceneImage(character, userProfile = null, recentMessages = [], relationLevel = 1) {
    // Parser l'âge correctement (gère "300 ans (apparence 25)")
    const charAge = this.parseCharacterAge(character.age);
    if (charAge < 18) {
      throw new Error('Génération d\'images désactivée pour les personnages mineurs');
    }

    const level = Math.max(1, relationLevel || 1);
    const isNSFW = level >= 2; // NSFW seulement à partir du niveau 2
    const isMale = character.gender === 'male';
    const isFemale = character.gender === 'female';
    
    console.log(`🖼️ Génération image niveau ${level} - ${isNSFW ? '🔞 NSFW' : '✨ SFW'} - Genre: ${isMale ? 'HOMME' : 'FEMME'}`);

    // Choisir le style
    const { style, isRealistic } = this.getRandomStyle();
    
    // === EXTRAIRE LE CONTEXTE DE CONVERSATION ===
    const conversationContext = this.extractConversationContext(recentMessages);
    console.log(`📍 Contexte conversation:`, conversationContext);
    
    // === GÉNÉRER LES ÉLÉMENTS VARIÉS ===
    const sceneElements = this.generateVariedSceneElements();
    
    let prompt = style;
    
    // === v5.0.5: GENRE EN PRIORITÉ ABSOLUE ===
    if (isMale) {
      prompt += ', MALE, man, masculine, male character, male person, gentleman';
      if (isRealistic) {
        prompt += ', handsome real man, male human, masculine features, male model, male physique';
      } else {
        prompt += ', handsome anime man, male anime character, bishounen, masculine anime, ikemen';
      }
    } else if (isFemale) {
      prompt += ', FEMALE, woman, feminine, female character, female person, lady';
      if (isRealistic) {
        prompt += ', beautiful real woman, female human, feminine features, female model';
      } else {
        prompt += ', beautiful anime woman, female anime character, feminine anime';
      }
    }
    
    // === DESCRIPTION PHYSIQUE ULTRA-DÉTAILLÉE ===
    prompt += ', ' + this.buildUltraDetailedPhysicalPrompt(character, isRealistic);
    
    // === UTILISER imagePrompt si disponible ===
    if (character.imagePrompt) {
      // Nettoyer et ajouter l'imagePrompt du personnage
      const cleanImagePrompt = character.imagePrompt.replace(/\n/g, ' ').trim();
      prompt += ', ' + cleanImagePrompt;
    }
    
    // === APPLIQUER LE CONTEXTE DE CONVERSATION ===
    // Lieu détecté dans la conversation (priorité sur le lieu aléatoire)
    if (conversationContext.location) {
      prompt += `, ${conversationContext.location}`;
      console.log(`📍 Lieu conversation: ${conversationContext.location}`);
    }
    
    // Position détectée
    if (conversationContext.position) {
      prompt += `, ${conversationContext.position}`;
      console.log(`🎭 Position conversation: ${conversationContext.position}`);
    }
    
    // Tenue détectée (pour SFW/NSFW)
    if (conversationContext.outfit && isNSFW) {
      prompt += `, ${conversationContext.outfit}`;
      console.log(`👗 Tenue conversation: ${conversationContext.outfit}`);
    }
    
    // Action en cours
    if (conversationContext.action) {
      prompt += `, ${conversationContext.action}`;
    }
    
    // === CARACTÉRISTIQUES CORPORELLES SPÉCIFIQUES ===
    const bodyFeatures = this.extractBodyFeatures(character);
    if (bodyFeatures) {
      prompt += `, ${bodyFeatures}`;
      console.log(`💪 CORPS: ${bodyFeatures.substring(0, 100)}...`);
    }
    
    // === SELON LE MODE SFW/NSFW ===
    if (isNSFW) {
      // === MODE NSFW v5.0.5 - SUPPORT GENRE MASCULIN ===
      console.log(`🔞 Mode NSFW v5.0.5 actif - Niveau ${level} - ${isMale ? 'HOMME' : 'FEMME'}`);
      
      // Anatomie détaillée pour NSFW
      prompt += this.buildAnatomyDescription(character, isRealistic);
      
      // === POSES NSFW SELON LE GENRE ===
      let randomPose;
      if (isMale) {
        // POSES MASCULINES NSFW
        const maleNSFWPoses = [
          // DEBOUT
          'standing confidently, muscular body on display, powerful masculine stance',
          'standing against wall, arms crossed, showing off physique, dominant pose',
          'standing by window, silhouette showing muscular build, brooding look',
          'standing nude, stretching arms above head, full masculine body exposed',
          'standing with hands on hips, confident nude male pose',
          // ALLONGÉ
          'lying on back on bed, arms behind head, muscular chest exposed, relaxed',
          'lying on silk sheets, one arm behind head, masculine body displayed',
          'lying on back, confident expression, nude male body visible',
          'lying on fur rug by fireplace, nude masculine body glowing',
          // SUR LE VENTRE
          'lying on stomach, looking back over shoulder, muscular back visible',
          'lying face down, relaxed masculine pose, rear view',
          // SUR LE CÔTÉ
          'lying on side, propped on elbow, masculine physique emphasized',
          'reclining sideways, confident male pose, body on display',
          // ASSIS
          'sitting on edge of bed, legs apart, confident masculine pose',
          'sitting in armchair, legs spread, dominant relaxed pose',
          'sitting confidently, nude masculine body, powerful presence',
          // POSES DOMINANTES
          'standing dominant pose, muscular arms flexed, powerful',
          'leaning against doorframe, casual confident, showing off body',
          'towel around waist only, post-shower, wet masculine body',
          // SPÉCIALES
          'stepping out of shower, water droplets on muscular body',
          'undressing, shirt coming off, muscular torso revealed',
          'stretching like just woke up, nude and natural male',
          'workout pose, muscles flexed, sweaty athletic male',
        ];
        randomPose = maleNSFWPoses[Math.floor(Math.random() * maleNSFWPoses.length)];
      } else {
        // POSES FÉMININES NSFW (original)
        const femaleNSFWPoses = [
          // DEBOUT - Poses sexy
          'standing confidently with one hand on hip, weight on one leg, seductive stance',
          'standing against wall, back arched, pushing chest forward provocatively',
          'standing by window, silhouette visible, turning to look over shoulder',
          'standing legs apart, hands running through hair, inviting look',
          'standing nude, stretching arms above head, full body exposed',
          // ALLONGÉE SUR LE DOS
          'lying on back on bed, arms stretched above head, legs slightly parted, inviting',
          'lying on silk sheets, one knee up, hand on thigh, sensual gaze',
          'lying on back, legs spread wide open, intimate view',
          'lying on bed, touching own breasts, eyes closed in pleasure',
          'lying on fur rug by fireplace, nude body glowing, relaxed pose',
          // ALLONGÉE SUR LE VENTRE
          'lying on stomach, feet up playfully, butt prominently displayed',
          'lying face down, looking back over shoulder, rear view focus',
          'lying on stomach, propped on elbows, cleavage visible, flirty smile',
          // SUR LE CÔTÉ
          'lying on side, propped on elbow, curves emphasized, sensual',
          'lying on side, one leg raised, intimate angle visible',
          'reclining sideways, hand tracing body curves, seductive',
          // À GENOUX
          'kneeling on bed, sitting on heels, hands on thighs, submissive pose',
          'kneeling upright, back arched, breasts thrust forward, confident',
          'kneeling on all fours from behind, looking back seductively, rear emphasized',
          'kneeling with legs apart, hands exploring own body, erotic',
          // À QUATRE PATTES
          'on all fours, back arched dramatically, rear fully visible',
          'on hands and knees from behind, provocative rear view, inviting',
          'on all fours, looking back with intense gaze, seductive',
          // ASSISE
          'sitting on edge of bed, legs spread, leaning back on hands',
          'sitting cross-legged, topless, confident smile',
          'sitting in armchair, one leg over armrest, exposed',
          'sitting on floor, knees up and apart, intimate view',
          // PENCHÉE
          'bent over vanity table, rear prominently displayed',
          'bending forward, cleavage deep and visible, seductive smile',
          'bent over bed, rear view, looking back invitingly',
          'leaning forward on elbows, breasts hanging, sensual',
          // ÉCARTÉE
          'legs spread wide on bed, nothing hidden, explicit pose',
          'legs open in chair, fully exposed, confident expression',
          'straddling position, legs wide apart, dominant pose',
          // SPÉCIALES
          'in bathtub, covered in bubbles, wet skin glistening',
          'stepping out of shower, water droplets on body',
          'undressing, clothes falling off, caught mid-motion',
          'stretching like just woke up, nude and natural',
          'yoga pose, flexible body displayed, sensual',
        ];
        randomPose = femaleNSFWPoses[Math.floor(Math.random() * femaleNSFWPoses.length)];
      }
      prompt += `, ${randomPose}`;
      console.log(`🎭 POSE: ${randomPose.substring(0, 60)}...`);
      
      // === TENUES NSFW SELON LE GENRE ===
      let megaOutfits;
      if (isMale) {
        // TENUES MASCULINES NSFW
        megaOutfits = [
          // Semi-habillé
          'wearing unbuttoned shirt showing muscular chest, jeans',
          'wearing open robe showing nude body underneath, masculine',
          'wearing only boxer briefs, muscular body visible',
          'wearing tight underwear, bulge visible, masculine physique',
          'wearing swim trunks only, wet athletic body',
          // Torse nu
          'shirtless, muscular torso exposed, jeans unzipped',
          'topless showing defined abs and pecs, towel around waist',
          'bare chest, muscles glistening, confident pose',
          // Nu
          'completely nude, naked masculine body fully exposed',
          'fully naked, nothing hidden, male physique displayed',
          'nude with only watch, elegant masculine nudity',
          'naked male body, athletic and toned',
          // Provocant
          'wearing tight tank top showing muscles, short shorts',
          'wearing open leather jacket, bare chest, masculine',
          'wearing only towel loosely wrapped, about to fall',
        ];
      } else {
        // TENUES FÉMININES NSFW (original)
        megaOutfits = [
          // Lingerie
          'wearing sexy black lace lingerie set, bra and thong',
          'wearing red satin lingerie, push-up bra, garter belt',
          'wearing white lace bodysuit, see-through, nipples visible',
          'wearing sheer babydoll negligee, barely covering anything',
          'wearing only lace thong, topless, nipples exposed',
          // Semi-nu
          'shirt open revealing bare breasts, jeans unzipped',
          'dress pulled down to waist, breasts exposed',
          'towel falling off, nude body partially visible',
          'robe untied and open, nude underneath',
          'sheet covering lower body only, topless',
          // Nu
          'completely nude, naked body fully exposed',
          'fully naked, nothing hidden at all',
          'nude with only high heels, elegant nudity',
          'naked wearing only jewelry, artistic nude',
          // Provocant habillé
          'wearing tight mini dress riding up, no underwear visible',
          'wearing crop top showing underboob, micro shorts',
          'wearing see-through top, nipples clearly visible',
          'wearing bikini that barely covers anything',
          'wearing unbuttoned blouse, cleavage extreme',
        ];
      }
      // Tenue basée sur le niveau
      let outfitIndex = Math.min(level - 2, megaOutfits.length - 1);
      outfitIndex = Math.max(0, outfitIndex);
      // Ajouter de la variété aléatoire dans la catégorie appropriée
      if (level >= 5) {
        // Niveaux élevés: tenues nues ou très révélatrices
        const nudeOutfits = megaOutfits.filter(o => o.includes('nude') || o.includes('naked') || o.includes('topless'));
        const randomOutfit = nudeOutfits[Math.floor(Math.random() * nudeOutfits.length)];
        prompt += `, ${randomOutfit}`;
      } else if (level >= 3) {
        // Niveaux moyens: lingerie
        const lingerieOutfits = megaOutfits.filter(o => o.includes('lingerie') || o.includes('bra'));
        const randomOutfit = lingerieOutfits[Math.floor(Math.random() * lingerieOutfits.length)];
        prompt += `, ${randomOutfit}`;
      } else {
        // Niveau 2: provocant
        const provoOutfits = megaOutfits.filter(o => o.includes('dress') || o.includes('top'));
        const randomOutfit = provoOutfits[Math.floor(Math.random() * provoOutfits.length)] || megaOutfits[0];
        prompt += `, ${randomOutfit}`;
      }
      
      // === MEGA VARIÉTÉ D'ANGLES DE CAMÉRA NSFW ===
      const megaCameraAngles = [
        // CORPS ENTIER
        'full body shot from head to toe, entire figure visible',
        'wide shot showing complete naked body',
        // FACE
        'frontal view, full body facing camera, breasts and body visible',
        'front view, standing facing viewer, nipples visible',
        // PROFIL
        'side profile showing curve of breasts and butt',
        'profile view emphasizing body silhouette',
        // DOS / FESSES
        'rear view from behind, full butt visible, looking over shoulder',
        'back view, focus on butt and back, seductive glance',
        'from behind bent over, rear prominently featured',
        // ZOOMS INTIMES
        'close-up on chest, breasts and nipples prominent',
        'zoom on butt and hips, rear close-up',
        'focus between legs, intimate close-up view',
        'upper body focus, bare breasts filling frame',
        // ANGLES SPÉCIAUX
        'from above looking down at naked body, voyeuristic',
        'low angle looking up, dramatic perspective',
        'dutch angle, artistic nude composition',
        'POV angle, personal intimate perspective',
        'mirror reflection showing front and back simultaneously',
      ];
      const randomAngle = megaCameraAngles[Math.floor(Math.random() * megaCameraAngles.length)];
      prompt += `, ${randomAngle}`;
      console.log(`📷 ANGLE: ${randomAngle.substring(0, 50)}...`);
      
      // === MEGA VARIÉTÉ DE LIEUX INTIMES ===
      const megaLocations = [
        // Chambre
        'in luxurious bedroom, silk sheets, romantic lighting',
        'on king-size bed with satin pillows, intimate atmosphere',
        'in hotel room with city view at night, ambient lights',
        'on bed covered with rose petals, romantic setting',
        // Salle de bain
        'in marble bathroom, steam and warm lighting',
        'in bubble bath, wet skin glistening',
        'in glass shower, water streaming over body',
        'by bathroom mirror, steamy atmosphere',
        // Piscine
        'by infinity pool at sunset, wet body shimmering',
        'in jacuzzi with bubbles, relaxed and sensual',
        'poolside on lounger, tropical setting',
        // Intérieur élégant
        'on leather couch in penthouse, city lights behind',
        'by fireplace, warm flickering glow on skin',
        'on fur rug, luxurious intimate setting',
        'in walk-in closet with mirrors, multiple angles',
        // Extérieur privé
        'on private balcony at night, city below',
        'on yacht deck at sunset, ocean breeze',
        'in garden gazebo, fairy lights, magical atmosphere',
      ];
      const randomLocation = megaLocations[Math.floor(Math.random() * megaLocations.length)];
      prompt += `, ${randomLocation}`;
      
      // === ÉCLAIRAGE SÉDUISANT ===
      const sexyLighting = [
        'soft romantic candlelight creating warm shadows',
        'golden hour sunset light, magical glow on skin',
        'neon pink and blue light, modern aesthetic',
        'dim ambient lighting, mysterious and intimate',
        'moonlight through sheer curtains, ethereal',
        'studio lighting highlighting body curves',
        'firelight dancing on naked skin, warm tones',
        'backlit silhouette, dramatic and artistic',
      ];
      const randomLighting = sexyLighting[Math.floor(Math.random() * sexyLighting.length)];
      prompt += `, ${randomLighting}`;
      
      // === EXPRESSION ET REGARD ===
      const sexyExpressions = [
        'intense seductive gaze, bedroom eyes, lips slightly parted',
        'playful teasing smile, mischievous expression',
        'confident dominant expression, knowing smirk',
        'innocent look but seductive pose, contrast',
        'eyes closed in pleasure, sensual expression',
        'looking directly at viewer, inviting stare',
        'biting lower lip, flirtatious, aroused',
        'orgasmic expression, ecstasy visible',
      ];
      const randomExpression = sexyExpressions[Math.floor(Math.random() * sexyExpressions.length)];
      prompt += `, ${randomExpression}`;
      
      // Prompt NSFW explicite RENFORCÉ SELON LE NIVEAU
      prompt += this.buildNSFWPrompt(character, isRealistic);
      
      // Forcer le contenu NSFW selon le niveau - v5.0.5 avec support GENRE
      if (isMale) {
        // === NIVEAUX NSFW MASCULINS ===
        if (level === 2) {
          prompt += ', NSFW, sexy, seductive, provocative masculine';
          prompt += ', tight shirt showing muscles, unbuttoned, confident male pose';
          prompt += ', sexy confident pose, flirtatious look, adult content, handsome man';
          console.log('📸 Mode NIVEAU 2: Homme provocant');
        } else if (level === 3) {
          prompt += ', NSFW, shirtless muscular torso, tight underwear';
          prompt += ', showing off male physique, seductive masculine pose';
          prompt += ', adult content, erotic, sensual masculine scene';
          console.log('📸 Mode NIVEAU 3: Homme torse nu');
        } else if (level === 4) {
          prompt += ', NSFW, nude male torso, muscular chest and abs exposed';
          prompt += ', naked from waist up, masculine body displayed';
          prompt += ', adult content, erotic, intimate male exposure';
          console.log('📸 Mode NIVEAU 4: Homme torse nu sensuel');
        } else if (level === 5) {
          prompt += ', NSFW, fully nude male, completely naked masculine body exposed';
          prompt += ', nude artistic male pose, all body visible, male physique';
          prompt += ', erotic artistic male nudity, intimate, adult only';
          console.log('📸 Mode NIVEAU 5: Homme nu intégral');
        } else if (level >= 6) {
          prompt += ', NSFW, nude sensual male pose, naked masculine body glistening';
          prompt += ', explicit adult content, passionate male, aroused expression';
          prompt += ', nude male body fully displayed, masculine and confident';
          console.log('📸 Mode NIVEAU 6+: Homme nu sensuel');
        }
      } else {
        // === NIVEAUX NSFW FÉMININS (original) ===
        if (level === 2) {
          prompt += ', NSFW, sexy, seductive, provocative outfit';
          prompt += ', revealing clothes, deep cleavage, short skirt, tight form-fitting dress';
          prompt += ', sexy confident pose, flirtatious look, adult content';
          console.log('📸 Mode NIVEAU 2: Provocante sexy');
        } else if (level === 3) {
          prompt += ', NSFW, sexy lace lingerie, bra barely containing breasts, thong';
          prompt += ', garter belt, stockings, seductive lingerie pose';
          prompt += ', adult content, erotic, sensual bedroom scene';
          console.log('📸 Mode NIVEAU 3: Lingerie chaude');
        } else if (level === 4) {
          prompt += ', NSFW, topless, bare breasts exposed, nipples clearly visible';
          prompt += ', naked from waist up, breasts fully shown, sensual topless pose';
          prompt += ', adult content, erotic, intimate exposure';
          console.log('📸 Mode NIVEAU 4: Topless seins nus');
        } else if (level === 5) {
          prompt += ', NSFW, fully nude, completely naked body exposed';
          prompt += ', nipples visible, nude artistic pose, all body visible';
          prompt += ', erotic artistic nudity, intimate, adult only';
          console.log('📸 Mode NIVEAU 5: Nu intégral artistique');
        } else if (level === 6) {
          prompt += ', NSFW, nude sensual pose, naked body glistening with sweat or oil';
          prompt += ', legs slightly apart, hands touching own body, self-caressing';
          prompt += ', explicit adult content, passionate, aroused expression';
          console.log('📸 Mode NIVEAU 6: Nu sensuel excité');
        } else if (level === 7) {
          prompt += ', NSFW, erotic nude pose, legs spread open invitingly';
          prompt += ', naked on bed, hand between thighs, touching intimately';
          prompt += ', explicit sexual pose, adult only, uncensored arousal';
          console.log('📸 Mode NIVEAU 7: Nu érotique ouvert');
        } else if (level === 8) {
          prompt += ', NSFW, very explicit nude, legs wide open';
          prompt += ', fingers touching intimate areas, naked and spread';
          prompt += ', extreme explicit, masturbation beginning, adult hardcore';
          console.log('📸 Mode NIVEAU 8: Très explicite masturbation');
        } else if (level === 9) {
          prompt += ', NSFW, ultra explicit nude, maximum exposure, nothing hidden';
          prompt += ', fingers penetrating, orgasmic face, intense pleasure visible';
          prompt += ', extreme sexual content, explicit masturbation, climax';
          console.log('📸 Mode NIVEAU 9: Ultra explicite jouissance');
        } else if (level >= 10) {
          prompt += ', NSFW, maximum explicit nude, most erotic pose imaginable';
          prompt += ', extreme penetration visible, toy insertion, squirting';
          prompt += ', absolute maximum adult content, orgasm captured, nothing censored';
          prompt += ', most provocative explicit imagery possible';
          console.log('📸 Mode NIVEAU 10+: Maximum hardcore');
        }
      }
      
    } else {
      // === MODE SFW (niveau 1) v5.0.5 avec support GENRE ===
      console.log(`✨ Mode SFW actif - Niveau ${level} - ${isMale ? 'HOMME' : 'FEMME'}`);
      
      // Lieu neutre/élégant
      const sfwLocations = [
        'at elegant cafe terrace, daytime',
        'at park with trees, natural setting',
        'at modern apartment, stylish interior',
        'at beach boardwalk, sunny day',
        'at rooftop bar, city skyline behind',
        'at art gallery, sophisticated setting',
        'at cozy bookstore, warm lighting',
      ];
      prompt += `, ${sfwLocations[Math.floor(Math.random() * sfwLocations.length)]}`;
      
      // Tenue SFW selon le genre
      if (isMale) {
        const maleSfwOutfits = [
          'wearing elegant suit and tie, well-dressed gentleman',
          'wearing casual button-up shirt, stylish masculine',
          'wearing fitted t-shirt, casual cool, handsome',
          'wearing leather jacket, bad boy style, masculine',
          'wearing professional blazer, smart casual, attractive man',
          'wearing stylish sweater, cozy masculine look',
          'wearing dress shirt, open collar, confident gentleman',
        ];
        prompt += `, ${maleSfwOutfits[Math.floor(Math.random() * maleSfwOutfits.length)]}`;
      } else {
        const femaleSfwOutfits = [
          'wearing elegant casual outfit, fashionable',
          'wearing stylish summer dress, classy',
          'wearing smart casual clothes, well-dressed',
          'wearing trendy outfit, modern fashion',
          'wearing chic blouse with jeans, casual elegant',
          'wearing beautiful sundress, feminine',
          'wearing fitted blazer with pants, sophisticated',
        ];
        prompt += `, ${femaleSfwOutfits[Math.floor(Math.random() * femaleSfwOutfits.length)]}`;
      }
      
      // Poses SFW naturelles
      const sfwPoses = [
        'natural relaxed pose, friendly smile',
        'confident standing pose, warm expression',
        'sitting comfortably, inviting look',
        'leaning casually, playful smile',
        'walking pose, looking at camera',
        'candid pose, genuine smile',
        'elegant pose, sophisticated demeanor',
      ];
      prompt += `, ${sfwPoses[Math.floor(Math.random() * sfwPoses.length)]}`;
      
      // Qualités SFW
      prompt += ', beautiful, attractive, charming';
      prompt += ', professional photography, natural lighting';
      prompt += ', SFW, safe for work, tasteful, classy';
    }
    
    // ANATOMIE STRICTE (pour éviter les défauts)
    prompt += ', ' + this.anatomyStrictPrompt;
    
    // QUALITÉ
    if (isRealistic) {
      prompt += ', ' + this.buildRealisticQualityPrompts();
      prompt += ', ultra-detailed photo, 8K, professional quality';
      prompt += ', single person, solo portrait';
    } else {
      prompt += ', masterpiece, best quality, highly detailed anime';
      prompt += ', single character, solo';
    }

    // Ajouter un marqueur de niveau pour forcer le mode NSFW
    if (isNSFW) {
      prompt = `[NSFW_LEVEL_${level}] ` + prompt;
    }
    
    console.log(`🖼️ Génération ${isNSFW ? 'NSFW' : 'SFW'} niveau ${level} (${isRealistic ? 'RÉALISTE' : 'ANIME'})`);
    console.log(`📝 Prompt FINAL (100 chars): ${prompt.substring(0, 100)}...`);
    return await this.generateImage(prompt);
  }

  /**
   * Détecte une tenue mentionnée dans les messages
   */
  detectOutfit(messages) {
    const outfitKeywords = [
      'robe', 'dress', 'jupe', 'skirt', 'pantalon', 'pants', 'jean', 'jeans',
      'chemise', 'shirt', 'blouse', 't-shirt', 'pull', 'sweater', 'veste', 'jacket',
      'lingerie', 'underwear', 'soutien-gorge', 'bra', 'culotte', 'panties',
      'bikini', 'swimsuit', 'nuisette', 'nightgown', 'pyjama', 'débardeur',
      'costume', 'uniforme', 'uniform', 'tenue', 'outfit'
    ];

    const recentText = messages.slice(-3).map(m => m.content).join(' ').toLowerCase();

    for (const keyword of outfitKeywords) {
      const regex = new RegExp(`([\\w\\s]{0,20}${keyword}[\\w\\s]{0,20})`, 'i');
      const match = recentText.match(regex);
      if (match) {
        return match[1].trim();
      }
    }

    return null;
  }

  /**
   * Attend le délai minimum entre les requêtes
   */
  async waitForRateLimit() {
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequestTime;
    
    if (timeSinceLastRequest < this.minDelay) {
      const waitTime = this.minDelay - timeSinceLastRequest;
      console.log(`⏳ Attente de ${waitTime}ms...`);
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }
    
    this.lastRequestTime = Date.now();
  }

  /**
   * Génère une image avec retry et fallback intelligent
   */
  async generateImage(prompt, retryCount = 0) {
    await CustomImageAPIService.loadConfig();
    
    const strategy = CustomImageAPIService.getStrategy();
    console.log(`🎨 Stratégie: ${strategy} (tentative ${retryCount + 1}/${this.maxRetries + 2})`);
    
    let imageUrl;
    
    // Première tentative: stratégie configurée
    if (strategy === 'local') {
      imageUrl = await this.generateWithLocal(prompt);
    } else {
      imageUrl = await this.generateWithFreebox(prompt);
    }
    
    // Vérifier si l'image est valide
    const isValid = await this.validateImageUrl(imageUrl);
    
    if (isValid) {
      console.log('✅ Image générée avec succès');
      return imageUrl;
    }
    
    // Si échec et encore des retries disponibles
    if (retryCount < this.maxRetries - 1) {
      console.log(`⚠️ Image invalide, retry ${retryCount + 2}...`);
      // Délai progressif: 2s, 4s, 6s...
      await new Promise(r => setTimeout(r, 2000 + retryCount * 2000));
      return await this.generateImage(prompt, retryCount + 1);
    }
    
    // Dernière tentative: fallback API avec délai long
    console.log('🔄 Utilisation fallback API avec délai anti-rate-limit...');
    return await this.generateWithFallbackAPI(prompt, retryCount);
  }

  /**
   * Valide qu'une URL d'image est correcte
   */
  async validateImageUrl(imageUrl) {
    if (!imageUrl) return false;
    
    // Vérifier les patterns d'erreur connus (sauf pollinations.ai qui est valide)
    const errorPatterns = [
      'error',
      'failed',
      'invalid',
      'blocked',
      'nsfw_blocked',
      'rate_limit',
      'rate-limit',
      'too_many_requests',
      '429',
      '503',
      '502'
    ];
    
    const lowerUrl = imageUrl.toLowerCase();
    
    // Ne pas rejeter pollinations.ai car c'est une source valide
    const isPollinations = lowerUrl.includes('pollinations.ai');
    
    for (const pattern of errorPatterns) {
      if (lowerUrl.includes(pattern)) {
        console.log(`⚠️ URL contient pattern d'erreur: ${pattern}`);
        return false;
      }
    }
    
    // Vérifier que c'est une URL valide
    try {
      new URL(imageUrl);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Génère une image avec l'API Freebox/Pollinations
   * VERSION ULTRA-AMÉLIORÉE: Images parfaites sans défauts anatomiques
   */
  async generateWithFreebox(prompt) {
    console.log('🖼️ Génération image via Pollinations.ai...');
    
    await this.waitForRateLimit();
    
    const seed = Date.now() + Math.floor(Math.random() * 100000);
    
    // Utiliser Pollinations.ai
    const pollinationsUrl = 'https://image.pollinations.ai/prompt/';
    
    // Détecter le niveau NSFW via le marqueur [NSFW_LEVEL_X]
    const nsfwMatch = prompt.match(/\[NSFW_LEVEL_(\d+)\]/);
    const nsfwLevel = nsfwMatch ? parseInt(nsfwMatch[1]) : 0;
    const isNSFW = nsfwLevel >= 2;
    
    // Détecter si c'est anime ou réaliste
    const isAnime = prompt.toLowerCase().includes('anime') || 
                    prompt.toLowerCase().includes('manga') ||
                    !prompt.toLowerCase().includes('realistic');
    
    // Retirer le marqueur du prompt
    let cleanPrompt = prompt.replace(/\[NSFW_LEVEL_\d+\]\s*/, '');
    
    // NETTOYER le prompt des termes problématiques qui causent des défauts
    cleanPrompt = cleanPrompt
      .replace(/multiple|several|many|various/gi, 'single')
      .replace(/hands? holding/gi, 'elegant pose')
      .replace(/arms? (raised|extended|reaching)/gi, 'natural pose')
      .replace(/fingers? (spread|extended|pointing)/gi, 'relaxed hands');
    
    // === PROMPT QUALITÉ ULTRA-STRICT POUR ÉVITER LES DÉFAUTS ===
    // Utiliser des termes POSITIFS uniquement (pas de "NOT" qui ne fonctionne pas bien)
    const anatomyPerfect = 'anatomically perfect human body, ' +
                          'exactly two arms naturally positioned, exactly two legs, ' +
                          'exactly two hands with five fingers each, ' +
                          'one head, one face, two eyes, one nose, one mouth, ' +
                          'normal human proportions, realistic body structure, ' +
                          'clothes properly worn on body, fabric follows body shape naturally';
    
    const qualityCore = 'masterpiece, award winning, professional quality, ' +
                        'highly detailed, sharp focus, 8K resolution, ' +
                        'perfect lighting, studio quality, flawless';
    
    const qualityAnime = 'beautiful anime art style, clean precise lineart, ' +
                         'vibrant saturated colors, detailed expressive eyes, ' +
                         'professional anime illustration, pixiv quality';
    
    const qualityRealistic = 'photorealistic, hyperrealistic photograph, ' +
                             'professional DSLR camera, natural skin texture, ' +
                             'professional portrait photography, magazine cover quality';
    
    // Construction du prompt final - STRUCTURE CLAIRE
    let finalPrompt = '';
    
    // 1. Qualité de base
    finalPrompt = qualityCore + ', ';
    
    // 2. Style (anime ou réaliste)
    finalPrompt += (isAnime ? qualityAnime : qualityRealistic) + ', ';
    
    // 3. Anatomie parfaite TOUJOURS
    finalPrompt += anatomyPerfect + ', ';
    
    // 4. Sujet unique
    finalPrompt += 'single person, solo, one character only, ';
    
    if (isNSFW) {
      console.log(`🔞 MODE NSFW - Niveau ${nsfwLevel} (${isAnime ? 'Anime' : 'Réaliste'})`);
      
      // Ajouter le contenu NSFW selon le niveau
      if (nsfwLevel >= 5) {
        finalPrompt += 'nude woman, full body visible, artistic nude photography, ';
        finalPrompt += cleanPrompt + ', ';
        finalPrompt += 'naked body, sensual pose, intimate, erotic art';
      } else if (nsfwLevel >= 4) {
        finalPrompt += 'topless woman, artistic nude, ';
        finalPrompt += cleanPrompt + ', ';
        finalPrompt += 'bare chest, sensual, elegant nude';
      } else if (nsfwLevel >= 3) {
        finalPrompt += 'woman in lingerie, underwear model, ';
        finalPrompt += cleanPrompt + ', ';
        finalPrompt += 'sexy lingerie, bra and panties, seductive';
      } else {
        finalPrompt += 'sexy woman, revealing outfit, ';
        finalPrompt += cleanPrompt + ', ';
        finalPrompt += 'provocative pose, cleavage, attractive';
      }
      
    } else {
      console.log(`✨ Mode SFW (${isAnime ? 'Anime' : 'Réaliste'})`);
      finalPrompt += 'beautiful woman, elegant, ';
      finalPrompt += cleanPrompt + ', ';
      finalPrompt += 'tasteful, stylish, attractive';
    }
    
    // Limiter la longueur (trop long = confusion pour le modèle)
    const shortPrompt = finalPrompt.substring(0, 1500);
    const encodedPrompt = encodeURIComponent(shortPrompt);
    
    // Utiliser flux-pro pour meilleure qualité (moins de défauts)
    const modelType = 'flux';
    const imageUrl = `${pollinationsUrl}${encodedPrompt}?width=768&height=1024&seed=${seed}&nologo=true&model=${modelType}&enhance=true`;
    
    console.log(`🔗 URL Pollinations (seed: ${seed}, niveau: ${nsfwLevel})`);
    console.log(`📝 Prompt (${shortPrompt.length} chars): ${shortPrompt.substring(0, 200)}...`);
    
    return imageUrl;
  }
  
  /**
   * API de secours avec Freebox
   */
  async generateWithFreeboxBackup(prompt) {
    console.log('🏠 Génération avec API Freebox (backup)...');
    
    let freeboxUrl = CustomImageAPIService.getApiUrl();
    if (!freeboxUrl) {
      freeboxUrl = this.freeboxURL;
    }
    
    const seed = Date.now() + Math.floor(Math.random() * 10000);
    const shortPrompt = prompt.substring(0, 800);
    const encodedPrompt = encodeURIComponent(shortPrompt);
    
    const separator = freeboxUrl.includes('?') ? '&' : '?';
    let imageUrl = `${freeboxUrl}${separator}prompt=${encodedPrompt}&width=768&height=768&seed=${seed}`;
    
    console.log(`🔗 URL Freebox générée`);
    return imageUrl;
  }

  /**
   * APIs de fallback alternatives (gratuits)
   */
  async generateWithFallbackAPI(prompt, apiIndex = 0) {
    const seed = Date.now() + Math.floor(Math.random() * 99999);
    const shortPrompt = prompt.substring(0, 500);
    const encoded = encodeURIComponent(shortPrompt);
    
    // Rotation entre différentes APIs
    const apis = [
      // Prodia (gratuit, rapide)
      () => `https://api.prodia.com/generate?prompt=${encoded}&seed=${seed}`,
      // GetImg.ai placeholder
      () => `https://getimg.ai/api/v1/generate?prompt=${encoded}`,
      // Lexica (recherche d'images similaires)
      () => `https://lexica.art/api/v1/search?q=${encoded}`,
    ];
    
    // Pour l'instant, générer une URL Pollinations avec délai anti-rate-limit
    await new Promise(r => setTimeout(r, 3000)); // Attendre 3s
    
    const antiCache = Date.now();
    const url = `https://image.pollinations.ai/prompt/${encoded}?width=768&height=768&seed=${seed}&nologo=true&nofeed=true&model=flux&t=${antiCache}`;
    
    console.log(`🌐 Fallback API (attente anti-rate-limit)`);
    return url;
  }

  /**
   * Génère une image avec Stable Diffusion Local
   */
  async generateWithLocal(prompt) {
    console.log('📱 Tentative génération locale SD...');
    
    try {
      const availability = await StableDiffusionLocalService.checkAvailability();
      
      if (!availability.available || !availability.modelDownloaded || !availability.canRunSD) {
        console.log('⚠️ SD Local non disponible - Utilisation de Freebox');
        return await this.generateWithFreebox(prompt);
      }

      const fullPrompt = `${prompt}, ${this.anatomyStrictPrompt}, masterpiece, best quality, ultra detailed`;

      console.log('🎨 Génération avec SD-Turbo local...');
      
      const result = await StableDiffusionLocalService.generateImage(fullPrompt, {
        negativePrompt: this.negativePromptFull,
        steps: 4, // Plus d'étapes pour meilleure qualité
        guidanceScale: 7.5, // Plus de guidance pour respecter le prompt
      });

      if (result && result.imagePath) {
        console.log('✅ Image générée localement');
        return result.imagePath;
      }
      
      console.log('⚠️ Pas de résultat SD Local, fallback Freebox');
      return await this.generateWithFreebox(prompt);
      
    } catch (error) {
      console.error('❌ Erreur génération locale:', error.message);
      return await this.generateWithFreebox(prompt);
    }
  }
}

export default new ImageGenerationService();
