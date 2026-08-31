import { Platform } from 'react-native';

// ============================================================
// SKIN SIMULATOR — TASARIM SİSTEMİ (TEK RENK/BİÇİM KAYNAĞI)
// ============================================================
// TEK KAYNAK. Hiçbir bileşen kendi içinde ham renk kodu, köşe yarıçapı veya
// font ailesi tanımlamamalı; buradaki tokenları kullanmalı. Böylece tema tek
// dosyadan değiştirilebilir ve ekranlar arasında kayma olmaz.
//
// ============================================================
// ⚠️⚠️  TEK SATIRLIK GERİ ALMA ANAHTARI  ⚠️⚠️
// ============================================================
// Aşağıdaki `THEME` sabiti TÜM görsel kimliği belirler. İki değer alır:
//
//     'cs-dark'  →  CS2 / taktiksel koyu antrasit tema  (VARSAYILAN)
//     'light'    →  eski açık tema (buzul grisi / beyaz kartlar)
//
// Yeni tasarımı beğenmezseniz SADECE bu satırı `'light'` yapın; palet,
// köşe yarıçapları, fontlar, aktif-durum görünümü ve gölgeler ANINDA
// eskisine döner. Hiçbir bileşen dosyasına dokunmanız gerekmez — eski
// değerlerin tamamı `LIGHT_*` bloklarında OLDUĞU GİBİ duruyor, silinmedi.
//
// (Fontlar için ayrıca `public/index.html` içindeki `--cs-font` bloğu var;
//  orada da tek bir satır yorum satırına alınarak sistem fontuna dönülür.)
export const THEME = 'cs-dark';

const isCS = THEME === 'cs-dark';

// ============================================================
// 1) RENK PALETLERİ
// ============================================================
// PALET MANTIĞI — AÇIK TEMA (eski, korunuyor):
//   • Ana vurgu  : açık mavi (#38a3f1)
//   • Zeminler   : buzul grisi / kırık beyaz
//   • Kartlar    : kaba çerçeve YOK; yumuşak gölge
const LIGHT_C = {
  bg: '#f4f7fb',
  bgAlt: '#eaf1f8',
  surface: '#ffffff',
  surfaceAlt: '#f2f6fb',
  surfaceSunken: '#e8eff7',

  border: '#e2eaf3',
  borderStrong: '#cfdcea',

  text: '#26303d',
  textSoft: '#4c5a6b',
  textDim: '#7b8798',
  textFaint: '#a6b2c1',
  onAccent: '#ffffff',

  accent: '#38a3f1',
  accentDeep: '#1b7fd1',
  accentSoft: '#e4f1fd',
  accentBorder: '#bfdefa',

  success: '#0f9d63',
  successSoft: '#e3f7ee',
  danger: '#e05252',
  dangerSoft: '#fdeaea',
  warn: '#d98d1f',
  warnSoft: '#fdf2e0',
  gold: '#c99a06',

  crtBg: '#0d1b26',
  crtBgDeep: '#08141d',
  crtText: '#5ff0c4',
  crtDim: '#2a7a68',
  crtScan: 'rgba(95, 240, 196, 0.08)',

  // --- AKTİF/SEÇİLİ DURUM (açık temada: kutunun tamamı vurgu rengiyle dolu) ---
  activeBg: '#38a3f1',
  activeTxt: '#ffffff',
  activeBorder: '#38a3f1',
  accentLine: 'transparent', // açık temada vurgu çizgisi YOK
  overlay: 'rgba(18, 28, 40, 0.72)'
};

// PALET MANTIĞI — CS2 / TAKTİKSEL KOYU TEMA:
//   • Zeminler  : antrasit → "gunmetal" gri kademeleri (parlak beyaz YOK)
//   • Vurgu     : taktiksel sarı (#f2c94c) — CS2 arayüz sarısı
//   • Aktif hâl : kutu BOYANMAZ; koyu mat gri zemin + ince parlak sarı çizgi
//   • Metin     : kırık beyaz; saf beyaz DEĞİL (koyu zeminde göz yorar)
const DARK_C = {
  bg: '#14181c',          // sayfa zemini — koyu antrasit
  bgAlt: '#1b2026',       // ikincil zemin (şeritler, çark arkası)
  surface: '#21262c',     // kart / panel — gunmetal
  surfaceAlt: '#2a3037',  // panel içi vurgulu bölüm / AKTİF durum zemini
  surfaceSunken: '#171b1f',

  border: '#313941',
  borderStrong: '#414a54',

  text: '#e8ecef',
  textSoft: '#b3bcc5',
  textDim: '#8a949e',
  textFaint: '#626c76',
  onAccent: '#12161a',    // sarı zemin üzerinde KOYU metin

  accent: '#f2c94c',      // taktiksel sarı
  accentDeep: '#ffd966',
  accentSoft: '#2b2a1f',
  accentBorder: '#4d4526',

  success: '#46d68a',
  successSoft: '#17281f',
  danger: '#ff6b6b',
  dangerSoft: '#2c1d1d',
  warn: '#f0a33a',
  warnSoft: '#2d2519',
  gold: '#ffd700',

  // CRT ekranı zaten koyuydu — dokunulmadı.
  crtBg: '#0d1b26',
  crtBgDeep: '#08141d',
  crtText: '#5ff0c4',
  crtDim: '#2a7a68',
  crtScan: 'rgba(95, 240, 196, 0.08)',

  // --- AKTİF/SEÇİLİ DURUM (koyu temada: mat gri zemin + parlak sarı çizgi) ---
  activeBg: '#2a3037',
  activeTxt: '#ffd966',
  activeBorder: '#414a54',
  accentLine: '#f2c94c',
  overlay: 'rgba(6, 9, 12, 0.78)'
};

export const C = isCS ? DARK_C : LIGHT_C;

// ============================================================
// 2) NADİRLİK RENKLERİ — Valve resmi paleti (DEĞİŞTİRME)
// ============================================================
// ⚠️ TEMADAN BAĞIMSIZ. Bunlar Valve'in resmi CS2 renkleridir
// (mavi/mor/pembe/kırmızı/altın); kullanıcılar bu renkleri oyundan tanıyor,
// bu yüzden koyu temada da AYNI kalırlar.
export const RARITY = {
  gold:   '#ffd700',
  red:    '#eb4b4b',
  pink:   '#d32ce6',
  purple: '#8847ff',
  blue:   '#4b69ff',
  lightBlue: '#5e98d9',
  grey:   '#b0c3d9'
};

// ============================================================
// 3) KÖŞE YARIÇAPLARI (BORDER RADIUS)
// ============================================================
// ⚠️ Taktiksel temada köşeler KESKİN. Bileşenler ham sayı yerine bu tokenları
// kullanır; tema anahtarı değişince tüm site birlikte döner.
//
//   xs → ince kontroller (rozet, çip, tik kutusu)
//   sm → butonlar, girdi alanları
//   md → kartlar
//   lg → paneller, modallar
//   pill → eskiden 999'lu "hap" biçimi; taktiksel temada o da keskinleşir
const LIGHT_R = { xs: 4, sm: 6, md: 10, lg: 14, xl: 20, pill: 999 };
const DARK_R  = { xs: 0, sm: 2, md: 3,  lg: 4,  xl: 4,  pill: 3 };
export const R = isCS ? DARK_R : LIGHT_R;

// ============================================================
// 4) FONTLAR
// ============================================================
// ⚠️ Font DOSYALARI `public/index.html` içinde Google Fonts ile yükleniyor;
// buradaki tokenlar yalnızca hangi ailenin kullanılacağını söyler. Yükleme
// başarısız olursa yığındaki sistem fontuna düşer — arayüz bozulmaz.
//
// ⚠️ `mono` HER İKİ TEMADA DA gerçek monospace kalır: bakiye/sayaç
// rakamlarının genişliği sabit olmalı, yoksa sayı değiştikçe rozet yerinden
// oynar (bu proje bunu bir kez yaşadı — bkz. components/Icons.js ValuePill).
const SYSTEM_STACK = '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif';
const MONO_STACK = 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace';

const LIGHT_F = { body: SYSTEM_STACK, display: SYSTEM_STACK, mono: MONO_STACK };
const DARK_F = {
  body: "'Chakra Petch', 'Rajdhani', " + SYSTEM_STACK,
  display: "'Rajdhani', 'Chakra Petch', 'Oswald', " + SYSTEM_STACK,
  mono: MONO_STACK
};
export const F = isCS ? DARK_F : LIGHT_F;

// Başlık / menü tipografisi: büyük harf + geniş harf aralığı.
// ⚠️ Açık temada DEĞİŞİKLİK YOK (null döner) — geri alma tam olsun diye.
export const displayType = (letterSpacing = 1.1) =>
  isCS ? { fontFamily: F.display, textTransform: 'uppercase', letterSpacing } : null;

// ============================================================
// 5) AKTİF/SEÇİLİ DURUM GÖRÜNÜMÜ
// ============================================================
// ⚠️ Kullanıcı isteği (30 Ağu 2026): "Aktif sekmelerde kutunun tamamını
// boyamayın; koyu mat gri zemin + ince parlak vurgu çizgisi olsun."
//
// Açık temada bu fonksiyon `null` döner ve eski "tamamen dolu vurgu rengi"
// görünümü aynen korunur — yani geri alma kayıpsızdır.
export const activeIndicator = (side = 'bottom', width = 2) => {
  if (!isCS) return null;
  if (side === 'left') return { borderLeftWidth: width, borderLeftColor: C.accentLine };
  return { borderBottomWidth: width, borderBottomColor: C.accentLine };
};

// ============================================================
// 6) KESİK KÖŞE (CLIP-PATH) — taktiksel vurgu
// ============================================================
// ⚠️ YALNIZCA WEB ve yalnızca taktiksel temada. Native'de `clipPath` yoktur.
//
// ⚠️ NEREYE UYGULANMAZ: içeriği DIŞARI TAŞAN kaplar. `clip-path` kutunun
// dışına çıkan her şeyi keser — bilgi kutucuğu (Tooltip), açılır arama
// listesi ve nadirlik ışığı taşan öğelerdir. Bu yüzden yalnızca kendi
// içinde kapalı öğelerde (butonlar, rozetler) kullanılır.
export const clipCut = (size = 10) =>
  isCS && Platform.OS === 'web'
    ? { clipPath: `polygon(0 0, calc(100% - ${size}px) 0, 100% ${size}px, 100% 100%, ${size}px 100%, 0 calc(100% - ${size}px))` }
    : null;

// Tek köşesi kesik (sağ üst) — küçük rozetler için.
export const clipCorner = (size = 8) =>
  isCS && Platform.OS === 'web'
    ? { clipPath: `polygon(0 0, calc(100% - ${size}px) 0, 100% ${size}px, 100% 100%, 0 100%)` }
    : null;

// ============================================================
// 7) GÖLGELER
// ============================================================
// ⚠️ Açık temada gölge rengi mavi-gri: siyah gölge açık zeminde kirli görünür.
// Koyu temada tersi geçerli — gölge NEREDEYSE SİYAH olmalı, aksi hâlde
// kartların etrafında gri bir hale oluşur ve zemin "sisli" görünür.
const LIGHT_SHADOW = {
  card:      { shadowColor: '#8ba3bf', shadowOffset: { width: 0, height: 4 },  shadowOpacity: 0.16, shadowRadius: 14, elevation: 3 },
  cardHover: { shadowColor: '#6f8bab', shadowOffset: { width: 0, height: 14 }, shadowOpacity: 0.26, shadowRadius: 26, elevation: 10 },
  bar:       { shadowColor: '#8ba3bf', shadowOffset: { width: 0, height: 2 },  shadowOpacity: 0.12, shadowRadius: 10, elevation: 2 },
  modal:     { shadowColor: '#4d637d', shadowOffset: { width: 0, height: 18 }, shadowOpacity: 0.28, shadowRadius: 40, elevation: 16 }
};

const DARK_SHADOW = {
  card:      { shadowColor: '#000000', shadowOffset: { width: 0, height: 3 },  shadowOpacity: 0.45, shadowRadius: 10, elevation: 3 },
  cardHover: { shadowColor: '#000000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.6,  shadowRadius: 22, elevation: 10 },
  bar:       { shadowColor: '#000000', shadowOffset: { width: 0, height: 2 },  shadowOpacity: 0.4,  shadowRadius: 8,  elevation: 2 },
  modal:     { shadowColor: '#000000', shadowOffset: { width: 0, height: 16 }, shadowOpacity: 0.65, shadowRadius: 36, elevation: 16 }
};

export const shadow = isCS ? DARK_SHADOW : LIGHT_SHADOW;

// ============================================================
// 8) WEB GEÇİŞLERİ (CSS transition)
// ============================================================
// react-native-web, `transitionProperty/Duration/TimingFunction` stil
// anahtarlarını gerçek CSS transition'a çevirir. Bunu Animated yerine
// kullanmak hover efektleri için ÇOK daha sağlam:
//   • JS thread'i meşgul etmez,
//   • composite edilmeyen (arka plan) sekmelerde takılan requestAnimationFrame
//     sorununa yakalanmaz (bkz. AGENTS.md §3 Test Ortamı Notu).
// Native'de bu anahtarlar sessizce yok sayılır — stil ANINDA değişir.
export const webTransition = (props = 'transform, box-shadow', ms = 180) =>
  Platform.OS === 'web'
    ? {
        transitionProperty: props,
        transitionDuration: `${ms}ms`,
        transitionTimingFunction: 'cubic-bezier(0.22, 1, 0.36, 1)'
      }
    : null;

// ============================================================
// 9) NADİRLİK IŞIĞI (RARITY GLOW) — CS2 orijinal drop efekti
// ============================================================
// Eşya kutusunun ALT %10-15'lik kısmından yukarı doğru SÖNÜMLENEREK çıkan,
// eşyanın nadirlik rengindeki ışık. CS2'de bu efekt eşyanın nadirliğini daha
// eşya okunmadan belli eder.
//
// RN-Web'de gerçek bir `linear-gradient` stringi `background` anahtarıyla
// verilebiliyor. Native'de gradient desteği olmadığı için düz yarı saydam
// bir renge düşüyor.
export const rarityGlowStyle = (hex, { height = '38%', strength = 0.85 } = {}) => {
  const base = {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height,
    borderBottomLeftRadius: R.md,
    borderBottomRightRadius: R.md
  };
  if (Platform.OS === 'web') {
    return {
      ...base,
      background: `linear-gradient(to top, ${hexToRgba(hex, strength)} 0%, ${hexToRgba(hex, strength * 0.45)} 32%, ${hexToRgba(hex, 0)} 100%)`
    };
  }
  return { ...base, backgroundColor: hexToRgba(hex, strength * 0.35) };
};

// "#eb4b4b" + 0.6 -> "rgba(235,75,75,0.6)"
export const hexToRgba = (hex, alpha = 1) => {
  const h = (hex || '#000000').replace('#', '');
  const full = h.length === 3 ? h.split('').map(c => c + c).join('') : h;
  const n = parseInt(full, 16);
  const r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

// Nadirlik rengini zemin üzerinde okunaklı bir "chip" zeminine çevirir.
// ⚠️ Koyu temada opaklık ARTIRILIR: %12'lik bir renk, koyu antrasit üzerinde
// neredeyse görünmez kalıyordu.
export const rarityTint = (hex) => hexToRgba(hex, isCS ? 0.18 : 0.12);

export default {
  THEME, C, RARITY, R, F, shadow,
  displayType, activeIndicator, clipCut, clipCorner,
  webTransition, rarityGlowStyle, hexToRgba, rarityTint
};
