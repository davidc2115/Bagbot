import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import AuthService from '../services/AuthService';

/**
 * Écran de configuration du profil après la première connexion
 */
export default function ProfileSetupScreen({ onComplete }) {
  const [username, setUsername] = useState('');
  const [age, setAge] = useState('');
  const [gender, setGender] = useState('');
  const [bust, setBust] = useState('');
  const [penis, setPenis] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const genderOptions = [
    { value: 'homme', label: '👨 Homme' },
    { value: 'femme', label: '👩 Femme' },
    { value: 'autre', label: '⚧️ Autre' },
  ];

  const bustOptions = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];

  const handleSubmit = async () => {
    // Validation
    if (!username.trim()) {
      Alert.alert('Erreur', 'Veuillez entrer un pseudo');
      return;
    }

    const ageNum = parseInt(age);
    if (!age || ageNum < 18) {
      Alert.alert('Accès restreint', 'Vous devez avoir au moins 18 ans pour utiliser cette application');
      return;
    }

    if (!gender) {
      Alert.alert('Erreur', 'Veuillez sélectionner votre genre');
      return;
    }

    setIsLoading(true);

    try {
      const profile = {
        username: username.trim(),
        age: ageNum,
        gender,
        bust: gender === 'femme' ? bust : null,
        penis: gender === 'homme' ? penis : null,
        nsfwMode: ageNum >= 18,
        isAdult: ageNum >= 18,
      };

      const result = await AuthService.updateProfile(profile);

      if (result.success) {
        Alert.alert('✅ Profil créé', 'Bienvenue ' + username + ' !', [
          { text: 'Continuer', onPress: () => onComplete(result.user) }
        ]);
      } else {
        Alert.alert('Erreur', result.error || 'Impossible de sauvegarder le profil');
      }
    } catch (error) {
      Alert.alert('Erreur', error.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Text style={styles.emoji}>🔞</Text>
        <Text style={styles.title}>Application 18+</Text>
        <Text style={styles.subtitle}>
          Cette application contient du contenu réservé aux adultes.
          Vous devez avoir au moins 18 ans pour continuer.
        </Text>
      </View>
      
      {/* Avertissement 18+ */}
      <View style={[styles.inputGroup, { backgroundColor: '#fef2f2', padding: 15, borderRadius: 10, borderWidth: 1, borderColor: '#fca5a5' }]}>
        <Text style={{ color: '#dc2626', fontWeight: 'bold', textAlign: 'center', fontSize: 14 }}>
          ⚠️ CONTENU ADULTE (18+)
        </Text>
        <Text style={{ color: '#991b1b', textAlign: 'center', fontSize: 12, marginTop: 5 }}>
          En continuant, vous confirmez avoir plus de 18 ans et acceptez de voir du contenu pour adultes.
        </Text>
      </View>

      {/* Pseudo */}
      <View style={styles.inputGroup}>
        <Text style={styles.label}>Pseudo *</Text>
        <TextInput
          style={styles.input}
          value={username}
          onChangeText={setUsername}
          placeholder="Votre pseudo"
          placeholderTextColor="#9ca3af"
          maxLength={30}
        />
      </View>

      {/* Âge */}
      <View style={styles.inputGroup}>
        <Text style={styles.label}>Âge * (18+ requis)</Text>
        <TextInput
          style={styles.input}
          value={age}
          onChangeText={setAge}
          placeholder="Votre âge"
          placeholderTextColor="#9ca3af"
          keyboardType="number-pad"
          maxLength={2}
        />
      </View>

      {/* Genre */}
      <View style={styles.inputGroup}>
        <Text style={styles.label}>Genre *</Text>
        <View style={styles.optionsRow}>
          {genderOptions.map((option) => (
            <TouchableOpacity
              key={option.value}
              style={[
                styles.optionButton,
                gender === option.value && styles.optionButtonActive,
              ]}
              onPress={() => setGender(option.value)}
            >
              <Text
                style={[
                  styles.optionText,
                  gender === option.value && styles.optionTextActive,
                ]}
              >
                {option.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Options selon le genre */}
      {gender === 'femme' && (
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Taille poitrine (optionnel)</Text>
          <View style={styles.optionsRow}>
            {bustOptions.map((size) => (
              <TouchableOpacity
                key={size}
                style={[
                  styles.smallButton,
                  bust === size && styles.smallButtonActive,
                ]}
                onPress={() => setBust(size)}
              >
                <Text
                  style={[
                    styles.smallButtonText,
                    bust === size && styles.smallButtonTextActive,
                  ]}
                >
                  {size}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}

      {gender === 'homme' && (
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Taille du sexe en cm (optionnel)</Text>
          <TextInput
            style={styles.input}
            value={penis}
            onChangeText={setPenis}
            placeholder="Ex: 18"
            placeholderTextColor="#9ca3af"
            keyboardType="number-pad"
            maxLength={2}
          />
          <Text style={styles.hint}>Entrez la taille en centimètres (10-30 cm)</Text>
        </View>
      )}

      {/* Bouton de validation */}
      <TouchableOpacity
        style={[styles.submitButton, isLoading && styles.submitButtonDisabled]}
        onPress={handleSubmit}
        disabled={isLoading}
      >
        {isLoading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.submitButtonText}>🚀 Commencer</Text>
        )}
      </TouchableOpacity>

      {/* Note */}
      <Text style={styles.note}>
        * Champs obligatoires. Cette application est réservée aux adultes (18+).
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  content: {
    padding: 20,
    paddingBottom: 40,
  },
  header: {
    alignItems: 'center',
    marginBottom: 30,
  },
  emoji: {
    fontSize: 60,
    marginBottom: 10,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#6b7280',
    textAlign: 'center',
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 12,
    padding: 15,
    fontSize: 16,
    color: '#1f2937',
  },
  optionsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  optionButton: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 10,
  },
  optionButtonActive: {
    backgroundColor: '#6366f1',
    borderColor: '#6366f1',
  },
  optionText: {
    fontSize: 15,
    color: '#374151',
  },
  optionTextActive: {
    color: '#fff',
    fontWeight: '600',
  },
  smallButton: {
    width: 45,
    height: 45,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
  },
  smallButtonActive: {
    backgroundColor: '#6366f1',
    borderColor: '#6366f1',
  },
  smallButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
  },
  smallButtonTextActive: {
    color: '#fff',
  },
  submitButton: {
    backgroundColor: '#6366f1',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 20,
  },
  submitButtonDisabled: {
    backgroundColor: '#a5a6f6',
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  note: {
    textAlign: 'center',
    color: '#9ca3af',
    fontSize: 12,
    marginTop: 20,
  },
  hint: {
    fontSize: 12,
    color: '#9ca3af',
    marginTop: 5,
    fontStyle: 'italic',
  },
});
