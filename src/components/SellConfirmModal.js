import React from 'react';
import { StyleSheet, Text, View, TouchableOpacity, Modal } from 'react-native';
import { useI18n } from '../i18n';
import { C, shadow, R } from '../theme';

// ============================================================
// SATIŞ ONAY MODALI
// ============================================================
// İKİ farklı senaryoyu tek yerden yönetir:
//
// 1) CÜZDAN MODU  → basit onay: "Bu eşyayı satmak istediğinize emin misiniz?"
//                   (Evet / Hayır)
//
// 2) SINIRSIZ MOD → akıllı yönlendirme. Sınırsız modda satış normalde gerçek
//                   bakiyeye YAZILMAZ; kullanıcı bunu fark etmeden değer
//                   kaybedebilir. Bu yüzden üç seçenek sunuyoruz:
//                     • Cüzdan Moduna Geç ve Sat  (modu değiştirir + gerçek bakiyeye ekler)
//                     • Sınırsız Modda Sat        (mod aynı kalır, sanal bakiyeye ekler)
//                     • İptal
//
// `count` > 1 ise metinler toplu satışa göre çoğullanır.
export default function SellConfirmModal({
  visible, mode, itemName, count = 1, total = 0,
  onCancel, onSellWallet, onSellSandbox, onSellSimple
}) {
  const { t } = useI18n();
  if (!visible) return null;

  const isBulk = count > 1;
  const subject = isBulk ? t('modal.itemsCount', { n: count }) : (itemName || '—');
  const isSandbox = mode !== 'wallet';

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onCancel}>
      <View style={s.backdrop}>
        <View style={s.box}>
          <Text style={s.title}>{isSandbox ? t('modal.sellSandboxTitle') : t('modal.sellTitle')}</Text>

          <Text style={s.subject} numberOfLines={2}>{subject}</Text>
          <Text style={s.total}>${total.toFixed(2)}</Text>

          {isSandbox ? (
            <>
              <Text style={s.message}>{t('modal.sellSandboxBody')}</Text>
              <TouchableOpacity style={[s.btn, s.primaryBtn]} onPress={onSellWallet}>
                <Text style={s.btnTxt}>{t('modal.sellSwitchWallet')}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[s.btn, s.secondaryBtn]} onPress={onSellSandbox}>
                <Text style={s.btnTxt}>{t('modal.sellSandbox')}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[s.btn, s.cancelBtn]} onPress={onCancel}>
                <Text style={s.cancelTxt}>{t('common.cancel')}</Text>
              </TouchableOpacity>
            </>
          ) : (
            <>
              <Text style={s.message}>
                {isBulk ? t('modal.sellBodyMany') : t('modal.sellBodyOne')}
              </Text>
              <View style={s.row}>
                <TouchableOpacity style={[s.btn, s.cancelBtn, s.flex]} onPress={onCancel}>
                  <Text style={s.cancelTxt}>{t('modal.sellNo')}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[s.btn, s.primaryBtn, s.flex]} onPress={onSellSimple}>
                  <Text style={s.btnTxt}>{t('modal.sellYes')}</Text>
                </TouchableOpacity>
              </View>
            </>
          )}
        </View>
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(38, 48, 61, 0.5)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  box: { backgroundColor: C.surface, borderRadius: R.lg, padding: 26, width: '100%', maxWidth: 410, ...shadow.modal },
  title: { color: C.text, fontSize: 17, fontWeight: '800', textAlign: 'center' },
  subject: { color: C.textSoft, fontSize: 13, textAlign: 'center', marginTop: 12 },
  total: { color: C.success, fontSize: 28, fontWeight: '800', textAlign: 'center', marginTop: 4 },
  message: { color: C.textSoft, fontSize: 12.5, textAlign: 'center', marginTop: 16, marginBottom: 18, lineHeight: 19 },
  bold: { color: C.text, fontWeight: '800' },
  row: { flexDirection: 'row', gap: 10 },
  flex: { flex: 1 },
  btn: { paddingVertical: 13, borderRadius: R.md, alignItems: 'center', marginBottom: 9 },
  primaryBtn: { backgroundColor: C.success },
  secondaryBtn: { backgroundColor: C.accent },
  cancelBtn: { backgroundColor: C.surfaceAlt },
  btnTxt: { color: C.onAccent, fontWeight: '800', fontSize: 13 },
  cancelTxt: { color: C.textSoft, fontWeight: '800', fontSize: 13 }
});
