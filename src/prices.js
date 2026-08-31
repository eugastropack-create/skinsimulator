import { getWearFromFloat, generateMockPrice, mockWearMultiplier, generateFloat, WEAR_TIERS } from './utils';

// ============================================================
// CANLI FİYAT KAYNAĞI
// ============================================================
// Kaynak: ByMykel/counter-strike-price-tracker — Steam Community Market'ten
// toplanan gerçek satış fiyatları.
//
// ⚠️ NEDEN BU KAYNAK (eski kaynak ÖLDÜ):
// Önceki adres `prices.csgotrader.app/latest/prices_v6.json` idi. O uç nokta
// artık JSON DÖNDÜRMÜYOR — 301 ile bir HTML sayfasına yönleniyor
// (doğrulandı: 28 Ağu 2026). Yani sorun sanıldığı gibi yalnızca CORS değildi,
// adresin kendisi taşınmıştı; hangi sunucuda yayınlanırsa yayınlansın çalışmazdı.
//
// Yeni kaynağın üç kritik avantajı var:
//   1. CORS AÇIK — `Access-Control-Allow-Origin: *` (doğrulandı). Tarayıcıdan
//      doğrudan çekilebiliyor; proxy/Worker GEREKMİYOR.
//   2. İSİMLER BİREBİR UYUYOR — oyun verisiyle (ByMykel/CSGO-API) aynı
//      geliştiriciden geldiği için anahtarlar tam olarak bizim aradığımız
//      `market_hash_name` biçiminde: "AK-47 | Redline (Field-Tested)",
//      "StatTrak™ ...", "Souvenir ...", "Chroma Case", "Sealed Genesis Terminal".
//      Eski kaynakta isim eşleştirme için ek dönüşüm gerekiyordu.
//   3. Boyut 1.6 MB (kasa verisinin ~beşte biri).
//
// ⚠️ TAZELİK SINIRI — DÜRÜST BEKLENTİ:
// Bu bir CANLI TİCKER DEĞİLDİR. Toplayıcı Steam'in hız sınırları yüzünden
// 34.500 eşyayı sayfa sayfa geziyor ve haftada bir tam tur atıyor
// (workflow 4 saatte bir tetikleniyor ama betik o hafta zaten güncellendiyse
// atlıyor). Pratikte veri birkaç günlük ile birkaç haftalık arasında olabilir.
// Gerçek piyasa fiyatlarıdır ama ANLIK değildir.
// ⚠️ BİRİNCİL KAYNAK: KENDİ BESLEMEMİZ (1 Eyl 2026'dan itibaren)
// `.github/workflows/update-prices.yml` 2 SAATTE BİR çalışıp Skinport +
// Steam verisini birleştiriyor, tek listelemelik gürültüyü onarıyor ve
// sonucu `prices-data` dalına yazıyor. Ayrıntı: `scripts/update-prices.mjs`.
//
// NEDEN GEREKLİYDİ: ham Steam beslemesinde skinlerin **%42'sinin** aşınma
// fiyat eğrisi kırıktı (aşınma kötüleşirken fiyat YÜKSELİYORDU) — çünkü
// Steam `sell_price` o anki EN UCUZ LİSTELEMEDİR ve ince bantlarda tek bir
// kişinin fiyatıdır. Kendi beslememizde bu oran **%12**. Ölçülen örnek:
// USP-S | Bleeding Edge (Well-Worn) $3.91 → $1.02.
const OWN_PRICE_URL =
  'https://raw.githubusercontent.com/eugastropack-create/skinsimulator/prices-data/latest.json';

// ⚠️ YEDEK: Kendi beslememiz henüz yayınlanmadıysa (workflow ilk kez
// çalışmadan önce) veya erişilemezse ham ByMykel kaynağına düşülür.
// Uygulama böylece HER durumda fiyatlı açılır.
const FALLBACK_PRICE_URL =
  'https://raw.githubusercontent.com/ByMykel/counter-strike-price-tracker/main/static/latest.json';

// ⚠️ BİRİM: Kaynak fiyatları CENT olarak verir (toplayıcı betikte doğrudan
// Steam'in `sell_price` alanını yazıyor; ör. 4210 = $42.10). Uygulamanın her
// yeri DOLAR beklediği için burada 100'e bölüyoruz. Bu bölmeyi kaldırmak tüm
// fiyatları 100 KAT şişirir.
const CENTS_TO_USD = 100;

// ⚠️ İKİ KAYNAK AYNI ŞEMAYI KULLANMAZ:
//   kendi beslememiz  → DOLAR  (onarım aşamasında zaten bölünüyor)
//   ByMykel yedeği    → CENT   (100'e bölmek ZORUNLU)
// Bu yüzden birim, dosyanın kendi metadata'sından okunuyor; sabit varsayım
// yapmak yedek devreye girdiğinde tüm fiyatları 100 kat şişirirdi.
const loadPriceTable = async (url, label) => {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${label} HTTP ${res.status}`);
  const raw = await res.json();
  return raw;
};

export const fetchLivePrices = async () => {
  let raw = null;
  let usedFallback = false;
  try {
    raw = await loadPriceTable(OWN_PRICE_URL, 'kendi besleme');
  } catch (e) {
    console.log('⚠️ Kendi fiyat beslemesi yok, ByMykel yedeğine düşülüyor:', e.message);
    usedFallback = true;
  }

  try {
    if (!raw) raw = await loadPriceTable(FALLBACK_PRICE_URL, 'ByMykel');

    // Dosya yapısı: { metadata: {...}, prices: { "<market_hash_name>": <cent> } }
    // Yapı ileride düzleşirse diye her iki biçimi de kabul ediyoruz.
    const table = raw?.prices && typeof raw.prices === 'object' ? raw.prices : raw;

    // Kendi beslememiz `currency: 'USD'` yazar ve değerler zaten DOLARDIR.
    // Ham ByMykel'de bu alan yoktur ve değerler CENT'tir.
    const divisor = usedFallback || raw?.metadata?.currency !== 'USD' ? CENTS_TO_USD : 1;

    const normalized = {};
    Object.keys(table).forEach(key => {
      const val = table[key];
      // Bazı anahtarlar iç isimlerdir (#CSGO_crate_...) — onları da alıyoruz,
      // zararsızlar: uygulama yalnızca market_hash_name ile sorgu yapıyor.
      if (typeof val === 'number' && val > 0) {
        normalized[key] = val / divisor;
      }
    });

    if (Object.keys(normalized).length === 0) throw new Error('Beklenmeyen veri formatı (0 eşya bulundu)');

    const updatedAt = raw?.metadata?.updated_at;
    const repaired = raw?.metadata?.repaired;
    console.log(
      `✅ Canlı fiyat verisi yüklendi: ${Object.keys(normalized).length} eşya` +
      (usedFallback ? ' [YEDEK: ham ByMykel]' : ' [kendi besleme, 2 saatlik]') +
      (updatedAt ? ` (güncelleme: ${new Date(updatedAt).toLocaleString()})` : '') +
      (repaired ? ` · ${repaired} fiyat onarıldı` : '')
    );
    return normalized;
  } catch (e) {
    // Kaynak erişilemezse uygulama KIRILMAZ; her yerde simüle fiyata düşer ve
    // logonun altında "🟡 Simüle fiyatlar" rozeti görünür.
    console.log('⚠️ Canlı fiyat verisi çekilemedi, simüle fiyatlandırmaya geçildi:', e.message);
    return null;
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
  const prefix = isSouvenir ? 'Souvenir ' : isStatTrak ? 'StatTrak\u2122 ' : '';
  return wear ? `${prefix}${item.name} (${wear})` : `${prefix}${item.name}`;
};

// ============================================================
// CANLI FİYAT ARAMA — birden fazla isim biçimini dener
// ============================================================
// ⚠️ BU FONKSİYONUN VAR OLMA SEBEBİ (sessiz bir hataydı):
// `buildMarketHashName` eskiden aşınma ekini `item.min_float` alanının VARLIĞINA
// bakarak koyuyordu. Ama kasa/koleksiyon İÇERİĞİNDEKİ eşyalarda bu alan YOKTUR
// — `crates.json` yalnızca `id, name, rarity, paint_index, image` taşır
// (doğrulandı). Sonuç: aşınma eki hiç eklenmiyor, "AK-47 | Redline" gibi ÇIPLAK
// bir isim üretiliyordu. Canlı fiyat tablosunda ise anahtarlar SADECE aşınma
// ekiyle bulunur ("AK-47 | Redline (Field-Tested)" ✓ / "AK-47 | Redline" ✗).
//
// Yani rozet "🟢 Canlı Fiyatlar" derken EV, ROI ve düşen eşya fiyatları
// SESSİZCE mock değerlerden geliyordu. Hata görünmüyordu çünkü mock her zaman
// makul bir sayı üretir.
//
// Çözüm: tahmin etmeyi bırakıp SIRAYLA denemek. İlk tutan kazanır:
//   1. `market_hash_name`     → kutular (kasa/kapsül/terminal) bu alanı taşır
//   2. önek + ad + (aşınma)   → normal silah skinleri
//   3. önek + ad              → aşınması OLMAYAN eşyalar (sticker, charm, agent)
// Hiçbiri tutmazsa `null` döner ve çağıran mock'a düşer.
const lookupLivePrice = (priceMap, item, wear, isStatTrak, isSouvenir) => {
  if (!priceMap || !item) return null;

  const tryKey = (k) => {
    if (!k) return null;
    const v = priceMap[k];
    return (typeof v === 'number' && v > 0) ? v : null;
  };

  return (
    tryKey(item.market_hash_name) ??
    tryKey(buildMarketHashName(item, wear, isStatTrak, isSouvenir)) ??
    tryKey(buildMarketHashName(item, null, isStatTrak, isSouvenir))
  );
};

// Bir eşyanın belirli bir aşınmada GERÇEK piyasa fiyatı var mı?
// ⚠️ Arayüzde "gerçek fiyat" ile "simüle fiyat" ayırt edilebilsin diye var.
// Simüle bir sayıyı piyasa fiyatıymış gibi göstermek yanıltıcıdır: örneğin
// AWP | Dragon Lore ham ByMykel tablosunda HİÇ YOK; simülasyon $103 üretiyor,
// gerçek değeri ~$17.800 (ölçüldü, 1 Eyl 2026).
export const hasLivePrice = (priceMap, item, wear, isStatTrak = false, isSouvenir = false) =>
  lookupLivePrice(priceMap, item, wear, isStatTrak, isSouvenir) != null;

// Ana fiyat çözümleyici: önce canlı fiyata bakar, bulamazsa simülasyona düşer
// Simüle fiyatın VARYANSSIZ karşılığı.
// ⚠️ NEDEN GEREKLİ: `generateMockPrice` içinde `0.85 + Math.random() * 0.30`
// var. Canlı fiyatı olmayan bir eşya için bu fonksiyon her çağrıldığında
// FARKLI bir sayı döner. Trade-Up panelinde çıktı listesi fiyata göre
// sıralandığı için, kullanıcı float çubuğunu her oynattığında (analiz yeniden
// hesaplanır) aynı eşyalar listede yer değiştiriyordu — kullanıcının
// "bir üste, bir alta gittiğini gördüm" dediği davranış (31 Ağu 2026).
// Burada rastgele varyans yerine eşyanın ADINDAN türetilen deterministik
// çarpan kullanılıyor: liste artık kararlı, aşınma değişince fiyat hâlâ
// mantıklı biçimde değişiyor.
const stableMockPrice = (rarityName, floatVal, isStatTrak, itemName) => {
  let p = MOCK_BASE_BY_RARITY(rarityName) * mockWearMultiplier(floatVal) * deterministicItemFactor(itemName || '');
  if (isStatTrak) p *= 1.8;
  return parseFloat(p.toFixed(2));
};

// `opts.stable: true` -> canlı fiyat bulunamazsa RASTGELE varyans kullanılmaz.
// Sıralanan/karşılaştırılan her listede (Trade-Up çıktıları, EV) zorunludur.
export const getRealisticPrice = (priceMap, item, floatVal, isStatTrak, rarityNameFallback, isSouvenir = false, { stable = false } = {}) => {
  const wear = getWearFromFloat(floatVal);
  if (priceMap) {
    let live = lookupLivePrice(priceMap, item, wear, isStatTrak, isSouvenir);

    // Souvenir/StatTrak varyantı piyasada listelenmemiş olabilir (ender eşyalar);
    // o durumda normal varyanta düş — hiç fiyatsız kalmaktan iyidir.
    if (live == null && (isSouvenir || isStatTrak)) {
      live = lookupLivePrice(priceMap, item, wear, false, false);
    }
    if (live != null) return parseFloat(live.toFixed(2));
  }
  const mock = stable
    ? stableMockPrice(rarityNameFallback ?? item?.rarity?.name, floatVal, isStatTrak, item?.name)
    : generateMockPrice(rarityNameFallback ?? item?.rarity?.name, floatVal, isStatTrak);
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

// StatTrak™ çıkma ihtimali (gerçek CS2 oranı) — EV hesabı ile çekiliş kodu
// AYNI sabiti kullanmalı, yoksa gösterge ile gerçeklik ayrışır.
export const STATTRAK_CHANCE = 0.10;

// ============================================================
// BİR EŞYANIN BEKLENEN FİYATI — AŞINMA DAĞILIMINA GÖRE AĞIRLIKLI
// ============================================================
// ⚠️ ESKİ SÜRÜM SABİT float 0.25 (Field-Tested) kullanıyordu. Bu, EV'yi
// sistematik olarak YANLIŞ hesaplıyordu:
//   • Bir skinin float aralığı 0.00-0.08 ise (ör. bazı Covert'lar) 0.25 o
//     eşyada HİÇ oluşamaz; yine de fiyat FT üzerinden aranıyordu.
//   • Factory New primi (bazı skinlerde 5-7 kat) hesaba HİÇ girmiyordu.
//
// Artık `generateFloat` ile BİREBİR aynı model kullanılıyor: ağırlıklı aşınma
// bantları (FN 3 / MW 24 / FT 33 / WW 24 / BS 16) eşyanın KENDİ min/max float
// aralığına ölçekleniyor. Böylece kartta yazan EV ile 200.000 çekilişlik
// simülasyonun ürettiği gerçek EV örtüşüyor.
//
// `rarityOverride`: bıçak/eldivenler veride rarity.name === 'Covert' taşır ama
// piyasada Covert silahlardan kat kat pahalıdır — onlar için 'Rare Special'
// geçilerek doğru fiyat kademesi kullanılır.
// `opts.isSouvenir` -> market adina "Souvenir " oneki ekler (fiyat AYRIDIR).
// `opts.statTrak`   -> StatTrak cikma ihtimali; 0 verilirse hic hesaplanmaz.
//    Bu ikisi AYRI bayraktir: Armory koleksiyon cekilisinde StatTrak YOKTUR
//    ama esya souvenir de DEGILDIR. Tek bir bayrakla ikisini birden anlatmak
//    (eskiden oyleydi) yanlis market adi uretiyordu.
const getExpectedPriceForItem = (item, priceMap, rarityOverride, opts = {}) => {
  const { isSouvenir = false, statTrak = STATTRAK_CHANCE } = opts;
  const r = rarityOverride ?? item?.rarity?.name;
  const lo = item?.min_float ?? 0;
  const hi = item?.max_float ?? 1;
  const stChance = isSouvenir ? 0 : statTrak;

  let weighted = 0;
  let totalWeight = 0;
  for (const tier of WEAR_TIERS) {
    // Bandın ORTA noktasını eşyanın kendi aralığına ölçekle (generateFloat ile
    // aynı dönüşüm: taban float [0,1] -> [min_float, max_float]).
    const mid = lo + ((tier.lo + tier.hi) / 2) * (hi - lo);
    const base = getRealisticPrice(priceMap, item, mid, false, r, isSouvenir);
    const st = stChance > 0 ? getRealisticPrice(priceMap, item, mid, true, r, isSouvenir) : base;
    weighted += tier.weight * (base * (1 - stChance) + st * stChance);
    totalWeight += tier.weight;
  }
  return totalWeight > 0 ? weighted / totalWeight : 0;
};

// Anahtar fiyatı Valve tarafından sabitlenmiştir ($2.50) — piyasada değişmez.
export const KEY_PRICE_USD = 2.50;

// ============================================================
// KADEME MERDİVENİ — TÜM ÇEKİLİŞLERİN TEK OLASILIK KAYNAĞI
// ============================================================
// ⚠️ 29 AĞU 2026 — KRİTİK BUG DÜZELTMESİ ("Armory'de sürekli kâr ediyorum")
//
// KÖK NEDEN: Çekiliş kodları SABİT bir kademe tablosu kullanıp, seçilen
// kademede hiç eşya bulamazlarsa "havuzun TAMAMINDAN rastgele seç" yedeğine
// düşüyordu:
//
//     let pool = contains.filter(i => i.rarity.name === selected.name);
//     if (pool.length === 0) pool = contains;   // <-- BUG
//
// Armory koleksiyonlarında Consumer Grade eşya YOKTUR (doğrulandı: Overpass
// 2024 / Spy Tech / Arabesque -> Industrial 6, Mil-Spec 4, Restricted 3,
// Classified 2, Covert 1-2). Tablonun ilk satırı ise %79.92 ile Consumer'dı.
// Yani çekilişlerin %79.92'si hiç eşya bulamayıp TÜM KOLEKSİYONDAN DÜZGÜN
// DAĞILIMLI seçim yapıyordu — 17 eşyalık bir koleksiyonda Covert çıkma şansı
// %0.06 yerine ~%4.7'ye fırlıyordu.
//
// ÖLÇÜM (200.000 çekiliş, canlı fiyatlarla):
//     Overpass 2024 -> gerçek EV $22.83 / maliyet $1.60  = %1427 ROI
//     Spy Tech      -> gerçek EV $20.95                  = %1309 ROI
//     Arabesque     -> gerçek EV $15.83                  =  %989 ROI
// Kartta ise %11-15 yazıyordu (EV hesabı da aynı kademelerde eşya bulamayıp
// olasılık kütlesini sessizce ÇÖPE ATIYORDU) — yani hem çekiliş hem gösterge
// yanlıştı, üstelik birbirinin TERS yönünde yanlıştı.
//
// ÇÖZÜM: Olasılık tablosu artık SABİT DEĞİL; kutunun İÇİNDE GERÇEKTEN BULUNAN
// kademelerden türetiliyor. Boş kademe hiç ÇEKİLEMEZ, dolayısıyla "tüm havuza
// düş" yedeğine ihtiyaç da kalmıyor.
//
// MERDİVEN: CS2'de her kademe bir öncekinin 1/5'i kadar olasıdır. Valve'in
// yayımladığı kasa oranları (79.92 / 15.98 / 3.20 / 0.64) bu geometrik dizinin
// ta kendisidir — dolayısıyla kademe sayısı kaç olursa olsun aynı formülden
// üretilebilir ve %100'e normalize edilir.
const TIER_STEP = 5;

export const buildLadderOdds = (tierCount) => {
  if (tierCount <= 0) return [];
  const raw = Array.from({ length: tierCount }, (_, i) => Math.pow(1 / TIER_STEP, i));
  const total = raw.reduce((a, b) => a + b, 0);
  return raw.map(w => (w / total) * 100);
};

// Nadirlik merdiveni — EN SIK'tan EN NADİR'e.
export const RARITY_LADDER = ['Consumer Grade', 'Industrial Grade', 'Mil-Spec Grade', 'Restricted', 'Classified', 'Covert'];

const RARITY_HEX_BY_NAME = {
  'Consumer Grade': '#b0c3d9',
  'Industrial Grade': '#5e98d9',
  'Mil-Spec Grade': '#4b69ff',
  'Restricted': '#8847ff',
  'Classified': '#d32ce6',
  'Covert': '#eb4b4b'
};

// Bir eşya listesinde GERÇEKTEN bulunan kademeleri tespit edip merdiveni
// onlara uygular. Kasa / koleksiyon / souvenir — hepsi bunu kullanır.
export const getPresentTiers = (items = [], ladder = RARITY_LADDER) => {
  const present = ladder.filter(r => items.some(i => i.rarity?.name === r));
  if (present.length === 0) return [];
  const odds = buildLadderOdds(present.length);
  return present.map((name, i) => {
    const sample = items.find(it => it.rarity?.name === name);
    return {
      name,
      chance: parseFloat(odds[i].toFixed(4)),
      color: sample?.rarity?.color || RARITY_HEX_BY_NAME[name] || '#b0c3d9'
    };
  });
};

// Armory silah koleksiyonu çekilişi (4 yıldız = $1.60).
export const getCollectionTiers = (collection) => getPresentTiers(collection?.contains || []);

// ============================================================
// KAPSÜL MERDİVENİ (sticker + charm) — 4 kademe
// ============================================================
// Sticker ve charm kapsülleri silah nadirliklerini DEĞİL, kendi 4 kademesini
// kullanır. buildLadderOdds(4) tam olarak Valve'in yayımladığı kapsül
// oranlarını üretir: 80.13 / 16.03 / 3.21 / 0.64.
//
// ⚠️ Burada da aynı bug vardı: bir kapsülde 4 kademenin hepsi bulunmayabilir
// (ör. yalnızca 3 kademeli eski kapsüller). Sabit tablo kullanıldığında eksik
// kademenin olasılık kütlesi "tüm havuzdan rastgele seç" yedeğine düşüyordu.
export const CAPSULE_LADDER = ['High Grade', 'Remarkable', 'Exotic', 'Extraordinary'];
export const getCapsuleTiers = (capsule) => getPresentTiers(capsule?.contains || [], CAPSULE_LADDER);

// ============================================================
// KASA / TERMİNAL KADEMELERİ — Rare Special (bıçak) dilimi DAHİL
// ============================================================
// Kasalarda beşinci bir dilim vardır: `contains_rare` (bıçak/eldiven, %0.26).
// Bu dilim merdivenin bir parçası DEĞİLDİR (Valve onu ayrı yayımlar), bu yüzden
// önce normal kademeler merdivenden türetilip toplam %(100 - 0.26)'ya
// ölçeklenir, sonra altın dilim eklenir.
//
// ⚠️ `contains_rare` BOŞSA (ör. Genesis Terminal) altın dilim HİÇ eklenmez ve
// oranlar %100'e yeniden dağıtılır. Eskiden bu %0.26'lık kütle "tüm havuzdan
// rastgele seç" yedeğine düşüyordu; yani bıçağı olmayan bir kutuda bile %0.26
// ihtimalle DÜZGÜN DAĞILIMLI (Covert dahil) bir eşya veriyordu.
const RARE_SPECIAL_CHANCE = 0.26;

export const getCaseTiers = (crate) => {
  const normal = getPresentTiers(crate?.contains || []);
  const hasRare = (crate?.contains_rare || []).length > 0;
  if (normal.length === 0) return [];
  if (!hasRare) return normal;

  const scale = (100 - RARE_SPECIAL_CHANCE) / 100;
  const scaled = normal.map(tr => ({ ...tr, chance: parseFloat((tr.chance * scale).toFixed(4)) }));
  return [...scaled, { name: 'Rare Special', chance: RARE_SPECIAL_CHANCE, color: '#ffd700', isRare: true }];
};

// Seçilen kademenin eşya havuzu. ⚠️ ARTIK "tüm havuza düş" YEDEĞİ YOK —
// kademeler zaten içerikten türetildiği için boş havuz imkânsızdır. Yine de
// bozuk veriye karşı null döner; çağıran tarafı bunu kontrol eder.
export const poolForTier = (crate, tier) => {
  if (tier?.isRare || tier?.name === 'Rare Special') {
    const rare = crate?.contains_rare || [];
    return rare.length > 0 ? rare : null;
  }
  const matched = (crate?.contains || []).filter(i => i.rarity?.name === tier?.name);
  return matched.length > 0 ? matched : null;
};

// Kümülatif zar atışı — TÜM ekranlar bunu kullanır (tek kaynak).
export const rollTier = (tiers) => {
  if (!tiers || tiers.length === 0) return null;
  const roll = Math.random() * 100;
  let cumulative = 0;
  for (let i = 0; i < tiers.length; i++) {
    cumulative += tiers[i].chance;
    if (roll <= cumulative) return tiers[i];
  }
  // Kayan nokta artığı: son kademeye düş (kütle kaybı YOK).
  return tiers[tiers.length - 1];
};

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
//
// ⚠️ KADEMELER ARTIK DİNAMİK (bkz. getCaseTiers). Eskiden sabit bir renk->oran
// tablosu vardı ve kutuda o kademeden eşya yoksa olasılık kütlesi hesaba HİÇ
// katılmıyordu; EV sistematik olarak DÜŞÜK çıkıyordu. Artık oranlar kutunun
// gerçek içeriğinden türetiliyor ve toplamları DAİMA %100.
export const calculateCaseStats = (crate, priceMap = null) => {
  const tiers = getCaseTiers(crate);

  let expectedReturn = 0;
  let maxPossibleValue = 0;

  tiers.forEach(tier => {
    const itemsInRarity = poolForTier(crate, tier);
    if (!itemsInRarity || itemsInRarity.length === 0) return;
    // BUG DÜZELTMESİ (korunuyor): Bıçak/eldivenler `contains` içinde DEĞİL,
    // ayrı `contains_rare` alanındadır ve renkleri '#ffd700' değil '#eb4b4b'tir.
    // Fiyatlandırmada 'Rare Special' kademesi geçilmezse bıçaklar sıradan bir
    // Covert silah gibi fiyatlanır ve EV ciddi biçimde düşük çıkar.
    const priceRarity = tier.isRare ? 'Rare Special' : undefined;
    const avgPrice = itemsInRarity.reduce(
      (sum, it) => sum + getExpectedPriceForItem(it, priceMap, priceRarity), 0
    ) / itemsInRarity.length;
    expectedReturn += avgPrice * (tier.chance / 100);

    itemsInRarity.forEach(it => {
      const maxP = getRealisticPrice(priceMap, it, it.min_float ?? 0.001, true, priceRarity ?? it.rarity?.name);
      if (maxP > maxPossibleValue) maxPossibleValue = maxP;
    });
  });

  // KASA FİYATI DİNAMİK: crates.json'da fiyat alanı YOK, ama kasanın
  // `market_hash_name`'i canlı fiyat tablosunda geçiyor. Bulunamazsa fiyat
  // içerikten TAHMİN edilir (bkz. resolveContainerCost).
  // ⚠️ Anahtar bedeli tahmine DAHİL DEĞİL: anahtarı Valve satar, fiyatı sabittir.
  const { cost: casePrice, priceEstimated } = resolveContainerCost(
    priceMap, crate, 'case', Math.max(0, expectedReturn - KEY_PRICE_USD * CONTAINER_TARGET_ROI)
  );
  const cost = casePrice + KEY_PRICE_USD;
  const roi = cost > 0 ? (expectedReturn / cost) * 100 : 0;

  return {
    roi: parseFloat(roi.toFixed(2)),
    expectedReturn: parseFloat(expectedReturn.toFixed(2)),
    maxProfit: parseFloat(maxPossibleValue.toFixed(2)),
    casePrice,
    priceEstimated,
    cost
  };
};


// Aynı mantık Armory (Cephanelik) koleksiyonları için — csroi.com/armory tarzı
//
// ⚠️ ORANLAR ARTIK `getCollectionTiers` İLE ÜRETİLİYOR — çekiliş kodunun
// (ArmoryOpening.rollOneArmoryResult) kullandığı TAM OLARAK AYNI tablo.
// Eskiden burada sabit bir isim->oran haritası vardı; koleksiyonda Consumer
// Grade eşya olmadığı için %79.92'lik dilim hesaba hiç girmiyor ve EV
// gerçeğinden ~10 kat düşük görünüyordu.
export const ARMORY_COLLECTION_STAR_COST = 4;
export const ARMORY_COLLECTION_USD = 1.60; // 4 yıldız (Armory Pass: 40 yıldız = $16.00)

// Armory Pass: 40 yıldız = $16.00 -> yıldız başına $0.40
export const STAR_VALUE_USD = 0.40;

// GERÇEK CS2 KURALI: "Limited Edition Item" 25 yıldıza basılır.
export const SPECIAL_ITEM_STAR_COST = 25;

// ============================================================
// ARMORY MALİYETİ — kartlarda ve açılış ekranında AYNI sayı
// ============================================================
// ⚠️ Armory koleksiyonları PİYASADA satılan bir kutu DEĞİLDİR; yıldızla
// alınırlar. `getContainerPrice` onlar için isim bulamayıp $0.50'lik genel
// yedeğe düşüyor ve kartın köşesinde gerçek maliyetle alakasız bir fiyat
// gösteriyordu. Bu fonksiyon doğru maliyeti tek yerden verir.
export const getArmoryCost = (subject) => {
  if (subject?.isSpecialItem) return { stars: SPECIAL_ITEM_STAR_COST, usd: SPECIAL_ITEM_STAR_COST * STAR_VALUE_USD };
  if (subject?.isCharmCollection) return { stars: CHARM_STAR_COST, usd: CHARM_CAPSULE_PRICE };
  return { stars: ARMORY_COLLECTION_STAR_COST, usd: ARMORY_COLLECTION_USD };
};

export const calculateArmoryStats = (collection, priceMap = null) => {
  const tiers = getCollectionTiers(collection);

  let expectedReturn = 0;
  let maxPossibleValue = 0;

  tiers.forEach(({ name, chance }) => {
    const itemsInRarity = (collection.contains || []).filter(i => i.rarity?.name === name);
    if (itemsInRarity.length === 0) return;
    // Armory koleksiyon çekilişinde StatTrak YOKTUR (bkz. ArmoryOpening) —
    // bu yüzden `isSouvenir` bayrağı gibi StatTrak'ı kapatan yol kullanılmıyor;
    // aşağıdaki çağrı StatTrak'ı hesaba katmayan düz beklenen fiyatı verir.
    const avgPrice = itemsInRarity.reduce(
      (sum, it) => sum + getExpectedPriceForItem(it, priceMap, name, { statTrak: 0 }), 0
    ) / itemsInRarity.length;
    expectedReturn += avgPrice * (chance / 100);

    itemsInRarity.forEach(it => {
      const maxP = getRealisticPrice(priceMap, it, it.min_float ?? 0.001, false, name);
      if (maxP > maxPossibleValue) maxPossibleValue = maxP;
    });
  });

  const cost = ARMORY_COLLECTION_USD;
  const roi = cost > 0 ? (expectedReturn / cost) * 100 : 0;

  return {
    roi: parseFloat(roi.toFixed(2)),
    expectedReturn: parseFloat(expectedReturn.toFixed(2)),
    maxProfit: parseFloat(maxPossibleValue.toFixed(2)),
    cost
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

export const getCharmPrice = (priceMap, charm, { stable = false } = {}) => {
  if (priceMap && charm?.market_hash_name) {
    const live = priceMap[charm.market_hash_name];
    if (typeof live === 'number' && live > 0) return parseFloat(live.toFixed(2));
  }
  const base = CHARM_TIER_BASE_PRICE[charm?.rarity?.name] ?? CHARM_TIER_BASE_PRICE['High Grade'];
  if (stable) return parseFloat((base * deterministicItemFactor(charm?.name)).toFixed(2));
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

// `stable: true` -> rastgele varyansı KAPATIR. EV/ROI hesaplarında zorunlu:
// varyanslı bir değer kullanılırsa kart her render'da farklı bir ROI gösterir
// (bkz. getStableSortValue'nun var oluş sebebi).
export const getStickerPrice = (priceMap, sticker, { stable = false } = {}) => {
  if (priceMap) {
    // ⚠️ BUG DÜZELTMESİ (29 Ağu 2026) — STICKER FIYATLARI HİÇ BULUNMUYORDU.
    // Kasa içeriğindeki sticker nesnelerinde `market_hash_name` alanı YOKTUR
    // (doğrulandı: yalnızca id / name / rarity / image var). Sadece o alana
    // bakıldığı için 1188 sticker'ın TAMAMI sessızce mock fiyata düşüyor,
    // Katowice 2014 gibi yüzlerce dolarlık çıkartmalar $0.12 sayılıyordu.
    //
    // Piyasa anahtarı "Sticker | <ad>" biçimindedir
    // (ör. "Sticker | compLexity Gaming | Katowice 2014"). Sırayla deniyoruz;
    // eşleşme oranı 0/1188 → 856/1188 (%72) oldu. Kalanı (çoğunlukla artık
    // listelenmeyen eski çıkartmalar) mock fiyata düşer.
    const keys = [sticker?.market_hash_name, sticker?.name && `Sticker | ${sticker.name}`, sticker?.name];
    for (const k of keys) {
      if (!k) continue;
      const live = priceMap[k];
      if (typeof live === 'number' && live > 0) return parseFloat(live.toFixed(2));
    }
  }
  const base = STICKER_TIER_BASE_PRICE[sticker?.rarity?.name] ?? STICKER_TIER_BASE_PRICE['High Grade'];
  if (stable) return parseFloat((base * deterministicItemFactor(sticker?.name)).toFixed(2));
  const randomVariance = 0.85 + (Math.random() * 0.30);
  return parseFloat((base * randomVariance).toFixed(2));
};

// ============================================================
// KAPSÜL EV/ROI (sticker + charm)
// ============================================================
// ⚠️ İKİ DÜZELTME:
//  1) Oranlar artık `getCapsuleTiers` ile İÇERİKTEN türetiliyor — eksik kademe
//     olasılık kütlesini artık çöpe atmıyor (EV sistematik olarak düşük çıkıyordu).
//  2) ROI artık SABİT $0.80 / $1.20 yerine kutunun GERÇEK piyasa fiyatına
//     bölünüyor. Açılış ekranı zaten `getContainerPrice` ile ücret alıyordu;
//     kart başka bir maliyete göre ROI gösteriyordu — ikisi ayrışmıştı.
const capsuleStats = (capsule, priceMap, priceOf, fallbackCost, kind) => {
  const tiers = getCapsuleTiers(capsule);
  let expectedReturn = 0;
  let maxPossibleValue = 0;

  tiers.forEach(({ name, chance }) => {
    const itemsInRarity = (capsule.contains || []).filter(i => i.rarity?.name === name);
    if (itemsInRarity.length === 0) return;
    const avgPrice = itemsInRarity.reduce((sum, it) => sum + priceOf(priceMap, it, { stable: true }), 0) / itemsInRarity.length;
    expectedReturn += avgPrice * (chance / 100);
    itemsInRarity.forEach(it => {
      const pr = priceOf(priceMap, it, { stable: true });
      if (pr > maxPossibleValue) maxPossibleValue = pr;
    });
  });

  // Charm kapsüllerinde `kind` yoktur (piyasada satılmaz, yıldızla alınır) —
  // orada sabit yıldız maliyeti kullanılır.
  const resolved = kind
    ? resolveContainerCost(priceMap, capsule, kind, expectedReturn)
    : { cost: fallbackCost, priceEstimated: false };
  const cost = resolved.cost;
  const roi = cost > 0 ? (expectedReturn / cost) * 100 : 0;
  return {
    roi: parseFloat(roi.toFixed(2)),
    expectedReturn: parseFloat(expectedReturn.toFixed(2)),
    maxProfit: parseFloat(maxPossibleValue.toFixed(2)),
    priceEstimated: resolved.priceEstimated,
    cost
  };
};

export const calculateStickerStats = (capsule, priceMap = null) =>
  capsuleStats(capsule, priceMap, getStickerPrice, STICKER_CAPSULE_PRICE, 'sticker');

// Charm kapsülleri PİYASADA ayrı bir kutu olarak listelenmez (Armory'den
// yıldızla alınır), bu yüzden sabit yıldız maliyeti kullanılır.
export const calculateCharmStats = (charmCollection, priceMap = null) =>
  capsuleStats(charmCollection, priceMap, getCharmPrice, CHARM_CAPSULE_PRICE, null);

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
  // Sıralama/aralık için de CANLI fiyat kullanılır. Referans aşınma olarak
  // Field-Tested alınır: en yaygın band olduğu için hemen her eşyada listeleme
  // bulunur ve kademe içi sıralamaya tutarlı bir taban verir.
  // (Burada rastgelelik YOK — fonksiyonun deterministik olması şart.)
  const live = lookupLivePrice(priceMap, item, 'Field-Tested', false, false);
  if (live != null) return live;
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

// ============================================================
// KUTU MALİYETİ — canlı fiyat YOKSA İÇERİKTEN TAHMİN ET
// ============================================================
// ⚠️ 29 AĞU 2026 BUG DÜZELTMESİ ("ROI %104.745")
//
// Bazı kutuların piyasa fiyatı canlı tabloda BULUNMUYOR (ör. "EMS Katowice
// 2014 Legends" — Steam'de artık listelenmiyor). Bu durumda tür bazlı sabit
// bir yedeğe ($1.00) düşülüyordu. Ama o kapsülün İÇİ ~$1047 değerinde:
//
//     ROI = 1047 / 1.00 = %104.745
//
// Kullanıcı için bu, sınırsız para basan bir kutu demekti — üstelik gerçekte
// o kapsül binlerce dolar. Sabit yedek, değeri bilinmeyen kutularda YAPISAL
// olarak yanlıştı.
//
// ÇÖZÜM: Fiyat bulunamazsa kutunun maliyetini İÇERİĞİNDEN türetiyoruz.
// Piyasada kutular içeriklerinin beklenen değerinin BİR MİKTAR ÜSTÜNDE
// fiyatlanır (aksi hâlde herkes açıp kâr ederdi); ölçülen medyan ROI ~%83.
// Bu yüzden tahmini maliyet = EV / 0.85.
//
// ⚠️ Bu bir TAHMİNDİR ve öyle işaretlenir (`priceEstimated`). Uydurma bir
// sayıyı gerçek fiyat gibi göstermek yerine, hem tutarlı hem de kullanıcıyı
// yanıltmayan bir davranış: kutu hep hafif zararına açılır.
export const CONTAINER_TARGET_ROI = 0.85;

export const resolveContainerCost = (priceMap, crate, kind, expectedReturn) => {
  if (priceMap && crate?.market_hash_name) {
    const live = priceMap[crate.market_hash_name];
    if (typeof live === 'number' && live > 0) {
      return { cost: parseFloat(live.toFixed(2)), priceEstimated: false };
    }
  }
  const base = expectedReturn > 0
    ? expectedReturn / CONTAINER_TARGET_ROI
    : (CONTAINER_FALLBACK_PRICE[kind] ?? 0.50);
  return { cost: parseFloat(base.toFixed(2)), priceEstimated: true };
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
// kademeleri tespit edip merdiveni onlara uyguluyoruz (getPresentTiers).
//
// Souvenir eşyalarında StatTrak YOKTUR; bunun yerine market adları
// "Souvenir " önekiyle listelenir (bkz. buildMarketHashName isSouvenir).
export const getSouvenirTiers = (pkg) => getPresentTiers(pkg?.contains || []);

export const calculateSouvenirStats = (pkg, priceMap = null) => {
  const tiers = getSouvenirTiers(pkg);
  let expectedReturn = 0;
  let maxPossibleValue = 0;

  tiers.forEach(({ name, chance }) => {
    const itemsInRarity = (pkg.contains || []).filter(i => i.rarity?.name === name);
    if (itemsInRarity.length === 0) return;
    const avgPrice = itemsInRarity.reduce(
      (sum, it) => sum + getExpectedPriceForItem(it, priceMap, name, { isSouvenir: true }), 0
    ) / itemsInRarity.length;
    expectedReturn += avgPrice * (chance / 100);

    itemsInRarity.forEach(it => {
      const maxP = getRealisticPrice(priceMap, it, it.min_float ?? 0.001, false, name, true);
      if (maxP > maxPossibleValue) maxPossibleValue = maxP;
    });
  });

  const { cost, priceEstimated } = resolveContainerCost(priceMap, pkg, 'souvenir', expectedReturn);
  const roi = cost > 0 ? (expectedReturn / cost) * 100 : 0;
  return {
    roi: parseFloat(roi.toFixed(2)),
    expectedReturn: parseFloat(expectedReturn.toFixed(2)),
    maxProfit: parseFloat(maxPossibleValue.toFixed(2)),
    priceEstimated,
    cost
  };
};

// ============================================================
// TERMİNALLER (Genesis / Dead Hand / ... )
// ============================================================
// VERİ ŞEMASI (doğrulandı): Terminaller normal bir KASA ile birebir aynı
// yapıdadır — `contains` içinde Mil-Spec/Restricted/Classified/Covert silahlar,
// `contains_rare` içinde eldivenler (Dead Hand'de 22 adet).
//
// ⚠️ 29 AĞU 2026 — "ROI %1000 / %232" BUG DÜZELTMESİ
// ============================================================
// Eski hesap `ROI = beklenen ödül / mühürlü terminalin piyasa fiyatı` idi.
// Bu ORAN ANLAMSIZDI, çünkü bu simülatörde terminali çalıştırmak ÜCRETSİZDİR
// ve kullanıcı mühürlü kutuyu değil, SEÇTİĞİ TEKLİFİN KENDİ PİYASA FİYATINI
// öder. Yani hiç ödenmeyen bir maliyete bölünüyordu:
//     Sealed Genesis Terminal   -> EV $1.24 / kutu $0.12 = %1033
//     Sealed Dead Hand Terminal -> EV $2.18 / kutu $0.94 = %232
// Bu sayılar hesap hatası değil, YANLIŞ SORUNUN doğru cevabıydı.
//
// Terminal mekaniğinde "ROI" tanımsızdır: teklifi piyasa fiyatına alırsınız,
// dolayısıyla getiri/maliyet YAPISAL OLARAK %100'dür. Bu yüzden ROI tamamen
// KALDIRILDI (roi: null -> kartlar bu hücreyi göstermez) ve yerine terminal
// mekaniğinde GERÇEKTEN anlamı olan iki ölçü kondu:
//
//   • avgOffer   : tek bir teklifin beklenen değeri
//   • bestOffer  : bir oturumda göreceğiniz EN İYİ teklifin beklenen değeri
//                  (5 bağımsız teklifin maksimumu) — kullanıcının asıl merak
//                  ettiği sayı budur, çünkü oturumda yalnızca birini alır.
export const TERMINAL_OFFER_COUNT = 5;

// E[max] hesabı: kademe ortalamalarını ayrık bir dağılım kabul edip
//   E[max] = Σ v_i · ( P(≤i)^n − P(<i)^n )
// formülünü uyguluyoruz. Monte Carlo'ya göre avantajı DETERMİNİSTİK olması —
// kart her render'da aynı sayıyı gösterir (bkz. getStableSortValue'nun var
// oluş sebebi: rastgelelik içeren gösterge değeri listeyi zıplatır).
const expectedMaxOfN = (tiers, valueOf, n) => {
  const rows = tiers
    .map(tr => ({ chance: tr.chance / 100, value: valueOf(tr) }))
    .filter(r => r.chance > 0)
    .sort((a, b) => a.value - b.value);
  const total = rows.reduce((a, r) => a + r.chance, 0);
  if (total <= 0) return 0;

  let cumBelow = 0;
  let acc = 0;
  rows.forEach(r => {
    const cumAt = cumBelow + r.chance / total;
    acc += r.value * (Math.pow(cumAt, n) - Math.pow(cumBelow, n));
    cumBelow = cumAt;
  });
  return acc;
};

export const calculateTerminalStats = (terminal, priceMap = null) => {
  const tiers = getCaseTiers(terminal);

  const tierAvg = new Map();
  let avgOffer = 0;
  let maxPossibleValue = 0;

  tiers.forEach(tier => {
    const items = poolForTier(terminal, tier);
    if (!items || items.length === 0) { tierAvg.set(tier.name, 0); return; }
    const priceRarity = tier.isRare ? 'Rare Special' : undefined;
    const avg = items.reduce(
      (sum, it) => sum + getExpectedPriceForItem(it, priceMap, priceRarity), 0
    ) / items.length;
    tierAvg.set(tier.name, avg);
    avgOffer += avg * (tier.chance / 100);

    items.forEach(it => {
      const maxP = getRealisticPrice(priceMap, it, it.min_float ?? 0.001, true, priceRarity ?? it.rarity?.name);
      if (maxP > maxPossibleValue) maxPossibleValue = maxP;
    });
  });

  const bestOffer = expectedMaxOfN(tiers, tr => tierAvg.get(tr.name) ?? 0, TERMINAL_OFFER_COUNT);

  return {
    // ⚠️ ROI BİLEREK null — bkz. yukarıdaki açıklama. Kart bileşenleri
    // `roi == null` durumunda ROI hücresini hiç basmaz.
    roi: null,
    expectedReturn: parseFloat(avgOffer.toFixed(2)),
    avgOffer: parseFloat(avgOffer.toFixed(2)),
    bestOffer: parseFloat(bestOffer.toFixed(2)),
    maxProfit: parseFloat(maxPossibleValue.toFixed(2)),
    cost: getContainerPrice(priceMap, terminal, 'terminal')
  };
};
