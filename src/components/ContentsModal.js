import React, { useMemo, useState } from 'react';
import { StyleSheet, Text, View, Image, TouchableOpacity, SafeAreaView, Modal, ScrollView } from 'react-native';
import { getItemPriceRange, getCharmPrice, getStickerPrice, getStableSortValue, getSouvenirTiers, getRealisticPrice } from '../prices';
import { useI18n } from '../i18n';
import { C, RARITY, shadow, rarityTint } from '../theme';

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
const CASE_TIERS = [
  { key: 'color', match: RARITY.gold, chance: 0.26, label: 'Rare Special (Bıçak/Eldiven)', color: RARITY.gold },
  { key: 'color', match: RARITY.red, chance: 0.64, label: 'Covert (Kırmızı)', color: RARITY.red },
  { key: 'color', match: RARITY.pink, chance: 3.20, label: 'Classified (Pembe)', color: RARITY.pink },
  { key: 'color', match: RARITY.purple, chance: 15.98, label: 'Restricted (Mor)', color: RARITY.purple },
  { key: 'color', match: RARITY.blue, chance: 79.92, label: 'Mil-Spec (Mavi)', color: RARITY.blue }
];

const ARMORY_TIERS = [
  { key: 'name', match: 'Covert', chance: 0.06, label: 'Covert (Kırmızı)', color: RARITY.red },
  { key: 'name', match: 'Classified', chance: 0.20, label: 'Classified (Pembe)', color: RARITY.pink },
  { key: 'name', match: 'Restricted', chance: 0.64, label: 'Restricted (Mor)', color: RARITY.purple },
  { key: 'name', match: 'Mil-Spec Grade', chance: 3.20, label: 'Mil-Spec Grade (Koyu Mavi)', color: RARITY.blue },
  { key: 'name', match: 'Industrial Grade', chance: 15.98, label: 'Industrial Grade (Açık Mavi)', color: RARITY.lightBlue },
  { key: 'name', match: 'Consumer Grade', chance: 79.92, label: 'Consumer Grade (Gri)', color: RARITY.grey }
];

// Charm ve Sticker kapsülleri BİREBİR aynı 4 kademeyi kullanır.
const CAPSULE_TIERS = [
  { key: 'name', match: 'Extraordinary', chance: 0.64, label: 'Extraordinary (Kırmızı)', color: RARITY.red },
  { key: 'name', match: 'Exotic', chance: 3.21, label: 'Exotic (Pembe)', color: RARITY.pink },
  { key: 'name', match: 'Remarkable', chance: 16.02, label: 'Remarkable (Mor)', color: RARITY.purple },
  { key: 'name', match: 'High Grade', chance: 80.13, label: 'High Grade (Mavi)', color: RARITY.blue }
];

// SOUVENIR: kademeler SABİT DEĞİLDİR — pakete göre değişir (bazı harita
// koleksiyonlarında yalnızca 3 kademe var). Bu yüzden tablo, paketin gerçek
// içeriğinden ÜRETİLİR (bkz. prices.getSouvenirTiers) ve burada yalnızca
// azalan sıraya çevrilir.
const souvenirTiersFor = (subject) =>
  getSouvenirTiers(subject)
    .slice()
    .reverse() // en değerliden en değersize
    .map(t => ({ key: 'name', match: t.name, chance: t.chance, label: t.name, color: t.color }));

const tiersFor = (kind, subject) => {
  if (kind === 'case') return CASE_TIERS;
  if (kind === 'souvenir') return souvenirTiersFor(subject);
  if (kind === 'charm' || kind === 'sticker') return CAPSULE_TIERS;
  return ARMORY_TIERS;
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
        const items = tier.match === RARITY.gold
          ? (subject.contains_rare || [])
          : contains.filter(it =>
              tier.key === 'color' ? it.rarity?.color?.toLowerCase() === tier.match : it.rarity?.name === tier.match
            );
        if (items.length === 0) return null;
        // EN DEĞERLİDEN EN DEĞERSİZE: kademe içinde de sırala. Sıralama
        // deterministik `getStableSortValue` ile yapılır — `generateMockPrice`
        // rastgele varyans içerdiği için onunla sıralamak listeyi her
        // render'da zıplatırdı.
        const priceRarity = tier.match === RARITY.gold ? 'Rare Special' : undefined;
        const sorted = [...items].sort(
          (a, b) => getStableSortValue(priceMap, b, priceRarity) - getStableSortValue(priceMap, a, priceRarity)
        );
        return {
          ...tier,
          items: sorted,
          isKnifeTier: tier.match === RARITY.gold,
          perItemChance: tier.chance / sorted.length
        };
      })
      .filter(Boolean);
  }, [subject, kind, priceMap]);

  if (!subject) return null;

  return (
    <View style={s.listRoot}>
      {groups.map(group => {
        // BIÇAK GÖRÜNÜRLÜĞÜ: altın kademede varsayılan olarak yalnızca en
        // değerli KNIFE_PREVIEW_COUNT bıçak gösterilir; gerisi butonla açılır.
        const clip = group.isKnifeTier && !knivesExpanded && group.items.length > KNIFE_PREVIEW_COUNT;
        const shown = clip ? group.items.slice(0, KNIFE_PREVIEW_COUNT) : group.items;
        const hidden = group.items.length - shown.length;

        return (
          <View key={group.label} style={s.tierSection}>
            <View style={s.tierHeader}>
              <View style={[s.tierChip, { backgroundColor: rarityTint(group.color) }]}>
                <View style={[s.tierDot, { backgroundColor: group.color }]} />
                <Text style={s.tierLabel}>{group.label}</Text>
              </View>
              <Text style={s.tierChance}>%{group.chance.toFixed(2)} · {t('contents.items', { n: group.items.length })}</Text>
            </View>
            <View style={s.itemGrid}>
              {shown.map(item => (
                <View key={item.id || item.name} style={[s.itemCard, compact && s.itemCardCompact, { borderTopColor: group.color }]}>
                  <Image source={{ uri: item.image }} style={compact ? s.itemImgCompact : s.itemImg} resizeMode="contain" />
                  <Text style={s.itemName} numberOfLines={2}>{item.name}</Text>
                  <Text style={s.itemChance}>%{group.perItemChance.toFixed(3)}</Text>
                  <Text style={s.itemPrice}>{priceTextFor(kind, item, priceMap, group.label)}</Text>
                </View>
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
        <View style={s.header}>
          <View style={{ flex: 1 }}>
            <Text style={s.title} numberOfLines={1}>{subject.name}</Text>
            <Text style={s.subtitle}>{t('contents.title')}</Text>
          </View>
          <TouchableOpacity style={s.closeBtn} onPress={onClose}><Text style={s.closeTxt}>{t('contents.close')}</Text></TouchableOpacity>
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
  closeBtn: { backgroundColor: C.surfaceAlt, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999 },
  closeTxt: { color: C.danger, fontSize: 13, fontWeight: '800' },
  scrollContent: { padding: 16, paddingBottom: 40 },

  listRoot: { width: '100%' },
  tierSection: { marginBottom: 20 },
  tierHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10, flexWrap: 'wrap', gap: 6 },
  tierChip: { flexDirection: 'row', alignItems: 'center', gap: 7, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999 },
  tierDot: { width: 9, height: 9, borderRadius: 5 },
  tierLabel: { fontSize: 12, fontWeight: '800', color: C.text },
  tierChance: { color: C.textDim, fontSize: 11, fontWeight: '700' },
  itemGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  itemCard: { width: 112, backgroundColor: C.surface, borderRadius: 12, borderTopWidth: 3, alignItems: 'center', padding: 9, ...shadow.card },
  itemCardCompact: { width: 100, padding: 7 },
  itemImg: { width: 82, height: 58 },
  itemImgCompact: { width: 74, height: 50 },
  itemName: { color: C.textSoft, fontSize: 9, fontWeight: '700', textAlign: 'center', marginTop: 5, height: 24 },
  itemChance: { color: C.accentDeep, fontSize: 9, fontWeight: '800', marginTop: 2 },
  itemPrice: { color: C.success, fontSize: 9, fontWeight: '800', marginTop: 2, textAlign: 'center' },
  empty: { color: C.textDim, fontSize: 12, textAlign: 'center', paddingVertical: 20 },
  moreBtn: { marginTop: 12, alignSelf: 'flex-start', backgroundColor: C.surface, paddingHorizontal: 16, paddingVertical: 9, borderRadius: 999, ...shadow.card },
  moreBtnTxt: { color: C.gold, fontSize: 11, fontWeight: '800' },

  inlineWrap: { width: '100%', backgroundColor: C.surfaceAlt, borderRadius: 18, padding: 16, marginTop: 24 },
  inlineHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14, gap: 8 },
  inlineTitle: { color: C.text, fontSize: 14, fontWeight: '800', flexShrink: 1 },
  inlineToggle: { color: C.accentDeep, fontSize: 11, fontWeight: '800' }
});
