// ============================================================
// FİYAT SAĞLAYICI ADAPTÖRLERİ (Adapter Pattern)
// ============================================================
// Her sağlayıcı AYNI sözleşmeyi uygular:
//
//   {
//     id:        'skinport',
//     label:     'Skinport',
//     free:      true,               // ücret/anahtar gerekiyor mu
//     available(): boolean,          // anahtar/koşul var mı
//     async fetchPrices(): Map<market_hash_name, { price, qty }>
//   }
//
// `price` DOLAR cinsindendir (cent DEĞİL). `qty` listeleme adedidir ve
// güven puanı için kullanılır; bilinmiyorsa `null` bırakılır.
//
// ⚠️ SAĞLAYICI DEĞİŞTİRMEK İÇİN TEK SATIR YETER — `update-prices.mjs`
// içindeki `PROVIDER_ORDER` dizisini düzenleyin. Kod başka hiçbir yerde
// sağlayıcı adı bilmez.
//
// ⚠️ API ANAHTARI KODA YAZILMAZ. Anahtarlar ortam değişkeninden okunur
// (GitHub Actions'ta repo Secret'ı olarak tanımlanır). Bu depo AÇIK bir
// GitHub deposudur; anahtarı kaynağa gömmek onu herkese yayınlamak demektir.

const UA = { 'User-Agent': 'skinsimulator-price-bot' };

async function getJson(url, init, label) {
  const res = await fetch(url, init);
  if (!res.ok) throw new Error(`${label} HTTP ${res.status}`);
  return res.json();
}

// ------------------------------------------------------------
// 1) SKINPORT — ÜCRETSİZ, ANAHTAR GEREKTİRMEZ  (VARSAYILAN)
// ------------------------------------------------------------
// ⚠️ DOĞRU ALAN `suggested_price`. `median_price` o eşyanın TÜM
// listelemelerinin medyanıdır ve stickerlı / nadir desenli ilanlar onu
// yukarı çeker (AK-47 | Redline FT: median $50.47, suggested $36.68).
//
// ⚠️ CORS BAŞLIĞI GÖNDERMEZ — tarayıcıdan çağrılamaz, yalnızca bu betikten
// (GitHub Actions, sunucu tarafı) erişilir.
export const skinportProvider = {
  id: 'skinport',
  label: 'Skinport',
  free: true,
  available: () => true,
  async fetchPrices() {
    const data = await getJson(
      'https://api.skinport.com/v1/items?app_id=730&currency=USD',
      { headers: UA },
      'Skinport'
    );
    const out = new Map();
    let newest = 0;
    for (const it of data) {
      if (!it?.market_hash_name) continue;
      const price = it.suggested_price ?? it.median_price;
      if (!(price > 0)) continue;
      out.set(it.market_hash_name, { price, qty: it.quantity ?? 0 });
      if (it.updated_at > newest) newest = it.updated_at;
    }
    out.updatedAt = newest ? new Date(newest * 1000).toISOString() : null;
    return out;
  }
};

// ------------------------------------------------------------
// 2) CS2.SH — ÜCRETLİ / DENEME ANAHTARI
// ------------------------------------------------------------
// ⚠️ ANAHTAR ORTAM DEĞİŞKENİNDEN: `CS2SH_API_KEY`. Tanımlı değilse sağlayıcı
// kendini "kullanılamaz" ilan eder ve boru hattı sessizce bir sonrakine
// geçer — ANAHTAR BİTTİĞİNDE SİTE ÇALIŞMAYA DEVAM EDER.
//
// ⚠️ KİMLİK DOĞRULAMA `Authorization: Bearer <key>` (ölçüldü). `x-api-key`
// başlığı 401 döndürüyor.
//
// Yanıt çok piyasalıdır: her eşyada `buff`, `youpin`, `csfloat` alt nesneleri
// ve her birinde `ask` / `bid` / hacim bulunur. Referans olarak `csfloat.ask`
// tercih ediliyor (Batı piyasası, dolar bazlı); yoksa buff'a düşülür.
export const cs2shProvider = {
  id: 'cs2sh',
  label: 'cs2.sh',
  free: false,
  available: () => !!process.env.CS2SH_API_KEY,
  async fetchPrices() {
    const key = process.env.CS2SH_API_KEY;
    if (!key) throw new Error('CS2SH_API_KEY tanımlı değil');
    const data = await getJson(
      'https://api.cs2.sh/v1/prices/latest',
      { headers: { ...UA, Authorization: `Bearer ${key}` } },
      'cs2.sh'
    );
    const out = new Map();
    for (const [name, rec] of Object.entries(data.items || {})) {
      // Piyasa önceliği: csfloat -> buff -> youpin.
      const ask =
        rec?.csfloat?.ask ?? rec?.buff?.ask ?? rec?.youpin?.ask ?? null;
      if (!(ask > 0)) continue;
      const qty =
        rec?.csfloat?.ask_volume ?? rec?.buff?.ask_volume ?? null;
      out.set(name, { price: ask, qty });
    }
    out.updatedAt = data.response_time ?? null;
    return out;
  }
};

// ------------------------------------------------------------
// 3) CSFLOAT — ⚠️ "ÜCRETSİZ PUBLIC API" DİYE BİR ŞEY YOK, ANAHTAR ŞART
// ------------------------------------------------------------
// ⚠️ ÖLÇÜLDÜ (2 Eyl 2026): `csfloat.com/api/v1/listings` kimliksiz istekte
// üç farklı User-Agent ile de **HTTP 403** döndürüyor:
//     {"code":1,"message":"You need to be logged in to search listings"}
// Yani CSFloat, Skinport gibi anahtarsız çağrılabilen bir kaynak DEĞİLDİR.
// "Ücretsiz yedek plan" olarak CSFloat'a güvenmeyin — anahtarsız çalışmaz.
//
// Anahtar CSFloat hesabınızdan alınır ve `CSFLOAT_API_KEY` ortam
// değişkenine konur (GitHub Actions'ta repo Secret'ı).
//
// ⚠️ GERÇEK ÜCRETSİZ YEDEK **SKINPORT**'TUR: anahtar istemez, 25.000+ kayıt
// verir ve şu an üretimde kullanılan kaynaktır.
//
// ⚠️ BU UÇ NOKTA TEK SEFERDE TÜM TABLOYU VERMEZ; sayfalı listeleme sunar ve
// hız sınırı vardır — Skinport'un yerini TAM tutmaz.
//
// ⚠️ `price` alanı CENT cinsindendir — sözleşme DOLAR istediği için 100'e bölünür.
export const csfloatProvider = {
  id: 'csfloat',
  label: 'CSFloat',
  free: false,
  available: () => !!process.env.CSFLOAT_API_KEY,
  async fetchPrices({ maxPages = 20, pageSize = 50 } = {}) {
    const key = process.env.CSFLOAT_API_KEY;
    if (!key) throw new Error('CSFLOAT_API_KEY tanımlı değil (listings API girişsiz 403 döndürür)');
    const out = new Map();
    let cursor = null;
    for (let page = 0; page < maxPages; page++) {
      const url = new URL('https://csfloat.com/api/v1/listings');
      url.searchParams.set('limit', String(pageSize));
      url.searchParams.set('sort_by', 'most_recent');
      if (cursor) url.searchParams.set('cursor', cursor);

      let data;
      try {
        data = await getJson(
          url.toString(),
          { headers: { ...UA, Authorization: process.env.CSFLOAT_API_KEY } },
          'CSFloat'
        );
      } catch (e) {
        // Hız sınırına takılırsa o ana kadar toplananla devam et.
        if (out.size > 0) break;
        throw e;
      }

      const rows = Array.isArray(data) ? data : (data.data || []);
      if (rows.length === 0) break;
      for (const row of rows) {
        const name = row?.item?.market_hash_name;
        if (!name || !(row.price > 0)) continue;
        // ⚠️ CENT → DOLAR.
        const price = row.price / 100;
        const prev = out.get(name);
        // Aynı eşyanın birden çok ilanı gelirse EN UCUZU tut (piyasa fiyatı
        // yaklaşımı); ayrıca kaç ilan görüldüğünü sayarak qty üret.
        if (!prev || price < prev.price) out.set(name, { price, qty: (prev?.qty ?? 0) + 1 });
        else out.set(name, { ...prev, qty: prev.qty + 1 });
      }
      cursor = data.cursor ?? null;
      if (!cursor) break;
      // Nazik ol — hız sınırına çarpma.
      await new Promise(r => setTimeout(r, 350));
    }
    out.updatedAt = new Date().toISOString();
    return out;
  }
};

export const PROVIDERS = {
  skinport: skinportProvider,
  cs2sh: cs2shProvider,
  csfloat: csfloatProvider
};

// Sırayla dener, ilk BAŞARILI ve yeterince dolu olanı kullanır.
// ⚠️ `minItems`: bir sağlayıcı ayakta ama neredeyse boş dönerse (bozuk yanıt,
// hız sınırı) onu kabul etmek tüm fiyatları çöpe çevirir — eşiğin altında
// kalırsa bir sonrakine geçilir.
export async function resolvePrices(order, { minItems = 500, log = console.log } = {}) {
  const tried = [];
  for (const id of order) {
    const p = PROVIDERS[id];
    if (!p) { log(`⚠️ Bilinmeyen sağlayıcı: ${id}`); continue; }
    if (!p.available()) {
      log(`⏭️  ${p.label} atlandı (anahtar/koşul yok)`);
      tried.push(`${id}:yok`);
      continue;
    }
    try {
      const map = await p.fetchPrices();
      if (map.size < minItems) {
        log(`⚠️ ${p.label} yalnızca ${map.size} kayıt döndü (eşik ${minItems}) — atlanıyor`);
        tried.push(`${id}:az(${map.size})`);
        continue;
      }
      log(`✅ ${p.label}: ${map.size} kayıt (güncelleme: ${map.updatedAt})`);
      return { id: p.id, label: p.label, map, tried };
    } catch (e) {
      log(`⚠️ ${p.label} başarısız: ${e.message}`);
      tried.push(`${id}:hata`);
    }
  }
  return { id: null, label: null, map: null, tried };
}
