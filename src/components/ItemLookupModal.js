import React from 'react';
import { StyleSheet, Text, View, Image, TouchableOpacity, Modal, SafeAreaView, ScrollView, Platform } from 'react-native';
import { getRealisticPrice, hasLivePrice } from '../prices';
import { WEAR_TIERS } from '../utils';
import { useI18n } from '../i18n';
import { C, RARITY, shadow, R, rarityTint, displayType } from '../theme';
import { IconClose } from './Icons';

// ============================================================
// EŞYA ARAMA KARTI (KATALOG)
// ============================================================
// ⚠️ `ItemInspectModal` İLE KARIŞTIRMAYIN. O, ENVANTERDEKİ bir eşyayı gösterir:
// sahip olunan bir kopyanın float'ı, pattern'i, ne zaman alındığı ve satış
// butonu vardır. Bu ise KATALOG kartıdır — kullanıcı henüz o eşyaya sahip
// değildir; sorusu "bu skin nedir, ne kadar eder, nereden çıkar".
//
// Global aramanın eşya sonuçlarına tıklanınca açılır.

// Bir aşınmanın bu eşyada GERÇEKTEN oluşabilmesi için, eşyanın float aralığı
// o bandla kesişmelidir.
// ⚠️ TÜM AŞINMALARI LİSTELEMEYİN: float aralığı 0.00–0.08 olan bir skin
// Battle-Scarred olarak ASLA basılamaz; onu listelemek kullanıcıya var olmayan
// bir fiyat gösterir. (Örn. AWP | Asiimov min_float 0.18 — Factory New ve
// Minimal Wear hiç yoktur.)
const reachableWears = (item) => {
  const lo = item?.min_float ?? 0;
  const hi = item?.max_float ?? 1;
  return WEAR_TIERS
    .filter(w => w.lo < hi && w.hi > lo)
    .map(w => {
      // Bandın eşya aralığıyla KESİŞEN kısmının ortası — temsili float.
      const a = Math.max(w.lo, lo);
      const b = Math.min(w.hi, hi);
      return { name: w.name, mid: (a + b) / 2 };
    });
};

export default function ItemLookupModal({ visible, record, priceMap, onOpenContainer, onClose }) {
  const { t } = useI18n();
  if (!record) return null;

  const item = record.item;
  const color = item.rarity?.color || RARITY.blue;
  const wears = reachableWears(item);
  // ⚠️ Aralık BİLİNMİYORSA uydurma: `min_float` yalnızca skins.json'da var ve
  // sticker/charm/agent gibi eşyalarda hiç yoktur. "0.00 – 1.00" yazmak
  // kullanıcıya yanlış bilgi verir (ör. Dragon Lore gerçekte 0.00–0.70).
  const floatKnown = item.min_float != null && item.max_float != null;

  // ⚠️ `stable: true` ZORUNLU: canlı fiyatı olmayan eşyalarda varyanslı simüle
  // fiyat her açılışta farklı bir sayı gösterir ve kullanıcı fiyatın
  // değiştiğini sanır.
  const priced = wears.map(w => ({
    ...w,
    price: getRealisticPrice(priceMap, item, w.mid, false, item.rarity?.name, false, { stable: true }),
    live: hasLivePrice(priceMap, item, w.name)
  }));
  // Hiçbir aşınmada canlı fiyat yoksa kullanıcıya bunu SÖYLE. Simüle bir sayıyı
  // piyasa fiyatıymış gibi göstermek yanıltıcıdır (ör. AWP | Dragon Lore
  // ByMykel tablosunda hiç yok; simülasyon $103 diyor, gerçeği ~$17.800).
  const anyLive = priced.some(w => w.live);

  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={onClose}>
      <View style={s.backdrop}>
        <SafeAreaView style={s.sheet}>
          <View style={s.header}>
            {/* Kapatma SOLDA — bu projede tüm modallarda böyle (kullanıcı isteği). */}
            <TouchableOpacity style={s.closeBtn} onPress={onClose} accessibilityLabel={t('common.close')}>
              <IconClose size={14} color={C.textSoft} />
              <Text style={s.closeTxt}>{t('common.close')}</Text>
            </TouchableOpacity>
            <View style={[s.rarityChip, { backgroundColor: rarityTint(color) }]}>
              <View style={[s.rarityDot, { backgroundColor: color }]} />
              <Text style={s.rarityTxt}>{item.rarity?.name || '—'}</Text>
            </View>
          </View>

          <ScrollView contentContainerStyle={s.body}>
            <Image source={{ uri: item.image }} style={s.img} resizeMode="contain" />
            <Text style={[s.name, { color }]}>{item.name}</Text>

            {/* ---------- AŞINMAYA GÖRE FİYAT ---------- */}
            <Text style={s.sectionLbl}>{t('lookup.pricesByWear')}</Text>
            <View style={s.priceTable}>
              {priced.map(w => (
                <View key={w.name} style={s.priceRow}>
                  <Text style={s.priceWear}>{w.name}</Text>
                  <Text style={[s.priceVal, !w.live && { color: C.textDim }]}>
                    {w.live ? '' : '~'}${w.price.toFixed(2)}
                  </Text>
                </View>
              ))}
              {priced.length === 0 && <Text style={s.emptyTxt}>{t('lookup.noWear')}</Text>}
            </View>
            {floatKnown && (
              <Text style={s.floatNote}>
                {t('lookup.floatRange', {
                  min: item.min_float.toFixed(2),
                  max: item.max_float.toFixed(2)
                })}
              </Text>
            )}
            {!anyLive && priced.length > 0 && (
              <Text style={s.simNote}>{t('lookup.simulated')}</Text>
            )}

            {/* ---------- NEREDEN ÇIKAR ---------- */}
            <Text style={s.sectionLbl}>{t('lookup.dropsFrom', { n: record.sources.length })}</Text>
            {record.sources.length === 0 ? (
              <Text style={s.emptyTxt}>{t('lookup.noContainer')}</Text>
            ) : (
              record.sources.map(src => (
                <TouchableOpacity
                  key={src.subject.id}
                  style={s.srcRow}
                  onPress={() => onOpenContainer(src)}
                >
                  <Image source={{ uri: src.subject.image }} style={s.srcImg} resizeMode="contain" />
                  <Text style={s.srcName} numberOfLines={1}>{src.subject.name}</Text>
                  <Text style={s.srcGo}>›</Text>
                </TouchableOpacity>
              ))
            )}
          </ScrollView>
        </SafeAreaView>
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: C.overlay, justifyContent: 'center', alignItems: 'center', padding: 16 },
  sheet: {
    width: '100%', maxWidth: 460, maxHeight: '86%',
    backgroundColor: C.surface, borderRadius: R.lg, borderWidth: 1, borderColor: C.border,
    // ⚠️ `shadow` bir FONKSİYON DEĞİL, NESNEDİR: shadow.card / cardHover / bar / modal.
    // `shadow('lg')` yazmak "shadow is not a function" ile uygulamayı komple açmaz.
    ...shadow.modal
  },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    padding: 12, borderBottomWidth: 1, borderBottomColor: C.border
  },
  closeBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 10, paddingVertical: 6,
    borderWidth: 1, borderColor: C.border, borderRadius: R.sm, backgroundColor: C.bgAlt,
    ...(Platform.OS === 'web' ? { cursor: 'pointer' } : null)
  },
  closeTxt: { color: C.textSoft, fontSize: 11, fontWeight: '800', ...displayType(0.4) },
  rarityChip: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 9, paddingVertical: 5, borderRadius: R.sm },
  rarityDot: { width: 7, height: 7, borderRadius: 4 },
  rarityTxt: { color: C.text, fontSize: 10, fontWeight: '800' },

  body: { padding: 16, alignItems: 'stretch' },
  img: { width: '100%', height: 120, marginBottom: 10 },
  name: { fontSize: 15, fontWeight: '800', textAlign: 'center', marginBottom: 6 },

  sectionLbl: { color: C.textDim, fontSize: 10, fontWeight: '800', marginTop: 16, marginBottom: 7, ...displayType(0.6) },
  priceTable: { borderWidth: 1, borderColor: C.border, borderRadius: R.sm, overflow: 'hidden' },
  priceRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 11, paddingVertical: 8, backgroundColor: C.bgAlt
  },
  priceWear: { color: C.textSoft, fontSize: 11.5, fontWeight: '600' },
  priceVal: { color: C.text, fontSize: 12.5, fontWeight: '800', fontFamily: 'monospace' },
  floatNote: { color: C.textFaint, fontSize: 10, marginTop: 6 },
  simNote: { color: C.warn, fontSize: 10, marginTop: 4, fontWeight: '700' },

  srcRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingHorizontal: 10, paddingVertical: 8, marginBottom: 6,
    borderWidth: 1, borderColor: C.border, borderRadius: R.sm, backgroundColor: C.bgAlt,
    ...(Platform.OS === 'web' ? { cursor: 'pointer' } : null)
  },
  srcImg: { width: 34, height: 26 },
  srcName: { flex: 1, color: C.text, fontSize: 11.5, fontWeight: '700' },
  srcGo: { color: C.textDim, fontSize: 16, fontWeight: '800' },
  emptyTxt: { color: C.textDim, fontSize: 11.5, paddingVertical: 8 }
});
