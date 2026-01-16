import React, { useState, useEffect } from 'react';
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
import AsyncStorage from '@react-native-async-storage/async-storage';
import AuthService from '../services/AuthService';

const FREEBOX_URL = 'http://88.174.155.230:33437';

export default function PayPalConfigScreen({ navigation }) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [config, setConfig] = useState({
    paypal_email: '',
    premium_price: '4.99',
    currency: 'EUR',
  });
  const [pendingPayments, setPendingPayments] = useState([]);

  // Récupérer les headers d'authentification
  const getAuthHeaders = async () => {
    const token = await AsyncStorage.getItem('auth_token');
    const user = AuthService.getCurrentUser();
    return {
      'Content-Type': 'application/json',
      'Authorization': token ? `Bearer ${token}` : '',
      'X-Admin-Email': user?.email || ''
    };
  };

  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    try {
      const headers = await getAuthHeaders();
      
      // Charger la config PayPal
      const response = await fetch(`${FREEBOX_URL}/admin/paypal/config`, {
        headers
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success && data.config) {
          setConfig({
            paypal_email: data.config.paypal_email || '',
            premium_price: String(data.config.premium_price || '4.99'),
            currency: data.config.currency || 'EUR',
          });
        }
      } else {
        const errorData = await response.json().catch(() => ({}));
        console.log('Erreur config PayPal:', errorData);
      }

      // Charger les paiements en attente
      const paymentsResponse = await fetch(`${FREEBOX_URL}/admin/payments/pending`, {
        headers
      });

      if (paymentsResponse.ok) {
        const paymentsData = await paymentsResponse.json();
        if (paymentsData.success) {
          setPendingPayments(paymentsData.payments || []);
        }
      }
    } catch (error) {
      console.error('Erreur chargement config PayPal:', error);
      Alert.alert('Erreur', 'Impossible de charger la configuration PayPal');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!config.paypal_email) {
      Alert.alert('Erreur', 'Veuillez entrer votre adresse PayPal');
      return;
    }

    setSaving(true);
    try {
      const headers = await getAuthHeaders();
      
      const response = await fetch(`${FREEBOX_URL}/admin/paypal/config`, {
        method: 'PUT',
        headers,
        body: JSON.stringify({
          paypal_email: config.paypal_email,
          premium_price: parseFloat(config.premium_price) || 4.99,
          currency: config.currency,
        })
      });

      const data = await response.json().catch(() => ({}));
      
      if (response.ok && data.success) {
        Alert.alert('✅ Succès', 'Configuration PayPal sauvegardée avec succès !');
      } else {
        Alert.alert('Erreur', data.error || 'Impossible de sauvegarder la configuration');
      }
    } catch (error) {
      console.error('Erreur sauvegarde PayPal:', error);
      Alert.alert('Erreur', 'Erreur de connexion au serveur');
    } finally {
      setSaving(false);
    }
  };

  const confirmPayment = async (transactionId) => {
    Alert.alert(
      '💳 Confirmer le paiement',
      'Avez-vous bien reçu le paiement PayPal pour cette transaction ?',
      [
        { text: 'Non', style: 'cancel' },
        {
          text: 'Oui, activer Premium',
          onPress: async () => {
            try {
              const headers = await getAuthHeaders();
              
              const response = await fetch(
                `${FREEBOX_URL}/admin/payments/${transactionId}/confirm`,
                {
                  method: 'POST',
                  headers
                }
              );

              const data = await response.json().catch(() => ({}));
              
              if (response.ok && data.success) {
                Alert.alert('✅ Succès', 'Premium activé pour l\'utilisateur');
                loadConfig(); // Recharger la liste
              } else {
                Alert.alert('Erreur', data.error || 'Impossible de confirmer le paiement');
              }
            } catch (error) {
              console.error('Erreur confirmation:', error);
              Alert.alert('Erreur', 'Erreur de connexion');
            }
          }
        }
      ]
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#6366f1" />
        <Text style={styles.loadingText}>Chargement...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>💳 Configuration PayPal</Text>
        <Text style={styles.subtitle}>Gérer les paiements Premium</Text>
      </View>

      {/* Configuration */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>⚙️ Paramètres</Text>

        <Text style={styles.label}>Adresse PayPal (email ou username PayPal.me)</Text>
        <TextInput
          style={styles.input}
          value={config.paypal_email}
          onChangeText={(text) => setConfig({ ...config, paypal_email: text })}
          placeholder="votre@email.com ou username"
          autoCapitalize="none"
        />

        <Text style={styles.label}>Prix Premium (€)</Text>
        <TextInput
          style={styles.input}
          value={config.premium_price}
          onChangeText={(text) => setConfig({ ...config, premium_price: text })}
          placeholder="4.99"
          keyboardType="decimal-pad"
        />

        <TouchableOpacity
          style={[styles.saveButton, saving && styles.buttonDisabled]}
          onPress={handleSave}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.saveButtonText}>💾 Sauvegarder</Text>
          )}
        </TouchableOpacity>
      </View>

      {/* Paiements en attente */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>⏳ Paiements en attente</Text>

        {pendingPayments.filter(p => p.status === 'pending').length === 0 ? (
          <Text style={styles.noPayments}>Aucun paiement en attente</Text>
        ) : (
          pendingPayments
            .filter(p => p.status === 'pending')
            .map((payment, index) => (
              <View key={index} style={styles.paymentCard}>
                <View style={styles.paymentInfo}>
                  <Text style={styles.paymentEmail}>{payment.email}</Text>
                  <Text style={styles.paymentAmount}>
                    {payment.amount} {payment.currency}
                  </Text>
                  <Text style={styles.paymentDate}>
                    {new Date(payment.created_at).toLocaleString('fr-FR')}
                  </Text>
                  <Text style={styles.paymentId}>
                    ID: {payment.transaction_id}
                  </Text>
                </View>
                <TouchableOpacity
                  style={styles.confirmButton}
                  onPress={() => confirmPayment(payment.transaction_id)}
                >
                  <Text style={styles.confirmButtonText}>✓ Confirmer</Text>
                </TouchableOpacity>
              </View>
            ))
        )}
      </View>

      {/* Instructions */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>📋 Instructions</Text>
        <Text style={styles.instructions}>
          1. Configurez votre adresse PayPal ci-dessus{'\n'}
          2. Les utilisateurs verront un bouton "Devenir Premium" dans leur profil{'\n'}
          3. Ils recevront un lien PayPal pour payer{'\n'}
          4. Après réception du paiement, confirmez la transaction ici{'\n'}
          5. L'utilisateur sera automatiquement passé en Premium
        </Text>
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
    marginTop: 15,
    fontSize: 16,
    color: '#6b7280',
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
  subtitle: {
    fontSize: 14,
    color: '#e0e7ff',
    marginTop: 4,
  },
  section: {
    margin: 15,
    padding: 15,
    backgroundColor: '#fff',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 15,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
    marginTop: 10,
  },
  input: {
    backgroundColor: '#f9fafb',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 10,
    padding: 14,
    fontSize: 16,
  },
  saveButton: {
    backgroundColor: '#6366f1',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 20,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  noPayments: {
    textAlign: 'center',
    color: '#9ca3af',
    fontSize: 14,
    padding: 20,
  },
  paymentCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fef3c7',
    padding: 12,
    borderRadius: 10,
    marginBottom: 10,
  },
  paymentInfo: {
    flex: 1,
  },
  paymentEmail: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
  },
  paymentAmount: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#059669',
    marginTop: 4,
  },
  paymentDate: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 2,
  },
  paymentId: {
    fontSize: 10,
    color: '#9ca3af',
    marginTop: 2,
  },
  confirmButton: {
    backgroundColor: '#059669',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
  },
  confirmButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  instructions: {
    fontSize: 14,
    color: '#6b7280',
    lineHeight: 22,
  },
});
