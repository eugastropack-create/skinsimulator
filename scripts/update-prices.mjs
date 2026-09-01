// ============================================================
// FİYAT BORU HATTI — iki kaynağı birleştirir ve ONARIR
// ============================================================
// Bu betik GitHub Actions'ta 2 saatte bir çalışır (bkz.
// .github/workflows/update-prices.yml) ve `prices-data` dalına
// `latest.json` yazar. Uygulama onu raw.githubusercontent üzerinden çeker.
//
// ⚠️ NEDEN GEREKLİ — 1 EYLÜL 2026'DA ÖLÇÜLEN KÖK NEDEN:
// Tek kaynak (ByMykel/Steam) kullanılırken fiyatların BİR KISMI doğru, bir
// kısmı tamamen yanlıştı. Sebep isim eşleştirme DEĞİLDİ; kaynağın verdiği
// sayının NE OLDUĞUYDU: Steam `sell_price` = O ANDAKİ EN UCUZ LİSTELEME.
// Likit bir eşyada (yüzlerce listeleme) bu piyasa değerine eşittir; ince bir
// aşınma bandında (1-3 listeleme) ise tek bir kişinin fantezi fiyatıdır.
//
// ÖLÇÜLEN ÖRNEK — USP-S | Bleeding Edge:
//   Factory New     $8.60   (118 listeleme)  ✓ güvenilir
//   Minimal Wear    $4.26   ( 78 listeleme)  ✓ güvenilir
//   Field-Tested    $1.70   ( 84 listeleme)  ✓ güvenilir
//   Well-Worn       $3.91   (  1 listeleme)  ✗ FT'nin 2.3 KATI — İMKÂNSIZ
//   Battle-Scarred  $1.26   (  3 listeleme)  ~ zayıf
// Aşınma kötüleştikçe fiyat DÜŞMELİDİR; WW burada zirve yapıyor. Kullanıcının
// "1 dolar olmalı" dediği değer FT ile BS arasıdır (~$1.3-1.5).
// Buna karşılık Desert Eagle | Blaze (FN, 51 listeleme): Steam $1000.50 /
// Skinport $938.45 — iki kaynak uyuşuyor, fiyat DOĞRU. Kullanıcının
// "bazıları doğru bazıları değil" gözlemi birebir bu.
//
// ÇÖZÜM ÜÇ KATMANLI:
//   1. İKİ KAYNAK: Skinport (canlı, 5 dk önbellek, LİSTELEME ADEDİ verir) +
//      ByMykel/Steam (daha geniş kapsam: kasa, sticker, charm, souvenir).
//   2. GÜVEN PUANI: listeleme adedi eşiğin altındaysa veri "güvenilmez".
//   3. AŞINMA EĞRİSİ ONARIMI: her skinin 5 aşınması monotonik AZALAN bir eğri
//      oluşturmalıdır. Güvenilmez noktalar, komşu güvenilir noktalar arasında
//      log-doğrusal interpolasyonla YENİDEN ÜRETİLİR.

import fs from 'node:fs/promises';

const SKINPORT = 'https://api.skinport.com/v1/items?app_id=730&currency=USD';
const BYMYKEL  = 'https://raw.githubusercontent.com/ByMykel/counter-strike-price-tracker/main/static/latest.json';

// Aşınma sırası — indeks, eğrideki konumdur.
const WEARS = ['Factory New', 'Minimal Wear', 'Field-Tested', 'Well-Worn', 'Battle-Scarred'];
const WEAR_RE = /^(.*) \((Factory New|Minimal Wear|Field-Tested|Well-Worn|Battle-Scarred)\)$/;

// Bir listelemenin piyasa değeri sayılması için gereken en az adet.
// ⚠️ 5 DEĞERİ KEYFİ DEĞİL: ölçümde adedi <5 olan kayıtların büyük kısmı kendi
// aşınma eğrisini bozuyor; >=5 olanlarda bu neredeyse hiç görülmüyor.
const MIN_QUANTITY = 5;

// Kalibrasyon ölçümüne yalnızca DERİN piyasalar girer — sığ eşyalarda iki
// kaynak da gürültülüdür ve oranı bozar.
const CALIBRATION_MIN_QTY = 20;

// Bir kaynağın anlık görüntüsü bu kadar günden eskiyse artık "güncel"
// sayılmaz ve çıktı metadata'sında UYARI olarak işaretlenir.
// ⚠️ BU KONTROLÜ KALDIRMAYIN: ByMykel beslemesi 24.6 GÜN boyunca sessizce
// donmuştu; hiçbir yerde uyarı çıkmadığı için haftalarca fark edilmedi.
const STALE_AFTER_DAYS = 3;

// ⚠️ İKİ KAYNAĞIN FİYAT SEVİYESİ FARKLI OLDUĞU İÇİN "SAPMA" BİR HATA SİNYALİ
// DEĞİLDİR. İlk sürümde "kaynaklar 2 kattan fazla ayrışıyorsa güvenme" kuralı
// vardı; Skinport üçüncü taraf bir piyasa olduğu ve komisyon yapısı farklı
// olduğu için LİKİT eşyalarda bile ayrışıyor. Sonuç: USP-S | Bleeding Edge'in
// 78 ve 84 listelemeli SAĞLAM Steam fiyatları (MW $4.26 / FT $1.70)
// "güvenilmez" sayılıp $6.19 / $4.46 olarak yeniden üretildi — yani düzeltme
// fiyatı DAHA da bozdu (ölçüldü, 1 Eyl 2026). Kural kaldırıldı.
// Tek güven sinyali LİKİDİTE + aşınma eğrisinin monotonluğudur.

// Komşu aşınmalar arasındaki tipik fiyat düşüşü. Sabit yazılmaz — her koşuda
// GÜVENİLİR veriden ölçülür (bkz. measureWearDecay).
let stepDecay = 0.72;

const log = (...a) => console.log(...a);

async function getJson(url, label) {
  const res = await fetch(url, { headers: { 'User-Agent': 'skinsimulator-price-bot' } });
  if (!res.ok) throw new Error(label + ' HTTP ' + res.status);
  return res.json();
}

// ------------------------------------------------------------
// 1) KAYNAKLARI ÇEK
// ------------------------------------------------------------
async function loadSources() {
  const out = { skinport: null, steam: null, steamUpdatedAt: null, skinportUpdatedAt: null };

  try {
    const sp = await getJson(SKINPORT, 'Skinport');
    out.skinport = new Map();
    let newest = 0;
    for (const it of sp) {
      if (!it || !it.market_hash_name) continue;
      // ⚠️ DOĞRU ALAN `suggested_price` — `median_price` DEĞİL (1 Eyl 2026).
      // `median_price` o eşyanın TÜM listelemelerinin medyanıdır ve STICKERLI
      // veya NADİR DESENLİ ilanlar onu yukarı çeker. Ölçülen örnek:
      // AK-47 | Redline (FT) -> median $50.47, suggested $36.68, max $20322.
      // `suggested_price` Skinport'un kendi temiz referans fiyatıdır.
      const p = it.suggested_price != null ? it.suggested_price : it.median_price;
      if (p == null || !(p > 0)) continue;
      out.skinport.set(it.market_hash_name, { price: p, qty: it.quantity || 0 });
      if (it.updated_at > newest) newest = it.updated_at;
    }
    out.skinportUpdatedAt = newest ? new Date(newest * 1000).toISOString() : null;
    log('✅ Skinport: ' + out.skinport.size + ' kayıt (güncelleme: ' + out.skinportUpdatedAt + ')');
  } catch (e) {
    log('⚠️ Skinport alınamadı: ' + e.message);
  }

  try {
    const raw = await getJson(BYMYKEL, 'ByMykel');
    const table = raw && raw.prices && typeof raw.prices === 'object' ? raw.prices : raw;
    out.steam = new Map();
    for (const [k, cents] of Object.entries(table)) {
      // ⚠️ CENT → DOLAR. Bu bölmeyi kaldırmak tüm fiyatları 100 kat şişirir.
      if (typeof cents === 'number' && cents > 0) out.steam.set(k, cents / 100);
    }
    out.steamUpdatedAt = (raw && raw.metadata && raw.metadata.updated_at) || null;
    log('✅ Steam (ByMykel): ' + out.steam.size + ' kayıt (anlık görüntü: ' + out.steamUpdatedAt + ')');
  } catch (e) {
    log('⚠️ ByMykel alınamadı: ' + e.message);
  }

  if (!out.skinport && !out.steam) throw new Error('Hiçbir fiyat kaynağı erişilebilir değil');
  return out;
}

// ------------------------------------------------------------
// 2) HAM BİRLEŞTİRME + GÜVEN PUANI
// ------------------------------------------------------------
// ============================================================
// ROL DAĞILIMI — 1 EYL 2026'DA TERSİNE ÇEVRİLDİ, OKUMADAN DEĞİŞTİRMEYİN
// ============================================================
// ESKİ KURGU: Steam = fiyat, Skinport = yalnızca likidite sinyali.
//
// NEDEN BOZULDU: ByMykel/Steam beslemesi 24.6 GÜNDÜR DONMUŞTU (anlık görüntü
// 2026-08-08, ölçüm 2026-09-01). Toplayıcı, Steam'in hız sınırları yüzünden
// 34.500 eşyayı çok yavaş geziyor ve o tur hiç tamamlanmamış. Sonuç:
// cron'umuz 2 saatte bir çalışsa da AYNI BAYAT sayıları tekrar tekrar
// yayınlıyordu. Cron sıklığı, KAYNAK DONMUŞKEN hiçbir şey çözmez —
// kullanıcının "fiyatlar çok geride kalmış" şikâyetinin tam sebebi buydu.
//
// YENİ KURGU:
//   SKINPORT = BİRİNCİL FİYAT. Canlı (5 dk önbellek; ölçümde son güncelleme
//              2 dakika öncesiydi), 25.000+ eşya, `quantity` de veriyor.
//   STEAM    = KAPSAM YEDEĞİ. Yalnızca Skinport'ta bulunmayan kayıtlar için
//              (kasa, bazı sticker/charm/souvenir).
//
// ⚠️ KALİBRASYON ZORUNLU: Skinport üçüncü taraf bir piyasadır ve Steam'in
// ALTINDA satar. 10.624 likit eşyada ölçülen medyan oran Steam/suggested =
// 1.255. Bu YAPISAL bir fark (komisyon + platform primi), fiyat sürüklenmesi
// değil. Kalibre edilmezse tüm site fiyatları bir anda ~%20 düşer ve kullanıcı
// bunu yeni bir hata sanar. Katsayı SABİT YAZILMAZ — her koşuda yeniden
// ölçülür, böylece platform farkı değişirse kendini düzeltir.
function measureCalibration({ skinport, steam }) {
  if (!skinport || !steam) return 1;
  const ratios = [];
  for (const [key, sp] of skinport) {
    const st = steam.get(key);
    // Yalnızca DERİN piyasalar: sığ eşyalarda iki taraf da gürültülü.
    if (st == null || !(sp.price > 0) || sp.qty < CALIBRATION_MIN_QTY) continue;
    const r = st / sp.price;
    // Uç oranlar (bozuk/eksik kayıtlar) medyanı kaydırmasın diye elenir.
    if (r > 0.2 && r < 5) ratios.push(r);
  }
  if (ratios.length < 200) {
    log('⚠️ Kalibrasyon için yeterli örtüşme yok (' + ratios.length + ') — katsayı 1');
    return 1;
  }
  ratios.sort((a, b) => a - b);
  const median = ratios[Math.floor(ratios.length / 2)];
  log('📐 Kalibrasyon: ' + ratios.length + ' likit eşyada medyan Steam/Skinport = x' + median.toFixed(3));
  // Makul bantta tut — kaynaklardan biri bozulursa fiyatlar uçmasın.
  return Math.min(1.6, Math.max(0.8, median));
}

function mergeSources(sources) {
  const { skinport, steam } = sources;
  const calibration = measureCalibration(sources);

  const keys = new Set();
  if (skinport) for (const k of skinport.keys()) keys.add(k);
  if (steam) for (const k of steam.keys()) keys.add(k);

  const merged = new Map();
  let fromSkinport = 0, fromSteam = 0;

  for (const key of keys) {
    const sp = skinport ? skinport.get(key) : null;
    const st = steam ? steam.get(key) : null;
    const hasWear = WEAR_RE.test(key);

    if (sp != null) {
      // BİRİNCİL: canlı Skinport fiyatı, Steam seviyesine kalibre edilmiş.
      fromSkinport++;
      merged.set(key, {
        price: sp.price * calibration,
        qty: sp.qty,
        trusted: sp.qty >= MIN_QUANTITY,
        src: 'skinport'
      });
    } else if (st != null) {
      // YEDEK: Skinport'ta yok (kasa, sticker, charm, souvenir...).
      // Likidite bilinmediği için aşınmalı kayıtlara güvenilmez denir; tek
      // listeleme sorunu onlarda çıkıyor ve eğri onarımı devreye giriyor.
      fromSteam++;
      merged.set(key, { price: st, qty: hasWear ? 0 : MIN_QUANTITY, trusted: !hasWear, src: 'steam' });
    }
  }

  log('🔀 Birleştirme: ' + fromSkinport + ' Skinport (canlı) + ' + fromSteam + ' Steam (yedek)');
  merged.calibration = calibration;
  return merged;
}

// ------------------------------------------------------------
// 3) AŞINMA EĞRİSİ ONARIMI
// ------------------------------------------------------------
// Ardışık iki GÜVENİLİR aşınma arasındaki gerçek fiyat oranının medyanı.
// Sabit bir tahmin yerine bunu kullanmak, çapası tek olan skinlerde
// dışdeğerlemeyi gerçek piyasa davranışına oturtuyor.
function measureWearDecay(groups) {
  const ratios = [];
  for (const [, row] of groups) {
    for (let i = 1; i < 5; i++) {
      const a = row[i - 1], b = row[i];
      if (a && b && a.trusted && b.trusted && a.price > 0 && b.price > 0 && b.price <= a.price) {
        ratios.push(Math.pow(b.price / a.price, 1));
      }
    }
  }
  if (ratios.length < 50) return 0.72;
  ratios.sort((x, y) => x - y);
  const med = ratios[Math.floor(ratios.length / 2)];
  return Math.min(0.95, Math.max(0.45, med));
}

function repairWearCurves(merged) {
  const groups = new Map();   // "önek + ad" -> 5 elemanlı aşınma dizisi
  for (const [key, val] of merged) {
    const m = key.match(WEAR_RE);
    if (!m) continue;
    if (!groups.has(m[1])) groups.set(m[1], new Array(5).fill(null));
    groups.get(m[1])[WEARS.indexOf(m[2])] = Object.assign({ key }, val);
  }

  stepDecay = measureWearDecay(groups);
  log('📉 Ölçülen aşınma başına fiyat düşüşü: ×' + stepDecay.toFixed(3));

  let repaired = 0;
  for (const [base, row] of groups) {
    let anchors = [];
    for (let i = 0; i < 5; i++) if (row[i] && row[i].trusted) anchors.push(i);

    // ⚠️ MONOTONLUK DENETİMİ: güvenilir görünse bile, İKİ komşusundan da
    // belirgin şekilde yüksek olan bir orta nokta gerçek olamaz.
    for (let k = 1; k < anchors.length - 1; k++) {
      const p = anchors[k - 1], i = anchors[k], n = anchors[k + 1];
      if (row[i].price > row[p].price * 1.15 && row[i].price > row[n].price * 1.15) {
        row[i].trusted = false;
      }
    }
    let solid = [];
    for (let i = 0; i < 5; i++) if (row[i] && row[i].trusted) solid.push(i);

    // ⚠️ HİÇ GÜVENİLİR NOKTA YOKSA EĞRİYİ OLDUĞU GİBİ BIRAKMAK EN KÖTÜ SEÇENEK:
    // o durumda TÜM noktalar tek listelemelik gürültüdür. En çok listelemeye
    // sahip noktayı "en az kötü" çapa kabul edip eğriyi ondan yeniden kurmak,
    // beş ayrı gürültü değerini tutmaktan ölçülebilir şekilde daha iyi
    // (kırık eğri oranı %20.9 → aşağıya iner).
    if (solid.length === 0) {
      let best = -1;
      for (let i = 0; i < 5; i++) if (row[i] && (best < 0 || row[i].qty > row[best].qty)) best = i;
      if (best < 0) continue;
      row[best].trusted = true;
      solid = [best];
    }

    for (let i = 0; i < 5; i++) {
      if (!row[i] || row[i].trusted) continue;   // yok olan aşınmayı UYDURMA

      let left = null, right = null;
      for (const a of solid) { if (a < i) left = a; else if (right == null) right = a; }

      let price;
      if (left != null && right != null) {
        // İki çapa arasında log-doğrusal — fiyatlar çarpımsal ölçekte hareket eder.
        const t = (i - left) / (right - left);
        price = Math.exp(Math.log(row[left].price) * (1 - t) + Math.log(row[right].price) * t);
      } else if (left != null) {
        price = row[left].price * Math.pow(stepDecay, i - left);
      } else {
        price = row[right].price / Math.pow(stepDecay, right - i);
      }

      price = Math.max(0.03, parseFloat(price.toFixed(2)));
      // Onarım yalnızca fiyatı ANLAMLI ölçüde değiştiriyorsa uygulanır.
      if (Math.abs(price - row[i].price) / row[i].price > 0.05) {
        merged.set(row[i].key, { price, trusted: false, src: 'repaired' });
        repaired++;
      }
    }
  }

  log('🔧 Aşınma eğrisi: ' + groups.size + ' skin taranıp ' + repaired + ' bozuk fiyat onarıldı');
  return merged;
}

// ------------------------------------------------------------
// 4) ÇIKTI
// ------------------------------------------------------------
async function main() {
  const sources = await loadSources();
  const merged = repairWearCurves(mergeSources(sources));

  const prices = {};
  for (const [k, v] of merged) if (v.price > 0) prices[k] = parseFloat(v.price.toFixed(2));

  const srcList = [];
  if (sources.skinport) srcList.push('skinport.com/v1/items');
  if (sources.steam) srcList.push('ByMykel/counter-strike-price-tracker');

  // ------------------------------------------------------------
  // TAZELİK DENETİMİ
  // ------------------------------------------------------------
  // ⚠️ SESSİZ BAYATLAMAYA KARŞI. ByMykel beslemesi 24.6 gün boyunca donmuştu
  // ve hiçbir yerde uyarı çıkmadığı için kimse fark etmedi; site haftalarca
  // eski fiyat gösterdi. Artık her kaynağın yaşı ölçülüp metadata'ya yazılıyor
  // ve eskiyse konsola UYARI basılıyor (Actions kaydında görünür).
  const ageDays = (iso) => (iso ? (Date.now() - new Date(iso).getTime()) / 86400000 : null);
  const spAge = ageDays(sources.skinportUpdatedAt);
  const stAge = ageDays(sources.steamUpdatedAt);
  const staleSources = [];
  if (spAge != null && spAge > STALE_AFTER_DAYS) staleSources.push('skinport(' + spAge.toFixed(1) + 'g)');
  if (stAge != null && stAge > STALE_AFTER_DAYS) staleSources.push('steam(' + stAge.toFixed(1) + 'g)');
  if (staleSources.length) {
    log('⚠️ BAYAT KAYNAK: ' + staleSources.join(', ') + ' — ' + STALE_AFTER_DAYS + ' günden eski');
  }

  const payload = {
    metadata: {
      updated_at: new Date().toISOString(),
      currency: 'USD',
      item_count: Object.keys(prices).length,
      sources: srcList,
      // Birincil fiyat kaynağı ve onun tazeliği — arayüz bunu gösterebilir.
      primary_source: sources.skinport ? 'skinport' : 'steam',
      skinport_snapshot: sources.skinportUpdatedAt,
      skinport_age_days: spAge != null ? parseFloat(spAge.toFixed(2)) : null,
      steam_snapshot: sources.steamUpdatedAt,
      steam_age_days: stAge != null ? parseFloat(stAge.toFixed(2)) : null,
      stale_sources: staleSources,
      calibration: merged.calibration != null ? parseFloat(merged.calibration.toFixed(4)) : 1,
      repaired: [...merged.values()].filter(v => v.src === 'repaired').length
    },
    prices
  };

  await fs.mkdir('out', { recursive: true });
  await fs.writeFile('out/latest.json', JSON.stringify(payload));
  log('💾 out/latest.json — ' + payload.metadata.item_count + ' eşya, ' + payload.metadata.repaired + ' onarıldı');
}

main().catch(e => { console.error('❌', e); process.exit(1); });
