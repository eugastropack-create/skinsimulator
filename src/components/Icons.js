import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { C } from '../theme';

// ============================================================
// CS TARZI SİMGELER
// ============================================================
// Emoji yerine çizilmiş simgeler. Sebep: emoji her işletim sisteminde FARKLI
// görünür (Windows'ta 💰 bambaşka, Android'de bambaşka) ve oyun arayüzü
// hissini bozar. Buradaki simgeler tipografiyle çizildiği için her yerde
// AYNI görünür ve tema renklerine bağlıdır.

// CS2'de operasyon/armor yıldızı YEŞİLDİR (Valve'in kredi yıldızı).
// Emoji ⭐ (sarı) yerine bunu kullanıyoruz.
export const STAR_GREEN = '#4ade80';

export function StarIcon({ size = 13, color = STAR_GREEN, style }) {
  return (
    <Text
      style={[
        { color, fontSize: size, lineHeight: size * 1.15, fontWeight: '900' },
        style
      ]}
      // Ekran okuyucular "yıldız yıldız yıldız" okumasın diye gizli.
      accessibilityElementsHidden
      importantForAccessibility="no"
    >
      ★
    </Text>
  );
}

// Para simgesi: emoji 💰 yerine belirgin YEŞİL dolar işareti.
export function DollarIcon({ size = 13, color = C.success, style }) {
  return (
    <Text
      style={[
        { color, fontSize: size, lineHeight: size * 1.15, fontWeight: '900' },
        style
      ]}
      accessibilityElementsHidden
      importantForAccessibility="no"
    >
      $
    </Text>
  );
}

// ============================================================
// DEĞER ROZETİ (bakiye / kredi)
// ============================================================
// ⚠️ Sayılar MONOSPACE: bakiye değiştikçe rakam genişliği sabit kaldığı için
// rozet yerinde durur, komşu elemanları itip kaydırmaz. Oyun arayüzlerinde
// sayaçların tabular olması bu yüzden standarttır.
export function ValuePill({ icon, value, tone = 'money', compact = false }) {
  const toneColor = tone === 'star' ? STAR_GREEN : C.success;
  return (
    <View style={[p.pill, compact && p.pillCompact]}>
      {icon}
      <Text style={[p.value, compact && p.valueCompact, { color: toneColor }]}>{value}</Text>
    </View>
  );
}

const MONO = 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace';

const p = StyleSheet.create({
  pill: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: C.surfaceAlt,
    borderWidth: 1, borderColor: C.border,
    paddingHorizontal: 10, paddingVertical: 5,
    borderRadius: 4 // CS arayüzü keskin köşelidir — 999'luk hap biçimi değil
  },
  pillCompact: { paddingHorizontal: 8, paddingVertical: 3, gap: 4 },
  value: { fontSize: 13, fontWeight: '800', fontFamily: MONO, letterSpacing: -0.2 },
  valueCompact: { fontSize: 12 }
});

export default { StarIcon, DollarIcon, ValuePill, STAR_GREEN };
