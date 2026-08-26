import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, Image, TouchableOpacity, SafeAreaView, FlatList, ActivityIndicator } from 'react-native';
import { generateMockPrice, getWearFromFloat } from './utils';

// Nadirlik hiyerarşisi (Renk bazlı)
const TIER_UPGRADES = {
  '#b0c3d9': '#5e98d9', // Gri -> Açık Mavi
  '#5e98d9': '#4b69ff', // Açık Mavi -> Mavi
  '#4b69ff': '#8847ff', // Mavi -> Mor
  '#8847ff': '#d32ce6', // Mor -> Pembe
  '#d32ce6': '#eb4b4b', // Pembe -> Kırmızı
  '#eb4b4b': null // Kırmızıdan ötesi (Bıçak) trade-up yapılamaz
};

export default function TradeUp({ inventory, setInventory, setTotalWon }) {
  const [selectedUids, setSelectedUids] = useState([]);
  const [loading, setLoading] = useState(false);
  const [allSkins, setAllSkins] = useState([]);
  const [resultItem, setResultItem] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    // Tüm skinleri arka planda yükleyelim (Trade-up havuzu için)
    fetch('https://raw.githubusercontent.com/ByMykel/CSGO-API/main/public/api/en/skins.json')
      .then(r => r.json())
      .then(data => setAllSkins(data))
      .catch(e => console.error(e));
  }, []);

  const toggleSelect = (item) => {
    if (selectedUids.includes(item.uid)) {
      setSelectedUids(prev => prev.filter(id => id !== item.uid));
      setErrorMsg('');
      return;
    }
    
    if (selectedUids.length >= 10) {
      setErrorMsg('En fazla 10 eşya seçebilirsiniz.');
      return;
    }

    if (!TIER_UPGRADES[item.displayColor]) {
      setErrorMsg('Bu nadirlikteki (Kırmızı/Altın) eşyalar Trade-Up kontratında kullanılamaz.');
      return;
    }

    if (selectedUids.length > 0) {
      const firstSelectedItem = inventory.find(i => i.uid === selectedUids[0]);
      if (firstSelectedItem.displayColor !== item.displayColor) {
        setErrorMsg('Trade-Up kontratına sadece aynı nadirlikteki eşyaları koyabilirsiniz.');
        return;
      }
    }

    setSelectedUids(prev => [...prev, item.uid]);
    setErrorMsg('');
    setResultItem(null);
  };

  const doTradeUp = () => {
    if (selectedUids.length !== 10) {
      setErrorMsg('Trade-Up yapmak için tam 10 eşya seçmelisiniz.');
      return;
    }

    if (allSkins.length === 0) {
      setErrorMsg('Skin havuzu yükleniyor, lütfen bekleyin...');
      return;
    }

    setLoading(true);
    setResultItem(null);

    const inputItems = inventory.filter(i => selectedUids.includes(i.uid));
    const inputColor = inputItems[0].displayColor;
    const targetColor = TIER_UPGRADES[inputColor];

    // CS2 Float Matematiği
    const avgFloat = inputItems.reduce((acc, curr) => acc + curr.float, 0) / 10;
    
    // Olası hedefleri bul
    const possibleTargets = allSkins.filter(skin => skin.rarity && skin.rarity.color && skin.rarity.color.toLowerCase() === targetColor.toLowerCase());
    
    if (possibleTargets.length === 0) {
      setErrorMsg('Uygun üst seviye eşya bulunamadı.');
      setLoading(false);
      return;
    }

    const randomTarget = possibleTargets[Math.floor(Math.random() * possibleTargets.length)];
    
    // Gerçekte (Max - Min) * Avg + Min formülü kullanılır. API'de min_float max_float var:
    const minF = randomTarget.min_float !== undefined ? randomTarget.min_float : 0.00;
    const maxF = randomTarget.max_float !== undefined ? randomTarget.max_float : 1.00;
    
    const finalFloat = (maxF - minF) * avgFloat + minF;
    const wear = getWearFromFloat(finalFloat);
    const isStatTrak = inputItems.some(i => i.isStatTrak) && Math.random() < 0.20; // 10 taneden biri ST ise şans var
    
    // Mock fiyat (Nadirliği bulmamız lazım)
    const price = generateMockPrice(randomTarget.rarity.name, finalFloat, isStatTrak);

    setTimeout(() => {
      const itemToSave = {
        ...randomTarget,
        isStatTrak,
        displayColor: targetColor,
        uid: Date.now().toString() + Math.random().toString(),
        float: finalFloat,
        wear: wear,
        price: price
      };

      // Envanteri güncelle
      setInventory(prev => {
        const filtered = prev.filter(i => !selectedUids.includes(i.uid));
        return [itemToSave, ...filtered];
      });

      setSelectedUids([]);
      setTotalWon(prev => prev + price); // Total won artır
      setResultItem(itemToSave);
      setLoading(false);
    }, 2000);
  };

  const tradeUpItems = inventory.filter(i => TIER_UPGRADES[i.displayColor] && !i.isStatTrak); // Sadece kontrata uygunlar

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>Trade-Up Kontratı</Text>
      <Text style={styles.subtitle}>Aynı nadirlikte 10 eşya seçip üst seviye 1 eşya alabilirsiniz.</Text>
      
      {errorMsg !== '' && <Text style={styles.errorText}>{errorMsg}</Text>}

      <View style={styles.contractZone}>
        <Text style={styles.counter}>{selectedUids.length} / 10</Text>
        <TouchableOpacity 
          style={[styles.tradeButton, selectedUids.length !== 10 && styles.tradeButtonDisabled]} 
          onPress={doTradeUp}
          disabled={selectedUids.length !== 10 || loading}
        >
          {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.tradeButtonText}>SÖZLEŞMEYİ İMZALA</Text>}
        </TouchableOpacity>
      </View>

      {resultItem && (
        <View style={[styles.wonContainer, { borderColor: resultItem.displayColor }]}>
          <Text style={styles.wonTitle}>Yeni Eşya Başarıyla Üretildi!</Text>
          <Text style={styles.priceTag}>${resultItem.price.toFixed(2)}</Text>
          <Image source={{ uri: resultItem.image }} style={styles.wonImage} resizeMode="contain" />
          <Text style={[styles.wonItemName, { color: resultItem.displayColor }]}>{resultItem.name}</Text>
          <Text style={styles.wearText}>{resultItem.wear} ({resultItem.float.toFixed(4)})</Text>
        </View>
      )}

      <Text style={styles.listTitle}>Envanterinizdeki Uygun Eşyalar:</Text>
      {tradeUpItems.length === 0 ? (
        <Text style={styles.emptyText}>Trade-up yapılabilecek uygun eşyanız yok.</Text>
      ) : (
        <FlatList
          data={inventory}
          keyExtractor={(item) => item.uid}
          numColumns={3}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => {
            if (!TIER_UPGRADES[item.displayColor]) return null;
            
            const isSelected = selectedUids.includes(item.uid);
            return (
              <TouchableOpacity 
                style={[
                  styles.inventoryCard, 
                  { borderBottomColor: item.displayColor, borderBottomWidth: 3 },
                  isSelected && styles.inventoryCardSelected
                ]}
                onPress={() => toggleSelect(item)}
              >
                {isSelected && <View style={styles.selectedOverlay}><Text style={styles.check}>✓</Text></View>}
                {item.isStatTrak && <Text style={styles.stText}>ST™</Text>}
                <Text style={styles.cardPrice}>${item.price?.toFixed(2)}</Text>
                <Image source={{ uri: item.image }} style={styles.inventoryImage} resizeMode="contain"/>
                <Text style={styles.inventoryName} numberOfLines={2}>{item.name}</Text>
                <Text style={styles.wearText}>{item.float?.toFixed(3)}</Text>
              </TouchableOpacity>
            );
          }}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#1a1a24' },
  title: { color: '#f39c12', fontSize: 22, fontWeight: 'bold', textAlign: 'center', marginTop: 10 },
  subtitle: { color: '#bdc3c7', fontSize: 12, textAlign: 'center', marginBottom: 15, paddingHorizontal: 20 },
  errorText: { color: '#e74c3c', fontSize: 14, fontWeight: 'bold', textAlign: 'center', marginBottom: 10 },
  contractZone: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, marginBottom: 15, backgroundColor: '#2a2a35', padding: 15, borderRadius: 10, marginHorizontal: 10 },
  counter: { color: '#fff', fontSize: 20, fontWeight: 'bold' },
  tradeButton: { backgroundColor: '#f39c12', paddingVertical: 10, paddingHorizontal: 20, borderRadius: 5 },
  tradeButtonDisabled: { backgroundColor: '#7f8c8d' },
  tradeButtonText: { color: '#fff', fontWeight: 'bold' },
  wonContainer: { alignItems: 'center', margin: 10, padding: 15, backgroundColor: '#2a2a35', borderRadius: 10, borderWidth: 2, position: 'relative' },
  wonTitle: { color: '#2ecc71', fontSize: 18, fontWeight: 'bold', marginBottom: 5 },
  priceTag: { position: 'absolute', top: 10, right: 10, color: '#2ecc71', fontSize: 14, fontWeight: 'bold' },
  wonImage: { width: 120, height: 90 },
  wonItemName: { fontSize: 14, fontWeight: 'bold', marginTop: 10, textAlign: 'center' },
  wearText: { color: '#7f8c8d', fontSize: 10, marginTop: 3 },
  listTitle: { color: '#fff', fontSize: 16, marginLeft: 10, marginBottom: 10, fontWeight: 'bold' },
  list: { paddingHorizontal: 5, paddingBottom: 20 },
  emptyText: { color: '#7f8c8d', textAlign: 'center', marginTop: 20 },
  inventoryCard: { flex: 1, backgroundColor: '#2a2a35', margin: 5, borderRadius: 8, padding: 10, alignItems: 'center', maxWidth: '33%', position: 'relative' },
  inventoryCardSelected: { borderColor: '#f39c12', borderWidth: 2, opacity: 0.8 },
  selectedOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(243, 156, 18, 0.2)', justifyContent: 'center', alignItems: 'center', zIndex: 5, borderRadius: 8 },
  check: { color: '#f39c12', fontSize: 30, fontWeight: 'bold' },
  inventoryImage: { width: 60, height: 60, marginBottom: 5, marginTop: 10 },
  inventoryName: { color: '#ccc', textAlign: 'center', fontSize: 10, fontWeight: '500' },
  cardPrice: { position: 'absolute', top: 5, right: 5, color: '#2ecc71', fontSize: 9, fontWeight: 'bold', zIndex: 1 },
  stText: { position: 'absolute', top: 5, left: 5, color: '#e67e22', fontSize: 9, fontWeight: 'bold', zIndex: 1 }
});
