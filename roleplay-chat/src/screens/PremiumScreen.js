import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  Linking,
} from 'react-native';
import AuthService from '../services/AuthService';

const FREEBOX_URL = 'http://88.174.155.230:33437';

export default function PremiumScreen({ navigation }) {
  const [loading, setLoading] = useState(true);
  const [isPremium, setIsPremium] = useState(false);
  const [premiumSince, setPremiumSince] = useState(null);
  const [price, setPrice] = useState(4.99);
  const [currency, setCurrency] = useState('EUR');
  const [purchasing, setPurchasing] = useState(false);

  useEffect(() => {
    loadPremiumStatus();
  }, []);

  const loadPremiumStatus = async () => {
    try {
      // Vérifier le statut premium
      const status = await AuthService.checkPremiumStatus();
      setIsPremium(status.is_premium);
      setPremiumSince(status.premium_since);

      // Récupérer le prix
      const response = await fetch(`${FREEBOX_URL}/api/premium/price`);
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setPrice(data.price);
          setCurrency(data.currency);
        }
      }
    } catch (error) {
      console.error('Erreur chargement statut premium:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePurchase = async () => {
    setPurchasing(true);
    try {
      const response = await fetch(`${FREEBOX_URL}/api/premium/paypal-link`, {
        headers: {
          'Authorization': `Bearer ${AuthService.token}`,
          'Content-Type': 'application/json',
        }
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success && data.paypal_link) {
          Alert.alert(
            '💳 Paiement PayPal',
            `Vous allez être redirigé vers PayPal pour payer ${data.amount}€.\n\nAprès le paiement, votre compte sera activé en Premium sous 24h.\n\nID Transaction: ${data.transaction_id}`,
            [
              { text: 'Annuler', style: 'cancel' },
              {
                text: 'Payer avec PayPal',
                onPress: () => Linking.openURL(data.paypal_link)
              }
            ]
          );
        } else if (data.error) {
          Alert.alert('Erreur', data.message || data.error);
        }
      } else {
        const errorData = await response.json();
        Alert.alert('Erreur', errorData.message || 'Paiement non disponible');
      }
    } catch (error) {
      Alert.alert('Erreur', 'Impossible de charger le lien de paiement');
    } finally {
      setPurchasing(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#6366f1" />
        <Text style={styles.loadingText}>Chargement...</Text>
      </View>
    );
  }

  if (isPremium) {
    return (
      <ScrollView style={styles.container}>
        <View style={styles.premiumHeader}>
          <Text style={styles.premiumIcon}>⭐</Text>
          <Text style={styles.premiumTitle}>Vous êtes Premium !</Text>
          {premiumSince && (
            <Text style={styles.premiumSince}>
              Depuis le {new Date(premiumSince).toLocaleDateString('fr-FR')}
            </Text>
          )}
        </View>

        <View style={styles.benefitsSection}>
          <Text style={styles.sectionTitle}>Vos avantages</Text>
          
          <View style={styles.benefitItem}>
            <Text style={styles.benefitIcon}>🖼️</Text>
            <View style={styles.benefitContent}>
              <Text style={styles.benefitTitle}>Génération d'images illimitée</Text>
              <Text style={styles.benefitDesc}>Créez autant d'images que vous voulez</Text>
            </View>
            <Text style={styles.checkmark}>✓</Text>
          </View>

          <View style={styles.benefitItem}>
            <Text style={styles.benefitIcon}>🎨</Text>
            <View style={styles.benefitContent}>
              <Text style={styles.benefitTitle}>Styles d'images variés</Text>
              <Text style={styles.benefitDesc}>Anime, réaliste, 3D et plus</Text>
            </View>
            <Text style={styles.checkmark}>✓</Text>
          </View>

          <View style={styles.benefitItem}>
            <Text style={styles.benefitIcon}>💫</Text>
            <View style={styles.benefitContent}>
              <Text style={styles.benefitTitle}>Support prioritaire</Text>
              <Text style={styles.benefitDesc}>Accès au support Discord VIP</Text>
            </View>
            <Text style={styles.checkmark}>✓</Text>
          </View>

          <View style={styles.benefitItem}>
            <Text style={styles.benefitIcon}>💬</Text>
            <View style={styles.benefitContent}>
              <Text style={styles.benefitTitle}>Chat Communautaire</Text>
              <Text style={styles.benefitDesc}>Discutez avec les membres Premium</Text>
            </View>
            <Text style={styles.checkmark}>✓</Text>
          </View>
        </View>

        {/* Bouton Chat Premium */}
        <TouchableOpacity
          style={styles.premiumChatButton}
          onPress={() => navigation.navigate('PremiumChat')}
        >
          <Text style={styles.premiumChatButtonIcon}>💬</Text>
          <View style={styles.premiumChatButtonContent}>
            <Text style={styles.premiumChatButtonTitle}>Accéder au Chat Premium</Text>
            <Text style={styles.premiumChatButtonDesc}>Discutez en public ou en privé</Text>
          </View>
          <Text style={styles.premiumChatButtonArrow}>→</Text>
        </TouchableOpacity>

        <Text style={styles.thankYou}>
          Merci pour votre soutien ! 💜
        </Text>
      </ScrollView>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerIcon}>💎</Text>
        <Text style={styles.headerTitle}>Devenir Premium</Text>
        <Text style={styles.headerSubtitle}>Débloquez toutes les fonctionnalités</Text>
      </View>

      <View style={styles.priceCard}>
        <Text style={styles.priceLabel}>Prix unique</Text>
        <Text style={styles.price}>{price}€</Text>
        <Text style={styles.priceNote}>Paiement unique • Accès à vie</Text>
      </View>

      <View style={styles.benefitsSection}>
        <Text style={styles.sectionTitle}>Avantages Premium</Text>
        
        <View style={styles.benefitItem}>
          <Text style={styles.benefitIcon}>🖼️</Text>
          <View style={styles.benefitContent}>
            <Text style={styles.benefitTitle}>Génération d'images</Text>
            <Text style={styles.benefitDesc}>Créez des images de vos personnages</Text>
          </View>
        </View>

        <View style={styles.benefitItem}>
          <Text style={styles.benefitIcon}>🎨</Text>
          <View style={styles.benefitContent}>
            <Text style={styles.benefitTitle}>Styles multiples</Text>
            <Text style={styles.benefitDesc}>Anime, réaliste, 3D...</Text>
          </View>
        </View>

        <View style={styles.benefitItem}>
          <Text style={styles.benefitIcon}>🔞</Text>
          <View style={styles.benefitContent}>
            <Text style={styles.benefitTitle}>Images NSFW</Text>
            <Text style={styles.benefitDesc}>Contenus adultes (18+)</Text>
          </View>
        </View>

        <View style={styles.benefitItem}>
          <Text style={styles.benefitIcon}>💫</Text>
          <View style={styles.benefitContent}>
            <Text style={styles.benefitTitle}>Support prioritaire</Text>
            <Text style={styles.benefitDesc}>Accès Discord VIP</Text>
          </View>
        </View>

        <View style={styles.benefitItem}>
          <Text style={styles.benefitIcon}>💬</Text>
          <View style={styles.benefitContent}>
            <Text style={styles.benefitTitle}>Chat Communautaire</Text>
            <Text style={styles.benefitDesc}>Échangez avec les membres Premium</Text>
          </View>
        </View>
      </View>

      <TouchableOpacity
        style={[styles.purchaseButton, purchasing && styles.buttonDisabled]}
        onPress={handlePurchase}
        disabled={purchasing}
      >
        {purchasing ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <>
            <Text style={styles.purchaseButtonText}>💳 Devenir Premium</Text>
            <Text style={styles.purchaseButtonPrice}>{price}€</Text>
          </>
        )}
      </TouchableOpacity>

      <Text style={styles.secureText}>
        🔒 Paiement sécurisé via PayPal
      </Text>

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
    padding: 30,
    paddingTop: 60,
    backgroundColor: '#6366f1',
    alignItems: 'center',
  },
  headerIcon: {
    fontSize: 60,
    marginBottom: 10,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#e0e7ff',
    marginTop: 5,
  },
  premiumHeader: {
    padding: 30,
    paddingTop: 60,
    backgroundColor: '#059669',
    alignItems: 'center',
  },
  premiumIcon: {
    fontSize: 60,
    marginBottom: 10,
  },
  premiumTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
  },
  premiumSince: {
    fontSize: 14,
    color: '#d1fae5',
    marginTop: 5,
  },
  priceCard: {
    margin: 20,
    padding: 25,
    backgroundColor: '#fff',
    borderRadius: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  priceLabel: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 5,
  },
  price: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#6366f1',
  },
  priceNote: {
    fontSize: 12,
    color: '#9ca3af',
    marginTop: 5,
  },
  benefitsSection: {
    margin: 20,
    marginTop: 0,
    padding: 20,
    backgroundColor: '#fff',
    borderRadius: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 15,
  },
  benefitItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  benefitIcon: {
    fontSize: 24,
    marginRight: 15,
  },
  benefitContent: {
    flex: 1,
  },
  benefitTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#111827',
  },
  benefitDesc: {
    fontSize: 13,
    color: '#6b7280',
    marginTop: 2,
  },
  checkmark: {
    fontSize: 20,
    color: '#059669',
    fontWeight: 'bold',
  },
  purchaseButton: {
    margin: 20,
    marginTop: 10,
    padding: 18,
    backgroundColor: '#6366f1',
    borderRadius: 14,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#6366f1',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  purchaseButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
  },
  purchaseButtonPrice: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    marginLeft: 10,
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 8,
  },
  secureText: {
    textAlign: 'center',
    color: '#6b7280',
    fontSize: 12,
  },
  thankYou: {
    textAlign: 'center',
    fontSize: 18,
    color: '#6b7280',
    marginTop: 20,
    marginBottom: 30,
  },
  premiumChatButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#6366f1',
    marginHorizontal: 20,
    marginTop: 20,
    padding: 15,
    borderRadius: 12,
    shadowColor: '#6366f1',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  premiumChatButtonIcon: {
    fontSize: 28,
    marginRight: 12,
  },
  premiumChatButtonContent: {
    flex: 1,
  },
  premiumChatButtonTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
  },
  premiumChatButtonDesc: {
    fontSize: 13,
    color: '#e0e7ff',
    marginTop: 2,
  },
  premiumChatButtonArrow: {
    fontSize: 24,
    color: '#fff',
    fontWeight: 'bold',
  },
});
