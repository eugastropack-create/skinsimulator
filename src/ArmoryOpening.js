import React, { useState, useRef, useEffect } from 'react';
import { StyleSheet, Text, View, Image, TouchableOpacity, SafeAreaView, Animated, ScrollView, Platform } from 'react-native';
import { generateFloat, getWearFromFloat, formatSignedMoney, generatePattern } from './utils';
import { getRealisticPrice, getCharmPrice, getStickerPrice, CHARM_RARITY_ODDS, CHARM_CAPSULE_PRICE, CHARM_STAR_COST, STICKER_CAPSULE_PRICE, STICKER_STAR_COST } from './prices';
import { InlineContentsPanel } from './components/ContentsModal';
import { useI18n } from './i18n';
import { C, shadow, rarityGlowStyle } from './theme';

// Gerçekçi CS2 Koleksiyon Drop Oranları (silah koleksiyonları için)
const COLLECTION_ODDS = [
  { chance: 79.92, name: 'Consumer Grade', color: '#b0c3d9' },
  { chance: 15.98, name: 'Industrial Grade', color: '#5e98d9' },
  { chance: 3.20, name: 'Mil-Spec Grade', color: '#4b69ff' },
  { chance: 0.64, name: 'Restricted', color: '#8847ff' },
  { chance: 0.20, name: 'Classified', color: '#d32ce6' },
  { chance: 0.06, name: 'Covert', color: '#eb4b4b' }
];

const STAR_VALUE_USD = 0.40; // Armory Pass: 40 yıldız = $16.00 -> yıldız başına $0.40
// GERÇEK CS2 KURALI: Bu kart, oyundaki "Limited Edition Item" mekaniğine dayanıyor —
// Valve'de gerçekten 25 yıldız karşılığında garantili, tek seferlik özel bir silah
// basılabiliyor. 5 yıldız gibi düşük bir maliyet, mock fiyatlandırmada bir Covert
// AK-47'nin ($36-60) yanında %1800'ü aşan gerçekçi olmayan bir ROI üretiyordu.
const SPECIAL_ITEM_STAR_COST = 25;
const USE_NATIVE_DRIVER = Platform.OS !== 'web';

// ÇOKLU AÇILIŞ SONUÇ KARTI: her kart kendi mount anında bağımsız pop-in
// animasyonuna başlar; `delay` ile hafif kademelendirilerek "birden pat"
// yerine şık bir art arda beliriş sağlanır.
function RevealCard({ item, delay = 0, isCharm }) {
  const anim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const t = setTimeout(() => {
      Animated.spring(anim, { toValue: 1, friction: 5, tension: 90, useNativeDriver: USE_NATIVE_DRIVER }).start();
    }, delay);
    return () => clearTimeout(t);
  }, []);
  return (
    <Animated.View style={[batchStyles.card, { borderBottomColor: item.displayColor, opacity: anim, transform: [{ scale: anim }] }]}>
      <View pointerEvents="none" style={rarityGlowStyle(item.displayColor, { height: '46%', strength: 0.55 })} />
      <Image source={{ uri: item.image }} style={batchStyles.img} resizeMode="contain" />
      <Text style={batchStyles.price}>${item.price.toFixed(2)}</Text>
      {!isCharm && <Text style={batchStyles.wear} numberOfLines={1}>{item.wear}</Text>}
    </Animated.View>
  );
}

const batchStyles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 10, width: '100%' },
  card: { width: 80, backgroundColor: C.surface, borderRadius: 12, borderBottomWidth: 3, alignItems: 'center', padding: 7, position: 'relative', overflow: 'hidden', ...shadow.card },
  img: { width: 62, height: 48, marginTop: 4 },
  price: { color: C.success, fontSize: 10, fontWeight: '800', marginTop: 4 },
  wear: { color: C.textDim, fontSize: 8, marginTop: 2 }
});

export default function ArmoryOpening({ collection, onBack, balance, setBalance, stars, setStars, inventory, setInventory, gameMode, priceMap }) {
  const { t } = useI18n();
  const [opening, setOpening] = useState(false);
  const [wonItem, setWonItem] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [batch, setBatch] = useState(null); // { items, count, starsSpent, totalWon }

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.5)).current;

  const isCharm = !!collection.isCharmCollection;
  const isSticker = !!collection.isStickerCapsule;
  const isSpecialItem = !!collection.isSpecialItem;
  // Charm ve Sticker kapsülleri AYNI 4 kademeli oran tablosunu kullanır.
  const isCapsule = isCharm || isSticker;
  const ODDS_TABLE = isCapsule ? CHARM_RARITY_ODDS : COLLECTION_ODDS;
  // Gerçek CS2: charm kapsülü 3 yıldız, silah koleksiyonu 4 yıldız, özel eşya 25 yıldız
  const ARMORY_PRICE = isSpecialItem ? SPECIAL_ITEM_STAR_COST : isSticker ? STICKER_STAR_COST : isCharm ? CHARM_STAR_COST : 4;
  const ARMORY_PRICE_USD = isSpecialItem ? SPECIAL_ITEM_STAR_COST * STAR_VALUE_USD : isSticker ? STICKER_CAPSULE_PRICE : isCharm ? CHARM_CAPSULE_PRICE : 1.60;
  // İçerik önizleme paneline hangi oran tablosunu kullanacağını söyler.
  const contentsKind = isSpecialItem ? 'armory' : isSticker ? 'sticker' : isCharm ? 'charm' : 'armory';

  // BELLEK SIZINTISI DÜZELTMESİ: unmount sonrası ateşlenebilecek setTimeout'ları izleyip temizliyoruz.
  const revealTimeoutRef = useRef(null);
  const isMountedRef = useRef(true);
  useEffect(() => {
    return () => {
      isMountedRef.current = false;
      if (revealTimeoutRef.current) clearTimeout(revealTimeoutRef.current);
    };
  }, []);

  // Tek bir eşya/charm/AK-47 basımı için BAĞIMSIZ bir "rulet" — çoklu açılışta
  // (openMultipleArmory) her tekrar için de aynı fonksiyon kullanılır, böylece
  // mantık (drop rate + eşya seçimi) tekli ile çoklu arasında BİREBİR aynı kalır.
  const rollOneArmoryResult = () => {
    if (isSpecialItem) {
      // LIMITED EDITION ITEM BASIMI: kademeli nadirlik çekilişi YOK — her zaman
      // AYNI özel eşyayı (Desert Eagle | Heat Treated) basar, sadece float
      // (Factory New - Battle-Scarred arası, ağırlıklı dağılımla) ve StatTrak
      // ihtimali rastgeledir. "Basım" mekaniği bu yüzden diğer koleksiyon
      // çekilişlerinden farklı: burada şans sadece FİYATI etkiler, EŞYAYI değil.
      const item = collection.specialItem;
      const isStatTrak = Math.random() < 0.10;
      const floatVal = generateFloat(item.min_float ?? 0.00, item.max_float ?? 1.00);
      const wear = getWearFromFloat(floatVal);
      // Fiyat, eşyanın KENDİ nadirliğinden hesaplanır (Heat Treated = Classified);
      // burada sabit 'Covert' kullanmak fiyatı yapay olarak şişiriyordu.
      const price = getRealisticPrice(priceMap, item, floatVal, isStatTrak, item.rarity?.name || 'Classified');
      return { ...item, isStatTrak, displayColor: item.rarity?.color || '#d32ce6', uid: Date.now().toString() + Math.random().toString(36).slice(2), float: floatVal, wear, pattern: generatePattern(), price, source: '🔥 Limited Edition', acquiredAt: Date.now() };
    }

    const roll = Math.random() * 100;
    let cumulative = 0; let selectedRarity = ODDS_TABLE[0];
    for (let i = 0; i < ODDS_TABLE.length; i++) {
      cumulative += ODDS_TABLE[i].chance;
      if (roll <= cumulative) { selectedRarity = ODDS_TABLE[i]; break; }
    }
    let possibleItems = collection.contains.filter(item => item.rarity?.name?.toLowerCase() === selectedRarity.name.toLowerCase());
    if (possibleItems.length === 0) possibleItems = collection.contains;
    const finalItem = possibleItems[Math.floor(Math.random() * possibleItems.length)];

    // Charm ve Sticker'ların float/wear'ı YOKTUR — sabit kozmetik eşyalardır.
    if (isSticker) {
      const price = getStickerPrice(priceMap, finalItem);
      return { ...finalItem, displayColor: finalItem.rarity?.color || '#4b69ff', uid: Date.now().toString() + Math.random().toString(36).slice(2), price, isSticker: true, source: '🏷️ Sticker', acquiredAt: Date.now() };
    }
    if (isCharm) {
      const price = getCharmPrice(priceMap, finalItem);
      return { ...finalItem, displayColor: finalItem.rarity?.color || '#4b69ff', uid: Date.now().toString() + Math.random().toString(36).slice(2), price, isCharm: true, source: '⭐ Armory', acquiredAt: Date.now() };
    }
    const floatVal = generateFloat(finalItem.min_float ?? 0.00, finalItem.max_float ?? 1.00);
    const wear = getWearFromFloat(floatVal);
    const price = getRealisticPrice(priceMap, finalItem, floatVal, false, finalItem.rarity?.name || 'Consumer Grade');
    return { ...finalItem, displayColor: finalItem.rarity?.color || '#b0c3d9', uid: Date.now().toString() + Math.random().toString(36).slice(2), float: floatVal, wear, pattern: generatePattern(), price, source: '⭐ Armory', acquiredAt: Date.now() };
  };

  const openArmory = () => {
    if (gameMode === 'wallet' && stars < ARMORY_PRICE) { setErrorMsg(t('armory.insufficientStars', { n: ARMORY_PRICE })); return; }

    setErrorMsg('');
    if (gameMode === 'wallet') setStars(prev => prev - ARMORY_PRICE);
    setOpening(true); setWonItem(null); setBatch(null);
    fadeAnim.setValue(0); scaleAnim.setValue(0.5);

    if (revealTimeoutRef.current) clearTimeout(revealTimeoutRef.current);
    revealTimeoutRef.current = setTimeout(() => {
      if (!isMountedRef.current) return;
      const itemToSave = rollOneArmoryResult();
      setWonItem(itemToSave);
      setOpening(false);

      Animated.parallel([
        Animated.timing(fadeAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
        Animated.spring(scaleAnim, { toValue: 1, friction: 4, tension: 40, useNativeDriver: true })
      ]).start();
      revealTimeoutRef.current = null;
    }, 1500);
  };

  // ÇOKLU CHARM/KOLEKSİYON AÇMA: "5'li Aç" — her tekrar rollOneArmoryResult()
  // ile TAMAMEN BAĞIMSIZ hesaplanır (tekli açılışla birebir aynı olasılık
  // mantığı), sonuçlar kademeli pop-in ile beliriyor.
  const openMultipleArmory = (count) => {
    const totalStars = ARMORY_PRICE * count;
    if (gameMode === 'wallet' && stars < totalStars) {
      setErrorMsg(t('armory.insufficientStars', { n: totalStars }));
      return;
    }
    setErrorMsg('');
    if (gameMode === 'wallet') setStars(prev => prev - totalStars);
    setWonItem(null); setOpening(false);

    const results = Array.from({ length: count }, () => rollOneArmoryResult());
    const totalWon = results.reduce((acc, r) => acc + r.price, 0);
    setBatch({ items: results, count, starsSpent: totalStars, totalWon });
  };

  const closeBatch = () => setBatch(null);
  const keepAllBatch = () => { setInventory(prev => [...prev, ...batch.items]); setBatch(null); };
  const sellAllBatch = () => { if (gameMode === 'wallet') setBalance(prev => prev + batch.totalWon); setBatch(null); };

  const sellArmoryItem = () => {
    if (gameMode === 'wallet') setBalance(prev => prev + wonItem.price);
    setWonItem(null);
  };

  const keepArmoryItem = () => {
    setInventory(prev => [...prev, wonItem]);
    setWonItem(null);
  };

  // ÖZEL AK-47 İÇİN KÂR/ZARAR (%ROI): basım maliyeti ($ olarak) ile basılan
  // eşyanın anlık piyasa değerini karşılaştırır.
  const akRoiPct = isSpecialItem && wonItem ? ((wonItem.price / ARMORY_PRICE_USD) - 1) * 100 : null;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={onBack}><Text style={styles.backText}>{t('common.back')}</Text></TouchableOpacity>
        {gameMode === 'wallet' ? <Text style={styles.balanceText}>⭐ {stars}</Text> : <Text style={styles.unlimitedText}>{t('common.unlimitedMode')}</Text>}
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.imageFrame}>
          <Image source={{ uri: collection.image }} style={styles.crateImage} resizeMode="contain" />
        </View>
        <Text style={styles.crateName}>{collection.name}</Text>
        {isCharm && <Text style={styles.charmTag}>{t('armory.charmCapsule')}</Text>}
        {isSticker && <Text style={styles.charmTag}>{t('armory.stickerCapsule')}</Text>}
        {isSpecialItem && <Text style={styles.akTag}>{t('armory.limitedTag')}</Text>}

        {isSpecialItem ? (
          // LIMITED EDITION ITEM: kademeli nadirlik çekilişi olmadığı için normal ROI
          // paneli yerine maliyet + float aralığı + eşyanın kendi nadirliğini gösteriyoruz.
          <View style={styles.roiPanel}>
            <View style={styles.roiBox}>
              <Text style={styles.roiLbl}>{t('armory.mintCost')}</Text>
              <Text style={styles.roiVal}>{ARMORY_PRICE}⭐ (${ARMORY_PRICE_USD.toFixed(2)})</Text>
            </View>
            <View style={styles.roiBox}>
              <Text style={styles.roiLbl}>{t('armory.floatRange')}</Text>
              <Text style={styles.roiVal}>{(collection.specialItem?.min_float ?? 0).toFixed(2)}–{(collection.specialItem?.max_float ?? 1).toFixed(2)}</Text>
            </View>
            <View style={styles.roiBox}>
              <Text style={styles.roiLbl}>{t('armory.rarity')}</Text>
              <Text style={[styles.roiVal, { color: collection.specialItem?.rarity?.color || C.text }]}>{collection.specialItem?.rarity?.name || 'Classified'}</Text>
            </View>
          </View>
        ) : collection.expectedReturn != null && (
          <View style={styles.roiPanel}>
            <View style={styles.roiBox}>
              <Text style={styles.roiLbl}>{t('common.expectedValue')}</Text>
              <Text style={styles.roiVal}>${collection.expectedReturn.toFixed(2)}</Text>
            </View>
            <View style={styles.roiBox}>
              <Text style={styles.roiLbl}>{t('common.roi')}</Text>
              <Text style={[styles.roiVal, { color: collection.roi >= 100 ? C.success : C.danger }]}>%{collection.roi.toFixed(1)}</Text>
            </View>
            <View style={styles.roiBox}>
              <Text style={styles.roiLbl}>{t('common.maxWin')}</Text>
              <Text style={[styles.roiVal, { color: C.gold }]}>${collection.maxProfit.toFixed(2)}</Text>
            </View>
          </View>
        )}

        {errorMsg !== '' && <Text style={styles.errorText}>{errorMsg}</Text>}

        {opening && <View style={styles.openingContainer}><Text style={styles.pulseText}>{isSpecialItem ? t('armory.minting') : t('armory.extracting')}</Text></View>}

        {wonItem && !opening && (
          <Animated.View style={[styles.wonContainer, { shadowColor: wonItem.displayColor, opacity: fadeAnim, transform: [{ scale: scaleAnim }] }]}>
            {/* NADIRLIK ISIGI (CS2 drop efekti): kartin alt kismindan yukari
                dogru sonumlenerek cikar - kasa/terminal/kapsul ekranlariyla ayni. */}
            <View pointerEvents="none" style={rarityGlowStyle(wonItem.displayColor, { height: '32%', strength: 0.9 })} />
            <Text style={styles.wonTitle}>{isSpecialItem ? t('armory.mintedTitle') : isSticker ? t('armory.stickerTitle') : isCharm ? t('armory.charmTitle') : t('armory.itemTitle')}</Text>
            <Text style={styles.priceTag}>${wonItem.price.toFixed(2)}</Text>
            <View style={styles.wonImageFrame}>
              <Image source={{ uri: wonItem.image }} style={styles.wonImage} resizeMode="contain" />
            </View>
            <Text style={[styles.wonItemName, { color: wonItem.displayColor }]}>{wonItem.name}</Text>
            {!isCapsule && <Text style={styles.wearText}>{wonItem.wear} ({wonItem.float.toFixed(4)})</Text>}

            {isSpecialItem && akRoiPct != null && (
              <View style={styles.akRoiPanel}>
                <View style={styles.akRoiRow}>
                  <Text style={styles.akRoiLbl}>{t('armory.cost')}</Text>
                  <Text style={styles.akRoiVal}>${ARMORY_PRICE_USD.toFixed(2)}</Text>
                </View>
                <View style={styles.akRoiRow}>
                  <Text style={styles.akRoiLbl}>{t('armory.marketValue')}</Text>
                  <Text style={styles.akRoiVal}>${wonItem.price.toFixed(2)}</Text>
                </View>
                <View style={[styles.akRoiRow, { borderTopWidth: 1, borderTopColor: C.border, paddingTop: 6, marginTop: 4 }]}>
                  <Text style={styles.akRoiLbl}>{t('armory.profitRoi')}</Text>
                  <Text style={[styles.akRoiVal, { color: akRoiPct >= 0 ? C.success : C.danger, fontSize: 15 }]}>{akRoiPct >= 0 ? '+' : ''}{akRoiPct.toFixed(1)}%</Text>
                </View>
              </View>
            )}

            <View style={styles.actionRow}>
              <TouchableOpacity style={styles.keepBtn} onPress={keepArmoryItem}>
                <Text style={styles.btnTxt}>{t('common.keep')}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.sellBtn} onPress={sellArmoryItem}>
                <Text style={styles.btnTxt}>{t('common.sellNow', { n: wonItem.price.toFixed(2) })}</Text>
              </TouchableOpacity>
            </View>
          </Animated.View>
        )}

        {/* ÇOKLU AÇILIŞ SONUÇLARI (5x Aç) */}
        {batch && (
          <View style={styles.batchContainer}>
            <Text style={styles.batchTitle}>{t('armory.batchDone', { n: batch.count })}</Text>
            <View style={batchStyles.grid}>
              {batch.items.map((it, i) => <RevealCard key={it.uid} item={it} delay={i * 90} isCharm={isCapsule} />)}
            </View>
            <View style={styles.batchSummary}>
              <View style={styles.batchStatBox}><Text style={styles.roiLbl}>{t('common.spent')}</Text><Text style={[styles.roiVal, { color: C.danger }]}>-{batch.starsSpent}⭐</Text></View>
              <View style={styles.batchStatBox}><Text style={styles.roiLbl}>{t('common.won')}</Text><Text style={[styles.roiVal, { color: C.success }]}>${batch.totalWon.toFixed(2)}</Text></View>
              <View style={styles.batchStatBox}><Text style={styles.roiLbl}>{t('common.profit')}</Text><Text style={[styles.roiVal, { color: (batch.totalWon - batch.starsSpent * STAR_VALUE_USD) >= 0 ? C.success : C.danger }]}>{formatSignedMoney(batch.totalWon - batch.starsSpent * STAR_VALUE_USD)}</Text></View>
            </View>
            <View style={styles.actionRow}>
              <TouchableOpacity style={styles.keepBtn} onPress={keepAllBatch}><Text style={styles.btnTxt}>{t('common.keepAll')}</Text></TouchableOpacity>
              <TouchableOpacity style={styles.sellBtn} onPress={sellAllBatch}><Text style={styles.btnTxt}>{t('common.sellAll', { n: batch.totalWon.toFixed(2) })}</Text></TouchableOpacity>
            </View>
            <TouchableOpacity onPress={closeBatch}><Text style={styles.batchCloseTxt}>{t('common.close')}</Text></TouchableOpacity>
          </View>
        )}

        {!opening && !wonItem && !batch && (
          <>
            <TouchableOpacity style={styles.openButton} onPress={openArmory}>
              <Text style={styles.openButtonText}>{isSpecialItem ? t('armory.mint', { n: ARMORY_PRICE }) : t('armory.spendStars', { n: ARMORY_PRICE })}</Text>
            </TouchableOpacity>

            {/* ÇOKLU AÇILIŞ: özel AK-47 basımı için de dahil (defalarca basıp
                float dağılımını görmek isteyebilir), garanti-eşya olduğu için
                de anlamlı. */}
            <Text style={styles.multiLabel}>{t('common.multiOpen')}</Text>
            <View style={styles.multiRow}>
              {[5, 10].map(n => (
                <TouchableOpacity key={n} style={styles.multiBtn} onPress={() => openMultipleArmory(n)}>
                  <Text style={styles.multiBtnTxt}>{t('common.openX', { n })}</Text>
                  <Text style={styles.multiBtnPrice}>{ARMORY_PRICE * n}⭐</Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* İÇERİK ÖNİZLEMESİ: açma butonunun hemen altında, bu koleksiyon/
                kapsülden çıkabilecek TÜM eşyalar fotoğraf + isim + oran + fiyat
                ile listelenir. Koleksiyon, charm, sticker ve özel eşya dahil
                İSTİSNASIZ her Armory kartında çalışır. */}
            <InlineContentsPanel subject={collection} kind={contentsKind} priceMap={priceMap} />
          </>
        )}

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 18, paddingVertical: 12 },
  backBtn: { backgroundColor: C.surface, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999, ...shadow.card },
  backText: { color: C.accentDeep, fontSize: 14, fontWeight: '800' },
  balanceText: { color: C.gold, fontSize: 15, fontWeight: '800' },
  unlimitedText: { color: C.accentDeep, fontSize: 15, fontWeight: '800' },
  content: { alignItems: 'center', padding: 20, paddingBottom: 60 },
  imageFrame: { width: 168, height: 168, alignItems: 'center', justifyContent: 'center', backgroundColor: C.surface, borderRadius: 26, ...shadow.card },
  crateImage: { width: '78%', height: '78%' },
  crateName: { color: C.text, fontSize: 21, fontWeight: '800', marginTop: 16, marginBottom: 6, textAlign: 'center' },
  charmTag: { color: C.accentDeep, fontSize: 11, fontWeight: '800', marginBottom: 12 },
  akTag: { color: C.danger, fontSize: 11, fontWeight: '800', marginBottom: 12, textAlign: 'center' },
  roiPanel: { flexDirection: 'row', backgroundColor: C.surface, borderRadius: 14, paddingVertical: 12, paddingHorizontal: 18, marginTop: 6, marginBottom: 18, gap: 22, ...shadow.card },
  roiBox: { alignItems: 'center' },
  roiLbl: { color: C.textDim, fontSize: 9, fontWeight: '700' },
  roiVal: { color: C.text, fontSize: 14, fontWeight: '800', marginTop: 3 },
  errorText: { color: C.danger, fontSize: 13, fontWeight: '700', marginBottom: 12, backgroundColor: C.dangerSoft, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10 },
  openButton: { backgroundColor: C.accent, paddingVertical: 15, paddingHorizontal: 42, borderRadius: 14, marginTop: 10, marginBottom: 12, ...shadow.card, shadowColor: C.accent, shadowOpacity: 0.4 },
  openButtonText: { color: C.onAccent, fontSize: 16, fontWeight: '800', letterSpacing: 0.5 },
  openingContainer: { alignItems: 'center', marginVertical: 40, paddingHorizontal: 34, paddingVertical: 28, backgroundColor: C.surface, borderRadius: 100, ...shadow.card },
  pulseText: { color: C.accentDeep, fontSize: 17, fontWeight: '800' },
  wonContainer: {
    alignItems: 'center', marginVertical: 12, padding: 28, backgroundColor: C.surface, borderRadius: 22, minWidth: 280, width: '100%', maxWidth: 360, overflow: 'hidden',
    shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.35, shadowRadius: 30, elevation: 16
  },
  wonTitle: { color: C.success, fontSize: 20, fontWeight: '800', marginBottom: 12 },
  priceTag: { position: 'absolute', top: 16, right: 18, color: C.success, fontSize: 18, fontWeight: '800' },
  wonImageFrame: { width: 200, height: 150, alignItems: 'center', justifyContent: 'center' },
  wonImage: { width: '100%', height: '100%' },
  wonItemName: { fontSize: 17, fontWeight: '800', marginTop: 14, textAlign: 'center' },
  wearText: { color: C.textDim, fontSize: 13, marginTop: 6, fontWeight: '600' },
  akRoiPanel: { width: '100%', backgroundColor: C.surfaceAlt, borderRadius: 12, padding: 14, marginTop: 16 },
  akRoiRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 3 },
  akRoiLbl: { color: C.textDim, fontSize: 11, fontWeight: '600' },
  akRoiVal: { color: C.text, fontSize: 12, fontWeight: '800' },
  actionRow: { flexDirection: 'row', gap: 10, marginTop: 18, flexWrap: 'wrap', justifyContent: 'center' },
  sellBtn: { backgroundColor: C.success, paddingHorizontal: 18, paddingVertical: 12, borderRadius: 10 },
  keepBtn: { backgroundColor: C.accent, paddingHorizontal: 18, paddingVertical: 12, borderRadius: 10 },
  btnTxt: { color: C.onAccent, fontWeight: '800', fontSize: 13 },
  multiLabel: { color: C.textDim, fontSize: 11, fontWeight: '700', marginTop: 6, marginBottom: 8 },
  multiRow: { flexDirection: 'row', gap: 10, marginBottom: 10 },
  multiBtn: { backgroundColor: C.surface, paddingVertical: 10, paddingHorizontal: 18, borderRadius: 12, alignItems: 'center', ...shadow.card },
  multiBtnTxt: { color: C.accentDeep, fontSize: 14, fontWeight: '800' },
  multiBtnPrice: { color: C.textDim, fontSize: 11, marginTop: 2, fontWeight: '600' },
  batchContainer: { width: '100%', alignItems: 'center', marginTop: 10 },
  batchTitle: { color: C.text, fontSize: 15, fontWeight: '800', marginBottom: 12 },
  batchSummary: { flexDirection: 'row', backgroundColor: C.surface, borderRadius: 14, padding: 14, justifyContent: 'space-around', width: '100%', marginTop: 18, ...shadow.card },
  batchStatBox: { alignItems: 'center' },
  batchCloseTxt: { color: C.textDim, fontSize: 12, marginTop: 14, textDecorationLine: 'underline' }
});
