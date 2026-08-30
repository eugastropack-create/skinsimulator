import React, { useState } from 'react';
import { StyleSheet, Text, View, Platform, TouchableOpacity } from 'react-native';
import { C, shadow } from '../theme';

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

export default function Tooltip({ text, children, placement = 'top', maxWidth = 210, style }) {
  const [open, setOpen] = useState(false);
  const isWeb = Platform.OS === 'web';

  if (!text) return children;

  const bubble = (
    <View
      pointerEvents="none"
      style={[
        s.bubble,
        { maxWidth },
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
    backgroundColor: C.crtBg,
    borderRadius: 4,
    paddingHorizontal: 10,
    paddingVertical: 8,
    ...shadow.modal
  },
  bubbleTop: { bottom: '100%', marginBottom: ARROW + 2 },
  bubbleBottom: { top: '100%', marginTop: ARROW + 2 },
  bubbleTxt: { color: '#ffffff', fontSize: 11, lineHeight: 16, fontWeight: '600', textAlign: 'center' },

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
  arrowTop: { top: '100%', borderTopWidth: ARROW, borderTopColor: C.crtBg },
  arrowBottom: { bottom: '100%', borderBottomWidth: ARROW, borderBottomColor: C.crtBg }
});
