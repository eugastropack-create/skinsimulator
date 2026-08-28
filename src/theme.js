// ============================================================
// SKIN SIMULATOR — AÇIK TEMA (LIGHT THEME) TASARIM SİSTEMİ
// ============================================================
// TEK RENK KAYNAĞI. Hiçbir bileşen kendi içinde ham renk kodu tanımlamamalı;
// buradaki `C` (colors) tokenlarını kullanmalı. Böylece tema tek dosyadan
// değiştirilebilir ve ekranlar arasında renk kayması olmaz.
//
// PALET MANTIĞI (kullanıcı brief'i):
//   • Ana vurgu  : açık mavi (#38a3f1)
//   • Zeminler   : buzul grisi / kırık beyaz (#f4f7fb, #ffffff)
//   • Metinler   : koyu gri (#26303d) — saf siyah DEĞİL, göz yormasın
//   • Kartlar    : kaba çerçeve YOK; yumuşak gölge + çok açık kenarlık
//   • Kumarhane havası (koyu zemin + neon turuncu) TAMAMEN kaldırıldı.
//
// ⚠️ NADİRLİK RENKLERİ (RARITY) İSTİSNADIR: Bunlar Valve'in resmi CS2
// renkleridir (mavi/mor/pembe/kırmızı/altın) ve tema değişse bile SABİT
// kalmalıdır — kullanıcılar bu renkleri oyundan tanıyor.

import { Platform } from 'react-native';

export const C = {
  // Zeminler
  bg: '#f4f7fb',          // sayfa zemini — buzul grisi
  bgAlt: '#eaf1f8',       // ikincil zemin (şeritler, çark arkası)
  surface: '#ffffff',     // kart / panel
  surfaceAlt: '#f2f6fb',  // panel içi vurgulu bölüm
  surfaceSunken: '#e8eff7',

  // Kenarlıklar — bilinçli olarak ÇOK açık; "kaba çerçeve" istenmiyor
  border: '#e2eaf3',
  borderStrong: '#cfdcea',

  // Metin
  text: '#26303d',        // koyu gri (ana metin)
  textSoft: '#4c5a6b',
  textDim: '#7b8798',
  textFaint: '#a6b2c1',
  onAccent: '#ffffff',

  // Vurgu — açık mavi ailesi
  accent: '#38a3f1',
  accentDeep: '#1b7fd1',
  accentSoft: '#e4f1fd',   // açık mavi zemin (chip, rozet)
  accentBorder: '#bfdefa',

  // Durum renkleri (açık temaya kalibre — okunaklı kontrast)
  success: '#0f9d63',
  successSoft: '#e3f7ee',
  danger: '#e05252',
  dangerSoft: '#fdeaea',
  warn: '#d98d1f',
  warnSoft: '#fdf2e0',
  gold: '#c99a06',

  // CRT / Terminal ekranı (açık temada bile cihaz ekranı koyu kalır —
  // gerçek bir terminal ekranını taklit ediyor)
  crtBg: '#0d1b26',
  crtBgDeep: '#08141d',
  crtText: '#5ff0c4',
  crtDim: '#2a7a68',
  crtScan: 'rgba(95, 240, 196, 0.08)'
};

// ============================================================
// NADİRLİK RENKLERİ — Valve resmi paleti (DEĞİŞTİRME)
// ============================================================
export const RARITY = {
  gold:   '#ffd700', // Rare Special (Bıçak/Eldiven)
  red:    '#eb4b4b', // Covert / Extraordinary
  pink:   '#d32ce6', // Classified / Exotic
  purple: '#8847ff', // Restricted / Remarkable
  blue:   '#4b69ff', // Mil-Spec / High Grade
  lightBlue: '#5e98d9', // Industrial Grade
  grey:   '#b0c3d9'  // Consumer Grade
};

// ============================================================
// YUMUŞAK GÖLGELER (SOFT SHADOWS)
// ============================================================
// Açık temada siyah gölge kirli/gri görünür. Gölge rengi olarak mavi-gri bir
// ton kullanmak kartları "havada" gösterir ve zeminle uyumlu kalır.
export const shadow = {
  // Dinlenme hâlindeki kart
  card: {
    shadowColor: '#8ba3bf',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.16,
    shadowRadius: 14,
    elevation: 3
  },
  // Hover'da yukarı kalkan kart (daha derin ve yayvan gölge)
  cardHover: {
    shadowColor: '#6f8bab',
    shadowOffset: { width: 0, height: 14 },
    shadowOpacity: 0.26,
    shadowRadius: 26,
    elevation: 10
  },
  // Üst çubuk / yapışkan başlıklar
  bar: {
    shadowColor: '#8ba3bf',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 10,
    elevation: 2
  },
  // Modal / açılır pencere
  modal: {
    shadowColor: '#4d637d',
    shadowOffset: { width: 0, height: 18 },
    shadowOpacity: 0.28,
    shadowRadius: 40,
    elevation: 16
  }
};

// ============================================================
// WEB GEÇİŞLERİ (CSS transition)
// ============================================================
// react-native-web, `transitionProperty/Duration/TimingFunction` stil
// anahtarlarını gerçek CSS transition'a çevirir. Bunu Animated yerine
// kullanmak hover efektleri için ÇOK daha sağlam:
//   • JS thread'i meşgul etmez,
//   • composite edilmeyen (arka plan) sekmelerde takılan requestAnimationFrame
//     sorununa yakalanmaz (bkz. AGENTS.md §3 Test Ortamı Notu).
// Native'de bu anahtarlar sessizce yok sayılır — orada stil ANINDA değişir,
// bu da kabul edilebilir bir bozulmadır (graceful degradation).
export const webTransition = (props = 'transform, box-shadow', ms = 180) =>
  Platform.OS === 'web'
    ? {
        transitionProperty: props,
        transitionDuration: `${ms}ms`,
        transitionTimingFunction: 'cubic-bezier(0.22, 1, 0.36, 1)'
      }
    : null;

// ============================================================
// NADİRLİK IŞIĞI (RARITY GLOW) — CS2 orijinal drop efekti
// ============================================================
// Kutudan eşya çıktığında, eşya kutusunun ALT %10-15'lik kısmından yukarı
// doğru SÖNÜMLENEREK çıkan renkli bir ışık. CS2'de bu efekt eşyanın
// nadirliğini daha eşya okunmadan belli eder.
//
// RN-Web'de gerçek bir `linear-gradient` stringi `background` anahtarıyla
// verilebiliyor (bkz. CaseOpening EdgeFades). Native'de gradient desteği
// olmadığı için düz yarı saydam bir renge düşüyoruz.
export const rarityGlowStyle = (hex, { height = '38%', strength = 0.85 } = {}) => {
  const base = {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height,
    borderBottomLeftRadius: 14,
    borderBottomRightRadius: 14
  };
  if (Platform.OS === 'web') {
    return {
      ...base,
      // Alttan yukarı: yoğun renk -> yarı saydam -> tamamen şeffaf.
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

// Nadirlik rengini açık zemin üzerinde okunaklı bir "chip" zeminine çevirir.
export const rarityTint = (hex) => hexToRgba(hex, 0.12);

export default { C, RARITY, shadow, webTransition, rarityGlowStyle, hexToRgba, rarityTint };
