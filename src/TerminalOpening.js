import React, { useState, useRef, useEffect, useMemo } from 'react';
import { StyleSheet, Text, View, Image, TouchableOpacity, SafeAreaView, ScrollView, Platform, useWindowDimensions } from 'react-native';
import { generateFloat, getWearFromFloat, generatePattern } from './utils';
import { getRealisticPrice, getCaseTiers, poolForTier, rollTier, STATTRAK_CHANCE } from './prices';
import { InlineContentsPanel } from './components/ContentsModal';
import { useToast, ToastBanner } from './components/Toast';
import { useI18n } from './i18n';
import { C, shadow, rarityGlowStyle, rarityTint, webTransition } from './theme';

// ============================================================
// ARMORY TERMİNALİ — GERÇEK CS2 "TEKLİF SEÇİMİ" MEKANİĞİ
// ============================================================
// ⚠️ BU EKRAN BİR KASA DEĞİLDİR. Önceki sürümde terminal klasik kasa gibi
// çalışıyordu (tek eşya düşürüp bitiyordu) — bu YANLIŞTI.
//
// GERÇEK MEKANİK (CS2 Armory): Terminal çalıştırıldığında kullanıcıya birden
// fazla TEKLİF (offer) sunulur. Kullanıcı teklifler arasında gezinir, birini
// KREDİ karşılığında satın alır ya da hepsini geçer. Her oturumda YALNIZCA BİR
// eşya alınabilir; satın alma yapıldığında oturum kapanır.
//
// AKIŞ (ADIM ADIM — hepsi aynı anda GÖSTERİLMEZ):
//   1) idle      → terminal bekliyor
//   2) scanning  → CRT/glitch tarama (görsel gecikme, sonucu ETKİLEMEZ)
//   3) offers    → teklifler TEK TEK sunulur: 1/5 → 2/5 → … → 5/5
//                  (%5 ihtimalle 6. BONUS slot açılır, o zaman 1/6 … 6/6)
//   4) claimed   → alınan eşya teslim edildi, oturum kapandı
//
// ⚠️ ADIM ADIM AKIŞ KURALLARI:
//   • Kullanıcı AYNI ANDA yalnızca BİR teklif görür.
//   • "Pas Geç" bir sonraki teklife geçer; GERİ DÖNÜŞ YOKTUR.
//   • SON seçenekte "Pas Geç" DEVRE DIŞIDIR — kullanıcı almak zorundadır.
//   • Teklifler tarama biterken TOPLUCA üretilir (aşağıya bakın).
//
// ⚠️ TARAMA ÜCRETSİZDİR; ödeme YALNIZCA "Eşyayı Al" anında yapılır —
// teklifleri görmek bedavadır.
//
// ⚠️ PARA BİRİMİ: Terminal ARTIK YILDIZ/KREDİ KULLANMAZ, yalnızca DOLAR ($).
// Terminal içindeki her fiyat eşyanın gerçek piyasa değeridir; ayrı bir
// "kredi etiketi" yoktur. Bu, kullanıcının cüzdanıyla terminal arasındaki
// dönüşüm kafa karışıklığını tamamen ortadan kaldırır.

// (GOLD sabiti artık gerekmiyor — altın kademe prices.js/getCaseTiers'ten gelir)

// Tarama temposu: hızlı başlar, kademeli olarak yavaşlar.
const SCAN_FAST_MS = 45;
const SCAN_SLOW_MS = 260;
const SCAN_TICKS = 26;
const FLASH_MS = 460;

// ============================================================
// TEKLİF SAYISI ve NADİR 6. TEKLİF (BONUS ROLL)
// ============================================================
// GERÇEK CS2 ARMORY: Terminal normalde 5 teklif sunar; düşük bir ihtimalle
// fazladan bir slot daha açılır ve kullanıcı 6 teklif arasından seçer.
// Simülatörde bu ihtimal %5'tir — yani ortalama 20 oturumda bir görülür.
// (Valve kesin sayıyı yayımlamıyor; %5, "nadir ama oynanışta fark edilir"
// bandının alt ucudur. Değiştirilecekse gacas.md §5 de güncellenmeli.)
//
// ⚠️ Bonus, teklifler ÜRETİLİRKEN bir kez atılır ve oturum boyunca sabittir;
// "pas geçtikçe şansım artar mı" belirsizliği bilinçli olarak yok edilmiştir.
const BASE_OFFER_COUNT = 5;
const BONUS_OFFER_CHANCE = 0.05;

const HEX = '0123456789ABCDEF';
const randomHex = (n = 6) => Array.from({ length: n }, () => HEX[Math.floor(Math.random() * 16)]).join('');
const SCAN_VERBS = ['SCANNING', 'DECRYPTING', 'MATCHING', 'INDEXING', 'VERIFYING', 'ALLOCATING'];

// ============================================================
// CRT EKRANI
// ============================================================
function GlitchLine({ text }) {
  return (
    <View style={crt.glitchWrap}>
      <Text style={[crt.scanName, crt.ghost, { color: '#ff4d6d', left: -2 }]} numberOfLines={1}>{text}</Text>
      <Text style={[crt.scanName, crt.ghost, { color: '#4dd2ff', left: 2 }]} numberOfLines={1}>{text}</Text>
      <Text style={crt.scanName} numberOfLines={1}>{text}</Text>
    </View>
  );
}

function Scanlines() {
  if (Platform.OS !== 'web') return null; // gradient yalnızca web'de
  return (
    <View
      pointerEvents="none"
      style={[
        crt.scanlines,
        { background: `repeating-linear-gradient(to bottom, ${C.crtScan} 0px, ${C.crtScan} 1px, transparent 1px, transparent 3px)` }
      ]}
    />
  );
}

// ============================================================
// TEKLİF PANELİ — CRT EKRANININ İÇİNDE
// ============================================================
// ⚠️ GÖRSEL SÜREKLİLİK (bilinçli tasarım kararı):
// Önceki sürümde giriş animasyonu koyu bir CRT ekranıydı, ardından gelen eşya
// kartı ise BEYAZ, yuvarlak köşeli, açık temaya ait ayrı bir bileşendi. İki
// ekran arka arkaya yüklenmiş İKİ FARKLI uygulama gibi duruyordu.
//
// Artık teklif paneli terminalin EKRANININ İÇİNDE çiziliyor ve onun görsel
// dilini birebir kullanıyor:
//   • zemin  : C.crtBgDeep (ekranın kendi koyu tonu)
//   • kenar  : eşyanın nadirlik rengi (tek renkli vurgu)
//   • yazı   : monospace; etiketler C.crtDim, değerler C.crtText (mint)
//   • tarama çizgileri panelin ÜSTÜNDEN de geçer (aynı cam yüzey hissi)
// Cihaz kasası tarama sırasında da, teklif sırasında da, teslimat sırasında da
// EKRANDA KALIR — yani bileşen değişmez, yalnızca ekranın içeriği değişir.
function OfferPanel({ offer, t }) {
  const wearShort = { 'Factory New': 'FN', 'Minimal Wear': 'MW', 'Field-Tested': 'FT', 'Well-Worn': 'WW', 'Battle-Scarred': 'BS' }[offer.wear] || '—';
  return (
    <View style={[oc.panel, { borderColor: offer.displayColor }]}>
      {/* Nadirlik ışığı — panelin altından yukarı sönümlenir */}
      <View pointerEvents="none" style={rarityGlowStyle(offer.displayColor, { height: '42%', strength: 0.42 })} />

      <View style={oc.topRow}>
        <View style={[oc.wearChip, { borderColor: offer.displayColor }]}>
          <Text style={[oc.wearChipTxt, { color: offer.displayColor }]}>{wearShort}</Text>
        </View>
        {offer.isStatTrak && <Text style={oc.stTag}>StatTrak™</Text>}
        <Text style={oc.price}>${offer.price.toFixed(2)}</Text>
      </View>

      <Image source={{ uri: offer.image }} style={oc.img} resizeMode="contain" />

      <Text style={[oc.name, { color: offer.displayColor }]} numberOfLines={2}>{offer.name}</Text>
      <Text style={oc.wearFull}>{offer.wear}</Text>

      <View style={oc.specs}>
        <View style={oc.specRow}>
          <Text style={oc.specLbl}>{t('terminal.float')}</Text>
          <Text style={oc.specVal}>{offer.float.toFixed(8)}</Text>
        </View>
        <View style={oc.specRow}>
          <Text style={oc.specLbl}>{t('terminal.pattern')}</Text>
          <Text style={oc.specVal}>#{offer.pattern}</Text>
        </View>
      </View>
    </View>
  );
}

export default function TerminalOpening({ terminal, onBack, balance, setBalance, setInventory, gameMode, priceMap, onOpen }) {
  const { t } = useI18n();
  const { toast, showToast } = useToast();
  const { width } = useWindowDimensions();

  const [phase, setPhase] = useState('idle'); // 'idle' | 'scanning' | 'offers' | 'claimed'
  const [scanText, setScanText] = useState('');
  const [scanCode, setScanCode] = useState(randomHex());
  const [scanVerb, setScanVerb] = useState(SCAN_VERBS[0]);
  const [progress, setProgress] = useState(0);
  const [flashState, setFlashState] = useState({ opacity: 0, ms: 0 });

  const [offers, setOffers] = useState([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [hasBonus, setHasBonus] = useState(false);
  const [claimedItem, setClaimedItem] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');

  const [sessionRuns, setSessionRuns] = useState(0);
  const [sessionSpent, setSessionSpent] = useState(0);
  const [sessionValue, setSessionValue] = useState(0);

  // BELLEK SIZINTISI DÜZELTMESİ: tarama özyinelemeli setTimeout ile ilerliyor;
  // unmount sonrası ateşlenirse "unmounted component'te setState" uyarısı verir.
  const scanTimerRef = useRef(null);
  const flashTimerRef = useRef(null);
  const isMountedRef = useRef(true);
  useEffect(() => {
    return () => {
      isMountedRef.current = false;
      if (scanTimerRef.current) clearTimeout(scanTimerRef.current);
      if (flashTimerRef.current) clearTimeout(flashTimerRef.current);
    };
  }, []);

  // Terminalin kendi kademe tablosu — içerikten türetilir, sabit DEĞİL.
  const TIERS = useMemo(() => getCaseTiers(terminal), [terminal]);

  // Tarama sırasında ekranda akacak isim havuzu (gerçek içerik — sahte isim yok).
  const namePool = useMemo(() => {
    const all = [...(terminal.contains || []), ...(terminal.contains_rare || [])];
    return all.map(i => i.name).filter(Boolean);
  }, [terminal]);

  // Tek bir teklif üretir — kasa oran tablosunu kullanır (terminaller veri
  // şeması olarak normal bir kasayla birebir aynıdır).
  const rollOffer = () => {
    // ⚠️ KADEMELER TERMİNALİN İÇERİĞİNDEN TÜRETİLİR (bkz. prices.js getCaseTiers).
    // Genesis Terminal'de `contains_rare` BOŞTUR; sabit tabloda %0.26'lık altın
    // dilim yine de çekiliyor ve eşya bulunamayınca TÜM havuzdan düzgün
    // dağılımlı bir eşya (Covert dahil) veriyordu.
    const selectedRarity = rollTier(TIERS);
    if (!selectedRarity) return null;
    const pool = poolForTier(terminal, selectedRarity) || terminal.contains || [];
    const item = pool[Math.floor(Math.random() * pool.length)];
    const isStatTrak = Math.random() < STATTRAK_CHANCE;
    const floatVal = generateFloat(item.min_float ?? 0.00, item.max_float ?? 1.00);
    const price = getRealisticPrice(priceMap, item, floatVal, isStatTrak, selectedRarity.isRare ? 'Rare Special' : selectedRarity.name);
    return {
      ...item,
      isStatTrak,
      displayColor: selectedRarity.color,
      uid: Date.now().toString() + Math.random().toString(36).slice(2),
      float: floatVal,
      wear: getWearFromFloat(floatVal),
      pattern: generatePattern(),
      price,
      source: 'TERMINAL',
      acquiredAt: Date.now()
    };
  };

  // "Dispense" flaşı: Animated YERİNE state + CSS transition.
  // NEDEN: Animated tabanlı bir flaş, composite edilmeyen sekmelerde donabilir
  // ve ekranı BEYAZ KİLİTLİ bırakabilirdi (bkz. AGENTS.md §3).
  const triggerFlash = () => {
    setFlashState({ opacity: 0.92, ms: 0 });   // anında parla
    if (flashTimerRef.current) clearTimeout(flashTimerRef.current);
    flashTimerRef.current = setTimeout(() => {
      if (isMountedRef.current) setFlashState({ opacity: 0, ms: FLASH_MS }); // yavaşça sön
      flashTimerRef.current = null;
    }, 40);
  };

  // TARAMA DÖNGÜSÜ: her karede yeni bir isim/kod basar ve bir sonraki kareyi
  // DAHA GEÇ planlar — böylece akış kademeli olarak yavaşlar (gerilim eğrisi).
  const runScan = (onDone) => {
    const tick = (i) => {
      if (!isMountedRef.current) return;
      const p = i / SCAN_TICKS;
      setScanText(namePool.length ? namePool[Math.floor(Math.random() * namePool.length)] : randomHex(12));
      setScanCode(randomHex());
      setScanVerb(SCAN_VERBS[Math.floor(Math.random() * SCAN_VERBS.length)]);
      setProgress(Math.min(100, Math.round(p * 100)));

      if (i >= SCAN_TICKS) {
        setProgress(100);
        scanTimerRef.current = null;
        onDone();
        return;
      }
      const delay = SCAN_FAST_MS + (SCAN_SLOW_MS - SCAN_FAST_MS) * Math.pow(p, 3);
      scanTimerRef.current = setTimeout(() => tick(i + 1), delay);
    };
    tick(1);
  };

  // TERMİNALİ ÇALIŞTIR — teklifleri üretir. ÜCRETSİZDİR.
  const runTerminal = () => {
    if ((terminal.contains || []).length === 0) {
      setErrorMsg(t('common.contentsUnreadable'));
      return;
    }
    setErrorMsg('');
    if (scanTimerRef.current) { clearTimeout(scanTimerRef.current); scanTimerRef.current = null; }

    // ⚠️ Teklifler tarama BİTMEDEN, tek seferde üretilir — kullanıcıya yine
    // TEK TEK gösterilseler de. Neden: "her Pas Geç'te yeni zar at" yaklaşımı,
    // kullanıcının pas geçme kararının sonraki teklifi ETKİLEDİĞİ izlenimini
    // verir ve oturumun toplam beklenen değerini belirsizleştirir. Havuz baştan
    // sabitlenince oturum adil ve denetlenebilir olur (kasa çarkında kazananın
    // dönüş başlamadan belirlenmesiyle aynı ilke).
    const bonus = Math.random() < BONUS_OFFER_CHANCE;
    const count = BASE_OFFER_COUNT + (bonus ? 1 : 0);
    const generated = Array.from({ length: count }, () => rollOffer()).filter(Boolean);
    if (generated.length === 0) { setErrorMsg(t('common.contentsUnreadable')); return; }

    setHasBonus(bonus);
    setClaimedItem(null);
    setOffers([]);
    setActiveIndex(0);
    setPhase('scanning');
    setProgress(0);
    setSessionRuns(prev => prev + 1);
    onOpen?.(terminal.id, 1);

    runScan(() => {
      if (!isMountedRef.current) return;
      triggerFlash();
      setOffers(generated);
      setPhase('offers');
      // Nadir 6. teklif çıktıysa duyur — ekrandaki küçük rozet tek başına
      // fark edilmiyordu ve oyunun en özel anı sessizce geçiyordu.
      if (bonus) showToast(t('terminal.bonusToast'), 'success');
    });
  };

  // TEKLİFİ SATIN AL — kredi düşer, eşya envantere eklenir, OTURUM KAPANIR.
  const buyOffer = (idx) => {
    const offer = offers[idx];
    if (!offer) return;

    // Sınırsız Mod'da bakiye kontrolü yapılmaz (diğer ekranlarla tutarlı).
    if (gameMode === 'wallet' && balance < offer.price) {
      showToast(t('common.insufficientBalance', { n: offer.price.toFixed(2) }), 'error');
      return;
    }
    if (gameMode === 'wallet') setBalance(prev => prev - offer.price);

    setInventory(prev => [...prev, { ...offer, acquiredAt: Date.now() }]);

    setSessionSpent(prev => prev + offer.price);
    setSessionValue(prev => prev + offer.price);
    setClaimedItem(offer);
    setPhase('claimed');
    triggerFlash();
    showToast(t('terminal.purchasedToast', { name: offer.name, n: offer.price.toFixed(2) }), 'success');
  };

  // ============================================================
  // PAS GEÇ → SONRAKİ TEKLİF (ANINDA, geri dönüş YOK)
  // ============================================================
  // ⚠️ BURADA ANİMASYON YOKTUR — BİLİNÇLİ.
  // Önceki sürümde fade+slide geçişi vardı; teklifler arasında hızlı gezinen
  // kullanıcı için bu, her tıklamada ~400 ms'lik bir bekleme demekti ve kart
  // yüksekliği değişirken düzen kayması (layout shift) hissettiriyordu.
  // Artık index doğrudan artar: React tek render'da yeni teklifi basar.
  // Kart yüksekliği `cardStage.minHeight` ile sabitlendiği için sayfa da
  // ZIPLAMAZ.
  const nextOffer = () => {
    // Son teklifte "sonraki" diye bir şey yok; oradaki buton artık
    // `declineSession` (almadan kapat) olarak çalışır.
    if (activeIndex >= offers.length - 1) return;
    setActiveIndex(i => i + 1);
  };

  // ============================================================
  // ALMADAN KAPAT — "zorunlu alım" kaldırıldı (29 Ağu 2026)
  // ============================================================
  // Önceki sürümde son teklifte "Pas Geç" DEVRE DIŞI bırakılıyor ve kullanıcı
  // eşyayı almak ZORUNDA kalıyordu. Bu ne gerçek CS2 davranışıydı ne de adil:
  // teklifleri görmek ücretsiz olduğu hâlde, çıkış yolu yoktu.
  // Artık son adımda "Alma / Kapat" butonu var; oturum hiçbir ücret ödenmeden
  // kapanır. (Terminali tekrar çalıştırmak da ücretsizdir.)
  const declineSession = () => {
    closeSession();
    showToast(t('terminal.declinedToast'), 'info');
  };

  const closeSession = () => {
    setClaimedItem(null);
    setOffers([]);
    setActiveIndex(0);
    setPhase('idle');
  };

  const activeOffer = offers[activeIndex];
  const isLastOffer = offers.length > 0 && activeIndex >= offers.length - 1;
  const scanning = phase === 'scanning';

  return (
    <SafeAreaView style={styles.container}>
      <ToastBanner toast={toast} />

      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={onBack}><Text style={styles.backText}>{t('common.back')}</Text></TouchableOpacity>
        {gameMode === 'wallet'
          ? <Text style={styles.walletText}>{t('common.wallet', { n: balance.toFixed(2) })}</Text>
          : <Text style={styles.unlimitedText}>{t('common.unlimitedMode')}</Text>}
      </View>

      <View style={styles.statsPanel}>
        <View style={styles.statBox}><Text style={styles.statLbl}>{t('common.opened')}</Text><Text style={styles.statVal}>{sessionRuns}</Text></View>
        <View style={styles.statBox}><Text style={styles.statLbl}>{t('common.spent')}</Text><Text style={[styles.statVal, { color: C.danger }]}>-${sessionSpent.toFixed(2)}</Text></View>
        <View style={styles.statBox}><Text style={styles.statLbl}>{t('common.won')}</Text><Text style={[styles.statVal, { color: C.success }]}>+${sessionValue.toFixed(2)}</Text></View>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.terminalName}>{terminal.name}</Text>
        <Text style={styles.terminalSub}>{t('terminal.subtitle')}</Text>

        {errorMsg !== '' && <Text style={styles.errorText}>{errorMsg}</Text>}

        {/* ============================================================
            CRT CİHAZI — HER AŞAMADA EKRANDA KALIR
            ============================================================
            Tarama, teklif ve teslimat AYNI ekranın içinde gerçekleşir; cihaz
            hiçbir zaman sökülüp yerine başka bir bileşen konmaz. Kullanıcı
            açısından bu, iki ayrı ekran arasında geçiş değil, TEK bir cihazın
            durum değiştirmesidir. */}
        <View style={crt.deviceShell}>
          <View style={[crt.screen, (phase === 'offers' || phase === 'claimed') && crt.screenTall]}>
            <Scanlines />

            <View style={crt.statusRow}>
              <Text style={crt.statusTxt}>ARMORY//{terminal.id?.replace('crate-', 'T') || 'T0000'}</Text>
              <Text style={crt.statusTxt}>
                {scanning ? scanVerb
                  : phase === 'offers' ? t('terminal.statusOffers')
                  : phase === 'claimed' ? t('terminal.purchased')
                  : t('terminal.statusReady')}
              </Text>
            </View>

            <View style={crt.screenBody}>
              {phase === 'idle' && (
                <>
                  <Text style={crt.idleTxt}>{t('terminal.ready')}<Text style={crt.caret}>_</Text></Text>
                  <Text style={crt.idleHint}>{t('terminal.readyHint')}</Text>
                </>
              )}

              {scanning && (
                <>
                  <Text style={crt.codeTxt}>0x{scanCode} · MODULE LOCK</Text>
                  <GlitchLine text={scanText} />
                  <View style={crt.barTrack}>
                    <View style={[crt.barFill, { width: `${progress}%` }]} />
                  </View>
                  <Text style={crt.codeTxt}>{progress}%</Text>
                </>
              )}

              {/* ---------- TEKLİF ---------- */}
              {phase === 'offers' && activeOffer && (
                <>
                  {hasBonus && (
                    <View style={crt.bonusChip}>
                      <Text style={crt.bonusTxt}>{t('terminal.bonusSlot')}</Text>
                    </View>
                  )}

                  {/* ADIM SAYACI — ekranın kendi mint/monospace dilinde */}
                  <View style={crt.stepCounter}>
                    <Text style={crt.stepWord}>{t('terminal.offerWord')}</Text>
                    <View style={crt.stepNumRow}>
                      <Text style={crt.stepNum}>{activeIndex + 1}</Text>
                      <Text style={crt.stepTotal}>/{offers.length}</Text>
                    </View>
                  </View>

                  <OfferPanel offer={activeOffer} t={t} />

                  <View style={crt.dots}>
                    {offers.map((o, i) => (
                      <View
                        key={o.uid}
                        style={[
                          crt.dot,
                          i < activeIndex && crt.dotUsed,
                          i === activeIndex && crt.dotActive
                        ]}
                      />
                    ))}
                  </View>
                </>
              )}

              {/* ---------- TESLİM EDİLEN EŞYA ---------- */}
              {phase === 'claimed' && claimedItem && (
                <>
                  <Text style={crt.dispenseStamp}>{t('terminal.purchased')}</Text>
                  <OfferPanel offer={claimedItem} t={t} />
                  <Text style={crt.paidTxt}>−${claimedItem.price.toFixed(2)}</Text>
                </>
              )}
            </View>

            <View
              pointerEvents="none"
              style={[crt.flash, webTransition('opacity', flashState.ms), { opacity: flashState.opacity }]}
            />
          </View>

          {/* ---------- CİHAZ ÜZERİNDEKİ AKSİYONLAR ---------- */}
          {/* Butonlar da kasanın İÇİNDE: ekranla aynı bloktan çıktıkları için
              "ayrı bir kart" hissi oluşmuyor. */}
          {phase === 'offers' && activeOffer && (
            <View style={crt.actionBar}>
              {/* ⚠️ SON ADIMDA BUTON "PAS GEÇ" DEĞİL "ALMA / KAPAT" OLUR —
                  devre dışı bir buton göstermek yerine gerçek bir çıkış yolu
                  sunuyoruz (zorunlu alım kaldırıldı). */}
              {isLastOffer ? (
                <TouchableOpacity style={crt.declineBtn} onPress={declineSession}>
                  <Text style={crt.declineBtnTxt}>{t('terminal.decline')}</Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity style={crt.skipBtn} onPress={nextOffer}>
                  <Text style={crt.skipBtnTxt}>{t('terminal.skipNext')}</Text>
                </TouchableOpacity>
              )}

              <TouchableOpacity style={crt.buyBtn} onPress={() => buyOffer(activeIndex)}>
                <Text style={crt.buyBtnTxt}>
                  {t('terminal.claim')} · ${activeOffer.price.toFixed(2)}
                </Text>
              </TouchableOpacity>
            </View>
          )}

          {phase === 'claimed' && (
            <View style={crt.actionBar}>
              <TouchableOpacity style={crt.buyBtn} onPress={closeSession}>
                <Text style={crt.buyBtnTxt}>{t('common.close')}</Text>
              </TouchableOpacity>
            </View>
          )}

          <View style={crt.slot}><View style={crt.slotMouth} /></View>
        </View>

        {phase === 'offers' && (
          <Text style={styles.stepHint}>
            {isLastOffer ? t('terminal.lastOption') : t('terminal.stepHint')}
          </Text>
        )}

        {/* ============ BAŞLAT ============ */}
        {phase === 'idle' && (
          <>
            <TouchableOpacity style={styles.startBtn} onPress={runTerminal}>
              <Text style={styles.startBtnTxt}>{t('terminal.start')}</Text>
            </TouchableOpacity>

            <InlineContentsPanel subject={terminal} kind="case" priceMap={priceMap} />
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const MONO = 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace';

const crt = StyleSheet.create({
  deviceShell: { width: '100%', maxWidth: 560, backgroundColor: C.surface, borderRadius: 22, padding: 16, marginTop: 4, alignItems: 'center', ...shadow.card },
  screen: {
    width: '100%', height: 190, backgroundColor: C.crtBg, borderRadius: 14, overflow: 'hidden',
    position: 'relative', paddingHorizontal: 16, paddingTop: 12
  },
  scanlines: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 3 },
  statusRow: { flexDirection: 'row', justifyContent: 'space-between', zIndex: 2 },
  statusTxt: { color: C.crtDim, fontSize: 10, fontWeight: '700', fontFamily: MONO, letterSpacing: 1 },
  screenBody: { flex: 1, alignItems: 'center', justifyContent: 'center', zIndex: 2, width: '100%' },
  idleTxt: { color: C.crtText, fontSize: 16, fontFamily: MONO, fontWeight: '700', letterSpacing: 1 },
  caret: { color: C.crtText, opacity: 0.6 },
  idleHint: { color: C.crtDim, fontSize: 11, fontFamily: MONO, marginTop: 8, textAlign: 'center' },
  codeTxt: { color: C.crtDim, fontSize: 11, fontFamily: MONO, letterSpacing: 1, marginVertical: 6 },
  glitchWrap: { width: '100%', height: 26, alignItems: 'center', justifyContent: 'center', position: 'relative' },
  scanName: { color: C.crtText, fontSize: 17, fontFamily: MONO, fontWeight: '700', textAlign: 'center' },
  ghost: { position: 'absolute', opacity: 0.55 },
  barTrack: { width: '80%', height: 6, backgroundColor: C.crtBgDeep, borderRadius: 3, marginTop: 10, overflow: 'hidden' },
  barFill: { height: '100%', backgroundColor: C.crtText, borderRadius: 3 },
  flash: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: '#ffffff', zIndex: 6 },
  slot: { width: '70%', height: 16, backgroundColor: C.surfaceSunken, borderRadius: 8, marginTop: 12, alignItems: 'center', justifyContent: 'center' },
  slotMouth: { width: '86%', height: 5, backgroundColor: C.borderStrong, borderRadius: 3 },

  // --- Teklif/teslimat aşamasında ekran uzar (aynı cihaz, daha büyük ekran) ---
  screenTall: { height: 470, paddingTop: 12 },

  // --- ADIM SAYACI (ekran içi, mint monospace) ---
  stepCounter: { alignItems: 'center', marginBottom: 6 },
  stepWord: { color: C.crtDim, fontSize: 9, fontWeight: '800', letterSpacing: 4, fontFamily: MONO },
  stepNumRow: { flexDirection: 'row', alignItems: 'baseline' },
  // ⚠️ Monospace: 1→5 arasında rakam genişliği değişmediği için sayaç
  // yerinde SABİT kalır, teklif değiştikçe kaymaz.
  stepNum: { color: C.crtText, fontSize: 34, fontWeight: '800', fontFamily: MONO, lineHeight: 38 },
  stepTotal: { color: C.crtDim, fontSize: 16, fontWeight: '800', fontFamily: MONO, marginLeft: 1 },

  dots: { flexDirection: 'row', gap: 6, marginTop: 10 },
  dot: { width: 7, height: 7, borderRadius: 4, backgroundColor: C.crtDim, opacity: 0.45 },
  dotUsed: { opacity: 0.9 },
  dotActive: { backgroundColor: C.crtText, width: 20, opacity: 1 },

  bonusChip: { borderWidth: 1, borderColor: C.crtText, borderRadius: 4, paddingHorizontal: 8, paddingVertical: 3, marginBottom: 6 },
  bonusTxt: { color: C.crtText, fontSize: 9, fontWeight: '800', letterSpacing: 1.5, fontFamily: MONO },

  dispenseStamp: { color: C.crtText, fontSize: 10, fontWeight: '800', letterSpacing: 3, fontFamily: MONO, marginBottom: 8 },
  paidTxt: { color: '#ff8f8f', fontSize: 13, fontWeight: '800', fontFamily: MONO, marginTop: 10 },

  // --- CİHAZ ÜZERİNDEKİ AKSİYONLAR (ekranla aynı blok) ---
  actionBar: { flexDirection: 'row', gap: 10, marginTop: 12, width: '100%', justifyContent: 'center', flexWrap: 'wrap' },
  skipBtn: { borderWidth: 1, borderColor: C.borderStrong, backgroundColor: C.surfaceAlt, paddingHorizontal: 26, paddingVertical: 12, borderRadius: 6 },
  skipBtnTxt: { color: C.textSoft, fontSize: 13, fontWeight: '800', fontFamily: MONO },
  // "Alma / Kapat" — vazgeçme eylemi olduğu için uyarı tonunda ama saldırgan değil.
  declineBtn: { borderWidth: 1, borderColor: C.danger, backgroundColor: C.surface, paddingHorizontal: 22, paddingVertical: 12, borderRadius: 6 },
  declineBtnTxt: { color: C.danger, fontSize: 13, fontWeight: '800', fontFamily: MONO },
  // "Al" butonu ekranın mint rengini kasaya taşır — vurgu tek bir renkten gelir.
  buyBtn: { backgroundColor: C.crtBg, borderWidth: 1, borderColor: C.crtText, paddingHorizontal: 26, paddingVertical: 12, borderRadius: 6 },
  buyBtnTxt: { color: C.crtText, fontSize: 13, fontWeight: '800', fontFamily: MONO }
});

// TEKLİF KARTI STİLLERİ — keskin hatlar (küçük radius), belirgin kutu
// TEKLİF PANELİ — ekranın içinde, ekranın diliyle
const oc = StyleSheet.create({
  panel: {
    width: '100%', maxWidth: 380,
    backgroundColor: C.crtBgDeep,
    borderRadius: 6, borderWidth: 1,
    paddingHorizontal: 14, paddingVertical: 12,
    alignItems: 'center', position: 'relative', overflow: 'hidden'
  },
  topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', width: '100%', gap: 8 },
  wearChip: { borderWidth: 1, paddingHorizontal: 7, paddingVertical: 2, borderRadius: 3 },
  wearChipTxt: { fontSize: 10, fontWeight: '800', letterSpacing: 0.5, fontFamily: MONO },
  stTag: { color: C.warn, fontSize: 9, fontWeight: '800', fontFamily: MONO },
  price: { color: C.crtText, fontSize: 15, fontWeight: '800', fontFamily: MONO },
  img: { width: 190, height: 120, marginTop: 6, marginBottom: 4 },
  name: { fontSize: 14.5, fontWeight: '800', textAlign: 'center', lineHeight: 20 },
  wearFull: { color: C.crtDim, fontSize: 10.5, fontWeight: '700', fontFamily: MONO, marginTop: 2, marginBottom: 10 },
  specs: {
    width: '100%', borderTopWidth: 1, borderTopColor: 'rgba(95, 240, 196, 0.15)',
    paddingTop: 8, gap: 3
  },
  specRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  specLbl: { color: C.crtDim, fontSize: 10, fontWeight: '700', fontFamily: MONO, letterSpacing: 0.5 },
  specVal: { color: C.crtText, fontSize: 10.5, fontWeight: '800', fontFamily: MONO }
});

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 18, paddingVertical: 12 },
  backBtn: { backgroundColor: C.surface, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999, ...shadow.card },
  backText: { color: C.accentDeep, fontSize: 14, fontWeight: '800' },
  walletText: { color: C.success, fontSize: 15, fontWeight: '800' },
  unlimitedText: { color: C.accentDeep, fontSize: 15, fontWeight: '800' },
  statsPanel: { flexDirection: 'row', backgroundColor: C.surface, marginHorizontal: 18, borderRadius: 14, padding: 14, justifyContent: 'space-around', ...shadow.card },
  statBox: { alignItems: 'center' },
  statLbl: { color: C.textDim, fontSize: 10, fontWeight: '700' },
  statVal: { color: C.text, fontSize: 14, fontWeight: '800', marginTop: 4 },
  content: { alignItems: 'center', padding: 20, paddingBottom: 60 },
  terminalName: { color: C.text, fontSize: 20, fontWeight: '800', textAlign: 'center' },
  terminalSub: { color: C.textDim, fontSize: 12, marginTop: 6, marginBottom: 16 },
  errorText: { color: C.danger, fontSize: 13, fontWeight: '700', marginBottom: 12, backgroundColor: C.dangerSoft, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10 },

  startBtn: { backgroundColor: C.accent, paddingVertical: 14, paddingHorizontal: 40, borderRadius: 12, alignItems: 'center', marginTop: 22, ...shadow.card, shadowColor: C.accent, shadowOpacity: 0.4 },
  startBtnTxt: { color: C.onAccent, fontSize: 15, fontWeight: '800', letterSpacing: 0.6 },

  stepHint: { color: C.textDim, fontSize: 11.5, fontWeight: '600', textAlign: 'center', marginTop: 14, maxWidth: 420 },

});
