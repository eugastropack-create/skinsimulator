import React, { useState, useEffect, useMemo, useRef } from 'react';
import { StyleSheet, Text, View, Image, TouchableOpacity, SafeAreaView, FlatList, TextInput, Modal, ActivityIndicator, ScrollView, useWindowDimensions, Platform } from 'react-native';
import Slider from '@react-native-community/slider';
import { getWearFromFloat, formatSignedMoney, generatePattern } from './utils';
import { getRealisticPrice, POPULAR_SKIN_PRIORITY } from './prices';
import { fetchSkins } from './api';
import { useToast, ToastBanner } from './components/Toast';
import { useI18n } from './i18n';
import { C, RARITY, shadow, R, activeIndicator, displayType, clipCut } from './theme';
import { IconLock } from './components/Icons';

const NEXT_RARITY_NAME = { 'Consumer Grade': 'Industrial Grade', 'Industrial Grade': 'Mil-Spec Grade', 'Mil-Spec Grade': 'Restricted', 'Restricted': 'Classified', 'Classified': 'Covert' };
const RARITY_LABELS = { 'Consumer Grade': 'Consumer', 'Industrial Grade': 'Industrial', 'Mil-Spec Grade': 'Mil-Spec', 'Restricted': 'Restricted', 'Classified': 'Classified', 'Covert': 'Covert' };

// Sağ paneldeki "Olası Çıktılar" listesinde en fazla kaç pill basılacağı
// (bıçak/eldiven havuzu 670 öğe — hepsini basmak paneli kilitler).
const OUTCOME_RENDER_CAP = 24;

// ============================================================
// SLOT SAYILARI
// ============================================================
// Standart trade-up (Consumer..Classified) gerçek CS2'deki gibi 10 eşya ister.
// SİMÜLATÖRE ÖZEL Covert->Sarı (Bıçak/Eldiven) tarifi ise yalnızca 5 eşya ister;
// bu yüzden Covert seçildiği anda kalan 5 yuva KİLİTLENİR (🔒) ve doldurulamaz.
const TOTAL_SLOTS = 10;
const KNIFE_RECIPE_SLOTS = 5;

// Bıçak/eldiven tespiti: ByMykel verisinde bunların ADI "★" ile başlar ve
// hepsi rarity.name === 'Covert' taşır — yani nadirliğe bakarak normal Covert
// silahlardan (AWP | Asiimov gibi) AYIRT EDİLEMEZLER. Güvenilir ayrım
// `category.name` alanıdır: 'Knives' (576 adet) / 'Gloves' (94 adet).
const isKnife = (item) => item?.category?.name === 'Knives' || /^★/.test(item?.name || '') && !/Gloves|Hand Wraps/i.test(item?.name || '');
const isGloves = (item) => item?.category?.name === 'Gloves' || /(Gloves|Hand Wraps)/i.test(item?.name || '');

// ============================================================
// GİRDİ kuralı — SİMÜLATÖRE ÖZEL ESNETME
// ============================================================
// Gerçek CS2'de Covert (Kırmızı) eşyalar trade-up GİRDİSİ olamaz (zaten
// hiyerarşinin en üstüdürler). Bu simülatörde bu sınırı BİLEREK esnetiyoruz:
// kullanıcı 5 Covert birleştirip Bıçak/Eldiven çekilişi yapabilsin (bkz. COVERT->KNIFE
// özel tarifi, aşağıda). Bıçak/eldivenin KENDİSİ hâlâ girdi olamaz — aksi halde
// sonsuz bıçak->bıçak döngüsü oluşurdu.
const isValidTradeUpInput = (item) => {
  const r = item.rarity?.name || ''; const n = item.name || '';
  if (isKnife(item) || isGloves(item)) return false;
  if (['Contraband', 'Rare Special'].includes(r)) return false;
  if (/(Charm|Sticker|Patch|Pin)/i.test(n)) return false;
  return true; // 'Covert' ARTIK İZİNLİ (simülatöre özel kural)
};

// ÇIKTI kuralı: Bıçak/Eldiven/Charm/Sticker STANDART akışta sonuç olarak çıkamaz,
// ANCAK Covert (Kırmızı) burada İZİN VERİLİR — çünkü gerçek CS2'de
// Classified -> Covert, standart trade-up'ın olabileceği EN ÜST seviyesidir.
// (Bıçaklar yalnızca aşağıdaki Covert->Knife özel tarifiyle çıkabilir.)
const isValidTradeUpOutput = (item) => {
  if (isKnife(item) || isGloves(item)) return false;
  if (/(Charm|Sticker|Patch|Pin)/i.test(item.name || '')) return false;
  return true;
};

// Bağımsız ve Kompakt Float Kaydırıcı — hem slider hem klavyeden yazma destekli.
// NOT: Metin kutusu `value` prop'una DOĞRUDAN bağlı DEĞİL — kendi local state'i var.
// Eskiden her tuş vuruşunda onChange(n) tetiklenip value.toFixed(4) kutuya geri
// yazılıyordu; bu da imleci/yazılan karakteri anında eziyordu (kullanıcı klavyeyle
// yazamıyormuş gibi hissediyordu). Artık kutu kendi metnini serbestçe tutuyor,
// sadece SLIDER gibi DIŞARIDAN gelen değişikliklerde value ile senkronlanıyor.
function CompactFloatSlider({ value, min, max, onChange }) {
  const wearName = getWearFromFloat(value);
  const [text, setText] = useState(value.toFixed(4));
  const [focused, setFocused] = useState(false);
  const lastCommitted = useRef(value);
  const inputRef = useRef(null);

  useEffect(() => {
    if (Math.abs(value - lastCommitted.current) > 0.00001) {
      setText(value.toFixed(4));
      lastCommitted.current = value;
    }
  }, [value]);

  const handleTextChange = (t) => {
    setText(t);
    const n = parseFloat(t.replace(',', '.'));
    if (!isNaN(n) && n >= min && n <= max) {
      lastCommitted.current = n;
      onChange(n);
    }
  };

  const handleSliderChange = (v) => {
    lastCommitted.current = v;
    setText(v.toFixed(4));
    onChange(v);
  };

  // ============================================================
  // MOBİL KLAVYE DÜZELTMESİ — "float yazarken eşya kayboluyor"
  // ============================================================
  // SORUN: Telefonda float kutusuna dokunulunca ekran klavyesi açılıyor, eşya
  // kartı ve yazılan değer ekrandan tamamen çıkıyordu; kullanıcı ancak
  // klavyeyi kapatınca ne yazdığını görebiliyordu.
  //
  // İKİ PARÇALI ÇÖZÜM:
  //  1) public/index.html → viewport'a `interactive-widget=resizes-content`.
  //     Tarayıcının varsayılanı `resizes-visual`'dır: klavye açılınca DÜZEN
  //     viewport'u küçülmez, yalnızca görsel viewport kayar. `body` zaten
  //     `overflow: hidden` olduğu için sayfa kaydırılamıyor ve odaklanan kutu
  //     klavyenin ARKASINDA kalıyordu.
  //  2) Aşağıdaki `onFocus`: kartın TAMAMINI ekranın ortasına kaydırır.
  //
  // ⚠️ NEDEN KUTUYU DEĞİL KARTI KAYDIRIYORUZ: kutuyu ortalamak yeterli
  // görünüyor ama kullanıcı float'ı EŞYAYA BAKARAK ayarlıyor. Kart ortalanınca
  // görsel + isim + yazdığı değer aynı anda görünür kalıyor.
  //
  // ⚠️ GECİKME ŞART: klavye açılma animasyonu sürerken kaydırırsak tarayıcı
  // düzeni yeniden hesaplayınca hedef kayıyor. 320 ms, Android Chrome ve iOS
  // Safari'nin klavye animasyonundan biraz uzun.
  const handleFocus = () => {
    setFocused(true);
    if (Platform.OS !== 'web') return;
    setTimeout(() => {
      const node = inputRef.current;
      if (!node || typeof node.closest !== 'function') return;
      const target = node.closest('[data-tradecard]') || node;
      target.scrollIntoView?.({ block: 'center', behavior: 'smooth' });
    }, 320);
  };

  return (
    <View style={fc.wrapper}>
      <View style={fc.row}>
        <Text style={fc.wearLabel} numberOfLines={1}>{wearName}</Text>
        <TextInput
          ref={inputRef}
          style={[fc.input, focused && fc.inputFocused]}
          keyboardType="decimal-pad"
          inputMode="decimal"
          value={text}
          onChangeText={handleTextChange}
          onFocus={handleFocus}
          onBlur={() => { setFocused(false); setText(value.toFixed(4)); }}
        />
      </View>
      <Slider style={{ width: '100%', height: 22 }} minimumValue={min} maximumValue={max} value={value} onValueChange={handleSliderChange} minimumTrackTintColor={C.accent} maximumTrackTintColor={C.surfaceSunken} thumbTintColor={C.accentDeep} />
    </View>
  );
}

const fc = StyleSheet.create({
  wrapper: { width: '100%', marginTop: 6 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  wearLabel: { color: C.textDim, fontSize: 9, fontWeight: '800', flexShrink: 1, marginRight: 4 },
  // ⚠️ Odaklanınca belirgin bir çerçeve: mobilde kart ekranın ortasına
  // kaydırıldığında kullanıcının HANGİ kutuya yazdığını görmesi gerekiyor.
  input: { backgroundColor: C.surfaceAlt, color: C.text, fontSize: 11, paddingVertical: 5, paddingHorizontal: 6, borderRadius: 3, width: 58, textAlign: 'center', fontWeight: '800', outlineStyle: 'none', borderWidth: 1, borderColor: C.border },
  inputFocused: { borderColor: C.accent, backgroundColor: C.surface, color: C.accentDeep }
});

// Dikey KART formatındaki eşya kutucuğu. `locked` -> AKILLI YUVA KİLİTLEME:
// mevcut seçime göre bu boş slotun doldurulmasının bir anlamı kalmadıysa
// (üst nadirlikte hiç uygun çıktı bulunamıyorsa) kilitli gösterilir.
function TradeCard({ entry, index, cardWidth, locked, onPress, onLockedPress, onRemove, onClone, onFloatChange, t }) {
  if (!entry) {
    if (locked) {
      return (
        <TouchableOpacity style={[card.empty, card.lockedCard, { width: cardWidth }]} onPress={onLockedPress}>
          <IconLock size={20} color={C.textFaint} />
          <Text style={card.lockedTxt}>{t('tradeup.locked')}</Text>
        </TouchableOpacity>
      );
    }
    return (
      <TouchableOpacity style={[card.empty, { width: cardWidth }]} onPress={onPress}>
        <Text style={card.emptyIcon}>+</Text>
        <Text style={card.emptyTxt}>{t('tradeup.addItem')}</Text>
      </TouchableOpacity>
    );
  }
  const min = entry.skin.min_float ?? 0; const max = entry.skin.max_float ?? 1;
  return (
    // `dataSet` -> DOM'da `data-tradecard="1"` olur. Float kutusuna
    // odaklanıldığında mobil klavye düzeltmesi bu işaretle KARTIN tamamını
    // buluyor ve ekranın ortasına kaydırıyor (bkz. CompactFloatSlider.handleFocus).
    <View dataSet={{ tradecard: '1' }} style={[card.filled, { width: cardWidth, borderTopColor: entry.skin.rarity?.color || C.borderStrong }]}>
      <TouchableOpacity style={card.removeBtn} onPress={() => onRemove(index)}>
        <Text style={card.removeTxt}>✕</Text>
      </TouchableOpacity>
      <Image source={{ uri: entry.skin.image }} style={card.img} resizeMode="contain" />
      <Text style={card.name} numberOfLines={1}>{entry.skin.name}</Text>
      <Text style={card.price}>${entry.price.toFixed(2)}</Text>
      <CompactFloatSlider value={entry.float} min={min} max={max} onChange={v => onFloatChange(index, v)} />
      <TouchableOpacity style={card.cloneBtn} onPress={() => onClone(index)}>
        <Text style={card.cloneTxt}>{t('tradeup.clone')}</Text>
      </TouchableOpacity>
    </View>
  );
}

const card = StyleSheet.create({
  empty: { minHeight: 158, backgroundColor: C.surfaceAlt, borderRadius: 4, borderWidth: 2, borderColor: C.borderStrong, borderStyle: 'dashed', justifyContent: 'center', alignItems: 'center' },
  emptyIcon: { color: C.accent, fontSize: 28, fontWeight: '800' },
  emptyTxt: { color: C.textDim, fontSize: 11, fontWeight: '800', marginTop: 4 },
  lockedCard: { backgroundColor: C.surfaceSunken, borderColor: C.borderStrong, opacity: 0.75 },
  lockIcon: { fontSize: 22 },
  lockedTxt: { color: C.textDim, fontSize: 11, fontWeight: '800', marginTop: 4 },
  filled: { minHeight: 158, backgroundColor: C.surface, borderRadius: 4, borderWidth: 1, borderColor: C.border, borderTopWidth: 4, padding: 8, position: 'relative' },
  removeBtn: { position: 'absolute', top: 7, right: 7, width: 22, height: 22, borderRadius: 11, backgroundColor: C.dangerSoft, alignItems: 'center', justifyContent: 'center', zIndex: 2 },
  removeTxt: { color: C.danger, fontSize: 12, fontWeight: '800' },
  img: { width: '100%', height: 42, marginTop: 4 },
  name: { color: C.text, fontSize: 10, fontWeight: '700', marginTop: 6, textAlign: 'center' },
  price: { color: C.success, fontSize: 11, fontWeight: '800', textAlign: 'center', marginTop: 1 },
  cloneBtn: { marginTop: 6, backgroundColor: C.accent, paddingVertical: 5, borderRadius: 4, alignItems: 'center' },
  cloneTxt: { color: C.onAccent, fontSize: 9, fontWeight: '800' }
});

// SAĞ PANEL / ALT PANEL İÇERİĞİ (geniş ekranda sticky sidebar, dar ekranda
// grid'in altında) — TEK bir yerden render edilip iki layout'ta da kullanılır.
// ============================================================
// SONUÇ YER TUTUCUSU (PLACEHOLDER)
// ============================================================
// ⚠️ Kullanıcı isteği (30 Ağu 2026): sözleşme tamamlanmadan da çıktıların
// NEREDE belireceği anlaşılsın. Boş, şeffaf çerçeveli kutucuklar o alanı
// fiziksel olarak rezerve ediyor; sözleşme dolunca aynı yerde gerçek çıktı
// listesi basılıyor — panel "zıplamıyor".
//
// ⚠️ HEM 0/10'DA HEM 1-9/10'DA görünür: kullanıcı daha ilk eşyayı koymadan
// da alanı görmeli. Bu yüzden `SummaryContent`in İKİ erken dönüş dalında da
// çağrılıyor.
//
// ⚠️ `pointerEvents="none"`: tıklanabilir görünüp hiçbir şey yapmamaları
// kullanıcıyı yanıltırdı.
function OutcomePlaceholder({ t }) {
  return (
    <>
      <Text style={ts.placeholderTitle}>{t('tradeup.outcomesPlaceholder')}</Text>
      <View pointerEvents="none" style={ts.placeholderList}>
        {Array.from({ length: 4 }).map((_, i) => (
          <View key={i} style={ts.placeholderRow}>
            <View style={ts.placeholderThumb} />
            <View style={ts.placeholderLines}>
              <View style={[ts.placeholderBar, { width: '62%' }]} />
              <View style={[ts.placeholderBar, { width: '34%', marginTop: 5, height: 6 }]} />
            </View>
            <View style={[ts.placeholderBar, { width: 44, height: 9 }]} />
          </View>
        ))}
      </View>
    </>
  );
}

// ⚠️ SONUÇLAR YALNIZCA SÖZLEŞME TAMAMLANINCA GÖRÜNÜR (29 Ağu 2026)
// ============================================================
// Eskiden 2. eşya konur konmaz olası çıktılar, yüzdeler ve kâr tahmini
// ekrana geliyordu. İki sorunu vardı:
//   1) O rakamlar YARIM bir sözleşmeye aitti — 2 eşyalık girdi değerine göre
//      hesaplanan "%228 kâr" gerçek (10'lu) sözleşmede hiçbir zaman oluşmuyordu.
//      Kullanıcı, imzalayınca göreceğinden tamamen farklı bir tablo görüyordu.
//   2) Sürpriz kalmıyordu: çıktı havuzu daha yuvalar dolmadan açılıyordu.
//
// Artık panel `ready` (filledCount === requiredCount) olana kadar yalnızca bir
// ilerleme göstergesi basar. `analysis` ARKA PLANDA hesaplanmaya devam eder —
// yuva kilitleme (isDeadEnd) ve İmzala butonunun etkinliği ona bağlı.
function SummaryContent({ analysis, filledCount, requiredCount, ready, profitAmount, profitPct, t }) {
  if (!analysis) {
    return (
      <View style={ts.lockedWrap}>
        <Text style={ts.emptyHint}>{t('tradeup.emptyHint')}</Text>
        <OutcomePlaceholder t={t} />
      </View>
    );
  }
  if (!ready) {
    return (
      <View style={ts.lockedWrap}>
        <View style={ts.progressTrack}>
          <View style={[ts.progressFill, { width: `${Math.round((filledCount / requiredCount) * 100)}%` }]} />
        </View>
        <Text style={ts.progressCount}>{filledCount} / {requiredCount}</Text>
        <Text style={ts.lockedTxt}>{t('tradeup.lockedUntilFull', { n: requiredCount, done: filledCount })}</Text>

        <OutcomePlaceholder t={t} />
      </View>
    );
  }
  return (
    <>
      <View style={ts.statGrid}>
        <View style={ts.statItem}>
          <Text style={ts.statLbl}>{t('tradeup.avgFloat')}</Text>
          <Text style={ts.statVal}>{analysis.avgFloat.toFixed(4)}</Text>
        </View>
        <View style={ts.statItem}>
          <Text style={ts.statLbl}>{t('tradeup.totalCost')}</Text>
          {/* ⚠️ Bilerek NÖTR renk: bu bir tahsilat değil, girdilerin toplam
              piyasa değeri. Kırmızı gösterilince gider sanılıyordu. */}
          <Text style={ts.statVal}>${analysis.totalCost.toFixed(2)}</Text>
        </View>
        <View style={ts.statItem}>
          <Text style={ts.statLbl}>{t('tradeup.expectedValue')}</Text>
          <Text style={[ts.statVal, { color: C.success }]}>${analysis.ev.toFixed(2)}</Text>
        </View>
        <View style={ts.statItem}>
          <Text style={ts.statLbl}>{t('tradeup.estProfit')}</Text>
          <Text style={[ts.statVal, { color: profitAmount >= 0 ? C.success : C.danger }]}>{formatSignedMoney(profitAmount)} (%{profitPct.toFixed(0)})</Text>
        </View>
      </View>

      {analysis.sourceCollectionNames?.length > 0 && (
        <Text style={ts.sourceTxt} numberOfLines={2}>{t('tradeup.source', { names: analysis.sourceCollectionNames.join(', ') })}</Text>
      )}

      {analysis.isKnifeRecipe && (
        <View style={ts.knifeBanner}>
          <Text style={ts.knifeBannerTxt}>
            <Text style={{ fontWeight: '800' }}>{t('tradeup.knifeRecipe')}</Text> {t('tradeup.knifeRecipeBody')}
          </Text>
        </View>
      )}

      {analysis.outcomes.length === 0 ? (
        <Text style={[ts.emptyHint, { marginTop: 14 }]}>{t('tradeup.noOutcomes')}</Text>
      ) : (
        <>
          <Text style={ts.outcomesTitle}>{t('tradeup.outcomes', { n: analysis.outcomes.length })}</Text>
          <View style={ts.outcomeList}>
            {/* ⚠️ Bıçak havuzu 500+ öğe olabildiği için liste kırpılır — hepsini
                basmak paneli kullanılamaz hale getirirdi. EV ve çekiliş yine de
                TÜM havuz üzerinden hesaplanıyor.
                ⚠️ EN DEĞERLİDEN sıralanıyor: kırpma yapıldığı için rastgele 24
                değil, EN İYİ 24 ödül gösterilsin. */}
            {[...analysis.outcomes]
              .sort((a, b) => (b.price ?? 0) - (a.price ?? 0))
              .slice(0, OUTCOME_RENDER_CAP)
              .map((o, i) => (
                <View key={i} style={ts.outcomeRow}>
                  {/* Kullanıcı ne kazanabileceğini GÖRSÜN — sadece isim yetmiyor */}
                  <Image source={{ uri: o.skin.image }} style={ts.outcomeImg} resizeMode="contain" />
                  <View style={ts.outcomeInfo}>
                    <Text style={[ts.outcomeName, { color: o.skin.rarity?.color || C.text }]} numberOfLines={1}>
                      {o.skin.name}
                    </Text>
                    <Text style={ts.outcomePct}>
                      %{o.chance < 0.5 ? o.chance.toFixed(2) : o.chance.toFixed(1)}
                    </Text>
                  </View>
                  {/* Tahmini fiyat — ihtimalin yanında değeri de görünsün */}
                  <Text style={ts.outcomePrice}>${(o.price ?? 0).toFixed(2)}</Text>
                </View>
              ))}
            {analysis.outcomes.length > OUTCOME_RENDER_CAP && (
              <Text style={ts.outcomeMore}>
                {t('tradeup.moreItems', { n: analysis.outcomes.length - OUTCOME_RENDER_CAP })}
              </Text>
            )}
          </View>
        </>
      )}
    </>
  );
}

// ============================================================
// TRADE-UP = ÜCRETSİZ ANALİZ ARACI (bakiyeden BAĞIMSIZ)
// ============================================================
// Bu ekran bir "oyun modu" değil, bir kârlılık/olasılık simülatörüdür.
// Sözleşme imzalamak bakiyeden PARA DÜŞMEZ, envanterden eşya SİLMEZ ve bakiye
// yetersizliği diye bir ret durumu YOKTUR. Gösterilen para değerleri yalnızca
// ANALİZ amaçlıdır. (Kasa/Terminal/Armory ekranları bakiyeyi kullanmaya devam
// eder — ücretsizlik YALNIZCA bu ekrana özgüdür.)
//
// ⚠️ BU EKRANA `setBalance` PROP'U GEÇİRMEYİN.
// Ücretsizlik bir "if" koşuluyla değil, YAPISAL olarak garanti altındadır:
// bileşenin bakiyeye erişimi yoktur, dolayısıyla yanlışlıkla bile para
// düşüremez. `gameMode` prop'u da bu yüzden kaldırıldı — hiç kullanılmıyordu
// ama "burada da mod farkı var" izlenimi veriyordu.
//
// ⚠️ "Toplam Maliyet" etiketi "Girdi Değeri" olarak DEĞİŞTİRİLDİ ve kırmızı
// (tehlike) renginden çıkarıldı: kullanıcılar bu satırı bir TAHSİLAT sanıp
// "Trade-Up bakiyemden düşüyor" diye bildirdi. Sayı aynı, yalnızca artık bir
// gider gibi görünmüyor.
export default function TradeUpScreen({ inventory, setInventory, priceMap, allCollections, history = [], setHistory, pendingItem, onPendingItemHandled }) {
  const { t, lang } = useI18n();
  const [allSkins, setAllSkins] = useState([]);
  const [loading, setLoading] = useState(true);
  const [slots, setSlots] = useState(Array(TOTAL_SLOTS).fill(null));
  const [pickerOpen, setPickerOpen] = useState(false);
  const [editingSlot, setEditingSlot] = useState(null);
  const [searchText, setSearchText] = useState('');
  const [subTab, setSubTab] = useState('contract'); // 'contract' | 'history'
  const [recentSkinNames, setRecentSkinNames] = useState([]); // en son seçilen eşyalar (arama/kalabalık UX'i için)

  const [analysis, setAnalysis] = useState(null);
  const [wonItem, setWonItem] = useState(null);
  const { toast, showToast } = useToast();

  const { width: winWidth } = useWindowDimensions();

  // STICKY SAĞ PANEL: geniş ekranda (masaüstü) eşya grid'i solda kendi
  // ScrollView'ında kayarken, istatistik paneli sağda SABİT kalır — kullanıcı
  // deneme-yanılma yaparken sayfayı aşağı kaydırmaya gerek kalmaz. Dar
  // ekranda (mobil) sidebar'a yer yok; panel grid'in altına iner.
  const isWideLayout = winWidth >= 900;
  const SIDEBAR_WIDTH = SIDEBAR_W;
  const SCROLLBAR_GUTTER = 20;
  const CONTENT_PADDING = 20; // ScrollView content padding (10 sol + 10 sağ)
  const GRID_GAP = 8;

  // ÖNEMLİ: Sütun genişliğini SADECE ham pencere genişliğinden hesaplamak
  // YANLIŞ — dikey tarayıcı kaydırma çubuğu (~15-17px) gerçek içerik alanını
  // daraltıyor. Ölçüme güvenmek yerine sabit bir pay (SCROLLBAR_GUTTER)
  // ayırıyoruz — az bir boşluk pahasına HER ZAMAN doğru sığdırıyor.
  // ⚠️ GRID PANELİNİN KENDİ PADDING'İ DE DÜŞÜLMELİ.
  // Zincir (1280px'te ölçüldü):
  //   pencere 1280 → sidebar(330) → kaydırma çubuğu(~15) → ScrollView 935
  //   → içerik padding(2×10) → panel 915 → PANEL padding(2×10) → grid 893
  // Panel padding'i hesaba katılmadığı için alan 910 sanılıyor, 5 kart
  // 910px istiyor ve 893'e sığmayıp 4'e düşüyordu — "10 slot iki satıra
  // sığsın" hedefi bu yüzden tutmuyordu.
  const PANEL_PADDING = 20; // ts.gridPanel padding (10 sol + 10 sağ)
  const gridAreaWidth = (isWideLayout
    ? winWidth - SIDEBAR_WIDTH - CONTENT_PADDING - SCROLLBAR_GUTTER
    : winWidth - CONTENT_PADDING - SCROLLBAR_GUTTER) - PANEL_PADDING;
  // ⚠️ 10 SLOT İKİ SATIRDA: Kullanıcı "silahlar ekranın çok altında kalıyor"
  // dedi. Sebep, kartların geniş olması yüzünden 10 slotun 3-5 satıra
  // yayılmasıydı. Artık mümkün olan her yerde 5 sütun tercih ediliyor →
  // 5×2 = 10, tek ekranda görünüyor. Kartlar da daha DAR ve DİKEY.
  const columns = gridAreaWidth >= 860 ? 5 : gridAreaWidth >= 640 ? 4 : gridAreaWidth >= 420 ? 3 : 2;
  const cardWidth = (gridAreaWidth - GRID_GAP * (columns - 1)) / columns;

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

  // SARI (ÖZEL) HAVUZ: Covert->Bıçak/Eldiven özel tarifinin çıktı havuzu.
  // Veritabanındaki TÜM bıçaklar (576) ve eldivenler (94) eşit ihtimalle çıkabilir.
  const knifePool = useMemo(
    () => (allSkins || []).filter(s => isKnife(s) || isGloves(s)),
    [allSkins]
  );

  useEffect(() => {
    let cancelled = false;
    // Ağ çağrısı src/api.js üzerinden (tek merkez) — hata durumunda [] döner.
    fetchSkins()
      .then(data => { if (!cancelled) { setAllSkins(data || []); setLoading(false); } })
      .catch(() => { if (!cancelled) setLoading(false); });
    // Bileşen unmount olursa (kullanıcı sekmeyi hızlıca değiştirirse) gecikmiş
    // fetch cevabı artık mevcut olmayan state'i güncellemeye çalışmasın.
    return () => { cancelled = true; };
  }, []);

  // OTOMATİK HESAPLAMA (Hesapla butonuna gerek yok)
  useEffect(() => {
    const validSlots = slots.filter(Boolean);
    if (validSlots.length === 0) { setAnalysis(null); return; }

    const inputRarity = validSlots[0].skin.rarity?.name;
    // ÖZEL TARİF (Custom Recipe): 5x Covert (Kırmızı) girdi -> Sarı (Bıçak/Eldiven) çıktısı.
    // Gerçek CS2 hiyerarşisinde Covert'ün üstü yoktur; bu geçiş simülatöre özeldir.
    const isKnifeRecipe = inputRarity === 'Covert';
    const targetRarity = isKnifeRecipe ? 'Covert' : NEXT_RARITY_NAME[inputRarity];
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

    const buildOutcome = (t, priceRarityOverride) => {
      // Float interpolasyonu: hedef eşyanın KENDİ min/max float aralığı içinde,
      // girdilerin ortalama (0-1) float konumuna karşılık gelen noktayı hesaplar.
      const targetMin = t.min_float ?? 0;
      const targetMax = t.max_float ?? 1;
      const f = parseFloat((targetMin + avgFloat * (targetMax - targetMin)).toFixed(4));
      return { skin: t, outFloat: f, price: getRealisticPrice(priceMap, t, f, false, priceRarityOverride ?? targetRarity) };
    };

    let possibleOutcomes = [];
    const totalVotes = Object.values(collectionVotes).reduce((a, b) => a + b, 0);

    // ============================================================
    // ÖZEL TARİF: 5x COVERT (Kırmızı) -> RASTGELE BIÇAK / ELDİVEN
    // ============================================================
    // Koleksiyon oylaması burada UYGULANMAZ: bıçaklar hiçbir silah
    // koleksiyonuna ait değildir, ayrı bir havuzdur. Bu yüzden tüm bıçak
    // + eldiven veritabanı eşit ihtimalle çıktı havuzunu oluşturur. Fiyatlandırmada
    // 'Rare Special' kullanıyoruz — bıçak/eldivenler Covert silahlardan çok daha pahalıdır.
    if (isKnifeRecipe) {
      if (knifePool.length > 0) {
        const per = 100 / knifePool.length;
        knifePool.forEach(k => possibleOutcomes.push({ ...buildOutcome(k, 'Rare Special'), chance: per }));
      }
    } else if (totalVotes > 0) {
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
    // ÖNCELİKLENDİRME: API'nin döndürdüğü SIRAYA göre ilk 10'u almak yerine
    // (bu, tanıdık Covert eşyaların ör. Asiimov neredeyse hiç çıkmamasına
    // sebep oluyordu — veri eksik değildi, sadece gömülüydü) POPULAR_SKIN_PRIORITY
    // listesindeki eşyaları öne alıyoruz.
    if (possibleOutcomes.length === 0 && !isKnifeRecipe) {
      const candidates = allSkins.filter(s => s.rarity?.name === targetRarity && isValidTradeUpOutput(s));
      const prioritized = [...candidates].sort((a, b) => {
        const ai = POPULAR_SKIN_PRIORITY.indexOf(a.name);
        const bi = POPULAR_SKIN_PRIORITY.indexOf(b.name);
        return (ai === -1 ? 999 : ai) - (bi === -1 ? 999 : bi);
      });
      const targets = prioritized.slice(0, 10);
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
    const sourceCollectionNames = isKnifeRecipe
      ? ['Bıçak / Eldiven Havuzu (Simülatöre Özel Kural)']
      : totalVotes > 0
        ? Object.keys(collectionVotes).map(id => collectionById[id]?.name).filter(Boolean)
        : [];
    setAnalysis({ avgFloat, totalCost, ev, outcomes: possibleOutcomes, sourceCollectionNames, isKnifeRecipe });
  }, [slots, allSkins, priceMap, skinToCollections, knifePool]);

  const lockedRarity = slots.find(s => s !== null)?.skin?.rarity?.name || null;
  const filledCount = slots.filter(Boolean).length;

  // ENVANTERDEN EKLEME: Envanter ekranındaki "İncele" modalından
  // "Trade-Up'a Ekle" denince App.js bu prop'u doldurur; burada ilk uygun
  // yuvaya yerleştirip prop'u temizliyoruz.
  useEffect(() => {
    if (!pendingItem) return;
    const done = () => onPendingItemHandled?.();

    if (!isValidTradeUpInput(pendingItem)) {
      showToast(t('tradeup.invalidInput'), 'error');
      return done();
    }
    if (typeof pendingItem.float !== 'number') {
      // ⚠️ Sabit metin yazma yasağı (Altın Kural 7): bu satır Türkçe gömülüydü
      // ve İngilizce arayüzde de Türkçe görünüyordu.
      showToast(t('tradeup.noFloat'), 'error');
      return done();
    }
    const r = pendingItem.rarity?.name;
    if (lockedRarity && r !== lockedRarity) {
      showToast(t('tradeup.rarityLocked', { rarity: lockedRarity }), 'error');
      return done();
    }

    const limit = r === 'Covert' ? KNIFE_RECIPE_SLOTS : TOTAL_SLOTS;
    let placed = false;
    setSlots(prev => {
      const free = prev.findIndex((sl, i) => i < limit && sl === null);
      if (free === -1) return prev;
      placed = true;
      const n = [...prev];
      n[free] = { skin: pendingItem, float: pendingItem.float, price: pendingItem.price };
      for (let i = limit; i < n.length; i++) n[i] = null;
      return n;
    });
    setSubTab('contract');
    setTimeout(() => showToast(placed ? `${pendingItem.name} sözleşmeye eklendi.` : 'Boş yuva kalmadı.', placed ? 'success' : 'error'), 0);
    done();
  }, [pendingItem]);

  // AKTİF TARİF: ilk seçilen eşya Covert ise 5'li Bıçak/Eldiven tarifi devrededir.
  const isKnifeRecipeActive = lockedRarity === 'Covert';
  // Bu sözleşmede kaç yuva KULLANILABİLİR (gerisi kilitlenir) ve kaç eşya gerekir.
  const requiredCount = isKnifeRecipeActive ? KNIFE_RECIPE_SLOTS : TOTAL_SLOTS;

  // AKILLI YUVA KİLİTLEME: en az 1 eşya seçilmiş ama henüz 10 dolmamışken,
  // mevcut kombinasyonun olası HİÇBİR çıktısı yoksa (örn. bu nadirlikte hiçbir
  // koleksiyonda üst-tier eşya kalmamışsa) kalan boş yuvaları doldurmanın
  // anlamı kalmaz — kilitli göster ki kullanıcı zaman kaybetmesin.
  const isDeadEnd = !!lockedRarity && filledCount > 0 && filledCount < 10 && analysis && analysis.outcomes.length === 0;

  const handleSelect = (skin) => {
    const def = skin.min_float ? skin.min_float + 0.05 : 0.15;
    // Fiyat SEÇİM ANINDA bir kez hesaplanıp slotta saklanır — render sırasında tekrar
    // tekrar hesaplanmadığı için diğer slotlar etkilenmez (bkz. handleFloatChange notu).
    const price = getRealisticPrice(priceMap, skin, def, false, skin.rarity?.name);

    // Covert seçilirse tarif 5'liye düşer. Kullanıcı boş bir ekranda ÖNCE 8. yuvaya
    // tıklayıp sonra Covert seçmiş olabilir — bu durumda eşyayı izinli aralığa
    // (ilk 5 yuva) taşımalı ve aralık dışında kalan her şeyi temizlemeliyiz.
    // Aksi halde "kilitli" gösterilen bir yuvada eşya durur ve sayım bozulurdu.
    const limit = skin.rarity?.name === 'Covert' ? KNIFE_RECIPE_SLOTS : TOTAL_SLOTS;

    setSlots(prev => {
      const n = [...prev];
      let target = editingSlot;
      if (target >= limit) {
        const free = n.findIndex((s, i) => i < limit && s === null);
        if (free === -1) return prev; // izinli aralıkta boş yer yok
        target = free;
      }
      n[target] = { skin, float: def, price };
      for (let i = limit; i < n.length; i++) n[i] = null;
      return n;
    });

    setRecentSkinNames(prev => [skin.name, ...prev.filter(n => n !== skin.name)].slice(0, 15));
    setPickerOpen(false);
  };

  const cloneSlot = (idx) => {
    // STATE YARIŞI DÜZELTMESİ: eskiden dışarıdaki `slots` closure'ından okunuyordu;
    // art arda hızlı tıklamalarda (React'in state batching'i yüzünden) yanlış/eski
    // bir kopya alınabiliyordu. Fonksiyonel güncelleme her zaman en güncel state'i kullanır.
    setSlots(prev => {
      const item = prev[idx]; if (!item) return prev;
      // Kilitli yuvalara kopyalama YAPILMAZ — Covert tarifinde yalnızca ilk 5
      // yuva doldurulabilir.
      const limit = item.skin?.rarity?.name === 'Covert' ? KNIFE_RECIPE_SLOTS : TOTAL_SLOTS;
      const emptyIdx = prev.findIndex((s, i) => i < limit && s === null);
      if (emptyIdx === -1) return prev;
      const n = [...prev];
      // DİKKAT: Deep clone yapılarak float bug'ı kesin çözüldü!
      n[emptyIdx] = JSON.parse(JSON.stringify(item));
      return n;
    });
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

  const profitAmount = analysis ? analysis.ev - analysis.totalCost : 0;
  const profitPct = analysis && analysis.totalCost > 0 ? (profitAmount / analysis.totalCost) * 100 : 0;

  // SESSİZ HATA DÜZELTMESİ: `Alert.alert()` react-native-web'de çalışmıyor —
  // bu yüzden geçersiz bir kombinasyonla "Sözleşmeyi İmzala"ya basıldığında
  // kullanıcı HİÇBİR tepki almıyordu. Artık her ret nedeni ayrı, net bir Toast
  // mesajıyla açıklanıyor. Buton da artık SADECE sayıya değil, geçerli bir
  // analiz sonucu olup olmadığına göre de devre dışı bırakılıyor.
  const executeTradeUp = () => {
    if (filledCount !== requiredCount) {
      showToast(t('tradeup.needTen', { n: requiredCount }), 'error');
      return;
    }
    if (!analysis || analysis.outcomes.length === 0) {
      showToast(t('tradeup.noHigherTier'), 'error');
      return;
    }
    // NOT: Bakiye kontrolü/düşümü BİLEREK YOK — bkz. dosya başındaki açıklama.

    const roll = Math.random() * 100; let cum = 0; let winner = analysis.outcomes[0];
    for (let o of analysis.outcomes) { cum += o.chance; if (roll <= cum) { winner = o; break; } }

    // Bıçaklar CS2'de altın/sarı kenarlıkla gösterilir — nadirlik rengi (Covert
    // kırmızısı) yerine bunu kullanıp özel ödül hissini güçlendiriyoruz.
    const wonIsKnife = isKnife(winner.skin);
    const winColor = wonIsKnife ? RARITY.gold : winner.skin.rarity?.color;

    setWonItem({ ...winner.skin, float: winner.outFloat, price: winner.price, displayColor: winColor, isKnifeWin: wonIsKnife, wear: getWearFromFloat(winner.outFloat), pattern: generatePattern(), acquiredAt: Date.now(), uid: Date.now().toString(), source: wonIsKnife ? 'TRADE-UP ★' : 'TRADE-UP' });

    // GEÇMİŞ: kullanılan 10 girdiyi (skin+float+fiyat) ve sonucu kaydet — kullanıcı
    // "Geçmiş" sekmesinden tıklayınca aynı kombinasyon slotlara geri yüklenebilsin.
    const historyEntry = {
      id: Date.now().toString() + Math.random().toString(36).slice(2),
      timestamp: Date.now(),
      slots: JSON.parse(JSON.stringify(slots.filter(Boolean))),
      totalCost: analysis.totalCost,
      inputRarity: slots.find(s => s)?.skin?.rarity?.name || null,
      resultName: winner.skin.name,
      resultImage: winner.skin.image,
      resultColor: winColor,
      resultPrice: winner.price
    };
    setHistory?.(prev => [historyEntry, ...prev].slice(0, 15));

    setSlots(Array(TOTAL_SLOTS).fill(null));
  };

  // GEÇMİŞTEN YÜKLE: seçilen geçmiş kombinasyonu slotlara geri koyar, kullanıcı
  // aynı sözleşmeyi tekrar imzalayabilir hale gelir.
  const loadHistoryEntry = (entry) => {
    const restored = Array(TOTAL_SLOTS).fill(null);
    entry.slots.forEach((s, i) => { if (i < 10) restored[i] = s; });
    setSlots(restored);
    setSubTab('contract');
  };

  // Trade-Up ücretsiz bir analiz aracı olduğu için sonucu "satmak" da bakiyeye
  // para EKLEMEZ; sadece sonucu kapatır (envantere eklemek isteyen ekler).
  const discardResult = () => setWonItem(null);

  const startNewContract = () => setWonItem(null); // slotlar zaten executeTradeUp'ta sıfırlandı

  if (loading) return <View style={{flex: 1, justifyContent: 'center', alignItems: 'center'}}><ActivityIndicator color="#f39c12" /></View>;

  // EŞYA SEÇİM ARAMASI: ilk açılışta yüzlerce eşyayı BİRDEN listelemek yerine,
  // arama boşken sadece SON KULLANILAN eşyaları gösteriyoruz — kalabalığı
  // ortadan kaldırır, seçim pratik kalır.
  const searchActive = searchText.trim() !== '';
  const pickerPool = allSkins.filter(s => isValidTradeUpInput(s) && (!lockedRarity || s.rarity?.name === lockedRarity));
  const pickerData = searchActive
    ? pickerPool.filter(s => s.name.toLowerCase().includes(searchText.trim().toLowerCase())).slice(0, 100)
    : pickerPool
        .filter(s => recentSkinNames.includes(s.name))
        .sort((a, b) => recentSkinNames.indexOf(a.name) - recentSkinNames.indexOf(b.name));

  // AÇIKLAYICI BOŞ DURUM: arama sonucu boşsa, kullanıcı Kırmızı (Covert) bir
  // eşya (ör. Asiimov) aradığı için mi boş kaldığını göremiyordu — veri
  // eksikmiş gibi görünüyordu. Aslında bu eşyalar VAR ama trade-up'ın GİRDİSİ
  // olamıyorlar (gerçek CS2 kuralı: Covert zaten trade-up'ın EN ÜST SONUCUDUR,
  // girdi olarak kullanılamaz). Bunu arama sonucunda açıkça göstererek
  // "eşya sistemde yok" yanılgısını ortadan kaldırıyoruz.
  const excludedSearchMatches = searchActive && pickerData.length === 0
    ? allSkins.filter(s => s.name.toLowerCase().includes(searchText.trim().toLowerCase()) && !isValidTradeUpInput(s)).slice(0, 6)
    : [];

  // ============================================================
  // GİRDİ PANELİ — reset butonu ARTIK BURADA (grid'in sağ üst köşesi)
  // ============================================================
  // Eskiden "Seçimi Sıfırla" sayfanın genel başlık çubuğundaydı; hangi alanı
  // sıfırladığı belirsizdi. Artık doğrudan eşyaların eklendiği kutucuğun
  // başlığında duruyor — etki alanı görsel olarak açık.
  const gridElement = (
    <View style={ts.gridPanel}>
      <View style={ts.gridPanelHeader}>
        <Text style={ts.gridPanelTitle}>{t('tradeup.inputs')} ({filledCount}/{requiredCount})</Text>
        <TouchableOpacity style={ts.clearBtn} onPress={() => setSlots(Array(TOTAL_SLOTS).fill(null))}>
          <Text style={ts.clearTxt}>{t('tradeup.reset')}</Text>
        </TouchableOpacity>
      </View>
      <View style={[ts.grid, { gap: GRID_GAP }]}>
      {slots.map((entry, idx) => (
        <TradeCard
          key={idx}
          index={idx}
          entry={entry}
          cardWidth={cardWidth}
          // YUVA KİLİTLEME: (a) Covert tarifi aktifse 5. yuvadan sonrası kilitli,
          // (b) mevcut kombinasyonun hiç geçerli çıktısı yoksa kalan yuvalar kilitli.
          locked={!entry && (idx >= requiredCount || isDeadEnd)}
          onPress={() => { setEditingSlot(idx); setSearchText(''); setPickerOpen(true); }}
          onLockedPress={() => showToast(
            idx >= requiredCount
              ? t('tradeup.lockedCovert', { n: KNIFE_RECIPE_SLOTS })
              : t('tradeup.lockedDeadEnd'),
            'warning'
          )}
          onRemove={(i) => setSlots(prev => { const n = [...prev]; n[i] = null; return n; })}
          onClone={cloneSlot}
          onFloatChange={handleFloatChange}
          t={t}
        />
      ))}
      </View>
    </View>
  );

  // Sözleşme tamam mı? Covert (bıçak) tarifi 5, standart tarif 10 eşya ister.
  const contractReady = filledCount === requiredCount;
  const summaryElement = (
    <SummaryContent
      analysis={analysis}
      filledCount={filledCount}
      requiredCount={requiredCount}
      ready={contractReady}
      profitAmount={profitAmount}
      profitPct={profitPct}
      t={t}
    />
  );

  return (
    <SafeAreaView style={ts.container}>
      <ToastBanner toast={toast} />

      {/* BAŞLIK: Buradaki eski "🧪 Ücretsiz Analiz Modu" etiketi KALDIRILDI —
          kullanıcıya hiçbir şey anlatmıyordu. Yerini, sağ paneldeki asıl
          işlevi adlandıran "Olası İhtimaller & Karlılık Oranı" başlığı aldı.
          Sıfırlama butonu da buradan çıkıp girdi kutucuğunun başlığına taşındı. */}
      {/* ⚠️ "Ücretsiz simülatör — bakiyenizden düşülmez" ROZETİ KALDIRILDI
          (30 Ağu 2026 — kullanıcı isteği). Ücretsizlik hâlâ YAPISAL bir
          garantidir: bu ekrana `setBalance`/`gameMode` prop'ları hiç
          geçirilmez, yani bakiyeye erişimi yoktur. Rozet yalnızca görsel bir
          bilgilendirmeydi; kaldırılması davranışı DEĞİŞTİRMEZ.
          Metin `i18n.js`'te `tradeup.freeBadge` olarak duruyor — geri
          isterseniz yalnızca bu blok geri eklenir. */}
      <View style={ts.headerRow}>
        <Text style={ts.title}>{t('tradeup.title')}</Text>
      </View>

      <View style={ts.subTabRow}>
        <TouchableOpacity style={[ts.subTabBtn, subTab === 'contract' && ts.subTabBtnActive]} onPress={() => setSubTab('contract')}>
          <Text style={[ts.subTabTxt, subTab === 'contract' && ts.subTabTxtActive]}>{t('tradeup.tabContract')}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[ts.subTabBtn, subTab === 'history' && ts.subTabBtnActive]} onPress={() => setSubTab('history')}>
          <Text style={[ts.subTabTxt, subTab === 'history' && ts.subTabTxtActive]}>{t('tradeup.tabHistory', { n: history.length })}</Text>
        </TouchableOpacity>
      </View>

      {subTab === 'contract' ? (
        <>
          {isWideLayout ? (
            // GENİŞ EKRAN: sol tarafta kayan grid, sağda SABİT (sticky) özet paneli.
            <View style={{ flex: 1, flexDirection: 'row' }}>
              <ScrollView style={{ flex: 1 }} contentContainerStyle={ts.scrollContent}>
                {gridElement}
              </ScrollView>
              <View style={ts.sidebar}>
                <ScrollView contentContainerStyle={ts.sidebarScroll}>
                  {/* İşlevi net belirten başlık (eski "Ücretsiz Analiz Modu" yerine) */}
                  <Text style={ts.summaryTitle}>{t('tradeup.outcomesHeader')}</Text>
                  <Text style={ts.summarySub}>{t('tradeup.summary', { done: filledCount, total: requiredCount })}</Text>
                  {summaryElement}
                </ScrollView>
              </View>
            </View>
          ) : (
            // DAR EKRAN: grid ve özet tek scroll içinde alt alta.
            <ScrollView style={{ flex: 1 }} contentContainerStyle={ts.scrollContent}>
              {gridElement}
              <View style={ts.summaryPanel}>
                <Text style={ts.summaryTitle}>{t('tradeup.outcomesHeader')}</Text>
                <Text style={ts.summarySub}>{t('tradeup.summary', { done: filledCount, total: requiredCount })}</Text>
                {summaryElement}
              </View>
            </ScrollView>
          )}

          <View style={ts.footer}>
            <TouchableOpacity
              style={[ts.tradeBtn, (filledCount !== requiredCount || !analysis || analysis.outcomes.length === 0) && ts.tradeBtnDisabled]}
              onPress={executeTradeUp}
              disabled={filledCount !== requiredCount || !analysis || analysis.outcomes.length === 0}
            >
              <Text style={ts.tradeBtnTxt}>{t('tradeup.sign', { done: filledCount, total: requiredCount })}</Text>
            </TouchableOpacity>
          </View>
        </>
      ) : (
        <View style={{ flex: 1 }}>
          {history.length > 0 && (
            <TouchableOpacity style={ts.clearHistoryBtn} onPress={() => setHistory?.([])}>
              <Text style={ts.clearTxt}>{t('tradeup.clearHistory')}</Text>
            </TouchableOpacity>
          )}
          <FlatList
            data={history}
            keyExtractor={item => item.id}
            contentContainerStyle={{ padding: 10 }}
            ListEmptyComponent={<Text style={{ color: C.textDim, textAlign: 'center', marginTop: 40 }}>{t('tradeup.historyEmpty')}</Text>}
            renderItem={({ item }) => (
              <TouchableOpacity style={ts.historyCard} onPress={() => loadHistoryEntry(item)}>
                <Image source={{ uri: item.resultImage }} style={ts.historyImg} resizeMode="contain" />
                <View style={{ flex: 1, marginLeft: 10 }}>
                  <Text style={[ts.historyName, { color: item.resultColor }]} numberOfLines={1}>{item.resultName}</Text>
                  <Text style={ts.historyMeta}>{item.inputRarity || '—'} → {t('tradeup.totalCost')} ${item.totalCost.toFixed(2)}</Text>
                  {/* Tarih biçimi de dile uyar (tr-TR / en-GB) */}
                  <Text style={ts.historyMeta}>{new Date(item.timestamp).toLocaleString(lang === 'tr' ? 'tr-TR' : 'en-GB')}</Text>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={ts.historyPrice}>${item.resultPrice.toFixed(2)}</Text>
                  <Text style={ts.historyReload}>↻</Text>
                </View>
              </TouchableOpacity>
            )}
          />
        </View>
      )}

      {/* SONUÇ EKRANI (CS2 Tarzı Ortada) */}
      {wonItem && (
        <View style={ts.resultOverlay}>
          <View style={[ts.resultBox, { borderColor: wonItem.displayColor }]}>
            <Text style={{color: wonItem.isKnifeWin ? C.gold : C.success, fontSize: 22, fontWeight: '800'}}>
              {wonItem.isKnifeWin ? t('tradeup.knifeWin') : t('tradeup.contractSuccess')}
            </Text>
            <Image source={{ uri: wonItem.image }} style={{width: 200, height: 150, marginVertical: 15}} resizeMode="contain" />
            <Text style={{color: wonItem.displayColor, fontSize: 18, fontWeight: 'bold', textAlign: 'center'}}>{wonItem.name}</Text>
            <Text style={{color: C.text, fontSize: 14, marginVertical: 8}}>{t('tradeup.avgFloat')}: {wonItem.float.toFixed(4)} ({wonItem.wear})</Text>
            <View style={{flexDirection: 'row', gap: 10, marginTop: 15}}>
              <TouchableOpacity style={{backgroundColor: C.accent, padding: 12, borderRadius: R.md}} onPress={() => { setInventory(p => [...p, wonItem]); setWonItem(null); }}><Text style={{color: C.onAccent, fontWeight: '800'}}>{t('common.keep')}</Text></TouchableOpacity>
              <TouchableOpacity style={{backgroundColor: C.success, padding: 12, borderRadius: R.md}} onPress={discardResult}><Text style={{color: C.onAccent, fontWeight: '800'}}>{t('tradeup.closeResult')}</Text></TouchableOpacity>
            </View>
            <TouchableOpacity style={{marginTop: 14}} onPress={startNewContract}>
              <Text style={{color: C.textDim, fontSize: 12, textDecorationLine: 'underline'}}>{t('tradeup.newContract')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* GEÇERLİ EŞYA SEÇİCİ */}
      <Modal visible={pickerOpen} animationType="slide">
        <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }}>
          <View style={{ padding: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: C.surface, ...shadow.bar }}>
            <Text style={{ color: C.text, fontSize: 16, fontWeight: '800' }}>{t('tradeup.pickerTitle')}</Text>
            <TouchableOpacity onPress={() => setPickerOpen(false)}><Text style={{ color: C.danger, fontWeight: '800' }}>{t('contents.close')}</Text></TouchableOpacity>
          </View>
          <TextInput
            style={ts.pickerSearch}
            placeholder={t('tradeup.pickerSearch')}
            placeholderTextColor={C.textFaint}
            value={searchText}
            onChangeText={setSearchText}
            autoFocus
          />
          {!searchActive && (
            <Text style={ts.pickerHint}>
              {pickerData.length > 0 ? t('tradeup.recent') : t('tradeup.recentHint')}
            </Text>
          )}
          {excludedSearchMatches.length > 0 && (
            <View style={ts.excludedBanner}>
              <Text style={ts.excludedBannerTxt}>
                {t('tradeup.excluded', { q: searchText, n: excludedSearchMatches.length })}
              </Text>
              <View style={ts.excludedGrid}>
                {excludedSearchMatches.map(item => (
                  <View key={item.id} style={ts.excludedCard}>
                    <IconLock size={14} color={C.warn} />
                    <Image source={{ uri: item.image }} style={{ width: 44, height: 33, opacity: 0.5 }} resizeMode="contain" />
                    <Text style={ts.excludedName} numberOfLines={2}>{item.name}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}
          <FlatList
            data={pickerData}
            keyExtractor={i => i.id}
            numColumns={3}
            ListEmptyComponent={searchActive && excludedSearchMatches.length === 0 ? <Text style={ts.pickerEmpty}>{t('tradeup.pickerEmpty')}</Text> : null}
            renderItem={({ item }) => (
              <TouchableOpacity style={ts.pickerCard} onPress={() => handleSelect(item)}>
                <Image source={{ uri: item.image }} style={{ width: 60, height: 45 }} resizeMode="contain" />
                <Text style={{ color: C.textSoft, fontSize: 9, textAlign: 'center', fontWeight: '600' }}>{item.name}</Text>
                <Text style={{ color: item.rarity?.color, fontSize: 8 }}>{RARITY_LABELS[item.rarity?.name]}</Text>
              </TouchableOpacity>
            )}
          />
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const TU_MONO = 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace';

// ⚠️ TEK KAYNAK: Sidebar genişliği hem sütun hesabında hem de stilde
// kullanılıyor. İki yere ayrı ayrı yazıldığında biri 320, diğeri 330 kalmış
// ve grid alanı 10px fazla hesaplandığı için 5. kart alt satıra düşüyordu
// (ölçüldü: hesap 920px, gerçek 877px). Artık ikisi de bu sabitten okur.
const SIDEBAR_W = 330;

const ts = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 8, gap: 10, flexWrap: 'wrap' },
  title: { color: C.text, fontSize: 17, fontWeight: '800' },
  freeBadge: { backgroundColor: C.successSoft, paddingHorizontal: 12, paddingVertical: 7, borderRadius: R.md },
  freeBadgeTxt: { color: C.success, fontSize: 11, fontWeight: '800' },
  clearBtn: { backgroundColor: C.dangerSoft, borderWidth: 1, borderColor: '#f3cfcf', paddingHorizontal: 12, paddingVertical: 7, borderRadius: R.md },
  clearTxt: { color: C.danger, fontSize: 11, fontWeight: '800' },
  unlimitedTxt: { color: C.accentDeep, fontSize: 13, fontWeight: '800' },
  pickerSearch: { backgroundColor: C.surface, color: C.text, margin: 14, padding: 14, borderRadius: R.pill, fontSize: 14, outlineStyle: 'none', ...shadow.card },
  pickerHint: { color: C.textDim, fontSize: 11, textAlign: 'center', marginBottom: 10 },
  pickerEmpty: { color: C.textDim, fontSize: 12, textAlign: 'center', marginTop: 30 },
  excludedBanner: { margin: 14, padding: 14, backgroundColor: C.dangerSoft, borderLeftWidth: 4, borderLeftColor: C.danger, borderRadius: R.md },
  excludedBannerTxt: { color: '#a5453f', fontSize: 11, lineHeight: 17, fontWeight: '600' },
  excludedGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 },
  excludedCard: { width: 72, alignItems: 'center', backgroundColor: C.surface, borderRadius: R.md, padding: 7 },
  excludedLock: { fontSize: 12, marginBottom: 2 },
  excludedName: { color: C.textDim, fontSize: 8, textAlign: 'center', marginTop: 2 },
  scrollContent: { padding: 10, paddingBottom: 20 },

  // GİRDİ PANELİ — belirgin, keskin hatlı kutucuk
  gridPanel: { backgroundColor: C.surface, borderRadius: R.md, borderWidth: 1, borderColor: C.borderStrong, padding: 10 },
  gridPanelHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingBottom: 8, marginBottom: 10, borderBottomWidth: 1, borderBottomColor: C.border, gap: 10
  },
  gridPanelTitle: { color: C.text, fontSize: 13, fontWeight: '800', letterSpacing: 0.3, flexShrink: 1 },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  sidebar: { width: SIDEBAR_W, backgroundColor: C.surfaceAlt, borderLeftWidth: 1, borderLeftColor: C.borderStrong },
  sidebarScroll: { padding: 16 },
  summaryPanel: { backgroundColor: C.surface, borderRadius: R.sm, borderWidth: 1, borderColor: C.borderStrong, padding: 16, marginTop: 14 },
  summaryTitle: { color: C.text, fontSize: 14, fontWeight: '800', letterSpacing: 0.2 },
  summarySub: { color: C.textDim, fontSize: 11, fontWeight: '700', marginTop: 3, marginBottom: 14 },
  statGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 14 },
  statItem: { minWidth: 110 },
  statLbl: { color: C.textDim, fontSize: 10, fontWeight: '800' },
  statVal: { color: C.text, fontSize: 14, fontWeight: '800', marginTop: 3 },
  sourceTxt: { color: C.accentDeep, fontSize: 10, marginTop: 12, fontWeight: '600' },
  emptyHint: { color: C.textDim, fontSize: 12, textAlign: 'center', marginTop: 10, lineHeight: 19 },
  outcomesTitle: { color: C.textSoft, fontSize: 11, fontWeight: '800', marginTop: 16, marginBottom: 8 },
  // OLASI ÇIKTILAR — görsel + ad + ihtimal + tahmini fiyat (satır listesi).
  // Eskiden sadece ad + yüzde içeren "pill"lerdi; kullanıcı ne kazanacağını
  // göremiyordu.
  outcomeList: { gap: 4 },
  outcomeRow: {
    flexDirection: 'row', alignItems: 'center', gap: 9,
    backgroundColor: C.surfaceAlt, borderWidth: 1, borderColor: C.border,
    borderRadius: 4, paddingHorizontal: 8, paddingVertical: 6
  },
  outcomeImg: { width: 38, height: 28 },
  outcomeInfo: { flex: 1, minWidth: 0 },
  outcomeName: { fontSize: 10.5, fontWeight: '800' },
  outcomePct: { color: C.textDim, fontSize: 9.5, fontWeight: '700', marginTop: 1 },
  outcomePrice: { color: C.success, fontSize: 11.5, fontWeight: '800', fontFamily: TU_MONO },
  outcomeMore: { color: C.textDim, fontSize: 10, fontWeight: '700', textAlign: 'center', paddingVertical: 6 },

  // --- SÖZLEŞME TAMAMLANANA KADAR GÖSTERİLEN İLERLEME ---
  lockedWrap: { alignItems: 'center', paddingVertical: 22, paddingHorizontal: 8 },
  progressTrack: { width: '100%', maxWidth: 260, height: 6, backgroundColor: C.surfaceSunken, borderRadius: 3, overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: C.accent, borderRadius: 3 },
  progressCount: { color: C.text, fontSize: 22, fontWeight: '800', fontFamily: TU_MONO, marginTop: 10 },
  lockedTxt: { color: C.textDim, fontSize: 11.5, fontWeight: '600', textAlign: 'center', marginTop: 6, lineHeight: 17, maxWidth: 280 },

  // --- SONUÇ YER TUTUCUSU ---
  placeholderTitle: { color: C.textFaint, fontSize: 10, fontWeight: '800', letterSpacing: 1.2, textTransform: 'uppercase', marginTop: 20, marginBottom: 8 },
  placeholderList: { width: '100%', gap: 6 },
  placeholderRow: {
    flexDirection: 'row', alignItems: 'center', gap: 9,
    borderWidth: 1, borderColor: C.border, borderStyle: 'dashed',
    borderRadius: R.sm, paddingHorizontal: 8, paddingVertical: 8,
    backgroundColor: 'transparent'
  },
  placeholderThumb: { width: 34, height: 24, borderRadius: R.xs, backgroundColor: C.surfaceAlt },
  placeholderLines: { flex: 1, minWidth: 0 },
  placeholderBar: { height: 8, borderRadius: R.xs, backgroundColor: C.surfaceAlt },
  knifeBanner: { backgroundColor: '#fdf6dd', borderLeftWidth: 4, borderLeftColor: C.gold, borderRadius: R.md, padding: 12, marginTop: 14 },
  knifeBannerTxt: { color: '#8a6d08', fontSize: 10, lineHeight: 16, fontWeight: '600' },
  footer: { padding: 14, paddingBottom: 22, backgroundColor: C.surface, ...shadow.bar },
  tradeBtn: { backgroundColor: C.accent, padding: 16, borderRadius: R.sm, alignItems: 'center' },
  tradeBtnDisabled: { backgroundColor: C.borderStrong },
  tradeBtnTxt: { color: C.onAccent, fontSize: 16, fontWeight: '800', letterSpacing: 0.6 },
  pickerCard: { flex: 1, backgroundColor: C.surface, margin: 5, padding: 9, borderRadius: R.sm, borderWidth: 1, borderColor: C.border, alignItems: 'center', maxWidth: '31%' },
  resultOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(38, 48, 61, 0.55)', justifyContent: 'center', alignItems: 'center', zIndex: 100 },
  resultBox: { backgroundColor: C.surface, padding: 28, borderRadius: R.md, borderWidth: 3, alignItems: 'center', width: '90%', maxWidth: 420, ...shadow.modal },
  subTabRow: { flexDirection: 'row', paddingHorizontal: 14, paddingTop: 6, gap: 8 },
  subTabBtn: { paddingVertical: 9, paddingHorizontal: 16, borderRadius: R.md, backgroundColor: C.surface, borderWidth: 1, borderColor: C.borderStrong },
  subTabBtnActive: { backgroundColor: C.activeBg, ...activeIndicator('bottom', 2) },
  subTabTxt: { color: C.textSoft, fontSize: 12, fontWeight: '800' },
  subTabTxtActive: { color: C.onAccent },
  clearHistoryBtn: { backgroundColor: C.dangerSoft, margin: 14, marginBottom: 0, padding: 12, borderRadius: R.md, alignItems: 'center' },
  historyCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: C.surface, borderRadius: R.sm, borderWidth: 1, borderColor: C.border, padding: 12, marginBottom: 10 },
  historyImg: { width: 58, height: 44 },
  historyName: { fontSize: 13, fontWeight: '800' },
  historyMeta: { color: C.textDim, fontSize: 10, marginTop: 2 },
  historyPrice: { color: C.success, fontSize: 13, fontWeight: '800' },
  historyReload: { color: C.accentDeep, fontSize: 9, marginTop: 4, fontWeight: '800' }
});
