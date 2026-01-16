import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  Dimensions,
} from 'react-native';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

/**
 * Convertit HSL en HEX
 */
const hslToHex = (h, s, l) => {
  s /= 100;
  l /= 100;
  const a = s * Math.min(l, 1 - l);
  const f = n => {
    const k = (n + h / 30) % 12;
    const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
    return Math.round(255 * color).toString(16).padStart(2, '0');
  };
  return `#${f(0)}${f(8)}${f(4)}`;
};

/**
 * Convertit HEX en HSL
 */
const hexToHsl = (hex) => {
  let r = 0, g = 0, b = 0;
  if (hex.length === 4) {
    r = parseInt(hex[1] + hex[1], 16);
    g = parseInt(hex[2] + hex[2], 16);
    b = parseInt(hex[3] + hex[3], 16);
  } else if (hex.length === 7) {
    r = parseInt(hex.slice(1, 3), 16);
    g = parseInt(hex.slice(3, 5), 16);
    b = parseInt(hex.slice(5, 7), 16);
  }
  r /= 255;
  g /= 255;
  b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s = 0, l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
      case g: h = ((b - r) / d + 2) / 6; break;
      case b: h = ((r - g) / d + 4) / 6; break;
    }
  }
  return { h: Math.round(h * 360), s: Math.round(s * 100), l: Math.round(l * 100) };
};

/**
 * ColorPicker Pro - Design élégant et minimaliste
 * Sans couleurs rapides, interface classe et professionnelle
 */
export default function ColorPicker({ 
  visible, 
  onClose, 
  onSelectColor, 
  currentColor = '#6366f1',
  title = 'Choisir une couleur' 
}) {
  const [hue, setHue] = useState(240);
  const [saturation, setSaturation] = useState(80);
  const [lightness, setLightness] = useState(60);
  const [selectedColor, setSelectedColor] = useState(currentColor);

  // Initialiser avec la couleur actuelle
  useEffect(() => {
    if (visible && currentColor) {
      try {
        const hsl = hexToHsl(currentColor);
        setHue(hsl.h);
        setSaturation(hsl.s);
        setLightness(hsl.l);
        setSelectedColor(currentColor);
      } catch (e) {
        // Couleur par défaut si erreur
      }
    }
  }, [visible, currentColor]);

  // Mettre à jour la couleur quand HSL change
  const updateFromHSL = useCallback((h, s, l) => {
    const hex = hslToHex(h, s, l);
    setSelectedColor(hex);
  }, []);

  // Génère les teintes (hues) pour la barre arc-en-ciel
  const hueColors = Array.from({ length: 12 }, (_, i) => hslToHex(i * 30, 100, 50));

  // Génère les nuances de la teinte sélectionnée
  const generateShades = () => {
    const shades = [];
    // Variations de luminosité (du clair au foncé)
    for (let l = 90; l >= 10; l -= 20) {
      shades.push(hslToHex(hue, saturation, l));
    }
    return shades;
  };

  // Génère les saturations de la teinte sélectionnée
  const generateSaturations = () => {
    const sats = [];
    for (let s = 100; s >= 0; s -= 20) {
      sats.push(hslToHex(hue, s, lightness));
    }
    return sats;
  };

  const handleHueSelect = (h) => {
    setHue(h);
    updateFromHSL(h, saturation, lightness);
  };

  const handleShadeSelect = (color) => {
    const hsl = hexToHsl(color);
    setLightness(hsl.l);
    setSelectedColor(color);
  };

  const handleSaturationSelect = (color) => {
    const hsl = hexToHsl(color);
    setSaturation(hsl.s);
    setSelectedColor(color);
  };

  const handleConfirm = () => {
    onSelectColor(selectedColor);
    onClose();
  };

  const shades = generateShades();
  const saturations = generateSaturations();

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.container}>
          {/* En-tête avec titre et fermeture */}
          <View style={styles.header}>
            <Text style={styles.title}>{title}</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Text style={styles.closeIcon}>✕</Text>
            </TouchableOpacity>
          </View>

          {/* Aperçu de la couleur */}
          <View style={styles.previewSection}>
            <View style={styles.previewContainer}>
              <View style={[styles.colorPreview, { backgroundColor: selectedColor }]}>
                <View style={styles.previewShine} />
              </View>
              <View style={styles.previewInfo}>
                <Text style={styles.colorHex}>{selectedColor.toUpperCase()}</Text>
                <Text style={styles.colorLabel}>Couleur sélectionnée</Text>
              </View>
            </View>
          </View>

          {/* Sélecteur de teinte (arc-en-ciel) */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Teinte</Text>
            <View style={styles.hueRow}>
              {hueColors.map((color, index) => {
                const h = index * 30;
                const isSelected = Math.abs(hue - h) < 15;
                return (
                  <TouchableOpacity
                    key={`hue-${index}`}
                    style={[
                      styles.hueColor,
                      { backgroundColor: color },
                      isSelected && styles.colorSelected,
                    ]}
                    onPress={() => handleHueSelect(h)}
                    activeOpacity={0.7}
                  />
                );
              })}
            </View>
          </View>

          {/* Sélecteur de luminosité */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Luminosité</Text>
            <View style={styles.shadesRow}>
              {shades.map((color, index) => {
                const isSelected = selectedColor.toLowerCase() === color.toLowerCase() ||
                  Math.abs(hexToHsl(color).l - lightness) < 5;
                return (
                  <TouchableOpacity
                    key={`shade-${index}`}
                    style={[
                      styles.shadeColor,
                      { backgroundColor: color },
                      isSelected && styles.colorSelected,
                    ]}
                    onPress={() => handleShadeSelect(color)}
                    activeOpacity={0.7}
                  />
                );
              })}
            </View>
          </View>

          {/* Sélecteur de saturation */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Intensité</Text>
            <View style={styles.shadesRow}>
              {saturations.map((color, index) => {
                const isSelected = Math.abs(hexToHsl(color).s - saturation) < 5;
                return (
                  <TouchableOpacity
                    key={`sat-${index}`}
                    style={[
                      styles.shadeColor,
                      { backgroundColor: color },
                      isSelected && styles.colorSelected,
                    ]}
                    onPress={() => handleSaturationSelect(color)}
                    activeOpacity={0.7}
                  />
                );
              })}
            </View>
          </View>

          {/* Boutons d'action */}
          <View style={styles.actions}>
            <TouchableOpacity 
              style={styles.cancelBtn} 
              onPress={onClose}
              activeOpacity={0.8}
            >
              <Text style={styles.cancelText}>Annuler</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.confirmBtn, { backgroundColor: selectedColor }]} 
              onPress={handleConfirm}
              activeOpacity={0.8}
            >
              <Text style={styles.confirmText}>✓ Valider</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  container: {
    backgroundColor: '#1a1a2e',
    borderRadius: 20,
    padding: 20,
    width: Math.min(SCREEN_WIDTH - 48, 360),
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeIcon: {
    color: '#9ca3af',
    fontSize: 16,
    fontWeight: '600',
  },
  previewSection: {
    marginBottom: 24,
  },
  previewContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 16,
    padding: 16,
  },
  colorPreview: {
    width: 64,
    height: 64,
    borderRadius: 16,
    borderWidth: 3,
    borderColor: 'rgba(255,255,255,0.2)',
    overflow: 'hidden',
  },
  previewShine: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '40%',
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderTopLeftRadius: 13,
    borderTopRightRadius: 13,
  },
  previewInfo: {
    marginLeft: 16,
    flex: 1,
  },
  colorHex: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '700',
    fontFamily: 'monospace',
    letterSpacing: 1,
  },
  colorLabel: {
    color: '#6b7280',
    fontSize: 12,
    marginTop: 4,
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    color: '#9ca3af',
    fontSize: 12,
    fontWeight: '500',
    marginBottom: 10,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  hueRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  hueColor: {
    width: 24,
    height: 40,
    borderRadius: 8,
  },
  shadesRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  shadeColor: {
    flex: 1,
    height: 40,
    marginHorizontal: 3,
    borderRadius: 8,
  },
  colorSelected: {
    borderWidth: 3,
    borderColor: '#fff',
    transform: [{ scale: 1.05 }],
    shadowColor: '#fff',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 8,
    elevation: 8,
  },
  actions: {
    flexDirection: 'row',
    marginTop: 8,
    gap: 12,
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  cancelText: {
    color: '#9ca3af',
    fontSize: 15,
    fontWeight: '500',
  },
  confirmBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  confirmText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: 0.5,
    textShadowColor: 'rgba(0,0,0,0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
});
