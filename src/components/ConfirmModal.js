import React from 'react';
import { StyleSheet, Text, View, TouchableOpacity, Modal } from 'react-native';
import { C, shadow, R } from '../theme';

// `Alert.alert()`'ün web'de çalışmaması yüzünden (bkz. Toast.js açıklaması) tüm
// onay gerektiren aksiyonlar (Envanteri Sıfırla, Tüm Verileri Sıfırla vb.) için
// gerçek bir <Modal> tabanlı onay diyaloğu — Modal, react-native-web'de
// (Trade-Up'ın eşya seçici penceresinde olduğu gibi) güvenilir şekilde çalışıyor.
export default function ConfirmModal({ visible, title, message, confirmLabel = 'Evet', cancelLabel = 'İptal', onConfirm, onCancel, danger = true }) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <View style={s.backdrop}>
        <View style={s.box}>
          <Text style={s.title}>{title}</Text>
          {message ? <Text style={s.message}>{message}</Text> : null}
          <View style={s.row}>
            <TouchableOpacity style={s.cancelBtn} onPress={onCancel}>
              <Text style={s.cancelTxt}>{cancelLabel}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[s.confirmBtn, danger && s.dangerBtn]} onPress={onConfirm}>
              <Text style={s.confirmTxt}>{confirmLabel}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(38, 48, 61, 0.45)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  box: { backgroundColor: C.surface, borderRadius: R.lg, padding: 26, width: '100%', maxWidth: 400, ...shadow.modal },
  title: { color: C.text, fontSize: 18, fontWeight: '800', textAlign: 'center' },
  message: { color: C.textSoft, fontSize: 13, textAlign: 'center', marginTop: 12, lineHeight: 20 },
  row: { flexDirection: 'row', gap: 10, marginTop: 22 },
  cancelBtn: { flex: 1, backgroundColor: C.surfaceAlt, paddingVertical: 13, borderRadius: R.md, alignItems: 'center' },
  cancelTxt: { color: C.textSoft, fontWeight: '800', fontSize: 13 },
  confirmBtn: { flex: 1, backgroundColor: C.accent, paddingVertical: 13, borderRadius: R.md, alignItems: 'center' },
  dangerBtn: { backgroundColor: C.danger },
  confirmTxt: { color: C.onAccent, fontWeight: '800', fontSize: 13 }
});
