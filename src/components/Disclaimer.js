import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, Platform } from 'react-native';
import { useI18n } from '../i18n';
import { C, webTransition, R } from '../theme';

// ============================================================
// SORUMLULUK REDDİ (DISCLAIMER) — kompakt, kapatılabilir
// ============================================================
// TASARIM NİYETİ: "dikkat çekmeyen ama okunabilir".
//   • Kırık beyaz/gri zemin, düşük kontrastlı ama OKUNAKLI metin
//     (C.textDim — gri-mavi, gerçek gri #999 gibi solgun değil).
//   • Uyarı sarısı/kırmızısı YOK: sayfanın üstündeki içerikle yarışmamalı.
//   • KOMPAKT: küçük punto + dar padding — sayfanın dibinde yer kaplamasın.
//
// ⚠️ Bu metin YASAL bir bilgilendirmedir — üç maddenin hiçbirini kaldırmayın:
//   1) yalnızca eğlence amaçlı simülatör
//   2) eşyalar gerçek oyunlara aktarılamaz/takas edilemez
//   3) gerçek para yatırma/çekme/kumar mekanizması yoktur
// Metinler i18n sözlüğünde (`disclaimer.*`) hem EN hem TR olarak tutulur.

const STORAGE_KEY = 'skinsim.disclaimerDismissed';

// ============================================================
// KALICILIK — localStorage (BİLİNÇLİ İSTİSNA)
// ============================================================
// ⚠️ Proje kuralı normalde "kalıcılık yok, state yalnızca oturum içidir" der
// (bkz. AGENTS.md Altın Kural 6). Disclaimer'ın kapatılmış olması bu kuralın
// KULLANICI TARAFINDAN AÇIKÇA İSTENMİŞ tek istisnasıdır: kapatılan bir uyarıyı
// her sayfa yenilemesinde tekrar göstermek rahatsız edici olurdu.
//
// ⚠️ Üç kırılganlık noktası var, üçü de ele alınıyor:
//   1. NATIVE'de `localStorage` YOKTUR        → Platform kontrolü
//   2. Gizli sekmede erişim HATA FIRLATABİLİR → try/catch
//   3. Depolama kapalı/dolu ise yazma patlar  → try/catch
// Hata durumunda davranış "kapatılmamış say" olur; yani en kötü ihtimalle
// uyarı tekrar görünür — yasal metnin sessizce kaybolmasındansa çok daha iyi.
const readDismissed = () => {
  if (Platform.OS !== 'web') return false;
  try {
    return window.localStorage.getItem(STORAGE_KEY) === '1';
  } catch {
    return false;
  }
};

const writeDismissed = () => {
  if (Platform.OS !== 'web') return;
  try {
    window.localStorage.setItem(STORAGE_KEY, '1');
  } catch {
    // sessizce yut — kapatma yine de BU oturum için geçerli kalır
  }
};

// `compact`: bir açılış ekranı aktifken (dikey alan kıymetliyken) tek satırlık
// yoğunlaştırılmış sürüm gösterilir.
export default function Disclaimer({ compact = false }) {
  const { t } = useI18n();

  // ⚠️ Başlangıç değeri LAZY veriliyor (`useState(readDismissed)`): doğrudan
  // `useState(readDismissed())` yazılsaydı localStorage HER render'da okunurdu.
  const [dismissed, setDismissed] = useState(readDismissed);

  // Başka bir sekmede kapatıldıysa burada da kapansın (yalnızca web).
  useEffect(() => {
    if (Platform.OS !== 'web') return;
    const onStorage = (e) => {
      if (e.key === STORAGE_KEY && e.newValue === '1') setDismissed(true);
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  const close = () => {
    setDismissed(true);
    writeDismissed();
  };

  if (dismissed) return null;

  const closeButton = (extraStyle) => (
    <TouchableOpacity
      style={[s.closeBtn, extraStyle, webTransition('background-color, border-color', 150)]}
      onPress={close}
      accessibilityLabel={t('disclaimer.close')}
      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
    >
      <Text style={s.closeTxt}>✕</Text>
    </TouchableOpacity>
  );

  if (compact) {
    return (
      <View style={s.compactWrap}>
        <Text style={s.compactTxt} numberOfLines={2}>
          {t('disclaimer.l1')} {t('disclaimer.l2')} {t('disclaimer.l3')}
        </Text>
        {closeButton(s.closeBtnCompact)}
      </View>
    );
  }

  return (
    <View style={s.wrap}>
      <View style={s.box}>
        <Text style={s.title}>{t('disclaimer.title')}</Text>
        {/* Üç madde tek paragrafta birleştirildi — kompaktlık için. İçerik
            aynen korunuyor, yalnızca dikey yer kaplaması azaldı. */}
        <Text style={s.line}>
          {t('disclaimer.l1')} {t('disclaimer.l2')} {t('disclaimer.l3')}
        </Text>
        <Text style={s.fine}>{t('disclaimer.notAffiliated')}</Text>

        {/* KAPATMA — kutunun sağ üst köşesi */}
        {closeButton()}
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  wrap: { paddingHorizontal: 16, paddingTop: 6, paddingBottom: 12, alignItems: 'center' },
  box: {
    width: '100%', maxWidth: 920, backgroundColor: C.surfaceAlt, borderRadius: 8,
    borderWidth: 1, borderColor: C.border,
    paddingHorizontal: 14, paddingVertical: 10, paddingRight: 38, position: 'relative'
  },
  // ⚠️ `textTransform: 'uppercase'` BİLEREK KULLANILMIYOR: CSS büyük harfe
  // çevirme Türkçe'nin noktalı İ'sini bilmez ve "Sorumluluk Reddi" → "REDDI"
  // olur (doğrusu "REDDİ"). Başlık bu yüzden sözlükte zaten büyük harfle yazılı.
  title: { color: C.textDim, fontSize: 9, fontWeight: '800', letterSpacing: 1, marginBottom: 4 },
  line: { color: C.textDim, fontSize: 10.5, lineHeight: 15 },
  fine: { color: C.textFaint, fontSize: 9, lineHeight: 13, marginTop: 4 },

  closeBtn: {
    position: 'absolute', top: 6, right: 6,
    width: 22, height: 22, borderRadius: R.md,
    backgroundColor: C.surface, borderWidth: 1, borderColor: C.borderStrong,
    alignItems: 'center', justifyContent: 'center', zIndex: 2
  },
  closeBtnCompact: { top: 4, right: 8 },
  closeTxt: { color: C.textSoft, fontSize: 11, fontWeight: '800', lineHeight: 13 },

  compactWrap: {
    paddingHorizontal: 20, paddingVertical: 6, paddingRight: 40,
    borderTopWidth: 1, borderTopColor: C.border, alignItems: 'center', position: 'relative'
  },
  compactTxt: { color: C.textFaint, fontSize: 9.5, lineHeight: 13, textAlign: 'center', maxWidth: 860 }
});
