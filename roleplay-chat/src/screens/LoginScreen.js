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
  Image,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import AuthService from '../services/AuthService';

export default function LoginScreen({ navigation, onLoginSuccess, forceLogin = false }) {
  const [mode, setMode] = useState('login'); // 'login' ou 'register'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [serverOnline, setServerOnline] = useState(null);

  const [checkingServer, setCheckingServer] = useState(true);

  useEffect(() => {
    checkServer();
  }, []);

  const checkServer = async () => {
    setCheckingServer(true);
    console.log('🔄 [LoginScreen] Vérification du serveur...');
    try {
      const online = await AuthService.checkServerHealth();
      console.log('📊 [LoginScreen] Résultat:', online ? 'EN LIGNE' : 'HORS LIGNE');
      setServerOnline(online);
    } catch (err) {
      console.log('❌ [LoginScreen] Erreur:', err?.message);
      setServerOnline(false);
    } finally {
      setCheckingServer(false);
    }
  };

  const handleEmailAuth = async () => {
    if (!email || !password) {
      Alert.alert('Erreur', 'Veuillez remplir tous les champs');
      return;
    }

    if (mode === 'register') {
      if (password !== confirmPassword) {
        Alert.alert('Erreur', 'Les mots de passe ne correspondent pas');
        return;
      }
      if (password.length < 6) {
        Alert.alert('Erreur', 'Le mot de passe doit contenir au moins 6 caractères');
        return;
      }
    }

    setLoading(true);
    try {
      let result;
      if (mode === 'register') {
        result = await AuthService.register(email.trim(), password);
      } else {
        result = await AuthService.login(email.trim(), password);
      }

      if (result.success) {
        if (onLoginSuccess) {
          onLoginSuccess(result.user);
        }
      } else {
        Alert.alert('Erreur', result.error || 'Une erreur est survenue');
      }
    } catch (error) {
      Alert.alert('Erreur', error.message || 'Une erreur est survenue');
    } finally {
      setLoading(false);
    }
  };

  const handleDiscordLogin = async () => {
    // Vérifier d'abord si le serveur est disponible
    if (!serverOnline) {
      Alert.alert(
        '🔴 Serveur hors ligne',
        'Le serveur est actuellement hors ligne. Veuillez réessayer plus tard ou utiliser la connexion par email.',
        [{ text: 'OK' }]
      );
      return;
    }
    
    setLoading(true);
    try {
      const result = await AuthService.loginWithDiscord();
      
      if (result.success && result.pending) {
        // Redirection en cours vers Discord
        Alert.alert(
          '🎮 Redirection Discord',
          'Vous allez être redirigé vers Discord pour vous connecter.',
          [{ text: 'OK' }]
        );
      } else if (result.success && result.user) {
        // Connexion réussie
        if (onLoginSuccess) {
          onLoginSuccess(result.user);
        }
      } else {
        Alert.alert(
          '🎮 Discord',
          'La connexion Discord nécessite une configuration serveur.\n\n💡 Utilisez la connexion par email/mot de passe qui fonctionne parfaitement !',
          [{ text: 'Compris' }]
        );
      }
    } catch (error) {
      Alert.alert(
        '🎮 Discord',
        'La connexion Discord n\'est pas disponible actuellement.\n\n💡 Utilisez plutôt la connexion par email.',
        [{ text: 'Compris' }]
      );
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    // Vérifier d'abord si le serveur est disponible
    if (!serverOnline) {
      Alert.alert(
        '🔴 Serveur hors ligne',
        'Le serveur est actuellement hors ligne. Veuillez réessayer plus tard ou utiliser la connexion par email.',
        [{ text: 'OK' }]
      );
      return;
    }
    
    setLoading(true);
    try {
      const result = await AuthService.loginWithGoogle();
      
      if (result.success && result.pending) {
        // Redirection en cours vers Google
        Alert.alert(
          '🔵 Redirection Google',
          'Vous allez être redirigé vers Google pour vous connecter.',
          [{ text: 'OK' }]
        );
      } else if (result.success && result.user) {
        // Connexion réussie
        if (onLoginSuccess) {
          onLoginSuccess(result.user);
        }
      } else {
        Alert.alert(
          '🔵 Google',
          'La connexion Google nécessite une configuration serveur.\n\n💡 Utilisez la connexion par email/mot de passe qui fonctionne parfaitement !',
          [{ text: 'Compris' }]
        );
      }
    } catch (error) {
      Alert.alert(
        '🔵 Google',
        'La connexion Google n\'est pas disponible actuellement.\n\n💡 Utilisez plutôt la connexion par email.',
        [{ text: 'Compris' }]
      );
    } finally {
      setLoading(false);
    }
  };

  const handleSkip = () => {
    if (onLoginSuccess) {
      onLoginSuccess(null); // Connexion anonyme
    }
  };

  return (
    <KeyboardAvoidingView 
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Logo */}
        <View style={styles.header}>
          <Text style={styles.logo}>💬</Text>
          <Text style={styles.title}>Roleplay Chat</Text>
          <Text style={styles.subtitle}>
            {mode === 'login' ? 'Connexion' : 'Inscription'}
          </Text>
        </View>

        {/* Statut serveur */}
        <TouchableOpacity 
          onPress={checkServer} 
          disabled={checkingServer}
          style={[
            styles.serverStatus, 
            { backgroundColor: checkingServer ? '#f3f4f6' : (serverOnline ? '#dcfce7' : '#fef2f2') }
          ]}
        >
          {checkingServer ? (
            <View style={styles.serverStatusRow}>
              <ActivityIndicator size="small" color="#6b7280" />
              <Text style={[styles.serverStatusText, { color: '#6b7280', marginLeft: 8 }]}>
                Vérification du serveur...
              </Text>
            </View>
          ) : serverOnline ? (
            <Text style={[styles.serverStatusText, { color: '#166534' }]}>
              🟢 Serveur en ligne (appuyer pour vérifier)
            </Text>
          ) : (
            <View>
              <Text style={[styles.serverStatusText, { color: '#991b1b' }]}>
                🔴 Serveur hors ligne - Appuyer pour réessayer
              </Text>
              <Text style={[styles.serverStatusSubText, { color: '#dc2626', marginTop: 4 }]}>
                Vérifiez votre connexion Wi-Fi/4G
              </Text>
            </View>
          )}
        </TouchableOpacity>

        {/* Formulaire Email */}
        <View style={styles.form}>
          <Text style={styles.label}>Email</Text>
          <TextInput
            style={styles.input}
            value={email}
            onChangeText={setEmail}
            placeholder="votre@email.com"
            keyboardType="email-address"
            autoCapitalize="none"
            autoComplete="email"
          />

          <Text style={styles.label}>Mot de passe</Text>
          <TextInput
            style={styles.input}
            value={password}
            onChangeText={setPassword}
            placeholder="••••••••"
            secureTextEntry
          />

          {mode === 'register' && (
            <>
              <Text style={styles.label}>Confirmer le mot de passe</Text>
              <TextInput
                style={styles.input}
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                placeholder="••••••••"
                secureTextEntry
              />
            </>
          )}

          <TouchableOpacity
            style={[styles.primaryButton, loading && styles.buttonDisabled]}
            onPress={handleEmailAuth}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.primaryButtonText}>
                {mode === 'login' ? '🔐 Se connecter' : '✨ S\'inscrire'}
              </Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity onPress={() => setMode(mode === 'login' ? 'register' : 'login')}>
            <Text style={styles.switchText}>
              {mode === 'login' 
                ? 'Pas encore de compte ? S\'inscrire' 
                : 'Déjà un compte ? Se connecter'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Séparateur */}
        <View style={styles.separator}>
          <View style={styles.separatorLine} />
          <Text style={styles.separatorText}>ou</Text>
          <View style={styles.separatorLine} />
        </View>

        {/* OAuth - Désactivé pour le moment */}
        <View style={styles.oauthSection}>
          <Text style={styles.oauthNote}>
            ℹ️ Connexion rapide (bientôt disponible)
          </Text>
          <View style={styles.oauthButtons}>
            <TouchableOpacity
              style={[styles.oauthButton, styles.discordButton, styles.oauthButtonDisabled]}
              onPress={handleDiscordLogin}
              disabled={loading}
            >
              <Text style={styles.oauthButtonText}>🎮 Discord</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.oauthButton, styles.googleButton, styles.oauthButtonDisabled]}
              onPress={handleGoogleLogin}
              disabled={loading}
            >
              <Text style={styles.oauthButtonText}>🔵 Google</Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.oauthSubNote}>
            💡 Utilisez email/mot de passe ci-dessus
          </Text>
        </View>

        {/* Passer - seulement si pas forceLogin */}
        {!forceLogin && (
          <TouchableOpacity style={styles.skipButton} onPress={handleSkip}>
            <Text style={styles.skipButtonText}>Continuer sans compte →</Text>
          </TouchableOpacity>
        )}

        <Text style={styles.privacyText}>
          En vous connectant, vous acceptez nos conditions d'utilisation.
          Vos données sont stockées sur votre Freebox personnelle.
        </Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  scrollContent: {
    flexGrow: 1,
    padding: 20,
    justifyContent: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: 30,
  },
  logo: {
    fontSize: 60,
    marginBottom: 10,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#6366f1',
    marginBottom: 5,
  },
  subtitle: {
    fontSize: 18,
    color: '#6b7280',
  },
  serverStatus: {
    padding: 12,
    borderRadius: 10,
    marginBottom: 20,
    alignItems: 'center',
    minHeight: 50,
    justifyContent: 'center',
  },
  serverStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  serverStatusText: {
    fontSize: 14,
    fontWeight: '500',
    textAlign: 'center',
  },
  serverStatusSubText: {
    fontSize: 12,
    textAlign: 'center',
  },
  form: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
    marginTop: 10,
  },
  input: {
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 10,
    padding: 14,
    fontSize: 16,
    backgroundColor: '#f9fafb',
  },
  primaryButton: {
    backgroundColor: '#6366f1',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 20,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  switchText: {
    color: '#6366f1',
    textAlign: 'center',
    marginTop: 15,
    fontSize: 14,
  },
  separator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 25,
  },
  separatorLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#e5e7eb',
  },
  separatorText: {
    marginHorizontal: 15,
    color: '#9ca3af',
    fontSize: 14,
  },
  oauthSection: {
    alignItems: 'center',
  },
  oauthNote: {
    color: '#6b7280',
    fontSize: 12,
    marginBottom: 10,
  },
  oauthSubNote: {
    color: '#9ca3af',
    fontSize: 11,
    marginTop: 8,
    fontStyle: 'italic',
  },
  oauthButtons: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  oauthButton: {
    flex: 1,
    padding: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  oauthButtonDisabled: {
    opacity: 0.6,
  },
  discordButton: {
    backgroundColor: '#5865F2',
  },
  googleButton: {
    backgroundColor: '#4285F4',
  },
  oauthButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  skipButton: {
    marginTop: 25,
    alignItems: 'center',
  },
  skipButtonText: {
    color: '#9ca3af',
    fontSize: 14,
  },
  privacyText: {
    marginTop: 30,
    textAlign: 'center',
    fontSize: 12,
    color: '#9ca3af',
    lineHeight: 18,
  },
});
