// ============================================================
// İLETİŞİM AYARLARI — TEK KAYNAK
// ============================================================
// Mesajların gideceği adres ve mesajı taşıyan servis burada tanımlıdır.
// İletişim formu (components/ContactWidget.js) ve Rehber ekranındaki
// "İletişim" bölümü AYNI adresi buradan okur — ikisi ayrışamaz.

export const CONTACT_EMAIL = 'eolyrics@gmail.com';

// ============================================================
// ⚠️ NEDEN BİR ÜÇÜNCÜ TARAF SERVİS GEREKİYOR
// ============================================================
// Bu proje TAMAMEN İSTEMCİ TARAFIDIR (bkz. cloud.md §1) — sunucusu yoktur.
// Tarayıcıdan doğrudan e-posta göndermek MÜMKÜN DEĞİLDİR: SMTP bağlantısı
// açmak için bir sunucu, kimlik doğrulama ve gizli bir parola gerekir; bunlar
// istemci koduna konulursa herkes tarafından okunabilir ve kötüye kullanılır.
//
// Bu yüzden form, mesajı bir "form aracısı" servise POST eder; servis de onu
// CONTACT_EMAIL adresine iletir. Kullanıcı formda hedef adresi GÖRMEZ.
//
// ⚠️ İLK MESAJDA AKTİVASYON GEREKİR: FormSubmit, adresin sahibi olduğunuzu
// doğrulamak için ilk gönderimde CONTACT_EMAIL'e bir onay bağlantısı yollar.
// O bağlantıya BİR KEZ tıklanmadan mesajlar iletilmez.
//
// ⚠️ GİZLİLİK: Gönderilen ad/e-posta/mesaj bu servisin sunucularından geçer.
// Başka bir sağlayıcıya (Formspree, Web3Forms, EmailJS veya kendi
// Cloudflare Worker'ınız) geçmek isterseniz DEĞİŞTİRİLECEK TEK YER burasıdır:
// `CONTACT_ENDPOINT`'i ve gerekirse `buildPayload`'ı güncelleyin.
//
// `CONTACT_ENDPOINT` boş bırakılırsa form otomatik gönderim YAPMAZ; bunun
// yerine kullanıcının kendi e-posta programını açan `mailto:` yoluna düşer
// (aşağıdaki `buildMailtoUrl`). Yani yapılandırma eksik olsa bile iletişim
// yolu asla tamamen kapanmaz.
export const CONTACT_ENDPOINT = `https://formsubmit.co/ajax/${CONTACT_EMAIL}`;

// Servise gönderilecek gövde. FormSubmit `_subject` / `_template` gibi
// alt çizgiyle başlayan alanları ayar olarak yorumlar, gerisini mesaja koyar.
export const buildPayload = ({ name, email, message }) => ({
  name,
  email,
  message,
  _subject: `SkinSimulator.com — new message from ${name || 'a visitor'}`,
  _template: 'table',
  // Otomatik yanıt kapalı: gönderene bizim adımıza mail atmasını istemiyoruz.
  _captcha: 'false'
});

// Otomatik gönderim başarısız olursa (ağ hatası, servis kapalı, endpoint boş)
// kullanıcının kendi e-posta programını açan yedek yol.
export const buildMailtoUrl = ({ name, email, message }) => {
  const subject = encodeURIComponent(`SkinSimulator.com — message from ${name || 'a visitor'}`);
  const body = encodeURIComponent(`${message}\n\n---\n${name || ''}${email ? ` <${email}>` : ''}`);
  return `mailto:${CONTACT_EMAIL}?subject=${subject}&body=${body}`;
};
