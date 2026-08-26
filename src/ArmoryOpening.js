import React, { useState, useRef } from 'react';
import { StyleSheet, Text, View, Image, TouchableOpacity, SafeAreaView, Animated } from 'react-native';
import { generateFloat, getWearFromFloat } from './utils';
import { getRealisticPrice } from './prices';

// Gerçekçi CS2 Koleksiyon Drop Oranları
const COLLECTION_ODDS = [
  { chance: 79.92, name: 'Consumer Grade', color: '#b0c3d9' }, 
  { chance: 15.98, name: 'Industrial Grade', color: '#5e98d9' }, 
  { chance: 3.20, name: 'Mil-Spec Grade', color: '#4b69ff' }, 
  { chance: 0.64, name: 'Restricted', color: '#8847ff' }, 
  { chance: 0.20, name: 'Classified', color: '#d32ce6' }, 
  { chance: 0.06, name: 'Covert', color: '#eb4b4b' } 
];

export default function ArmoryOpening({ collection, onBack, balance, setBalance, stars, setStars, inventory, setInventory, gameMode, priceMap }) {
  const [opening, setOpening] = useState(false);
  const [wonItem, setWonItem] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');
  
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.5)).current;
  const ARMORY_PRICE = 4;

  const openArmory = () => {
    if (gameMode === 'wallet' && stars < ARMORY_PRICE) { setErrorMsg('Yetersiz yıldız! (Gerekli: 4⭐) Bilet satın al.'); return; }
    
    setErrorMsg('');
    if (gameMode === 'wallet') setStars(prev => prev - ARMORY_PRICE);
    setOpening(true); setWonItem(null);
    fadeAnim.setValue(0); scaleAnim.setValue(0.5);

    const roll = Math.random() * 100;
    let cumulative = 0; let selectedRarity = COLLECTION_ODDS[0];
    for (let i = 0; i < COLLECTION_ODDS.length; i++) {
      cumulative += COLLECTION_ODDS[i].chance;
      if (roll <= cumulative) { selectedRarity = COLLECTION_ODDS[i]; break; }
    }

    let possibleItems = collection.contains.filter(item => item.rarity?.name?.toLowerCase() === selectedRarity.name.toLowerCase());
    if (possibleItems.length === 0) possibleItems = collection.contains; // Eğer o nadirlikte eşya yoksa rastgele ver
    const finalItem = possibleItems[Math.floor(Math.random() * possibleItems.length)];
    
    // GERÇEK CS2 KURALI: eşyanın kendi float sınırları kullanılıyor (sabit 0-1 değil)
    const floatVal = generateFloat(finalItem.min_float ?? 0.00, finalItem.max_float ?? 1.00);
    const wear = getWearFromFloat(floatVal);
    const price = getRealisticPrice(priceMap, finalItem, floatVal, false, finalItem.rarity?.name || 'Consumer Grade');

    setTimeout(() => {
      const itemToSave = { ...finalItem, displayColor: finalItem.rarity?.color || '#b0c3d9', uid: Date.now().toString(), float: floatVal, wear, price, source: '⭐ Armory' };
      setWonItem(itemToSave);
      setOpening(false);

      Animated.parallel([
        Animated.timing(fadeAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
        Animated.spring(scaleAnim, { toValue: 1, friction: 4, tension: 40, useNativeDriver: true })
      ]).start();
    }, 1500);
  };

  const sellArmoryItem = () => {
    if (gameMode === 'wallet') setBalance(prev => prev + wonItem.price);
    setWonItem(null);
  };

  const keepArmoryItem = () => {
    setInventory(prev => [...prev, wonItem]);
    setWonItem(null);
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack}><Text style={styles.backText}>{'<'} Geri</Text></TouchableOpacity>
        {gameMode === 'wallet' ? <Text style={styles.balanceText}>⭐ {stars}</Text> : <Text style={styles.unlimitedText}>♾️ Sınırsız Mod</Text>}
      </View>

      <View style={styles.content}>
        <Image source={{ uri: collection.image }} style={styles.crateImage} resizeMode="contain" />
        <Text style={styles.crateName}>{collection.name}</Text>

        {collection.expectedReturn != null && (
          <View style={styles.roiPanel}>
            <View style={styles.roiBox}>
              <Text style={styles.roiLbl}>Beklenen Değer</Text>
              <Text style={styles.roiVal}>${collection.expectedReturn.toFixed(2)}</Text>
            </View>
            <View style={styles.roiBox}>
              <Text style={styles.roiLbl}>ROI</Text>
              <Text style={[styles.roiVal, { color: collection.roi >= 100 ? '#2ecc71' : '#e74c3c' }]}>%{collection.roi.toFixed(1)}</Text>
            </View>
            <View style={styles.roiBox}>
              <Text style={styles.roiLbl}>Maks. Kazanç</Text>
              <Text style={[styles.roiVal, { color: '#f1c40f' }]}>${collection.maxProfit.toFixed(2)}</Text>
            </View>
          </View>
        )}

        {errorMsg !== '' && <Text style={styles.errorText}>{errorMsg}</Text>}

        {opening && <View style={styles.openingContainer}><Text style={styles.pulseText}>Eşya Çıkarılıyor...</Text></View>}

        {wonItem && !opening && (
          <Animated.View style={[styles.wonContainer, { borderColor: wonItem.displayColor, opacity: fadeAnim, transform: [{ scale: scaleAnim }] }]}>
            <Text style={styles.wonTitle}>Cephanelik Eşyası!</Text>
            <Text style={styles.priceTag}>${wonItem.price.toFixed(2)}</Text>
            <Image source={{ uri: wonItem.image }} style={styles.wonImage} resizeMode="contain" />
            <Text style={[styles.wonItemName, { color: wonItem.displayColor }]}>{wonItem.name}</Text>
            <Text style={styles.wearText}>{wonItem.wear} ({wonItem.float.toFixed(4)})</Text>
            
            <View style={styles.actionRow}>
              <TouchableOpacity style={styles.keepBtn} onPress={keepArmoryItem}>
                <Text style={styles.btnTxt}>Envantere Ekle</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.sellBtn} onPress={sellArmoryItem}>
                <Text style={styles.btnTxt}>Sat (${wonItem.price.toFixed(2)})</Text>
              </TouchableOpacity>
            </View>
          </Animated.View>
        )}

        {!opening && !wonItem && (
          <TouchableOpacity style={styles.openButton} onPress={openArmory}>
            <Text style={styles.openButtonText}>Yıldız Harca (4⭐)</Text>
          </TouchableOpacity>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#1a1a24' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20 },
  backText: { color: '#e74c3c', fontSize: 16, fontWeight: 'bold' },
  balanceText: { color: '#f1c40f', fontSize: 16, fontWeight: 'bold' },
  unlimitedText: { color: '#3498db', fontSize: 16, fontWeight: 'bold' },
  content: { flex: 1, alignItems: 'center', padding: 20 },
  crateImage: { width: 150, height: 150 },
  crateName: { color: '#fff', fontSize: 20, fontWeight: 'bold', marginTop: 10, marginBottom: 10, textAlign: 'center' },
  roiPanel: { flexDirection: 'row', backgroundColor: '#111', borderRadius: 8, padding: 10, marginBottom: 15, gap: 20 },
  roiBox: { alignItems: 'center' },
  roiLbl: { color: '#7f8c8d', fontSize: 9, fontWeight: 'bold' },
  roiVal: { color: '#fff', fontSize: 13, fontWeight: 'bold', marginTop: 2 },
  errorText: { color: '#e74c3c', fontSize: 14, fontWeight: 'bold', marginBottom: 10 },
  openButton: { backgroundColor: '#e74c3c', paddingVertical: 15, paddingHorizontal: 40, borderRadius: 8, marginTop: 'auto', marginBottom: 20 },
  openButtonText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  openingContainer: { alignItems: 'center', marginVertical: 40, padding: 30, backgroundColor: '#111', borderRadius: 100 },
  pulseText: { color: '#f1c40f', fontSize: 18, fontWeight: 'bold', fontStyle: 'italic' },
  wonContainer: { alignItems: 'center', marginVertical: 10, padding: 30, backgroundColor: '#2a2a35', borderRadius: 15, borderWidth: 3, minWidth: 280 },
  wonTitle: { color: '#2ecc71', fontSize: 22, fontWeight: 'bold', marginBottom: 10 },
  priceTag: { position: 'absolute', top: 15, right: 15, color: '#2ecc71', fontSize: 18, fontWeight: 'bold' },
  wonImage: { width: 180, height: 140 },
  wonItemName: { fontSize: 18, fontWeight: 'bold', marginTop: 15, textAlign: 'center' },
  wearText: { color: '#7f8c8d', fontSize: 14, marginTop: 5 },
  actionRow: { flexDirection: 'row', gap: 10, marginTop: 15 },
  sellBtn: { backgroundColor: '#e74c3c', paddingHorizontal: 15, paddingVertical: 12, borderRadius: 8 },
  keepBtn: { backgroundColor: '#3498db', paddingHorizontal: 15, paddingVertical: 12, borderRadius: 8 },
  btnTxt: { color: '#fff', fontWeight: 'bold', fontSize: 13 }
});