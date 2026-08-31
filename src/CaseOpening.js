import React, { useState, useRef, useEffect, useMemo } from 'react';
import { StyleSheet, Text, View, Image, TouchableOpacity, SafeAreaView, Animated, Easing, useWindowDimensions, ScrollView, Platform } from 'react-native';
import { generateFloat, getWearFromFloat, formatSignedMoney, generatePattern } from './utils';
import {
  getRealisticPrice, getSouvenirTiers, getCaseTiers, poolForTier, rollTier,
  getContainerPrice, KEY_PRICE_USD, STATTRAK_CHANCE
} from './prices';
import { InlineContentsPanel } from './components/ContentsModal';
import BatchResultPanel from './components/BatchResultPanel';
import { IconCase, IconKey } from './components/Icons';
import Tooltip from './components/Tooltip';
import { useI18n } from './i18n';
import { C, shadow, rarityGlowStyle, hexToRgba, R, clipCut } from './theme';

// react-native-web'de `useNativeDriver: true` desteklenmiyor (konsola "native
// animated module missing" uyarısı basıp JS'e düşüyor) — bu geçiş bazı
// versiyonlarda animasyonun DÜZGÜN OYNAMADAN doğrudan son değere atlamasına
// sebep olabiliyor (bkz. 5x açılış animasyonu bug'ı). Web'de baştan
// `useNativeDriver: false` kullanmak bu belirsizliği ortadan kaldırıyor.
const USE_NATIVE_DRIVER = Platform.OS !== 'web';

const ITEM_WIDTH = 100;
const ITEM_MARGIN = 2; // rouletteItem stilindeki marginHorizontal — aşağıdaki pitch hesabı için KRİTİK
const ITEM_PITCH = ITEM_WIDTH + ITEM_MARGIN * 2; // bir item'ın şerit üzerinde kapladığı GERÇEK yer (104px)
const WINNER_INDEX = 40;
const KEY_PRICE = KEY_PRICE_USD;
// ANİMASYON TEMPOSU: eski 5000ms/1900ms hızlı ve sert duruyordu. Süreler
// uzatılıp uzun bir yavaşlama eğrisi (deceleration) verildi — CS2'deki gibi
// hızlı başlayıp sona doğru belirgin şekilde yavaşlayarak duruyor.
const SPIN_DURATION = 8600;        // tekli açılış
const MINI_SPIN_DURATION = 5200;   // 5x mini çarklar
// Uzun kuyruklu yavaşlama; sonda neredeyse durarak "acaba hangisi?" hissi verir.
const SPIN_EASING = Easing.bezier(0.08, 0.78, 0.08, 1);
const SEQUENTIAL_REVEAL_STEP_MS = 160; // 10x/25x'te her eşyanın teker teker belirme aralığı

// ============================================================
// SEKME (BOUNCE) EFEKTİ — "taş gibi donma" sorununun çözümü
// ============================================================
// Eskiden çark hedefe geldiğinde tek bir Animated.timing bitiyor ve şerit
// ANINDA duruyordu; fiziksel olarak inandırıcı değildi (gerçek bir çarkıfelek
// hedefe oturduğunda momentumu yüzünden hafifçe salınır).
//
// ÇÖZÜM — iki aşamalı hareket:
//   1) timing: hedefin BİRAZ ÖTESİNE git (SPIN_OVERSHOOT px daha kaydır)
//   2) spring: hedefe geri otur — düşük friction sayesinde hedef etrafında
//      1-2 kez hafifçe ileri-geri salınarak (elastic ease-out) durur.
//
// ⚠️ Sekme MİKTARI bilinçli olarak KÜÇÜK (bir item genişliğinin ~1/4'ü).
// Daha büyük bir değer, göstergenin komşu eşyayı işaret ettiği izlenimi
// yaratır ve "kazanan yanlış gösteriliyor" şikâyetine yol açar.
const SPIN_OVERSHOOT = 26;
const MINI_SPIN_OVERSHOOT = 16;
const SETTLE_SPRING = { friction: 4.6, tension: 32 };

// item N'nin şerit başlangıcına göre TAM ORTASININ konumu (soldaki ilk margin dahil).
const centerOfRouletteItem = (n) => ITEM_MARGIN + n * ITEM_PITCH + ITEM_WIDTH / 2;

// (GOLD sabiti artık gerekmiyor — altın kademe prices.js/getCaseTiers'ten gelir)

// ============================================================
// KADEME HAVUZU — artık prices.js'teki `poolForTier` kullanılıyor
// ============================================================
// BUG DÜZELTMESİ (korunuyor): ByMykel verisinde kasanın normal skinleri
// `contains`, bıçak/eldivenleri ise AYRI bir `contains_rare` alanındadır.
// Üstelik `contains_rare` öğelerinin rarity.color'ı '#ffd700' DEĞİL, '#eb4b4b'
// (Covert kırmızısı)'dır. Eski kod altın kademeyi `contains` içinde '#ffd700'
// renginde arıyordu; hiçbir zaman bulamadığı için kasadan ASLA bıçak çıkmıyordu.
//
// ⚠️ 29 AĞU 2026 — İKİNCİ DÜZELTME: Eski `poolForRarity` bir kademede eşya
// bulamazsa `crate.contains`'in TAMAMINA düşüyordu. Bıçağı olmayan bir kutuda
// (ör. Genesis Terminal) bu, %0.26'lık altın dilimin DÜZGÜN DAĞILIMLI bir eşya
// vermesi demekti — Covert dahil. Artık kademe tablosu kutunun içeriğinden
// türetiliyor (getCaseTiers), yani boş kademe hiç çekilemiyor ve o yedeğe
// ihtiyaç kalmıyor. (Aynı hatanın büyük ölçekli hâli Armory'de %1000+ ROI
// üretiyordu — bkz. prices.js kademe merdiveni açıklaması.)

// CS TARZI GÖSTERGE (POINTER)
// Eskiden kazananın etrafına bir ÇERÇEVE/KUTU çiziliyordu; amatör duruyordu.
// Orijinal CS:GO/CS2 unboxing'inde olduğu gibi artık çarkın TAM ÜST-ORTASINDAN
// aşağı bakan tek bir ok var. Kazanan eşya kutunun "içine girmiyor", doğrudan
// bu okun tam altında/hizasında duruyor.
//
// Ok, üçgen olarak border hilesiyle çiziliyor (RN + RN-Web'de çalışan yöntem).
// `size` = üçgenin YARIM genişliği; bu yüzden ortalamak için marginLeft: -size.
const POINTER_SIZE = 11;
const MINI_POINTER_SIZE = 7;

function WinnerPointer({ size = POINTER_SIZE, color = C.accentDeep }) {
  return (
    <View pointerEvents="none" style={[edge.pointerWrap, { marginLeft: -size }]}>
      <View
        style={{
          width: 0,
          height: 0,
          borderLeftWidth: size,
          borderRightWidth: size,
          borderTopWidth: size * 1.3,
          borderLeftColor: 'transparent',
          borderRightColor: 'transparent',
          borderTopColor: color,
          borderStyle: 'solid'
        }}
      />
    </View>
  );
}

// Şeridin sağ/sol uçlarını arka plan rengine yumuşakça eritip "akıp giden"
// eşyaların şık bir opaklıkla kaybolmasını sağlayan kenar efekti.
function EdgeFades({ bg = C.bgAlt, fadeWidth = 50 }) {
  return (
    <>
      <View pointerEvents="none" style={[edge.fade, { left: 0, width: fadeWidth, background: `linear-gradient(to right, ${bg} 25%, ${hexToRgba(bg, 0)} 100%)` }]} />
      <View pointerEvents="none" style={[edge.fade, { right: 0, width: fadeWidth, background: `linear-gradient(to left, ${bg} 25%, ${hexToRgba(bg, 0)} 100%)` }]} />
    </>
  );
}

const edge = StyleSheet.create({
  fade: { position: 'absolute', top: 0, bottom: 0, zIndex: 5 },
  pointerWrap: { position: 'absolute', top: 0, left: '50%', zIndex: 9, alignItems: 'center' }
});

// ============================================================
// NADİRLİK IŞIĞI (RARITY GLOW) — CS2 orijinal drop efekti
// ============================================================
// Eşya kutusunun ALT kısmından yukarı doğru sönümlenerek çıkan, eşyanın
// nadirlik rengindeki ışık. Kart içinde MUTLAK konumlanır ve `pointerEvents`
// kapalıdır — üstündeki butonların tıklanabilirliğini engellemez.
function RarityGlow({ color, height = '38%', strength = 0.85 }) {
  if (!color) return null;
  return <View pointerEvents="none" style={rarityGlowStyle(color, { height, strength })} />;
}

// Çoklu kasa açılışında (5x) her kasa TAMAMEN BAĞIMSIZ kendi rulet şeridine
// sahip — mantığı (drop rate + eşya seçimi) tekli açılışla birebir aynı (bkz.
// rollOneItem). Animasyonun kendisi artık PARENT'ta (openMultiple içinde)
// Animated.parallel ile yönetiliyor; bu bileşen sadece "aptal" bir görsel —
// kendi state'i/animasyonu yok, dışarıdan verilen translateX'i render eder.
// Bu, "5'in de animasyonu senkronize başlayıp senkronize bitmiyor" bug'ını
// kökten çözer: artık TEK BİR Animated.parallel tamamlanma callback'i var.
const MINI_ITEM_WIDTH = 64;
const MINI_ROW_HEIGHT = 78;
const MINI_FINAL_INDEX = 24;

function MiniRoulette({ index, finalItem, pool, rowWidth, translateX }) {
  const stripRef = useRef(null);
  if (!stripRef.current) {
    const safePool = (pool && pool.length > 0) ? pool : [finalItem];
    const pick = () => safePool[Math.floor(Math.random() * safePool.length)] || finalItem;
    // ÖNDEKİ dolgu: kazananın soluna akan item'lar
    const leading = Array.from({ length: MINI_FINAL_INDEX }, pick);
    // ARKADAKİ dolgu (TRAILING FIX): Eskiden şerit `[...filler, finalItem]` ile
    // bitiyordu — yani kazanan EN SON öğeydi ve durduğunda sağında hiçbir şey
    // kalmıyordu, çark sağda boşluğa kesiliyordu. Gerçek CS2'de kazananın hem
    // solunda hem SAĞINDA item akmaya devam eder. Konteynerin sağ yarısını
    // doldurmaya yetecek kadar (+ pay) rastgele item ekliyoruz.
    const trailingNeeded = Math.ceil((rowWidth / 2) / MINI_ITEM_WIDTH) + 3;
    const trailing = Array.from({ length: trailingNeeded }, pick);
    stripRef.current = [...leading, finalItem, ...trailing];
  }

  return (
    <View style={mini.row}>
      <View style={mini.rowLabel}><Text style={mini.rowLabelTxt}>#{index + 1}</Text></View>
      <View style={[mini.container, { width: rowWidth }]}>
        <Animated.View style={[mini.strip, { transform: [{ translateX }] }]}>
          {stripRef.current.map((it, i) => (
            <View key={i} style={mini.item}>
              <Image source={{ uri: it.image }} style={mini.itemImg} resizeMode="contain" />
            </View>
          ))}
        </Animated.View>
        <EdgeFades bg={C.bgAlt} fadeWidth={26} />
        <WinnerPointer size={MINI_POINTER_SIZE} />
      </View>
    </View>
  );
}

const mini = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', width: '100%', marginBottom: 8 },
  rowLabel: { width: 26, alignItems: 'center' },
  rowLabelTxt: { color: C.textDim, fontSize: 11, fontWeight: 'bold' },
  container: { height: MINI_ROW_HEIGHT, backgroundColor: C.bgAlt, overflow: 'hidden', borderRadius: R.md, position: 'relative' },
  strip: { flexDirection: 'row', height: '100%', alignItems: 'center' },
  item: { width: MINI_ITEM_WIDTH, height: MINI_ROW_HEIGHT - 10, justifyContent: 'center', alignItems: 'center' },
  itemImg: { width: 52, height: 52 }
});

// SIRALI BELİRME (Sequential Reveal): 10x/25x açılışlarda eşyalar hepsi birden
// "pat" diye değil, teker teker akıcı bir pop-in ile beliriyor. Her kart kendi
// mount anında bağımsız animasyona başladığı için (parent tarafından tek tek,
// aralıklarla render edilerek mount ettiriliyorlar) sıralama otomatik oluşuyor.
function RevealCard({ item }) {
  const anim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.spring(anim, { toValue: 1, friction: 5, tension: 90, useNativeDriver: USE_NATIVE_DRIVER }).start();
  }, []);
  return (
    <Animated.View style={[styles.batchCard, { borderBottomColor: item.displayColor, opacity: anim, transform: [{ scale: anim }] }]}>
      <RarityGlow color={item.displayColor} height="46%" strength={0.55} />
      {item.isStatTrak && <Text style={styles.stTagSmall}>ST™</Text>}
      <Image source={{ uri: item.image }} style={styles.batchImg} resizeMode="contain" />
      <Text style={styles.batchPrice}>${item.price.toFixed(2)}</Text>
    </Animated.View>
  );
}

// `mode`: 'case' (varsayılan) | 'souvenir'
// Souvenir paketleri kasalarla AYNI çark mekaniğini kullanır; farklar:
//   • Anahtar YOK (maliyet = paketin piyasa fiyatı)
//   • StatTrak YOK (souvenir eşyalarında StatTrak bulunmaz)
//   • Kademeler pakete göre DİNAMİK tespit edilir (bkz. getSouvenirTiers)
export default function CaseOpening({ crate, onBack, balance, setBalance, inventory, setInventory, gameMode, priceMap, onOpen, mode = 'case' }) {
  const { t } = useI18n();
  // ============================================================
  // ANİMASYONU GEÇ (kullanıcı tercihi)
  // ============================================================
  // İşaretliyken 1x ve 5x açılışlar çarkı hiç oynatmadan ANINDA sonuçlanır.
  // Çok sayıda açılış yapan kullanıcı için 8.6 saniyelik çark her seferinde
  // beklemek demekti. 10x/25x zaten çark kullanmıyor (sıralı beliriş).
  //
  // ⚠️ Bu YALNIZCA GÖRSEL bir tercihtir: sonuç zaten çark başlamadan önce
  // belirleniyor (bkz. `rollOneItem` / `winnerData`), dolayısıyla animasyonu
  // atlamak olasılıkları veya ödülü HİÇBİR ŞEKİLDE değiştirmez.
  const [skipAnim, setSkipAnim] = useState(false);
  const [opening, setOpening] = useState(false);
  const [wonItem, setWonItem] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [rouletteItems, setRouletteItems] = useState([]);

  const [sessionSpent, setSessionSpent] = useState(0);
  const [sessionWon, setSessionWon] = useState(0);
  const [sessionOpened, setSessionOpened] = useState(0);

  const [batch, setBatch] = useState(null); // { items, count, spending, totalWon, animated, revealed, miniAnims, rowWidth, sequential }
  const [revealedCount, setRevealedCount] = useState(0);

  const translateX = useRef(new Animated.Value(0)).current;
  const wonFadeAnim = useRef(new Animated.Value(0)).current;
  const wonScaleAnim = useRef(new Animated.Value(0.6)).current;
  const { width } = useWindowDimensions();

  const isSouvenir = mode === 'souvenir';
  // ⚠️ KADEMELER HER İKİ MODDA DA İÇERİKTEN TÜRETİLİR — sabit tablo YOK.
  // Souvenir paketlerinde kademe sayısı pakete göre değişir; kasalarda ise
  // `contains_rare` boşsa altın dilim hiç oluşturulmaz.
  const oddsTable = useMemo(
    () => (isSouvenir ? getSouvenirTiers(crate) : getCaseTiers(crate)),
    [crate, isSouvenir]
  );

  // HİZALAMA DÜZELTMESİ: Kazananı ortalamak için ÇARK KONTEYNERİNİN genişliği
  // gerekir — pencere genişliği DEĞİL. Konteyner `content` stilinin
  // `padding: 20`'si (ve varsa dikey kaydırma çubuğu) yüzünden pencereden dardır.
  // Eski kod `width / 2` (pencere) kullandığı için her açılışta sistematik ~20px
  // kayma oluyordu; buna ±40px jitter eklenince gösterge item'ın kenarına/iki
  // item'ın arasına düşüyordu. Artık gerçek genişliği onLayout ile ölçüyoruz.
  const rouletteWidthRef = useRef(null);
  const getRouletteWidth = () => rouletteWidthRef.current ?? (width - 40); // 40 = content padding (20 sol + 20 sağ)
  // FİYAT ARTIK DİNAMİK: kutunun kendi `market_hash_name`'i canlı fiyat
  // tablosunda aranır; bulunamazsa türe göre gerçekçi bir tabana düşer.
  // ⚠️ KART İLE AÇILIŞ EKRANI AYNI FİYATI KULLANMALI.
  // Piyasada fiyatı bulunamayan kutularda kart, fiyatı içerikten TAHMİN ediyor
  // (prices.resolveContainerCost). Burada yeniden `getContainerPrice` çağırmak
  // sabit $0.50/$2.50 yedeğine düşer ve kart "$1233" derken açılış "$1.00"
  // tahsil ederdi. Bu yüzden önce kartın hesapladığı değeri kullanıyoruz.
  const CASE_PRICE = (isSouvenir ? crate.cost : crate.casePrice)
    ?? getContainerPrice(priceMap, crate, isSouvenir ? 'souvenir' : 'case');
  const TOTAL_COST_PER_OPEN = isSouvenir ? CASE_PRICE : CASE_PRICE + KEY_PRICE;
  const SOURCE_LABEL = isSouvenir ? 'SOUVENIR' : 'CASE';

  // BELLEK SIZINTISI DÜZELTMESİ: bileşen unmount olduktan sonra bu setTimeout'lar
  // (ve Animated'ın tamamlanma callback'i, clearTimeout ile iptal edilemez)
  // ateşlenirse "unmounted component'te state güncelleme" uyarısına/sızıntıya yol
  // açar. Referansları tutup unmount'ta temizliyoruz, isMountedRef ile de
  // Animated callback'lerini koruyoruz.
  const sequentialTimerRef = useRef(null);
  const batchAnimRef = useRef(null);
  const spinAnimRef = useRef(null);
  const isMountedRef = useRef(true);

  // ============================================================
  // ANIMASYON BEKCISI (WATCHDOG) — "esyam hic gelmedi" korumasi
  // ============================================================
  // KOK NEDEN: Kazanilan esyanin ekrana gelmesi, Animated'in TAMAMLANMA
  // callback'ine bagliydi. Ancak `requestAnimationFrame` composite edilmeyen
  // bir sekmede (arka planda acik sekme, bazi gomulu/onizleme ortamlari)
  // TAMAMEN DONABILIYOR — olculdu: saniyede 0 kare. Bu durumda Animated hic
  // ilerlemez, callback HIC atesLENMEZ ve kullanici parasini odedigi halde
  // sonsuza kadar donen (aslinda hic donmeyen) bir carka bakar.
  //
  // COZUM: Sonuc ZATEN cark baslamadan once belirlenmis durumda; animasyon
  // sadece gorsel bir gecikme. Bu yuzden bir "bekci" zamanlayici kuruyoruz:
  // beklenen sureden biraz sonra callback hala atesLENMEDIYSE sonucu kendisi
  // acikliyor. `settledRef` sayesinde ikisinden hangisi once gelirse gelsin
  // sonuc YALNIZCA BIR KEZ islenir (cifte odul/cifte sayac imkansiz).
  //
  // Ayni koruma Terminal ve Kapsul ekranlarinda dogustan var (orada asama
  // gecisleri zaten setTimeout ile suruluyor).
  const settledRef = useRef(false);
  const watchdogRef = useRef(null);

  const clearWatchdog = () => {
    if (watchdogRef.current) { clearTimeout(watchdogRef.current); watchdogRef.current = null; }
  };

  // `fn` en fazla bir kez calisir — Animated callback'i ile bekci yarissa bile.
  const settleOnce = (fn) => {
    if (settledRef.current) return;
    settledRef.current = true;
    clearWatchdog();
    fn();
  };

  useEffect(() => {
    return () => {
      isMountedRef.current = false;
      if (sequentialTimerRef.current) clearTimeout(sequentialTimerRef.current);
      clearWatchdog();
      batchAnimRef.current?.stop();
      spinAnimRef.current?.stop();
    };
  }, []);

  // Nadirlik zarını atıp kademeyi seçer — tekli/çoklu açılışta AYNI fonksiyon.
  // Zar mantığı prices.js'te TEK bir yerde (rollTier) duruyor; kasalar,
  // terminaller, koleksiyonlar ve kapsüller hepsi onu kullanıyor.
  const rollRarity = () => rollTier(oddsTable);

  // Tekli kasa açma mekaniği — MANTIK olduğu gibi korunuyor.
  // Görsel eklemeler: rulet-pitch bug düzeltmesi (bkz. ITEM_PITCH), kenar solma
  // (EdgeFades), üstteki gösterge oku (WinnerPointer), "unboxing" pop-in +
  // nadirlik ışığı ve SEKME (bounce) ile duruş.
  const handleOpenCase = () => {
    if (gameMode === 'wallet' && balance < TOTAL_COST_PER_OPEN) {
      setErrorMsg(t('common.insufficientBalance', { n: TOTAL_COST_PER_OPEN.toFixed(2) }));
      return;
    }
    if (oddsTable.length === 0) {
      setErrorMsg(t('common.contentsUnreadable'));
      return;
    }

    setErrorMsg('');
    if (gameMode === 'wallet') setBalance(prev => prev - TOTAL_COST_PER_OPEN);

    setSessionSpent(prev => prev + TOTAL_COST_PER_OPEN);
    setSessionOpened(prev => prev + 1);
    setOpening(true); setWonItem(null); setBatch(null); translateX.setValue(0);
    wonFadeAnim.setValue(0); wonScaleAnim.setValue(0.6);
    settledRef.current = false; clearWatchdog();
    onOpen?.(crate.id, 1);

    // ŞERİT UZUNLUĞU: kazanan WINNER_INDEX'te durur, ama SAĞINDA da item akmaya
    // devam etmeli (çark boşluğa kesilmemeli). Geniş ekranlarda konteynerin sağ
    // yarısı 9 item'lık sabit kuyruktan uzun olabileceği için gerekli kuyruk
    // uzunluğunu ekran genişliğine göre hesaplıyoruz.
    const trailingNeeded = Math.ceil((getRouletteWidth() / 2) / ITEM_PITCH) + 3;
    const stripLength = Math.max(50, WINNER_INDEX + 1 + trailingNeeded);

    const items = Array.from({ length: stripLength }, () => {
      const selectedRarity = rollRarity();
      const possibleItems = poolForTier(crate, selectedRarity) || crate.contains || [];
      return { item: possibleItems[Math.floor(Math.random() * possibleItems.length)], rarity: selectedRarity };
    });

    // items[WINNER_INDEX] HEM ruletin duracağı görsel hedef HEM DE ekranda
    // "Kazanılan Eşya" olarak gösterilecek veri — TEK bir kaynaktan geliyor,
    // bu yüzden görsel/sonuç arasında ayrışma (desync) MATEMATİKSEL olarak
    // imkansız.
    const winnerData = items[WINNER_INDEX];
    // GERÇEK CS2 KURALI: Souvenir eşyalarında StatTrak YOKTUR.
    const isStatTrak = !isSouvenir && Math.random() < STATTRAK_CHANCE;
    // GERÇEK CS2 KURALI: Her skinin kendine özgü float sınırı vardır (bazı skinler hiç
    // Factory New olamaz, bazıları hiç Battle-Scarred olamaz). Eskiden her eşya için
    // sabit 0.00-1.00 kullanılıyordu — artık eşyanın kendi min_float/max_float'ı kullanılıyor.
    const floatVal = generateFloat(winnerData.item.min_float ?? 0.00, winnerData.item.max_float ?? 1.00);
    const price = getRealisticPrice(priceMap, winnerData.item, floatVal, isStatTrak, winnerData.rarity.name, isSouvenir);

    setRouletteItems(items);
    // DESYNC BUG DÜZELTMESİ: Her rulet öğesinin `marginHorizontal: 2` stili var
    // (bkz. styles.rouletteItem) — yani her item şerit üzerinde 100px değil,
    // GERÇEKTE 104px (ITEM_PITCH) yer kaplıyor. `centerOfRouletteItem` bunu
    // doğru hesaplayarak kazananı DAİMA merkeze (gösterge okunun tam altına) getirir.
    // TAM ORTALAMA: rastgele jitter KALDIRILDI. Gösterge oku konteynerin tam
    // %50'sinde duruyor; en ufak bir sapma bile okun iki item'ın arasını
    // göstermesine yol açardı. Artık kazanan item HER ZAMAN okun tam altında
    // ve tamamen görünür durur.
    const toValue = -centerOfRouletteItem(WINNER_INDEX) + (getRouletteWidth() / 2);

    // SEKME (BOUNCE): önce hedefin biraz ötesine kay, sonra yaylanarak hedefe otur.
    spinAnimRef.current = Animated.sequence([
      Animated.timing(translateX, { toValue: toValue - SPIN_OVERSHOOT, duration: SPIN_DURATION, easing: SPIN_EASING, useNativeDriver: USE_NATIVE_DRIVER }),
      Animated.spring(translateX, { toValue, ...SETTLE_SPRING, useNativeDriver: USE_NATIVE_DRIVER })
    ]);

    // Sonucu aciklayan tek fonksiyon; hem Animated callback'i hem de bekci
    // bunu cagirir, `settleOnce` ikinci cagriyi yutar.
    const reveal = () => {
      if (!isMountedRef.current) return; // bileşen animasyon sırasında unmount olduysa state güncelleme
      const itemToSave = { ...winnerData.item, isStatTrak, isSouvenir, displayColor: winnerData.rarity.color, uid: Date.now().toString(), float: floatVal, wear: getWearFromFloat(floatVal), pattern: generatePattern(), price, source: SOURCE_LABEL, acquiredAt: Date.now() };
      setWonItem(itemToSave);
      setSessionWon(prev => prev + price);
      setOpening(false);

      // UNBOXING FX: nadirlik ışığı (RarityGlow) kartın altından yükselir;
      // burada sadece "pop-in" büyüme + solma animasyonunu tetikliyoruz.
      // NOT: Bu da Animated — donmus bir ortamda oynamayabilir. Bu yuzden
      // opacity/scale degerleri once GUVENLI son degerlerine set ediliyor,
      // animasyon yalnizca oradan geri sarip tekrar oynuyor. Boylece animasyon
      // hic ilerlemese bile kart GORUNUR kalir (opacity 0'da takili kalmaz).
      wonFadeAnim.setValue(1);
      wonScaleAnim.setValue(1);
      Animated.parallel([
        Animated.timing(wonFadeAnim, { toValue: 1, duration: 250, useNativeDriver: USE_NATIVE_DRIVER }),
        Animated.spring(wonScaleAnim, { toValue: 1, friction: 4, tension: 60, useNativeDriver: USE_NATIVE_DRIVER })
      ]).start();
    };

    if (skipAnim) {
      // ANINDA AÇ: şeridi doğrudan son konumuna koy ve sonucu hemen göster.
      // Şerit yine de çizilir (kazanan göstergenin altında durur) — böylece
      // kullanıcı ne çıktığını bağlamıyla birlikte görür, sadece bekleme yok.
      translateX.setValue(toValue);
      settleOnce(reveal);
      return;
    }

    spinAnimRef.current.start(() => settleOnce(reveal));

    // BEKCI: animasyon beklenen sureden ~1.2sn sonra hala bitmediyse
    // (rAF donmus demektir) sonucu biz acikliyoruz.
    clearWatchdog();
    watchdogRef.current = setTimeout(() => {
      watchdogRef.current = null;
      settleOnce(reveal);
    }, SPIN_DURATION + 1200);
  };

  const sellItem = () => {
    if (gameMode === 'wallet') setBalance(prev => prev + wonItem.price);
    setWonItem(null);
  };

  const keepItem = () => {
    setInventory(prev => [...prev, wonItem]);
    setWonItem(null);
  };

  // Tekli açılışla BİREBİR AYNI olasılık/fiyat mantığı — çoklu açılışta her
  // kasa için bağımsız bir kez çalıştırılır.
  const rollOneItem = () => {
    const selectedRarity = rollRarity();
    const possibleItems = poolForTier(crate, selectedRarity) || crate.contains || [];
    const item = possibleItems[Math.floor(Math.random() * possibleItems.length)];
    const isStatTrak = !isSouvenir && Math.random() < STATTRAK_CHANCE;
    const floatVal = generateFloat(item.min_float ?? 0.00, item.max_float ?? 1.00);
    const price = getRealisticPrice(priceMap, item, floatVal, isStatTrak, selectedRarity.name, isSouvenir);
    return { ...item, isStatTrak, isSouvenir, displayColor: selectedRarity.color, uid: Date.now().toString() + Math.random().toString(36).slice(2), float: floatVal, wear: getWearFromFloat(floatVal), pattern: generatePattern(), price, source: SOURCE_LABEL, acquiredAt: Date.now() };
  };

  // ÇOKLU KASA AÇMA:
  //  - 5x -> eş zamanlı 5 BAĞIMSIZ rulet, TEK Animated.parallel ile senkronize başlar/biter.
  //  - 10x/25x -> "Açılıyor..." yerine SIRALI BELİRME (her eşya teker teker pop-in
  //    ile gelir) + sağ üstte "Hemen Göster" ile anında atlanabilir.
  const openMultiple = (count) => {
    const totalCost = TOTAL_COST_PER_OPEN * count;
    if (gameMode === 'wallet' && balance < totalCost) {
      setErrorMsg(t('common.insufficientBalance', { n: totalCost.toFixed(2) }));
      return;
    }
    if (oddsTable.length === 0) {
      setErrorMsg(t('common.contentsUnreadable'));
      return;
    }

    setErrorMsg('');
    if (gameMode === 'wallet') setBalance(prev => prev - totalCost);
    // ÇAKIŞMA (UI STATE) DÜZELTMESİ: Önceki tekli açılışın ekranı (kazanılan eşya
    // kartı VE dondurulmuş büyük rulet şeridi) burada TAMAMEN temizlenmeden yeni
    // bir açılış başlatılırsa, eski görsel üstte "yapışık" kalıyordu. wonItem'a
    // ek olarak rouletteItems'ı da mutlaka sıfırlamamız gerekiyor — aksi halde
    // `rouletteItems.length > 0` koşulu eski 50 öğelik şeridi göstermeye devam eder.
    batchAnimRef.current?.stop();
    spinAnimRef.current?.stop();
    if (sequentialTimerRef.current) { clearTimeout(sequentialTimerRef.current); sequentialTimerRef.current = null; }
    settledRef.current = false; clearWatchdog();
    setWonItem(null); setOpening(false); setRouletteItems([]); translateX.setValue(0);
    onOpen?.(crate.id, count);

    // Her kasa TAMAMEN BAĞIMSIZ hesaplanır: rollOneItem() her çağrıda kendi
    // rastgele nadirlik zarını ve kendi eşya seçimini yapar — birinin sonucu
    // diğerini hiçbir şekilde etkilemez.
    const results = Array.from({ length: count }, () => rollOneItem());
    const totalWon = results.reduce((acc, r) => acc + r.price, 0);
    // `skipAnim` işaretliyse 5x de mini çark oynatmaz, doğrudan sonuç ızgarası gelir.
    const animated = count <= 5 && !skipAnim;

    setSessionSpent(prev => prev + totalCost);
    setSessionOpened(prev => prev + count);
    setSessionWon(prev => prev + totalWon);

    if (animated) {
      // SENKRONİZASYON DÜZELTMESİ: eskiden 5 mini-rulet KENDİ İÇLERİNDE
      // (component mount anında) animasyona başlıyor, sonuç ekranıysa PARENT'ta
      // bağımsız bir setTimeout ile (tahmini bir süre sonra) tetikleniyordu —
      // bu iki zamanlama birbirinden kopuk olduğu için bazen animasyon daha
      // bitmeden sonuç görünüyor ya da tam tersi oluyordu. Artık TEK bir
      // Animated.parallel hem 5 ruleti de aynı anda başlatıyor hem de
      // TAMAMLANMA callback'i üzerinden sonucu gösteriyor — ikisi asla
      // birbirinden kopamaz.
      const rowWidth = Math.min(width - 60, 420);
      const targetX = -(MINI_FINAL_INDEX * MINI_ITEM_WIDTH) + (rowWidth / 2) - (MINI_ITEM_WIDTH / 2);
      const miniAnims = results.map(() => new Animated.Value(0));

      setBatch({ items: results, count, spending: totalCost, totalWon, animated: true, sequential: false, revealed: false, miniAnims, rowWidth });

      // Mini çarklar da SEKEREK durur (tekli açılışla aynı his).
      const timings = miniAnims.map((av, i) =>
        Animated.sequence([
          Animated.timing(av, { toValue: targetX - MINI_SPIN_OVERSHOOT, duration: MINI_SPIN_DURATION, delay: i * 140, easing: SPIN_EASING, useNativeDriver: USE_NATIVE_DRIVER }),
          Animated.spring(av, { toValue: targetX, ...SETTLE_SPRING, useNativeDriver: USE_NATIVE_DRIVER })
        ])
      );
      const revealBatch = () => {
        if (!isMountedRef.current) return;
        setBatch(prev => (prev ? { ...prev, revealed: true } : prev));
      };
      batchAnimRef.current = Animated.parallel(timings);
      batchAnimRef.current.start(() => settleOnce(revealBatch));

      // BEKCI (bkz. tekli acilis): en gec baslayan mini cark
      // (count-1)*140ms gecikmeli basliyor, ona da pay birakiyoruz.
      clearWatchdog();
      watchdogRef.current = setTimeout(() => {
        watchdogRef.current = null;
        settleOnce(revealBatch);
      }, MINI_SPIN_DURATION + (count - 1) * 140 + 1200);
    } else {
      // SIRALI BELİRME: her SEQUENTIAL_REVEAL_STEP_MS'de bir sonraki eşya
      // gösterime girer. "Hemen Göster" bu zamanlayıcıyı iptal edip hepsini
      // anında açığa çıkarır (bkz. instantShowAll).
      // skipAnim: sıralı belirişi de atla — hepsi tek karede görünsün.
      if (skipAnim) {
        setBatch({ items: results, count, spending: totalCost, totalWon, animated: false, sequential: true, revealed: true });
        setRevealedCount(count);
        return;
      }

      setBatch({ items: results, count, spending: totalCost, totalWon, animated: false, sequential: true, revealed: false });
      setRevealedCount(0);
      const step = (i) => {
        if (!isMountedRef.current) return;
        setRevealedCount(i);
        if (i < count) {
          sequentialTimerRef.current = setTimeout(() => step(i + 1), SEQUENTIAL_REVEAL_STEP_MS);
        } else {
          sequentialTimerRef.current = null;
          setBatch(prev => (prev ? { ...prev, revealed: true } : prev));
        }
      };
      sequentialTimerRef.current = setTimeout(() => step(1), SEQUENTIAL_REVEAL_STEP_MS);
    }
  };

  // "Hemen Göster": sıralı belirme animasyonunu atlayıp 10x/25x'in tamamını anında listeler.
  const instantShowAll = () => {
    if (sequentialTimerRef.current) { clearTimeout(sequentialTimerRef.current); sequentialTimerRef.current = null; }
    if (!batch) return;
    setRevealedCount(batch.count);
    setBatch(prev => (prev ? { ...prev, revealed: true } : prev));
  };

  const closeBatch = () => setBatch(null);

  const keepAllBatch = () => {
    setInventory(prev => [...prev, ...batch.items]);
    setBatch(null);
  };

  // ⚠️ `batch.totalWon` DEĞİL, KALAN eşyaların toplamı kullanılır: kullanıcı
  // aradan tek tek satış yapmış olabilir; ilk açılıştaki toplamı ödemek
  // satılan eşyaların parasını İKİ KEZ verirdi.
  const sellAllBatch = () => {
    const remaining = batch.items.reduce((a, it) => a + (it.price || 0), 0);
    if (gameMode === 'wallet') setBalance(prev => prev + remaining);
    setBatch(null);
  };

  // TEKLİ SATIŞ (hover): eşya ızgaradan çıkar, parası bakiyeye eklenir.
  const sellOneFromBatch = (item) => {
    if (gameMode === 'wallet') setBalance(prev => prev + (item.price || 0));
    setBatch(prev => {
      if (!prev) return prev;
      const items = prev.items.filter(i => i.uid !== item.uid);
      return items.length === 0 ? null : { ...prev, items };
    });
  };

  // SEÇİLENLERİ ENVANTERE GÖNDER: yalnızca işaretlenenler aktarılır, kalanlar
  // ekranda durur (kullanıcı beğenmediklerini sonra tek tuşla satabilsin).
  const keepSelectedFromBatch = (selectedItems) => {
    const uids = selectedItems.map(i => i.uid);
    setInventory(prev => [...prev, ...selectedItems]);
    setBatch(prev => {
      if (!prev) return prev;
      const items = prev.items.filter(i => !uids.includes(i.uid));
      return items.length === 0 ? null : { ...prev, items };
    });
  };

  // TEKRARDAN AÇ: aynı kutuyu AYNI adetle yeniden açar.
  // ⚠️ Panel ÖNCEDEN KAPATILMAZ: yeni açılış "yetersiz bakiye" ile reddedilirse
  // kullanıcı eldeki eşyaları da kaybederdi. Başarılı açılış batch'i kendisi değiştirir.
  const reopenBatch = () => {
    const n = batch?.count || 1;
    if (n === 1) handleOpenCase(); else openMultiple(n);
  };

  const netProfit = sessionWon - sessionSpent;
  const batchNetProfit = batch ? batch.totalWon - batch.spending : 0;

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

      <ScrollView contentContainerStyle={[styles.content, batch && styles.contentCompact]}>
        {/* LAYOUT DÜZELTMESİ: batch (5x/10x/25x) aktifken büyük kasa görseli +
            maliyet dökümü + ROI paneli kaldırılıp tek satırlık kompakt bir
            başlığa iniyor — böylece açılış/sonuç alanı sayfanın çok daha
            üstünde, kompakt ve rahat okunabilir kalıyor. */}
        {!batch ? (
          <>
            <View style={styles.crateStage}>
              <Image source={{ uri: crate.image }} style={styles.crateImage} resizeMode="contain" />
            </View>
            <Text style={styles.crateName}>{crate.name}</Text>
            {/* ============================================================
                FİYAT DÖKÜMÜ — kutunun hemen altında, AYRI AYRI
                ============================================================
                Eskiden tek satırlık küçük gri bir metindi ("Kasa $0.24 +
                Anahtar $2.50") ve toplam da açma butonunun üzerinde
                tekrarlanıyordu. Kullanıcı hangi rakamın ne olduğunu
                ayırt edemiyordu. Artık her kalem kendi satırında, kendi
                CS2 ikonuyla ve okunaklı puntoda. */}
            <View style={styles.priceRow}>
              <View style={styles.priceItem}>
                <IconCase size={16} color={C.textSoft} />
                <Text style={styles.priceLbl}>{isSouvenir ? t('case.priceSouvenir') : t('case.priceCase')}</Text>
                <Text style={styles.priceVal}>${CASE_PRICE.toFixed(2)}</Text>
              </View>
              {!isSouvenir && (
                <>
                  <View style={styles.priceSep} />
                  <View style={styles.priceItem}>
                    <IconKey size={16} color={C.textSoft} />
                    <Text style={styles.priceLbl}>{t('case.priceKey')}</Text>
                    <Text style={styles.priceVal}>${KEY_PRICE.toFixed(2)}</Text>
                  </View>
                </>
              )}
            </View>

            {crate.expectedReturn != null && (
              <View style={styles.roiPanel}>
                {/* Metriklerin ne anlama geldiği hover'da açıklanıyor. */}
                <Tooltip text={t('tip.ev')} style={styles.roiBox}>
                  <Text style={styles.roiLbl}>{t('common.expectedValue')}</Text>
                  <Text style={styles.roiVal}>${crate.expectedReturn.toFixed(2)}</Text>
                </Tooltip>
                <View style={styles.roiDivider} />
                <Tooltip text={t('tip.roi')} style={styles.roiBox}>
                  <Text style={styles.roiLbl}>{t('common.roi')}</Text>
                  <Text style={[styles.roiVal, { color: crate.roi >= 100 ? C.success : C.danger }]}>%{crate.roi.toFixed(1)}</Text>
                </Tooltip>
                <View style={styles.roiDivider} />
                <Tooltip text={t('tip.maxWin')} style={styles.roiBox}>
                  <Text style={styles.roiLbl}>{t('common.maxWin')}</Text>
                  <Text style={[styles.roiVal, { color: C.gold }]}>${crate.maxProfit.toFixed(2)}</Text>
                </Tooltip>
              </View>
            )}
          </>
        ) : (
          <View style={styles.compactHeader}>
            <Image source={{ uri: crate.image }} style={styles.compactCrateImg} resizeMode="contain" />
            <Text style={styles.compactCrateName} numberOfLines={1}>{crate.name}</Text>
          </View>
        )}

        {errorMsg !== '' && <Text style={styles.errorText}>{errorMsg}</Text>}

        {rouletteItems.length > 0 && (
          <View
            style={styles.rouletteContainer}
            onLayout={e => { rouletteWidthRef.current = e.nativeEvent.layout.width; }}
          >
            <Animated.View style={[styles.rouletteSlider, { transform: [{ translateX }] }]}>
              {rouletteItems.map((data, index) => (
                <View key={index} style={[styles.rouletteItem, { borderBottomColor: data.rarity.color }]}>
                  {/* Şerit üzerindeki her eşyada da nadirlik ışığı var —
                      çark dönerken renkler akıp gidiyor (CS2'deki gibi). */}
                  <RarityGlow color={data.rarity.color} height="30%" strength={0.4} />
                  <Image source={{ uri: data.item.image }} style={styles.rouletteImage} resizeMode="contain" />
                </View>
              ))}
            </Animated.View>
            <EdgeFades bg={C.bgAlt} fadeWidth={70} />
            <WinnerPointer />
          </View>
        )}

        {wonItem && !opening && (
          <Animated.View
            style={[
              styles.wonContainer,
              { shadowColor: wonItem.displayColor, opacity: wonFadeAnim, transform: [{ scale: wonScaleAnim }] }
            ]}
          >
            {/* NADİRLİK IŞIĞI: kartın alt kısmından yukarı doğru sönümlenerek çıkar. */}
            <RarityGlow color={wonItem.displayColor} height="34%" strength={0.9} />
            <Text style={styles.priceTag}>${wonItem.price.toFixed(2)}</Text>
            {wonItem.isStatTrak && <Text style={styles.statTrakText}>StatTrak™</Text>}
            <Image source={{ uri: wonItem.image }} style={styles.wonImage} resizeMode="contain" />
            <Text style={[styles.wonItemName, { color: wonItem.displayColor }]}>{wonItem.name}</Text>
            <Text style={styles.wearText}>{wonItem.wear} ({wonItem.float.toFixed(4)})</Text>

            <View style={styles.actionRow}>
              <TouchableOpacity style={styles.keepBtn} onPress={keepItem}>
                <Text style={styles.btnTxt}>{t('common.keep')}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.sellBtn} onPress={sellItem}>
                <Text style={styles.btnTxt}>{t('common.sellNow', { n: wonItem.price.toFixed(2) })}</Text>
              </TouchableOpacity>
            </View>
          </Animated.View>
        )}

        {/* ÇOKLU AÇILIŞ SONUÇLARI */}
        {batch && (
          <View style={styles.batchContainer}>
            {/* ⚠️ Açılış BİTTİĞİNDE bu başlık basılmaz — BatchResultPanel kendi
                başlığını taşıyor, ikisi birlikte aynı satırı iki kez gösterirdi. */}
            <View style={[styles.batchHeaderRow, batch.revealed && { display: 'none' }]}>
              <Text style={styles.batchTitle}>
                {batch.sequential
                  ? t('case.batchSequential', { n: batch.count, done: revealedCount, total: batch.count })
                  : t('case.batchOpening', { n: batch.count })}
              </Text>
              {/* "HEMEN GÖSTER" (Instant Show): sadece sıralı belirme sürerken görünür */}
              {batch.sequential && !batch.revealed && (
                <TouchableOpacity style={styles.instantShowBtn} onPress={instantShowAll}>
                  <Text style={styles.instantShowTxt}>{t('case.instantShow')}</Text>
                </TouchableOpacity>
              )}
            </View>

            {batch.animated && !batch.revealed && (
              <View style={styles.miniGrid}>
                {batch.items.map((it, i) => (
                  <MiniRoulette key={it.uid} index={i} finalItem={it} pool={crate.contains} rowWidth={batch.rowWidth} translateX={batch.miniAnims[i]} />
                ))}
              </View>
            )}

            {batch.sequential && !batch.revealed && (
              <View style={styles.batchGrid}>
                {batch.items.slice(0, revealedCount).map(it => <RevealCard key={it.uid} item={it} />)}
                {Array.from({ length: batch.count - revealedCount }).map((_, i) => (
                  <View key={`placeholder-${i}`} style={styles.batchPlaceholder} />
                ))}
              </View>
            )}

            {batch.revealed && (
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
                onClose={closeBatch}
              />
            )}
          </View>
        )}

        {!opening && !wonItem && !batch && (
          <>
            {/* ⚠️ TOPLAM FİYAT BUTONDAN KALDIRILDI: fiyatlar artık kutunun
                hemen altında ayrı ayrı yazıyor (yukarı bakın). Butonun üzerinde
                iki satır olması hem okunurluğu düşürüyor hem de aynı bilgiyi
                iki kez gösteriyordu. */}
            <TouchableOpacity style={styles.openBtn} onPress={handleOpenCase}>
              <Text style={styles.openBtnTxt}>{isSouvenir ? t('case.openPackage') : t('case.openCase')}</Text>
            </TouchableOpacity>

            {/* ANİMASYONU GEÇ — 1x ve 5x için */}
            <TouchableOpacity
              style={styles.skipRow}
              onPress={() => setSkipAnim(v => !v)}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: skipAnim }}
            >
              <View style={[styles.checkbox, skipAnim && styles.checkboxOn]}>
                {skipAnim && <Text style={styles.checkboxMark}>✓</Text>}
              </View>
              <View style={{ flexShrink: 1 }}>
                <Text style={styles.skipLabel}>{t('case.skipAnim')}</Text>
                <Text style={styles.skipHint}>{t('case.skipAnimHint')}</Text>
              </View>
            </TouchableOpacity>

            <Text style={styles.multiLabel}>{t('common.multiOpen')}</Text>
            <View style={styles.multiRow}>
              {[5, 10, 25].map(n => (
                <TouchableOpacity key={n} style={styles.multiBtn} onPress={() => openMultiple(n)}>
                  <Text style={styles.multiBtnTxt}>{t('common.openX', { n })}</Text>
                  <Text style={styles.multiBtnPrice}>${(TOTAL_COST_PER_OPEN * n).toFixed(2)}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* İÇERİK ÖNİZLEMESİ: "Kasayı Aç" butonunun hemen altında, kutudan
                çıkabilecek TÜM eşyalar fotoğraf + isim + çıkma oranı + fiyat
                aralığı ile listelenir. Kullanıcı hiçbir yere tıklamak zorunda değil. */}
            <InlineContentsPanel subject={crate} kind={isSouvenir ? 'souvenir' : 'case'} priceMap={priceMap} />
          </>
        )}

      </ScrollView>
    </SafeAreaView>
  );
}

const CASE_MONO = 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace';

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 18, paddingVertical: 12 },
  backBtn: { backgroundColor: C.surface, paddingHorizontal: 14, paddingVertical: 8, borderRadius: R.pill, ...shadow.card },
  backText: { color: C.accentDeep, fontSize: 14, fontWeight: '800' },
  balanceText: { color: C.success, fontSize: 15, fontWeight: '800' },
  unlimitedText: { color: C.accentDeep, fontSize: 15, fontWeight: '800' },
  statsPanel: { flexDirection: 'row', backgroundColor: C.surface, marginHorizontal: 18, borderRadius: R.md, padding: 14, justifyContent: 'space-between', ...shadow.card },
  statBox: { alignItems: 'center' },
  statLbl: { color: C.textDim, fontSize: 10, fontWeight: '700', letterSpacing: 0.3 },
  statVal: { color: C.text, fontSize: 14, fontWeight: '800', marginTop: 4 },
  content: { alignItems: 'center', padding: 20, paddingBottom: 60 },
  contentCompact: { paddingTop: 12 },
  crateStage: { width: 140, height: 140, alignItems: 'center', justifyContent: 'center', backgroundColor: C.surface, borderRadius: R.lg, marginTop: 6, ...shadow.card },
  crateImage: { width: 110, height: 110 },
  crateName: { color: C.text, fontSize: 20, fontWeight: '800', marginTop: 14, textAlign: 'center' },
  // --- FİYAT DÖKÜMÜ (kasa + anahtar) ---
  priceRow: {
    flexDirection: 'row', alignItems: 'center', gap: 14, marginTop: 10, marginBottom: 16,
    backgroundColor: C.surface, borderWidth: 1, borderColor: C.border, borderRadius: 4,
    paddingHorizontal: 16, paddingVertical: 10, flexWrap: 'wrap', justifyContent: 'center'
  },
  priceItem: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  priceLbl: { color: C.textSoft, fontSize: 12.5, fontWeight: '700' },
  priceVal: { color: C.success, fontSize: 14, fontWeight: '800', fontFamily: CASE_MONO },
  priceSep: { width: 1, height: 20, backgroundColor: C.border },
  compactHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10, backgroundColor: C.surface, paddingHorizontal: 14, paddingVertical: 8, borderRadius: R.pill, ...shadow.card },
  compactCrateImg: { width: 32, height: 32 },
  compactCrateName: { color: C.text, fontSize: 13, fontWeight: '700', flexShrink: 1 },
  roiPanel: { flexDirection: 'row', backgroundColor: C.surface, borderRadius: R.md, paddingVertical: 12, paddingHorizontal: 18, marginBottom: 18, alignItems: 'center', gap: 18, ...shadow.card },
  roiBox: { alignItems: 'center' },
  roiDivider: { width: 1, height: 26, backgroundColor: C.border },
  roiLbl: { color: C.textDim, fontSize: 9, fontWeight: '700' },
  roiVal: { color: C.text, fontSize: 14, fontWeight: '800', marginTop: 3 },
  errorText: { color: C.danger, fontSize: 13, fontWeight: '700', marginBottom: 10, backgroundColor: C.dangerSoft, paddingHorizontal: 14, paddingVertical: 8, borderRadius: R.md },
  rouletteContainer: { width: '100%', height: 128, backgroundColor: C.bgAlt, overflow: 'hidden', marginVertical: 20, borderRadius: R.md, position: 'relative' },
  rouletteSlider: { flexDirection: 'row', height: '100%', alignItems: 'center' },
  rouletteItem: { width: ITEM_WIDTH, height: 102, justifyContent: 'center', alignItems: 'center', backgroundColor: C.surface, marginHorizontal: ITEM_MARGIN, borderRadius: R.md, borderBottomWidth: 4, overflow: 'hidden', ...shadow.card },
  rouletteImage: { width: 80, height: 78 },
  wonContainer: {
    alignItems: 'center', marginVertical: 12, padding: 24, backgroundColor: C.surface, borderRadius: R.lg, minWidth: 260, overflow: 'hidden',
    shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.35, shadowRadius: 30, elevation: 16
  },
  priceTag: { position: 'absolute', top: 14, right: 16, color: C.success, fontSize: 17, fontWeight: '800' },
  statTrakText: { color: C.warn, fontWeight: '800', marginBottom: 6, fontSize: 12 },
  wonImage: { width: 170, height: 120 },
  wonItemName: { fontSize: 17, fontWeight: '800', marginTop: 12, textAlign: 'center' },
  wearText: { color: C.textDim, fontSize: 12, marginTop: 6, fontWeight: '600' },
  actionRow: { flexDirection: 'row', gap: 10, marginTop: 18, flexWrap: 'wrap', justifyContent: 'center' },
  sellBtn: { backgroundColor: C.success, paddingHorizontal: 18, paddingVertical: 12, borderRadius: R.md },
  keepBtn: { backgroundColor: C.accent, paddingHorizontal: 18, paddingVertical: 12, borderRadius: R.md },
  btnTxt: { color: C.onAccent, fontWeight: '800', fontSize: 13 },
  // ⚠️ KESİK KÖŞE (clip-path): yalnızca web + taktiksel temada. `clipCut`
  // kutunun DIŞINA taşan her şeyi keser, bu yüzden SADECE içeriği kendi içinde
  // kapalı öğelerde (butonlar) kullanılır — tooltip veya açılır liste barındıran
  // kaplara UYGULANMAZ.
  openBtn: { backgroundColor: C.accent, paddingVertical: 14, paddingHorizontal: 46, borderRadius: R.md, alignItems: 'center', marginTop: 8, ...shadow.card, shadowColor: C.accent, shadowOpacity: 0.4, ...clipCut(12) },
  openBtnTxt: { color: C.onAccent, fontSize: 16, fontWeight: '800', letterSpacing: 0.6 },
  openBtnPrice: { color: C.onAccent, fontSize: 13, marginTop: 3, opacity: 0.9, fontWeight: '600' },
  // --- ANİMASYONU GEÇ ---
  skipRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 16,
    backgroundColor: C.surface, borderWidth: 1, borderColor: C.border,
    borderRadius: R.md, paddingHorizontal: 14, paddingVertical: 10, maxWidth: 340
  },
  checkbox: {
    width: 20, height: 20, borderRadius: 4,
    borderWidth: 2, borderColor: C.borderStrong,
    alignItems: 'center', justifyContent: 'center', backgroundColor: C.surface
  },
  checkboxOn: { backgroundColor: C.accent, borderColor: C.accent },
  checkboxMark: { color: C.onAccent, fontSize: 12, fontWeight: '900', lineHeight: 14 },
  skipLabel: { color: C.text, fontSize: 13, fontWeight: '800' },
  skipHint: { color: C.textDim, fontSize: 10.5, marginTop: 1 },

  multiLabel: { color: C.textDim, fontSize: 11, fontWeight: '700', marginTop: 20, marginBottom: 8 },
  multiRow: { flexDirection: 'row', gap: 10, flexWrap: 'wrap', justifyContent: 'center' },
  multiBtn: { backgroundColor: C.surface, paddingVertical: 10, paddingHorizontal: 18, borderRadius: R.md, alignItems: 'center', ...shadow.card },
  multiBtnTxt: { color: C.accentDeep, fontSize: 14, fontWeight: '800' },
  multiBtnPrice: { color: C.textDim, fontSize: 11, marginTop: 2, fontWeight: '600' },
  batchContainer: { width: '100%', alignItems: 'center', marginTop: 6 },
  batchHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', width: '100%', marginBottom: 12, gap: 8 },
  batchTitle: { color: C.text, fontSize: 14, fontWeight: '800', flexShrink: 1 },
  instantShowBtn: { backgroundColor: C.accentSoft, paddingHorizontal: 12, paddingVertical: 7, borderRadius: R.pill },
  instantShowTxt: { color: C.accentDeep, fontSize: 11, fontWeight: '800' },
  miniGrid: { flexDirection: 'column', alignItems: 'center', width: '100%' },
  batchGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 10, width: '100%' },
  batchCard: { width: 76, backgroundColor: C.surface, borderRadius: R.md, borderBottomWidth: 3, alignItems: 'center', padding: 6, position: 'relative', overflow: 'hidden', ...shadow.card },
  batchPlaceholder: { width: 76, height: 82, borderRadius: R.md, backgroundColor: C.surfaceSunken },
  batchImg: { width: 58, height: 46, marginTop: 6 },
  batchPrice: { color: C.success, fontSize: 10, fontWeight: '800', marginTop: 4 },
  stTagSmall: { position: 'absolute', top: 4, left: 5, color: C.warn, fontSize: 8, fontWeight: '800', zIndex: 2 },
  batchSummary: { flexDirection: 'row', backgroundColor: C.surface, borderRadius: R.md, padding: 14, justifyContent: 'space-around', width: '100%', marginTop: 18, ...shadow.card },
  batchCloseTxt: { color: C.textDim, fontSize: 12, marginTop: 14, textDecorationLine: 'underline' }
});
