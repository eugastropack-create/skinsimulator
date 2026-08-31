import React, { useMemo, useState } from 'react';
import { StyleSheet, Text, View, Image, TouchableOpacity, SafeAreaView, Modal, ScrollView, TextInput } from 'react-native';
import {
  getItemPriceRange, getCharmPrice, getStickerPrice, getStableSortValue,
  getSouvenirTiers, getCaseTiers, getCollectionTiers, getCapsuleTiers, getRealisticPrice
} from '../prices';
import { useI18n } from '../i18n';
import ImagePreviewModal from './ImagePreviewModal';
import { IconSearch, IconClose } from './Icons';
import { C, RARITY, shadow, rarityTint, R } from '../theme';

// Altın (Bıçak/Eldiven) kademesinde varsayılan olarak kaç eşya gösterilecek.
// Bir kasada 60+ bıçak olabiliyor; hepsini birden basmak listeyi boğuyordu.
const KNIFE_PREVIEW_COUNT = 10;

// ============================================================
// İÇERİK & ÇIKIŞ ORANI ÖNİZLEMESİ
// ============================================================
// Bu dosya İKİ şey ihraç eder:
//   1) <ContentsList/>  — SATIR İÇİ (inline) panel. Kasa/Armory/Terminal/Souvenir/
//      Sticker açma ekranlarında "Aç" butonunun hemen altında gösterilir;
//      kullanıcı hiçbir yere tıklamadan kutudan ne çıkabileceğini fotoğraf +
//      isim + oran (+fiyat) ile görür.
//   2) <ContentsModal/> — aynı listeyi tam ekran modal içinde gösterir (liste
//      kartlarındaki 🔍 ikonu bunu açar).
// Böylece oran tabloları TEK bir yerde durur; iki görünüm asla ayrışamaz.

// ============================================================
// SIRALAMA: EN DEĞERLİDEN EN DEĞERSİZE
// ============================================================
// Tablolar bilerek AZALAN nadirlik sırasında tanımlanmıştır:
//   Sarı (Bıçak/Eldiven) → Kırmızı → Pembe → Mor → Koyu Mavi → Açık Mavi → Gri
// Kullanıcı bir kutuya baktığında önce EN DEĞERLİ ödülleri görür; ucuz Mil-Spec
// yığınını geçmek için aşağı kaydırmak zorunda kalmaz.
// ============================================================
// ⚠️ ORAN TABLOLARI ARTIK SABİT DEĞİL — İÇERİKTEN TÜRETİLİR
// ============================================================
// 29 Ağu 2026 düzeltmesi. Buradaki dört sabit tablo (CASE / ARMORY / CAPSULE /
// SOUVENIR) çekiliş kodundan BAĞIMSIZ yaşıyordu ve ikisi ayrışmıştı:
//
//   • ARMORY tablosu "Consumer Grade %79.92" diyordu; oysa Armory
//     koleksiyonlarında Consumer Grade eşya YOKTUR. Kullanıcı önizlemede
//     hiç çıkmayacak bir kademenin oranını görüyordu.
//   • Kasa tablosu her kutuda 5 kademe varsayıyordu; bıçağı olmayan
//     kutularda (ör. Genesis Terminal) %0.26'lık altın dilim gösteriliyordu
//     ama o kutudan asla bıçak çıkmıyordu.
//
// Artık üçü de prices.js'teki TEK kaynaktan besleniyor. Böylece önizlemede
// yazan oran ile gerçekten uygulanan oran MATEMATİKSEL OLARAK aynı.
//
// SIRALAMA: tablolar EN DEĞERLİDEN EN DEĞERSİZE çevrilir (merdiven en sıktan
// en nadire gelir, biz ters basıyoruz) — kullanıcı önce en iyi ödülü görsün.
const RARITY_LABEL_TR = {
  'Rare Special': 'Rare Special (Bıçak/Eldiven)',
  'Covert': 'Covert (Kırmızı)',
  'Classified': 'Classified (Pembe)',
  'Restricted': 'Restricted (Mor)',
  'Mil-Spec Grade': 'Mil-Spec Grade (Mavi)',
  'Industrial Grade': 'Industrial Grade (Açık Mavi)',
  'Consumer Grade': 'Consumer Grade (Gri)',
  'Extraordinary': 'Extraordinary (Kırmızı)',
  'Exotic': 'Exotic (Pembe)',
  'Remarkable': 'Remarkable (Mor)',
  'High Grade': 'High Grade (Mavi)'
};

// prices.js kademe nesnesini bu bileşenin beklediği satır biçimine çevirir.
const toRows = (tiers) =>
  tiers
    .slice()
    .reverse() // en değerliden en değersize
    .map(tr => ({
      key: 'name',
      match: tr.isRare ? 'Rare Special' : tr.name,
      isRare: !!tr.isRare,
      chance: tr.chance,
      label: RARITY_LABEL_TR[tr.name] || tr.name,
      color: tr.color
    }));

const tiersFor = (kind, subject) => {
  if (kind === 'case') return toRows(getCaseTiers(subject));
  if (kind === 'souvenir') return toRows(getSouvenirTiers(subject));
  if (kind === 'charm' || kind === 'sticker') return toRows(getCapsuleTiers(subject));
  return toRows(getCollectionTiers(subject));
};

// Bir eşyanın gösterilecek fiyat metni — türüne göre doğru fiyat motoru kullanılır.
const priceTextFor = (kind, item, priceMap, tierLabel) => {
  if (kind === 'charm') return `~$${getCharmPrice(priceMap, item).toFixed(2)}`;
  if (kind === 'sticker') return `~$${getStickerPrice(priceMap, item).toFixed(2)}`;
  if (kind === 'souvenir') {
    // Souvenir eşyalarında StatTrak yoktur; aralık yalnızca float'tan gelir.
    const lo = getRealisticPrice(priceMap, item, item?.max_float ?? 1, false, tierLabel, true);
    const hi = getRealisticPrice(priceMap, item, item?.min_float ?? 0, false, tierLabel, true);
    return `$${Math.min(lo, hi).toFixed(2)} – $${Math.max(lo, hi).toFixed(2)}`;
  }
  // Bıçak/eldivenler veride 'Covert' nadirliği taşır ama piyasada çok daha
  // pahalıdır — 'Rare Special' kademesiyle fiyatlanmalılar.
  const priceRarity = tierLabel.startsWith('Rare Special') ? 'Rare Special' : tierLabel.split(' ')[0];
  const r = getItemPriceRange(priceMap, item, priceRarity);
  return `$${r.low.toFixed(2)} – $${r.high.toFixed(2)}`;
};

export function ContentsList({ subject, kind, priceMap, compact = false }) {
  const { t } = useI18n();
  // Bıçak kademesi varsayılan olarak kırpılır; kullanıcı isterse açar.
  const [knivesExpanded, setKnivesExpanded] = useState(false);
  // Eşyaya tıklanınca açılan büyük görsel önizlemesi.
  const [preview, setPreview] = useState(null);

  // ============================================================
  // KATEGORİ İÇİ ARAMA
  // ============================================================
  // Üstteki genel arama SİTE GENELİNDE kasa/eşya arar. Buradaki kutu ise
  // yalnızca AÇIK OLAN kutunun/koleksiyonun içeriğini süzer — bir kasada
  // 100+ eşya olabiliyor ve kullanıcı aradığını gözle tarıyordu.
  //
  // ⚠️ ORANLAR SÜZMEDEN ETKİLENMEZ: kademe yüzdesi (`group.chance`) ve eşya
  // başına düşen ihtimal (`perItemChance`) HER ZAMAN tam listeden hesaplanır.
  // Süzme yalnızca hangi kartların BASILACAĞINI belirler. Aksi hâlde "AK"
  // yazan kullanıcı %100 AK çıkacağını sanırdı.
  const [query, setQuery] = useState('');
  const q = query.trim().toLowerCase();

  const groups = useMemo(() => {
    if (!subject) return [];
    const contains = subject.contains || [];

    // ÖZEL EŞYA (Limited Edition Item): kademeli çekiliş yoktur, tek eşya %100 çıkar.
    if (subject.isSpecialItem) {
      return [{
        label: t('contents.guaranteed'),
        color: subject.specialItem?.rarity?.color || RARITY.pink,
        chance: 100,
        items: contains,
        perItemChance: 100
      }];
    }

    return tiersFor(kind, subject)
      .map(tier => {
        // ALTIN (Rare Special) kademe: bıçak/eldivenler `contains` içinde DEĞİL,
        // ayrı `contains_rare` alanındadır — bu yüzden ayrıca ele alınır.
        // Aksi halde kasa önizlemesinde Sarı kademe HİÇ görünmezdi.
        const items = tier.isRare
          ? (subject.contains_rare || [])
          : contains.filter(it => it.rarity?.name === tier.match);
        if (items.length === 0) return null;
        // EN DEĞERLİDEN EN DEĞERSİZE: kademe içinde de sırala. Sıralama
        // deterministik `getStableSortValue` ile yapılır — `generateMockPrice`
        // rastgele varyans içerdiği için onunla sıralamak listeyi her
        // render'da zıplatırdı.
        const priceRarity = tier.isRare ? 'Rare Special' : undefined;
        const sorted = [...items].sort(
          (a, b) => getStableSortValue(priceMap, b, priceRarity) - getStableSortValue(priceMap, a, priceRarity)
        );
        return {
          ...tier,
          items: sorted,
          isKnifeTier: tier.isRare,
          perItemChance: tier.chance / sorted.length
        };
      })
      .filter(Boolean);
  }, [subject, kind, priceMap]);

  // Arama sonucu kaç eşya eşleşti (hiç yoksa uyarı basılır).
  const matchCount = useMemo(() => {
    if (!q) return 0;
    return groups.reduce(
      (n, g) => n + g.items.filter(it => (it.name || '').toLowerCase().includes(q)).length, 0
    );
  }, [groups, q]);

  if (!subject) return null;

  return (
    <View style={s.listRoot}>
      {/* Süzme kutusu — filtre/kademe başlıklarının hemen ÜSTÜNDE, listenin
          başında. Arama boşken hiçbir davranış değişmez. */}
      <View style={s.searchRow}>
        <IconSearch size={13} color={C.textDim} />
        <TextInput
          style={s.searchInput}
          value={query}
          onChangeText={setQuery}
          placeholder={t('common.searchInCategory')}
          placeholderTextColor={C.textDim}
        />
        {q.length > 0 && (
          <TouchableOpacity onPress={() => setQuery('')} accessibilityLabel={t('common.close')}>
            <IconClose size={13} color={C.textDim} />
          </TouchableOpacity>
        )}
      </View>

      {q.length > 0 && matchCount === 0 && (
        <Text style={s.noMatch}>{t('contents.noMatch')}</Text>
      )}

      {groups.map(group => {
        // ⚠️ SÜZME BURADA UYGULANIR — `group.perItemChance` YUKARIDA, TAM
        // liste üzerinden hesaplandı ve burada DEĞİŞMEZ.
        const visible = q ? group.items.filter(it => (it.name || '').toLowerCase().includes(q)) : group.items;
        if (visible.length === 0) return null;

        // BIÇAK GÖRÜNÜRLÜĞÜ: altın kademede varsayılan olarak yalnızca en
        // değerli KNIFE_PREVIEW_COUNT bıçak gösterilir; gerisi butonla açılır.
        // Arama yapılıyorsa kırpma YAPILMAZ — kullanıcı aradığını görmeli.
        const clip = !q && group.isKnifeTier && !knivesExpanded && visible.length > KNIFE_PREVIEW_COUNT;
        const shown = clip ? visible.slice(0, KNIFE_PREVIEW_COUNT) : visible;
        const hidden = visible.length - shown.length;

        return (
          <View key={group.label} style={s.tierSection}>
            <View style={s.tierHeader}>
              <View style={[s.tierChip, { backgroundColor: rarityTint(group.color) }]}>
                <View style={[s.tierDot, { backgroundColor: group.color }]} />
                <Text style={s.tierLabel}>{group.label}</Text>
              </View>
              {/* Yüzde TAM listeden; parantezdeki sayı arama sonucunu gösterir. */}
              <Text style={s.tierChance}>
                %{group.chance.toFixed(2)} · {t('contents.items', { n: group.items.length })}
                {q ? ` · ${visible.length} ${t('contents.matches')}` : ''}
              </Text>
            </View>
            <View style={s.itemGrid}>
              {shown.map(item => (
                // Tıklanınca görselin büyük hâli açılır (bkz. ImagePreviewModal).
                <TouchableOpacity
                  key={item.id || item.name}
                  activeOpacity={0.85}
                  onPress={() => setPreview(item)}
                  style={[s.itemCard, compact && s.itemCardCompact, { borderTopColor: group.color }]}
                >
                  <Image source={{ uri: item.image }} style={compact ? s.itemImgCompact : s.itemImg} resizeMode="contain" />
                  <Text style={s.itemName} numberOfLines={2}>{item.name}</Text>
                  <Text style={s.itemChance}>%{group.perItemChance.toFixed(3)}</Text>
                  <Text style={s.itemPrice}>{priceTextFor(kind, item, priceMap, group.label)}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {group.isKnifeTier && group.items.length > KNIFE_PREVIEW_COUNT && (
              <TouchableOpacity style={s.moreBtn} onPress={() => setKnivesExpanded(v => !v)}>
                <Text style={s.moreBtnTxt}>
                  {knivesExpanded ? t('contents.hideKnives') : t('contents.showKnives', { n: hidden })}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        );
      })}

      {groups.length === 0 && (
        <Text style={s.empty}>{t('contents.unreadable')}</Text>
      )}

      <ImagePreviewModal item={preview} onClose={() => setPreview(null)} />
    </View>
  );
}

// Açma ekranlarında kullanılan, katlanabilir (collapsible) satır içi panel.
// Varsayılan olarak AÇIK gelir — kullanıcı "item'lar doğrudan görünmüyor"
// şikâyetini yaşamasın diye.
export function InlineContentsPanel({ subject, kind, priceMap, defaultOpen = true }) {
  const { t } = useI18n();
  const [open, setOpen] = useState(defaultOpen);
  if (!subject) return null;
  // Bıçak/eldivenler ayrı `contains_rare` alanında olduğu için sayıma dahil edilir.
  const count = (subject.contains || []).length + (subject.contains_rare || []).length;

  return (
    <View style={s.inlineWrap}>
      <TouchableOpacity style={s.inlineHeader} onPress={() => setOpen(o => !o)}>
        <Text style={s.inlineTitle}>{t('contents.inlineTitle', { n: count })}</Text>
        <Text style={s.inlineToggle}>{open ? t('contents.hide') : t('contents.show')}</Text>
      </TouchableOpacity>
      {open && <ContentsList subject={subject} kind={kind} priceMap={priceMap} compact />}
    </View>
  );
}

export default function ContentsModal({ visible, onClose, subject, kind, priceMap }) {
  const { t } = useI18n();
  if (!subject) return null;
  return (
    <Modal visible={visible} animationType="slide" transparent={false} onRequestClose={onClose}>
      <SafeAreaView style={s.container}>
        {/* ⚠️ KAPATMA BUTONU SOLDA (30 Ağu 2026 — kullanıcı isteği):
            genel web alışkanlığı geri/kapat eylemini sol üstte arar. */}
        <View style={s.header}>
          <TouchableOpacity style={s.closeBtn} onPress={onClose}>
            <Text style={s.closeTxt}>{t('contents.close')}</Text>
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={s.title} numberOfLines={1}>{subject.name}</Text>
            <Text style={s.subtitle}>{t('contents.title')}</Text>
          </View>
        </View>
        <ScrollView contentContainerStyle={s.scrollContent}>
          <ContentsList subject={subject} kind={kind} priceMap={priceMap} />
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  header: { flexDirection: 'row', alignItems: 'center', padding: 18, backgroundColor: C.surface, gap: 10, ...shadow.bar },
  title: { color: C.text, fontSize: 17, fontWeight: '800' },
  subtitle: { color: C.textDim, fontSize: 11, marginTop: 2 },
  closeBtn: { backgroundColor: C.surfaceAlt, borderWidth: 1, borderColor: C.border, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 4 },
  closeTxt: { color: C.danger, fontSize: 13, fontWeight: '800' },
  scrollContent: { padding: 16, paddingBottom: 40 },

  // ⚠️ Kapsayıcıya `overflow: 'hidden'` EKLEMEYİN — bu satırda Tooltip ve
  // açılır önizleme kırpılır.
  searchRow: {
    flexDirection: 'row', alignItems: 'center', gap: 7,
    borderWidth: 1, borderColor: C.border, borderRadius: R.sm,
    backgroundColor: C.bgAlt, paddingHorizontal: 10, paddingVertical: 7, marginBottom: 12
  },
  searchInput: { flex: 1, color: C.text, fontSize: 12, outlineStyle: 'none' },
  noMatch: { color: C.textDim, fontSize: 11.5, textAlign: 'center', paddingVertical: 14 },
  listRoot: { width: '100%' },
  tierSection: { marginBottom: 20 },
  tierHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10, flexWrap: 'wrap', gap: 6 },
  tierChip: { flexDirection: 'row', alignItems: 'center', gap: 7, paddingHorizontal: 12, paddingVertical: 6, borderRadius: R.pill },
  tierDot: { width: 9, height: 9, borderRadius: 5 },
  tierLabel: { fontSize: 12, fontWeight: '800', color: C.text },
  tierChance: { color: C.textDim, fontSize: 11, fontWeight: '700' },
  itemGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  itemCard: { width: 112, backgroundColor: C.surface, borderRadius: R.md, borderTopWidth: 3, alignItems: 'center', padding: 9, ...shadow.card },
  itemCardCompact: { width: 100, padding: 7 },
  itemImg: { width: 82, height: 58 },
  itemImgCompact: { width: 74, height: 50 },
  itemName: { color: C.textSoft, fontSize: 9, fontWeight: '700', textAlign: 'center', marginTop: 5, height: 24 },
  itemChance: { color: C.accentDeep, fontSize: 9, fontWeight: '800', marginTop: 2 },
  itemPrice: { color: C.success, fontSize: 9, fontWeight: '800', marginTop: 2, textAlign: 'center' },
  empty: { color: C.textDim, fontSize: 12, textAlign: 'center', paddingVertical: 20 },
  moreBtn: { marginTop: 12, alignSelf: 'flex-start', backgroundColor: C.surface, paddingHorizontal: 16, paddingVertical: 9, borderRadius: R.pill, ...shadow.card },
  moreBtnTxt: { color: C.gold, fontSize: 11, fontWeight: '800' },

  inlineWrap: { width: '100%', backgroundColor: C.surfaceAlt, borderRadius: R.lg, padding: 16, marginTop: 24 },
  inlineHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14, gap: 8 },
  inlineTitle: { color: C.text, fontSize: 14, fontWeight: '800', flexShrink: 1 },
  inlineToggle: { color: C.accentDeep, fontSize: 11, fontWeight: '800' }
});
