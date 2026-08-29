import React, { useState } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, Modal, Pressable } from 'react-native';
import { useI18n, LANGUAGES } from '../i18n';
import { C, shadow, webTransition } from '../theme';
import { IconGlobe } from './Icons';

// ============================================================
// DİL DEĞİŞTİRİCİ (Globe)
// ============================================================
// Üst yardımcı çubukta duran dünya ikonlu buton. Tıklanınca EN/TR seçeneklerini
// içeren küçük bir menü açılır ve seçim ANINDA uygulanır (sayfa yenilenmez —
// i18n bir React context'i olduğu için ağaç normal şekilde yeniden render olur).
//
// ⚠️ Menü neden `Modal`? RN-Web'de mutlak konumlu bir açılır menü, üstündeki
// kardeş elemanların `zIndex`/`overflow` bağlamına takılıp KIRPILABİLİYOR.
// `Modal` her zaman en üstte, kendi katmanında render edilir — bu, projede
// daha önce de tercih edilen güvenilir yol (bkz. ConfirmModal).
export default function LanguageSwitcher() {
  const { t, lang, setLang } = useI18n();
  const [open, setOpen] = useState(false);
  const current = LANGUAGES.find(l => l.code === lang) || LANGUAGES[0];

  return (
    <>
      <TouchableOpacity
        style={[s.btn, webTransition('background-color', 150)]}
        onPress={() => setOpen(true)}
        accessibilityLabel={t('util.language')}
      >
        {/* ⚠️ EMOJİ DEĞİL: 🌐 her platformda farklı (ve renkli) çizilir;
            arayuzun geri kalanı monokrom çizgi ikonları kullandığı için tek başına
            sırıtıyordu. */}
        <IconGlobe size={14} color={C.textSoft} />
        <Text style={s.code}>{current.short}</Text>
      </TouchableOpacity>

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        {/* Dışarı tıklayınca kapanır */}
        <Pressable style={s.backdrop} onPress={() => setOpen(false)}>
          <View style={s.sheet}>
            <Text style={s.sheetTitle}>{t('util.language')}</Text>
            {LANGUAGES.map(l => {
              const active = l.code === lang;
              return (
                <TouchableOpacity
                  key={l.code}
                  style={[s.row, active && s.rowActive]}
                  onPress={() => { setLang(l.code); setOpen(false); }}
                >
                  <Text style={s.flag}>{l.flag}</Text>
                  <Text style={[s.rowTxt, active && s.rowTxtActive]}>{l.label}</Text>
                  <Text style={[s.rowShort, active && s.rowTxtActive]}>{l.short}</Text>
                  {active && <Text style={s.check}>✓</Text>}
                </TouchableOpacity>
              );
            })}
          </View>
        </Pressable>
      </Modal>
    </>
  );
}

const s = StyleSheet.create({
  btn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: C.surfaceAlt, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999
  },
  globe: { fontSize: 14 },
  code: { color: C.textSoft, fontSize: 12, fontWeight: '800', letterSpacing: 0.5 },

  backdrop: { flex: 1, backgroundColor: 'rgba(38, 48, 61, 0.35)', alignItems: 'center', justifyContent: 'center', padding: 20 },
  sheet: { backgroundColor: C.surface, borderRadius: 18, padding: 14, width: '100%', maxWidth: 300, ...shadow.modal },
  sheetTitle: { color: C.textDim, fontSize: 11, fontWeight: '800', letterSpacing: 0.6, textTransform: 'uppercase', marginBottom: 10, marginLeft: 6 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 14, paddingVertical: 12, borderRadius: 12 },
  rowActive: { backgroundColor: C.accentSoft },
  flag: { fontSize: 18 },
  rowTxt: { flex: 1, color: C.text, fontSize: 14, fontWeight: '700' },
  rowTxtActive: { color: C.accentDeep },
  rowShort: { color: C.textDim, fontSize: 11, fontWeight: '800' },
  check: { color: C.accentDeep, fontSize: 14, fontWeight: '800' }
});
