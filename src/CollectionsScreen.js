import React, { useState, useMemo } from 'react';
import { StyleSheet, Text, View, Image, TouchableOpacity, FlatList, TextInput, useWindowDimensions } from 'react-native';
import { getItemPriceRange, getStickerPrice, getCharmPrice, getStableSortValue } from './prices';
import { ACTIVE_DROP_POOL_COLLECTION_NAMES } from './armoryData';
import HoverCard from './components/HoverCard';
import { IconSearch, IconClose, IconList, IconArrowDown, IconArrowUp } from './components/Icons';
import { useI18n } from './i18n';
import { C, shadow, webTransition, rarityTint } from './theme';

// ============================================================
// KOLEKSİYONLAR (Collections) — göz atma / keşif ekranı
// ============================================================
// Oyundaki BÜTÜN koleksiyonlar (silah, sticker, charm, grafiti) tek listede.
// Bu ekran bir AÇILIŞ ekranı DEĞİLDİR: burada hiçbir şey açılmaz, satın
// alınmaz ve bakiyeye dokunulmaz — yalnızca içerik gezilir. Bu yüzden
// `setBalance` / `gameMode` prop'ları BİLEREK geçilmez (Trade-Up'takiyle aynı
// yapısal garanti).
//
// VERİ: `collections.json` App.js tarafından zaten indiriliyor
// (`allCollectionsRaw`) — bu ekran için EK BİR AĞ ÇAĞRISI YAPILMAZ.

// ------------------------------------------------------------
// KOLEKSİYON TÜRÜ — isimden çıkarılır
// ------------------------------------------------------------
// ⚠️ Veride tür alanı YOK. `collections.json` içinde silah, sticker, charm ve
// grafiti koleksiyonları aynı şemayla duruyor; ayırt edici tek güvenilir işaret
// koleksiyonun ADI ("... Sticker Collection", "... Charm Collection", "...
// Graffiti Collection"). Türü, fiyatın hangi motordan çözüleceğini belirlediği
// için gerekiyor: sticker'a silah fiyatlaması uygulamak değerleri kat kat şişirir.
const kindOfCollection = (col) => {
  const n = col?.name || '';
  if (/Graffiti/i.test(n)) return 'graffiti';
  if (/Charm/i.test(n)) return 'charm';
  if (/Sticker|Patch/i.test(n)) return 'sticker';
  return 'weapon';
};

const KIND_LABEL_KEY = {
  weapon: 'col.kindWeapon',
  sticker: 'col.kindSticker',
  charm: 'col.kindCharm',
  graffiti: 'col.kindGraffiti'
};

const isActiveDropPool = (col) => {
  const n = (col?.name || '').toLowerCase();
  return ACTIVE_DROP_POOL_COLLECTION_NAMES.some(k => n.includes(k));
};

// Nadirlik merdiveni — koleksiyon içi sıralama için (en nadirden en sıradana).
const RARITY_ORDER = [
  'Extraordinary', 'Covert', 'Exotic', 'Classified', 'Remarkable',
  'Restricted', 'Mil-Spec Grade', 'High Grade', 'Industrial Grade',
  'Consumer Grade', 'Base Grade'
];
const rarityRank = (name) => {
  const i = RARITY_ORDER.indexOf(name);
  return i === -1 ? RARITY_ORDER.length : i;
};

// "2026-01-21" -> "21 Jan 2026" (yerelleştirmeyi tarayıcıya bırakıyoruz)
const formatDate = (iso, lang) => {
  if (!iso) return null;
  const d = new Date(iso + 'T00:00:00');
  if (isNaN(d)) return iso;
  try {
    return d.toLocaleDateString(lang === 'tr' ? 'tr-TR' : 'en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  } catch {
    return iso;
  }
};

const SORTS = [
  { key: 'az',     labelKey: 'col.sortAZ',     Icon: IconList },
  { key: 'newest', labelKey: 'col.sortNewest', Icon: IconArrowDown },
  { key: 'oldest', labelKey: 'col.sortOldest', Icon: IconArrowUp }
];

// ============================================================
// KOLEKSİYON KARTI
// ============================================================
function CollectionCard({ col, width, onPress, t, lang }) {
  const kind = kindOfCollection(col);
  const active = isActiveDropPool(col);
  const released = formatDate(col.release_date, lang);

  return (
    <HoverCard
      style={[cs.card, { width }, active && cs.cardActive]}
      onPress={onPress}
    >
      {/* AKTİF DROP HAVUZU ROZETİ — kart üstünde, vurgu renginde */}
      {active && (
        <View style={cs.activeBadge}>
          <View style={cs.activeDot} />
          <Text style={cs.activeBadgeTxt}>{t('col.activeBadge')}</Text>
        </View>
      )}

      <Image source={{ uri: col.image }} style={cs.cardImg} resizeMode="contain" />
      <Text style={cs.cardName} numberOfLines={2}>{col.name}</Text>

      <View style={cs.cardMeta}>
        <Text style={cs.cardKind}>{t(KIND_LABEL_KEY[kind])}</Text>
        <Text style={cs.cardCount}>{t('col.items', { n: (col.contains || []).length })}</Text>
      </View>
      {released && <Text style={cs.cardDate}>{released}</Text>}
    </HoverCard>
  );
}

// ============================================================
// KOLEKSİYON İÇİ EŞYA SATIRI
// ============================================================
function ItemCard({ item, kind, priceMap, width }) {
  const color = item.rarity?.color || C.borderStrong;

  // ⚠️ FİYAT MOTORU TÜRE GÖRE SEÇİLİR (bkz. kindOfCollection açıklaması).
  // `stable: true` rastgele varyansı kapatır — aksi hâlde liste her render'da
  // yeniden sıralanır/zıplar (bkz. prices.getStableSortValue'nun var oluş sebebi).
  let priceTxt = '—';
  if (kind === 'sticker') priceTxt = `~$${getStickerPrice(priceMap, item, { stable: true }).toFixed(2)}`;
  else if (kind === 'charm') priceTxt = `~$${getCharmPrice(priceMap, item, { stable: true }).toFixed(2)}`;
  else if (kind === 'weapon') {
    const r = getItemPriceRange(priceMap, item, item.rarity?.name);
    priceTxt = r.low === r.high ? `$${r.low.toFixed(2)}` : `$${r.low.toFixed(2)} – $${r.high.toFixed(2)}`;
  }
  // grafitiler piyasada tek tek listelenmez -> fiyat gösterilmez ("—")

  return (
    <View style={[cs.item, { width, borderLeftColor: color, backgroundColor: rarityTint(color) }]}>
      <Image source={{ uri: item.image }} style={cs.itemImg} resizeMode="contain" />
      <View style={cs.itemInfo}>
        <Text style={[cs.itemName, { color }]} numberOfLines={2}>{item.name}</Text>
        <Text style={cs.itemRarity} numberOfLines={1}>{item.rarity?.name || '—'}</Text>
      </View>
      <Text style={cs.itemPrice}>{priceTxt}</Text>
    </View>
  );
}

// ============================================================
// ANA BİLEŞEN
// ============================================================
export default function CollectionsScreen({ collections, priceMap }) {
  const { t, lang } = useI18n();
  const { width } = useWindowDimensions();

  const [sortMode, setSortMode] = useState('newest');
  const [selected, setSelected] = useState(null); // açık koleksiyon
  const [itemQuery, setItemQuery] = useState(''); // koleksiyon İÇİ arama

  // Izgara ölçüsü — ana liste sekmeleriyle aynı mantık (kaydırma çubuğu payı dahil).
  const GUTTER = 20;
  const GAP = 12;
  // ⚠️ `Math.max(280, ...)`: `useWindowDimensions().width` ilk kare(ler)de veya
  // görünür olmayan bir sekmede 0 gelebiliyor. Korumasız bırakılırsa kart
  // genişliği NEGATİF çıkıyor ve ızgara çöküyor (ölçüldü: gizli panede
  // innerWidth = 0). Taban değer, en dar telefonda bile makul bir tek sütun verir.
  const usable = Math.max(280, width - GUTTER * 2 - 16);
  const cols = usable >= 1180 ? 5 : usable >= 900 ? 4 : usable >= 640 ? 3 : usable >= 420 ? 2 : 1;
  const cardW = (usable - GAP * (cols - 1)) / cols;

  const itemCols = usable >= 1180 ? 4 : usable >= 820 ? 3 : usable >= 520 ? 2 : 1;
  const itemW = (usable - GAP * (itemCols - 1)) / itemCols;

  // ------------------------------------------------------------
  // SIRALAMA + AKTİF HAVUZUN ÖNE ALINMASI
  // ------------------------------------------------------------
  // ⚠️ Aktif koleksiyonlar seçilen sıralamadan BAĞIMSIZ olarak daima en üstte.
  // Sebep: kullanıcının bu ekranda aradığı ilk bilgi "şu an ne düşüyor?" —
  // A-Z sıralamasında bunu 110 kartın arasında aramak zorunda kalmamalı.
  // Aktif grubun KENDİ içinde de aynı sıralama uygulanır.
  const sortedCollections = useMemo(() => {
    const cmp = (a, b) => {
      if (sortMode === 'az') return (a.name || '').localeCompare(b.name || '');
      // Tarihi olmayan tek kayıt ("Limited Edition Item") en sona düşsün.
      const da = a.release_date || '';
      const db = b.release_date || '';
      if (!da && !db) return (a.name || '').localeCompare(b.name || '');
      if (!da) return 1;
      if (!db) return -1;
      return sortMode === 'newest' ? db.localeCompare(da) : da.localeCompare(db);
    };
    const list = [...(collections || [])];
    const active = list.filter(isActiveDropPool).sort(cmp);
    const rest = list.filter(c => !isActiveDropPool(c)).sort(cmp);
    return { active, rest };
  }, [collections, sortMode]);

  // ------------------------------------------------------------
  // SATIR MODELİ — ⚠️ `numColumns` KULLANILMIYOR (bilinçli)
  // ------------------------------------------------------------
  // İlk sürüm bölüm başlıklarını normal ızgara öğesi olarak basıyordu. FlatList
  // `numColumns` ile öğeleri N'li satırlara böldüğü için başlık bir HÜCREYİ
  // kaplıyor ve satırın ORTASINDA kalıyordu: 5 sütunda ilk satır
  // [BAŞLIK, kart, kart, kart, kart] oluyor, "Tüm Koleksiyonlar" başlığı da
  // aktif kartların arasına düşüyordu (ölçüldü).
  //
  // Çözüm: satırları biz oluşturuyoruz. Liste artık SATIR başına tek öğe
  // taşıyor — başlıklar tam genişlikte kendi satırında, kartlar da N'li
  // gruplar hâlinde. Sanallaştırma (virtualization) da doğru çalışıyor,
  // çünkü FlatList'in ölçtüğü şey gerçek satır yüksekliği.
  const rows = useMemo(() => {
    const out = [];
    const pushGroup = (labelKey, list, isActive) => {
      if (list.length === 0) return;
      out.push({ type: 'header', key: 'h-' + labelKey, labelKey, isActive });
      for (let i = 0; i < list.length; i += cols) {
        out.push({ type: 'row', key: labelKey + '-' + i, items: list.slice(i, i + cols) });
      }
    };
    pushGroup('col.activeSection', sortedCollections.active, true);
    pushGroup('col.allSection', sortedCollections.rest, false);
    return out;
  }, [sortedCollections, cols]);

  // ------------------------------------------------------------
  // KOLEKSİYON İÇİ ARAMA + SIRALAMA
  // ------------------------------------------------------------
  const detailItems = useMemo(() => {
    if (!selected) return [];
    const kind = kindOfCollection(selected);
    const q = itemQuery.trim().toLowerCase();
    const filtered = (selected.contains || []).filter(i => !q || (i.name || '').toLowerCase().includes(q));
    // En nadirden en sıradana; kademe içinde deterministik değere göre.
    return [...filtered].sort((a, b) => {
      const dr = rarityRank(a.rarity?.name) - rarityRank(b.rarity?.name);
      if (dr !== 0) return dr;
      if (kind === 'weapon') return getStableSortValue(priceMap, b) - getStableSortValue(priceMap, a);
      return (a.name || '').localeCompare(b.name || '');
    });
  }, [selected, itemQuery, priceMap]);

  const openCollection = (col) => { setSelected(col); setItemQuery(''); };

  // ============================================================
  // DETAY GÖRÜNÜMÜ
  // ============================================================
  if (selected) {
    const kind = kindOfCollection(selected);
    const active = isActiveDropPool(selected);
    const released = formatDate(selected.release_date, lang);
    const total = (selected.contains || []).length;

    return (
      <View style={{ flex: 1 }}>
        <View style={cs.detailHead}>
          <TouchableOpacity style={cs.backBtn} onPress={() => setSelected(null)}>
            <Text style={cs.backTxt}>{t('common.back')}</Text>
          </TouchableOpacity>

          <Image source={{ uri: selected.image }} style={cs.detailImg} resizeMode="contain" />

          <View style={cs.detailTitleWrap}>
            <View style={cs.detailTitleRow}>
              <Text style={cs.detailName} numberOfLines={2}>{selected.name}</Text>
              {active && (
                <View style={cs.activeBadgeInline}>
                  <View style={cs.activeDot} />
                  <Text style={cs.activeBadgeTxt}>{t('col.activeBadge')}</Text>
                </View>
              )}
            </View>
            <Text style={cs.detailMeta}>
              {t(KIND_LABEL_KEY[kind])} · {t('col.items', { n: total })}
              {released ? ` · ${t('col.released', { d: released })}` : ''}
            </Text>
          </View>
        </View>

        {/* KOLEKSİYON İÇİ ARAMA — yalnızca bu koleksiyonun eşyalarını süzer */}
        <View style={cs.searchWrap}>
          <View style={[cs.searchBox, itemQuery !== '' && cs.searchBoxActive]}>
            <IconSearch size={16} color={itemQuery ? C.accentDeep : C.textDim} />
            <TextInput
              style={cs.searchInput}
              placeholder={t('col.searchPlaceholder')}
              placeholderTextColor={C.textFaint}
              value={itemQuery}
              onChangeText={setItemQuery}
            />
            {itemQuery !== '' && (
              <TouchableOpacity style={cs.searchClear} onPress={() => setItemQuery('')}>
                <IconClose size={14} color={C.textDim} strokeWidth={2.2} />
              </TouchableOpacity>
            )}
          </View>
          <Text style={cs.resultCount}>
            {itemQuery ? t('col.matchCount', { n: detailItems.length, total }) : t('col.items', { n: total })}
          </Text>
        </View>

        <FlatList
          // ⚠️ `key` numColumns ile birlikte değişmeli — FlatList sütun sayısı
          // değiştiğinde yeniden monte edilmezse ızgara bozulur (bilinen tuzak).
          key={`col-items-${itemCols}`}
          data={detailItems}
          keyExtractor={(i, idx) => `${i.id || i.name}-${idx}`}
          numColumns={itemCols}
          columnWrapperStyle={itemCols > 1 ? cs.itemRow : undefined}
          contentContainerStyle={cs.listPad}
          ListEmptyComponent={<Text style={cs.emptyTxt}>{t('col.searchEmpty')}</Text>}
          renderItem={({ item }) => (
            <ItemCard item={item} kind={kind} priceMap={priceMap} width={itemW} />
          )}
        />
      </View>
    );
  }

  // ============================================================
  // LİSTE GÖRÜNÜMÜ
  // ============================================================
  return (
    <View style={{ flex: 1 }}>
      <View style={cs.sortRow}>
        {SORTS.map(opt => {
          const on = sortMode === opt.key;
          return (
            <TouchableOpacity
              key={opt.key}
              style={[cs.sortChip, on && cs.sortChipOn, webTransition('background-color, border-color', 150)]}
              onPress={() => setSortMode(opt.key)}
            >
              <opt.Icon size={13} color={on ? C.onAccent : C.textDim} />
              <Text style={[cs.sortChipTxt, on && cs.sortChipTxtOn]}>{t(opt.labelKey)}</Text>
            </TouchableOpacity>
          );
        })}
        <Text style={cs.resultCount}>{t('col.total', { n: (collections || []).length })}</Text>
      </View>

      <FlatList
        data={rows}
        keyExtractor={row => row.key}
        contentContainerStyle={cs.listPad}
        ListEmptyComponent={<Text style={cs.emptyTxt}>{t('col.empty')}</Text>}
        renderItem={({ item: row }) => {
          if (row.type === 'header') {
            return (
              <View style={cs.sectionHead}>
                <Text style={[cs.sectionTitle, row.isActive && { color: C.accentDeep }]}>
                  {t(row.labelKey)}
                </Text>
                {row.isActive && <Text style={cs.sectionHint}>{t('col.activeHint')}</Text>}
              </View>
            );
          }
          return (
            <View style={cs.cardRow}>
              {row.items.map(col => (
                <CollectionCard
                  key={col.id}
                  col={col}
                  width={cardW}
                  onPress={() => openCollection(col)}
                  t={t}
                  lang={lang}
                />
              ))}
            </View>
          );
        }}
      />
    </View>
  );
}

const MONO = 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace';

const cs = StyleSheet.create({
  listPad: { paddingHorizontal: 20, paddingBottom: 40, gap: 12 },
  cardRow: { flexDirection: 'row', gap: 12 },
  itemRow: { gap: 12 },
  emptyTxt: { color: C.textDim, fontSize: 13, textAlign: 'center', marginTop: 40 },

  // --- SIRALAMA ÇUBUĞU ---
  sortRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 8, paddingHorizontal: 20, marginBottom: 12 },
  sortChip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: C.surface, borderWidth: 1, borderColor: C.border,
    paddingHorizontal: 12, paddingVertical: 8, borderRadius: 4, ...shadow.card
  },
  sortChipOn: { backgroundColor: C.accent, borderColor: C.accent },
  sortChipTxt: { color: C.textSoft, fontSize: 11, fontWeight: '800' },
  sortChipTxtOn: { color: C.onAccent },
  resultCount: { color: C.textDim, fontSize: 11, fontWeight: '700', marginLeft: 'auto' },

  // --- BÖLÜM BAŞLIĞI (Aktif Havuz / Tüm Koleksiyonlar) ---
  // ⚠️ `width: '100%'` ızgara satırını tek başına kaplamasını sağlar.
  sectionHead: { width: '100%', paddingTop: 6, paddingBottom: 2 },
  sectionTitle: { color: C.text, fontSize: 12, fontWeight: '800', letterSpacing: 1.1, textTransform: 'uppercase' },
  sectionHint: { color: C.textDim, fontSize: 10.5, fontWeight: '600', marginTop: 3 },

  // --- KOLEKSİYON KARTI ---
  card: {
    backgroundColor: C.surface, borderRadius: 4,
    borderWidth: 1, borderColor: C.border,
    padding: 12, alignItems: 'center', position: 'relative'
  },
  // Aktif havuz kartı: vurgu rengiyle çerçevelenir ve zemini hafif maviye çalar.
  cardActive: { borderColor: C.accent, borderWidth: 2, backgroundColor: C.accentSoft },
  activeBadge: {
    position: 'absolute', top: 8, left: 8, zIndex: 2,
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: C.accent, paddingHorizontal: 7, paddingVertical: 3, borderRadius: 3
  },
  activeBadgeInline: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: C.accent, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 3
  },
  activeDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: C.onAccent },
  activeBadgeTxt: { color: C.onAccent, fontSize: 9, fontWeight: '800', letterSpacing: 0.6 },
  cardImg: { width: '78%', height: 92, marginTop: 14 },
  cardName: { color: C.text, fontSize: 12.5, fontWeight: '800', textAlign: 'center', marginTop: 10, minHeight: 32 },
  cardMeta: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 6 },
  cardKind: { color: C.textSoft, fontSize: 10, fontWeight: '800', letterSpacing: 0.4, textTransform: 'uppercase' },
  cardCount: { color: C.textDim, fontSize: 10.5, fontWeight: '700', fontFamily: MONO },
  cardDate: { color: C.textFaint, fontSize: 10, fontWeight: '600', marginTop: 4, fontFamily: MONO },

  // --- DETAY BAŞLIĞI ---
  detailHead: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    marginHorizontal: 20, marginBottom: 14, padding: 14,
    backgroundColor: C.surface, borderRadius: 4, borderWidth: 1, borderColor: C.border, ...shadow.card
  },
  backBtn: { backgroundColor: C.surfaceAlt, borderWidth: 1, borderColor: C.border, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 4 },
  backTxt: { color: C.accentDeep, fontSize: 13, fontWeight: '800' },
  detailImg: { width: 56, height: 56 },
  detailTitleWrap: { flex: 1, minWidth: 0 },
  detailTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 10, flexWrap: 'wrap' },
  detailName: { color: C.text, fontSize: 17, fontWeight: '800', flexShrink: 1 },
  detailMeta: { color: C.textDim, fontSize: 11.5, fontWeight: '600', marginTop: 4 },

  // --- KOLEKSİYON İÇİ ARAMA ---
  searchWrap: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 20, marginBottom: 12, flexWrap: 'wrap' },
  searchBox: {
    flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1, minWidth: 220,
    backgroundColor: C.surface, borderWidth: 1, borderColor: C.border,
    borderRadius: 4, paddingHorizontal: 12, paddingVertical: 9
  },
  searchBoxActive: { borderColor: C.accent },
  searchInput: { flex: 1, color: C.text, fontSize: 13, fontWeight: '600', outlineStyle: 'none' },
  searchClear: { paddingHorizontal: 2 },

  // --- EŞYA KARTI ---
  item: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    borderRadius: 4, borderLeftWidth: 3,
    borderWidth: 1, borderColor: C.border,
    paddingHorizontal: 10, paddingVertical: 8
  },
  itemImg: { width: 54, height: 40 },
  itemInfo: { flex: 1, minWidth: 0 },
  itemName: { fontSize: 12, fontWeight: '800' },
  itemRarity: { color: C.textDim, fontSize: 10, fontWeight: '700', marginTop: 2 },
  itemPrice: { color: C.success, fontSize: 11, fontWeight: '800', fontFamily: MONO, textAlign: 'right' }
});
