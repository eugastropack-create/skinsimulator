import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, Image, TouchableOpacity, SafeAreaView, FlatList, TextInput, ScrollView, Modal } from 'react-native';
import { getExpectedPrice, generateFloat, getWearFromFloat } from './utils';

const NEXT_RARITY = {
  'Consumer Grade': 'Industrial Grade',
  'Industrial Grade': 'Mil-Spec Grade',
  'Mil-Spec Grade': 'Restricted',
  'Restricted': 'Classified',
  'Classified': 'Covert'
};

export default function TradeUpAnalyzer() {
  const [allSkins, setAllSkins] = useState([]);
  const [search, setSearch] = useState('');
  const [selectedInputs, setSelectedInputs] = useState([]); // { skin, float }
  const [analysis, setAnalysis] = useState(null);
  const [isModalVisible, setModalVisible] = useState(false);
  const [editingIndex, setEditingIndex] = useState(null);
  const [tempFloat, setTempFloat] = useState('');

  useEffect(() => {
    fetch('https://raw.githubusercontent.com/ByMykel/CSGO-API/main/public/api/en/skins.json')
      .then(r => r.json())
      .then(data => {
        const valid = data.filter(s => s.rarity && NEXT_RARITY[s.rarity.name]);
        setAllSkins(valid);
      })
      .catch(e => console.error(e));
  }, []);

  const addInput = (skin) => {
    if (selectedInputs.length >= 10) return;
    
    // Aynı nadirlik kontrolü
    if (selectedInputs.length > 0 && selectedInputs[0].skin.rarity.name !== skin.rarity.name) {
      alert("Trade-up için aynı nadirlikte eşyalar seçmelisiniz!");
      return;
    }

    // Default float atama (Rastgele bir float veriyoruz, kullanıcı isterse değiştirecek)
    const minF = skin.min_float !== undefined ? skin.min_float : 0.00;
    const maxF = skin.max_float !== undefined ? skin.max_float : 1.00;
    const defaultFloat = minF + (maxF - minF) * 0.5; // Ortanca float

    setSelectedInputs([...selectedInputs, { skin, float: defaultFloat }]);
    setAnalysis(null);
  };

  const removeInput = (index) => {
    const newItems = [...selectedInputs];
    newItems.splice(index, 1);
    setSelectedInputs(newItems);
    setAnalysis(null);
  };

  const openFloatModal = (index) => {
    setEditingIndex(index);
    setTempFloat(selectedInputs[index].float.toString());
    setModalVisible(true);
  };

  const saveFloat = () => {
    const parsed = parseFloat(tempFloat);
    if (!isNaN(parsed) && parsed >= 0 && parsed <= 1) {
      const newInputs = [...selectedInputs];
      // Min-max sınırlarına çek
      const minF = newInputs[editingIndex].skin.min_float !== undefined ? newInputs[editingIndex].skin.min_float : 0.00;
      const maxF = newInputs[editingIndex].skin.max_float !== undefined ? newInputs[editingIndex].skin.max_float : 1.00;
      
      if (parsed < minF || parsed > maxF) {
        alert(`Geçersiz Float! Bu eşyanın float değeri ${minF} ile ${maxF} arasında olmalıdır.`);
        return;
      }
      
      newInputs[editingIndex].float = parsed;
      setSelectedInputs(newInputs);
      setModalVisible(false);
      setAnalysis(null);
    } else {
      alert("Geçerli bir float değeri giriniz (0 ile 1 arası).");
    }
  };

  const calculateTradeUpLabStyle = () => {
    if (selectedInputs.length !== 10) return;

    let totalCost = 0;
    let avgFloat = 0;
    const collectionCounts = {}; // Hangi koleksiyondan kaç eşya koyduk
    const inputRarity = selectedInputs[0].skin.rarity.name;
    const targetRarity = NEXT_RARITY[inputRarity];

    selectedInputs.forEach(input => {
      // Maliyeti float'una göre mock hesapla
      totalCost += getExpectedPrice(input.skin.rarity.name); // Basitleştirilmiş mock fiyat
      avgFloat += input.float;

      // Koleksiyonlarını say
      if (input.skin.collections && input.skin.collections.length > 0) {
        // Genelde eşyalar 1 koleksiyona aittir, ilkini alıyoruz
        const colId = input.skin.collections[0].id;
        collectionCounts[colId] = (collectionCounts[colId] || 0) + 1;
      }
    });

    avgFloat = avgFloat / 10;

    // Hedef havuzu bul (Koyduğumuz koleksiyonlardan, hedef nadirlikteki tüm eşyalar)
    const possibleOutcomes = [];
    
    Object.keys(collectionCounts).forEach(colId => {
      const inputCount = collectionCounts[colId];
      // Bu koleksiyondaki hedef eşyaları bul
      const targetSkinsInCol = allSkins.filter(s => 
        s.rarity.name === targetRarity && 
        s.collections && 
        s.collections.some(c => c.id === colId)
      );

      if (targetSkinsInCol.length > 0) {
        // Her bir eşyanın düşme ihtimali
        const chancePerSkin = (inputCount / 10) / targetSkinsInCol.length;
        
        targetSkinsInCol.forEach(targetSkin => {
          const minF = targetSkin.min_float !== undefined ? targetSkin.min_float : 0.00;
          const maxF = targetSkin.max_float !== undefined ? targetSkin.max_float : 1.00;
          const outFloat = (maxF - minF) * avgFloat + minF;
          const wear = getWearFromFloat(outFloat);
          const price = getExpectedPrice(targetSkin.rarity.name) * (outFloat < 0.15 ? 1.5 : 1); // Float price çarpanı
          
          possibleOutcomes.push({
            skin: targetSkin,
            chance: chancePerSkin * 100, // Yüzde
            outFloat,
            wear,
            price,
            profit: price - totalCost
          });
        });
      }
    });

    // Olasılıkları yüksekten düşüğe sırala
    possibleOutcomes.sort((a, b) => b.chance - a.chance);

    let expectedValue = 0;
    possibleOutcomes.forEach(out => {
      expectedValue += out.price * (out.chance / 100);
    });

    setAnalysis({
      totalCost,
      avgFloat,
      expectedValue,
      roi: (expectedValue / totalCost) * 100,
      possibleOutcomes
    });
  };

  const filteredSkins = allSkins.filter(s => s.name.toLowerCase().includes(search.toLowerCase())).slice(0, 50);

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>TradeUpLab Simülatörü</Text>
      <Text style={styles.subtitle}>İstediğiniz eşyaları seçin, float değerlerini belirleyin ve kesin sonuçları görün.</Text>
      
      <View style={styles.inputArea}>
        <View style={styles.selectedGrid}>
          {[...Array(10)].map((_, idx) => {
            const item = selectedInputs[idx];
            return (
              <View key={idx} style={styles.slotBox}>
                {item ? (
                  <>
                    <TouchableOpacity style={styles.removeBtn} onPress={() => removeInput(idx)}>
                      <Text style={styles.removeTxt}>X</Text>
                    </TouchableOpacity>
                    <Image source={{ uri: item.skin.image }} style={styles.slotImage} />
                    <TouchableOpacity style={styles.floatBtn} onPress={() => openFloatModal(idx)}>
                      <Text style={styles.floatTxt}>{item.float.toFixed(4)}</Text>
                    </TouchableOpacity>
                  </>
                ) : (
                  <Text style={styles.emptySlotTxt}>Boş</Text>
                )}
              </View>
            );
          })}
        </View>

        <View style={styles.actionRow}>
          <Text style={styles.counter}>{selectedInputs.length} / 10</Text>
          <TouchableOpacity style={styles.analyzeBtn} onPress={calculateTradeUpLabStyle} disabled={selectedInputs.length !== 10}>
            <Text style={styles.btnText}>ANALİZ ET</Text>
          </TouchableOpacity>
        </View>
      </View>

      {analysis && (
        <View style={styles.analysisBox}>
          <View style={styles.analysisHeader}>
            <Text style={styles.aText}>Ort. Float: {analysis.avgFloat.toFixed(4)}</Text>
            <Text style={styles.aText}>Maliyet: ${analysis.totalCost.toFixed(2)}</Text>
            <Text style={[styles.aText, { color: analysis.roi >= 100 ? '#2ecc71' : '#e74c3c' }]}>
              ROI: %{analysis.roi.toFixed(2)}
            </Text>
          </View>
          
          <Text style={styles.aSub}>Olası Çıktılar (Gerçek Oranlar):</Text>
          <ScrollView style={styles.outcomesScroll}>
            {analysis.possibleOutcomes.map((out, idx) => (
              <View key={idx} style={styles.outcomeRow}>
                <Image source={{ uri: out.skin.image }} style={styles.outcomeImage} />
                <View style={styles.outcomeInfo}>
                  <Text style={styles.outcomeName} numberOfLines={1}>{out.skin.name}</Text>
                  <Text style={styles.outcomeDetails}>{out.wear} - Float: {out.outFloat.toFixed(4)}</Text>
                </View>
                <View style={styles.outcomeStats}>
                  <Text style={styles.chanceTxt}>%{out.chance.toFixed(2)}</Text>
                  <Text style={[styles.profitTxt, { color: out.profit >= 0 ? '#2ecc71' : '#e74c3c' }]}>
                    {out.profit >= 0 ? '+' : ''}${out.profit.toFixed(2)}
                  </Text>
                </View>
              </View>
            ))}
          </ScrollView>
        </View>
      )}

      {!analysis && (
        <>
          <TextInput
            style={styles.searchInput}
            placeholder="Kataloga Eşya Ekle (Arama Yap)..."
            placeholderTextColor="#7f8c8d"
            value={search}
            onChangeText={setSearch}
          />
          <FlatList
            data={filteredSkins}
            keyExtractor={item => item.id}
            numColumns={3}
            contentContainerStyle={styles.skinList}
            renderItem={({ item }) => (
              <TouchableOpacity style={[styles.skinCard, { borderBottomColor: item.rarity?.color, borderBottomWidth: 3 }]} onPress={() => addInput(item)}>
                <Image source={{ uri: item.image }} style={styles.skinImage} />
                <Text style={styles.skinName} numberOfLines={1}>{item.name}</Text>
              </TouchableOpacity>
            )}
          />
        </>
      )}

      {/* Float Edit Modal */}
      <Modal visible={isModalVisible} transparent={true} animationType="fade">
        <View style={styles.modalBg}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Float Değerini Girin</Text>
            <TextInput
              style={styles.floatInput}
              keyboardType="numeric"
              value={tempFloat}
              onChangeText={setTempFloat}
            />
            <View style={styles.modalBtns}>
              <TouchableOpacity style={styles.mBtnCancel} onPress={() => setModalVisible(false)}>
                <Text style={styles.btnText}>İptal</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.mBtnSave} onPress={saveFloat}>
                <Text style={styles.btnText}>Kaydet</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#1a1a24' },
  title: { color: '#9b59b6', fontSize: 20, fontWeight: 'bold', textAlign: 'center', marginTop: 10 },
  subtitle: { color: '#bdc3c7', fontSize: 11, textAlign: 'center', marginHorizontal: 20, marginBottom: 10 },
  inputArea: { backgroundColor: '#2a2a35', margin: 10, borderRadius: 10, padding: 10 },
  selectedGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center' },
  slotBox: { width: 60, height: 60, backgroundColor: '#111', margin: 4, borderRadius: 5, justifyContent: 'center', alignItems: 'center', position: 'relative' },
  emptySlotTxt: { color: '#444', fontSize: 10 },
  slotImage: { width: 50, height: 35, marginTop: 5 },
  removeBtn: { position: 'absolute', top: -5, right: -5, backgroundColor: '#e74c3c', width: 18, height: 18, borderRadius: 9, justifyContent: 'center', alignItems: 'center', zIndex: 2 },
  removeTxt: { color: '#fff', fontSize: 10, fontWeight: 'bold' },
  floatBtn: { position: 'absolute', bottom: 0, backgroundColor: 'rgba(0,0,0,0.7)', width: '100%', alignItems: 'center' },
  floatTxt: { color: '#2ecc71', fontSize: 9 },
  actionRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 10, paddingHorizontal: 10 },
  counter: { color: '#fff', fontWeight: 'bold' },
  analyzeBtn: { backgroundColor: '#9b59b6', paddingVertical: 8, paddingHorizontal: 15, borderRadius: 5 },
  btnText: { color: '#fff', fontWeight: 'bold', fontSize: 12 },
  
  analysisBox: { flex: 1, margin: 10, padding: 10, backgroundColor: '#2a2a35', borderRadius: 10, borderWidth: 1, borderColor: '#9b59b6' },
  analysisHeader: { flexDirection: 'row', justifyContent: 'space-between', borderBottomWidth: 1, borderBottomColor: '#444', paddingBottom: 10, marginBottom: 10 },
  aText: { color: '#fff', fontSize: 12, fontWeight: 'bold' },
  aSub: { color: '#f39c12', marginBottom: 10, fontWeight: 'bold' },
  outcomesScroll: { flex: 1 },
  outcomeRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#111', padding: 10, borderRadius: 8, marginBottom: 8 },
  outcomeImage: { width: 60, height: 40, marginRight: 10 },
  outcomeInfo: { flex: 1 },
  outcomeName: { color: '#fff', fontSize: 12, fontWeight: 'bold' },
  outcomeDetails: { color: '#bdc3c7', fontSize: 10 },
  outcomeStats: { alignItems: 'flex-end' },
  chanceTxt: { color: '#f1c40f', fontWeight: 'bold', fontSize: 12 },
  profitTxt: { fontWeight: 'bold', fontSize: 12 },
  
  searchInput: { backgroundColor: '#2a2a35', color: '#fff', marginHorizontal: 10, marginBottom: 5, padding: 10, borderRadius: 5 },
  skinList: { paddingHorizontal: 5, paddingBottom: 20 },
  skinCard: { flex: 1, backgroundColor: '#2a2a35', margin: 5, padding: 8, alignItems: 'center', borderRadius: 5, maxWidth: '30%' },
  skinImage: { width: 60, height: 45 },
  skinName: { color: '#fff', fontSize: 9, textAlign: 'center', marginTop: 5 },
  
  modalBg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'center', alignItems: 'center' },
  modalContent: { backgroundColor: '#2a2a35', padding: 20, borderRadius: 10, width: '80%' },
  modalTitle: { color: '#fff', fontSize: 16, fontWeight: 'bold', marginBottom: 15, textAlign: 'center' },
  floatInput: { backgroundColor: '#111', color: '#fff', padding: 10, borderRadius: 5, fontSize: 16, textAlign: 'center', marginBottom: 20 },
  modalBtns: { flexDirection: 'row', justifyContent: 'space-between' },
  mBtnCancel: { backgroundColor: '#e74c3c', padding: 10, borderRadius: 5, flex: 1, marginRight: 5, alignItems: 'center' },
  mBtnSave: { backgroundColor: '#2ecc71', padding: 10, borderRadius: 5, flex: 1, marginLeft: 5, alignItems: 'center' }
});
