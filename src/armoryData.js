// ============================================================
// GERÇEK CS2 ARMORY HAVUZU (kaynak: tradeit.gg/blog/all-cs2-armory-skins,
// 12 Ağustos 2026 güncellemesi — Valve'in Armory kataloğu bu tarihte)
// ============================================================
// Armory kataloğu Valve tarafından ROTASYONLA değiştirilir. Bu liste
// güncelliğini yitirirse, yapmanız gereken tek şey buradaki isimleri
// güncellemek — kod tarafında başka bir değişiklik gerekmez.
//
// 12 Ağustos 2026 itibarıyla AKTİF (kredi ile alınabilen) setler:
//   - The Overpass 2024 Collection  (doğrudan koleksiyon çekilişi)
//   - The Spy Tech Collection       (8 Temmuz 2026'da eklendi)
//   - The Arabesque Collection      (8 Temmuz 2026'da eklendi)
//   - Fever Case                    (bir KASA — aşağıya bakın)
//
// HAVUZDAN ÇIKARILMIŞ (artık Armory'de YOK, sadece piyasada/envanterde
// bulunabilir — bu yüzden bunları Armory'ye dahil ETMİYORUZ):
//   Gallery Case, Graphic Design Collection, Sport & Field Collection,
//   2025 Train Collection
//
// Bu isimler, App.js'in zaten çektiği ByMykel collections.json listesini
// FİLTRELEMEK için kullanılıyor (küçük harfe çevrilip .includes() ile
// eşleştiriliyor, bu yüzden "The Overpass 2024 Collection" gibi tam
// başlık farkları sorun olmaz).
export const ACTIVE_ARMORY_COLLECTION_NAMES = [
  'overpass 2024',
  'spy tech',
  'arabesque'
];

// CHARM (NAZARLIK) HAVUZU: ByMykel'in keychains.json'ı zaten yalnızca güncel/
// aktif charm kapsüllerini içeriyor (Missing Link, Missing Link Community,
// Small Arms, Dr Boom — toplam 78 charm, 4 kapsül). Bu yüzden weapon
// koleksiyonlarındaki gibi isim filtrelemeye gerek yok; App.js hepsini
// olduğu gibi Armory'ye ekliyor (bkz. src/prices.js calculateCharmStats).
// Kapsül fiyatı gerçek oyunla birebir: 3 yıldız ≈ $1.20 (weapon koleksiyonu
// 4 yıldız ≈ $1.60'tan farklı — Valve charm kapsüllerini daha ucuza satıyor).

// NOT: Fever Case de aktif bir Armory ödülü ama mekaniği FARKLI — koleksiyon
// gibi doğrudan bir silah skini vermiyor, KAPALI BİR KASA veriyor (gerçek
// oyunda bu kasa daha sonra normal şekilde anahtarla açılıyor). Mevcut
// "yıldız harca -> direkt eşya çıksın" mekaniğimize tam oturmadığı için
// şimdilik dahil etmedik. Bunu doğru şekilde eklemek için envantere
// "kapalı kasa" objesi ekleyip Kasalar sekmesinden açılabilir hale
// getirecek bir sonraki adım gerekiyor — istersen birlikte yaparız.
export const PENDING_CASE_REWARDS_NOTE =
  'Fever Case Armory\'de aktif ama kasa mekaniği farklı olduğu için henüz eklenmedi.';

// ============================================================
// AKTİF DROP HAVUZU (Active Drop Pool)
// ============================================================
// ⚠️ BU LİSTE ELLE BAKIMLIDIR — API'de böyle bir alan YOKTUR.
// CS2'de haftalık "Care Package" yalnızca Valve'in o dönem aktif tuttuğu
// koleksiyonlardan düşer. ByMykel verisi bunu işaretlemez, dolayısıyla
// koleksiyon listesinde "şu an gerçekten düşüyor" bilgisini ancak buradan
// verebiliyoruz.
//
// KAYNAK (29 Ağustos 2026'da derlendi):
//   • Valve, 22 Ocak 2026'da Harlequin ve Achroma koleksiyonlarını haftalık
//     düşüş listesine EKLEDİ; aynı gün Safehouse, Dust 2, 2018 Nuke ve
//     2018 Inferno listeden ÇIKARILDI.
//   • 31 Mart 2025'te gelen Ascent / Boreal / Radiant koleksiyonları henüz
//     havuzda.
//   • Genesis (Eyl 2025) ve Dead Hand (Mar 2026) terminal koleksiyonları
//     aktif kapsayıcılar olarak listelenmiş durumda.
//
// ⚠️ Valve rotasyon yaptığında GÜNCELLENMESİ GEREKEN TEK YER BURASIDIR.
// Eşleştirme küçük harfe çevrilip `.includes()` ile yapılır, bu yüzden
// "The ... Collection" gibi başlık farkları sorun olmaz.
export const ACTIVE_DROP_POOL_COLLECTION_NAMES = [
  'harlequin',
  'achroma',
  'ascent',
  'boreal',
  'radiant',
  'genesis',
  'dead hand'
];
