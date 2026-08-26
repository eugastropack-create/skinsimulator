import React, { useState, useEffect, useMemo } from 'react';
import { StyleSheet, Text, View, Image, TouchableOpacity, SafeAreaView, FlatList, TextInput, Modal, ActivityIndicator, Alert } from 'react-native';
import Slider from '@react-native-community/slider';
import { getWearFromFloat } from './utils';
import { getRealisticPrice } from './prices';

const NEXT_RARITY_NAME = { 'Consumer Grade': 'Industrial Grade', 'Industrial Grade': 'Mil-Spec Grade', 'Mil-Spec Grade': 'Restricted', 'Restricted': 'Classified', 'Classified': 'Covert' };
const RARITY_LABELS = { 'Consumer Grade': 'Consumer', 'Industrial Grade': 'Industrial', 'Mil-Spec Grade': 'Mil-Spec', 'Restricted': 'Restricted', 'Classified': 'Classified' };

// GİRDİ kuralı: Bıçak, Eldiven, Charm, Sticker VE üst-tier (Covert/Kırmızı, Contraband,
// Rare Special) eşyalar kontrata KONULAMAZ — bunlar zaten trade-up'ın en üst ürünüdür.
const isValidTradeUpInput = (item) => {
  const r = item.rarity?.name || ''; const n = item.name || '';
  if (['Covert', 'Contraband', 'Rare Special'].includes(r)) return false; 
  if (/(Knife|Gloves|Charm|Sticker|Patch|Pin)/i.test(n)) return false;
  return true;
};

// ÇIKTI kuralı: Bıçak/Eldiven/Charm/Sticker sonuç olarak da çıkamaz, ANCAK Covert
// (Kırmızı) burada İZİN VERİLİR — çünkü gerçek CS2'de Classified -> Covert, trade-up'ın
// olabileceği EN ÜST seviyesidir. (Önceki sürümde bu ikisi aynı fonksiyondaydı ve bu da
// Classified eşyalarla sözleşme imzalamayı tamamen imkansız hale getiren bug'a sebep oluyordu.)
const isValidTradeUpOutput = (item) => {
  const n = item.name || '';
  if (/(Knife|Gloves|Charm|Sticker|Patch|Pin)/i.test(n)) return false;
  return true;
};

// Bağımsız ve Kompakt Float Kaydırıcı
function CompactFloatSlider({ value, min, max, onChange }) {
  const wearName = getWearFromFloat(value);
  return (
    <View style={fc.wrapper}>
      <View style={fc.row}>
        <Text style={fc.wearLabel}>{wearName}</Text>
        <TextInput style={fc.input} keyboardType="numeric" value={value.toFixed(4)} onChangeText={t => { const n = parseFloat(t); if(!isNaN(n) && n>=min && n<=max) onChange(n); }} />
      </View>
      <Slider style={{ width: '100%', height: 20 }} minimumValue={min} maximumValue={max} value={value} onValueChange={onChange} minimumTrackTintColor="#f39c12" maximumTrackTintColor="#333" thumbTintColor="#fff" />
    </View>
  );
}

const fc = StyleSheet.create({
  wrapper: { width: '100%', paddingHorizontal: 2, marginTop: 4 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  wearLabel: { color: '#f39c12', fontSize: 8, fontWeight: 'bold' },
  input: { backgroundColor: '#111', color: '#2ecc71', fontSize: 9, paddingVertical: 1, paddingHorizontal: 4, borderRadius: 2, borderWidth: 1, borderColor: '#f39c12', width: 45, textAlign: 'center' }
});

function CompactSlot({ entry, index, onPress, onRemove, onClone, onFloatChange }) {
  if (!entry) {
    return (
      <TouchableOpacity style={slot.empty} onPress={onPress}>
        <Text style={slot.emptyTxt}>+ Ekle</Text>
      </TouchableOpacity>
    );
  }
  const min = entry.skin.min_float ?? 0; const max = entry.skin.max_float ?? 1;
  return (
    <View style={[slot.filled, { borderTopColor: entry.skin.rarity?.color || '#555' }]}>
      <TouchableOpacity style={slot.removeX} onPress={() => onRemove(index)}><Text style={slot.removeTxt}>✕</Text></TouchableOpacity>
      <TouchableOpacity style={slot.cloneBtn} onPress={() => onClone(index)}><Text style={slot.cloneTxt}>Kopyala</Text></TouchableOpacity>
      
      <View style={{flexDirection: 'row', alignItems: 'center', marginTop: 12, marginBottom: 2}}>
        <Image source={{ uri: entry.skin.image }} style={slot.img} resizeMode="contain" />
        <View style={{flex: 1, marginLeft: 4}}>
          <Text style={slot.name} numberOfLines={1}>{entry.skin.name}</Text>
          <Text style={slot.price}>${entry.price.toFixed(2)}</Text>
        </View>
      </View>
      <CompactFloatSlider value={entry.float} min={min} max={max} onChange={v => onFloatChange(index, v)} />
    </View>
  );
}

const slot = StyleSheet.create({
  empty: { width: '48%', height: 80, backgroundColor: '#1e1e2e', borderRadius: 6, borderWidth: 1, borderColor: '#2a2a3e', borderStyle: 'dashed', justifyContent: 'center', alignItems: 'center', marginVertical: 3 },
  emptyTxt: { color: '#555', fontSize: 12, fontWeight: 'bold' },
  filled: { width: '48%', height: 80, backgroundColor: '#1e1e2e', borderRadius: 6, borderTopWidth: 3, paddingHorizontal: 4, marginVertical: 3, position: 'relative' },
  removeX: { position: 'absolute', top: 2, right: 4, zIndex: 2 },
  removeTxt: { color: '#e74c3c', fontSize: 10, fontWeight: 'bold' },
  cloneBtn: { position: 'absolute', top: 2, left: 4, zIndex: 2, backgroundColor: '#3498db', paddingHorizontal: 4, borderRadius: 3 },
  cloneTxt: { color: '#fff', fontSize: 8, fontWeight: 'bold' },
  img: { width: 40, height: 28 },
  name: { color: '#ddd', fontSize: 8, fontWeight: '600' },
  price: { color: '#2ecc71', fontSize: 10, fontWeight: 'bold' }
});

export default function TradeUpScreen({ inventory, setInventory, balance, setBalance, gameMode, priceMap, allCollections }) {
  const [allSkins, setAllSkins] = useState([]);
  const [loading, setLoading] = useState(true);
  const [slots, setSlots] = useState(Array(10).fill(null));
  const [pickerOpen, setPickerOpen] = useState(false);
  const [editingSlot, setEditingSlot] = useState(null);
  const [searchText, setSearchText] = useState('');
  
  const [analysis, setAnalysis] = useState(null);
  const [wonItem, setWonItem] = useState(null); 

  // Eşya adı -> ait olduğu koleksiyon(lar) ters-haritası. Gerçek CS2'de trade-up
  // ÇIKTISI, girdi eşyalarının ait olduğu koleksiyondan gelir (rastgele tüm
  // veritabanından değil!). Bu harita, "10 tane MP5 Piknik koysam bambaşka bir
  // koleksiyondan eşya çıkıyor" bug'ının kökten çözümü için gerekli.
  const skinToCollections = useMemo(() => {
    const map = {};
    (allCollections || []).forEach(col => {
      (col.contains || []).forEach(item => {
        if (!item?.name) return;
        if (!map[item.name]) map[item.name] = [];
        map[item.name].push(col);
      });
    });
    return map;
  }, [allCollections]);

  useEffect(() => {
    fetch('https://raw.githubusercontent.com/ByMykel/CSGO-API/main/public/api/en/skins.json')
      .then(r => r.json())
      .then(data => { setAllSkins(data); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  // OTOMATİK HESAPLAMA (Hesapla butonuna gerek yok)
  useEffect(() => {
    const validSlots = slots.filter(Boolean);
    if (validSlots.length === 0) { setAnalysis(null); return; }
    
    const targetRarity = NEXT_RARITY_NAME[validSlots[0].skin.rarity?.name];
    if (!targetRarity) { setAnalysis(null); return; }

    const avgFloat = validSlots.reduce((a, e) => a + e.float, 0) / validSlots.length;
    // Slotların fiyatları zaten seçim/float değişimi anında hesaplanıp entry.price'ta saklanıyor
    const totalCost = validSlots.reduce((acc, e) => acc + e.price, 0);

    // GERÇEK CS2 KURALI: Çıktı havuzu girdi eşyaların AİT OLDUĞU koleksiyon(lar)dan
    // belirlenir. Her girdi kendi koleksiyonuna "oy" verir; 10 eşya farklı
    // koleksiyonlardan geliyorsa çıktı havuzu bu oranlarla ağırlıklandırılır
    // (tıpkı gerçek oyunda olduğu gibi).
    const collectionVotes = {};   // collectionId -> kaç girdi bu koleksiyondan
    const collectionById = {};
    validSlots.forEach(entry => {
      const cols = skinToCollections[entry.skin.name] || [];
      cols.forEach(col => {
        collectionVotes[col.id] = (collectionVotes[col.id] || 0) + 1;
        collectionById[col.id] = col;
      });
    });

    const buildOutcome = (t) => {
      // Float interpolasyonu: hedef eşyanın KENDİ min/max float aralığı içinde,
      // girdilerin ortalama (0-1) float konumuna karşılık gelen noktayı hesaplar.
      const targetMin = t.min_float ?? 0;
      const targetMax = t.max_float ?? 1;
      const f = parseFloat((targetMin + avgFloat * (targetMax - targetMin)).toFixed(4));
      return { skin: t, outFloat: f, price: getRealisticPrice(priceMap, t, f, false, targetRarity) };
    };

    let possibleOutcomes = [];
    const totalVotes = Object.values(collectionVotes).reduce((a, b) => a + b, 0);

    if (totalVotes > 0) {
      Object.keys(collectionVotes).forEach(colId => {
        const col = collectionById[colId];
        const voteShare = collectionVotes[colId] / totalVotes;
        const eligible = (col.contains || []).filter(s => s.rarity?.name === targetRarity && isValidTradeUpOutput(s));
        if (eligible.length > 0) {
          const perItemChance = (voteShare * 100) / eligible.length;
          eligible.forEach(t => possibleOutcomes.push({ ...buildOutcome(t), chance: perItemChance }));
        }
      });
    }

    // Yedek yol: girdi eşyaların koleksiyonu haritada bulunamazsa (veri eksikse)
    // eski davranışa (genel havuzdan rastgele) düş — site asla boş kalmasın.
    if (possibleOutcomes.length === 0) {
      const targets = allSkins.filter(s => s.rarity?.name === targetRarity && isValidTradeUpOutput(s)).slice(0, 10);
      if (targets.length > 0) {
        targets.forEach(t => possibleOutcomes.push({ ...buildOutcome(t), chance: 100 / targets.length }));
      }
    }

    // Yuvarlama farklarını normalize et (toplam şans tam %100 olsun)
    const totalChance = possibleOutcomes.reduce((a, o) => a + o.chance, 0);
    if (totalChance > 0 && Math.abs(totalChance - 100) > 0.01) {
      possibleOutcomes = possibleOutcomes.map(o => ({ ...o, chance: (o.chance / totalChance) * 100 }));
    }

    const ev = possibleOutcomes.reduce((a, o) => a + o.price * (o.chance / 100), 0);
    const sourceCollectionNames = totalVotes > 0
      ? Object.keys(collectionVotes).map(id => collectionById[id]?.name).filter(Boolean)
      : [];
    setAnalysis({ avgFloat, totalCost, ev, outcomes: possibleOutcomes, sourceCollectionNames });
  }, [slots, allSkins, priceMap, skinToCollections]);

  const lockedRarity = slots.find(s => s !== null)?.skin?.rarity?.name || null;

  const handleSelect = (skin) => {
    const def = skin.min_float ? skin.min_float + 0.05 : 0.15;
    // Fiyat SEÇİM ANINDA bir kez hesaplanıp slotta saklanır — render sırasında tekrar
    // tekrar hesaplanmadığı için diğer slotlar etkilenmez (bkz. handleFloatChange notu).
    const price = getRealisticPrice(priceMap, skin, def, false, skin.rarity?.name);
    const n = [...slots]; n[editingSlot] = { skin, float: def, price };
    setSlots(n); setPickerOpen(false);
  };

  const cloneSlot = (idx) => {
    const item = slots[idx]; if (!item) return;
    const emptyIdx = slots.findIndex(s => s === null);
    if (emptyIdx !== -1) { 
      const n = [...slots]; 
      // DİKKAT: Deep clone yapılarak float bug'ı kesin çözüldü!
      n[emptyIdx] = JSON.parse(JSON.stringify(item)); 
      setSlots(n); 
    }
  };

  const handleFloatChange = (idx, val) => {
    setSlots(prev => {
      const n = [...prev];
      // KÖK NEDEN DÜZELTMESİ: Eskiden fiyat her render'da (yani her slider hareketinde,
      // TÜM slotlar için) yeniden RASTGELE hesaplanıyordu — bu yüzden bir slotu oynatmak
      // diğer tüm slotların görünen fiyatını da değiştiriyordu. Artık SADECE değişen
      // slotun fiyatı, SADECE burada, bir kez yeniden hesaplanıp saklanıyor.
      const newPrice = getRealisticPrice(priceMap, n[idx].skin, val, false, n[idx].skin.rarity?.name);
      n[idx] = { ...n[idx], float: val, price: newPrice };
      return n;
    });
  };

  const executeTradeUp = () => {
    if (slots.filter(Boolean).length !== 10 || !analysis || analysis.outcomes.length === 0) {
      Alert.alert("Hata", "Lütfen aynı nadirlikte 10 adet geçerli eşya ekleyin.");
      return;
    }
    if (gameMode === 'wallet' && balance < analysis.totalCost) {
      Alert.alert("Yetersiz Bakiye", `Bu sözleşme için $${analysis.totalCost.toFixed(2)} gerekiyor, cüzdanında $${balance.toFixed(2)} var.`);
      return;
    }
    if (gameMode === 'wallet') setBalance(prev => prev - analysis.totalCost);
    
    const roll = Math.random() * 100; let cum = 0; let winner = analysis.outcomes[0];
    for (let o of analysis.outcomes) { cum += o.chance; if (roll <= cum) { winner = o; break; } }
    
    setWonItem({ ...winner.skin, float: winner.outFloat, price: winner.price, displayColor: winner.skin.rarity?.color, wear: getWearFromFloat(winner.outFloat), uid: Date.now().toString(), source: '🔄 Trade-Up' });
    setSlots(Array(10).fill(null));
  };

  const sellResult = () => {
    if (gameMode === 'wallet') setBalance(prev => prev + wonItem.price);
    setWonItem(null);
  };

  if (loading) return <View style={{flex: 1, justifyContent: 'center', alignItems: 'center'}}><ActivityIndicator color="#f39c12" /></View>;

  return (
    <SafeAreaView style={ts.container}>
      <View style={ts.headerRow}>
        <Text style={ts.title}>Takas Sözleşmesi</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          {gameMode === 'wallet' ? (
            <Text style={ts.balanceTxt}>💰 ${balance.toFixed(2)}</Text>
          ) : (
            <Text style={ts.unlimitedTxt}>♾️ Sınırsız</Text>
          )}
          <TouchableOpacity style={ts.clearBtn} onPress={() => setSlots(Array(10).fill(null))}><Text style={ts.clearTxt}>🗑 Hepsini Sıfırla</Text></TouchableOpacity>
        </View>
      </View>

      <View style={ts.mainLayout}>
        {/* SOL: DİKEY 10 SLOT (Scroll gerekmez, Grid yapı) */}
        <View style={ts.slotsColumn}>
          <View style={ts.grid}>
            {slots.map((entry, idx) => <CompactSlot key={idx} index={idx} entry={entry} onPress={() => { setEditingSlot(idx); setSearchText(''); setPickerOpen(true); }} onRemove={(i) => { const n = [...slots]; n[i] = null; setSlots(n); }} onClone={cloneSlot} onFloatChange={handleFloatChange} />)}
          </View>
        </View>

        {/* SAĞ: CANLI HESAPLAMA PANELİ */}
        <View style={ts.analysisColumn}>
          <Text style={ts.analTitle}>Canlı Çıktılar</Text>
          {analysis ? (
            <View style={{flex: 1}}>
               <Text style={ts.analSummary}>Maliyet: <Text style={{color:'#e74c3c'}}>${analysis.totalCost.toFixed(2)}</Text></Text>
               <Text style={ts.analSummary}>Beklenen: <Text style={{color:'#2ecc71'}}>${analysis.ev.toFixed(2)}</Text></Text>
               {analysis.sourceCollectionNames?.length > 0 && (
                 <Text style={[ts.analSummary, { color: '#3498db', fontSize: 9 }]} numberOfLines={2}>
                   📦 Kaynak: {analysis.sourceCollectionNames.join(', ')}
                 </Text>
               )}
               <View style={{height: 1, backgroundColor: '#333', marginVertical: 8}} />
               <FlatList data={analysis.outcomes} keyExtractor={(_, i) => i.toString()} renderItem={({item}) => (
                 <View style={ts.outRow}>
                   <Text style={{color: '#fff', fontSize: 9, flex: 1}} numberOfLines={1}>{item.skin.name}</Text>
                   <Text style={{color: '#f1c40f', fontSize: 10, fontWeight: 'bold', width: 30}}>%{(item.chance).toFixed(0)}</Text>
                 </View>
               )}/>
            </View>
          ) : (
            <Text style={{color: '#777', fontSize: 11, textAlign: 'center', marginTop: 30}}>Sonuçları görmek için sözleşmeye eşya ekleyin.</Text>
          )}
        </View>
      </View>

      <View style={ts.footer}>
        <TouchableOpacity style={[ts.tradeBtn, slots.filter(Boolean).length !== 10 && ts.tradeBtnDisabled]} onPress={executeTradeUp} disabled={slots.filter(Boolean).length !== 10}>
          <Text style={ts.tradeBtnTxt}>SÖZLEŞMEYİ İMZALA ({slots.filter(Boolean).length}/10)</Text>
        </TouchableOpacity>
      </View>

      {/* SONUÇ EKRANI (CS2 Tarzı Ortada) */}
      {wonItem && (
        <View style={ts.resultOverlay}>
          <View style={[ts.resultBox, { borderColor: wonItem.displayColor }]}>
            <Text style={{color: '#2ecc71', fontSize: 22, fontWeight: 'bold'}}>Sözleşme Başarılı!</Text>
            <Image source={{ uri: wonItem.image }} style={{width: 200, height: 150, marginVertical: 15}} resizeMode="contain" />
            <Text style={{color: wonItem.displayColor, fontSize: 18, fontWeight: 'bold', textAlign: 'center'}}>{wonItem.name}</Text>
            <Text style={{color: '#fff', fontSize: 14, marginVertical: 8}}>Float: {wonItem.float.toFixed(4)} ({wonItem.wear})</Text>
            <View style={{flexDirection: 'row', gap: 10, marginTop: 15}}>
              <TouchableOpacity style={{backgroundColor: '#3498db', padding: 12, borderRadius: 8}} onPress={() => { setInventory(p => [...p, wonItem]); setWonItem(null); }}><Text style={{color: '#fff', fontWeight: 'bold'}}>Envantere Ekle</Text></TouchableOpacity>
              <TouchableOpacity style={{backgroundColor: '#2ecc71', padding: 12, borderRadius: 8}} onPress={sellResult}><Text style={{color: '#fff', fontWeight: 'bold'}}>Sat (${wonItem.price.toFixed(2)})</Text></TouchableOpacity>
            </View>
          </View>
        </View>
      )}

      {/* GEÇERLİ EŞYA SEÇİCİ */}
      <Modal visible={pickerOpen} animationType="slide">
        <SafeAreaView style={{ flex: 1, backgroundColor: '#0f0f17' }}>
          <View style={{ padding: 15, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderBottomWidth: 1, borderColor: '#333' }}>
            <Text style={{ color: '#fff', fontSize: 16, fontWeight: 'bold' }}>Geçerli Eşya Seç</Text>
            <TouchableOpacity onPress={() => setPickerOpen(false)}><Text style={{ color: '#e74c3c' }}>✕ Kapat</Text></TouchableOpacity>
          </View>
          <TextInput
            style={ts.pickerSearch}
            placeholder="Eşya Ara..."
            placeholderTextColor="#7f8c8d"
            value={searchText}
            onChangeText={setSearchText}
          />
          <FlatList data={allSkins.filter(s => isValidTradeUpInput(s) && (!lockedRarity || s.rarity?.name === lockedRarity) && (searchText.trim() === '' || s.name.toLowerCase().includes(searchText.trim().toLowerCase()))).slice(0, 100)} keyExtractor={i => i.id} numColumns={3} renderItem={({ item }) => (
            <TouchableOpacity style={ts.pickerCard} onPress={() => handleSelect(item)}>
              <Image source={{ uri: item.image }} style={{ width: 60, height: 45 }} resizeMode="contain" />
              <Text style={{ color: '#ddd', fontSize: 9, textAlign: 'center' }}>{item.name}</Text>
              <Text style={{ color: item.rarity?.color, fontSize: 8 }}>{RARITY_LABELS[item.rarity?.name]}</Text>
            </TouchableOpacity>
          )} />
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const ts = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f0f17' },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 10, borderBottomWidth: 1, borderBottomColor: '#222' },
  title: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  clearBtn: { backgroundColor: '#e74c3c', paddingHorizontal: 8, paddingVertical: 6, borderRadius: 6 },
  clearTxt: { color: '#fff', fontSize: 11, fontWeight: 'bold' },
  balanceTxt: { color: '#2ecc71', fontSize: 13, fontWeight: 'bold' },
  unlimitedTxt: { color: '#3498db', fontSize: 13, fontWeight: 'bold' },
  pickerSearch: { backgroundColor: '#1a1a24', color: '#fff', margin: 10, padding: 10, borderRadius: 8, borderWidth: 1, borderColor: '#2a2a35' },
  mainLayout: { flex: 1, flexDirection: 'row', padding: 5 },
  slotsColumn: { flex: 0.65, paddingRight: 5 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  analysisColumn: { flex: 0.35, backgroundColor: '#1a1a24', borderRadius: 8, padding: 8, borderWidth: 1, borderColor: '#2a2a35' },
  analTitle: { color: '#f39c12', fontSize: 13, fontWeight: 'bold', textAlign: 'center', marginBottom: 10 },
  analSummary: { color: '#ccc', fontSize: 11, fontWeight: '600', marginBottom: 4 },
  outRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
  footer: { padding: 10, borderTopWidth: 1, borderTopColor: '#222', paddingBottom: 20 },
  tradeBtn: { backgroundColor: '#f39c12', padding: 15, borderRadius: 10, alignItems: 'center' },
  tradeBtnDisabled: { backgroundColor: '#333' },
  tradeBtnTxt: { color: '#fff', fontSize: 16, fontWeight: 'bold', letterSpacing: 1 },
  pickerCard: { flex: 1, backgroundColor: '#1e1e2e', margin: 4, padding: 8, borderRadius: 8, alignItems: 'center', maxWidth: '31%' },
  resultOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.9)', justifyContent: 'center', alignItems: 'center', zIndex: 100 },
  resultBox: { backgroundColor: '#1a1a24', padding: 25, borderRadius: 15, borderWidth: 3, alignItems: 'center', width: '90%' }
});