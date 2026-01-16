import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Switch,
  Alert,
} from 'react-native';
import UserProfileService from '../services/UserProfileService';
import LevelService from '../services/LevelService';

export default function UserProfileScreen({ navigation }) {
  const [username, setUsername] = useState('');
  const [age, setAge] = useState('');
  const [gender, setGender] = useState('male');
  const [bust, setBust] = useState('C');
  const [penis, setPenis] = useState('17');
  const [nsfwMode, setNsfwMode] = useState(false);
  const [hasProfile, setHasProfile] = useState(false);
  
  // Système de niveaux
  const [levelStats, setLevelStats] = useState(null);

  const bustSizes = ['A', 'B', 'C', 'D', 'DD', 'E', 'F', 'G'];

  useEffect(() => {
    loadProfile();
    loadLevelStats();
  }, []);

  const loadProfile = async () => {
    const profile = await UserProfileService.getProfile();
    if (profile) {
      setHasProfile(true);
      setUsername(profile.username);
      setAge(profile.age.toString());
      setGender(profile.gender);
      if (profile.bust) setBust(profile.bust);
      if (profile.penis) setPenis(profile.penis.replace('cm', ''));
      setNsfwMode(profile.nsfwMode || false);
    }
  };
  
  const loadLevelStats = async () => {
    try {
      const stats = await LevelService.getFullStats();
      setLevelStats(stats);
    } catch (error) {
      console.error('Erreur chargement niveaux:', error);
    }
  };

  const handleSave = async () => {
    if (!username || !age) {
      Alert.alert('Erreur', 'Veuillez remplir tous les champs obligatoires');
      return;
    }

    const ageNum = parseInt(age);
    if (isNaN(ageNum) || ageNum < 13) {
      Alert.alert('Erreur', 'Âge invalide (minimum 13 ans)');
      return;
    }

    try {
      const profile = {
        username,
        age: ageNum,
        gender,
        ...(gender === 'female' && { bust }),
        ...(gender === 'male' && { penis: `${penis}cm` }),
        nsfwMode: ageNum >= 18 ? nsfwMode : false,
      };

      if (hasProfile) {
        await UserProfileService.updateProfile(profile);
        Alert.alert('Succès', 'Profil mis à jour !');
      } else {
        await UserProfileService.createProfile(profile);
        setHasProfile(true);
        Alert.alert('Succès', 'Profil créé !', [
          { text: 'OK', onPress: () => navigation.goBack() }
        ]);
      }
    } catch (error) {
      Alert.alert('Erreur', 'Impossible de sauvegarder le profil');
    }
  };

  const handleDelete = () => {
    Alert.alert(
      'Supprimer le profil',
      'Êtes-vous sûr de vouloir supprimer votre profil ?',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: async () => {
            await UserProfileService.deleteProfile();
            navigation.goBack();
          },
        },
      ]
    );
  };

  const isAdult = parseInt(age) >= 18;

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>
        {hasProfile ? 'Mon Profil' : 'Créer mon profil'}
      </Text>

      {/* Section Niveau et XP */}
      {levelStats && (
        <View style={styles.levelSection}>
          <View style={styles.levelHeader}>
            <View style={styles.levelBadge}>
              <Text style={styles.levelBadgeText}>⭐ {levelStats.level}</Text>
            </View>
            <View style={styles.levelTitleContainer}>
              <Text style={styles.levelTitleText}>{levelStats.title}</Text>
              <Text style={styles.levelXPText}>{levelStats.totalXP} XP total</Text>
            </View>
          </View>
          
          {/* Barre de progression */}
          <View style={styles.progressContainer}>
            <View style={styles.progressBarBg}>
              <View style={[styles.progressBarFill, { width: `${levelStats.progress}%` }]} />
            </View>
            <Text style={styles.progressText}>
              {levelStats.progress}% vers niveau {levelStats.level + 1}
            </Text>
          </View>
          
          {/* Statistiques */}
          <View style={styles.statsGrid}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{levelStats.messagesCount || 0}</Text>
              <Text style={styles.statLabel}>Messages</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{levelStats.streakDays || 0}</Text>
              <Text style={styles.statLabel}>🔥 Streak</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{levelStats.charactersInteracted?.length || 0}</Text>
              <Text style={styles.statLabel}>Personnages</Text>
            </View>
          </View>
          
          {/* Prochaine récompense */}
          {levelStats.nextReward && levelStats.nextRewardLevel && (
            <View style={styles.nextRewardContainer}>
              <Text style={styles.nextRewardTitle}>🎁 Prochaine récompense (Niv. {levelStats.nextRewardLevel})</Text>
              <Text style={styles.nextRewardText}>{levelStats.nextReward.description}</Text>
            </View>
          )}
          
          {/* Récompenses débloquées */}
          {levelStats.unlockedRewards && levelStats.unlockedRewards.length > 0 && (
            <View style={styles.unlockedContainer}>
              <Text style={styles.unlockedTitle}>✅ Récompenses débloquées</Text>
              {levelStats.unlockedRewards.map((reward, index) => (
                <Text key={index} style={styles.unlockedItem}>• {reward.description}</Text>
              ))}
            </View>
          )}
        </View>
      )}

      <Text style={styles.description}>
        Votre profil permet aux personnages de mieux vous connaître et d'adapter leurs réponses.
      </Text>

      <Text style={styles.label}>Pseudo *</Text>
      <TextInput
        style={styles.input}
        value={username}
        onChangeText={setUsername}
        placeholder="Comment voulez-vous être appelé ?"
      />

      <Text style={styles.label}>Âge * (minimum 13 ans)</Text>
      <TextInput
        style={styles.input}
        value={age}
        onChangeText={setAge}
        placeholder="Ex: 25"
        keyboardType="numeric"
      />

      <Text style={styles.label}>Genre</Text>
      <View style={styles.genderContainer}>
        <TouchableOpacity
          style={[styles.genderButton, gender === 'male' && styles.genderButtonActive]}
          onPress={() => setGender('male')}
        >
          <Text style={[styles.genderText, gender === 'male' && styles.genderTextActive]}>
            Homme
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.genderButton, gender === 'female' && styles.genderButtonActive]}
          onPress={() => setGender('female')}
        >
          <Text style={[styles.genderText, gender === 'female' && styles.genderTextActive]}>
            Femme
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.genderButton, gender === 'other' && styles.genderButtonActive]}
          onPress={() => setGender('other')}
        >
          <Text style={[styles.genderText, gender === 'other' && styles.genderTextActive]}>
            Autre
          </Text>
        </TouchableOpacity>
      </View>

      {gender === 'female' && (
        <>
          <Text style={styles.label}>Taille de poitrine</Text>
          <View style={styles.sizeContainer}>
            {bustSizes.map(size => (
              <TouchableOpacity
                key={size}
                style={[styles.sizeButton, bust === size && styles.sizeButtonActive]}
                onPress={() => setBust(size)}
              >
                <Text style={[styles.sizeText, bust === size && styles.sizeTextActive]}>
                  {size}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </>
      )}

      {gender === 'male' && (
        <>
          <Text style={styles.label}>Taille (cm)</Text>
          <TextInput
            style={styles.input}
            value={penis}
            onChangeText={setPenis}
            placeholder="Ex: 17"
            keyboardType="numeric"
          />
        </>
      )}

      {isAdult && (
        <View style={styles.nsfwContainer}>
          <View style={styles.nsfwHeader}>
            <Text style={styles.nsfwTitle}>🔞 Mode NSFW (18+)</Text>
            <Switch
              value={nsfwMode}
              onValueChange={setNsfwMode}
              trackColor={{ false: '#d1d5db', true: '#6366f1' }}
              thumbColor={nsfwMode ? '#fff' : '#f4f3f4'}
            />
          </View>
          <Text style={styles.nsfwDescription}>
            Active le contenu explicite et sensuel dans les conversations. 
            Vous devez avoir 18 ans ou plus.
          </Text>
        </View>
      )}

      {!isAdult && age && (
        <View style={styles.warningContainer}>
          <Text style={styles.warningText}>
            ℹ️ Le mode NSFW n'est disponible qu'à partir de 18 ans.
            Les conversations resteront appropriées.
          </Text>
        </View>
      )}

      <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
        <Text style={styles.saveButtonText}>
          {hasProfile ? 'Mettre à jour' : 'Créer mon profil'}
        </Text>
      </TouchableOpacity>

      {hasProfile && (
        <TouchableOpacity style={styles.deleteButton} onPress={handleDelete}>
          <Text style={styles.deleteButtonText}>Supprimer mon profil</Text>
        </TouchableOpacity>
      )}

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#6366f1',
  },
  // Section Niveau
  levelSection: {
    backgroundColor: '#1e1b4b',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
  },
  levelHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  levelBadge: {
    backgroundColor: '#fbbf24',
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  levelBadgeText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1e1b4b',
  },
  levelTitleContainer: {
    flex: 1,
  },
  levelTitleText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#a78bfa',
  },
  levelXPText: {
    fontSize: 14,
    color: '#9ca3af',
    marginTop: 2,
  },
  progressContainer: {
    marginBottom: 15,
  },
  progressBarBg: {
    height: 16,
    backgroundColor: '#374151',
    borderRadius: 8,
    overflow: 'hidden',
    marginBottom: 5,
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#8b5cf6',
    borderRadius: 8,
  },
  progressText: {
    fontSize: 12,
    color: '#9ca3af',
    textAlign: 'center',
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 15,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#374151',
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
  },
  statLabel: {
    fontSize: 12,
    color: '#9ca3af',
    marginTop: 2,
  },
  nextRewardContainer: {
    backgroundColor: '#4c1d95',
    borderRadius: 10,
    padding: 12,
    marginTop: 10,
  },
  nextRewardTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fbbf24',
    marginBottom: 4,
  },
  nextRewardText: {
    fontSize: 13,
    color: '#e9d5ff',
  },
  unlockedContainer: {
    backgroundColor: '#065f46',
    borderRadius: 10,
    padding: 12,
    marginTop: 10,
  },
  unlockedTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#34d399',
    marginBottom: 8,
  },
  unlockedItem: {
    fontSize: 12,
    color: '#a7f3d0',
    marginBottom: 3,
  },
  description: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 20,
    lineHeight: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    marginTop: 15,
    marginBottom: 8,
    color: '#374151',
  },
  input: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
  },
  genderContainer: {
    flexDirection: 'row',
    gap: 10,
  },
  genderButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#d1d5db',
    alignItems: 'center',
  },
  genderButtonActive: {
    backgroundColor: '#6366f1',
    borderColor: '#6366f1',
  },
  genderText: {
    fontSize: 16,
    color: '#6b7280',
  },
  genderTextActive: {
    color: '#fff',
    fontWeight: '600',
  },
  sizeContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  sizeButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#d1d5db',
  },
  sizeButtonActive: {
    backgroundColor: '#6366f1',
    borderColor: '#6366f1',
  },
  sizeText: {
    fontSize: 14,
    color: '#6b7280',
  },
  sizeTextActive: {
    color: '#fff',
    fontWeight: '600',
  },
  nsfwContainer: {
    marginTop: 20,
    padding: 15,
    backgroundColor: '#fef2f2',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#fca5a5',
  },
  nsfwHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  nsfwTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#991b1b',
  },
  nsfwDescription: {
    fontSize: 13,
    color: '#7f1d1d',
    lineHeight: 18,
  },
  warningContainer: {
    marginTop: 20,
    padding: 15,
    backgroundColor: '#eff6ff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#93c5fd',
  },
  warningText: {
    fontSize: 13,
    color: '#1e40af',
    lineHeight: 18,
  },
  saveButton: {
    backgroundColor: '#6366f1',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 30,
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  deleteButton: {
    backgroundColor: '#ef4444',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 10,
  },
  deleteButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
