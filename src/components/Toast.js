import React, { useState, useRef, useEffect, useCallback } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { C, shadow } from '../theme';

// KÖK NEDEN: React Native'in `Alert.alert()` fonksiyonu react-native-web'de
// GERÇEK BİR DİYALOG GÖSTERMEZ (web için implemente edilmemiş) — bu yüzden
// "Envanteri Sıfırla" onayı ve Trade-Up validasyon hataları web'de SESSİZCE
// hiçbir şey yapmıyordu (kullanıcı butona basıyor, hiçbir tepki almıyordu).
// Bu hook, native/web ayrımı olmadan HER YERDE çalışan basit bir toast sistemi
// sağlar. Her ekran kendi `useToast()` örneğini kullanır (global state gerekmez).
export function useToast() {
  const [toast, setToast] = useState(null); // { message, type }
  const timeoutRef = useRef(null);

  useEffect(() => {
    return () => { if (timeoutRef.current) clearTimeout(timeoutRef.current); };
  }, []);

  const showToast = useCallback((message, type = 'error', duration = 3200) => {
    setToast({ message, type, key: Date.now() });
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => {
      setToast(null);
      timeoutRef.current = null;
    }, duration);
  }, []);

  const dismissToast = useCallback(() => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setToast(null);
  }, []);

  return { toast, showToast, dismissToast };
}

// Açık temada toast'lar KOYU DEĞİL, doygun renkli ve beyaz metinli kalır:
// bildirim, sayfanın açık zemininden net biçimde ayrışmalı.
const TYPE_COLORS = {
  error: C.danger,
  success: C.success,
  info: C.accent,
  warning: C.warn
};

// NOT: Bilerek `Animated` KULLANMIYORUZ. Solma/pop-in animasyonu güzel bir
// detay ama bir bildirim banner'ı için ZORUNLU değil — düz, anlık göster/gizle
// çok daha SAĞLAM: RN'in Animated API'si bazı ortamlarda (ör. arka planda/
// composite edilmeyen sekmelerde donan requestAnimationFrame) animasyonun hiç
// ilerlememesine sebep olabiliyor. Kullanıcının kritik bir hata mesajını
// KAÇIRMASINDAN daha kötü bir şey yok, o yüzden burada güvenilirlik önce gelir.
export function ToastBanner({ toast }) {
  if (!toast) return null;
  const bg = TYPE_COLORS[toast.type] || TYPE_COLORS.error;

  return (
    <View pointerEvents="none" style={t.wrapOuter}>
      <View style={[t.wrap, { backgroundColor: bg }]}>
        <Text style={t.txt}>{toast.message}</Text>
      </View>
    </View>
  );
}

const t = StyleSheet.create({
  wrapOuter: {
    position: 'absolute',
    top: 16,
    left: 16,
    right: 16,
    zIndex: 999,
    elevation: 20,
    alignItems: 'center'
  },
  wrap: {
    borderRadius: 14,
    paddingVertical: 13,
    paddingHorizontal: 22,
    maxWidth: 520,
    ...shadow.modal
  },
  txt: { color: '#ffffff', fontSize: 13, fontWeight: '800', textAlign: 'center' }
});
