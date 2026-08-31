import React, { useState, useRef, useEffect, useMemo } from 'react';
import { StyleSheet, Text, View, Image, TouchableOpacity, SafeAreaView, ScrollView } from 'react-native';
import { formatSignedMoney } from './utils';
import { getStickerPrice, getContainerPrice, getCapsuleTiers, rollTier } from './prices';
import { InlineContentsPanel } from './components/ContentsModal';
import BatchResultPanel from './components/BatchResultPanel';
import { useI18n } from './i18n';
import { C, shadow, rarityGlowStyle, webTransition, hexToRgba, R } from './theme';

// ============================================================
// STICKER KAPSÜLÜ AÇILIŞI — "kâğıt yırtılma / kapsül patlama"
// ============================================================
// ⚠️ BU EKRAN DA BİLEREK ÇARK (SPINNER) KULLANMAZ.
// Gerçek CS2'de bir sticker kapsülü açıldığında çark dönmez: kapsül titrer,
// ortasından YIRTILIR ve iki yarısı savrularak içindeki çıkartmayı ortaya
// çıkarır. Mekanik üç aşamalı kurgulandı:
//   1) SHAKING  → kapsül yerinde titrer (gerilim)
//   2) TEARING  → ortada zikzaklı bir yırtık çizgisi belirir
//   3) BURST    → iki yarı zıt yönlere savrulur + parlama + çıkartma belirir
//
// ⚠️ ANİMASYON SAĞLAMLIĞI: Aşama geçişleri `setTimeout` ile sürülür, `Animated`
// tamamlanma callback'leriyle DEĞİL. Böylece animasyon (composite edilmeyen
// sekmelerde donan requestAnimationFrame yüzünden) hiç oynamasa bile çıkartma
// MUTLAKA ortaya çıkar — kullanıcı asla boş ekranda kilitli kalmaz.
// (bkz. AGENTS.md §3 Test Ortamı Notu)

const SHAKE_MS = 900;     // titreme süresi
const TEAR_MS = 520;      // yırtık çizgisinin belirme süresi
const BURST_MS = 560;     // yarıların savrulma süresi
const SHAKE_STEP_MS = 55; // titreme karesi

const CAPSULE_SIZE = 168;
const HALF = CAPSULE_SIZE / 2;

// Kapsülün YARISINI gösteren pencere. İçindeki görsel tam boyuttadır ve
// `left` ile kaydırılır; `overflow: hidden` sayesinde yalnızca ilgili yarı
// görünür. Bu, tek bir görselden gerçek bir "ikiye ayrılma" efekti üretir.
function CapsuleHalf({ uri, side, burst }) {
  const isLeft = side === 'left';
  return (
    <View
      style={[
        cap.half,
        { left: isLeft ? 0 : HALF },
        webTransition('transform, opacity', BURST_MS),
        burst && {
          opacity: 0,
          transform: [
            { translateX: isLeft ? -120 : 120 },
            { translateY: 26 },
            { rotate: isLeft ? '-24deg' : '24deg' }
          ]
        }
      ]}
    >
      <Image
        source={{ uri }}
        style={[cap.halfImg, { left: isLeft ? 0 : -HALF }]}
        resizeMode="contain"
      />
    </View>
  );
}

// Zikzaklı yırtık çizgisi — kâğıdın yırtıldığı anı temsil eder.
// Küçük üçgen/kare parçalardan oluşur (RN'de SVG olmadan zikzak üretmenin
// en sağlam yolu).
function TearLine({ visible }) {
  const teeth = 11;
  return (
    <View
      pointerEvents="none"
      style={[cap.tearWrap, webTransition('opacity', TEAR_MS), { opacity: visible ? 1 : 0 }]}
    >
      {Array.from({ length: teeth }).map((_, i) => (
        <View
          key={i}
          style={[
            cap.tooth,
            { marginLeft: i % 2 === 0 ? -3 : 3 }
          ]}
        />
      ))}
    </View>
  );
}

export default function CapsuleOpening({ capsule, onBack, balance, setBalance, setInventory, gameMode, priceMap, onOpen }) {
  const { t } = useI18n();
  const [phase, setPhase] = useState('idle'); // 'idle' | 'shaking' | 'tearing' | 'burst' | 'done'
  const [shakeOffset, setShakeOffset] = useState(0);
  const [wonItem, setWonItem] = useState(null);
  const [batch, setBatch] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');

  const [sessionSpent, setSessionSpent] = useState(0);
  const [sessionWon, setSessionWon] = useState(0);
  const [sessionOpened, setSessionOpened] = useState(0);

  // BELLEK SIZINTISI DÜZELTMESİ: aşama zamanlayıcılarını topluca izleyip
  // unmount'ta temizliyoruz (bkz. AGENTS.md §4).
  const timersRef = useRef([]);
  const shakeIntervalRef = useRef(null);
  const isMountedRef = useRef(true);

  const later = (fn, ms) => {
    const id = setTimeout(() => { if (isMountedRef.current) fn(); }, ms);
    timersRef.current.push(id);
    return id;
  };

  const clearAllTimers = () => {
    timersRef.current.forEach(clearTimeout);
    timersRef.current = [];
    if (shakeIntervalRef.current) { clearInterval(shakeIntervalRef.current); shakeIntervalRef.current = null; }
  };

  useEffect(() => {
    return () => { isMountedRef.current = false; clearAllTimers(); };
  }, []);

  // ⚠️ Kartın hesapladığı maliyetle AYNI olmalı (bkz. CaseOpening'deki not).
  const COST = capsule.cost ?? getContainerPrice(priceMap, capsule, 'sticker');

  // Sticker kapsülü, charm kapsülüyle AYNI 4 kademeli merdiveni kullanır
  // (High Grade / Remarkable / Exotic / Extraordinary) — bkz. prices.js.
  //
  // ⚠️ 29 AĞU 2026: Oranlar artık SABİT DEĞİL, kapsülün İÇERİĞİNDEN türetiliyor.
  // Eskiden 4 kademenin biri kapsülde yoksa o dilim "tüm havuzdan rastgele seç"
  // yedeğine düşüyor ve nadir çıkartmaları olması gerekenden çok daha sık
  // veriyordu (Armory'deki %1000 ROI bug'ının küçük ölçekli hâli).
  const TIERS = useMemo(() => getCapsuleTiers(capsule), [capsule]);

  const rollOne = () => {
    const selected = rollTier(TIERS);
    if (!selected) return null;
    const pool = (capsule.contains || []).filter(i => i.rarity?.name === selected.name);
    if (pool.length === 0) return null;
    const item = pool[Math.floor(Math.random() * pool.length)];
    // Sticker'ların float/wear/pattern'i YOKTUR — sabit kozmetik eşyalardır.
    return {
      ...item,
      displayColor: item.rarity?.color || selected.color,
      uid: Date.now().toString() + Math.random().toString(36).slice(2),
      price: getStickerPrice(priceMap, item),
      isSticker: true,
      source: 'STICKER',
      acquiredAt: Date.now()
    };
  };

  const open = (count = 1) => {
    const totalCost = COST * count;
    if (gameMode === 'wallet' && balance < totalCost) {
      setErrorMsg(t('common.insufficientBalance', { n: totalCost.toFixed(2) }));
      return;
    }
    if ((capsule.contains || []).length === 0) {
      setErrorMsg(t('common.contentsUnreadable'));
      return;
    }

    setErrorMsg('');
    clearAllTimers();
    if (gameMode === 'wallet') setBalance(prev => prev - totalCost);

    setSessionSpent(prev => prev + totalCost);
    setSessionOpened(prev => prev + count);
    setWonItem(null); setBatch(null);

    // Sonuç ÖNCE belirlenir; animasyon yalnızca görsel gecikmedir.
    const results = Array.from({ length: count }, () => rollOne()).filter(Boolean);
    if (results.length === 0) { setErrorMsg(t('common.contentsUnreadable')); return; }
    const totalWon = results.reduce((a, r) => a + r.price, 0);
    onOpen?.(capsule.id, count);

    // 1) TİTREME
    setPhase('shaking');
    shakeIntervalRef.current = setInterval(() => {
      if (!isMountedRef.current) return;
      setShakeOffset(prev => (prev === 0 ? (Math.random() > 0.5 ? 3 : -3) : 0));
    }, SHAKE_STEP_MS);

    // 2) YIRTILMA
    later(() => setPhase('tearing'), SHAKE_MS);

    // 3) PATLAMA
    later(() => {
      if (shakeIntervalRef.current) { clearInterval(shakeIntervalRef.current); shakeIntervalRef.current = null; }
      setShakeOffset(0);
      setPhase('burst');
    }, SHAKE_MS + TEAR_MS);

    // 4) SONUÇ
    later(() => {
      setSessionWon(prev => prev + totalWon);
      setPhase('done');
      if (count === 1) setWonItem(results[0]);
      else setBatch({ items: results, count, spending: totalCost, totalWon });
    }, SHAKE_MS + TEAR_MS + BURST_MS);
  };

  const reset = () => { clearAllTimers(); setWonItem(null); setBatch(null); setPhase('idle'); };
  const keepItem = () => { setInventory(prev => [...prev, wonItem]); reset(); };
  const sellItem = () => {
    if (gameMode === 'wallet') setBalance(prev => prev + wonItem.price);
    reset();
  };
  const keepAllBatch = () => { setInventory(prev => [...prev, ...batch.items]); reset(); };

  // ⚠️ KALAN eşyaların toplamı — kullanıcı aradan tek tek satmış olabilir.
  const sellAllBatch = () => {
    const remaining = batch.items.reduce((a, it) => a + (it.price || 0), 0);
    if (gameMode === 'wallet') setBalance(prev => prev + remaining);
    reset();
  };

  const sellOneFromBatch = (item) => {
    if (gameMode === 'wallet') setBalance(prev => prev + (item.price || 0));
    setBatch(prev => {
      if (!prev) return prev;
      const items = prev.items.filter(i => i.uid !== item.uid);
      if (items.length === 0) { reset(); return null; }
      return { ...prev, items };
    });
  };

  const keepSelectedFromBatch = (selectedItems) => {
    const uids = selectedItems.map(i => i.uid);
    setInventory(prev => [...prev, ...selectedItems]);
    setBatch(prev => {
      if (!prev) return prev;
      const items = prev.items.filter(i => !uids.includes(i.uid));
      if (items.length === 0) { reset(); return null; }
      return { ...prev, items };
    });
  };

  // TEKRARDAN AÇ: aynı kapsülü AYNI adetle yeniden açar.
  // ⚠️ Panel ÖNCEDEN KAPATILMAZ (bkz. CaseOpening'deki aynı not).
  const reopenBatch = () => { open(batch?.count || 1); };

  const netProfit = sessionWon - sessionSpent;
  const batchNetProfit = batch ? batch.totalWon - batch.spending : 0;
  const opening = phase === 'shaking' || phase === 'tearing' || phase === 'burst';
  const burst = phase === 'burst' || phase === 'done';

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={onBack}><Text style={styles.backText}>{t('common.back')}</Text></TouchableOpacity>
        {gameMode === 'wallet' ? <Text style={styles.balanceText}>{t('common.wallet', { n: balance.toFixed(2) })}</Text> : <Text style={styles.unlimitedText}>{t('common.unlimitedMode')}</Text>}
      </View>

      <View style={styles.statsPanel}>
        <View style={styles.statBox}><Text style={styles.statLbl}>{t('common.opened')}</Text><Text style={styles.statVal}>{sessionOpened}</Text></View>
        <View style={styles.statBox}><Text style={styles.statLbl}>{t('common.spent')}</Text><Text style={[styles.statVal, { color: C.danger }]}>-${sessionSpent.toFixed(2)}</Text></View>
        <View style={styles.statBox}><Text style={styles.statLbl}>{t('common.won')}</Text><Text style={[styles.statVal, { color: C.success }]}>+${sessionWon.toFixed(2)}</Text></View>
        <View style={styles.statBox}><Text style={styles.statLbl}>{t('common.profit')}</Text><Text style={[styles.statVal, { color: netProfit >= 0 ? C.success : C.danger }]}>{formatSignedMoney(netProfit)}</Text></View>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.capsuleName}>{capsule.name}</Text>
        <Text style={styles.capsuleSub}>{t('capsule.subtitle')} · ${COST.toFixed(2)}</Text>

        {errorMsg !== '' && <Text style={styles.errorText}>{errorMsg}</Text>}

        {/* ============ KAPSÜL SAHNESİ ============ */}
        {phase !== 'done' && (
          <View style={cap.stage}>
            <View style={[cap.capsuleWrap, { transform: [{ translateX: shakeOffset }] }]}>
              <CapsuleHalf uri={capsule.image} side="left" burst={burst} />
              <CapsuleHalf uri={capsule.image} side="right" burst={burst} />
              {/* ⚠️ BUG DÜZELTMESİ (29 AĞu 2026): Yırtık çizgisi PATLAMA
                  anında GİZLENİR. Eskiden koşul `phase === 'tearing' || burst`
                  idi; kapsülün iki yarısı savrulup kaybolduktan sonra bu 11
                  adet 8x8 beyaz kare EKRANIN ORTASINDA ÖYLECE KALIYORDU —
                  kullanıcının "animasyonun ortasında anlamsız dörtgenler
                  beliriyor" dediği şey buydu. Artık yalnızca YIRTILMA
                  aşamasında görünüyor ve patlamayla birlikte solüyor. */}
              <TearLine visible={phase === 'tearing'} />
            </View>

            {/* Patlama parlaması — yarılar savrulurken ortadan yayılan ışık.
                Titreme/yırtılma boyunca küçük ve yumuşak bir hale olarak durur,
                patlama anında hızla büyüyüp söner. */}
            {opening && (
              <View
                pointerEvents="none"
                style={[
                  cap.burstFlash,
                  webTransition('opacity, transform', BURST_MS),
                  burst && { opacity: 0, transform: [{ scale: 2.6 }] }
                ]}
              />
            )}

            {opening && <Text style={cap.stageHint}>{phase === 'shaking' ? t('capsule.opening') : t('capsule.tearing')}</Text>}
          </View>
        )}

        {/* ============ ÇIKAN ÇIKARTMA ============ */}
        {phase === 'done' && wonItem && (
          <View style={[styles.wonContainer, { shadowColor: wonItem.displayColor }]}>
            <View pointerEvents="none" style={rarityGlowStyle(wonItem.displayColor, { height: '34%', strength: 0.9 })} />
            <Text style={styles.priceTag}>${wonItem.price.toFixed(2)}</Text>
            <Image source={{ uri: wonItem.image }} style={styles.wonImage} resizeMode="contain" />
            <Text style={[styles.wonItemName, { color: wonItem.displayColor }]}>{wonItem.name}</Text>
            <Text style={styles.wearText}>{wonItem.rarity?.name || 'Sticker'}</Text>
            <View style={styles.actionRow}>
              <TouchableOpacity style={styles.keepBtn} onPress={keepItem}><Text style={styles.btnTxt}>{t('common.keep')}</Text></TouchableOpacity>
              <TouchableOpacity style={styles.sellBtn} onPress={sellItem}><Text style={styles.btnTxt}>{t('common.sellNow', { n: wonItem.price.toFixed(2) })}</Text></TouchableOpacity>
            </View>
          </View>
        )}

        {phase === 'done' && batch && (
          <BatchResultPanel
            items={batch.items}
            title={t('case.batchDone', { n: batch.count })}
            spendingLabel={`-$${batch.spending.toFixed(2)}`}
            spendingUsd={batch.spending}
            onSellOne={sellOneFromBatch}
            onSellAll={sellAllBatch}
            onKeepAll={keepAllBatch}
            onKeepSelected={keepSelectedFromBatch}
            onReopen={reopenBatch}
            reopenLabel={t('batch.reopen', { n: batch.count })}
            onClose={reset}
          />
        )}

        {phase === 'idle' && (
          <>
            <TouchableOpacity style={styles.openBtn} onPress={() => open(1)}>
              <Text style={styles.openBtnTxt}>{t('capsule.open')}</Text>
              <Text style={styles.openBtnPrice}>${COST.toFixed(2)}</Text>
            </TouchableOpacity>

            <Text style={styles.multiLabel}>{t('common.multiOpen')}</Text>
            <View style={styles.multiRow}>
              {[5, 10].map(n => (
                <TouchableOpacity key={n} style={styles.multiBtn} onPress={() => open(n)}>
                  <Text style={styles.multiBtnTxt}>{t('common.openX', { n })}</Text>
                  <Text style={styles.multiBtnPrice}>${(COST * n).toFixed(2)}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <InlineContentsPanel subject={capsule} kind="sticker" priceMap={priceMap} />
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const cap = StyleSheet.create({
  stage: { width: '100%', maxWidth: 460, height: 250, alignItems: 'center', justifyContent: 'center', backgroundColor: C.surface, borderRadius: R.lg, position: 'relative', overflow: 'hidden', ...shadow.card },
  capsuleWrap: { width: CAPSULE_SIZE, height: CAPSULE_SIZE, position: 'relative' },
  half: { position: 'absolute', top: 0, width: HALF, height: CAPSULE_SIZE, overflow: 'hidden' },
  halfImg: { position: 'absolute', top: 0, width: CAPSULE_SIZE, height: CAPSULE_SIZE },
  tearWrap: { position: 'absolute', top: 0, bottom: 0, left: HALF - 5, width: 10, alignItems: 'center', justifyContent: 'space-between', paddingVertical: 6, zIndex: 4 },
  // Yırtık "dişleri": 45° döndürülmüş küçük kareler zikzak izlenimi verir.
  // Kapsül görselinin ÜZERİNDE durdukları için beyaz okunur; zeminle
  // karışmamaları için ince bir kenarlık ekleniyor.
  tooth: { width: 8, height: 8, backgroundColor: '#ffffff', borderWidth: 1, borderColor: C.borderStrong, transform: [{ rotate: '45deg' }], borderRadius: 1 },
  burstFlash: {
    position: 'absolute', width: 130, height: 130, borderRadius: 65,
    backgroundColor: hexToRgba('#ffffff', 0.85), opacity: 0.6, transform: [{ scale: 0.55 }], zIndex: 3
  },
  stageHint: { position: 'absolute', bottom: 16, color: C.textDim, fontSize: 12, fontWeight: '700' }
});

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 18, paddingVertical: 12 },
  backBtn: { backgroundColor: C.surface, paddingHorizontal: 14, paddingVertical: 8, borderRadius: R.pill, ...shadow.card },
  backText: { color: C.accentDeep, fontSize: 14, fontWeight: '800' },
  balanceText: { color: C.success, fontSize: 15, fontWeight: '800' },
  unlimitedText: { color: C.accentDeep, fontSize: 15, fontWeight: '800' },
  statsPanel: { flexDirection: 'row', backgroundColor: C.surface, marginHorizontal: 18, borderRadius: R.md, padding: 14, justifyContent: 'space-between', ...shadow.card },
  statBox: { alignItems: 'center' },
  statLbl: { color: C.textDim, fontSize: 10, fontWeight: '700' },
  statVal: { color: C.text, fontSize: 14, fontWeight: '800', marginTop: 4 },
  content: { alignItems: 'center', padding: 20, paddingBottom: 60 },
  capsuleName: { color: C.text, fontSize: 20, fontWeight: '800', textAlign: 'center' },
  capsuleSub: { color: C.textDim, fontSize: 12, marginTop: 6, marginBottom: 16 },
  errorText: { color: C.danger, fontSize: 13, fontWeight: '700', marginBottom: 12, backgroundColor: C.dangerSoft, paddingHorizontal: 14, paddingVertical: 8, borderRadius: R.md },
  wonContainer: {
    alignItems: 'center', marginTop: 4, padding: 24, backgroundColor: C.surface, borderRadius: R.lg, width: '100%', maxWidth: 400, overflow: 'hidden',
    shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.35, shadowRadius: 30, elevation: 16
  },
  priceTag: { position: 'absolute', top: 14, right: 16, color: C.success, fontSize: 17, fontWeight: '800' },
  wonImage: { width: 160, height: 130 },
  wonItemName: { fontSize: 16, fontWeight: '800', marginTop: 12, textAlign: 'center' },
  wearText: { color: C.textDim, fontSize: 12, marginTop: 6, fontWeight: '600' },
  actionRow: { flexDirection: 'row', gap: 10, marginTop: 18, flexWrap: 'wrap', justifyContent: 'center' },
  sellBtn: { backgroundColor: C.success, paddingHorizontal: 18, paddingVertical: 12, borderRadius: R.md },
  keepBtn: { backgroundColor: C.accent, paddingHorizontal: 18, paddingVertical: 12, borderRadius: R.md },
  btnTxt: { color: C.onAccent, fontWeight: '800', fontSize: 13 },
  openBtn: { backgroundColor: C.accent, paddingVertical: 14, paddingHorizontal: 44, borderRadius: R.md, alignItems: 'center', marginTop: 22, ...shadow.card, shadowColor: C.accent, shadowOpacity: 0.4 },
  openBtnTxt: { color: C.onAccent, fontSize: 15, fontWeight: '800', letterSpacing: 0.6 },
  openBtnPrice: { color: C.onAccent, fontSize: 13, marginTop: 3, opacity: 0.9, fontWeight: '600' },
  multiLabel: { color: C.textDim, fontSize: 11, fontWeight: '700', marginTop: 20, marginBottom: 8 },
  multiRow: { flexDirection: 'row', gap: 10 },
  multiBtn: { backgroundColor: C.surface, paddingVertical: 10, paddingHorizontal: 18, borderRadius: R.md, alignItems: 'center', ...shadow.card },
  multiBtnTxt: { color: C.accentDeep, fontSize: 14, fontWeight: '800' },
  multiBtnPrice: { color: C.textDim, fontSize: 11, marginTop: 2, fontWeight: '600' },
  batchContainer: { width: '100%', alignItems: 'center', marginTop: 4 },
  batchGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 10, width: '100%' },
  batchCard: { width: 76, backgroundColor: C.surface, borderRadius: R.md, borderBottomWidth: 3, alignItems: 'center', padding: 6, position: 'relative', overflow: 'hidden', ...shadow.card },
  batchImg: { width: 58, height: 46, marginTop: 6 },
  batchPrice: { color: C.success, fontSize: 10, fontWeight: '800', marginTop: 4 },
  batchSummary: { flexDirection: 'row', backgroundColor: C.surface, borderRadius: R.md, padding: 14, justifyContent: 'space-around', width: '100%', marginTop: 18, ...shadow.card }
});
