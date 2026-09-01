import React, { useState, useRef, useEffect } from 'react';
import { StyleSheet, Text, View, TextInput, TouchableOpacity, Platform } from 'react-native';
import { C, R, webTransition } from '../theme';
import { IconEdit } from './Icons';

// ============================================================
// DÜZENLENEBİLİR FİYAT
// ============================================================
// Fiyata tıklanınca yerinde bir <input> açılır, kullanıcı kendi ödediği
// fiyatı girer, Enter/odak kaybı onaylar.
//
// ⚠️ NEDEN GEREKLİ: canlı fiyat Steam piyasasını yansıtır ama kullanıcılar
// eşyaları üçüncü taraf sitelerden (Skinport, CSFloat, Buff…) FARKLI
// fiyatlara alıyor. Kâr hesabının anlamlı olması için kendi maliyetini
// girebilmeli.
//
// ⚠️ OLASILIKLARA DOKUNMAZ. Bu bileşen yalnızca PARA tarafını değiştirir;
// çekiliş ihtimalleri (`chance`) kutunun/koleksiyonun içeriğinden gelir ve
// kullanıcı girdisinden ETKİLENMEZ. Aksi hâlde kullanıcı fiyat yazarak
// kendi kazanma şansını değiştirebilirdi.
//
// ⚠️ `Escape` İPTAL EDER, `Enter` ONAYLAR. Boş veya geçersiz bir değer
// yazılırsa değişiklik UYGULANMAZ (eski değere döner) — 0 yazmak isteyen
// kullanıcı açıkça "0" yazabilir, o geçerlidir.

const parsePrice = (raw) => {
  if (raw == null) return null;
  // Hem "12.34" hem "12,34" kabul edilir (TR klavye virgül basar).
  const cleaned = String(raw).replace(',', '.').replace(/[^0-9.]/g, '');
  if (cleaned === '' || cleaned === '.') return null;
  const n = parseFloat(cleaned);
  return Number.isFinite(n) && n >= 0 ? n : null;
};

export default function EditablePrice({
  value,             // gösterilecek etkin fiyat
  overridden,        // kullanıcı bu fiyatı elle girdi mi
  onChange,          // (yeniNumara) => void
  onReset,           // () => void  — elle girilen fiyatı temizler
  size = 'md',       // 'sm' (çıktı satırı) | 'md' (girdi kartı)
  prefix = '',       // ör. canlı fiyat yoksa '~'
  align = 'center',
  label,
  hint               // erişilebilirlik açıklaması
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState('');
  const [hover, setHover] = useState(false);
  const inputRef = useRef(null);

  // ⚠️ NATIVE'DE HOVER YOKTUR (bkz. AGENTS.md platform tuzakları). Dokunmatik
  // cihazda ipucu HER ZAMAN görünür olmalı, yoksa alanın tıklanabilir olduğu
  // hiç anlaşılmaz.
  const showHint = Platform.OS !== 'web' || hover;

  useEffect(() => {
    if (editing) {
      // ⚠️ `autoFocus` prop'u RN-Web'de yeniden monte edilmeyen bir alanda
      // güvenilir çalışmıyor; odağı elle veriyoruz.
      const id = setTimeout(() => inputRef.current?.focus?.(), 0);
      return () => clearTimeout(id);
    }
  }, [editing]);

  const begin = () => {
    setDraft(value != null ? value.toFixed(2) : '');
    setEditing(true);
  };

  const commit = () => {
    const n = parsePrice(draft);
    if (n != null) onChange(n);
    setEditing(false);
  };

  const cancel = () => setEditing(false);

  const small = size === 'sm';

  if (editing) {
    return (
      <View style={[s.editWrap, small && s.editWrapSm]}>
        <Text style={[s.currency, small && s.currencySm]}>$</Text>
        <TextInput
          ref={inputRef}
          style={[s.input, small && s.inputSm, { textAlign: align }]}
          value={draft}
          onChangeText={setDraft}
          onSubmitEditing={commit}
          onBlur={commit}
          onKeyPress={e => { if (e.nativeEvent.key === 'Escape') cancel(); }}
          keyboardType="decimal-pad"
          selectTextOnFocus
          returnKeyType="done"
        />
      </View>
    );
  }

  return (
    <View style={[s.row, small && s.rowSm]}>
      {/* ============================================================
          DÜZENLENEBİLİRLİK İPUÇLARI — DÖRDÜ BİRDEN
          ============================================================
          Kullanıcı geri bildirimi (1 Eyl 2026): "elle fiyat ayarlanan kısım
          yeterince belirgin değil." Önceki sürümde fiyat düz bir metindi;
          tıklanabilir olduğunu gösteren HİÇBİR işaret yoktu.
            1. Kalem ikonu       — eylemi doğrudan anlatır
            2. Kesikli alt çizgi — "bu alan düzenlenebilir" konvansiyonu
            3. Hover zemini      — imleç üstüne gelince kutu belirginleşir
            4. cursor: text      — imlecin kendisi yazılabilirliği söyler */}
      <TouchableOpacity
        onPress={begin}
        onMouseEnter={() => setHover(true)}
        onMouseLeave={() => setHover(false)}
        style={[
          s.btn, small && s.btnSm,
          s.editable,
          hover && s.btnHover,
          overridden && s.btnOverridden
        ]}
        accessibilityLabel={label}
        accessibilityHint={hint}
      >
        <Text
          style={[
            s.txt, small && s.txtSm,
            overridden && s.txtOverridden
          ]}
          numberOfLines={1}
        >
          {prefix}${(value ?? 0).toFixed(2)}
        </Text>
        <IconEdit
          size={small ? 9 : 10}
          color={overridden ? C.accentDeep : (showHint ? C.accent : C.textDim)}
          strokeWidth={2.2}
        />
      </TouchableOpacity>
      {overridden && onReset && (
        // Elle girilen fiyatı piyasa fiyatına döndürür.
        <TouchableOpacity onPress={onReset} style={s.resetBtn} accessibilityLabel="reset price">
          <Text style={s.resetTxt}>×</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 2 },
  rowSm: { justifyContent: 'flex-end' },

  btn: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    paddingHorizontal: 6, paddingVertical: 2, borderRadius: R.xs,
    borderWidth: 1, borderColor: 'transparent',
    ...(Platform.OS === 'web' ? { cursor: 'text' } : null),
    ...webTransition('background-color, border-color', 120)
  },
  btnSm: { paddingHorizontal: 4, gap: 2 },
  // Kesikli alt çizgi — "burası düzenlenebilir" konvansiyonu.
  editable: {
    borderBottomWidth: 1,
    borderBottomColor: C.borderStrong,
    ...(Platform.OS === 'web' ? { borderBottomStyle: 'dashed' } : null)
  },
  btnHover: { backgroundColor: C.surfaceAlt, borderColor: C.accentBorder },
  // Elle girilmiş fiyat GÖRSEL OLARAK AYRILIR — kullanıcı hangi rakamın
  // piyasadan, hangisinin kendisinden geldiğini bilmeli.
  btnOverridden: { borderColor: C.accentBorder, backgroundColor: C.accentSoft },

  txt: { color: C.success, fontSize: 11, fontWeight: '800', fontFamily: 'monospace' },
  txtSm: { fontSize: 10 },
  txtOverridden: { color: C.accentDeep },

  resetBtn: { paddingHorizontal: 3, ...(Platform.OS === 'web' ? { cursor: 'pointer' } : null) },
  resetTxt: { color: C.textDim, fontSize: 12, fontWeight: '900', lineHeight: 13 },

  editWrap: {
    flexDirection: 'row', alignItems: 'center',
    borderWidth: 1, borderColor: C.accent, borderRadius: R.xs,
    backgroundColor: C.bgAlt, paddingHorizontal: 4, alignSelf: 'center'
  },
  editWrapSm: { alignSelf: 'flex-end' },
  currency: { color: C.textDim, fontSize: 11, fontWeight: '800' },
  currencySm: { fontSize: 10 },
  input: {
    color: C.text, fontSize: 11, fontWeight: '800', fontFamily: 'monospace',
    minWidth: 52, paddingVertical: 2, paddingHorizontal: 2,
    ...(Platform.OS === 'web' ? { outlineStyle: 'none' } : null)
  },
  inputSm: { fontSize: 10, minWidth: 46 }
});
