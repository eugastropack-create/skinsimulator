import { getWearFromFloat, generateMockPrice, generateFloat } from './utils';

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
//
// SOUVENIR ÖNEKİ: Souvenir paketlerinden çıkan eşyalar piyasada AYRI bir isimle
// listelenir — "Souvenir AWP | Dragon Lore (Factory New)". Bu önek olmadan
// souvenir eşyaları için canlı fiyat ARANIRKEN normal skinin fiyatı bulunur ve
// değer ciddi şekilde yanlış hesaplanır (souvenir'ler genelde çok daha pahalıdır).
// Souvenir'de StatTrak YOKTUR; iki önek aynı anda kullanılamaz.
export const buildMarketHashName = (item, wear, isStatTrak = false, isSouvenir = false) => {
  if (!item?.name) return null;
  const hasWear = item.min_float !== undefined && item.min_float !== null;
  const prefix = isSouvenir ? 'Souvenir ' : isStatTrak ? 'StatTrak™ ' : '';
  return hasWear && wear ? `${prefix}${item.name} (${wear})` : `${prefix}${item.name}`;
};

// Ana fiyat çözümleyici: önce canlı fiyata bakar, bulamazsa simülasyona düşer
export const getRealisticPrice = (priceMap, item, floatVal, isStatTrak, rarityNameFallback, isSouvenir = false) => {
  const wear = getWearFromFloat(floatVal);
  if (priceMap) {
    const hashName = buildMarketHashName(item, wear, isStatTrak, isSouvenir);
    let live = hashName ? priceMap[hashName] : null;
    // Souvenir varyantı piyasada listelenmemiş olabilir (ender eşyalar) —
    // bu durumda normal varyanta düş, hiç fiyatsız kalmaktan iyidir.
    if (isSouvenir && !(typeof live === 'number' && live > 0)) {
      const plain = buildMarketHashName(item, wear, false, false);
      live = plain ? priceMap[plain] : null;
    }
    if (typeof live === 'number' && live > 0) return parseFloat(live.toFixed(2));
  }
  const mock = generateMockPrice(rarityNameFallback ?? item?.rarity?.name, floatVal, isStatTrak);
  // Simüle fiyatlamada souvenir primi: gerçek piyasada souvenir varyantları
  // normalden belirgin şekilde pahalıdır (arz çok daha kısıtlı).
  return isSouvenir ? parseFloat((mock * 1.6).toFixed(2)) : mock;
};

// Kasa/Koleksiyon İçerik Önizlemesi için: bir eşyanın gerçekçi fiyat ARALIĞI
// (en kötü float+StatTrak yok -> en iyi float+StatTrak var). Gerçek Steam
// piyasasında da bir skin'in fiyatı float'a ve StatTrak'a göre böyle geniş
// bir aralıkta değişir — kullanıcıya tek bir sabit sayı yerine bu aralığı
// göstermek çok daha dürüst/gerçekçi.
export const getItemPriceRange = (priceMap, item, rarityNameFallback) => {
  const minF = item?.min_float ?? 0;
  const maxF = item?.max_float ?? 1;
  const low = getRealisticPrice(priceMap, item, maxF, false, rarityNameFallback);
  const high = getRealisticPrice(priceMap, item, minF, true, rarityNameFallback);
  return { low: Math.min(low, high), high: Math.max(low, high) };
};

// Trade-Up ÇIKTI havuzu bir koleksiyonla eşleşmediğinde (yedek yol) devreye
// giren genel havuz, API'nin döndürdüğü SIRAYA göre ilk 10 öğeyi alıyordu —
// bu da tanıdık/popüler Covert eşyaların (ör. Asiimov) neredeyse hiç
// çıkmamasına sebep oluyordu. Bu liste, o yedek havuzu popülerliğe göre
// önceliklendirmek için kullanılıyor (veri EKSİK değil, sadece rastgele
// sırayla gömülü kalıyordu — bu, tanıdık eşyaları öne çıkarır).
export const POPULAR_SKIN_PRIORITY = [
  'AWP | Asiimov', 'AK-47 | Asiimov', 'M4A4 | Asiimov', 'P90 | Asiimov',
  'AWP | Dragon Lore', 'AK-47 | Fire Serpent', 'AK-47 | Vulcan', 'AK-47 | Bloodsport',
  'AK-47 | Wasteland Rebel', 'AK-47 | Redline', 'M4A1-S | Hyper Beast',
  'AWP | Fade', 'AWP | Lightning Strike', 'M4A4 | Howl', 'Desert Eagle | Blaze',
  'AWP | Gungnir', 'M4A1-S | Printstream', 'AK-47 | Neon Rider'
];

// `rarityOverride`: bıçak/eldivenler veride rarity.name === 'Covert' taşır ama
// piyasada Covert silahlardan kat kat pahalıdır — onlar için 'Rare Special'
// geçilerek doğru fiyat kademesi kullanılır.
const getExpectedPriceForItem = (item, priceMap, rarityOverride) => {
  const avgFloat = 0.25; // Field-Tested varsayılan referans float
  const r = rarityOverride ?? item.rarity?.name;
  const base = getRealisticPrice(priceMap, item, avgFloat, false, r);
  const st = getRealisticPrice(priceMap, item, avgFloat, true, r);
  // %10 StatTrak ihtimaline göre ağırlıklı ortalama
  return base * 0.9 + st * 0.1;
};

// Anahtar fiyatı Valve tarafından sabitlenmiştir ($2.50) — piyasada değişmez.
export const KEY_PRICE_USD = 2.50;

// ============================================================
// STANDART KASA ÇIKIŞ ORANLARI (Valve resmi dağılımı)
// ============================================================
// TEK KAYNAK: Hem Kasa açılışı (CaseOpening) hem Terminal açılışı
// (TerminalOpening) bu tabloyu kullanır. Terminaller ByMykel verisinde
// normal bir kasayla BİREBİR AYNI yapıdadır (`contains` + `contains_rare`),
// bu yüzden oran tablosunu çoğaltmak yerine paylaşıyoruz — aksi halde biri
// güncellenip diğeri unutulabilirdi.
export const CASE_RARITY_ODDS = [
  { chance: 79.92, name: 'Mil-Spec (Mavi)', color: '#4b69ff' },
  { chance: 15.98, name: 'Restricted (Mor)', color: '#8847ff' },
  { chance: 3.20, name: 'Classified (Pembe)', color: '#d32ce6' },
  { chance: 0.64, name: 'Covert (Kırmızı)', color: '#eb4b4b' },
  { chance: 0.26, name: 'Rare Special (Altın)', color: '#ffd700' }
];

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
    // BUG DÜZELTMESİ: Bıçak/eldivenler `contains` içinde DEĞİL, ayrı
    // `contains_rare` alanındadır (ve renkleri '#ffd700' değil '#eb4b4b'dir).
    // Eskiden altın kademe hiç eşleşmediği için EV hesabına bıçaklar HİÇ
    // katılmıyordu — kasaların beklenen değeri sistematik olarak düşük çıkıyordu.
    const itemsInRarity = color === '#ffd700'
      ? (crate.contains_rare || [])
      : (crate.contains || []).filter(i => i.rarity?.color?.toLowerCase() === color);
    if (itemsInRarity.length > 0) {
      const priceRarity = color === '#ffd700' ? 'Rare Special' : undefined;
      const avgPrice = itemsInRarity.reduce((sum, it) => sum + getExpectedPriceForItem(it, priceMap, priceRarity), 0) / itemsInRarity.length;
      expectedReturn += avgPrice * chance;

      itemsInRarity.forEach(it => {
        const maxP = getRealisticPrice(priceMap, it, 0.001, true, priceRarity ?? it.rarity?.name);
        if (maxP > maxPossibleValue) maxPossibleValue = maxP;
      });
    }
  });

  // KASA FİYATI ARTIK DİNAMİK: crates.json'da fiyat alanı YOK, ama kasanın
  // `market_hash_name`'i canlı fiyat tablosunda geçiyor — yani gerçek Steam
  // fiyatını kullanabiliyoruz (canlı veri yoksa $0.50 tabanına düşer).
  const casePrice = getContainerPrice(priceMap, crate, 'case');
  const cost = casePrice + KEY_PRICE_USD;
  const roi = cost > 0 ? (expectedReturn / cost) * 100 : 0;

  return {
    roi: parseFloat(roi.toFixed(2)),
    expectedReturn: parseFloat(expectedReturn.toFixed(2)),
    maxProfit: parseFloat(maxPossibleValue.toFixed(2)),
    casePrice,
    cost
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

// ============================================================
// CHARM (NAZARLIK) HAVUZU
// ============================================================
// Gerçek CS2'de charm'lar Armory'den bir KAPSÜL karşılığında gelir (3 kredi,
// ≈$1.20) ve kapsül, normal kasalarla AYNI 4 kademeli oran yapısını kullanır
// (Valve sticker/charm kapsüllerinde de bu oranları kullanır): Yüksek Kalite
// (mavi) %80.13, Dikkat Çekici (mor) %16.02, Egzotik (pembe) %3.21,
// Olağanüstü (kırmızı) %0.64. Bunlar, kasa oranlarındaki 79.92/15.98/3.20/0.64
// değerlerinin (5. dilim olan %0.26 "Rare Special" çıkarılıp toplamın tekrar
// %100'e normalize edilmesiyle) birebir aynı orantıdan türetilmiştir.
export const CHARM_RARITY_ODDS = [
  { chance: 80.13, name: 'High Grade', color: '#4b69ff' },
  { chance: 16.02, name: 'Remarkable', color: '#8847ff' },
  { chance: 3.21, name: 'Exotic', color: '#d32ce6' },
  { chance: 0.64, name: 'Extraordinary', color: '#eb4b4b' }
];

export const CHARM_CAPSULE_PRICE = 1.20; // 3 yıldız ≈ $1.20
export const CHARM_STAR_COST = 3;

// Charm'ların float/wear'ı yok. DİKKAT: Weapon skin nadirlik fiyatlarını (Mil-Spec
// $1.5, Restricted $5, Classified $20, Covert $60) charm'lara uygulamak EV'yi ~$3'e,
// yani %250+ bir ROI'ye şişiriyordu — gerçekte charm'lar skinlerden çok daha ucuz
// (Steam market: High Grade ~$0.07-0.85, Remarkable ~$0.46-1.36). Bu yüzden charm'lara
// ÖZEL, CSROI.com'un yayınladığı gerçek kapsül ROI'leriyle kalibre edilmiş bir taban
// fiyat tablosu kullanıyoruz (Missing Link Charms %70.28, Missing Link Community
// %91.92, Dr. Boom Charms %72.84 ROI — bu tabloyla üretilen EV bu aralığa düşüyor).
const CHARM_TIER_BASE_PRICE = {
  'High Grade': 0.45,
  'Remarkable': 1.50,
  'Exotic': 6.00,
  'Extraordinary': 18.00
};

export const getCharmPrice = (priceMap, charm) => {
  if (priceMap && charm?.market_hash_name) {
    const live = priceMap[charm.market_hash_name];
    if (typeof live === 'number' && live > 0) return parseFloat(live.toFixed(2));
  }
  const base = CHARM_TIER_BASE_PRICE[charm?.rarity?.name] ?? CHARM_TIER_BASE_PRICE['High Grade'];
  const randomVariance = 0.85 + (Math.random() * 0.30); // generateMockPrice ile aynı varyans mantığı
  return parseFloat((base * randomVariance).toFixed(2));
};

// ============================================================
// STICKER KAPSÜLÜ
// ============================================================
// Sticker kapsülleri charm kapsülleriyle AYNI 4 kademeli yapıyı kullanır
// (High Grade / Remarkable / Exotic / Extraordinary) → CHARM_RARITY_ODDS
// yeniden kullanılır. Fiyatlar ise çok daha DÜŞÜKTÜR: gerçek piyasada sıradan
// bir sticker $0.03-$0.30 bandındayken, turnuva/altın sticker'lar yükselir.
// Charm fiyat tablosunu kullanmak sticker EV'sini kat kat şişirirdi.
const STICKER_TIER_BASE_PRICE = {
  'High Grade': 0.12,
  'Remarkable': 0.35,
  'Exotic': 1.20,
  'Extraordinary': 4.50
};

export const STICKER_CAPSULE_PRICE = 0.80; // 2 yıldız ≈ $0.80 (gerçek mağaza fiyatı ~$1.00)
export const STICKER_STAR_COST = 2;

export const getStickerPrice = (priceMap, sticker) => {
  if (priceMap && sticker?.market_hash_name) {
    const live = priceMap[sticker.market_hash_name];
    if (typeof live === 'number' && live > 0) return parseFloat(live.toFixed(2));
  }
  const base = STICKER_TIER_BASE_PRICE[sticker?.rarity?.name] ?? STICKER_TIER_BASE_PRICE['High Grade'];
  const randomVariance = 0.85 + (Math.random() * 0.30);
  return parseFloat((base * randomVariance).toFixed(2));
};

// Sticker kapsülü için EV/ROI — charm ile aynı oran tablosu, farklı fiyat tablosu.
export const calculateStickerStats = (capsule, priceMap = null) => {
  let expectedReturn = 0;
  let maxPossibleValue = 0;

  CHARM_RARITY_ODDS.forEach(({ name, chance }) => {
    const itemsInRarity = (capsule.contains || []).filter(i => i.rarity?.name === name);
    if (itemsInRarity.length > 0) {
      const avgPrice = itemsInRarity.reduce((sum, it) => sum + getStickerPrice(priceMap, it), 0) / itemsInRarity.length;
      expectedReturn += avgPrice * (chance / 100);
      itemsInRarity.forEach(it => {
        const p = getStickerPrice(priceMap, it);
        if (p > maxPossibleValue) maxPossibleValue = p;
      });
    }
  });

  const roi = STICKER_CAPSULE_PRICE > 0 ? (expectedReturn / STICKER_CAPSULE_PRICE) * 100 : 0;
  return {
    roi: parseFloat(roi.toFixed(2)),
    expectedReturn: parseFloat(expectedReturn.toFixed(2)),
    maxProfit: parseFloat(maxPossibleValue.toFixed(2))
  };
};

// CS ROI tarzı: bir charm kapsülü için beklenen değer (EV) ve %ROI
export const calculateCharmStats = (charmCollection, priceMap = null) => {
  let expectedReturn = 0;
  let maxPossibleValue = 0;

  CHARM_RARITY_ODDS.forEach(({ name, chance }) => {
    const itemsInRarity = (charmCollection.contains || []).filter(i => i.rarity?.name === name);
    if (itemsInRarity.length > 0) {
      const avgPrice = itemsInRarity.reduce((sum, it) => sum + getCharmPrice(priceMap, it), 0) / itemsInRarity.length;
      expectedReturn += avgPrice * (chance / 100);

      itemsInRarity.forEach(it => {
        const p = getCharmPrice(priceMap, it);
        if (p > maxPossibleValue) maxPossibleValue = p;
      });
    }
  });

  const roi = CHARM_CAPSULE_PRICE > 0 ? (expectedReturn / CHARM_CAPSULE_PRICE) * 100 : 0;

  return {
    roi: parseFloat(roi.toFixed(2)),
    expectedReturn: parseFloat(expectedReturn.toFixed(2)),
    maxProfit: parseFloat(maxPossibleValue.toFixed(2))
  };
};

// ============================================================
// KARARLI SIRALAMA DEĞERİ (İçerik önizlemesi "en değerliden en değersize")
// ============================================================
// SORUN: `generateMockPrice` içinde rastgele bir varyans (0.85-1.15) var. Bu,
// sıralama için kullanılırsa her render'da farklı sonuç verir ve liste zıplar.
// Bu yüzden sıralamaya özel, DETERMİNİSTİK bir "referans değer" üretiyoruz.
//
// Canlı fiyat varsa doğrudan o kullanılır (en doğrusu). Yoksa mock taban fiyat
// kullanılır — ancak mock'ta aynı kademedeki TÜM bıçaklar aynı tabana ($300)
// sahip olduğu için birbirlerinden ayrışmazlar. Bıçakları anlamlı biçimde
// sıralayabilmek için gerçek piyasa bilgisine dayanan bir ağırlık tablosu
// kullanıyoruz (bıçak tipi × kaplama).
const KNIFE_TYPE_SCORE = {
  'Karambit': 3.0, 'Butterfly Knife': 2.9, 'M9 Bayonet': 2.4, 'Skeleton Knife': 2.2,
  'Talon Knife': 2.2, 'Kukri Knife': 1.9, 'Stiletto Knife': 1.8, 'Bayonet': 1.8,
  'Bowie Knife': 1.5, 'Flip Knife': 1.5, 'Huntsman Knife': 1.4, 'Nomad Knife': 1.4,
  'Survival Knife': 1.3, 'Paracord Knife': 1.3, 'Ursus Knife': 1.3, 'Classic Knife': 1.3,
  'Gut Knife': 1.1, 'Falchion Knife': 1.1, 'Navaja Knife': 1.0, 'Shadow Daggers': 1.0
};
const KNIFE_FINISH_SCORE = {
  'Case Hardened': 2.2, 'Fade': 2.1, 'Doppler': 2.0, 'Gamma Doppler': 2.0,
  'Marble Fade': 1.9, 'Lore': 1.9, 'Autotronic': 1.7, 'Crimson Web': 1.7,
  'Tiger Tooth': 1.6, 'Slaughter': 1.5, 'Damascus Steel': 1.3, 'Ultraviolet': 1.2,
  'Rust Coat': 0.7, 'Safari Mesh': 0.7, 'Boreal Forest': 0.75, 'Forest DDPAT': 0.75,
  'Urban Masked': 0.8, 'Scorched': 0.8, 'Night': 0.85, 'Stained': 0.9,
  'Blue Steel': 0.95, 'Bright Water': 0.95, 'Freehand': 1.0
};

const knifeHeuristic = (name = '') => {
  const [rawType, rawFinish] = name.replace(/^★\s*/, '').replace(/\s*\(.*\)$/, '').split(' | ');
  const type = KNIFE_TYPE_SCORE[(rawType || '').trim()] ?? 1.2;
  const finish = KNIFE_FINISH_SCORE[(rawFinish || '').trim()] ?? 1.0;
  return type * finish;
};

// ============================================================
// EŞYAYA ÖZGÜ DETERMİNİSTİK ÇARPAN
// ============================================================
// SORUN: Simüle fiyatlamada bir kademedeki TÜM eşyalar aynı taban fiyata
// sahip (ör. her Mil-Spec = $1.50). Bunun iki görünür sonucu vardı:
//   1) "En değerliden en değersize" sıralama kademe içinde ANLAMSIZDI —
//      hepsi eşit olduğu için liste API sırasında kalıyordu.
//   2) Kart köşesindeki fiyat aralığı HER kasada birebir aynı çıkıyordu
//      ($1.50 – $1980.00), yani kullanıcıya hiçbir bilgi vermiyordu.
//
// ÇÖZÜM: Eşyanın ADINDAN türetilen, 0.55–1.90 arasında DETERMİNİSTİK bir
// çarpan. Deterministik olması kritik: `Math.random()` kullanılsaydı liste
// her render'da yeniden sıralanıp zıplardı (bu dosyada zaten bir kez
// yaşanmış bir hata — bkz. getStableSortValue'nun var oluş sebebi).
//
// ⚠️ Bu yalnızca CANLI FİYAT YOKKEN devreye girer; canlı fiyat varsa gerçek
// piyasa değeri kullanılır ve bu çarpan hiç hesaplanmaz.
const deterministicItemFactor = (name = '') => {
  let h = 2166136261;
  for (let i = 0; i < name.length; i++) {
    h ^= name.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  // 0..1 aralığına indir, sonra 0.55–1.90 bandına yay.
  const unit = ((h >>> 0) % 100000) / 100000;
  return 0.55 + unit * 1.35;
};

// Sıralama için kullanılacak deterministik değer.
export const getStableSortValue = (priceMap, item, rarityFallback) => {
  if (priceMap && item?.market_hash_name) {
    const live = priceMap[item.market_hash_name];
    if (typeof live === 'number' && live > 0) return live;
  }
  const isKnifeOrGlove = item?.category?.name === 'Knives' || item?.category?.name === 'Gloves' || /^★/.test(item?.name || '');
  const base = MOCK_BASE_BY_RARITY(rarityFallback ?? item?.rarity?.name);
  // Bıçak/eldivenlerde tip×kaplama tablosu zaten ayrıştırıcı bir değer
  // üretiyor; normal skinlerde ise isim tabanlı çarpan kullanılıyor.
  return isKnifeOrGlove
    ? base * knifeHeuristic(item?.name)
    : base * deterministicItemFactor(item?.name);
};

// generateMockPrice'ın varyanssız taban fiyat karşılığı (sıralama için).
const MOCK_BASE_BY_RARITY = (rarityName) => {
  const n = (rarityName || '').toLowerCase();
  if (n.includes('consumer')) return 0.1;
  if (n.includes('industrial')) return 0.3;
  if (n.includes('mil-spec') || n.includes('mavi') || n.includes('blue')) return 1.5;
  if (n.includes('restricted') || n.includes('mor') || n.includes('purple')) return 5.0;
  if (n.includes('classified') || n.includes('pembe') || n.includes('pink')) return 20.0;
  if (n.includes('covert') || n.includes('kırmızı') || n.includes('red')) return 60.0;
  if (n.includes('rare') || n.includes('altın') || n.includes('gold')) return 300.0;
  return 1.0;
};

// ============================================================
// KUTU (KONTEYNER) FİYATLARI — Kasa / Souvenir / Sticker / Terminal
// ============================================================
// ÖNEMLİ VERİ NOTU: ByMykel'in crates.json'ında kutuların KENDİ fiyatı YOKTUR
// (`crate.price` alanı hiçbir kayıtta bulunmuyor — doğrulandı). Ancak kutuların
// `market_hash_name`'i vardır (ör. "Sticker Capsule", "Chroma Case") ve bu
// isimler canlı fiyat tablosunda GEÇER. Yani kutu fiyatını da dinamik
// çekebiliyoruz; canlı veri yoksa türe göre gerçekçi bir tabana düşüyoruz.
const CONTAINER_FALLBACK_PRICE = {
  case: 0.50,
  souvenir: 2.50,
  sticker: 1.00,
  terminal: 2.00
};

export const getContainerPrice = (priceMap, crate, kind = 'case') => {
  if (priceMap && crate?.market_hash_name) {
    const live = priceMap[crate.market_hash_name];
    if (typeof live === 'number' && live > 0) return parseFloat(live.toFixed(2));
  }
  return CONTAINER_FALLBACK_PRICE[kind] ?? 0.50;
};

// Kart köşesinde gösterilen YEŞİL FİYAT ARALIĞI (ör. "$1.50 – $4.00").
// Anlamı: bu kutudan çıkabilecek EN UCUZ ödül -> EN DEĞERLİ ödül.
// Sıralama/eşik hesapları deterministik `getStableSortValue` ile yapılır ki
// aralık her render'da zıplamasın (generateMockPrice rastgele varyans içerir).
export const getContainerValueRange = (priceMap, crate, kind = 'case') => {
  const normal = crate?.contains || [];
  const rare = crate?.contains_rare || [];
  if (normal.length === 0 && rare.length === 0) return null;

  const priceOf = (item, isRare) => {
    if (kind === 'sticker') return getStickerPrice(priceMap, item);
    if (kind === 'charm') return getCharmPrice(priceMap, item);
    return getStableSortValue(priceMap, item, isRare ? 'Rare Special' : undefined);
  };

  let low = Infinity;
  let high = 0;
  normal.forEach(it => {
    const p = priceOf(it, false);
    if (p < low) low = p;
    if (p > high) high = p;
  });
  rare.forEach(it => {
    const p = priceOf(it, true);
    if (p > high) high = p;
  });

  if (!isFinite(low)) low = 0;
  return { low: parseFloat(low.toFixed(2)), high: parseFloat(high.toFixed(2)) };
};

// ============================================================
// SOUVENIR (HATIRA) PAKETLERİ
// ============================================================
// GERÇEK CS2 KURALI: Souvenir paketleri normal kasalarla AYNI kademe
// oranlarını kullanır, ancak içerdikleri kademe SAYISI pakete göre değişir
// (bazı harita koleksiyonlarında yalnızca 3 kademe var). Bu yüzden oranları
// sabit bir tabloya gömmek YANLIŞ olurdu — paketin İÇİNDE gerçekten bulunan
// kademeleri tespit edip standart merdiveni onlara uyguluyoruz.
//
// ⚠️ BİLİNÇLİ YAKLAŞIM: Kademe sayısı merdivenden azsa oranlar %100'e yeniden
// normalize edilir. Valve'in tam iç algoritması açıklanmadığı için bu, veriye
// dayalı en dürüst yaklaşımdır.
//
// Souvenir eşyalarında StatTrak YOKTUR; bunun yerine market adları
// "Souvenir " önekiyle listelenir (bkz. buildMarketHashName isSouvenir).
const RARITY_LADDER = ['Consumer Grade', 'Industrial Grade', 'Mil-Spec Grade', 'Restricted', 'Classified', 'Covert'];
const CASE_ODDS_LADDER = [79.92, 15.98, 3.20, 0.64, 0.26];

export const getSouvenirTiers = (pkg) => {
  const present = RARITY_LADDER.filter(r => (pkg?.contains || []).some(i => i.rarity?.name === r));
  if (present.length === 0) return [];

  // Merdivenden gelen ham oranlar; kademe sayısı farklıysa %100'e normalize et.
  const raw = present.map((_, i) => CASE_ODDS_LADDER[i] ?? CASE_ODDS_LADDER[CASE_ODDS_LADDER.length - 1]);
  const total = raw.reduce((a, b) => a + b, 0);

  return present.map((name, i) => {
    const sample = (pkg.contains || []).find(it => it.rarity?.name === name);
    return {
      name,
      chance: parseFloat(((raw[i] / total) * 100).toFixed(4)),
      color: sample?.rarity?.color || RARITY_HEX_BY_NAME[name] || '#b0c3d9'
    };
  });
};

const RARITY_HEX_BY_NAME = {
  'Consumer Grade': '#b0c3d9',
  'Industrial Grade': '#5e98d9',
  'Mil-Spec Grade': '#4b69ff',
  'Restricted': '#8847ff',
  'Classified': '#d32ce6',
  'Covert': '#eb4b4b'
};

export const calculateSouvenirStats = (pkg, priceMap = null) => {
  const tiers = getSouvenirTiers(pkg);
  let expectedReturn = 0;
  let maxPossibleValue = 0;

  tiers.forEach(({ name, chance }) => {
    const itemsInRarity = (pkg.contains || []).filter(i => i.rarity?.name === name);
    if (itemsInRarity.length === 0) return;
    // Souvenir'de StatTrak olmadığı için ağırlıklı ortalama YOK — düz fiyat.
    const avgPrice = itemsInRarity.reduce(
      (sum, it) => sum + getRealisticPrice(priceMap, it, 0.25, false, name, true), 0
    ) / itemsInRarity.length;
    expectedReturn += avgPrice * (chance / 100);

    itemsInRarity.forEach(it => {
      const maxP = getRealisticPrice(priceMap, it, it.min_float ?? 0.001, false, name, true);
      if (maxP > maxPossibleValue) maxPossibleValue = maxP;
    });
  });

  const cost = getContainerPrice(priceMap, pkg, 'souvenir');
  const roi = cost > 0 ? (expectedReturn / cost) * 100 : 0;
  return {
    roi: parseFloat(roi.toFixed(2)),
    expectedReturn: parseFloat(expectedReturn.toFixed(2)),
    maxProfit: parseFloat(maxPossibleValue.toFixed(2)),
    cost
  };
};

// ============================================================
// TERMİNALLER (Genesis / Dead Hand / ... )
// ============================================================
// VERİ ŞEMASI (doğrulandı): Terminaller normal bir KASA ile birebir aynı
// yapıdadır — `contains` içinde Mil-Spec/Restricted/Classified/Covert silahlar,
// `contains_rare` içinde eldivenler (Dead Hand'de 22 adet Extraordinary).
// Bu yüzden EV/ROI hesabı için kasa fonksiyonu yeniden kullanılır; tek fark,
// terminalin açılış maliyetinin anahtar gerektirmemesi.
export const calculateTerminalStats = (terminal, priceMap = null) => {
  const stats = calculateCaseStats(terminal, priceMap);
  const cost = getContainerPrice(priceMap, terminal, 'terminal');
  return {
    ...stats,
    // calculateCaseStats maliyeti "kutu + $2.50 anahtar" varsayar; terminalde
    // anahtar YOKTUR, bu yüzden ROI'yi terminalin kendi fiyatına göre düzeltiyoruz.
    roi: cost > 0 ? parseFloat(((stats.expectedReturn / cost) * 100).toFixed(2)) : 0,
    cost
  };
};
