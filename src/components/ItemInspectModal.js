import React from 'react';
import { StyleSheet, Text, View, Image, TouchableOpacity, SafeAreaView, Modal, ScrollView } from 'react-native';
import { useI18n } from '../i18n';
import { C, shadow, rarityGlowStyle } from '../theme';

// ============================================================
// EŞYA İNCELEME (Inspect) MODALI
// ============================================================
// Envanterde bir eşyaya tıklanınca açılır: büyük görsel + tüm teknik detaylar
// (nadirlik, tam float, aşınma, pattern/paint seed, StatTrak, kaynak, tahmini
// piyasa değeri) ve aksiyon butonları.
//
// NOT: Gerçek CS2'nin 3D inspect görüntüleyicisi Steam'in kendi WebGL
// altyapısını gerektirir; burada ByMykel'in yüksek çözünürlüklü resmi
// mümkün olan en büyük halde gösteriliyor.

// Float'ın hangi aşınma bandında olduğunu görselleştiren şerit.
// AÇIK TEMA NOTU: bandlar beyaz zemin üzerinde duruyor, bu yüzden pastel
// tonlar yerine doygun tonlar kullanılıyor — aksi halde FN/MW ayrışmıyordu.
const WEAR_BANDS = [
  { name: 'FN', lo: 0.00, hi: 0.07, color: '#12a150' },
  { name: 'MW', lo: 0.07, hi: 0.15, color: '#5cc98a' },
  { name: 'FT', lo: 0.15, hi: 0.38, color: '#e3b12a' },
  { name: 'WW', lo: 0.38, hi: 0.45, color: '#e08a2e' },
  { name: 'BS', lo: 0.45, hi: 1.00, color: '#d95252' }
];

function FloatBar({ value }) {
  return (
    <View style={s.floatBarWrap}>
      <View style={s.floatBar}>
        {WEAR_BANDS.map(b => (
          <View key={b.name} style={{ flex: b.hi - b.lo, backgroundColor: b.color, height: '100%' }} />
        ))}
        {/* Eşyanın float'ını gösteren işaretçi */}
        <View style={[s.floatMarker, { left: `${Math.min(Math.max(value, 0), 1) * 100}%` }]} />
      </View>
      <View style={s.floatScale}>
        <Text style={s.floatScaleTxt}>0.00</Text>
        <Text style={s.floatScaleTxt}>1.00</Text>
      </View>
    </View>
  );
}

export default function ItemInspectModal({ visible, item, onClose, onSell, onAddToTradeUp }) {
  const { t, lang } = useI18n();
  if (!item) return null;

  const hasFloat = typeof item.float === 'number';
  const isCosmetic = !!(item.isCharm || item.isSticker); // charm/sticker: float & pattern yok

  const rows = [
    { label: t('inspect.rarity'), value: item.rarity?.name || '—', color: item.displayColor },
    ...(hasFloat ? [
      { label: t('inspect.wear'), value: item.wear || '—' },
      { label: t('inspect.floatFull'), value: item.float.toFixed(8), mono: true }
    ] : []),
    ...(!isCosmetic && item.pattern != null ? [{ label: t('inspect.pattern'), value: `#${item.pattern}`, mono: true }] : []),
    { label: t('inspect.statTrak'), value: item.isStatTrak ? t('inspect.yes') : t('inspect.no'), color: item.isStatTrak ? C.warn : undefined },
    { label: t('inspect.source'), value: item.source || '—' },
    // Tarih biçimi de seçili dile uyar.
    ...(item.acquiredAt ? [{ label: t('inspect.acquired'), value: new Date(item.acquiredAt).toLocaleString(lang === 'tr' ? 'tr-TR' : 'en-GB') }] : [])
  ];

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={s.backdrop}>
        <SafeAreaView style={s.sheet}>
          <View style={s.header}>
            <Text style={[s.title, { color: item.displayColor || C.text }]} numberOfLines={2}>{item.name}</Text>
            <TouchableOpacity onPress={onClose} style={s.closeBtn}><Text style={s.closeTxt}>✕</Text></TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={s.body}>
            {/* Büyük görsel + nadirlik parlaması */}
            <View style={[s.imageStage, { shadowColor: item.displayColor || C.borderStrong }]}>
              {/* NADİRLİK IŞIĞI: sahnenin altından yukarı doğru sönümlenerek çıkar. */}
              {item.displayColor && (
                <View pointerEvents="none" style={rarityGlowStyle(item.displayColor, { height: '34%', strength: 0.85 })} />
              )}
              {item.isStatTrak && <Text style={s.stTag}>StatTrak™</Text>}
              <Image source={{ uri: item.image }} style={s.bigImage} resizeMode="contain" />
            </View>

            <Text style={s.priceBig}>${(item.price ?? 0).toFixed(2)}</Text>
            <Text style={s.priceLbl}>{t('inspect.marketValue')}</Text>

            {hasFloat && (
              <>
                <Text style={s.sectionLbl}>{t('inspect.wearPosition')}</Text>
                <FloatBar value={item.float} />
              </>
            )}

            <View style={s.table}>
              {rows.map(r => (
                <View key={r.label} style={s.row}>
                  <Text style={s.rowLbl}>{r.label}</Text>
                  <Text style={[s.rowVal, r.mono && s.mono, r.color && { color: r.color }]}>{r.value}</Text>
                </View>
              ))}
            </View>
          </ScrollView>

          <View style={s.actions}>
            <TouchableOpacity style={s.sellBtn} onPress={() => onSell?.(item)}>
              <Text style={s.actionTxt}>{t('inspect.sell', { n: (item.price ?? 0).toFixed(2) })}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={s.tradeBtn} onPress={() => onAddToTradeUp?.(item)}>
              <Text style={s.actionTxt}>{t('inspect.toTradeUp')}</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(38, 48, 61, 0.5)', justifyContent: 'center', alignItems: 'center', padding: 16 },
  sheet: { backgroundColor: C.surface, borderRadius: 22, width: '100%', maxWidth: 470, maxHeight: '92%', overflow: 'hidden', ...shadow.modal },
  header: { flexDirection: 'row', alignItems: 'flex-start', padding: 18, backgroundColor: C.surface, gap: 10, ...shadow.bar },
  title: { flex: 1, fontSize: 16, fontWeight: '800' },
  closeBtn: { width: 30, height: 30, borderRadius: 15, backgroundColor: C.surfaceAlt, alignItems: 'center', justifyContent: 'center' },
  closeTxt: { color: C.danger, fontSize: 13, fontWeight: '800' },
  body: { padding: 18, alignItems: 'center' },
  imageStage: {
    width: '100%', height: 196, backgroundColor: C.surfaceAlt, borderRadius: 16,
    alignItems: 'center', justifyContent: 'center', position: 'relative', overflow: 'hidden',
    shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.3, shadowRadius: 24, elevation: 10
  },
  bigImage: { width: '92%', height: '86%' },
  stTag: { position: 'absolute', top: 10, left: 12, color: C.warn, fontSize: 11, fontWeight: '800', zIndex: 2 },
  priceBig: { color: C.success, fontSize: 28, fontWeight: '800', marginTop: 16 },
  priceLbl: { color: C.textDim, fontSize: 10, marginTop: 2 },
  sectionLbl: { color: C.textDim, fontSize: 10, fontWeight: '800', alignSelf: 'flex-start', marginTop: 20, marginBottom: 8 },
  floatBarWrap: { width: '100%' },
  floatBar: { flexDirection: 'row', height: 12, borderRadius: 6, overflow: 'hidden', position: 'relative', backgroundColor: C.surfaceSunken },
  floatMarker: { position: 'absolute', top: -4, width: 3, height: 20, backgroundColor: C.text, marginLeft: -1.5, borderRadius: 2 },
  floatScale: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 5 },
  floatScaleTxt: { color: C.textFaint, fontSize: 9 },
  table: { width: '100%', marginTop: 20, backgroundColor: C.surfaceAlt, borderRadius: 14, padding: 14 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 7, gap: 12 },
  rowLbl: { color: C.textDim, fontSize: 12, fontWeight: '600' },
  rowVal: { color: C.text, fontSize: 12, fontWeight: '800', flexShrink: 1, textAlign: 'right' },
  mono: { fontFamily: Platform_monospace() },
  actions: { flexDirection: 'row', gap: 10, padding: 16, backgroundColor: C.surface },
  sellBtn: { flex: 1, backgroundColor: C.success, paddingVertical: 14, borderRadius: 12, alignItems: 'center' },
  tradeBtn: { flex: 1, backgroundColor: C.accent, paddingVertical: 14, borderRadius: 12, alignItems: 'center' },
  actionTxt: { color: C.onAccent, fontWeight: '800', fontSize: 13 }
});

// Platform'a uygun monospace font (float/pattern gibi sayılar hizalı dursun).
function Platform_monospace() {
  return "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace";
}
