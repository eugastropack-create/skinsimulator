import React, { useState, useRef, useEffect } from 'react';
import { StyleSheet, Text, View, TextInput, TouchableOpacity, Platform, Linking } from 'react-native';
import { sendContactMessage } from '../api';
import { CONTACT_EMAIL, buildMailtoUrl } from '../contactConfig';
import { useI18n } from '../i18n';
import { C, shadow, webTransition } from '../theme';
import { IconClose, IconCheck } from './Icons';
import Svg, { Path, Rect } from 'react-native-svg';

// ============================================================
// HIZLI İLETİŞİM MODÜLÜ (sağ alt köşe)
// ============================================================
// Ekranın sağ alt köşesinde duran küçük bir düğme; tıklanınca üstünde klasik
// bir iletişim formu açılır (Ad · E-posta · Mesaj).
//
// ⚠️ HEDEF ADRES FORMDA GÖSTERİLMEZ. Mesajlar arka planda CONTACT_EMAIL'e
// iletilir (bkz. src/contactConfig.js). Adres yalnızca Rehber → İletişim
// bölümünde, manuel mail atmak isteyenler için yazılı olarak durur.
//
// ⚠️ `Modal` KULLANILMIYOR — bilinçli. Bu bir "widget"; sayfayı karartıp
// engellemesi istenmiyor, kullanıcı formu açıkken içeriği görmeye devam
// etmeli. Sağ alt köşede mutlak konumlu duruyor ve kabuğun en üstünde
// (App.js'te en son) monte ediliyor, böylece kırpılmıyor.
//
// ⚠️ AĞ ÇAĞRISI BURADA DEĞİL: gönderim `api.sendContactMessage` üzerinden
// yapılır (bkz. AGENTS.md "Ağ Katmanı Kuralı").

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Zarf (mail) simgesi — yalnızca burada kullanıldığı için yerel.
const IconMail = ({ size = 20, color = C.onAccent }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
    <Rect x="2.5" y="5" width="19" height="14" rx="2" />
    <Path d="m3 6.5 9 6.5 9-6.5" />
  </Svg>
);

export default function ContactWidget() {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [status, setStatus] = useState('idle'); // idle | sending | sent | error
  const [error, setError] = useState('');

  // BELLEK SIZINTISI KORUMASI: gönderim sürerken bileşen unmount olursa
  // (kullanıcı sekme değiştirir) setState çağrılmasın.
  const mountedRef = useRef(true);
  useEffect(() => () => { mountedRef.current = false; }, []);

  const reset = () => { setName(''); setEmail(''); setMessage(''); setStatus('idle'); setError(''); };

  const openMailFallback = () => {
    const url = buildMailtoUrl({ name, email, message });
    if (Platform.OS === 'web') window.location.href = url;
    else Linking.openURL(url);
  };

  const submit = async () => {
    if (status === 'sending') return;
    if (!message.trim()) { setError(t('contact.errMessage')); return; }
    if (!EMAIL_RE.test(email.trim())) { setError(t('contact.errEmail')); return; }

    setError('');
    setStatus('sending');
    const res = await sendContactMessage({ name: name.trim(), email: email.trim(), message: message.trim() });
    if (!mountedRef.current) return;

    if (res.ok) {
      setStatus('sent');
    } else {
      // ⚠️ Mesajı KAYBETME: otomatik gönderim başarısızsa kullanıcının yazdığı
      // metin formda durur ve kendi e-posta programıyla gönderebileceği bir
      // yedek yol sunulur.
      setStatus('error');
      setError(t('contact.errSend'));
    }
  };

  // ---------- KAPALI: yalnızca yuvarlak düğme ----------
  if (!open) {
    return (
      <TouchableOpacity
        style={[w.fab, webTransition('transform, box-shadow', 160)]}
        onPress={() => setOpen(true)}
        accessibilityLabel={t('contact.open')}
      >
        <IconMail size={20} />
        <Text style={w.fabTxt}>{t('contact.open')}</Text>
      </TouchableOpacity>
    );
  }

  // ---------- AÇIK: form paneli ----------
  return (
    <View style={w.panel}>
      <View style={w.head}>
        <View style={{ flex: 1 }}>
          <Text style={w.title}>{t('contact.title')}</Text>
          <Text style={w.sub}>{t('contact.subtitle')}</Text>
        </View>
        <TouchableOpacity style={w.closeBtn} onPress={() => setOpen(false)} accessibilityLabel={t('common.close')}>
          <IconClose size={16} color={C.textSoft} strokeWidth={2.2} />
        </TouchableOpacity>
      </View>

      {status === 'sent' ? (
        <View style={w.sentWrap}>
          <View style={w.sentIcon}><IconCheck size={20} color={C.onAccent} strokeWidth={3} /></View>
          <Text style={w.sentTxt}>{t('contact.sent')}</Text>
          <TouchableOpacity style={w.ghostBtn} onPress={reset}>
            <Text style={w.ghostTxt}>{t('contact.sendAnother')}</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={w.body}>
          <Text style={w.label}>{t('contact.name')}</Text>
          <TextInput
            style={w.input}
            value={name}
            onChangeText={setName}
            placeholder={t('contact.namePh')}
            placeholderTextColor={C.textFaint}
          />

          <Text style={w.label}>{t('contact.email')}</Text>
          <TextInput
            style={w.input}
            value={email}
            onChangeText={setEmail}
            placeholder={t('contact.emailPh')}
            placeholderTextColor={C.textFaint}
            keyboardType="email-address"
            inputMode="email"
            autoCapitalize="none"
          />

          <Text style={w.label}>{t('contact.message')}</Text>
          <TextInput
            style={[w.input, w.textarea]}
            value={message}
            onChangeText={setMessage}
            placeholder={t('contact.messagePh')}
            placeholderTextColor={C.textFaint}
            multiline
            numberOfLines={4}
          />

          {error !== '' && <Text style={w.error}>{error}</Text>}

          <TouchableOpacity
            style={[w.sendBtn, status === 'sending' && w.sendBtnBusy]}
            onPress={submit}
            disabled={status === 'sending'}
          >
            <Text style={w.sendTxt}>{status === 'sending' ? t('contact.sending') : t('contact.send')}</Text>
          </TouchableOpacity>

          {status === 'error' && (
            <TouchableOpacity style={w.ghostBtn} onPress={openMailFallback}>
              <Text style={w.ghostTxt}>{t('contact.mailFallback')}</Text>
            </TouchableOpacity>
          )}
        </View>
      )}
    </View>
  );
}

const w = StyleSheet.create({
  // ⚠️ `position: fixed` web'de sayfa kayarken düğmeyi yerinde tutar.
  // Native'de böyle bir değer yok; orada `absolute` olarak yorumlanır ve
  // kabuk zaten sabit olduğu için sonuç aynıdır.
  fab: {
    position: Platform.OS === 'web' ? 'fixed' : 'absolute',
    right: 18, bottom: 18, zIndex: 900,
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: C.accent, paddingHorizontal: 16, paddingVertical: 12,
    borderRadius: 4, ...shadow.modal
  },
  fabTxt: { color: C.onAccent, fontSize: 13, fontWeight: '800', letterSpacing: 0.3 },

  panel: {
    position: Platform.OS === 'web' ? 'fixed' : 'absolute',
    right: 18, bottom: 18, zIndex: 900,
    width: 320, maxWidth: '92%',
    backgroundColor: C.surface, borderRadius: 6,
    borderWidth: 1, borderColor: C.border, ...shadow.modal
  },
  head: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingHorizontal: 16, paddingVertical: 13,
    borderBottomWidth: 1, borderBottomColor: C.border
  },
  title: { color: C.text, fontSize: 14, fontWeight: '800' },
  sub: { color: C.textDim, fontSize: 11, marginTop: 2 },
  closeBtn: { backgroundColor: C.surfaceAlt, borderWidth: 1, borderColor: C.border, borderRadius: 4, padding: 6 },

  body: { paddingHorizontal: 16, paddingVertical: 14 },
  label: { color: C.textSoft, fontSize: 10.5, fontWeight: '800', letterSpacing: 0.4, marginBottom: 4, marginTop: 8 },
  input: {
    backgroundColor: C.surfaceAlt, borderWidth: 1, borderColor: C.border, borderRadius: 4,
    paddingHorizontal: 10, paddingVertical: 9, color: C.text, fontSize: 13, outlineStyle: 'none'
  },
  textarea: { minHeight: 84, textAlignVertical: 'top' },
  error: { color: C.danger, fontSize: 11.5, fontWeight: '700', marginTop: 10 },
  sendBtn: { backgroundColor: C.accent, borderRadius: 4, paddingVertical: 12, alignItems: 'center', marginTop: 14 },
  sendBtnBusy: { opacity: 0.65 },
  sendTxt: { color: C.onAccent, fontSize: 13, fontWeight: '800', letterSpacing: 0.3 },

  ghostBtn: {
    marginTop: 10, borderWidth: 1, borderColor: C.borderStrong, backgroundColor: C.surfaceAlt,
    borderRadius: 4, paddingVertical: 10, alignItems: 'center'
  },
  ghostTxt: { color: C.textSoft, fontSize: 12, fontWeight: '800' },

  sentWrap: { alignItems: 'center', paddingHorizontal: 18, paddingVertical: 26 },
  sentIcon: {
    width: 40, height: 40, borderRadius: 20, backgroundColor: C.success,
    alignItems: 'center', justifyContent: 'center'
  },
  sentTxt: { color: C.text, fontSize: 13, fontWeight: '700', textAlign: 'center', marginTop: 12, lineHeight: 19 }
});

// Rehber ekranı ve alt bilgi de aynı adresi kullansın diye yeniden dışa aktarılıyor.
export { CONTACT_EMAIL };
