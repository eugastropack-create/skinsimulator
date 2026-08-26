import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text, View, TouchableOpacity, SafeAreaView, FlatList, Image, ActivityIndicator, TextInput, Alert } from 'react-native';
import { useState, useEffect } from 'react';

import CaseOpening from './src/CaseOpening';
import ArmoryOpening from './src/ArmoryOpening';
import TradeUpScreen from './src/TradeUpScreen';
import { fetchCrates } from './src/api';
import { fetchLivePrices, calculateCaseStats, calculateArmoryStats } from './src/prices';
import { ACTIVE_ARMORY_COLLECTION_NAMES } from './src/armoryData';

export default function App() {
  const [tab, setTab] = useState('cases');
  const [gameMode, setGameMode] = useState('wallet'); 
  const [searchQuery, setSearchQuery] = useState('');
  
  const [balance, setBalance] = useState(150.00);
  const [stars, setStars] = useState(0);
  const [inventory, setInventory] = useState([]);

  const [crates, setCrates] = useState([]);
  const [collections, setCollections] = useState([]);
  const [allCollectionsRaw, setAllCollectionsRaw] = useState([]);
  const [priceMap, setPriceMap] = useState(null);
  const [loadingData, setLoadingData] = useState(true);
  const [selectedCrate, setSelectedCrate] = useState(null);
  const [selectedCollection, setSelectedCollection] = useState(null);

  useEffect(() => {
    const loadAllData = async () => {
      try {
        // Kasaları, koleksiyonları ve canlı fiyatları PARALEL çek
        const [cratesData, collectionsData, livePrices] = await Promise.all([
          fetchCrates(),
          fetch('https://raw.githubusercontent.com/ByMykel/CSGO-API/main/public/api/en/collections.json').then(r => r.json()),
          fetchLivePrices() // null dönerse tüm ekranlar otomatik simülasyon moduna düşer
        ]);

        setPriceMap(livePrices);
        setCrates(cratesData.map(c => ({ ...c, ...calculateCaseStats(c, livePrices) })));

        // API'den gelen geçerli koleksiyonları filtrele
        const validCollections = collectionsData.filter(c => c.contains && c.contains.length > 0);

        // Trade-Up ekranı ÇIKTI HAVUZUNU eşyanın gerçek koleksiyonuna göre belirleyebilsin
        // diye TÜM koleksiyonları (Armory'de aktif olsun olmasın) ayrıca saklıyoruz.
        setAllCollectionsRaw(validCollections);

        // Armory sekmesinde ise SADECE Valve'in şu an gerçekten aktif olan Armory
        // kataloğunu gösteriyoruz (onlarca eski koleksiyon değil).
        let activeArmory = validCollections.filter(c =>
          ACTIVE_ARMORY_COLLECTION_NAMES.some(name => (c.name || '').toLowerCase().includes(name))
        );
        if (activeArmory.length === 0) {
          // Yedek: isim eşleşmesi tutmazsa (liste güncellenmemiş/API değişmiş olabilir)
          // boş ekran yerine tüm koleksiyonları göster.
          console.log('⚠️ Aktif Armory koleksiyonları isimle eşleşmedi, tüm koleksiyonlar gösteriliyor (yedek mod).');
          activeArmory = validCollections;
        }
        setCollections(activeArmory.map(c => ({ ...c, ...calculateArmoryStats(c, livePrices) })));
      } catch (e) { 
        console.log('Veri yükleme hatası:', e); 
      } finally { 
        setLoadingData(false); 
      }
    };
    loadAllData();
  }, []);

  const buyArmoryPass = () => {
    if (balance >= 16.00) {
      setBalance(prev => prev - 16.00);
      setStars(prev => prev + 40);
    } else {
      Alert.alert('Bakiye Yetersiz', 'Armory Pass satın almak için $16.00 bakiyeniz olmalı.');
    }
  };

  const clearInventory = () => {
    Alert.alert('Envanteri Sıfırla', 'Tüm eşyaların silinecek. Emin misin?', [
      { text: 'İptal', style: 'cancel' },
      { text: 'Evet, Sıfırla', onPress: () => setInventory([]) }
    ]);
  };

  const filteredCrates = crates.filter(c => c.name.toLowerCase().includes(searchQuery.toLowerCase()));
  const filteredCollections = collections.filter(c => c.name.toLowerCase().includes(searchQuery.toLowerCase()));

  return (
    <SafeAreaView style={s.container}>
      <StatusBar style="light" />

      {/* Modern Sağ Üst Menü Düzenlemesi */}
      <View style={s.header}>
        <View>
          <Text style={s.logo}>CS2<Text style={{color: '#f39c12'}}>SIM</Text></Text>
          {!loadingData && (
            <Text style={s.priceSourceTxt}>{priceMap ? '🟢 Canlı Fiyatlar' : '🟡 Simüle Fiyatlar'}</Text>
          )}
        </View>
        
        <View style={s.headerRight}>
          <TouchableOpacity style={s.modeToggle} onPress={() => setGameMode(m => m === 'wallet' ? 'unlimited' : 'wallet')}>
            <Text style={s.modeToggleTxt}>{gameMode === 'wallet' ? '💼 Cüzdan Modu' : '♾️ Sınırsız Mod'}</Text>
          </TouchableOpacity>
          
          {gameMode === 'wallet' ? (
            <View style={s.statsContainer}>
              <View style={s.statBadge}>
                <Text style={s.statText}>💰 ${balance.toFixed(2)}</Text>
              </View>
              <View style={s.statBadge}>
                <Text style={s.statText}>⭐ {stars}</Text>
              </View>
              <TouchableOpacity style={s.buyPassBtn} onPress={buyArmoryPass}>
                <Text style={s.buyPassTxt}>🎟️ +40 Yıldız - $16.00</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={s.unlimitedBadge}><Text style={s.unlimitedTxt}>Sınırsız Bakiye Aktif</Text></View>
          )}
        </View>
      </View>

      <View style={s.tabRow}>
        {[{ key: 'cases', label: 'Kasalar' }, { key: 'armory', label: 'Armory' }, { key: 'tradeup', label: 'Trade-Up' }, { key: 'inventory', label: `Envanter (${inventory.length})` }].map(t => (
          <TouchableOpacity key={t.key} style={[s.tabBtn, tab === t.key && s.tabBtnActive]} onPress={() => { setTab(t.key); setSelectedCrate(null); setSelectedCollection(null); setSearchQuery(''); }}>
            <Text style={[s.tabTxt, tab === t.key && s.tabTxtActive]}>{t.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={s.content}>
        {tab === 'cases' && (
          selectedCrate ? (
            <CaseOpening crate={selectedCrate} onBack={() => setSelectedCrate(null)} balance={balance} setBalance={setBalance} inventory={inventory} setInventory={setInventory} gameMode={gameMode} priceMap={priceMap} />
          ) : (
            <View style={{flex:1}}>
              <TextInput style={s.searchBar} placeholder="Kasa Ara..." placeholderTextColor="#7f8c8d" value={searchQuery} onChangeText={setSearchQuery} />
              {loadingData ? <ActivityIndicator size="large" color="#f39c12" style={{marginTop: 50}}/> : (
                <FlatList data={filteredCrates} keyExtractor={i => i.id} numColumns={2} contentContainerStyle={s.listContainer} renderItem={({ item }) => (
                  <TouchableOpacity style={s.card} onPress={() => setSelectedCrate(item)}>
                    <Image source={{ uri: item.image }} style={s.cardImg} resizeMode="contain" />
                    <Text style={s.cardName} numberOfLines={2}>{item.name}</Text>
                    {item.expectedReturn != null && (
                      <View style={s.evRow}>
                        <Text style={s.evText}>EV ${item.expectedReturn.toFixed(2)}</Text>
                        <Text style={[s.roiText, { color: item.roi >= 100 ? '#2ecc71' : '#e74c3c' }]}>%{item.roi.toFixed(0)}</Text>
                      </View>
                    )}
                  </TouchableOpacity>
                )} />
              )}
            </View>
          )
        )}

        {tab === 'armory' && (
          selectedCollection ? (
            <ArmoryOpening collection={selectedCollection} onBack={() => setSelectedCollection(null)} balance={balance} setBalance={setBalance} stars={stars} setStars={setStars} inventory={inventory} setInventory={setInventory} gameMode={gameMode} priceMap={priceMap} />
          ) : (
            <View style={{flex:1}}>
              <TextInput style={s.searchBar} placeholder="Koleksiyon Ara..." placeholderTextColor="#7f8c8d" value={searchQuery} onChangeText={setSearchQuery} />
              {loadingData ? <ActivityIndicator size="large" color="#f39c12" style={{marginTop: 50}}/> : (
                <FlatList data={filteredCollections} keyExtractor={i => i.id} numColumns={2} contentContainerStyle={s.listContainer} renderItem={({ item }) => (
                  <TouchableOpacity style={s.card} onPress={() => setSelectedCollection(item)}>
                    <Image source={{ uri: item.image }} style={s.cardImg} resizeMode="contain" />
                    <Text style={s.cardName} numberOfLines={2}>{item.name}</Text>
                    {item.expectedReturn != null && (
                      <View style={s.evRow}>
                        <Text style={s.evText}>EV ${item.expectedReturn.toFixed(2)}</Text>
                        <Text style={[s.roiText, { color: item.roi >= 100 ? '#2ecc71' : '#e74c3c' }]}>%{item.roi.toFixed(0)}</Text>
                      </View>
                    )}
                  </TouchableOpacity>
                )} />
              )}
            </View>
          )
        )}
        
        {tab === 'tradeup' && <TradeUpScreen inventory={inventory} setInventory={setInventory} balance={balance} setBalance={setBalance} gameMode={gameMode} priceMap={priceMap} allCollections={allCollectionsRaw} />}
        
        {tab === 'inventory' && (
          <View style={{flex: 1}}>
            <TouchableOpacity style={s.clearInvBtn} onPress={clearInventory}>
              <Text style={s.clearInvTxt}>🗑 Envanteri Sıfırla</Text>
            </TouchableOpacity>
            <FlatList data={[...inventory].reverse()} keyExtractor={i => i.uid} numColumns={3} contentContainerStyle={s.listContainer} 
              ListEmptyComponent={<Text style={{ color: '#7f8c8d', textAlign: 'center', marginTop: 40 }}>Envanterin boş.</Text>}
              renderItem={({ item }) => (
              <View style={[s.invCard, { borderBottomColor: item.displayColor }]}>
                {item.isStatTrak && <Text style={s.stTag}>ST™</Text>}
                <Text style={s.priceTag}>${item.price?.toFixed(2)}</Text>
                
                {/* Eşya Kaynağı Etiketi */}
                <View style={s.sourceTag}><Text style={s.sourceTxt}>{item.source}</Text></View>
                
                <Image source={{ uri: item.image }} style={s.invImg} resizeMode="contain" />
                <Text style={s.invName} numberOfLines={2}>{item.name}</Text>
                <Text style={s.invWear}>{item.wear}</Text>
              </View>
            )} />
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#121216', paddingTop: 40 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', paddingHorizontal: 15, paddingBottom: 15, borderBottomWidth: 1, borderBottomColor: '#1f1f27' },
  logo: { color: '#fff', fontSize: 24, fontWeight: '900', letterSpacing: 1, marginTop: 10 },
  priceSourceTxt: { color: '#7f8c8d', fontSize: 9, fontWeight: '600', marginTop: 2 },
  headerRight: { alignItems: 'flex-end', gap: 8 },
  modeToggle: { backgroundColor: '#2a2a35', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 6 },
  modeToggleTxt: { color: '#f39c12', fontSize: 11, fontWeight: 'bold' },
  statsContainer: { alignItems: 'flex-end', gap: 6 },
  statBadge: { backgroundColor: '#1a1a24', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6, borderWidth: 1, borderColor: '#2a2a35' },
  statText: { color: '#fff', fontSize: 13, fontWeight: 'bold' },
  buyPassBtn: { backgroundColor: '#3498db', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 6 },
  buyPassTxt: { color: '#fff', fontSize: 11, fontWeight: 'bold' },
  unlimitedBadge: { backgroundColor: 'rgba(46, 204, 113, 0.2)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 6, borderWidth: 1, borderColor: '#2ecc71', marginTop: 10 },
  unlimitedTxt: { color: '#2ecc71', fontWeight: 'bold', fontSize: 12 },
  tabRow: { flexDirection: 'row', justifyContent: 'space-around', backgroundColor: '#17171e', paddingVertical: 5, borderBottomWidth: 1, borderBottomColor: '#1f1f27' },
  tabBtn: { paddingVertical: 12, paddingHorizontal: 15 },
  tabBtnActive: { borderBottomWidth: 2, borderBottomColor: '#f39c12' },
  tabTxt: { color: '#7f8c8d', fontSize: 14, fontWeight: '600' },
  tabTxtActive: { color: '#fff' },
  searchBar: { backgroundColor: '#1a1a24', color: '#fff', margin: 10, padding: 12, borderRadius: 8, borderWidth: 1, borderColor: '#2a2a35' },
  clearInvBtn: { backgroundColor: '#e74c3c', margin: 10, padding: 12, borderRadius: 8, alignItems: 'center' },
  clearInvTxt: { color: '#fff', fontWeight: 'bold' },
  content: { flex: 1 },
  listContainer: { padding: 8 },
  card: { flex: 1, backgroundColor: '#1a1a24', margin: 5, borderRadius: 10, padding: 12, alignItems: 'center', borderWidth: 1, borderColor: '#2a2a35', maxWidth: '48%' },
  cardImg: { width: 90, height: 90, marginBottom: 8 },
  cardName: { color: '#ddd', textAlign: 'center', fontSize: 11, fontWeight: '600' },
  evRow: { flexDirection: 'row', gap: 6, marginTop: 6, alignItems: 'center' },
  evText: { color: '#3498db', fontSize: 9, fontWeight: 'bold' },
  roiText: { fontSize: 9, fontWeight: 'bold' },
  invCard: { flex: 1, backgroundColor: '#1a1a24', margin: 4, borderRadius: 8, padding: 8, alignItems: 'center', maxWidth: '31%', borderBottomWidth: 3, position: 'relative' },
  invImg: { width: 60, height: 50, marginTop: 16 },
  invName: { color: '#ccc', textAlign: 'center', fontSize: 9, marginTop: 4 },
  invWear: { color: '#7f8c8d', fontSize: 8, marginTop: 2 },
  stTag: { position: 'absolute', top: 4, left: 4, color: '#e67e22', fontSize: 8, fontWeight: 'bold' },
  priceTag: { position: 'absolute', top: 4, right: 4, color: '#2ecc71', fontSize: 9, fontWeight: 'bold' },
  sourceTag: { position: 'absolute', bottom: 4, right: 4, backgroundColor: '#111', paddingHorizontal: 4, borderRadius: 4 },
  sourceTxt: { color: '#aaa', fontSize: 7, fontWeight: 'bold' }
});