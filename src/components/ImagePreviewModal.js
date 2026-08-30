import React from 'react';
import { StyleSheet, Text, View, Image, TouchableOpacity, Modal, Pressable, useWindowDimensions } from 'react-native';
import { useI18n } from '../i18n';
import { C, shadow, rarityGlowStyle } from '../theme';
import { IconClose } from './Icons';

// ============================================================
// GÖRSEL ÖNİZLEME (ZOOM) MODALI
// ============================================================
// Sitedeki herhangi bir eşyaya (kasa içeriğindeki skin, koleksiyon eşyası,
// sticker, charm, grafiti) tıklanınca görselini büyük ve net gösterir.
//
// ⚠️ NEDEN AYRI BİR BİLEŞEN: aynı önizleme dört ayrı yerden açılıyor
// (ContentsList — kasa/terminal/souvenir/kapsül önizlemeleri, InlineContentsPanel,
// Collections detay ızgarası, envanter inceleme modalı). Her ekranda ayrı bir
// modal yazmak, birinin güncellenip diğerlerinin unutulması demekti.
//
// ⚠️ ÇÖZÜNÜRLÜK: ByMykel görselleri Steam CDN'inden geliyor ve zaten yüksek
// çözünürlüklü. Kart içinde 50-80 px'e sıkıştırıldıkları için bulanık
// görünüyorlar; burada ekranın izin verdiği en büyük boyutta basılıyorlar.
// Ek bir "büyük görsel" uç noktası YOK — aynı URL, sadece daha büyük kutu.
//
// ⚠️ `Modal` kullanılıyor, mutlak konumlu bir katman değil: RN-Web'de mutlak
// konumlu bir tam ekran katmanı, üstündeki kardeşlerin `zIndex`/`overflow`
// bağlamına takılıp KIRPILABİLİYOR (bkz. LanguageSwitcher'daki aynı gerekçe).

export default function ImagePreviewModal({ item, onClose }) {
  const { t } = useI18n();
  const { width, height } = useWindowDimensions();
  if (!item) return null;

  const color = item.rarity?.color || item.displayColor || C.borderStrong;
  // Görsel alanı: ekranın kısa kenarına göre, ama makul bir tavanla.
  // ⚠️ `Math.max(240, …)`: gizli/ilk karede boyutlar 0 gelebiliyor
  // (ölçüldü — bkz. CollectionsScreen'deki aynı koruma).
  const box = Math.max(240, Math.min(Math.min(width, height) * 0.62, 520));

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      {/* Dışarı tıklayınca kapanır — modal alışkanlığı */}
      <Pressable style={s.backdrop} onPress={onClose}>
        {/* İçeriğe tıklamak modalı KAPATMAMALI: iç Pressable olayı yutuyor. */}
        <Pressable style={s.card} onPress={() => {}}>
          <TouchableOpacity style={s.closeBtn} onPress={onClose} accessibilityLabel={t('common.close')}>
            <IconClose size={18} color={C.textSoft} strokeWidth={2.2} />
          </TouchableOpacity>

          <View style={[s.stage, { width: box, height: box * 0.72 }]}>
            {/* Nadirlik ışığı — kartlardaki ile aynı görsel dil */}
            <View pointerEvents="none" style={rarityGlowStyle(color, { height: '38%', strength: 0.45 })} />
            <Image
              source={{ uri: item.image }}
              style={{ width: '92%', height: '92%' }}
              resizeMode="contain"
            />
          </View>

          <Text style={[s.name, { color }]} numberOfLines={2}>{item.name}</Text>

          <View style={s.metaRow}>
            {!!item.rarity?.name && (
              <View style={[s.chip, { borderColor: color }]}>
                <Text style={[s.chipTxt, { color }]}>{item.rarity.name}</Text>
              </View>
            )}
            {!!item.wear && <View style={s.chip}><Text style={s.chipTxt}>{item.wear}</Text></View>}
            {item.isStatTrak && <View style={s.chip}><Text style={[s.chipTxt, { color: C.warn }]}>StatTrak™</Text></View>}
          </View>

          {typeof item.float === 'number' && (
            <Text style={s.float}>{t('inspect.floatFull')}: {item.float.toFixed(8)}</Text>
          )}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const MONO = 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace';

const s = StyleSheet.create({
  backdrop: {
    flex: 1, backgroundColor: 'rgba(18, 28, 40, 0.72)',
    alignItems: 'center', justifyContent: 'center', padding: 20
  },
  card: {
    backgroundColor: C.surface, borderRadius: 6,
    borderWidth: 1, borderColor: C.border,
    paddingHorizontal: 22, paddingTop: 44, paddingBottom: 22,
    alignItems: 'center', maxWidth: '100%', ...shadow.modal
  },
  // ⚠️ SOL ÜST: proje genelinde kapatma butonu sola alındı (genel web
  // alışkanlığı — bkz. ContentsModal'daki aynı karar).
  closeBtn: {
    position: 'absolute', top: 10, left: 10, zIndex: 3,
    backgroundColor: C.surfaceAlt, borderWidth: 1, borderColor: C.border,
    borderRadius: 4, padding: 7
  },
  stage: {
    backgroundColor: C.bgAlt, borderRadius: 4, overflow: 'hidden',
    alignItems: 'center', justifyContent: 'center', position: 'relative'
  },
  name: { fontSize: 17, fontWeight: '800', textAlign: 'center', marginTop: 16 },
  metaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'center', marginTop: 10 },
  chip: {
    borderWidth: 1, borderColor: C.border, backgroundColor: C.surfaceAlt,
    borderRadius: 3, paddingHorizontal: 9, paddingVertical: 4
  },
  chipTxt: { color: C.textSoft, fontSize: 11, fontWeight: '800' },
  float: { color: C.textDim, fontSize: 11, fontWeight: '700', fontFamily: MONO, marginTop: 10 }
});
