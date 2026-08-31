import React, { useState } from 'react';
import { StyleSheet, Text, View, Platform, TouchableOpacity } from 'react-native';
import { C, shadow, R, hexToRgba } from '../theme';

// ============================================================
// BİLGİ KUTUCUĞU (TOOLTIP)
// ============================================================
// Kart altındaki metriklerin (ROI, EV, Maks. Kazanç, Ort. Teklif, 5'te En İyi…)
// ne anlama geldiğini hover'da açıklar, fare çekilince kaybolur.
//
// ⚠️ NEDEN `Animated` DEĞİL: hover SÜREKLİ bir etkileşim; her fare hareketinde
// bir Animated döngüsü başlatıp yarıda kesmek hem pahalı hem titrek olur
// (bkz. components/HoverCard.js — aynı gerekçe). Burada animasyon hiç yok:
// kutucuk anında görünüp anında kayboluyor. Gecikmeli bir fade, kullanıcı
// listede fareyle gezerken arkada "hayalet" kutucuklar bırakıyordu.
//
// ⚠️ PLATFORM TUZAĞI: `onMouseEnter/onMouseLeave` react-native-web'de çalışır
// ama NATIVE'de YOKTUR. Dokunmatik cihazda hover diye bir şey olmadığı için
// orada kutucuk DOKUNMA ile açılır/kapanır (tek parmakla aç, tekrar dokun kapat).
//
// ⚠️ KIRPILMA: Kutucuk `position: absolute` ve yüksek `zIndex` ile basılır.
// Kapsayıcı kartlarda `overflow: hidden` OLMAMALIDIR — App.js'teki `s.card`
// bilerek `overflow` tanımlamaz (yalnızca `position: relative`).

const ARROW = 6;

// ⚠️ `maxWidth` DEĞİL, AÇIK `width` — 30 Ağu 2026 KÖK NEDEN DÜZELTMESİ
// ============================================================
// Kullanıcı geri bildirimi: "ROI bilgilendirme kutusu çok dikey, tamamen
// siyah ve ekranın büyük bir kısmını kaplıyor."
//
// KÖK NEDEN: Baloncuk mutlak konumlu ve kapsayıcısı ÇAPA öğesi (kart
// altındaki `statCell`, genişliği ~52 px). Mutlak konumlu bir kutunun
// "shrink-to-fit" genişliği kapsayıcının genişliğiyle SINIRLIDIR; `maxWidth`
// vermek bu sınırı kaldırmaz. Ölçüldü: baloncuk 86 px genişlik × 284 px
// yükseklik — yani metin harf harf alt alta düşüyordu.
//
// ÇÖZÜM: sabit bir `width` vermek. Artık çapanın genişliği önemsiz.
export default function Tooltip({ text, children, placement = 'top', width = 280, style }) {
  const [open, setOpen] = useState(false);
  const isWeb = Platform.OS === 'web';

  if (!text) return children;

  const bubble = (
    <View
      pointerEvents="none"
      style={[
        s.bubble,
        { width },
        placement === 'top' ? s.bubbleTop : s.bubbleBottom
      ]}
    >
      <Text style={s.bubbleTxt}>{text}</Text>
      <View style={[s.arrow, placement === 'top' ? s.arrowTop : s.arrowBottom]} />
    </View>
  );

  // Native'de hover yok -> dokunmayla aç/kapat.
  const Wrapper = isWeb ? View : TouchableOpacity;
  const touchProps = isWeb ? {} : { activeOpacity: 0.8, onPress: () => setOpen(o => !o) };

  return (
    <Wrapper
      {...touchProps}
      style={[s.anchor, style]}
      onMouseEnter={isWeb ? () => setOpen(true) : undefined}
      onMouseLeave={isWeb ? () => setOpen(false) : undefined}
    >
      {children}
      {open && bubble}
    </Wrapper>
  );
}

const s = StyleSheet.create({
  // ⚠️ `position: relative` ŞART: kutucuk buna göre konumlanıyor.
  anchor: { position: 'relative', alignItems: 'center' },

  bubble: {
    position: 'absolute',
    zIndex: 999,
    left: '50%',
    // Yatay ortalama: RN-Web'de `translateX(-50%)` yerine sabit bir kayma
    // kullanılamaz (kutucuk genişliği içeriğe göre değişiyor).
    transform: [{ translateX: '-50%' }],
    // ⚠️ SİMSİYAH DEĞİL, YARI ŞEFFAF: tam opak koyu bir blok altındaki
    // içeriği tamamen yutuyor ve göz yoruyordu. Şeffaflık + ince kenarlık,
    // kutunun "üstte yüzdüğünü" hissettiriyor.
    backgroundColor: hexToRgba('#0b0f13', 0.92),
    borderWidth: 1,
    borderColor: C.borderStrong,
    borderRadius: R.sm,
    paddingHorizontal: 12,
    paddingVertical: 9,
    ...shadow.modal
  },
  bubbleTop: { bottom: '100%', marginBottom: ARROW + 2 },
  bubbleBottom: { top: '100%', marginTop: ARROW + 2 },
  bubbleTxt: { color: '#e8ecef', fontSize: 11, lineHeight: 15.5, fontWeight: '600', textAlign: 'center' },

  // Konuşma balonunun sivri ucu — border hilesiyle çizilen üçgen
  // (RN + RN-Web'de çalışan tek güvenilir yöntem).
  arrow: {
    position: 'absolute',
    left: '50%',
    marginLeft: -ARROW,
    width: 0,
    height: 0,
    borderLeftWidth: ARROW,
    borderRightWidth: ARROW,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderStyle: 'solid'
  },
  arrowTop: { top: '100%', borderTopWidth: ARROW, borderTopColor: 'rgba(11, 15, 19, 0.92)' },
  arrowBottom: { bottom: '100%', borderBottomWidth: ARROW, borderBottomColor: 'rgba(11, 15, 19, 0.92)' }
});
