import { Platform } from 'react-native';

// ============================================================
// SKIN SIMULATOR — TASARIM SİSTEMİ (TEK RENK/BİÇİM KAYNAĞI)
// ============================================================
// TEK KAYNAK. Hiçbir bileşen kendi içinde ham renk kodu, köşe yarıçapı veya
// font ailesi tanımlamamalı; buradaki tokenları (`C` / `R` / `F`) kullanmalı.
//
// ============================================================
// ⚠️ İKİ TEMA — ÇALIŞMA ZAMANINDA, YENİDEN YÜKLEMEDEN DEĞİŞİR
// ============================================================
//   'cs-dark'  →  CS2 / taktiksel koyu antrasit tema  (VARSAYILAN)
//   'light'    →  eski açık tema (buzul grisi / beyaz kartlar)
//
// NASIL ÇALIŞIYOR (web):
//   `C.surface` gibi tokenlar artık ham hex DEĞİL, birer **CSS değişkeni**
//   döndürür: `var(--c-surface)`. İki paletin değerleri de `buildThemeCss()`
//   ile tek bir <style> etiketine yazılır ve `html[data-cs-theme="..."]`
//   seçicisiyle ayrılır. Tema değiştirmek = o özniteliği değiştirmek.
//
//   Bunun kritik faydası: `StyleSheet.create` değerleri modül yüklenirken BİR
//   KEZ hesaplar; hex yazsaydık tema ancak sayfa YENİDEN YÜKLENEREK
//   değişebilirdi ve kullanıcının bakiyesi/envanteri sıfırlanırdı. Değişken
//   yazınca stiller sabit kalıyor, yalnızca değişkenlerin değeri değişiyor —
//   geçiş anında ve durum kaybı olmadan gerçekleşiyor.
//
//   ⚠️ react-native-web'in CSS değişkenlerini renk, `borderRadius` VE
//   `shadowColor` için kabul ettiği ÖLÇÜLEREK doğrulandı (30 Ağu 2026).
//
// NATIVE (iOS/Android): CSS değişkeni yoktur. Orada tokenlar `DEFAULT_THEME`
// paletinin ham değerlerini alır ve tema derleme zamanında sabittir.
//
// ⚠️ GERİ ALMA: Varsayılanı değiştirmek için `DEFAULT_THEME`'i güncelleyin.
// Eski açık tema SİLİNMEDİ — `LIGHT_*` blokları olduğu gibi duruyor.

export const THEMES = ['cs-dark', 'light'];
export const DEFAULT_THEME = 'cs-dark';

// Geriye dönük uyumluluk: eski kod `THEME` sabitini içe aktarıyordu.
export const THEME = DEFAULT_THEME;

const IS_WEB = Platform.OS === 'web';

// ============================================================
// 1) RENK PALETLERİ
// ============================================================
// ⚠️ İKİ PALETİN ANAHTARLARI BİREBİR AYNI OLMALI. `buildThemeCss` her anahtar
// için bir CSS değişkeni üretir; birinde eksik olan anahtar, o temada tanımsız
// bir değişken (dolayısıyla görünmez/siyah bir öğe) demektir.

// AÇIK TEMA (eski tasarım — korunuyor):
//   • Ana vurgu : açık mavi (#38a3f1)
//   • Zeminler  : buzul grisi / kırık beyaz
//   • Aktif hâl : kutunun TAMAMI vurgu rengiyle dolu (eski davranış)
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

  // ============================================================
  // ⚠️ VURGU RENGİ LOGODAN TÜREDİ (1 Eyl 2026) — KEYFİ DEĞİL
  // ============================================================
  // Yeni logo ejderha temalı: kiremit kırmızısı gövde, kor turuncusu alevler,
  // krem/ten rengi harfler. Eski açık mavi (#38a3f1) logonun tam karşıt
  // rengiydi ve yan yana durduklarında ikisi de yanlış görünüyordu.
  //
  // AÇIK TEMADA DAHA KOYU BİR KİREMİT KULLANILIR: logodaki parlak kor
  // turuncusu (#f4641e) beyaz zeminde beyaz metinle 3.1:1 kontrast veriyor —
  // WCAG AA sınırı 4.5:1. `#c8431a` ile 4.9:1'e çıkıyor (ölçüldü).
  accent: '#c8431a',        // kiremit — logonun gövde kırmızısı
  accentDeep: '#9e3413',    // koyu kiremit (hover / bağlantı metni)
  accentSoft: '#fdece5',    // çok açık ten — yumuşak zeminler
  accentBorder: '#f5c9b5',  // ten kenarlık

  success: '#0f9d63',
  successSoft: '#e3f7ee',
  successBorder: '#9fdcc2',
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

  activeBg: '#c8431a',
  activeTxt: '#ffffff',
  activeBorder: '#c8431a',
  accentLine: 'transparent',
  overlay: 'rgba(18, 28, 40, 0.72)'
};

// CS2 / TAKTİKSEL KOYU TEMA:
//   • Zeminler  : antrasit → "gunmetal" gri kademeleri (parlak beyaz YOK)
//   • Vurgu     : taktiksel sarı (#f2c94c)
//   • Aktif hâl : kutu BOYANMAZ; koyu mat gri zemin + ince parlak sarı çizgi
const DARK_C = {
  bg: '#14181c',
  bgAlt: '#1b2026',
  surface: '#21262c',
  surfaceAlt: '#2a3037',
  surfaceSunken: '#171b1f',

  border: '#313941',
  borderStrong: '#414a54',

  text: '#e8ecef',
  textSoft: '#b3bcc5',
  textDim: '#8a949e',
  textFaint: '#626c76',
  // ⚠️ Kor turuncusu (#f4641e) zemin üzerinde KOYU metin okunur (7.0:1);
  // beyaz metin yalnızca 3.4:1 verirdi.
  onAccent: '#1a0d06',

  // ============================================================
  // ⚠️ VURGU RENGİ LOGODAN TÜREDİ (1 Eyl 2026)
  // ============================================================
  // Logodaki kor turuncusu. Eski taktiksel sarı (#f2c94c) silinmedi, sadece
  // değiştirildi — geri almak için bu dört satırı eski değerlere döndürmek
  // yeterli (#f2c94c / #ffd966 / #2b2a1f / #4d4526).
  accent: '#f4641e',        // kor turuncusu — logonun alev rengi
  accentDeep: '#ff8143',    // parlak kor (hover)
  accentSoft: '#2a1810',    // kömürleşmiş kızıl — yumuşak zeminler
  accentBorder: '#5a2a15',  // kor kenarlık

  success: '#46d68a',
  successSoft: '#17281f',
  successBorder: '#2e5c45',
  danger: '#ff6b6b',
  dangerSoft: '#2c1d1d',
  warn: '#f0a33a',
  warnSoft: '#2d2519',
  gold: '#ffd700',

  crtBg: '#0d1b26',
  crtBgDeep: '#08141d',
  crtText: '#5ff0c4',
  crtDim: '#2a7a68',
  crtScan: 'rgba(95, 240, 196, 0.08)',

  // ⚠️ Aktif hâlde metin AÇIK renk olmalı. `onAccent` burada NEREDEYSE SİYAH
  // (sarı buton üzerinde doğru), ama aktif sekmenin zemini koyu gri olduğu
  // için orada okunmaz. Aktif metin için DAİMA `activeTxt` kullanın.
  activeBg: '#2a3037',
  activeTxt: '#ff9a5c',   // açık kor — mat gri aktif zeminde 6.2:1
  activeBorder: '#414a54',
  accentLine: '#f4641e',
  overlay: 'rgba(6, 9, 12, 0.78)'
};

const PALETTES = { 'cs-dark': DARK_C, light: LIGHT_C };

// ============================================================
// 2) NADİRLİK RENKLERİ — Valve resmi paleti (DEĞİŞTİRME)
// ============================================================
// ⚠️ TEMADAN BAĞIMSIZ; kullanıcılar bu renkleri oyundan tanıyor.
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
// 3) KÖŞE YARIÇAPLARI
// ============================================================
const LIGHT_R = { xs: 4, sm: 6, md: 10, lg: 14, xl: 20, pill: 999 };
const DARK_R  = { xs: 0, sm: 2, md: 3,  lg: 4,  xl: 4,  pill: 3 };
const RADII = { 'cs-dark': DARK_R, light: LIGHT_R };

// ============================================================
// 4) GÖLGELER
// ============================================================
// ⚠️ WEB'DE ALFA DEĞİŞKENİN İÇİNE GÖMÜLÜR. `shadowColor` bir CSS değişkeni
// olduğunda react-native-web `shadowOpacity`yi UYGULAYAMIYOR (ölçüldü: renk
// tam opak çıkıyor). Bu yüzden web tarafında opaklık 1'e sabitlenip alfa
// doğrudan rgba() içinde veriliyor.
const SHADOW_COLOR = {
  'cs-dark': { card: 'rgba(0,0,0,0.45)', cardHover: 'rgba(0,0,0,0.6)', bar: 'rgba(0,0,0,0.4)', modal: 'rgba(0,0,0,0.65)' },
  light:    { card: 'rgba(139,163,191,0.16)', cardHover: 'rgba(111,139,171,0.26)', bar: 'rgba(139,163,191,0.12)', modal: 'rgba(77,99,125,0.28)' }
};
// Gölge GEOMETRİSİ temadan bağımsız (yalnızca renk değişiyor) — açık temanın
// yumuşak/yayvan değerleri koyu temada da doğru duruyor.
const SHADOW_GEOM = {
  card:      { shadowOffset: { width: 0, height: 4 },  shadowRadius: 14, elevation: 3 },
  cardHover: { shadowOffset: { width: 0, height: 14 }, shadowRadius: 26, elevation: 10 },
  bar:       { shadowOffset: { width: 0, height: 2 },  shadowRadius: 10, elevation: 2 },
  modal:     { shadowOffset: { width: 0, height: 18 }, shadowRadius: 40, elevation: 16 }
};

// ============================================================
// 5) TOKEN ÜRETİMİ
// ============================================================
const cssVar = (name, fallback) => `var(--${name}, ${fallback})`;

const varsFrom = (obj, prefix, fallbackPalette) =>
  Object.keys(obj).reduce((acc, key) => {
    acc[key] = cssVar(`${prefix}-${key}`, fallbackPalette[key]);
    return acc;
  }, {});

// Web → CSS değişkeni; native → düz değer.
export const C = IS_WEB ? varsFrom(LIGHT_C, 'c', DARK_C) : PALETTES[DEFAULT_THEME];
export const R = IS_WEB
  ? Object.keys(LIGHT_R).reduce((a, k) => { a[k] = cssVar(`r-${k}`, `${DARK_R[k]}px`); return a; }, {})
  : RADII[DEFAULT_THEME];

export const shadow = Object.keys(SHADOW_GEOM).reduce((acc, key) => {
  acc[key] = IS_WEB
    ? { ...SHADOW_GEOM[key], shadowColor: cssVar(`sh-${key}`, SHADOW_COLOR[DEFAULT_THEME][key]), shadowOpacity: 1 }
    : { ...SHADOW_GEOM[key], shadowColor: SHADOW_COLOR[DEFAULT_THEME][key], shadowOpacity: 1 };
  return acc;
}, {});

// ============================================================
// 6) FONTLAR
// ============================================================
// ⚠️ Font AİLESİ web'de CSS ile veriliyor (`public/index.html` →
// `html[data-cs-theme='cs-dark']` kuralı), çünkü tema anında değişebilmeli.
// Buradaki tokenlar yalnızca native ve açık istisnalar için.
//
// ⚠️ `mono` HER İKİ TEMADA DA gerçek monospace: bakiye/sayaç rakamlarının
// genişliği sabit olmalı, yoksa sayı değiştikçe rozet yerinden oynar.
const SYSTEM_STACK = '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif';
const MONO_STACK = 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace';

export const F = {
  body: IS_WEB ? 'var(--cs-font)' : SYSTEM_STACK,
  display: IS_WEB ? 'var(--cs-font-display, var(--cs-font))' : SYSTEM_STACK,
  mono: MONO_STACK
};

// Başlık / menü tipografisi: büyük harf + geniş harf aralığı.
// ⚠️ Font AİLESİ burada VERİLMEZ — verilirse react-native-web o öğeye
// `r-fontFamily-*` sınıfı basar ve index.html'deki tema kuralı onu `:not()`
// ile dışarıda bırakır; sonuçta menü fontu temayla birlikte DEĞİŞMEZ.
// Büyük harf ve harf aralığı zaten her iki temada da uygulanıyordu.
export const displayType = (letterSpacing = 1.1) => ({
  textTransform: 'uppercase',
  letterSpacing
});

// ============================================================
// 7) AKTİF/SEÇİLİ DURUM GÖRÜNÜMÜ
// ============================================================
// Koyu temada: mat gri zemin + ince parlak vurgu çizgisi.
// Açık temada: çizgi kalınlığı 0 → eski "tamamen dolu vurgu rengi" görünümü.
// Kalınlık da bir CSS değişkeni olduğu için tema anında değişebiliyor.
export const activeIndicator = (side = 'bottom', width = 2) => {
  if (!IS_WEB) {
    if (DEFAULT_THEME !== 'cs-dark') return null;
    return side === 'left'
      ? { borderLeftWidth: width, borderLeftColor: PALETTES[DEFAULT_THEME].accentLine }
      : { borderBottomWidth: width, borderBottomColor: PALETTES[DEFAULT_THEME].accentLine };
  }
  const w = cssVar(`line-${width}`, `${width}px`);
  return side === 'left'
    ? { borderLeftWidth: w, borderLeftColor: C.accentLine }
    : { borderBottomWidth: w, borderBottomColor: C.accentLine };
};

// ============================================================
// 8) KESİK KÖŞE (CLIP-PATH) — taktiksel vurgu
// ============================================================
// ⚠️ Yalnızca web. `clip-path` kutunun DIŞINA taşan her şeyi keser; bu yüzden
// SADECE içeriği kendi içinde kapalı öğelerde (butonlar) kullanılır —
// bilgi kutucuğu veya açılır liste barındıran kaplara UYGULANMAZ.
// ⚠️ Boyut sabittir (12px): değer bir CSS değişkeninden geldiği için parametre
// başına ayrı bir değişken üretmek gerekirdi; tek boyut yeterli.
export const clipCut = () => (IS_WEB ? { clipPath: 'var(--cs-clip, none)' } : null);
export const clipCorner = () => (IS_WEB ? { clipPath: 'var(--cs-clip-corner, none)' } : null);

// ============================================================
// 9) WEB GEÇİŞLERİ (CSS transition)
// ============================================================
// react-native-web `transitionProperty/Duration/TimingFunction` anahtarlarını
// gerçek CSS transition'a çevirir. Animated yerine bunu kullanmak hover için
// çok daha sağlam: JS thread'ini meşgul etmez ve composite edilmeyen
// sekmelerde donan requestAnimationFrame sorununa yakalanmaz.
export const webTransition = (props = 'transform, box-shadow', ms = 180) =>
  IS_WEB
    ? {
        transitionProperty: props,
        transitionDuration: `${ms}ms`,
        transitionTimingFunction: 'cubic-bezier(0.22, 1, 0.36, 1)'
      }
    : null;

// ============================================================
// 10) NADİRLİK IŞIĞI + RENK YARDIMCILARI
// ============================================================
// ⚠️ Bu fonksiyonlara DAİMA gerçek hex verilir (nadirlik renkleri temadan
// bağımsız). `C.*` tokenları web'de `var(...)` stringi olduğu için buraya
// GEÇİRİLEMEZ — hex ayrıştırma bozulur.
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
  if (IS_WEB) {
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
// ⚠️ Opaklık temaya göre değişir (koyu zeminde %12 neredeyse görünmez), bu
// yüzden alfa da bir CSS değişkeninden gelir — `rgba()` içinde `var()`
// kullanmak geçerli CSS'tir.
export const rarityTint = (hex) => {
  const h = (hex || '#000000').replace('#', '');
  const full = h.length === 3 ? h.split('').map(c => c + c).join('') : h;
  const n = parseInt(full, 16);
  const r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
  return IS_WEB
    ? `rgba(${r}, ${g}, ${b}, var(--rarity-tint, 0.18))`
    : `rgba(${r}, ${g}, ${b}, ${DEFAULT_THEME === 'cs-dark' ? 0.18 : 0.12})`;
};

// ============================================================
// 11) TEMA CSS'İ + ÇALIŞMA ZAMANI GEÇİŞİ
// ============================================================
// Her iki paletin değişkenlerini tek bir stil bloğu olarak üretir. App.js bunu
// bir <style id="cs-theme-vars"> etiketine yazar.
const EXTRA_VARS = {
  'cs-dark': {
    // ⚠️ FONT DA DEĞİŞKEN: böylece tema geçişinde font da anında değişiyor.
    // Dosyalar `public/index.html` içinde Google Fonts ile yükleniyor.
    'cs-font': "'Chakra Petch', 'Rajdhani', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    'cs-font-display': "'Rajdhani', 'Chakra Petch', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    'line-2': '2px',
    'line-3': '3px',
    'rarity-tint': '0.18',
    'cs-clip': 'polygon(0 0, calc(100% - 12px) 0, 100% 12px, 100% 100%, 12px 100%, 0 calc(100% - 12px))',
    'cs-clip-corner': 'polygon(0 0, calc(100% - 8px) 0, 100% 8px, 100% 100%, 0 100%)'
  },
  light: {
    // ⚠️ Açık temada sistem fontu — eski tasarım aynen döner.
    'cs-font': '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
    'cs-font-display': '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
    // ⚠️ Vurgu çizgisi ve kesik köşe YOK — eski tasarım aynen döner.
    'line-2': '0px',
    'line-3': '0px',
    'rarity-tint': '0.12',
    'cs-clip': 'none',
    'cs-clip-corner': 'none'
  }
};

const blockFor = (name) => {
  const parts = [];
  Object.entries(PALETTES[name]).forEach(([k, v]) => parts.push(`--c-${k}:${v}`));
  Object.entries(RADII[name]).forEach(([k, v]) => parts.push(`--r-${k}:${v}px`));
  Object.entries(SHADOW_COLOR[name]).forEach(([k, v]) => parts.push(`--sh-${k}:${v}`));
  Object.entries(EXTRA_VARS[name]).forEach(([k, v]) => parts.push(`--${k}:${v}`));
  return parts.join(';');
};

export const buildThemeCss = () =>
  THEMES.map(name => `html[data-cs-theme="${name}"]{${blockFor(name)}}`).join('\n') +
  // Öznitelik henüz yazılmadıysa (ilk boyama) varsayılan tema geçerli olsun.
  `\nhtml:not([data-cs-theme]){${blockFor(DEFAULT_THEME)}}`;

// ⚠️ TEK ONAYLI KALICILIK #2 (bkz. AGENTS.md Altın Kural 6): tema TERCİHİ
// `localStorage`'da tutulur. Bu bir oyun durumu değil, bir arayüz tercihidir —
// disclaimer'ın kapatılmış olmasıyla aynı sınıf. Bakiye/envanter/geçmiş HÂLÂ
// yalnızca oturum içidir.
// ⚠️ `localStorage` native'de YOKTUR ve gizli sekmede HATA FIRLATIR — Platform
// kontrolü + try/catch zorunlu.
const STORAGE_KEY = 'skinsim.theme';

export const getStoredTheme = () => {
  if (!IS_WEB) return DEFAULT_THEME;
  try {
    const v = window.localStorage.getItem(STORAGE_KEY);
    return THEMES.includes(v) ? v : DEFAULT_THEME;
  } catch {
    return DEFAULT_THEME;
  }
};

export const applyTheme = (name) => {
  const theme = THEMES.includes(name) ? name : DEFAULT_THEME;
  if (!IS_WEB || typeof document === 'undefined') return theme;
  document.documentElement.setAttribute('data-cs-theme', theme);
  // Kaydırma çubuğu ve tarayıcı arayüzü de temaya uysun.
  document.documentElement.style.colorScheme = theme === 'cs-dark' ? 'dark' : 'light';
  // Gövde zemini: değişken üzerinden, böylece geçiş anında olur.
  document.documentElement.style.backgroundColor = `var(--c-bg)`;
  document.body.style.backgroundColor = `var(--c-bg)`;
  try { window.localStorage.setItem(STORAGE_KEY, theme); } catch { /* gizli sekme */ }
  return theme;
};

export default {
  THEMES, DEFAULT_THEME, THEME, C, RARITY, R, F, shadow,
  displayType, activeIndicator, clipCut, clipCorner,
  webTransition, rarityGlowStyle, hexToRgba, rarityTint,
  buildThemeCss, getStoredTheme, applyTheme
};
