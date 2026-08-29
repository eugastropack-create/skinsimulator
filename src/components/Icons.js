import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Svg, { Path, Circle, Rect, Line, Polyline, Polygon } from 'react-native-svg';
import { C } from '../theme';

// ============================================================
// CS2 TARZI VEKTÖR SİMGE SETİ
// ============================================================
// ⚠️ NEDEN EMOJİ DEĞİL, NEDEN SVG:
//   1) Emoji her işletim sisteminde FARKLI çizilir. 🔍 Windows'ta renkli ve
//      şişkin (kullanıcının "Mario oyunu gibi" dediği görünüm), macOS'ta
//      bambaşka, Android'de bambaşka. Aynı arayüz üç ayrı görsel dile
//      bölünüyordu.
//   2) Emoji'ye renk/kalınlık veremezsiniz. CS2'nin arayüz dili MONOKROM ve
//      İNCE ÇİZGİLİDİR; renk yalnızca nadirlikte ve para/kredi göstergesinde
//      kullanılır. Emoji bu kuralı yapısal olarak ihlal ediyordu.
//
// TASARIM KURALLARI (hepsi burada, tek yerde):
//   • 24x24 viewBox, `stroke` tabanlı (dolgu YOK — line art)
//   • strokeWidth 1.6 (küçük boyutlarda bile net, ama kalın/çocuksu değil)
//   • strokeLinecap/join: round → çizim hissi
//   • varsayılan renk `currentColor` yerine prop; hiçbir simgede sabit renk yok
//     (TEK İSTİSNA: StarIcon/DollarIcon'un varsayılan yeşili — para göstergesi)
//
// KULLANIM: <IconSearch size={16} color={C.textDim} />

const SW = 1.6;

// Ortak sarmalayıcı: boyut/renk/çizgi kalınlığı tek yerden yönetilir.
function Icon({ size = 16, color = C.textSoft, strokeWidth = SW, children, style }) {
  return (
    <Svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      style={style}
    >
      {children}
    </Svg>
  );
}

// ------------------------------------------------------------
// ARAMA — CS tarzı ince "scope" (dürbün) büyüteci
// ------------------------------------------------------------
// Klasik büyüteç + nişangâh çizgileri: hem "ara" hem "hedefle" okunuyor.
export const IconSearch = (p) => (
  <Icon {...p}>
    <Circle cx="10.5" cy="10.5" r="6.5" />
    <Line x1="15.4" y1="15.4" x2="20.5" y2="20.5" />
    <Line x1="10.5" y1="5.6" x2="10.5" y2="8" />
    <Line x1="10.5" y1="13" x2="10.5" y2="15.4" />
    <Line x1="5.6" y1="10.5" x2="8" y2="10.5" />
    <Line x1="13" y1="10.5" x2="15.4" y2="10.5" />
  </Icon>
);

// ------------------------------------------------------------
// ENVANTER — sandık/kasa (Minecraft bloğu DEĞİL)
// ------------------------------------------------------------
// Perspektifsiz, düz cepheden bir taşıma sandığı: üst kapak şeridi, orta
// kilit dili ve iki yan kayış. Line-art olduğu için 12 px'te bile okunuyor.
export const IconInventory = (p) => (
  <Icon {...p}>
    <Rect x="3" y="7.5" width="18" height="12.5" rx="1.5" />
    <Line x1="3" y1="11.5" x2="21" y2="11.5" />
    <Path d="M8.5 7.5V4.8a1 1 0 0 1 1-1h5a1 1 0 0 1 1 1v2.7" />
    <Rect x="10.4" y="10" width="3.2" height="3.6" rx="0.8" />
  </Icon>
);

// ------------------------------------------------------------
// CS2 SİLAH KASASI — açılış ekranındaki "Kasa: $X" etiketi için
// ------------------------------------------------------------
// Oyundaki kasanın karakteristik hatları: yüksek gövde, ayrı menteşeli üst
// kapak, ortada tek bir mandal ve gövdeyi çevreleyen taşıma kayışı.
export const IconCase = (p) => (
  <Icon {...p}>
    {/* kapak */}
    <Path d="M3.2 9.2 12 5.4l8.8 3.8" />
    <Path d="M3.2 9.2v2.4h17.6V9.2" />
    {/* gövde */}
    <Path d="M4.4 11.6v6.6a1.2 1.2 0 0 0 1.2 1.2h12.8a1.2 1.2 0 0 0 1.2-1.2v-6.6" />
    {/* mandal */}
    <Rect x="10.4" y="10.4" width="3.2" height="3.4" rx="0.7" />
    {/* taşıma kayışları */}
    <Line x1="7.6" y1="13.8" x2="7.6" y2="19.4" />
    <Line x1="16.4" y1="13.8" x2="16.4" y2="19.4" />
  </Icon>
);

// ------------------------------------------------------------
// CS2 KASA ANAHTARI — "Anahtar: $2.50" etiketi için
// ------------------------------------------------------------
// Oyundaki anahtarın silueti: yuvarlak halka başlık, uzun düz gövde ve
// gövdenin ucunda iki diş.
export const IconKey = (p) => (
  <Icon {...p}>
    <Circle cx="7.6" cy="7.6" r="3.9" />
    <Circle cx="7.6" cy="7.6" r="1.2" />
    <Line x1="10.4" y1="10.4" x2="19.6" y2="19.6" />
    <Line x1="17.2" y1="17.2" x2="15" y2="19.4" />
    <Line x1="19.6" y1="19.6" x2="17.6" y2="21.6" />
  </Icon>
);

// ------------------------------------------------------------
// SIRALAMA / MENÜ SİMGELERİ
// ------------------------------------------------------------
// Varsayılan sıralama — düz liste
export const IconList = (p) => (
  <Icon {...p}>
    <Line x1="4" y1="6.5" x2="20" y2="6.5" />
    <Line x1="4" y1="12" x2="20" y2="12" />
    <Line x1="4" y1="17.5" x2="14" y2="17.5" />
  </Icon>
);

// ROI / kârlılık — yükselen çizgi grafiği
export const IconChart = (p) => (
  <Icon {...p}>
    <Polyline points="3.5,17 9,11.5 13,15 20.5,7.5" />
    <Polyline points="15.5,7.5 20.5,7.5 20.5,12.5" />
    <Line x1="3.5" y1="20.5" x2="20.5" y2="20.5" />
  </Icon>
);

// En pahalı — kesilmiş taş (elmas), düz çizgilerle
export const IconGem = (p) => (
  <Icon {...p}>
    <Path d="M6 4.5h12l3.2 5-9.2 10L2.8 9.5z" />
    <Line x1="2.8" y1="9.5" x2="21.2" y2="9.5" />
    <Path d="M9.4 9.5 12 19.5l2.6-10" />
    <Path d="M6 4.5 9.4 9.5M18 4.5l-3.4 5" />
  </Icon>
);

// En ucuz — fiyat etiketi
export const IconTag = (p) => (
  <Icon {...p}>
    <Path d="M11.4 3.5H20a.5.5 0 0 1 .5.5v8.6a1 1 0 0 1-.3.7l-7.2 7.2a1 1 0 0 1-1.4 0l-7.9-7.9a1 1 0 0 1 0-1.4l7.2-7.2a1 1 0 0 1 .5-.5z" />
    <Circle cx="16.6" cy="7.4" r="1.5" />
  </Icon>
);

// En popüler — yükseliş oku (alev emojisi DEĞİL)
export const IconTrend = (p) => (
  <Icon {...p}>
    <Polyline points="3.5,16.5 8.5,11.5 12,15 20.5,6.5" />
    <Polyline points="15,6.5 20.5,6.5 20.5,12" />
  </Icon>
);

// Yenilik / en yeni — saat
export const IconClock = (p) => (
  <Icon {...p}>
    <Circle cx="12" cy="12" r="8.5" />
    <Polyline points="12,7 12,12 15.5,14" />
  </Icon>
);

// Aşağı/yukarı sıralama okları (fiyat ve float sıralamaları için)
export const IconArrowDown = (p) => (
  <Icon {...p}>
    <Line x1="12" y1="4.5" x2="12" y2="19" />
    <Polyline points="6.5,13.5 12,19 17.5,13.5" />
  </Icon>
);
export const IconArrowUp = (p) => (
  <Icon {...p}>
    <Line x1="12" y1="19.5" x2="12" y2="5" />
    <Polyline points="6.5,10.5 12,5 17.5,10.5" />
  </Icon>
);

// Sıfırla / yeniden dene
export const IconRefresh = (p) => (
  <Icon {...p}>
    <Path d="M20 12a8 8 0 1 1-2.6-5.9" />
    <Polyline points="20.5,3.5 20.5,8.5 15.5,8.5" />
  </Icon>
);

// Rehber / blog
export const IconBook = (p) => (
  <Icon {...p}>
    <Path d="M4 5a1.5 1.5 0 0 1 1.5-1.5H11a2 2 0 0 1 2 2v14a1.6 1.6 0 0 0-1.6-1.6H5.5A1.5 1.5 0 0 1 4 16.4z" />
    <Path d="M20 5a1.5 1.5 0 0 0-1.5-1.5H15a2 2 0 0 0-2 2v14a1.6 1.6 0 0 1 1.6-1.6h3.9a1.5 1.5 0 0 0 1.5-1.5z" />
  </Icon>
);

// Cüzdan
export const IconWallet = (p) => (
  <Icon {...p}>
    <Path d="M3.5 7.5A2 2 0 0 1 5.5 5.5h11a1.5 1.5 0 0 1 1.5 1.5v1.5" />
    <Rect x="3.5" y="7.5" width="17" height="11" rx="2" />
    <Path d="M20.5 11.5h-3.6a2 2 0 0 0 0 4h3.6" />
  </Icon>
);

// Sınırsız mod
export const IconInfinity = (p) => (
  <Icon {...p}>
    <Path d="M7 8.5a3.5 3.5 0 1 0 0 7c2.4 0 3.6-2.2 5-3.5 1.4-1.3 2.6-3.5 5-3.5a3.5 3.5 0 1 1 0 7c-2.4 0-3.6-2.2-5-3.5-1.4-1.3-2.6-3.5-5-3.5z" />
  </Icon>
);

// Dünya / dil değiştirici — emoji 🌐 yerine ince çizgili küre
export const IconGlobe = (p) => (
  <Icon {...p}>
    <Circle cx="12" cy="12" r="8.6" />
    <Line x1="3.4" y1="12" x2="20.6" y2="12" />
    <Path d="M12 3.4c2.3 2.4 3.5 5.4 3.5 8.6s-1.2 6.2-3.5 8.6c-2.3-2.4-3.5-5.4-3.5-8.6S9.7 5.8 12 3.4z" />
  </Icon>
);

// Kapat
export const IconClose = (p) => (
  <Icon {...p}>
    <Line x1="6" y1="6" x2="18" y2="18" />
    <Line x1="18" y1="6" x2="6" y2="18" />
  </Icon>
);

// Onay
export const IconCheck = (p) => (
  <Icon {...p}>
    <Polyline points="4.5,12.5 9.5,17.5 19.5,6.5" />
  </Icon>
);

// Kilit (Trade-Up kilitli yuvalar)
export const IconLock = (p) => (
  <Icon {...p}>
    <Rect x="4.5" y="10.5" width="15" height="10" rx="2" />
    <Path d="M8 10.5V7.8a4 4 0 0 1 8 0v2.7" />
  </Icon>
);

// Çoklu seçim
export const IconSelect = (p) => (
  <Icon {...p}>
    <Rect x="3.5" y="3.5" width="9" height="9" rx="1.5" />
    <Path d="M8 16.5v2a2 2 0 0 0 2 2h8.5a2 2 0 0 0 2-2V10a2 2 0 0 0-2-2h-2" />
  </Icon>
);

// Çöp / temizle
export const IconTrash = (p) => (
  <Icon {...p}>
    <Line x1="3.8" y1="6.5" x2="20.2" y2="6.5" />
    <Path d="M6.5 6.5V19a1.8 1.8 0 0 0 1.8 1.8h7.4A1.8 1.8 0 0 0 17.5 19V6.5" />
    <Path d="M9.2 6.5V4.6a1.2 1.2 0 0 1 1.2-1.2h3.2a1.2 1.2 0 0 1 1.2 1.2v1.9" />
  </Icon>
);

// Sat (para etiketi)
export const IconSell = (p) => (
  <Icon {...p}>
    <Circle cx="12" cy="12" r="8.5" />
    <Line x1="12" y1="7" x2="12" y2="17" />
    <Path d="M14.6 9.4a2.6 2.6 0 0 0-2.6-1.4c-1.6 0-2.6.8-2.6 2s1 1.8 2.6 2 2.6.8 2.6 2-1 2-2.6 2a2.6 2.6 0 0 1-2.6-1.4" />
  </Icon>
);

// ============================================================
// PARA / KREDİ SİMGELERİ — TEK RENKLİ İSTİSNA
// ============================================================
// Bu ikisi bilinçli olarak RENKLİDİR (yeşil). Sebep: bakiye ve kredi
// göstergeleri arayüzün "durum" katmanıdır; monokrom bırakılırlarsa gezinme
// simgelerinden ayrışmaz ve göz onları taramada bulamaz.

// CS2'de operasyon/armor yıldızı YEŞİLDİR (Valve'in kredi yıldızı).
export const STAR_GREEN = '#4ade80';

export function StarIcon({ size = 13, color = STAR_GREEN, style }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" style={style}>
      <Polygon
        points="12,2.6 15.1,9 22.2,10 17.1,15 18.3,22 12,18.7 5.7,22 6.9,15 1.8,10 8.9,9"
        fill={color}
      />
    </Svg>
  );
}

export function DollarIcon({ size = 13, color = C.success, style }) {
  return (
    <Svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={2.6}
      strokeLinecap="round"
      strokeLinejoin="round"
      style={style}
    >
      <Line x1="12" y1="2.5" x2="12" y2="21.5" />
      <Path d="M17 6.6a4.4 4.4 0 0 0-4.6-2.4c-2.9 0-4.7 1.5-4.7 3.7 0 2.3 1.8 3.3 4.7 3.7 3 .4 4.9 1.4 4.9 3.7s-1.9 3.7-4.9 3.7A4.6 4.6 0 0 1 7 16.6" />
    </Svg>
  );
}

// ============================================================
// DEĞER ROZETİ (bakiye / kredi)
// ============================================================
// ⚠️ Sayılar MONOSPACE: bakiye değiştikçe rakam genişliği sabit kaldığı için
// rozet yerinde durur, komşu elemanları itip kaydırmaz. Oyun arayüzlerinde
// sayaçların tabular olması bu yüzden standarttır.
export function ValuePill({ icon, value, tone = 'money', compact = false }) {
  const toneColor = tone === 'star' ? STAR_GREEN : C.success;
  return (
    <View style={[p.pill, compact && p.pillCompact]}>
      {icon}
      <Text style={[p.value, compact && p.valueCompact, { color: toneColor }]}>{value}</Text>
    </View>
  );
}

const MONO = 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace';

const p = StyleSheet.create({
  pill: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: C.surfaceAlt,
    borderWidth: 1, borderColor: C.border,
    paddingHorizontal: 10, paddingVertical: 5,
    borderRadius: 4 // CS arayüzü keskin köşelidir — 999'luk hap biçimi değil
  },
  pillCompact: { paddingHorizontal: 8, paddingVertical: 3, gap: 4 },
  value: { fontSize: 13, fontWeight: '800', fontFamily: MONO, letterSpacing: -0.2 },
  valueCompact: { fontSize: 12 }
});

export default {
  Icon, IconSearch, IconInventory, IconCase, IconKey, IconList, IconChart,
  IconGem, IconTag, IconTrend, IconClock, IconArrowDown, IconArrowUp,
  IconRefresh, IconBook, IconWallet, IconInfinity, IconGlobe, IconClose, IconCheck,
  IconLock, IconSelect, IconTrash, IconSell,
  StarIcon, DollarIcon, ValuePill, STAR_GREEN
};
