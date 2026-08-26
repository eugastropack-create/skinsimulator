import { getWearFromFloat, generateMockPrice } from './utils';

// ============================================================
// CANLI FİYAT KAYNAĞI
// ============================================================
// Ücretsiz, API anahtarı gerektirmeyen topluluk kaynağı (Steam Market
// verilerini agregatlıyor). Bu kaynağa ulaşılamazsa (ağ hatası, CORS,
// format değişikliği vb.) uygulama OTOMATİK olarak simüle edilmiş
// fiyatlandırmaya (generateMockPrice) geri döner — site asla kırılmaz.
//
// NOT: Bu kaynağın şu an canlı olup olmadığını sizin tarafınızda test
// etmeniz gerekiyor (npm run web sonrası tarayıcı konsolunu kontrol edin).
// Eğer çalışmazsa LIVE_PRICE_URL'i başka bir ücretsiz kaynakla
// değiştirmek tek satırlık bir değişiklik.
const LIVE_PRICE_URL = 'https://prices.csgotrader.app/latest/prices_v6.json';

export const fetchLivePrices = async () => {
  try {
    const res = await fetch(LIVE_PRICE_URL);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const raw = await res.json();

    const normalized = {};
    Object.keys(raw).forEach(key => {
      const entry = raw[key];
      let price = null;
      if (typeof entry === 'number') price = entry;
      else if (entry?.steam?.last_24h != null) price = entry.steam.last_24h;
      else if (entry?.steam?.last_7d != null) price = entry.steam.last_7d;
      else if (typeof entry?.steam === 'number') price = entry.steam;
      else if (entry?.steam_price != null) price = entry.steam_price;
      else if (entry?.price != null) price = entry.price;

      if (typeof price === 'number' && price > 0) normalized[key] = price;
    });

    if (Object.keys(normalized).length === 0) throw new Error('Beklenmeyen veri formatı (0 eşya bulundu)');
    console.log(`✅ Canlı fiyat verisi yüklendi: ${Object.keys(normalized).length} eşya`);
    return normalized;
  } catch (e) {
    console.log('⚠️ Canlı fiyat verisi çekilemedi, simüle fiyatlandırmaya geçildi:', e.message);
    return null; // null = "canlı veri yok, her yerde mock'a düş"
  }
};

// Steam market_hash_name formatını üretir: "StatTrak™ AK-47 | Redline (Field-Tested)"
export const buildMarketHashName = (item, wear, isStatTrak = false) => {
  if (!item?.name) return null;
  const hasWear = item.min_float !== undefined && item.min_float !== null;
  const prefix = isStatTrak ? 'StatTrak™ ' : '';
  return hasWear && wear ? `${prefix}${item.name} (${wear})` : `${prefix}${item.name}`;
};

// Ana fiyat çözümleyici: önce canlı fiyata bakar, bulamazsa simülasyona düşer
export const getRealisticPrice = (priceMap, item, floatVal, isStatTrak, rarityNameFallback) => {
  const wear = getWearFromFloat(floatVal);
  if (priceMap) {
    const hashName = buildMarketHashName(item, wear, isStatTrak);
    const live = hashName ? priceMap[hashName] : null;
    if (typeof live === 'number' && live > 0) return parseFloat(live.toFixed(2));
  }
  return generateMockPrice(rarityNameFallback ?? item?.rarity?.name, floatVal, isStatTrak);
};

const getExpectedPriceForItem = (item, priceMap) => {
  const avgFloat = 0.25; // Field-Tested varsayılan referans float
  const base = getRealisticPrice(priceMap, item, avgFloat, false, item.rarity?.name);
  const st = getRealisticPrice(priceMap, item, avgFloat, true, item.rarity?.name);
  // %10 StatTrak ihtimaline göre ağırlıklı ortalama
  return base * 0.9 + st * 0.1;
};

// CS ROI (csroi.com) tarzı: bir kasa için beklenen değer (EV) ve %ROI
export const calculateCaseStats = (crate, priceMap = null) => {
  const RARITY_ODDS = {
    '#4b69ff': 0.7992, // Mil-Spec
    '#8847ff': 0.1598, // Restricted
    '#d32ce6': 0.0320, // Classified
    '#eb4b4b': 0.0064, // Covert
    '#ffd700': 0.0026  // Rare Special (Bıçak/Eldiven)
  };

  let expectedReturn = 0;
  let maxPossibleValue = 0;

  Object.keys(RARITY_ODDS).forEach(color => {
    const chance = RARITY_ODDS[color];
    const itemsInRarity = (crate.contains || []).filter(i => i.rarity?.color?.toLowerCase() === color);
    if (itemsInRarity.length > 0) {
      const avgPrice = itemsInRarity.reduce((sum, it) => sum + getExpectedPriceForItem(it, priceMap), 0) / itemsInRarity.length;
      expectedReturn += avgPrice * chance;

      itemsInRarity.forEach(it => {
        const maxP = getRealisticPrice(priceMap, it, 0.001, true, it.rarity?.name);
        if (maxP > maxPossibleValue) maxPossibleValue = maxP;
      });
    }
  });

  const cost = (crate.price || 0.50) + 2.50; // Kasa fiyatı + Anahtar
  const roi = cost > 0 ? (expectedReturn / cost) * 100 : 0;

  return {
    roi: parseFloat(roi.toFixed(2)),
    expectedReturn: parseFloat(expectedReturn.toFixed(2)),
    maxProfit: parseFloat(maxPossibleValue.toFixed(2))
  };
};

// Aynı mantık Armory (Cephanelik) koleksiyonları için — csroi.com/armory tarzı
export const calculateArmoryStats = (collection, priceMap = null) => {
  const RARITY_CHANCES = {
    'Consumer Grade': 0.7992,
    'Industrial Grade': 0.1598,
    'Mil-Spec Grade': 0.0320,
    'Restricted': 0.0064,
    'Classified': 0.0020,
    'Covert': 0.0006
  };

  let expectedReturn = 0;
  let maxPossibleValue = 0;

  Object.keys(RARITY_CHANCES).forEach(rarityName => {
    const chance = RARITY_CHANCES[rarityName];
    const itemsInRarity = (collection.contains || []).filter(i => i.rarity?.name === rarityName);
    if (itemsInRarity.length > 0) {
      const avgPrice = itemsInRarity.reduce((sum, it) => sum + getExpectedPriceForItem(it, priceMap), 0) / itemsInRarity.length;
      expectedReturn += avgPrice * chance;

      itemsInRarity.forEach(it => {
        const maxP = getRealisticPrice(priceMap, it, 0.001, false, rarityName);
        if (maxP > maxPossibleValue) maxPossibleValue = maxP;
      });
    }
  });

  const cost = 1.60; // 4 yıldız ≈ $1.60 (Armory Pass: 40 yıldız = $16.00)
  const roi = cost > 0 ? (expectedReturn / cost) * 100 : 0;

  return {
    roi: parseFloat(roi.toFixed(2)),
    expectedReturn: parseFloat(expectedReturn.toFixed(2)),
    maxProfit: parseFloat(maxPossibleValue.toFixed(2))
  };
};
