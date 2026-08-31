export const getWearFromFloat = (floatVal) => {
  if (floatVal < 0.07) return 'Factory New';
  if (floatVal < 0.15) return 'Minimal Wear';
  if (floatVal < 0.38) return 'Field-Tested';
  if (floatVal < 0.45) return 'Well-Worn';
  return 'Battle-Scarred';
};

// Simüle fiyatlamada float -> çarpan tablosu.
// ⚠️ TEK KAYNAK: hem `generateMockPrice` (rastgele varyanslı) hem de
// `prices.js -> stableMockPrice` (varyanssız) bunu kullanır. Ayrı ayrı
// yazılırsa biri güncellenip diğeri unutulur ve aynı eşya iki farklı yerde
// iki farklı fiyat gösterir.
export const mockWearMultiplier = (floatVal) => {
  if (floatVal < 0.07) return 2.5;
  if (floatVal < 0.15) return 1.5;
  if (floatVal < 0.38) return 1.0;
  if (floatVal < 0.45) return 0.8;
  return 0.6;
};

export const generateMockPrice = (rarityName, floatVal, isStatTrak) => {
  let basePrice = 0.5;
  const name = (rarityName || '').toLowerCase();

  if (name.includes('consumer')) basePrice = 0.1;
  else if (name.includes('industrial')) basePrice = 0.3;
  else if (name.includes('mil-spec') || name.includes('mavi') || name.includes('blue')) basePrice = 1.5;
  else if (name.includes('restricted') || name.includes('mor') || name.includes('purple')) basePrice = 5.0;
  else if (name.includes('classified') || name.includes('pembe') || name.includes('pink')) basePrice = 20.0;
  else if (name.includes('covert') || name.includes('kırmızı') || name.includes('red')) basePrice = 60.0;
  else if (name.includes('rare') || name.includes('altın') || name.includes('gold')) basePrice = 300.0;
  else basePrice = 1.0;

  let finalPrice = basePrice * mockWearMultiplier(floatVal);
  if (isStatTrak) finalPrice *= 1.8;

  const randomVariance = 0.85 + (Math.random() * 0.30);
  finalPrice *= randomVariance;

  return parseFloat(finalPrice.toFixed(2));
};

// NOT: Eski `getExpectedPrice(rarityName)` fonksiyonu kaldırıldı — yalnızca artık
// silinmiş olan TradeUpAnalyzer.js kullanıyordu. Beklenen değer hesabı için
// src/prices.js içindeki `getExpectedPriceForItem(item, priceMap)` kullanılır;
// o sürüm CANLI fiyatları da dikkate alır, bu yüzden çok daha doğrudur.

// ============================================================
// FLOAT (AŞINMA) ÜRETİMİ — "hep Battle-Scarred çıkıyor" BUG DÜZELTMESİ
// ============================================================
// KÖK NEDEN: Eski kod `min + Math.random() * (max - min)` ile DÜZGÜN DAĞILIMLI
// (uniform) bir float üretiyordu. Ama aşınma kademelerinin float aralıkları EŞİT
// GENİŞLİKTE DEĞİL — Battle-Scarred tek başına 0.45–1.00 arasını, yani skalanın
// %55'ini kaplıyor! Sonuç: 0-1 aralıklı bir silahta çıkan eşyaların yarısından
// fazlası Battle-Scarred oluyordu (FN sadece %7, WW %7).
//
//   Eski (uniform) dağılım:  FN %7   MW %8   FT %23  WW %7   BS %55  ← BUG
//   Gerçek CS2 dağılımı:     FN %3   MW %24  FT %33  WW %24  BS %16
//
// DOĞRU MEKANİK (Valve'in kullandığı yöntem): önce AĞIRLIKLI olarak bir aşınma
// kademesi seçilir, SONRA o kademenin kendi aralığında düzgün dağılımlı bir
// taban float (0-1) üretilir. Bu taban float en sonda eşyanın KENDİ
// min_float/max_float aralığına ölçeklenir — yani bazı skinler hiç Factory New
// olamaz, bazıları hiç Battle-Scarred olamaz (bu davranış korunuyor).
export const WEAR_TIERS = [
  { name: 'Factory New',    lo: 0.00, hi: 0.07, weight: 3  },
  { name: 'Minimal Wear',   lo: 0.07, hi: 0.15, weight: 24 },
  { name: 'Field-Tested',   lo: 0.15, hi: 0.38, weight: 33 },
  { name: 'Well-Worn',      lo: 0.38, hi: 0.45, weight: 24 },
  { name: 'Battle-Scarred', lo: 0.45, hi: 1.00, weight: 16 }
];

const TOTAL_WEAR_WEIGHT = WEAR_TIERS.reduce((a, t) => a + t.weight, 0); // 100

// Gerçek CS2 ağırlıklarına göre 0-1 aralığında bir TABAN float üretir.
export const generateBaseFloat = () => {
  let roll = Math.random() * TOTAL_WEAR_WEIGHT;
  for (const tier of WEAR_TIERS) {
    if (roll < tier.weight) {
      // Seçilen kademenin kendi aralığında düzgün dağılımlı bir nokta
      return tier.lo + Math.random() * (tier.hi - tier.lo);
    }
    roll -= tier.weight;
  }
  return 0.5; // teorik olarak ulaşılamaz (kayan nokta güvenliği)
};

export const generateFloat = (min = 0, max = 1) => {
  // Taban float (ağırlıklı) -> eşyanın kendi float aralığına ölçekle.
  const safeMin = typeof min === 'number' ? min : 0;
  const safeMax = typeof max === 'number' ? max : 1;
  if (safeMax <= safeMin) return safeMin;
  return safeMin + generateBaseFloat() * (safeMax - safeMin);
};

// PATTERN (PAINT SEED) — gerçek CS2'de her eşyanın 0-1000 arası bir desen
// tohumu vardır; Case Hardened'ın mavi oranı, Fade'in yüzdesi gibi şeyleri
// belirler ve aynı skinin fiyatını ciddi biçimde değiştirebilir. Envanterdeki
// "İncele" ekranında gösterilmek üzere eşya üretilirken bir kez atanır.
export const generatePattern = () => Math.floor(Math.random() * 1001);

// BUG DÜZELTMESİ: `${n>=0?'+':''}${n.toFixed(2)}` kalıbı negatif değerlerde
// "$-2.42" gibi yanlış bir gösterim üretiyordu (eksi işareti dolar işaretinin
// SONRASINA düşüyordu). Doğrusu "-$2.42" olmalı — bu yardımcı fonksiyon işareti
// dolar işaretinin ÖNÜNE koyar. Kâr/zarar gösteren her yerde bunu kullan.
export const formatSignedMoney = (n) => {
  const sign = n < 0 ? '-' : '+';
  return `${sign}$${Math.abs(n).toFixed(2)}`;
};

// NOT: calculateCaseStats artık src/prices.js içinde — canlı fiyatları da
// kullanabilmesi için oraya taşındı (ByMykel skin verisiyle birlikte).
