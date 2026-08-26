import React, { useState, useRef } from 'react';
import { StyleSheet, Text, View, Image, TouchableOpacity, SafeAreaView, Animated, Dimensions, ScrollView } from 'react-native';
import { generateFloat, getWearFromFloat } from './utils';
import { getRealisticPrice } from './prices';

const RARITY_ODDS = [
  { chance: 79.92, name: 'Mil-Spec (Mavi)', color: '#4b69ff' },
  { chance: 15.98, name: 'Restricted (Mor)', color: '#8847ff' },
  { chance: 3.20, name: 'Classified (Pembe)', color: '#d32ce6' },
  { chance: 0.64, name: 'Covert (Kırmızı)', color: '#eb4b4b' },
  { chance: 0.26, name: 'Rare Special (Altın)', color: '#ffd700' }
];

const ITEM_WIDTH = 100;
const { width } = Dimensions.get('window');
const KEY_PRICE = 2.50; 

export default function CaseOpening({ crate, onBack, balance, setBalance, inventory, setInventory, gameMode, priceMap }) {
  const [opening, setOpening] = useState(false);
  const [wonItem, setWonItem] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [rouletteItems, setRouletteItems] = useState([]);
  
  const [sessionSpent, setSessionSpent] = useState(0);
  const [sessionWon, setSessionWon] = useState(0);
  const [sessionOpened, setSessionOpened] = useState(0);
  
  const translateX = useRef(new Animated.Value(0)).current;
  const CASE_PRICE = crate.price || 0.50; 
  const TOTAL_COST_PER_OPEN = CASE_PRICE + KEY_PRICE;

  const handleOpenCase = () => {
    if (gameMode === 'wallet' && balance < TOTAL_COST_PER_OPEN) { 
      setErrorMsg(`Yetersiz bakiye! ($${TOTAL_COST_PER_OPEN.toFixed(2)} gerekli)`); 
      return; 
    }
    
    setErrorMsg('');
    if (gameMode === 'wallet') setBalance(prev => prev - TOTAL_COST_PER_OPEN);
    
    setSessionSpent(prev => prev + TOTAL_COST_PER_OPEN);
    setSessionOpened(prev => prev + 1);
    setOpening(true); setWonItem(null); translateX.setValue(0);

    const items = Array.from({length: 50}, () => {
      const roll = Math.random() * 100;
      let cumulative = 0; let selectedRarity = RARITY_ODDS[0];
      for (let i = 0; i < RARITY_ODDS.length; i++) {
        cumulative += RARITY_ODDS[i].chance;
        if (roll <= cumulative) { selectedRarity = RARITY_ODDS[i]; break; }
      }
      let possibleItems = crate.contains.filter(item => item.rarity?.color?.toLowerCase() === selectedRarity.color.toLowerCase());
      if (possibleItems.length === 0) possibleItems = crate.contains;
      return { item: possibleItems[Math.floor(Math.random() * possibleItems.length)], rarity: selectedRarity };
    });

    const winnerData = items[40];
    const isStatTrak = Math.random() < 0.10;
    // GERÇEK CS2 KURALI: Her skinin kendine özgü float sınırı vardır (bazı skinler hiç
    // Factory New olamaz, bazıları hiç Battle-Scarred olamaz). Eskiden her eşya için
    // sabit 0.00-1.00 kullanılıyordu — artık eşyanın kendi min_float/max_float'ı kullanılıyor.
    const floatVal = generateFloat(winnerData.item.min_float ?? 0.00, winnerData.item.max_float ?? 1.00); 
    const price = getRealisticPrice(priceMap, winnerData.item, floatVal, isStatTrak, winnerData.rarity.name);

    setRouletteItems(items);
    const offset = Math.random() * (ITEM_WIDTH - 10) - (ITEM_WIDTH / 2);
    const toValue = -(40 * ITEM_WIDTH) + (width / 2) - (ITEM_WIDTH / 2) + offset;

    Animated.timing(translateX, { toValue, duration: 5000, useNativeDriver: true }).start(() => {
      const itemToSave = { ...winnerData.item, isStatTrak, displayColor: winnerData.rarity.color, uid: Date.now().toString(), float: floatVal, wear: getWearFromFloat(floatVal), price, source: '📦 Kasa' };
      setWonItem(itemToSave);
      setSessionWon(prev => prev + price);
      setOpening(false);
    });
  };

  const sellItem = () => {
    if (gameMode === 'wallet') setBalance(prev => prev + wonItem.price);
    setWonItem(null);
  };

  const keepItem = () => {
    setInventory(prev => [...prev, wonItem]);
    setWonItem(null);
  };

  const netProfit = sessionWon - sessionSpent;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack}><Text style={styles.backText}>{'<'} Geri</Text></TouchableOpacity>
        {gameMode === 'wallet' ? <Text style={styles.balanceText}>Cüzdan: ${balance.toFixed(2)}</Text> : <Text style={styles.unlimitedText}>♾️ Sınırsız Mod</Text>}
      </View>

      <View style={styles.statsPanel}>
        <View style={styles.statBox}><Text style={styles.statLbl}>Açılan</Text><Text style={styles.statVal}>{sessionOpened}</Text></View>
        <View style={styles.statBox}><Text style={styles.statLbl}>Harcanan</Text><Text style={[styles.statVal, {color: '#e74c3c'}]}>-${sessionSpent.toFixed(2)}</Text></View>
        <View style={styles.statBox}><Text style={styles.statLbl}>Kazanılan</Text><Text style={[styles.statVal, {color: '#2ecc71'}]}>+${sessionWon.toFixed(2)}</Text></View>
        <View style={styles.statBox}><Text style={styles.statLbl}>Kâr/Zarar</Text><Text style={[styles.statVal, {color: netProfit >= 0 ? '#2ecc71' : '#e74c3c'}]}>{netProfit >= 0 ? '+' : ''}${netProfit.toFixed(2)}</Text></View>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <Image source={{ uri: crate.image }} style={styles.crateImage} resizeMode="contain" />
        <Text style={styles.crateName}>{crate.name}</Text>
        <Text style={styles.costBreakdown}>Kasa: ${CASE_PRICE.toFixed(2)} + 🔑 Anahtar: ${KEY_PRICE.toFixed(2)}</Text>

        {crate.expectedReturn != null && (
          <View style={styles.roiPanel}>
            <View style={styles.roiBox}>
              <Text style={styles.roiLbl}>Beklenen Değer</Text>
              <Text style={styles.roiVal}>${crate.expectedReturn.toFixed(2)}</Text>
            </View>
            <View style={styles.roiBox}>
              <Text style={styles.roiLbl}>ROI</Text>
              <Text style={[styles.roiVal, { color: crate.roi >= 100 ? '#2ecc71' : '#e74c3c' }]}>%{crate.roi.toFixed(1)}</Text>
            </View>
            <View style={styles.roiBox}>
              <Text style={styles.roiLbl}>Maks. Kazanç</Text>
              <Text style={[styles.roiVal, { color: '#f1c40f' }]}>${crate.maxProfit.toFixed(2)}</Text>
            </View>
          </View>
        )}
        
        {errorMsg !== '' && <Text style={styles.errorText}>{errorMsg}</Text>}

        {rouletteItems.length > 0 && (
          <View style={styles.rouletteContainer}>
            <View style={styles.centerLine} />
            <Animated.View style={[styles.rouletteSlider, { transform: [{ translateX }] }]}>
              {rouletteItems.map((data, index) => (
                <View key={index} style={[styles.rouletteItem, { borderBottomColor: data.rarity.color, borderBottomWidth: 4 }]}>
                  <Image source={{ uri: data.item.image }} style={styles.rouletteImage} resizeMode="contain" />
                </View>
              ))}
            </Animated.View>
          </View>
        )}

        {wonItem && !opening && (
          <View style={[styles.wonContainer, { borderColor: wonItem.displayColor }]}>
            <Text style={styles.priceTag}>${wonItem.price.toFixed(2)}</Text>
            {wonItem.isStatTrak && <Text style={styles.statTrakText}>StatTrak™</Text>}
            <Image source={{ uri: wonItem.image }} style={styles.wonImage} resizeMode="contain" />
            <Text style={[styles.wonItemName, { color: wonItem.displayColor }]}>{wonItem.name}</Text>
            <Text style={styles.wearText}>{wonItem.wear} ({wonItem.float.toFixed(4)})</Text>
            
            <View style={styles.actionRow}>
              <TouchableOpacity style={styles.keepBtn} onPress={keepItem}>
                <Text style={styles.btnTxt}>Envantere Ekle</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.sellBtn} onPress={sellItem}>
                <Text style={styles.btnTxt}>Hemen Sat (${wonItem.price.toFixed(2)})</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {!opening && !wonItem && (
          <TouchableOpacity style={styles.openBtn} onPress={handleOpenCase}>
            <Text style={styles.openBtnTxt}>KASAYI AÇ</Text>
            <Text style={styles.openBtnPrice}>${(TOTAL_COST_PER_OPEN).toFixed(2)}</Text>
          </TouchableOpacity>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#1a1a24' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 15 },
  backText: { color: '#f39c12', fontSize: 16, fontWeight: 'bold' },
  balanceText: { color: '#2ecc71', fontSize: 16, fontWeight: 'bold' },
  unlimitedText: { color: '#3498db', fontSize: 16, fontWeight: 'bold' },
  statsPanel: { flexDirection: 'row', backgroundColor: '#111', marginHorizontal: 15, borderRadius: 10, padding: 10, justifyContent: 'space-between' },
  statBox: { alignItems: 'center' },
  statLbl: { color: '#7f8c8d', fontSize: 10, fontWeight: 'bold' },
  statVal: { color: '#fff', fontSize: 13, fontWeight: 'bold', marginTop: 4 },
  content: { alignItems: 'center', padding: 20, paddingBottom: 60 },
  crateImage: { width: 100, height: 100 },
  crateName: { color: '#fff', fontSize: 18, fontWeight: 'bold', marginTop: 10, textAlign: 'center' },
  costBreakdown: { color: '#7f8c8d', fontSize: 12, marginTop: 4, marginBottom: 10 },
  roiPanel: { flexDirection: 'row', backgroundColor: '#111', borderRadius: 8, padding: 10, marginBottom: 15, gap: 20 },
  roiBox: { alignItems: 'center' },
  roiLbl: { color: '#7f8c8d', fontSize: 9, fontWeight: 'bold' },
  roiVal: { color: '#fff', fontSize: 13, fontWeight: 'bold', marginTop: 2 },
  errorText: { color: '#e74c3c', fontSize: 14, fontWeight: 'bold', marginBottom: 10 },
  rouletteContainer: { width: '100%', height: 120, backgroundColor: '#111', overflow: 'hidden', marginVertical: 20, borderWidth: 1, borderColor: '#333' },
  rouletteSlider: { flexDirection: 'row', height: '100%', alignItems: 'center' },
  rouletteItem: { width: ITEM_WIDTH, height: 100, justifyContent: 'center', alignItems: 'center', backgroundColor: '#2a2a35', marginHorizontal: 2, borderRadius: 5 },
  rouletteImage: { width: 80, height: 80 },
  centerLine: { position: 'absolute', width: 4, height: '100%', backgroundColor: '#f39c12', left: '50%', marginLeft: -2, zIndex: 10 },
  wonContainer: { alignItems: 'center', marginVertical: 10, padding: 20, backgroundColor: '#2a2a35', borderRadius: 10, borderWidth: 2, minWidth: 250 },
  priceTag: { position: 'absolute', top: 10, right: 10, color: '#2ecc71', fontSize: 16, fontWeight: 'bold' },
  statTrakText: { color: '#e67e22', fontWeight: 'bold', marginBottom: 5 },
  wonImage: { width: 150, height: 110 },
  wonItemName: { fontSize: 16, fontWeight: 'bold', marginTop: 10, textAlign: 'center' },
  wearText: { color: '#7f8c8d', fontSize: 12, marginTop: 5 },
  actionRow: { flexDirection: 'row', gap: 10, marginTop: 15 },
  sellBtn: { backgroundColor: '#e74c3c', paddingHorizontal: 15, paddingVertical: 12, borderRadius: 8 },
  keepBtn: { backgroundColor: '#3498db', paddingHorizontal: 15, paddingVertical: 12, borderRadius: 8 },
  btnTxt: { color: '#fff', fontWeight: 'bold', fontSize: 13 },
  openBtn: { backgroundColor: '#f39c12', paddingVertical: 12, paddingHorizontal: 40, borderRadius: 8, alignItems: 'center', marginTop: 20 },
  openBtnTxt: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  openBtnPrice: { color: '#fff', fontSize: 14, marginTop: 2, opacity: 0.8 }
});