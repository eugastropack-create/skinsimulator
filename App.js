import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text, View, TouchableOpacity, SafeAreaView, FlatList, Image, ActivityIndicator, TextInput, Platform, useWindowDimensions } from 'react-native';
import { useState, useEffect, useMemo, useRef, useCallback } from 'react';

import CaseOpening from './src/CaseOpening';
import ArmoryOpening from './src/ArmoryOpening';
import TradeUpScreen from './src/TradeUpScreen';
import TerminalOpening from './src/TerminalOpening';
import CapsuleOpening from './src/CapsuleOpening';
import BlogScreen from './src/BlogScreen';
import { fetchCrates, fetchKeychains, fetchCollections, fetchStickerCapsules, fetchSouvenirPackages, fetchTerminals } from './src/api';
import {
  fetchLivePrices, calculateCaseStats, calculateArmoryStats, calculateCharmStats,
  calculateStickerStats, calculateSouvenirStats, calculateTerminalStats,
  getContainerPrice
} from './src/prices';
import { ACTIVE_ARMORY_COLLECTION_NAMES } from './src/armoryData';
import { useToast, ToastBanner } from './src/components/Toast';
import ConfirmModal from './src/components/ConfirmModal';
import ContentsModal from './src/components/ContentsModal';
import ItemInspectModal from './src/components/ItemInspectModal';
import SellConfirmModal from './src/components/SellConfirmModal';
import HoverCard from './src/components/HoverCard';
import { StarIcon, DollarIcon, ValuePill, STAR_GREEN } from './src/components/Icons';
import LanguageSwitcher from './src/components/LanguageSwitcher';
import Disclaimer from './src/components/Disclaimer';
import { I18nProvider, useI18n } from './src/i18n';
import { C, shadow, webTransition } from './src/theme';

// ============================================================
// ARMORY ÖZEL EŞYASI (Limited Edition Item)
// ============================================================
// Gerçek CS2'de Armory'nin "Limited Edition Item" slotu, 25 kredi (yıldız)
// karşılığında GARANTİLİ, tek bir özel silah verir. ByMykel verisinde bu slot
// gerçekten "Limited Edition Item" adlı bir koleksiyon olarak mevcut ve içinde
// Desert Eagle | Heat Treated bulunuyor — yani kart tamamen canlı/gerçek veriye
// dayanıyor, uydurma bir eşya değil.
//
// NOT: Buradaki eski "rastgele AK-47 seç" mantığı (AK-47 | Vulcan) kaldırıldı;
// o yaklaşım gerçek Armory kataloğuna dayanmıyordu ve her veri güncellemesinde
// farklı bir silah seçebiliyordu.
const LIMITED_EDITION_COLLECTION = 'limited edition item';
const SPECIAL_ITEM_NAME = 'Desert Eagle | Heat Treated';

// ============================================================
// ANA NAVİGASYON — SIRA KULLANICI BRIEF'İNDE SABİTLENMİŞTİR
// ============================================================
// Trade Up | Cases | Terminals | Armory | Souvenirs | Stickers
// Bu sırayı DEĞİŞTİRMEYİN; referans alınan modern simülatörlerin (case.oki.gg
// vb.) menü hiyerarşisiyle bilinçli olarak hizalandı.
//
// Envanter bilerek bu menüde DEĞİL: menü sırası birebir korunsun diye üst
// yardımcı çubukta ayrı bir buton olarak duruyor.
// Etiketler ARTIK sabit metin değil, i18n ANAHTARIDIR — dil değişince menü de
// çevrilir. Sıra yine değişmez.
const NAV_TABS = [
  { key: 'tradeup',   labelKey: 'nav.tradeup' },
  { key: 'cases',     labelKey: 'nav.cases' },
  { key: 'terminals', labelKey: 'nav.terminals' },
  { key: 'armory',    labelKey: 'nav.armory' },
  { key: 'souvenirs', labelKey: 'nav.souvenirs' },
  { key: 'stickers',  labelKey: 'nav.stickers' }
];

// Hangi sekme hangi veri listesini ve hangi açılış ekranını kullanıyor.
const TAB_KIND = { cases: 'case', terminals: 'terminal', armory: 'armory', souvenirs: 'souvenir', stickers: 'sticker' };

const KIND_BADGE = {
  case:     { labelKey: 'kind.case',     color: '#e8a33d' },
  terminal: { labelKey: 'kind.terminal', color: '#2fb5a8' },
  armory:   { labelKey: 'kind.armory',   color: '#8b6ce0' },
  souvenir: { labelKey: 'kind.souvenir', color: '#d98d1f' },
  sticker:  { labelKey: 'kind.sticker',  color: '#e0679b' },
  charm:    { labelKey: 'kind.charm',    color: '#38a3f1' }
};

// ENVANTER SIRALAMA SEÇENEKLERİ
// "En iyi float" = düşükten yükseğe (0.00 en iyidir), "en kötü" tersi.
const INVENTORY_SORTS = [
  { key: 'newest',    labelKey: 'inv.sortNewest' },
  { key: 'priceDesc', labelKey: 'inv.sortPriceDesc' },
  { key: 'priceAsc',  labelKey: 'inv.sortPriceAsc' },
  { key: 'floatAsc',  labelKey: 'inv.sortFloatAsc' },
  { key: 'floatDesc', labelKey: 'inv.sortFloatDesc' }
];

const LIST_SORT_OPTIONS = [
  { key: 'default',   labelKey: 'sort.default' },
  { key: 'roi',       labelKey: 'sort.roi' },
  { key: 'expensive', labelKey: 'sort.expensive' },
  { key: 'cheap',     labelKey: 'sort.cheap' },
  { key: 'popular',   labelKey: 'sort.popular' }
];

// En fazla kaç canlı arama sonucu gösterilecek (liste uzayınca kullanılamaz olur).
const SEARCH_RESULT_LIMIT = 8;

// ============================================================
// LOGO GORSELI
// ============================================================
// Kaynak logonun koyu firçalanmis metal arka plani kaldirilip saydam PNG'ye
// cevrildi (bkz. gacas.md — arka plan gri/chroma~0, yazi doygun oldugu icin
// "renklilik" maskesiyle ayristirildi). Sadece yazi kaldi.
//
// ⚠️ EN/BOY ORANI SABIT: Gorsel cok genis bir serit (1100x112). Yuksekligi
// genislikten TURETIYORUZ; ikisini birden sabit vermek gorseli ezer.
const LOGO_SRC = require('./assets/logo-skinsimulator.png');
const LOGO_ASPECT = 9.82; // 1100 / 112

// ============================================================
// KÖK BİLEŞEN
// ============================================================
// `App` yalnızca i18n sağlayıcısını kurar; asıl uygulama `AppShell` içindedir.
// Bunun sebebi teknik: `useI18n()` ancak <I18nProvider> ALTINDA çalışır — aynı
// bileşen hem sağlayıcı olup hem de kendi context'ini tüketemez.
export default function App() {
  return (
    <I18nProvider>
      <AppShell />
    </I18nProvider>
  );
}

function AppShell() {
  const { t } = useI18n();
  const [tab, setTab] = useState('cases');
  const [gameMode, setGameMode] = useState('wallet');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchFocused, setSearchFocused] = useState(false);

  const [balance, setBalance] = useState(150.00);
  const [stars, setStars] = useState(0);
  const [inventory, setInventory] = useState([]);

  const [crates, setCrates] = useState([]);
  const [terminals, setTerminals] = useState([]);
  const [souvenirs, setSouvenirs] = useState([]);
  const [stickers, setStickers] = useState([]);
  const [collections, setCollections] = useState([]);
  const [allCollectionsRaw, setAllCollectionsRaw] = useState([]);
  const [priceMap, setPriceMap] = useState(null);
  const [loadingData, setLoadingData] = useState(true);

  // TEK AÇILIŞ HEDEFİ: { kind, subject }. Eskiden her tür için ayrı bir state
  // (selectedCrate / selectedCollection) vardı; tür sayısı 5'e çıkınca bu
  // dağınıklaşıyor ve "geri dön" mantığı her yerde tekrarlanıyordu.
  const [openTarget, setOpenTarget] = useState(null);

  const [listSortMode, setListSortMode] = useState('default');
  const [openCounts, setOpenCounts] = useState({});
  const [tradeUpHistory, setTradeUpHistory] = useState([]);
  const [clearInvConfirmOpen, setClearInvConfirmOpen] = useState(false);
  const [resetAllConfirmOpen, setResetAllConfirmOpen] = useState(false);
  const [contentsModal, setContentsModal] = useState(null); // { subject, kind }
  // Envanter: sıralama, çoklu seçim, inceleme modalı ve Trade-Up'a aktarım
  const [invSort, setInvSort] = useState('newest');
  const [selectMode, setSelectMode] = useState(false);
  const [selectedUids, setSelectedUids] = useState([]);
  const [inspectItem, setInspectItem] = useState(null);
  const [pendingTradeUpItem, setPendingTradeUpItem] = useState(null);
  const [hoveredUid, setHoveredUid] = useState(null);
  // Satış onayı: { items: [...], total } — hem tekli hem toplu satış buradan geçer.
  const [sellRequest, setSellRequest] = useState(null);
  // SANAL BAKİYE: Sınırsız Mod'da yapılan satışlar gerçek bakiyeye yazılmaz;
  // kullanıcı yine de ne kadar "kazandığını" görebilsin diye ayrı tutuluyor.
  const [sandboxEarnings, setSandboxEarnings] = useState(0);
  const { toast, showToast } = useToast();

  const { width } = useWindowDimensions();
  // RESPONSIVE GRID: FlatList'in numColumns'u değiştiğinde listeyi yeniden
  // monte etmek GEREKİR (RN kısıtı) — bu yüzden aşağıda `key={numCols}` var.
  const numCols = width >= 1180 ? 4 : width >= 860 ? 3 : width >= 560 ? 2 : 1;
  const isNarrow = width < 720;
  // KOMPAKT KABUK: bir kutu acildiginda logo/reklam alani gizlenir.
  const compact = !!openTarget;

  // ============================================================
  // KAYDIRMAYA BAĞLI ÜST MENÜ — DOM SÜRÜCÜLÜ, YUMUŞATILMIŞ
  // ============================================================
  // İlerleme tek kaynaktan gelir:  p = clamp(scrollY / SHRINK_RANGE, 0, 1)
  //
  // ⚠️ NEDEN REACT STATE DEĞİL, DOĞRUDAN DOM YAZIMI:
  // Önceki sürüm her scroll olayında `setState` çağırıyordu; bu, kaydırma
  // boyunca saniyede ~60 React render'ı demekti ve hareket takılıyordu
  // ("daha akıcı olsun" geri bildiriminin kaynağı buydu). Artık scroll
  // olayında hiç render yapılmıyor: değerler `requestAnimationFrame` ile
  // toplanıp doğrudan DOM düğümlerine yazılıyor. Sonuç, tarayıcının kendi
  // kaydırma karesiyle birebir senkron.
  //
  // ⚠️ HÂLÂ `transition` YOK: geçiş süresi eklemek animasyonu kaydırmanın
  // GERİSİNDE bırakır ve "lastikli" hissettirir. Yumuşaklık easing'den gelir,
  // gecikmeden değil.
  //
  // EASING (premium his):
  //   smoothstep(x) = x²(3−2x)  → başta ve sonda yavaş, ortada hızlı.
  //   • yükseklik/ölçek : smoothstep(p)
  //   • opaklık         : ilk %72'de biter (yazı, kutu kapanmadan ÖNCE silinsin
  //                       ki "ezilen metin" görünmesin)
  //   • mini logo       : %35'ten sonra belirir (önce büyük başlık çekilir,
  //                       SONRA küçük marka gelir — üst üste binmez)
  const SHRINK_RANGE = 170;
  const SCALE_DROP = 0.12;
  const MINI_BAR_H = 46;
  // Mobilde logo oranı düşürülüyor — başlığın dikey yükü azalsın.
  const logoW = Math.min(440, Math.round(width * (width < 720 ? 0.62 : 0.78)));
  const MINI_LOGO_W = 170;

  const listRef = useRef(null);
  const headerRef = useRef(null);   // yardımcı çubuk + kabuk (tek blok)
  const miniRef = useRef(null);
  const naturalHRef = useRef(null); // başlığın TAM BOY yüksekliği
  const pendingYRef = useRef(0); // en son uygulanan ilerleme (p)

  const smoothstep = (x) => x * x * (3 - 2 * x);

  // Başlığın doğal yüksekliğini ölç (yalnızca tam boy hâldeyken).
  const measureHeader = useCallback(() => {
    if (Platform.OS !== 'web') return;
    const node = headerRef.current;
    if (!node || typeof node.offsetHeight !== 'number') return;
    const h = node.offsetHeight;
    if (h > 0) naturalHRef.current = h;
  }, []);

  // Tüm görsel değerleri TEK yerde hesaplayıp DOM'a yazar.
  const paintHeader = useCallback((p) => {
    if (Platform.OS !== 'web') return;
    const header = headerRef.current;
    const mini = miniRef.current;
    const H = naturalHRef.current;

    if (header) {
      if (p <= 0.002 || !H) {
        // ============================================================
        // TAM BOY — HİÇBİR KISIT UYGULAMA
        // ============================================================
        // ⚠️ BU DAL KRİTİK: Önceki sürüm p=0'da bile `height` + `overflow:
        // hidden` uyguluyordu. Ölçülen yükseklik tam sayıya yuvarlandığı için
        // içerik 1-2px kırpılıyor, ayrıca kutunun DIŞINA taşan her şey (logo
        // gölgesi, açılan ARAMA SONUÇ LİSTESİ) kesiliyordu — "en üstte logolar
        // kırpık görünüyor" şikâyetinin sebebi buydu.
        // Sayfa en üstteyken hiçbir stil yazmıyoruz: düzen tamamen doğal.
        header.style.height = '';
        header.style.overflow = '';
        header.style.opacity = '';
        header.style.transform = '';
        header.style.visibility = '';
        header.style.pointerEvents = '';
        header.style.transformOrigin = '';
      } else {
        const e = smoothstep(p);
        const fade = smoothstep(Math.min(1, p / 0.72));
        const gone = p > 0.985;
        header.style.height = (H * (1 - e)) + 'px';
        header.style.overflow = 'hidden';
        header.style.opacity = String(1 - fade);
        header.style.transform = 'scale(' + (1 - SCALE_DROP * e) + ')';
        header.style.transformOrigin = 'top center';
        // Görünmezken odaklanılabilir kalmasın (klavye tuzağı olmasın).
        header.style.visibility = gone ? 'hidden' : '';
        header.style.pointerEvents = gone ? 'none' : '';
      }
    }

    if (mini) {
      // Mini marka, başlık büyük ölçüde çekildikten SONRA belirir.
      const mp = smoothstep(Math.min(1, Math.max(0, (p - 0.35) / 0.65)));
      mini.style.height = (MINI_BAR_H * smoothstep(p)) + 'px';
      mini.style.opacity = String(mp);
      mini.style.pointerEvents = mp < 0.5 ? 'none' : '';
    }
  }, []);

  // Scroll → DOĞRUDAN, SENKRON boyama (olay başına React render YOK).
  //
  // ⚠️ `requestAnimationFrame` ile toplama BİLEREK KULLANILMIYOR.
  // İlk denemede scroll olayları rAF'a kuyruklanıyordu; ancak rAF, composite
  // edilmeyen sekmelerde tamamen donuyor (bu projede ölçüldü: 0 kare/sn) ve o
  // durumda başlık animasyonu yarıda KİLİTLİ kalıyordu. Üstelik tarayıcılar
  // scroll olayını zaten kare başına en fazla bir kez üretir, yani rAF ek bir
  // akıcılık kazandırmıyordu — sadece bir kırılganlık ekliyordu.
  // (bkz. AGENTS.md Altın Kural 9 — sonucu rAF'a bağlama.)
  const handleListScroll = useCallback((e) => {
    const y = e?.nativeEvent?.contentOffset?.y ?? 0;
    const p = Math.min(1, Math.max(0, y / SHRINK_RANGE));
    // Aynı değere tekrar yazmayı atla (gereksiz stil işi yapılmasın).
    if (Math.abs(p - pendingYRef.current) < 0.002 && p !== 0 && p !== 1) return;
    pendingYRef.current = p;
    paintHeader(p);
  }, [paintHeader]);

  // Sekme/genişlik/veri değişiminde: başlığı sıfırla ve yeniden ölç.
  useEffect(() => {
    if (Platform.OS !== 'web') return;
    const id = setTimeout(() => {
      paintHeader(0);        // önce kısıtları kaldır ki doğal yükseklik ölçülebilsin
      measureHeader();
    }, 0);
    return () => clearTimeout(id);
  }, [width, tab, loadingData, compact, measureHeader, paintHeader]);

  // Mini markaya tıklayınca listeyi en üste al.
  const scrollListToTop = useCallback(() => {
    listRef.current?.scrollToOffset?.({ offset: 0, animated: true });
    pendingYRef.current = 0;
    paintHeader(0);
  }, [paintHeader]);

  // Blog/Rehber ekranı hangi bölümle açılacak (footer bağlantıları doğrudan
  // "Gizlilik Politikası" / "İletişim" bölümüne atlayabilsin diye).
  const [blogSection, setBlogSection] = useState('about');

  useEffect(() => {
    const loadAllData = async () => {
      try {
        // Kasa/terminal/souvenir/sticker listelerinin HEPSİ tek bir crates.json
        // dosyasından gelir; api.js bu dosyayı ÖNBELLEĞE alır, dolayısıyla
        // aşağıdaki dört çağrı ağa yalnızca BİR kez çıkar (bkz. api.js).
        const [cratesData, terminalData, souvenirData, stickerData, collectionsData, keychainsData, livePrices] = await Promise.all([
          fetchCrates(),
          fetchTerminals(),
          fetchSouvenirPackages(),
          fetchStickerCapsules(),
          fetchCollections(),
          fetchKeychains(),
          fetchLivePrices() // null dönerse tüm ekranlar otomatik simülasyon moduna düşer
        ]);

        setPriceMap(livePrices);
        setCrates(cratesData.map(c => ({ ...c, ...calculateCaseStats(c, livePrices) })));
        setTerminals(terminalData.map(t => ({ ...t, isTerminal: true, ...calculateTerminalStats(t, livePrices) })));
        setSouvenirs(souvenirData.map(p => ({ ...p, isSouvenir: true, ...calculateSouvenirStats(p, livePrices) })));
        setStickers(stickerData.map(c => ({ ...c, isStickerCapsule: true, ...calculateStickerStats(c, livePrices) })));

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
        const weaponArmory = activeArmory.map(c => ({ ...c, ...calculateArmoryStats(c, livePrices) }));

        // CHARM (NAZARLIK) HAVUZU: keychains.json'daki her charm kendi kapsül
        // koleksiyonuna (Missing Link, Small Arms, Dr Boom vb.) bağlı geliyor.
        // Bunları koleksiyon bazında gruplayıp, weapon koleksiyonlarıyla AYNI
        // kart formatında (contains: [...]) Armory listesine ekliyoruz.
        const charmGroups = {};
        (keychainsData || []).forEach(charm => {
          (charm.collections || []).forEach(col => {
            if (!charmGroups[col.id]) {
              charmGroups[col.id] = { id: col.id, name: col.name, image: col.image, contains: [], isCharmCollection: true };
            }
            charmGroups[col.id].contains.push(charm);
          });
        });
        const charmArmory = Object.values(charmGroups).map(c => ({ ...c, ...calculateCharmStats(c, livePrices) }));

        // ARMORY ÖZEL EŞYA KARTI (Limited Edition Item — 25 Yıldız):
        // Gerçek Armory kataloğundaki "Limited Edition Item" koleksiyonundan
        // Desert Eagle | Heat Treated'i bulup sabit maliyetli bir "basım" kartı
        // oluşturuyoruz (bkz. ArmoryOpening.js -> isSpecialItem). Kademeli
        // nadirlik çekilişi YOK — her basımda AYNI eşya çıkar, sadece float ve
        // StatTrak şansa bağlıdır.
        const limitedCollection = validCollections.find(c =>
          (c.name || '').toLowerCase().includes(LIMITED_EDITION_COLLECTION)
        );
        // Önce resmi "Limited Edition Item" koleksiyonunda ara; bulunamazsa
        // (API yapısı değişirse) tüm koleksiyonlarda isimle ara — kart asla kaybolmasın.
        let specialItem = (limitedCollection?.contains || []).find(i => i.name === SPECIAL_ITEM_NAME);
        if (!specialItem) {
          specialItem = validCollections.flatMap(c => c.contains || []).find(i => i.name === SPECIAL_ITEM_NAME) || null;
        }

        const specialCard = specialItem ? {
          id: 'armory-limited-edition-item',
          name: `Limited Edition Item — ${specialItem.name}`,
          image: specialItem.image,
          isSpecialItem: true,
          specialItem,
          contains: [specialItem]
        } : null;

        // NOT: Sticker kapsülleri ARTIK Armory listesinde DEĞİL — kendi
        // "Stickers" sekmesine taşındılar ve orada kapsül yırtılma animasyonuyla
        // (CapsuleOpening) açılıyorlar. Armory yalnızca gerçek Armory kataloğunu
        // (koleksiyonlar + charm kapsülleri + Limited Edition Item) gösteriyor —
        // bu, gerçek oyundaki dağılıma da daha yakın.
        setCollections([
          ...(specialCard ? [specialCard] : []),
          ...weaponArmory,
          ...charmArmory
        ]);
      } catch (e) {
        console.log('Veri yükleme hatası:', e);
      } finally {
        setLoadingData(false);
      }
    };
    loadAllData();
  }, []);

  // ============================================================
  // CANLI ARAMA (LIVE SEARCH) İNDEKSİ
  // ============================================================
  // Kullanıcı "Glove" yazdığında, adında "Glove" geçen bir KUTU olmasa bile
  // İÇİNDE eldiven bulunan kutular çıkmalı. Bunun için her kutu içeriğiyle
  // birlikte tek bir aranabilir metne ("haystack") düzleştiriliyor.
  //
  // ⚠️ PERFORMANS: Bu düzleştirme ~20.000 eşya adını birleştirir. `useMemo`
  // sayesinde veri yüklendiğinde SADECE BİR KEZ yapılır — her tuş vuruşunda
  // değil. Aksi halde yazarken arayüz gözle görülür şekilde takılırdı.
  const searchIndex = useMemo(() => {
    const build = (list, kind) => (list || []).map(subject => {
      const itemNames = [
        ...(subject.contains || []),
        ...(subject.contains_rare || [])
      ].map(i => i.name || '').join(' ');
      return {
        subject,
        kind,
        name: subject.name || '',
        haystack: `${subject.name || ''} ${itemNames}`.toLowerCase()
      };
    });
    return [
      ...build(crates, 'case'),
      ...build(terminals, 'terminal'),
      ...build(collections, 'armory'),
      ...build(souvenirs, 'souvenir'),
      ...build(stickers, 'sticker')
    ];
  }, [crates, terminals, collections, souvenirs, stickers]);

  const searchResults = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (q.length < 2) return [];
    const out = [];
    for (const entry of searchIndex) {
      const nameHit = entry.name.toLowerCase().includes(q);
      if (!nameHit && !entry.haystack.includes(q)) continue;
      // İçerik eşleşmesiyse hangi eşyanın tuttuğunu göster ("içinde: ...").
      let via = null;
      if (!nameHit) {
        const all = [...(entry.subject.contains || []), ...(entry.subject.contains_rare || [])];
        via = all.find(i => (i.name || '').toLowerCase().includes(q))?.name || null;
      }
      out.push({ ...entry, via, nameHit });
      if (out.length >= SEARCH_RESULT_LIMIT * 4) break; // erken çık (tarama maliyeti)
    }
    // Ad eşleşmeleri içerik eşleşmelerinden ÖNCE gelsin.
    out.sort((a, b) => (b.nameHit ? 1 : 0) - (a.nameHit ? 1 : 0));
    return out.slice(0, SEARCH_RESULT_LIMIT);
  }, [searchQuery, searchIndex]);

  // Arama sonucuna tıklandığında: doğru sekmeye geç + o kutuyu aç.
  const openFromSearch = (entry) => {
    const tabForKind = { case: 'cases', terminal: 'terminals', armory: 'armory', souvenir: 'souvenirs', sticker: 'stickers' };
    setTab(tabForKind[entry.kind] || 'cases');
    setOpenTarget({ kind: entry.kind, subject: entry.subject });
    setSearchQuery('');
    setSearchFocused(false);
  };

  const buyArmoryPass = () => {
    if (gameMode !== 'wallet') {
      showToast(t('toast.passUnlimited'), 'info');
      return;
    }
    if (balance >= 16.00) {
      setBalance(prev => prev - 16.00);
      setStars(prev => prev + 40);
      showToast(t('toast.passBought'), 'success');
    } else {
      // BUG DÜZELTMESİ: `Alert.alert()` react-native-web'de gerçek bir diyalog
      // göstermiyor — bu yüzden bu uyarı web'de SESSİZCE kayboluyordu. Toast'a çevrildi.
      showToast(t('toast.passInsufficient'), 'error');
    }
  };

  // BUG DÜZELTMESİ: "Envanteri Sıfırla" butonu `Alert.alert()`'ün onay butonlarına
  // güveniyordu; web'de bu diyalog hiç görünmediği için "Evet, Sıfırla" asla
  // tetiklenmiyordu — envanter GÖRÜNÜŞTE silinmiyordu. Artık gerçek bir <Modal>
  // tabanlı ConfirmModal kullanılıyor (native + web'de birebir aynı davranır).
  const clearInventory = () => setClearInvConfirmOpen(true);
  const confirmClearInventory = () => {
    setInventory([]);
    setClearInvConfirmOpen(false);
    showToast(t('toast.invCleared'), 'success');
  };

  // "Sıfırla ve Baştan Başla": bakiye, yıldız, envanter, açma geçmişi ve
  // trade-up geçmişini uygulamanın ilk açılış durumuna döndürür.
  const resetAllData = () => {
    setBalance(150.00);
    setStars(0);
    setInventory([]);
    setOpenCounts({});
    setTradeUpHistory([]);
    setGameMode('wallet');
    setTab('cases');
    setOpenTarget(null);
    setSearchQuery('');
    setResetAllConfirmOpen(false);
    showToast(t('toast.allReset'), 'success');
  };

  // ============================================================
  // ENVANTER: sıralama, çoklu seçim, toplu satış
  // ============================================================
  const sortedInventory = useMemo(() => {
    const arr = [...inventory];
    // Float'ı olmayan eşyalar (charm/sticker) float sıralamasında EN SONA atılır;
    // aksi halde `undefined` karşılaştırması sırayı bozardı.
    const byFloat = (dir) => (a, b) => {
      const af = typeof a.float === 'number' ? a.float : null;
      const bf = typeof b.float === 'number' ? b.float : null;
      if (af === null && bf === null) return 0;
      if (af === null) return 1;
      if (bf === null) return -1;
      return dir === 'asc' ? af - bf : bf - af;
    };
    switch (invSort) {
      case 'priceDesc': return arr.sort((a, b) => (b.price ?? 0) - (a.price ?? 0));
      case 'priceAsc':  return arr.sort((a, b) => (a.price ?? 0) - (b.price ?? 0));
      case 'floatAsc':  return arr.sort(byFloat('asc'));
      case 'floatDesc': return arr.sort(byFloat('desc'));
      // Eski eşyalarda `acquiredAt` olmayabilir; uid zaten Date.now() ile
      // üretildiği için yedek sıralama anahtarı olarak kullanılabilir.
      default:          return arr.sort((a, b) => (b.acquiredAt ?? Number(b.uid) ?? 0) - (a.acquiredAt ?? Number(a.uid) ?? 0));
    }
  }, [inventory, invSort]);

  const selectedTotal = useMemo(
    () => inventory.filter(i => selectedUids.includes(i.uid)).reduce((sum, i) => sum + (i.price ?? 0), 0),
    [inventory, selectedUids]
  );
  const allSelected = inventory.length > 0 && selectedUids.length === inventory.length;

  const toggleSelect = (uid) =>
    setSelectedUids(prev => prev.includes(uid) ? prev.filter(u => u !== uid) : [...prev, uid]);

  const toggleSelectAll = () =>
    setSelectedUids(prev => prev.length === inventory.length ? [] : inventory.map(i => i.uid));

  // ============================================================
  // SATIŞ AKIŞI — her satış ÖNCE onay modalından geçer
  // ============================================================
  // `requestSell` yalnızca isteği kaydeder; gerçek silme/ödeme işini
  // aşağıdaki `finalizeSell` yapar. Böylece tekli satış, toplu satış ve
  // inceleme modalından satış TEK bir onay/ödeme yolunu paylaşır.
  const requestSell = (items) => {
    const list = items.filter(Boolean);
    if (list.length === 0) return;
    setSellRequest({ items: list, total: list.reduce((sum, i) => sum + (i.price ?? 0), 0) });
  };

  // `target`: 'wallet' → gerçek bakiyeye ekle (gerekirse moda geç)
  //           'sandbox' → mod aynı kalsın, sanal bakiyeye ekle
  const finalizeSell = (target) => {
    if (!sellRequest) return;
    const { items, total } = sellRequest;
    const uids = items.map(i => i.uid);

    if (target === 'wallet') {
      if (gameMode !== 'wallet') setGameMode('wallet'); // kullanıcı moda geçmeyi seçti
      setBalance(prev => prev + total);
    } else {
      setSandboxEarnings(prev => prev + total);
    }

    setInventory(prev => prev.filter(i => !uids.includes(i.uid)));
    setSelectedUids(prev => prev.filter(u => !uids.includes(u)));
    setInspectItem(null);
    setSellRequest(null);
    const subject = items.length > 1 ? t('modal.itemsCount', { n: items.length }) : items[0].name;
    showToast(
      t(target === 'sandbox' ? 'toast.soldVirtual' : 'toast.sold', { subject, n: total.toFixed(2) }),
      'success'
    );
  };

  const sellSelected = () => requestSell(inventory.filter(i => selectedUids.includes(i.uid)));
  const sellSingle = (item) => requestSell([item]);

  // İnceleme modalından Trade-Up'a aktar: eşyayı prop olarak TradeUpScreen'e
  // geçirip sekmeyi değiştiriyoruz; yerleştirme/doğrulama orada yapılır.
  const sendToTradeUp = (item) => {
    setPendingTradeUpItem(item);
    setInspectItem(null);
    setTab('tradeup');
  };

  const recordOpens = (id, count = 1) => {
    setOpenCounts(prev => ({ ...prev, [id]: (prev[id] || 0) + count }));
  };

  const goHome = () => {
    setTab('cases');
    pendingYRef.current = 0; paintHeader(0);
    setOpenTarget(null);
    setSearchQuery('');
    setSearchFocused(false);
  };

  const switchTab = (key) => {
    setTab(key);
    // Yeni sekme her zaman TAM BOY kabukla açılır (başlığı doğrudan sıfırla).
    pendingYRef.current = 0; paintHeader(0);
    setOpenTarget(null);
    setSearchQuery('');
    setSearchFocused(false);
    setListSortMode('default');
  };

  // ============================================================
  // LİSTE SEKMELERİ (Cases / Terminals / Armory / Souvenirs / Stickers)
  // ============================================================
  const listForTab = { cases: crates, terminals: terminals, armory: collections, souvenirs: souvenirs, stickers: stickers };
  const activeList = listForTab[tab] || [];
  const activeKind = TAB_KIND[tab];

  const sortedList = useMemo(() => {
    const arr = [...activeList];
    switch (listSortMode) {
      case 'roi': return arr.sort((a, b) => (b.roi ?? -1) - (a.roi ?? -1));
      case 'expensive': return arr.sort((a, b) => (b.expectedReturn ?? 0) - (a.expectedReturn ?? 0));
      case 'cheap': return arr.sort((a, b) => (a.expectedReturn ?? 0) - (b.expectedReturn ?? 0));
      case 'popular': return arr.sort((a, b) => (openCounts[b.id] || 0) - (openCounts[a.id] || 0));
      default: return arr;
    }
  }, [activeList, listSortMode, openCounts]);

  // ============================================================
  // KUTU KARTI — hover'da 3B yükselen, çerçevesiz, yumuşak gölgeli kart
  // ============================================================
  const ContainerCard = ({ item, kind }) => {
    const badge = KIND_BADGE[item.isCharmCollection ? 'charm' : kind];
    // ⚠️ Sağ üstte artık FİYAT ARALIĞI değil, kutunun KENDİ fiyatı var.
    // Aralık ("$0.97 – $1980.00") kutunun ne kadara alındığını değil, içinden
    // ne çıkabileceğini anlatıyordu ve alışveriş kararı verirken yanıltıcıydı.
    const ownPrice = getContainerPrice(priceMap, item, kind === 'terminal' ? 'terminal' : kind);
    return (
      <HoverCard
        style={s.card}
        onPress={() => setOpenTarget({ kind, subject: item })}
      >
        {/* SAĞ ÜST — kutunun kendi fiyatı, yeşil */}
        <View style={s.priceBadge}>
          <DollarIcon size={11} />
          <Text style={s.priceTxt}>{ownPrice.toFixed(2)}</Text>
        </View>

        {badge && (
          <View style={[s.kindBadge, { backgroundColor: badge.color }]}>
            <Text style={s.kindBadgeTxt}>{t(badge.labelKey)}</Text>
          </View>
        )}

        <Image source={{ uri: item.image }} style={s.cardImg} resizeMode="contain" />
        <Text style={s.cardName} numberOfLines={2}>{item.name}</Text>

        {/* ALT — istatistikler (EV / ROI). Sağ üstten buraya taşındı. */}
        <View style={s.cardStats}>
          {item.expectedReturn != null ? (
            <>
              <View style={s.statCell}>
                <Text style={s.statCellLbl}>EV</Text>
                <Text style={s.statCellVal}>${item.expectedReturn.toFixed(2)}</Text>
              </View>
              <View style={s.statDivider} />
              <View style={s.statCell}>
                <Text style={s.statCellLbl}>{t('common.roi')}</Text>
                <Text style={[s.statCellVal, { color: item.roi >= 100 ? C.success : C.danger }]}>
                  %{(item.roi ?? 0).toFixed(0)}
                </Text>
              </View>
            </>
          ) : <View style={s.statCell} />}
        </View>

        <View style={s.cardFooter}>
          <TouchableOpacity
            style={s.inspectBtn}
            onPress={() => setContentsModal({
              subject: item,
              kind: item.isCharmCollection ? 'charm' : kind === 'terminal' ? 'case' : kind
            })}
          >
            <Text style={s.inspectTxt}>{t('list.contents')}</Text>
          </TouchableOpacity>
          {openCounts[item.id] > 0 && <Text style={s.openCountTxt}>{t('list.opened', { n: openCounts[item.id] })}</Text>}
        </View>
      </HoverCard>
    );
  };

  const renderListTab = () => {
    if (loadingData) {
      return (
        <View style={s.loadingWrap}>
          <ActivityIndicator size="large" color={C.accent} />
          <Text style={s.loadingTxt}>{t('list.loading')}</Text>
        </View>
      );
    }
    return (
      <View style={{ flex: 1 }}>
        <View style={s.sortRow}>
          {LIST_SORT_OPTIONS.map(opt => (
            <TouchableOpacity key={opt.key} style={[s.sortChip, listSortMode === opt.key && s.sortChipActive]} onPress={() => setListSortMode(opt.key)}>
              <Text style={[s.sortChipTxt, listSortMode === opt.key && s.sortChipTxtActive]}>{t(opt.labelKey)}</Text>
            </TouchableOpacity>
          ))}
          <Text style={s.resultCount}>{t('list.results', { n: sortedList.length })}</Text>
        </View>
        <FlatList
          ref={listRef}
          onScroll={handleListScroll}
          scrollEventThrottle={16}
          key={numCols}
          data={sortedList}
          keyExtractor={i => i.id}
          numColumns={numCols}
          columnWrapperStyle={numCols > 1 ? s.columnWrapper : undefined}
          contentContainerStyle={s.listContainer}
          ListEmptyComponent={<Text style={s.emptyTxt}>{t('list.empty')}</Text>}
          renderItem={({ item }) => <ContainerCard item={item} kind={activeKind} />}
        />
      </View>
    );
  };

  // Açık bir kutunun açılış ekranını render eder.
  const renderOpenScreen = () => {
    const { kind, subject } = openTarget;
    const back = () => setOpenTarget(null);
    const common = { onBack: back, balance, setBalance, gameMode, priceMap, onOpen: recordOpens, setInventory };

    // ⚠️ Terminal DOLAR ($) ile çalışır — yıldız/kredi KULLANMAZ.
    // Teklif kartından eşya alınırken doğrudan cüzdan bakiyesi düşer.
    if (kind === 'terminal') {
      return (
        <TerminalOpening
          terminal={subject} onBack={back}
          balance={balance} setBalance={setBalance}
          setInventory={setInventory}
          gameMode={gameMode} priceMap={priceMap} onOpen={recordOpens}
        />
      );
    }
    if (kind === 'sticker') return <CapsuleOpening capsule={subject} {...common} />;
    if (kind === 'souvenir') return <CaseOpening crate={subject} mode="souvenir" inventory={inventory} {...common} />;
    if (kind === 'armory') {
      return (
        <ArmoryOpening
          collection={subject} onBack={back}
          balance={balance} setBalance={setBalance}
          stars={stars} setStars={setStars}
          inventory={inventory} setInventory={setInventory}
          gameMode={gameMode} priceMap={priceMap}
        />
      );
    }
    return <CaseOpening crate={subject} mode="case" inventory={inventory} {...common} />;
  };

  // Para + kredi göstergeleri. Kırılım noktasına göre farklı satırda
  // render edildiği için TEK yerde tanımlanıp iki yere yerleştiriliyor —
  // kopyalanırsa biri güncellenip diğeri unutulur.
  const moneyGroup = (
    <View style={s.utilityGroup}>
      {gameMode === 'wallet' ? (
        <>
          <ValuePill icon={<DollarIcon size={isNarrow ? 12 : 13} />} value={balance.toFixed(2)} tone="money" compact={isNarrow} />
          <ValuePill icon={<StarIcon size={isNarrow ? 12 : 13} />} value={String(stars)} tone="star" compact={isNarrow} />
        </>
      ) : (
        <View style={s.unlimitedPill}>
          <Text style={s.unlimitedTxt}>{t('util.unlimitedBalance')}</Text>
          {sandboxEarnings > 0 && <Text style={s.sandboxTxt}>{t('util.virtualEarnings', { n: sandboxEarnings.toFixed(2) })}</Text>}
        </View>
      )}
    </View>
  );

  return (
    <SafeAreaView style={s.container}>
      <StatusBar style="dark" />

      {/* ============================================================
          DARALTILMIŞ KABUK — yalnızca aşağı kaydırıldığında
          ============================================================
          Sabit kalan ana eleman: küçük "skinsimulator" yazısı (tıklanınca
          listeyi en üste alır ve kabuğu geri açar). Yanında yalnızca DURUM
          bilgisi (bakiye/kredi) ve dil düğmesi kalır — arama, reklam alanı,
          ana menü ve ikincil butonlar tamamen gizlenir. */}
      {/* Mini marka çubuğu HER ZAMAN monte — yüksekliği/opaklığı doğrudan
          DOM'dan sürülür. Koşullu render kullanılsaydı her eşikte React
          yeniden monte eder, kaydırma sırasında takılma yaratırdı. */}
      {!compact && (
        <View ref={miniRef} style={[s.miniBar, { height: 0, opacity: 0 }]}>
          <TouchableOpacity
            style={s.miniLogoBtn}
            activeOpacity={0.7}
            onPress={scrollListToTop}
          >
            <Image
              source={LOGO_SRC}
              resizeMode="contain"
              style={{ width: MINI_LOGO_W, height: MINI_LOGO_W / LOGO_ASPECT }}
            />
          </TouchableOpacity>

          <View style={s.miniRight}>
            {gameMode === 'wallet' ? (
              <>
                <View style={s.miniStatWrap}><DollarIcon size={11} /><Text style={s.miniStat}>{balance.toFixed(2)}</Text></View>
                <View style={s.miniStatWrap}><StarIcon size={11} /><Text style={[s.miniStat, { color: STAR_GREEN }]}>{stars}</Text></View>
              </>
            ) : (
              <Text style={[s.miniStat, { color: C.success }]}>♾️</Text>
            )}
            <TouchableOpacity style={s.miniInvBtn} onPress={() => switchTab('inventory')}>
              <Text style={s.miniInvTxt}>🎒 {inventory.length}</Text>
            </TouchableOpacity>
            <LanguageSwitcher />
          </View>
        </View>
      )}

      {/* ============================================================
          ÜST YARDIMCI ÇUBUK — bakiye, yıldız, mod, envanter, sıfırla
          (daraltılmış moddayken gizlenir)
          ============================================================ */}
      {/* ============================================================
          BAŞLIK SARMALAYICISI — yardımcı çubuk + kabuk TEK blok
          ============================================================
          ⚠️ Bu ikisi eskiden AYRI AYRI animasyonlanıyordu; her biri kendi
          yüksekliğini küçültünce toplam kayma iki kat hızlı oluyor ve sıçrama
          yapıyordu. Artık tek sarmalayıcı ölçülüp tek bir yükseklik/opaklık/
          ölçek değeriyle sürülüyor — hareket tek parça. */}
      <View ref={headerRef}>
      {/* ============================================================
          ÜST YARDIMCI ÇUBUK
          ============================================================
          YERLEŞİM (kullanıcı isteği):
            SOL  → mod anahtarı (Cüzdan / Sınırsız)
            SAĞ  → $ bakiye ve ★ kredi
          Mod anahtarı eskiden Envanter ile Sıfırla arasına sıkışmıştı; ne
          olduğu anlaşılmıyordu. Artık kendi başına, en solda ve ilk sırada.

          ⚠️ MOBİLDE İKİ SATIR: dar ekranda hepsi tek satıra sığmıyor ve
          sarmalanınca dağınık görünüyordu. Mobilde 1. satır MOD + PARA,
          2. satır gezinme butonları. "Cüzdan modu her zaman en üstte"
          isteği bu şekilde karşılanıyor. */}
      {/* ⚠️ MASAÜSTÜ TEK SATIR / MOBİL İKİ SATIR:
          Mobilde hepsi tek satıra sığmadığı için 2 satıra bölünüyor. Masaüstünde
          ise bölmek gereksiz yere dikey alan yerdi — orada iki grup yan yana. */}
      <View style={[s.utilityBar, isNarrow ? s.utilityBarNarrow : s.utilityBarWide]}>
        {/* ---------- SOL: mod anahtarı ---------- */}
        <View style={[s.utilityRow, isNarrow && s.utilityRowNarrow]}>
          <TouchableOpacity
            style={[s.modeBtn, gameMode !== 'wallet' && s.modeBtnUnlimited]}
            onPress={() => setGameMode(m => m === 'wallet' ? 'unlimited' : 'wallet')}
          >
            <Text style={[s.modeBtnTxt, gameMode !== 'wallet' && s.modeBtnTxtUnlimited]}>
              {gameMode === 'wallet' ? t('util.wallet') : t('util.unlimited')}
            </Text>
          </TouchableOpacity>

          {/* MOBİLDE para/kredi 1. satırda, modun sağında durur — böylece
              "cüzdan modu her zaman en üstte" ve para sağda olur. */}
          {isNarrow && moneyGroup}
        </View>

        {/* ---------- SAĞ: gezinme butonları + (masaüstünde) para ---------- */}
        <View style={[s.utilityRow, isNarrow ? s.utilityRowNarrowSecond : s.utilityRowWideRight]}>
          {gameMode === 'wallet' && (
            <TouchableOpacity style={s.buyPassBtn} onPress={buyArmoryPass}>
              <StarIcon size={11} color={C.onAccent} />
              <Text style={s.buyPassTxt}>{t('util.buyPassShort')}</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity
            style={[s.ghostBtn, tab === 'inventory' && s.ghostBtnActive]}
            onPress={() => switchTab('inventory')}
          >
            <Text style={[s.ghostBtnTxt, tab === 'inventory' && s.ghostBtnTxtActive]}>{t('util.inventory', { n: inventory.length })}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[s.ghostBtn, tab === 'blog' && s.ghostBtnActive]}
            onPress={() => { setBlogSection('about'); switchTab('blog'); }}
          >
            <Text style={[s.ghostBtnTxt, tab === 'blog' && s.ghostBtnTxtActive]}>{t('util.blog')}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={s.dangerGhostBtn} onPress={() => setResetAllConfirmOpen(true)}>
            <Text style={s.dangerGhostTxt}>{t('util.reset')}</Text>
          </TouchableOpacity>
          <LanguageSwitcher />

          {/* MASAÜSTÜNDE para/kredi EN SAĞDA */}
          {!isNarrow && moneyGroup}
        </View>
      </View>

      {/* ============================================================
          SABIT KABUK: logo + arama + reklam alani + navigasyon.
          Bir acilis ekrani actiginda (openTarget) kabuk KOMPAKT moda gecer:
          logo ve reklam bosluğu gizlenir, arama + menu kalir. Boylece cark/
          terminal ekrani ekranin ustune yerlesir, kullanici asagi kaydirmak
          zorunda kalmaz.
          ============================================================ */}
      <View style={s.shell}>
        {/* ============================================================
            1) LOGO — üst-orta
            ============================================================ */}
        {!compact && (
        <TouchableOpacity style={[s.logoWrap, isNarrow && s.logoWrapNarrow]} activeOpacity={0.75} onPress={goHome}>
          {/* Saydam zeminli logo — dar ekranlarda kucultulur, orani korunur */}
          <Image
            source={LOGO_SRC}
            resizeMode="contain"
            style={{ width: logoW, height: logoW / LOGO_ASPECT }}
          />
        </TouchableOpacity>
        )}

        {/* ============================================================
            2) CANLI ARAMA — yazdıkça altında dinamik sonuç listesi açılır
            ============================================================ */}
        <View style={[s.searchZone, compact && s.searchZoneCompact, isNarrow && s.searchZoneNarrow]}>
          <View style={[s.searchBox, (searchFocused || searchQuery) && s.searchBoxActive]}>
            <Text style={s.searchIcon}>🔍</Text>
            <TextInput
              style={s.searchInput}
              placeholder={t('search.placeholder')}
              placeholderTextColor={C.textFaint}
              value={searchQuery}
              onChangeText={setSearchQuery}
              onFocus={() => setSearchFocused(true)}
              // onBlur GECİKMELİ: sonuç satırına tıklandığında blur önce
              // ateşlenip listeyi kaldırırsa tıklama KAYBOLUR. Küçük bir
              // gecikme, tıklamanın işlenmesine izin verir.
              onBlur={() => setTimeout(() => setSearchFocused(false), 180)}
            />
            {searchQuery !== '' && (
              <TouchableOpacity onPress={() => setSearchQuery('')}>
                <Text style={s.searchClear}>✕</Text>
              </TouchableOpacity>
            )}
          </View>

          {searchQuery.trim().length >= 2 && (
            <View style={s.searchDropdown}>
              {searchResults.length === 0 ? (
                <Text style={s.searchEmpty}>{t('search.empty')}</Text>
              ) : (
                searchResults.map(entry => {
                  const badge = KIND_BADGE[entry.subject.isCharmCollection ? 'charm' : entry.kind];
                  return (
                    <TouchableOpacity
                      key={`${entry.kind}-${entry.subject.id}`}
                      style={s.searchRow}
                      onPress={() => openFromSearch(entry)}
                    >
                      <Image source={{ uri: entry.subject.image }} style={s.searchRowImg} resizeMode="contain" />
                      <View style={{ flex: 1 }}>
                        <Text style={s.searchRowName} numberOfLines={1}>{entry.subject.name}</Text>
                        {entry.via && <Text style={s.searchRowVia} numberOfLines={1}>{t('search.inside', { name: entry.via })}</Text>}
                      </View>
                      {badge && (
                        <View style={[s.searchRowBadge, { backgroundColor: badge.color }]}>
                          <Text style={s.kindBadgeTxt}>{t(badge.labelKey)}</Text>
                        </View>
                      )}
                    </TouchableOpacity>
                  );
                })
              )}
            </View>
          )}
        </View>

        {/* ============================================================
            REKLAM ALANI (rezerve) — şimdilik yalnızca boşluk.
            Buraya ileride bir banner yerleştirildiğinde menünün konumu
            KAYMASIN diye alan şimdiden ayrıldı.
            ============================================================ */}
        {!compact && <View style={[s.adSlot, isNarrow && s.adSlotNarrow]} />}

        {/* ============================================================
            3) ANA NAVİGASYON — yatay
            ============================================================ */}
        <View style={[s.navWrap, compact && s.navWrapCompact]}>
          <View style={s.navRow}>
            {/* ⚠️ Döngü değişkeni bilerek `item`: `t` çeviri fonksiyonunun adı
                ve gölgelenirse menü etiketleri çevrilemez (sessiz hata). */}
            {NAV_TABS.map(item => (
              <TouchableOpacity
                key={item.key}
                style={[s.navBtn, isNarrow && s.navBtnNarrow, tab === item.key && s.navBtnActive, webTransition('background-color, color', 160)]}
                onPress={() => switchTab(item.key)}
              >
                <Text style={[s.navTxt, isNarrow && s.navTxtNarrow, tab === item.key && s.navTxtActive]}>{t(item.labelKey)}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

      </View>
      </View>

      {/* ============================================================
          İÇERİK — TEK kaydirma bolgesi burasi (ve alt ekranlarin kendi
          FlatList/ScrollView'leri).
          ============================================================ */}
      <View style={[s.content, compact && s.contentCompact]}>
          {openTarget ? renderOpenScreen() : (
            <>
              {tab === 'tradeup' && (
                <TradeUpScreen
                  // ⚠️ `setBalance` VE `gameMode` BİLEREK GEÇİLMİYOR — Trade-Up
                  // ücretsiz bir analiz aracıdır; bakiyeye erişimi olmaması
                  // ücretsizliği yapısal olarak garanti eder.
                  inventory={inventory} setInventory={setInventory}
                  priceMap={priceMap} allCollections={allCollectionsRaw}
                  history={tradeUpHistory} setHistory={setTradeUpHistory}
                  pendingItem={pendingTradeUpItem}
                  onPendingItemHandled={() => setPendingTradeUpItem(null)}
                />
              )}

              {tab === 'blog' && <BlogScreen key={blogSection} initialSection={blogSection} />}

              {['cases', 'terminals', 'armory', 'souvenirs', 'stickers'].includes(tab) && renderListTab()}

              {tab === 'inventory' && (
                <View style={{ flex: 1 }}>
                  {/* SIRALAMA */}
                  <View style={s.sortRow}>
                    {INVENTORY_SORTS.map(opt => (
                      <TouchableOpacity key={opt.key} style={[s.sortChip, invSort === opt.key && s.sortChipActive]} onPress={() => setInvSort(opt.key)}>
                        <Text style={[s.sortChipTxt, invSort === opt.key && s.sortChipTxtActive]}>{t(opt.labelKey)}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>

                  {/* ARAÇ ÇUBUĞU: çoklu seçim + toplu satış + sıfırlama */}
                  <View style={s.invToolbar}>
                    <TouchableOpacity
                      style={[s.invToolBtn, selectMode && s.invToolBtnActive]}
                      onPress={() => { setSelectMode(m => !m); setSelectedUids([]); }}
                    >
                      <Text style={[s.invToolTxt, selectMode && { color: C.onAccent }]}>
                        {selectMode ? t('inv.multiSelectOn') : t('inv.multiSelect')}
                      </Text>
                    </TouchableOpacity>

                    {selectMode && (
                      <>
                        <TouchableOpacity style={s.invToolBtn} onPress={toggleSelectAll}>
                          <Text style={s.invToolTxt}>{allSelected ? t('inv.selectNone') : t('inv.selectAll')}</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={[s.bulkSellBtn, selectedUids.length === 0 && s.bulkSellDisabled]}
                          onPress={sellSelected}
                          disabled={selectedUids.length === 0}
                        >
                          <Text style={s.bulkSellTxt}>
                            {t('inv.sellSelected', { n: selectedUids.length, total: selectedTotal.toFixed(2) })}
                          </Text>
                        </TouchableOpacity>
                      </>
                    )}

                    <TouchableOpacity style={s.clearInvBtnSm} onPress={clearInventory}>
                      <Text style={s.clearInvTxt}>{t('inv.clear')}</Text>
                    </TouchableOpacity>
                  </View>

                  <FlatList
                    ref={listRef}
                    onScroll={handleListScroll}
                    scrollEventThrottle={16}
                    key={`inv-${numCols}`}
                    data={sortedInventory}
                    keyExtractor={i => i.uid}
                    numColumns={Math.max(2, numCols + 1)}
                    columnWrapperStyle={s.columnWrapper}
                    contentContainerStyle={s.listContainer}
                    ListEmptyComponent={<Text style={s.emptyTxt}>{t('inv.empty')}</Text>}
                    renderItem={({ item }) => {
                      const picked = selectedUids.includes(item.uid);
                      // HIZLI SATIŞ: web'de yalnızca üzerine gelindiğinde, dokunmatik
                      // platformlarda (hover yok) her zaman görünür.
                      const showQuickSell = !selectMode && (Platform.OS !== 'web' || hoveredUid === item.uid);
                      return (
                        <HoverCard
                          style={[s.invCard, { borderBottomColor: item.displayColor }, picked && s.invCardPicked]}
                          lift={-4}
                          onPress={() => selectMode ? toggleSelect(item.uid) : setInspectItem(item)}
                          onMouseEnter={Platform.OS === 'web' ? () => setHoveredUid(item.uid) : undefined}
                          onMouseLeave={Platform.OS === 'web' ? () => setHoveredUid(prev => prev === item.uid ? null : prev) : undefined}
                        >
                          {selectMode && (
                            <View style={[s.checkbox, picked && s.checkboxOn]}>
                              <Text style={s.checkboxTxt}>{picked ? '✓' : ''}</Text>
                            </View>
                          )}
                          {showQuickSell && (
                            <TouchableOpacity style={s.quickSellBtn} onPress={() => sellSingle(item)}>
                              <Text style={s.quickSellTxt}>{t('inv.sell')}</Text>
                            </TouchableOpacity>
                          )}
                          {item.isStatTrak && <Text style={s.stTag}>ST™</Text>}
                          {!showQuickSell && (
                            <View style={s.priceTagWrap}>
                              <DollarIcon size={9} />
                              <Text style={s.priceTag}>{item.price?.toFixed(2)}</Text>
                            </View>
                          )}

                          {/* Eşya Kaynağı Etiketi */}
                          <View style={s.sourceTag}><Text style={s.sourceTxt}>{item.source}</Text></View>

                          <Image source={{ uri: item.image }} style={s.invImg} resizeMode="contain" />
                          <Text style={s.invName} numberOfLines={2}>{item.name}</Text>
                          <Text style={s.invWear}>{item.wear || (item.isCharm ? 'Charm' : item.isSticker ? 'Sticker' : '')}</Text>
                        </HoverCard>
                      );
                    }}
                  />
                </View>
              )}
            </>
          )}
      </View>

      {/* ============================================================
          ALT BİLGİ BAĞLANTILARI — AdSense incelemesinin aradığı standart
          bağlantılar. Rehber ekranındaki ilgili bölüme doğrudan atlarlar.
          ============================================================ */}
      {!compact && (
        <View style={s.footerBar}>
          <TouchableOpacity onPress={() => { setBlogSection('privacy'); switchTab('blog'); }}>
            <Text style={s.footerBarLink}>{t('footer.privacy')}</Text>
          </TouchableOpacity>
          <Text style={s.footerBarSep}>·</Text>
          <TouchableOpacity onPress={() => { setBlogSection('contact'); switchTab('blog'); }}>
            <Text style={s.footerBarLink}>{t('footer.contact')}</Text>
          </TouchableOpacity>
          <Text style={s.footerBarSep}>·</Text>
          <TouchableOpacity onPress={() => { setBlogSection('about'); switchTab('blog'); }}>
            <Text style={s.footerBarLink}>{t('footer.about')}</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* ============================================================
          SORUMLULUK REDDİ — sayfa altı. Bir açılış ekranı aktifken
          yoğunlaştırılmış tek satıra iner (dikey alan kazanmak için) ama
          asla tamamen gizlenmez.
          ============================================================ */}
      <Disclaimer compact={compact} />

      <ToastBanner toast={toast} />

      <ConfirmModal
        visible={clearInvConfirmOpen}
        title={t('modal.clearInvTitle')}
        message={t('modal.clearInvBody')}
        confirmLabel={t('modal.clearInvConfirm')}
        cancelLabel={t('common.cancel')}
        onConfirm={confirmClearInventory}
        onCancel={() => setClearInvConfirmOpen(false)}
      />

      <ConfirmModal
        visible={resetAllConfirmOpen}
        title={t('modal.resetAllTitle')}
        message={t('modal.resetAllBody')}
        confirmLabel={t('modal.resetAllConfirm')}
        cancelLabel={t('common.cancel')}
        onConfirm={resetAllData}
        onCancel={() => setResetAllConfirmOpen(false)}
      />

      <ContentsModal
        visible={!!contentsModal}
        onClose={() => setContentsModal(null)}
        subject={contentsModal?.subject}
        kind={contentsModal?.kind}
        priceMap={priceMap}
      />

      <SellConfirmModal
        visible={!!sellRequest}
        mode={gameMode}
        itemName={sellRequest?.items?.[0]?.name}
        count={sellRequest?.items?.length || 0}
        total={sellRequest?.total || 0}
        onCancel={() => setSellRequest(null)}
        onSellSimple={() => finalizeSell('wallet')}
        onSellWallet={() => finalizeSell('wallet')}
        onSellSandbox={() => finalizeSell('sandbox')}
      />

      <ItemInspectModal
        visible={!!inspectItem}
        item={inspectItem}
        onClose={() => setInspectItem(null)}
        onSell={sellSingle}
        onAddToTradeUp={sendToTradeUp}
      />
    </SafeAreaView>
  );
}

// Sayısal değerlerde tabular (monospace) yazı: rakam genişliği sabit kaldığı
// için bakiye/fiyat değişince düzen kaymaz — oyun arayüzü standardı.
const MONO_FONT = 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace';

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },

  // --- ÜST YARDIMCI ÇUBUK ---
  // ⚠️ CS ARAYÜZ DİLİ: köşeler KESKİN (radius 4), kenarlıklar ince ve görünür,
  // etiketler BÜYÜK HARF + harf aralıklı. Oyun arayüzleri yuvarlak "hap"
  // biçimlerini değil, keskin panel kenarlarını kullanır.
  utilityBar: {
    paddingHorizontal: 18, paddingVertical: 8, gap: 8,
    backgroundColor: C.surface, ...shadow.bar, zIndex: 30
  },
  // Mobilde daha sıkı: header'ın kapladığı dikey alan belirgin şekilde azalır.
  utilityBarNarrow: { paddingHorizontal: 12, paddingVertical: 6, gap: 6 },
  // Masaüstü: iki grup TEK satırda yan yana
  utilityBarWide: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  // Sağ grup kalan alanı alır ve içeriğini SAĞA yaslar; `flex: 0` verilirse
  // sıkışıp sarmalanıyordu (ölçüldü: 1280px'te 18px genişliğe düşüyordu).
  utilityRowWideRight: { flex: 1, justifyContent: 'flex-end' },

  utilityRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    flexWrap: 'wrap', gap: 8
  },
  utilityRowNarrow: { justifyContent: 'space-between', flexWrap: 'nowrap' },
  utilityRowNarrowSecond: { justifyContent: 'flex-start', flexWrap: 'wrap', gap: 6 },

  utilityGroup: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },

  // MOD ANAHTARI — en solda, tek başına, durumu renkten okunuyor
  modeBtn: {
    backgroundColor: C.accentSoft, borderWidth: 1, borderColor: C.accentBorder,
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 4
  },
  modeBtnUnlimited: { backgroundColor: C.successSoft, borderColor: '#9fdcc2' },
  modeBtnTxt: { color: C.accentDeep, fontSize: 11, fontWeight: '800', letterSpacing: 0.8 },
  modeBtnTxtUnlimited: { color: C.success },

  buyPassBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: C.accent, paddingHorizontal: 11, paddingVertical: 6, borderRadius: 4
  },
  buyPassTxt: { color: C.onAccent, fontSize: 11, fontWeight: '800', letterSpacing: 0.3 },

  unlimitedPill: { backgroundColor: C.successSoft, borderWidth: 1, borderColor: '#9fdcc2', paddingHorizontal: 12, paddingVertical: 5, borderRadius: 4 },
  unlimitedTxt: { color: C.success, fontWeight: '800', fontSize: 11, letterSpacing: 0.5 },
  sandboxTxt: { color: '#8b6ce0', fontSize: 10, fontWeight: '700', marginTop: 2 },

  ghostBtn: { backgroundColor: C.surfaceAlt, borderWidth: 1, borderColor: C.border, paddingHorizontal: 11, paddingVertical: 6, borderRadius: 4 },
  ghostBtnActive: { backgroundColor: C.accent, borderColor: C.accent },
  ghostBtnTxt: { color: C.textSoft, fontSize: 11, fontWeight: '800', letterSpacing: 0.3 },
  ghostBtnTxtActive: { color: C.onAccent },
  dangerGhostBtn: { backgroundColor: C.dangerSoft, borderWidth: 1, borderColor: '#f3cfcf', paddingHorizontal: 11, paddingVertical: 6, borderRadius: 4 },
  dangerGhostTxt: { color: C.danger, fontSize: 11, fontWeight: '800', letterSpacing: 0.3 },

  // --- SABIT KABUK ---
  // ⚠️ `overflow` BURADA TANIMLANMAZ. Kırpma yalnızca kaydırma sırasında,
  // DOM üzerinden geçici olarak uygulanır (bkz. paintHeader). Kalıcı bir
  // `overflow: hidden`, sayfa en üstteyken arama sonuç listesini ve gölgeleri
  // keserdi — "en üstte logolar kırpık" hatasının kökü buydu.
  shell: { paddingBottom: 4, zIndex: 20 },

  // --- DARALTILMIŞ (STICKY) MINI ÇUBUK ---
  // Tam boy kabuk ~300px; bu çubuk ~44px. Kazanılan dikey alan, kasa
  // listesinde neredeyse fazladan bir satır demek.
  miniBar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, gap: 10, overflow: 'hidden',
    backgroundColor: C.surface, ...shadow.bar, zIndex: 40
  },
  miniLogoBtn: { paddingVertical: 2, paddingRight: 8 },
  miniRight: { flexDirection: 'row', alignItems: 'center', gap: 10, flexShrink: 1 },
  miniStatWrap: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  miniStat: { color: C.success, fontSize: 12, fontWeight: '800', fontFamily: MONO_FONT },
  miniInvBtn: { backgroundColor: C.surfaceAlt, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999 },
  miniInvTxt: { color: C.textSoft, fontSize: 11, fontWeight: '800' },

  // --- LOGO ---
  logoWrap: { alignItems: 'center', marginTop: 26, marginBottom: 4 },
  logoWrapNarrow: { marginTop: 12, marginBottom: 2 },

  // --- ARAMA ---
  searchZone: { alignItems: 'center', marginTop: 18, paddingHorizontal: 18, zIndex: 20 },
  searchZoneCompact: { marginTop: 12 },
  searchZoneNarrow: { marginTop: 10, paddingHorizontal: 12 },
  searchBox: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    width: '100%', maxWidth: 640, backgroundColor: C.surface,
    paddingHorizontal: 18, paddingVertical: 13, borderRadius: 999, ...shadow.card
  },
  searchBoxActive: { ...shadow.cardHover },
  searchIcon: { fontSize: 15 },
  searchInput: { flex: 1, color: C.text, fontSize: 15, outlineStyle: 'none', fontWeight: '500' },
  searchClear: { color: C.textDim, fontSize: 15, fontWeight: '800', paddingHorizontal: 4 },
  searchDropdown: {
    width: '100%', maxWidth: 640, backgroundColor: C.surface, borderRadius: 18,
    marginTop: 10, paddingVertical: 8, ...shadow.modal
  },
  searchRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 10 },
  searchRowImg: { width: 40, height: 34 },
  searchRowName: { color: C.text, fontSize: 13, fontWeight: '700' },
  searchRowVia: { color: C.textDim, fontSize: 11, marginTop: 2 },
  searchRowBadge: { paddingHorizontal: 9, paddingVertical: 4, borderRadius: 999 },
  searchEmpty: { color: C.textDim, fontSize: 13, textAlign: 'center', paddingVertical: 18 },

  // --- REKLAM ALANI (rezerve boşluk) ---
  adSlot: { height: 84, marginTop: 22 },
  adSlotNarrow: { height: 44, marginTop: 14 },

  // --- NAVİGASYON ---
  navWrap: { alignItems: 'center', paddingHorizontal: 18, zIndex: 10, marginTop: 0 },
  navWrapCompact: { marginTop: 12 },
  navRow: {
    flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 3,
    backgroundColor: C.surface, padding: 5, borderRadius: 6,
    borderWidth: 1, borderColor: C.border, ...shadow.card
  },
  navBtn: { paddingVertical: 9, paddingHorizontal: 18, borderRadius: 4 },
  navBtnNarrow: { paddingVertical: 7, paddingHorizontal: 11 },
  navBtnActive: { backgroundColor: C.accent },
  // BÜYÜK HARF + harf aralığı: oyun menüsü tipografisi
  navTxt: { color: C.textSoft, fontSize: 12.5, fontWeight: '800', letterSpacing: 0.9, textTransform: 'uppercase' },
  navTxtNarrow: { fontSize: 10.5, letterSpacing: 0.4 },
  navTxtActive: { color: C.onAccent },

  // --- İÇERİK / LİSTELER ---
  content: { flex: 1, marginTop: 22 },
  contentCompact: { marginTop: 12 },
  loadingWrap: { alignItems: 'center', paddingVertical: 60 },
  loadingTxt: { color: C.textDim, fontSize: 13, marginTop: 14, fontWeight: '600' },
  sortRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 8, paddingHorizontal: 20, marginBottom: 12 },
  sortChip: { backgroundColor: C.surface, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999, ...shadow.card },
  sortChipActive: { backgroundColor: C.accent },
  sortChipTxt: { color: C.textSoft, fontSize: 11, fontWeight: '800' },
  sortChipTxtActive: { color: C.onAccent },
  resultCount: { color: C.textDim, fontSize: 11, fontWeight: '700', marginLeft: 'auto' },
  listContainer: { padding: 14, paddingBottom: 60 },
  columnWrapper: { gap: 14 },
  emptyTxt: { color: C.textDim, textAlign: 'center', marginTop: 40, fontSize: 13 },

  card: {
    flex: 1, backgroundColor: C.surface, marginBottom: 14, borderRadius: 6,
    borderWidth: 1, borderColor: C.border,
    padding: 16, alignItems: 'center', position: 'relative', minHeight: 236
  },
  // SAĞ ÜST — kutunun KENDİ fiyatı (yeşil, dolar)
  priceBadge: {
    position: 'absolute', top: 10, right: 10, zIndex: 2,
    flexDirection: 'row', alignItems: 'center', gap: 3,
    backgroundColor: C.successSoft, borderWidth: 1, borderColor: '#bfe8d5',
    paddingHorizontal: 8, paddingVertical: 3, borderRadius: 4
  },
  priceTxt: { color: C.success, fontSize: 12, fontWeight: '800', fontFamily: MONO_FONT },
  kindBadge: { position: 'absolute', top: 10, left: 10, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 3, zIndex: 2 },
  kindBadgeTxt: { color: '#fff', fontSize: 9, fontWeight: '800' },
  cardImg: { width: 100, height: 92, marginTop: 20, marginBottom: 10 },
  cardName: { color: C.text, textAlign: 'center', fontSize: 12, fontWeight: '700', lineHeight: 17 },
  // ALT İSTATİSTİK ŞERİDİ — EV / ROI (sağ üstten buraya taşındı)
  cardStats: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 12, marginTop: 10, paddingTop: 8,
    borderTopWidth: 1, borderTopColor: C.border, width: '100%', minHeight: 34
  },
  statCell: { alignItems: 'center', minWidth: 52 },
  statCellLbl: { color: C.textDim, fontSize: 8.5, fontWeight: '800', letterSpacing: 0.8 },
  statCellVal: { color: C.text, fontSize: 12, fontWeight: '800', fontFamily: MONO_FONT, marginTop: 1 },
  statDivider: { width: 1, height: 20, backgroundColor: C.border },
  cardFooter: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 'auto', paddingTop: 12 },
  inspectBtn: { backgroundColor: C.surfaceAlt, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999 },
  inspectTxt: { color: C.textSoft, fontSize: 10, fontWeight: '800' },
  openCountTxt: { color: C.warn, fontSize: 10, fontWeight: '800' },

  // --- ALT BİLGİ BAĞLANTILARI ---
  footerBar: {
    flexDirection: 'row', justifyContent: 'center', alignItems: 'center',
    gap: 10, paddingTop: 10, paddingBottom: 2, flexWrap: 'wrap'
  },
  footerBarLink: { color: C.accentDeep, fontSize: 11.5, fontWeight: '700' },
  footerBarSep: { color: C.textFaint, fontSize: 11 },

  // --- ENVANTER ---
  clearInvTxt: { color: C.danger, fontWeight: '800', fontSize: 11 },
  clearInvBtnSm: { backgroundColor: C.dangerSoft, paddingHorizontal: 14, paddingVertical: 9, borderRadius: 999, marginLeft: 'auto' },
  invToolbar: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 8, paddingHorizontal: 20, paddingBottom: 10 },
  invToolBtn: { backgroundColor: C.surface, paddingHorizontal: 14, paddingVertical: 9, borderRadius: 999, ...shadow.card },
  invToolBtnActive: { backgroundColor: C.accent },
  invToolTxt: { color: C.textSoft, fontSize: 11, fontWeight: '800' },
  bulkSellBtn: { backgroundColor: C.success, paddingHorizontal: 16, paddingVertical: 9, borderRadius: 999 },
  bulkSellDisabled: { backgroundColor: C.borderStrong },
  bulkSellTxt: { color: C.onAccent, fontSize: 11, fontWeight: '800' },
  // ENVANTER KARTI — CS envanter hücresi hissi: keskin köşe, ince kenarlık,
  // altta kalın nadirlik şeridi (oyundaki renk kodunun aynısı).
  invCard: { flex: 1, backgroundColor: C.surface, marginBottom: 14, borderRadius: 4, borderWidth: 1, borderColor: C.border, padding: 10, alignItems: 'center', borderBottomWidth: 3, position: 'relative', minHeight: 132 },
  invCardPicked: { borderWidth: 2, borderColor: C.success },
  invImg: { width: 66, height: 54, marginTop: 18 },
  invName: { color: C.textSoft, textAlign: 'center', fontSize: 10, marginTop: 6, fontWeight: '600' },
  invWear: { color: C.textDim, fontSize: 9, marginTop: 3 },
  checkbox: { position: 'absolute', top: 6, left: 6, width: 19, height: 19, borderRadius: 6, borderWidth: 1.5, borderColor: C.borderStrong, backgroundColor: C.surface, alignItems: 'center', justifyContent: 'center', zIndex: 3 },
  checkboxOn: { backgroundColor: C.success, borderColor: C.success },
  checkboxTxt: { color: C.onAccent, fontSize: 11, fontWeight: '800' },
  quickSellBtn: { position: 'absolute', top: 5, right: 5, backgroundColor: C.success, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999, zIndex: 4 },
  quickSellTxt: { color: C.onAccent, fontSize: 9, fontWeight: '800' },
  stTag: { position: 'absolute', top: 6, left: 7, color: C.warn, fontSize: 8, fontWeight: '800' },
  priceTagWrap: { position: 'absolute', top: 6, right: 8, flexDirection: 'row', alignItems: 'center', gap: 1, zIndex: 2 },
  priceTag: { color: C.success, fontSize: 10, fontWeight: '800', fontFamily: MONO_FONT },
  sourceTag: { position: 'absolute', bottom: 6, right: 6, backgroundColor: C.surfaceAlt, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 999 },
  sourceTxt: { color: C.textDim, fontSize: 7, fontWeight: '800' }
});
